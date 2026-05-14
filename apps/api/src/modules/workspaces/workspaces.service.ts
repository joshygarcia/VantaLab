import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DbService } from '../database/db.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UpdateWorkspaceSettingsDto } from './dto/update-workspace.dto';
import { UpdateKlingElementsLibraryDto } from './dto/update-kling-elements-library.dto';
import { UploadWorkspaceFileDto } from './dto/upload-workspace-file.dto';
import { CreateCustomSpaceDto, SpaceProtection } from './dto/create-custom-space.dto';
import { CreateSpaceFromTemplateDto } from './dto/create-space-from-template.dto';
import { UpdateCustomSpaceDto } from './dto/update-custom-space.dto';
import { UpdateWorkspaceCanvasDto } from './dto/update-workspace-canvas.dto';
import { FeaturedTemplateKey, getFeaturedTemplateDefinition } from './template-canvas-registry';

type KieUploadResponse = {
    success?: boolean;
    code?: number;
    msg?: string;
    data?: { fileUrl?: string; downloadUrl?: string };
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

type CustomSpaceConfig = {
    ownerWorkspaceId: string;
    description: string;
    protection: SpaceProtection;
    sharedWorkspaceIds: string[];
    createdAt: string;
};

type WorkspaceCanvasState = {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    viewport?: { x: number; y: number; zoom: number };
};

type KlingLibraryItem = {
    imageUrls?: unknown;
};

const LIBRARY_DOC_PATH = (workspaceId: string) => ({ workspaceId });

@Injectable()
export class WorkspacesService {
    constructor(
        private readonly db: DbService,
        private readonly firebase: FirebaseService,
    ) { }

    private sanitizeStoragePathSegment(value: string) {
        return value
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    private get firestore() {
        return this.firebase.firestore;
    }

    private getElementLibraryPrefix(): string {
        return process.env.FIREBASE_ELEMENT_LIBRARY_PREFIX ?? 'element-library';
    }

    private extractFirebaseObjectPath(fileUrl: string): string | null {
        const bucketName = this.firebase.bucket.name;
        const directPrefix = `https://storage.googleapis.com/${bucketName}/`;
        if (fileUrl.startsWith(directPrefix)) {
            return decodeURIComponent(fileUrl.slice(directPrefix.length));
        }
        return null;
    }

    private assertWorkspaceAccess(id: string, userWorkspaceIds: string[]) {
        if (!userWorkspaceIds.includes(id)) {
            throw new UnauthorizedException('User does not have access to this workspace');
        }
    }

    private canAccessCustomSpace(space: CustomSpaceItem, userWorkspaceIds: string[]) {
        if (userWorkspaceIds.includes(space.ownerWorkspaceId)) return true;
        return (
            space.protection === 'team-shared' &&
            space.sharedWorkspaceIds.some((wsId) => userWorkspaceIds.includes(wsId))
        );
    }

    private async assertSpaceCanvasAccess(spaceId: string, userWorkspaceIds: string[]) {
        if (userWorkspaceIds.includes(spaceId)) return;
        const matched = await this.findCustomSpaceById(spaceId);
        if (matched && this.canAccessCustomSpace(matched, userWorkspaceIds)) return;
        throw new UnauthorizedException('User does not have access to this space');
    }

    private async resolveWorkspaceOwnerForSpace(spaceId: string, userWorkspaceIds: string[]) {
        if (userWorkspaceIds.includes(spaceId)) return spaceId;
        const matched = await this.findCustomSpaceById(spaceId);
        if (matched && this.canAccessCustomSpace(matched, userWorkspaceIds)) {
            return matched.ownerWorkspaceId;
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ base64Data, uploadPath: `vanta-lab/${Date.now()}`, fileName })
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

    private async uploadImageToFirebaseStorage(
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

        if (!binary.length) throw new BadRequestException('Image payload is empty');

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
        const prefix = this.getElementLibraryPrefix();
        const objectPath = `${prefix}/${workspaceSegment}/${userSegment}/${Date.now()}_${randomUUID().slice(0, 8)}.${extension}`;

        const file = this.firebase.bucket.file(objectPath);
        await file.save(binary, {
            contentType: mimeType,
            metadata: { cacheControl: 'public, max-age=3600' },
            resumable: false,
        });
        await file.makePublic();
        return `https://storage.googleapis.com/${this.firebase.bucket.name}/${objectPath}`;
    }

    // ─── Kling elements library (Firestore-backed) ────────────────────────
    private libraryDoc(workspaceId: string) {
        return this.firestore.collection('klingElementsLibrary').doc(workspaceId);
    }

    private async readLibrary(workspaceId: string): Promise<unknown[]> {
        const snap = await this.libraryDoc(workspaceId).get();
        if (!snap.exists) return [];
        const data = snap.data() as { items?: unknown };
        return Array.isArray(data?.items) ? data.items : [];
    }

    private async writeLibrary(workspaceId: string, items: unknown[]) {
        await this.libraryDoc(workspaceId).set({ items, updatedAt: new Date() });
    }

    private async readAllLibraries(): Promise<Record<string, unknown[]>> {
        const snap = await this.firestore.collection('klingElementsLibrary').get();
        const result: Record<string, unknown[]> = {};
        snap.docs.forEach((doc) => {
            const data = doc.data() as { items?: unknown };
            if (Array.isArray(data?.items)) result[doc.id] = data.items;
        });
        return result;
    }

    private collectLibraryImageUrls(items: unknown[]): string[] {
        const urls: string[] = [];
        for (const item of items) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
            const rawImageUrls = (item as KlingLibraryItem).imageUrls;
            if (!Array.isArray(rawImageUrls)) continue;
            for (const rawUrl of rawImageUrls) {
                if (typeof rawUrl !== 'string') continue;
                const normalized = rawUrl.trim();
                if (normalized.length > 0) urls.push(normalized);
            }
        }
        return Array.from(new Set(urls));
    }

    private async deleteLibraryStorageFiles(workspaceId: string, fileUrls: string[]) {
        if (fileUrls.length === 0) return;
        const workspaceSegment = this.sanitizeStoragePathSegment(workspaceId);
        if (!workspaceSegment) return;
        const prefix = this.getElementLibraryPrefix();

        const objectPaths = Array.from(new Set(
            fileUrls
                .map((url) => this.extractFirebaseObjectPath(url))
                .filter((p): p is string => typeof p === 'string' && p.startsWith(`${prefix}/${workspaceSegment}/`))
        ));

        if (objectPaths.length === 0) return;

        await Promise.allSettled(
            objectPaths.map((p) => this.firebase.bucket.file(p).delete({ ignoreNotFound: true } as any))
        );
    }

    // ─── Custom spaces (Firestore-backed via workspace.customSpaceConfig) ──
    private normalizeCustomSpaceConfig(
        workspaceId: string,
        workspaceName: string,
        value: unknown
    ): CustomSpaceItem | null {
        if (!value) return null;
        const parsed = typeof value === 'string'
            ? (() => { try { return JSON.parse(value); } catch { return null; } })()
            : value;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

        const rawConfig = parsed as Partial<CustomSpaceConfig>;
        if (
            typeof rawConfig.ownerWorkspaceId !== 'string' ||
            typeof rawConfig.description !== 'string' ||
            typeof rawConfig.createdAt !== 'string'
        ) return null;

        const protectionRaw = typeof rawConfig.protection === 'string' ? rawConfig.protection : 'standard';
        const protection: SpaceProtection =
            protectionRaw === 'template-only' || protectionRaw === 'locked' || protectionRaw === 'team-shared'
                ? protectionRaw
                : 'standard';

        const sharedWorkspaceIds = Array.isArray(rawConfig.sharedWorkspaceIds)
            ? rawConfig.sharedWorkspaceIds.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
            : [];

        return {
            id: workspaceId,
            ownerWorkspaceId: rawConfig.ownerWorkspaceId,
            name: workspaceName.trim() || workspaceId,
            description: rawConfig.description,
            protection,
            sharedWorkspaceIds: Array.from(new Set(sharedWorkspaceIds)),
            createdAt: rawConfig.createdAt
        };
    }

    private async readAllCustomSpaces(): Promise<Record<string, CustomSpaceItem[]>> {
        const workspaces = await this.db.workspace.findMany({
            where: { customSpaceConfig: { not: null } }
        });

        const normalized: Record<string, CustomSpaceItem[]> = {};
        for (const ws of workspaces) {
            const item = this.normalizeCustomSpaceConfig(ws.id, ws.name, ws.customSpaceConfig);
            if (!item) continue;
            normalized[item.ownerWorkspaceId] = [...(normalized[item.ownerWorkspaceId] ?? []), item];
        }
        for (const [k, items] of Object.entries(normalized)) {
            normalized[k] = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }
        return normalized;
    }

    private async findCustomSpaceById(spaceId: string): Promise<CustomSpaceItem | null> {
        const ws = await this.db.workspace.findUnique({ where: { id: spaceId } });
        if (!ws) return null;
        return this.normalizeCustomSpaceConfig(ws.id, ws.name, ws.customSpaceConfig);
    }

    private isImmutableSpaceProtection(protection: SpaceProtection) {
        return protection === 'template-only' || protection === 'locked';
    }

    private toCustomSpaceConfig(item: CustomSpaceItem): CustomSpaceConfig {
        return {
            ownerWorkspaceId: item.ownerWorkspaceId,
            description: item.description,
            protection: item.protection,
            sharedWorkspaceIds: item.sharedWorkspaceIds,
            createdAt: item.createdAt
        };
    }

    private buildCustomSpaceId(name: string) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return `${slug || 'space'}-${randomUUID().slice(0, 8)}`;
    }

    private normalizeSharedWorkspaceIds(ownerWorkspaceId: string, sharedWorkspaceIds?: string[]) {
        return Array.isArray(sharedWorkspaceIds)
            ? Array.from(new Set(sharedWorkspaceIds.filter((e) => e.trim().length > 0 && e !== ownerWorkspaceId)))
            : [];
    }

    private validateCustomSpaceSharing(
        protection: SpaceProtection,
        sharedWorkspaceIds: string[],
        userWorkspaceIds: string[]
    ) {
        if (sharedWorkspaceIds.some((wsId) => !userWorkspaceIds.includes(wsId))) {
            throw new UnauthorizedException('Cannot share space with workspaces outside your access scope');
        }
        if (protection !== 'team-shared' && sharedWorkspaceIds.length > 0) {
            throw new BadRequestException('sharedWorkspaceIds are only supported for team-shared spaces');
        }
        return protection === 'team-shared' ? sharedWorkspaceIds : [];
    }

    private buildCustomSpaceItem(
        ownerWorkspaceId: string,
        spaceId: string,
        name: string,
        description: string,
        protection: SpaceProtection,
        sharedWorkspaceIds: string[]
    ): CustomSpaceItem {
        return {
            id: spaceId,
            ownerWorkspaceId,
            name,
            description,
            protection,
            sharedWorkspaceIds,
            createdAt: new Date().toISOString()
        };
    }

    private async persistCustomSpace(spaceId: string, item: CustomSpaceItem, userId: string) {
        await this.db.workspace.upsert({
            where: { id: spaceId },
            update: {
                name: item.name,
                customSpaceConfig: JSON.stringify(this.toCustomSpaceConfig(item))
            },
            create: {
                id: spaceId,
                userId,
                name: item.name,
                customSpaceConfig: JSON.stringify(this.toCustomSpaceConfig(item))
            }
        });
    }

    private async persistCanvasState(spaceId: string, canvasState: WorkspaceCanvasState, userId: string) {
        await this.db.workspace.upsert({
            where: { id: spaceId },
            update: { canvasState: JSON.stringify(canvasState) },
            create: {
                id: spaceId,
                userId,
                name: `Workspace ${spaceId}`,
                canvasState: JSON.stringify(canvasState)
            }
        });
    }

    private buildTemplateCanvasState(templateKey: FeaturedTemplateKey, spaceId: string): WorkspaceCanvasState {
        const template = getFeaturedTemplateDefinition(templateKey);
        const canvas = template.buildCanvas(`template_${this.sanitizeStoragePathSegment(spaceId) || spaceId}`);
        return { nodes: canvas.nodes, edges: canvas.edges, viewport: canvas.viewport };
    }

    // ─── Public API ────────────────────────────────────────────────────────
    async updateSettings(id: string, payload: UpdateWorkspaceSettingsDto, userWorkspaceIds: string[], userId: string | undefined) {
        if (!userId) throw new UnauthorizedException('Missing authenticated user id');
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        await this.db.workspace.upsert({
            where: { id },
            update: { kieApiKey: payload.kieApiKey },
            create: { id, userId, name: `Workspace ${id}`, kieApiKey: payload.kieApiKey }
        });

        return { success: true };
    }

    async getWorkspaceCanvas(id: string, userWorkspaceIds: string[]) {
        await this.assertSpaceCanvasAccess(id, userWorkspaceIds);
        const workspace = await this.db.workspace.findUnique({ where: { id } });
        if (!workspace?.canvasState) return { nodes: [], edges: [] };

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
            return { nodes, edges, viewport };
        } catch {
            return { nodes: [], edges: [] };
        }
    }

    async updateWorkspaceCanvas(
        id: string,
        payload: UpdateWorkspaceCanvasDto,
        userWorkspaceIds: string[],
        userId: string | undefined
    ) {
        if (!userId) throw new UnauthorizedException('Missing authenticated user id');
        await this.assertSpaceCanvasAccess(id, userWorkspaceIds);

        const canvasState: WorkspaceCanvasState = {
            nodes: payload.nodes,
            edges: payload.edges,
            viewport: payload.viewport
        };

        await this.db.workspace.upsert({
            where: { id },
            update: { canvasState: JSON.stringify(canvasState) },
            create: { id, userId, name: `Workspace ${id}`, canvasState: JSON.stringify(canvasState) }
        });

        return { success: true };
    }

    async getKlingElementsLibrary(id: string, userWorkspaceIds: string[], _requesterUserId: string) {
        const libraryWorkspaceId = await this.resolveWorkspaceOwnerForSpace(id, userWorkspaceIds);
        const items = await this.readLibrary(libraryWorkspaceId);
        return { items };
    }

    async updateKlingElementsLibrary(
        id: string,
        payload: UpdateKlingElementsLibraryDto,
        userWorkspaceIds: string[]
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const previousItems = await this.readLibrary(id);
        const previousUrls = new Set(this.collectLibraryImageUrls(previousItems));

        await this.writeLibrary(id, payload.items);

        const nextUrlsInWorkspace = new Set(this.collectLibraryImageUrls(payload.items));
        const allLibraries = await this.readAllLibraries();
        const remainingUrlsInAllWorkspaces = new Set(
            Object.values(allLibraries).flatMap((items) => this.collectLibraryImageUrls(items))
        );

        const urlsToDelete = Array.from(previousUrls).filter((url) => {
            if (nextUrlsInWorkspace.has(url)) return false;
            return !remainingUrlsInAllWorkspaces.has(url);
        });

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

        return { success: true, count: payload.items.length, deletedStorageObjects };
    }

    async listCustomSpaces(id: string, userWorkspaceIds: string[]) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const store = await this.readAllCustomSpaces();
        const ownItems = Array.isArray(store[id]) ? store[id] : [];
        const teamSharedItems = Object.values(store)
            .flat()
            .filter((item) =>
                item.ownerWorkspaceId !== id &&
                item.protection === 'team-shared' &&
                item.sharedWorkspaceIds.includes(id)
            );

        const deduped = new Map<string, CustomSpaceItem>();
        for (const item of [...ownItems, ...teamSharedItems]) deduped.set(item.id, item);

        return {
            items: Array.from(deduped.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        };
    }

    async createCustomSpace(
        id: string,
        payload: CreateCustomSpaceDto,
        userWorkspaceIds: string[],
        userId: string | undefined
    ) {
        if (!userId) throw new UnauthorizedException('Missing authenticated user id');
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const trimmedName = payload.name.trim();
        const trimmedDescription = payload.description?.trim() || 'Custom workflow space';
        const protection = payload.protection ?? 'standard';
        const requestedShared = this.normalizeSharedWorkspaceIds(id, payload.sharedWorkspaceIds);
        const sharedWorkspaceIds = this.validateCustomSpaceSharing(protection, requestedShared, userWorkspaceIds);

        const spaceId = this.buildCustomSpaceId(trimmedName);
        const nextItem = this.buildCustomSpaceItem(id, spaceId, trimmedName, trimmedDescription, protection, sharedWorkspaceIds);
        await this.persistCustomSpace(spaceId, nextItem, userId);

        return { item: nextItem };
    }

    async createSpaceFromTemplate(
        id: string,
        payload: CreateSpaceFromTemplateDto,
        userWorkspaceIds: string[],
        userId: string | undefined
    ) {
        if (!userId) throw new UnauthorizedException('Missing authenticated user id');
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const template = getFeaturedTemplateDefinition(payload.templateKey as FeaturedTemplateKey);
        if (!template) throw new BadRequestException('Unknown template key');

        const trimmedName = payload.name.trim();
        if (!trimmedName) throw new BadRequestException('Space name is required');

        const trimmedDescription = payload.description?.trim() || template.description;
        const protection = payload.protection ?? 'standard';
        const requestedShared = this.normalizeSharedWorkspaceIds(id, payload.sharedWorkspaceIds);
        const sharedWorkspaceIds = this.validateCustomSpaceSharing(protection, requestedShared, userWorkspaceIds);
        const spaceId = this.buildCustomSpaceId(trimmedName);
        const nextItem = this.buildCustomSpaceItem(id, spaceId, trimmedName, trimmedDescription, protection, sharedWorkspaceIds);

        await this.persistCustomSpace(spaceId, nextItem, userId);
        await this.persistCanvasState(spaceId, this.buildTemplateCanvasState(payload.templateKey, spaceId), userId);

        return { item: nextItem, canvasSeeded: true };
    }

    async updateCustomSpace(
        id: string,
        spaceId: string,
        payload: UpdateCustomSpaceDto,
        userWorkspaceIds: string[]
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const existing = await this.findCustomSpaceById(spaceId);
        if (!existing || existing.ownerWorkspaceId !== id) {
            throw new NotFoundException('Space not found in this owner workspace');
        }
        if (this.isImmutableSpaceProtection(existing.protection)) {
            throw new BadRequestException('This space is protected and cannot be modified');
        }

        const nextProtection = payload.protection ?? existing.protection;
        const nextSharedWorkspaceIds = payload.sharedWorkspaceIds
            ? Array.from(new Set(payload.sharedWorkspaceIds.filter((e) => e.trim().length > 0 && e !== id)))
            : existing.sharedWorkspaceIds;

        if (nextSharedWorkspaceIds.some((wsId) => !userWorkspaceIds.includes(wsId))) {
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

        await this.db.workspace.updateMany({
            where: { id: spaceId },
            data: {
                name: updatedItem.name,
                customSpaceConfig: JSON.stringify(this.toCustomSpaceConfig(updatedItem))
            }
        });

        return { item: updatedItem };
    }

    async deleteCustomSpace(id: string, spaceId: string, userWorkspaceIds: string[]) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const existing = await this.findCustomSpaceById(spaceId);
        if (!existing || existing.ownerWorkspaceId !== id) {
            throw new NotFoundException('Space not found in this owner workspace');
        }
        if (this.isImmutableSpaceProtection(existing.protection)) {
            throw new BadRequestException('This space is protected and cannot be deleted');
        }

        await this.db.workspace.updateMany({
            where: { id: spaceId },
            data: { customSpaceConfig: null }
        });

        return { success: true, deleted: true };
    }

    async uploadWorkspaceFile(id: string, payload: UploadWorkspaceFileDto, userWorkspaceIds: string[]) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);

        const workspace = await this.db.workspace.findUnique({ where: { id } });
        if (!workspace?.kieApiKey) {
            throw new BadRequestException('Kie.ai API key is missing. Please configure it in Workspace Settings.');
        }

        const fileUrl = await this.uploadImageToKie(payload.base64Data, payload.fileName, workspace.kieApiKey);
        return { fileUrl };
    }

    async uploadElementLibraryFile(
        id: string,
        payload: UploadWorkspaceFileDto,
        userWorkspaceIds: string[],
        userId: string
    ) {
        this.assertWorkspaceAccess(id, userWorkspaceIds);
        const fileUrl = await this.uploadImageToFirebaseStorage(payload.base64Data, payload.fileName, id, userId);
        return { fileUrl };
    }
}
