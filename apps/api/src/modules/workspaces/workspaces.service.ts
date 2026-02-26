import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../database/prisma.service';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace.dto';
import { UpdateKlingElementsLibraryDto } from './dto/update-kling-elements-library.dto';
import { UploadWorkspaceFileDto } from './dto/upload-workspace-file.dto';
import { CreateCustomSpaceDto, SpaceProtection } from './dto/create-custom-space.dto';
import { UpdateCustomSpaceDto } from './dto/update-custom-space.dto';
import { UpdateWorkspaceCanvasDto } from './dto/update-workspace-canvas.dto';

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

type WorkspaceCanvasState = {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    viewport?: {
        x: number;
        y: number;
        zoom: number;
    };
};

@Injectable()
export class WorkspacesService {
    constructor(private readonly prisma: PrismaService) { }
    private supabaseStorageAdmin: SupabaseClient | null = null;
    private readonly signedUrlTtlSeconds = 60 * 60 * 24;

    private sanitizeStoragePathSegment(value: string) {
        return value
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    private readonly klingElementsLibraryPath = path.resolve(
        __dirname,
        '../../../data/kling-elements-library.json'
    );

    private readonly customSpacesPath = path.resolve(
        __dirname,
        '../../../data/custom-spaces.json'
    );

    private getSupabaseStorageAdmin(): SupabaseClient {
        if (this.supabaseStorageAdmin) {
            return this.supabaseStorageAdmin;
        }

        const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            throw new BadRequestException(
                'Supabase Storage is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.'
            );
        }

        this.supabaseStorageAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false }
        });

        return this.supabaseStorageAdmin;
    }

    private getSupabaseStorageBucket() {
        return process.env.SUPABASE_STORAGE_BUCKET
            ?? process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
            ?? 'element-library';
    }

    private extractSupabaseObjectPath(fileUrl: string, bucket: string) {
        const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
        if (!supabaseUrl) {
            return null;
        }

        const prefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
        if (!fileUrl.startsWith(prefix)) {
            return null;
        }

        const objectPath = fileUrl.slice(prefix.length).trim();
        if (!objectPath) {
            return null;
        }

        return decodeURIComponent(objectPath);
    }

    private async toDisplayableStorageUrl(fileUrl: string, requesterUserId: string) {
        const bucket = this.getSupabaseStorageBucket();
        const objectPath = this.extractSupabaseObjectPath(fileUrl, bucket);

        if (!objectPath) {
            return fileUrl;
        }

        const pathSegments = objectPath.split('/').filter((segment) => segment.length > 0);
        const ownerSegment = pathSegments.length >= 3 ? pathSegments[1] : null;
        const normalizedRequesterId = this.sanitizeStoragePathSegment(requesterUserId);

        if (!ownerSegment || !normalizedRequesterId || ownerSegment !== normalizedRequesterId) {
            return fileUrl;
        }

        const { data, error } = await this.getSupabaseStorageAdmin()
            .storage
            .from(bucket)
            .createSignedUrl(objectPath, this.signedUrlTtlSeconds);

        if (error || !data?.signedUrl) {
            return fileUrl;
        }

        return data.signedUrl;
    }

    private assertWorkspaceAccess(id: string, userWorkspaceIds: string[]) {
        if (!userWorkspaceIds.includes(id)) {
            throw new UnauthorizedException('User does not have access to this workspace');
        }
    }

    private async assertSpaceCanvasAccess(spaceId: string, userWorkspaceIds: string[]) {
        if (userWorkspaceIds.includes(spaceId)) {
            return;
        }

        const customSpaces = await this.readCustomSpacesStore();
        const matchedSpace = Object.values(customSpaces)
            .flat()
            .find((item) => item.id === spaceId);

        if (!matchedSpace) {
            throw new UnauthorizedException('User does not have access to this space');
        }

        if (userWorkspaceIds.includes(matchedSpace.ownerWorkspaceId)) {
            return;
        }

        if (
            matchedSpace.protection === 'team-shared' &&
            matchedSpace.sharedWorkspaceIds.some((workspaceId) => userWorkspaceIds.includes(workspaceId))
        ) {
            return;
        }

        throw new UnauthorizedException('User does not have access to this space');
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

    private async uploadImageToSupabaseStorage(
        base64Data: string,
        fileName: string | undefined,
        workspaceId: string,
        userId: string
    ) {
        if (!base64Data.startsWith('data:image/')) {
            throw new BadRequestException('Only image uploads are supported');
        }

        const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i.exec(base64Data);
        if (!dataUrlMatch) {
            throw new BadRequestException('Invalid image data URL payload');
        }

        const mimeType = dataUrlMatch[1].toLowerCase();
        const base64Payload = dataUrlMatch[2];

        let binary: Buffer;
        try {
            binary = Buffer.from(base64Payload, 'base64');
        } catch {
            throw new BadRequestException('Invalid base64 image payload');
        }

        if (!binary.length) {
            throw new BadRequestException('Image payload is empty');
        }

        const bucket = this.getSupabaseStorageBucket();

        const extensionByMime: Record<string, string> = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/webp': 'webp',
            'image/gif': 'gif'
        };

        const fallbackExt = extensionByMime[mimeType] ?? 'png';
        const fileNameExt = typeof fileName === 'string' && fileName.includes('.')
            ? fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
            : '';
        const extension = fileNameExt && fileNameExt.length > 0 ? fileNameExt : fallbackExt;

        const workspaceSegment = this.sanitizeStoragePathSegment(workspaceId) || 'workspace';
        const userSegment = this.sanitizeStoragePathSegment(userId) || 'user';
        const objectPath = `${workspaceSegment}/${userSegment}/${Date.now()}_${randomUUID().slice(0, 8)}.${extension}`;
        const supabase = this.getSupabaseStorageAdmin();

        const { error } = await supabase.storage
            .from(bucket)
            .upload(objectPath, binary, {
                contentType: mimeType,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw new BadRequestException(`Failed to upload image to Supabase Storage: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        const fileUrl = publicUrlData?.publicUrl;

        if (!fileUrl) {
            throw new BadRequestException('Supabase upload completed without a public URL');
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

    private collectLibraryImageUrls(items: unknown[]): string[] {
        const urls: string[] = [];

        for (const item of items) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                continue;
            }

            const rawImageUrls = (item as { imageUrls?: unknown }).imageUrls;
            if (!Array.isArray(rawImageUrls)) {
                continue;
            }

            for (const rawUrl of rawImageUrls) {
                if (typeof rawUrl !== 'string') {
                    continue;
                }

                const normalized = rawUrl.trim();
                if (normalized.length > 0) {
                    urls.push(normalized);
                }
            }
        }

        return Array.from(new Set(urls));
    }

    private async deleteLibraryStorageFiles(workspaceId: string, fileUrls: string[]) {
        if (fileUrls.length === 0) {
            return;
        }

        const bucket = this.getSupabaseStorageBucket();
        const workspaceSegment = this.sanitizeStoragePathSegment(workspaceId);
        if (!workspaceSegment) {
            return;
        }

        const objectPaths = Array.from(new Set(
            fileUrls
                .map((url) => this.extractSupabaseObjectPath(url, bucket))
                .filter((objectPath): objectPath is string => {
                    if (typeof objectPath !== 'string') {
                        return false;
                    }

                    return objectPath.startsWith(`${workspaceSegment}/`);
                })
        ));

        if (objectPaths.length === 0) {
            return;
        }

        const supabase = this.getSupabaseStorageAdmin();
        const batchSize = 100;

        for (let index = 0; index < objectPaths.length; index += batchSize) {
            const batch = objectPaths.slice(index, index + batchSize);
            const { error } = await supabase.storage.from(bucket).remove(batch);

            if (error) {
                throw new Error(`Failed to remove Supabase Storage objects: ${error.message}`);
            }
        }
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

    async getWorkspaceCanvas(id: string, userWorkspaceIds: string[]) {
        await this.assertSpaceCanvasAccess(id, userWorkspaceIds);

        const workspace = await (this.prisma as any).workspace.findUnique({
            where: { id },
            select: {
                canvasState: true
            }
        }) as { canvasState?: string | null } | null;

        if (!workspace?.canvasState) {
            return {
                nodes: [],
                edges: []
            };
        }

        try {
            const parsed = JSON.parse(workspace.canvasState) as WorkspaceCanvasState;
            const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
            const edges = Array.isArray(parsed.edges) ? parsed.edges : [];

            const viewport = parsed.viewport &&
                typeof parsed.viewport.x === 'number' &&
                typeof parsed.viewport.y === 'number' &&
                typeof parsed.viewport.zoom === 'number'
                ? parsed.viewport
                : undefined;

            return {
                nodes,
                edges,
                viewport
            };
        } catch {
            return {
                nodes: [],
                edges: []
            };
        }
    }

    async updateWorkspaceCanvas(
        id: string,
        payload: UpdateWorkspaceCanvasDto,
        userWorkspaceIds: string[],
        userId: string | undefined
    ) {
        if (!userId) {
            throw new UnauthorizedException('Missing authenticated user id');
        }

        await this.assertSpaceCanvasAccess(id, userWorkspaceIds);

        const canvasState: WorkspaceCanvasState = {
            nodes: payload.nodes,
            edges: payload.edges,
            viewport: payload.viewport
        };

        await (this.prisma as any).workspace.upsert({
            where: { id },
            update: {
                canvasState: JSON.stringify(canvasState)
            },
            create: {
                id,
                userId,
                name: `Workspace ${id}`,
                canvasState: JSON.stringify(canvasState)
            }
        });

        return {
            success: true
        };
    }

    async getKlingElementsLibrary(id: string, userWorkspaceIds: string[], requesterUserId: string) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readLibraryStore();
        const items = Array.isArray(store[id]) ? store[id] : [];
        const normalizedItems = await Promise.all(
            items.map(async (item) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) {
                    return item;
                }

                const rawImageUrls = (item as { imageUrls?: unknown }).imageUrls;
                if (!Array.isArray(rawImageUrls)) {
                    return item;
                }

                const imageUrls = await Promise.all(
                    rawImageUrls.map((value) => {
                        if (typeof value !== 'string') {
                            return Promise.resolve(value);
                        }

                        return this.toDisplayableStorageUrl(value, requesterUserId);
                    })
                );

                return {
                    ...item,
                    imageUrls
                };
            })
        );

        return {
            items: normalizedItems
        };
    }

    async updateKlingElementsLibrary(
        id: string,
        payload: UpdateKlingElementsLibraryDto,
        userWorkspaceIds: string[]
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readLibraryStore();
        const previousItems = Array.isArray(store[id]) ? store[id] : [];
        const previousUrls = new Set(this.collectLibraryImageUrls(previousItems));

        store[id] = payload.items;

        const nextUrlsInWorkspace = new Set(this.collectLibraryImageUrls(payload.items));
        const remainingUrlsInAllWorkspaces = new Set(
            Object.values(store).flatMap((items) => this.collectLibraryImageUrls(Array.isArray(items) ? items : []))
        );

        const urlsToDelete = Array.from(previousUrls).filter((url) => {
            if (nextUrlsInWorkspace.has(url)) {
                return false;
            }

            return !remainingUrlsInAllWorkspaces.has(url);
        });

        await this.writeLibraryStore(store);

        let deletedStorageObjects = 0;

        if (urlsToDelete.length > 0) {
            try {
                await this.deleteLibraryStorageFiles(id, urlsToDelete);
                deletedStorageObjects = urlsToDelete.length;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'unknown error';
                console.warn(`[workspaces] failed to delete ${urlsToDelete.length} storage object(s): ${message}`);
            }
        }

        return {
            success: true,
            count: payload.items.length,
            deletedStorageObjects
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

    async uploadElementLibraryFile(
        id: string,
        payload: UploadWorkspaceFileDto,
        userWorkspaceIds: string[],
        userId: string
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const fileUrl = await this.uploadImageToSupabaseStorage(payload.base64Data, payload.fileName, id, userId);
        return {
            fileUrl
        };
    }
}
