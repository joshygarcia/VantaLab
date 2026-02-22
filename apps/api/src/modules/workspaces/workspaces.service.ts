import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace.dto';
import { UpdateKlingElementsLibraryDto } from './dto/update-kling-elements-library.dto';
import { UploadWorkspaceFileDto } from './dto/upload-workspace-file.dto';
import { CreateCustomSpaceDto, SpaceProtection } from './dto/create-custom-space.dto';
import { UpdateCustomSpaceDto } from './dto/update-custom-space.dto';

type KieUploadResponse = {
    success?: boolean;
    code?: number;
    msg?: string;
    data?: {
        fileUrl?: string;
        downloadUrl?: string;
    };
};

type CustomSpaceItem = {
    id: string;
    ownerWorkspaceId: string;
    name: string;
    description: string;
    protection: SpaceProtection;
    sharedWorkspaceIds: string[];
    createdAt: string;
};

@Injectable()
export class WorkspacesService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly klingElementsLibraryPath = path.resolve(
        __dirname,
        '../../../data/kling-elements-library.json'
    );

    private readonly customSpacesPath = path.resolve(
        __dirname,
        '../../../data/custom-spaces.json'
    );

    private assertWorkspaceAccess(id: string, userWorkspaceIds: string[]) {
        if (!userWorkspaceIds.includes(id)) {
            throw new UnauthorizedException('User does not have access to this workspace');
        }
    }

    private async uploadImageToKie(base64Data: string, fileName: string | undefined, apiKey: string) {
        if (!base64Data.startsWith('data:image/')) {
            throw new BadRequestException('Only image uploads are supported');
        }

        const response = await fetch(
            `${process.env.KIE_FILE_UPLOAD_BASE_URL ?? 'https://kieai.redpandaai.co'}/api/file-base64-upload`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    base64Data,
                    uploadPath: `persona/${Date.now()}`,
                    fileName
                })
            }
        );

        const payload = (await response.json()) as KieUploadResponse;
        if (!response.ok || (payload.code !== 200 && payload.success !== true)) {
            throw new BadRequestException(payload.msg || 'Failed to upload image file to Kie.ai');
        }

        const fileUrl = payload.data?.fileUrl ?? payload.data?.downloadUrl;
        if (!fileUrl) {
            throw new BadRequestException('Upload completed without a file URL');
        }

        return fileUrl;
    }

    private async readLibraryStore(): Promise<Record<string, unknown[]>> {
        try {
            const raw = await fs.readFile(this.klingElementsLibraryPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {};
            }
            return parsed as Record<string, unknown[]>;
        } catch {
            return {};
        }
    }

    private async writeLibraryStore(store: Record<string, unknown[]>) {
        const dir = path.dirname(this.klingElementsLibraryPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.klingElementsLibraryPath, JSON.stringify(store, null, 2), 'utf-8');
    }

    private async readCustomSpacesStore(): Promise<Record<string, CustomSpaceItem[]>> {
        try {
            const raw = await fs.readFile(this.customSpacesPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {};
            }

            const normalized: Record<string, CustomSpaceItem[]> = {};
            for (const [workspaceId, items] of Object.entries(parsed)) {
                if (!Array.isArray(items)) {
                    continue;
                }

                normalized[workspaceId] = items
                    .map((item) => {
                        if (!item || typeof item !== 'object') {
                            return null;
                        }

                        const rawItem = item as Partial<CustomSpaceItem> & {
                            ownerWorkspaceId?: unknown;
                            protection?: unknown;
                            sharedWorkspaceIds?: unknown;
                        };

                        if (
                            typeof rawItem.id !== 'string' ||
                            typeof rawItem.name !== 'string' ||
                            typeof rawItem.description !== 'string' ||
                            typeof rawItem.createdAt !== 'string'
                        ) {
                            return null;
                        }

                        const ownerWorkspaceId =
                            typeof rawItem.ownerWorkspaceId === 'string'
                                ? rawItem.ownerWorkspaceId
                                : workspaceId;

                        const protectionRaw = typeof rawItem.protection === 'string' ? rawItem.protection : 'standard';
                        const protection: SpaceProtection =
                            protectionRaw === 'template-only' ||
                            protectionRaw === 'locked' ||
                            protectionRaw === 'team-shared'
                                ? protectionRaw
                                : 'standard';

                        const sharedWorkspaceIds = Array.isArray(rawItem.sharedWorkspaceIds)
                            ? rawItem.sharedWorkspaceIds.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
                            : [];

                        return {
                            id: rawItem.id,
                            ownerWorkspaceId,
                            name: rawItem.name,
                            description: rawItem.description,
                            protection,
                            sharedWorkspaceIds: Array.from(new Set(sharedWorkspaceIds)),
                            createdAt: rawItem.createdAt
                        } satisfies CustomSpaceItem;
                    })
                    .filter((item): item is CustomSpaceItem => item !== null);
            }

            return normalized;
        } catch {
            return {};
        }
    }

    private isImmutableSpaceProtection(protection: SpaceProtection) {
        return protection === 'template-only' || protection === 'locked';
    }

    private async writeCustomSpacesStore(store: Record<string, CustomSpaceItem[]>) {
        const dir = path.dirname(this.customSpacesPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this.customSpacesPath, JSON.stringify(store, null, 2), 'utf-8');
    }

    async updateSettings(id: string, payload: UpdateWorkspaceSettingsDto, userWorkspaceIds: string[], userId: string | undefined) {
        if (!userId) {
            throw new UnauthorizedException('Missing authenticated user id');
        }

        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const workspace = await this.prisma.workspace.upsert({
            where: { id },
            update: {
                kieApiKey: payload.kieApiKey
            },
            create: {
                id,
                userId,
                name: `Workspace ${id}`,
                kieApiKey: payload.kieApiKey
            }
        });

        return { success: true };
    }

    async getKlingElementsLibrary(id: string, userWorkspaceIds: string[]) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readLibraryStore();
        const items = store[id];
        return {
            items: Array.isArray(items) ? items : []
        };
    }

    async updateKlingElementsLibrary(
        id: string,
        payload: UpdateKlingElementsLibraryDto,
        userWorkspaceIds: string[]
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readLibraryStore();
        store[id] = payload.items;
        await this.writeLibraryStore(store);

        return {
            success: true,
            count: payload.items.length
        };
    }

    async listCustomSpaces(id: string, userWorkspaceIds: string[]) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readCustomSpacesStore();
        const ownItems = Array.isArray(store[id]) ? store[id] : [];

        const teamSharedItems = Object.values(store)
            .flat()
            .filter((item) =>
                item.ownerWorkspaceId !== id &&
                item.protection === 'team-shared' &&
                item.sharedWorkspaceIds.includes(id)
            );

        const dedupedById = new Map<string, CustomSpaceItem>();
        for (const item of [...ownItems, ...teamSharedItems]) {
            dedupedById.set(item.id, item);
        }

        return {
            items: Array.from(dedupedById.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        };
    }

    async createCustomSpace(
        id: string,
        payload: CreateCustomSpaceDto,
        userWorkspaceIds: string[],
        userId: string | undefined
    ) {
        if (!userId) {
            throw new UnauthorizedException('Missing authenticated user id');
        }

        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const trimmedName = payload.name.trim();
        const trimmedDescription = payload.description?.trim() || 'Custom workflow space';
        const protection = payload.protection ?? 'standard';
        const sharedWorkspaceIds = Array.isArray(payload.sharedWorkspaceIds)
            ? Array.from(new Set(payload.sharedWorkspaceIds.filter((entry) => entry.trim().length > 0 && entry !== id)))
            : [];

        if (sharedWorkspaceIds.some((workspaceId) => !userWorkspaceIds.includes(workspaceId))) {
            throw new UnauthorizedException('Cannot share space with workspaces outside your access scope');
        }

        if (protection !== 'team-shared' && sharedWorkspaceIds.length > 0) {
            throw new BadRequestException('sharedWorkspaceIds are only supported for team-shared spaces');
        }

        const slug = trimmedName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const spaceId = `${slug || 'space'}-${randomUUID().slice(0, 8)}`;

        const nextItem: CustomSpaceItem = {
            id: spaceId,
            ownerWorkspaceId: id,
            name: trimmedName,
            description: trimmedDescription,
            protection,
            sharedWorkspaceIds: protection === 'team-shared' ? sharedWorkspaceIds : [],
            createdAt: new Date().toISOString()
        };

        const store = await this.readCustomSpacesStore();
        const existingItems = Array.isArray(store[id]) ? store[id] : [];
        const nextItems = [nextItem, ...existingItems]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        store[id] = nextItems;
        await this.writeCustomSpacesStore(store);

        await this.prisma.workspace.upsert({
            where: { id: spaceId },
            update: {
                name: trimmedName
            },
            create: {
                id: spaceId,
                userId,
                name: trimmedName
            }
        });

        return {
            item: nextItem
        };
    }

    async updateCustomSpace(
        id: string,
        spaceId: string,
        payload: UpdateCustomSpaceDto,
        userWorkspaceIds: string[]
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readCustomSpacesStore();
        const existingItems = Array.isArray(store[id]) ? store[id] : [];
        const existing = existingItems.find((item) => item.id === spaceId);

        if (!existing) {
            throw new NotFoundException('Space not found in this owner workspace');
        }

        if (this.isImmutableSpaceProtection(existing.protection)) {
            throw new BadRequestException('This space is protected and cannot be modified');
        }

        const nextProtection = payload.protection ?? existing.protection;
        const nextSharedWorkspaceIds = payload.sharedWorkspaceIds
            ? Array.from(new Set(payload.sharedWorkspaceIds.filter((entry) => entry.trim().length > 0 && entry !== id)))
            : existing.sharedWorkspaceIds;

        if (nextSharedWorkspaceIds.some((workspaceId) => !userWorkspaceIds.includes(workspaceId))) {
            throw new UnauthorizedException('Cannot share space with workspaces outside your access scope');
        }

        if (nextProtection !== 'team-shared' && nextSharedWorkspaceIds.length > 0) {
            throw new BadRequestException('sharedWorkspaceIds are only supported for team-shared spaces');
        }

        const updatedItem: CustomSpaceItem = {
            ...existing,
            name: payload.name?.trim() || existing.name,
            description: payload.description?.trim() || existing.description,
            protection: nextProtection,
            sharedWorkspaceIds: nextProtection === 'team-shared' ? nextSharedWorkspaceIds : []
        };

        store[id] = existingItems.map((item) => item.id === spaceId ? updatedItem : item);
        await this.writeCustomSpacesStore(store);

        return {
            item: updatedItem
        };
    }

    async deleteCustomSpace(
        id: string,
        spaceId: string,
        userWorkspaceIds: string[]
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readCustomSpacesStore();
        const existingItems = Array.isArray(store[id]) ? store[id] : [];
        const existing = existingItems.find((item) => item.id === spaceId);

        if (!existing) {
            throw new NotFoundException('Space not found in this owner workspace');
        }

        if (this.isImmutableSpaceProtection(existing.protection)) {
            throw new BadRequestException('This space is protected and cannot be deleted');
        }

        const nextItems = existingItems.filter((item) => item.id !== spaceId);

        store[id] = nextItems;
        await this.writeCustomSpacesStore(store);

        return {
            success: true,
            deleted: existingItems.length !== nextItems.length
        };
    }

    async uploadWorkspaceFile(id: string, payload: UploadWorkspaceFileDto, userWorkspaceIds: string[]) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const workspace = await this.prisma.workspace.findUnique({ where: { id } });
        if (!workspace?.kieApiKey) {
            throw new BadRequestException('Kie.ai API key is missing. Please configure it in Workspace Settings.');
        }

        const fileUrl = await this.uploadImageToKie(payload.base64Data, payload.fileName, workspace.kieApiKey);
        return {
            fileUrl
        };
    }
}
