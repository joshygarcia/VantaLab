import { createClient } from '@/lib/supabase/client';
import { chooseWorkspaceTokenStrategy } from '@/lib/workspace-token-strategy';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const DEV_JWT = process.env.NEXT_PUBLIC_DEV_JWT;
const IS_DEV_ENV = process.env.NODE_ENV !== 'production';
const DEV_FALLBACK_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? 'dev-user';

const workspaceTokens = new Map<string, string>();
const tokenWorkspaceAccess = new Map<string, boolean>();

const ELEMENT_NAME_MAX_LENGTH = 80;
const ELEMENT_DESCRIPTION_MAX_LENGTH = 500;
const ELEMENT_TAG_MAX_LENGTH = 24;
const ELEMENT_TAG_MAX_COUNT = 8;
const ELEMENT_IMAGE_MAX_COUNT = 4;

export type ElementLibraryItem = {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  tags?: string[];
};

export type LegacyElementLibraryItem = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  mode?: string;
  imageUrls?: string[];
  videoUrls?: string[];
};

export type CustomSpaceItem = {
  id: string;
  ownerWorkspaceId: string;
  name: string;
  description: string;
  protection: 'standard' | 'template-only' | 'locked' | 'team-shared';
  sharedWorkspaceIds: string[];
  createdAt: string;
};

export type FeaturedTemplateKey =
  | 'influencer-launch'
  | 'product-story'
  | 'content-batch';

export type BillingTransaction = {
  id: string;
  userId: string;
  packageId: string;
  credits: number;
  amountInCents: number;
  currency: string;
  stripePaymentIntentId: string;
  metadata: string | null;
  processedAt: string;
};

export type GenerationHistoryItem = {
  id: string;
  workspaceId: string;
  model: string;
  prompt: string;
  mediaUrl: string;
  mediaUrls?: string[];
  createdAt: string;
  expiresAt: string;
};

type GenerationHistoryResponse = {
  retentionDays: number;
  items: GenerationHistoryItem[];
};

type GenerationHistoryFilters = {
  workspaceId?: string;
  model?: string;
  startDate?: string;
  endDate?: string;
};

type ExecuteRequest = {
  workspaceId: string;
  nodeId: string;
  model: string;
  parameters: {
    prompt: string;
    referenceImageUrl?: string;
    referenceVideoUrl?: string;
    aspectRatio?: string;
    resolution?: string;
    outputFormat?: 'png' | 'jpg';
    amount?: number;
    duration?: string;
    mode?: string;
    sound?: boolean;
    characterOrientation?: 'image' | 'video';
    reasoningEffort?: 'low' | 'high';
    multiShots?: boolean;
    multiPrompt?: Array<{ prompt: string; duration: number }>;
    klingElements?: Array<{
      name: string;
      description?: string;
      elementInputUrls?: string[];
      elementInputVideoUrls?: string[];
    }>;
  };
};

type ExecuteCharacterRequest = {
  workspaceId: string;
  nodeId: string;
  characterName?: string;
  imageModel?: 'seedream-5' | 'nano-banana-2' | 'nano-banana-pro';
  selections: {
    gender?: string;
    ethnicity?: string;
    eyeColor?: string;
    skinCondition?: string;
    ageRange?: string;
    hairStyle?: string;
    bodyType?: string;
    renderStyle?: string;
  };
  customPrompt?: string;
  aspectRatio?: string;
  resolution?: string;
};

type ExecuteResponse = {
  status: string;
  jobId: string;
  message: string;
  estimatedCreditCost?: number;
};

type JobResponse = {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  mediaUrl?: string;
  resultUrls?: string[];
  textOutput?: string;
  error?: string;
};

type JobStreamHandlers = {
  onUpdate: (job: JobResponse) => void;
  onError?: () => void;
};

type KlingElementsLibraryResponse = {
  items: ElementLibraryItem[];
  legacyItems: LegacyElementLibraryItem[];
};

type CustomSpacesResponse = {
  items: CustomSpaceItem[];
};

type BillingBalanceResponse = {
  credits: number;
};

type BillingTransactionsResponse = {
  transactions: BillingTransaction[];
};

export type WorkspaceCanvasPayload = {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image file'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const sanitizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }

    const tag = entry.trim().toLowerCase();
    if (!tag || tag.length > ELEMENT_TAG_MAX_LENGTH || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalized.push(tag);
    if (normalized.length >= ELEMENT_TAG_MAX_COUNT) {
      break;
    }
  }

  return normalized;
};

const sanitizeImageUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .slice(0, ELEMENT_IMAGE_MAX_COUNT);
};

const parseElementLibraryItem = (value: unknown): ElementLibraryItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';
  const imageUrls = sanitizeImageUrls(value.imageUrls);
  const tags = sanitizeTags(value.tags);

  if (!id || !name || !description) {
    return null;
  }

  if (name.length > ELEMENT_NAME_MAX_LENGTH || description.length > ELEMENT_DESCRIPTION_MAX_LENGTH) {
    return null;
  }

  if (imageUrls.length < 2 || imageUrls.length > 4) {
    return null;
  }

  return {
    id,
    name,
    description,
    imageUrls,
    tags: tags.length > 0 ? tags : undefined
  };
};

const parseLegacyElementLibraryItem = (value: unknown): LegacyElementLibraryItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';

  if (!id || !name) {
    return null;
  }

  const description = typeof value.description === 'string' ? value.description.trim() : undefined;
  const category = typeof value.category === 'string' ? value.category : undefined;
  const mode = typeof value.mode === 'string' ? value.mode : undefined;
  const imageUrls = sanitizeImageUrls(value.imageUrls);
  const videoUrls = Array.isArray(value.videoUrls)
    ? value.videoUrls.filter((entry): entry is string => typeof entry === 'string').map((url) => url.trim()).filter((url) => url.length > 0)
    : undefined;

  const hasLegacySignal =
    typeof category === 'string' ||
    typeof mode === 'string' ||
    (Array.isArray(videoUrls) && videoUrls.length > 0) ||
    !Array.isArray(value.tags);

  if (!hasLegacySignal) {
    return null;
  }

  return {
    id,
    name,
    description,
    category,
    mode,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    videoUrls: videoUrls && videoUrls.length > 0 ? videoUrls : undefined
  };
};

async function getAccessToken(workspaceId: string): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const sessionUserId = data.session?.user?.id?.trim();
  const sessionToken = data.session?.access_token;

  const existing = workspaceTokens.get(workspaceId);
  if (existing) {
    return existing;
  }

  const sessionHasDirectWorkspaceAccess = sessionToken
    ? await tokenCanAccessWorkspace(sessionToken, workspaceId)
    : false;
  const devJwtHasDirectWorkspaceAccess = DEV_JWT
    ? await tokenCanAccessWorkspace(DEV_JWT, workspaceId)
    : false;

  const strategy = chooseWorkspaceTokenStrategy({
    hasSessionToken: Boolean(sessionToken),
    sessionHasDirectWorkspaceAccess,
    hasDevJwt: Boolean(DEV_JWT),
    devJwtHasDirectWorkspaceAccess,
    isDevEnv: IS_DEV_ENV
  });

  if (strategy === 'session' && sessionToken) {
    return sessionToken;
  }

  if (strategy === 'dev-jwt' && DEV_JWT) {
    return DEV_JWT;
  }

  if (strategy === 'error') {
    throw new Error('Failed to acquire auth token for workspace scope');
  }

  const response = await fetch(`${API_BASE}/auth/dev-token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      userId: sessionUserId || DEV_FALLBACK_USER_ID,
      workspaceIds: [workspaceId]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to acquire auth token');
  }

  const body = (await response.json()) as { accessToken: string };
  workspaceTokens.set(workspaceId, body.accessToken);
  tokenWorkspaceAccess.set(buildTokenWorkspaceCacheKey(body.accessToken, workspaceId), true);
  return body.accessToken;
}

function buildTokenWorkspaceCacheKey(token: string, workspaceId: string): string {
  return `${token}::${workspaceId}`;
}

async function tokenCanAccessWorkspace(token: string, workspaceId: string): Promise<boolean> {
  const cacheKey = buildTokenWorkspaceCacheKey(token, workspaceId);
  const cached = tokenWorkspaceAccess.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      tokenWorkspaceAccess.set(cacheKey, false);
      return false;
    }

    const payload = (await response.json()) as { workspaceIds?: unknown };
    const workspaceIds = Array.isArray(payload.workspaceIds)
      ? payload.workspaceIds.filter((entry): entry is string => typeof entry === 'string')
      : [];
    const allowed = workspaceIds.includes(workspaceId);
    tokenWorkspaceAccess.set(cacheKey, allowed);
    return allowed;
  } catch {
    tokenWorkspaceAccess.set(cacheKey, false);
    return false;
  }
}

export async function getUserWorkspaceIds(): Promise<string[]> {
  try {
    const accessToken = await getUserAccessToken();
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { workspaceIds?: unknown };
    if (!Array.isArray(payload.workspaceIds)) {
      return [];
    }

    return payload.workspaceIds.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

async function getUserAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();

  if (data.session?.access_token) {
    return data.session.access_token;
  }

  if (DEV_JWT) {
    return DEV_JWT;
  }

  if (!IS_DEV_ENV) {
    throw new Error('Failed to acquire auth token');
  }

  return getAccessToken('local');
}

export async function executeWorkflow(payload: ExecuteRequest): Promise<ExecuteResponse> {
  const accessToken = await getAccessToken(payload.workspaceId);
  const response = await fetch(`${API_BASE}/workflows/execute`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID(),
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    try {
      const errorPayload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorPayload.message) && errorPayload.message.length > 0) {
        throw new Error(errorPayload.message[0]);
      }
      if (typeof errorPayload.message === 'string' && errorPayload.message.trim().length > 0) {
        throw new Error(errorPayload.message);
      }
    } catch (error) {
      if (error instanceof Error && error.message.trim().length > 0) {
        throw error;
      }
    }

    throw new Error('Failed to queue workflow');
  }

  return response.json();
}

export async function executeCharacterWorkflow(payload: ExecuteCharacterRequest): Promise<ExecuteResponse> {
  const accessToken = await getAccessToken(payload.workspaceId);
  const response = await fetch(`${API_BASE}/workflows/execute-character`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID(),
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    try {
      const errorPayload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorPayload.message) && errorPayload.message.length > 0) {
        throw new Error(errorPayload.message[0]);
      }
      if (typeof errorPayload.message === 'string' && errorPayload.message.trim().length > 0) {
        throw new Error(errorPayload.message);
      }
    } catch (error) {
      if (error instanceof Error && error.message.trim().length > 0) {
        throw error;
      }
    }

    throw new Error('Failed to queue character workflow');
  }

  return response.json();
}

export async function getJobStatus(jobId: string, workspaceId: string): Promise<JobResponse> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workflows/jobs/${jobId}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch job status');
  }

  return response.json();
}

export function subscribeToJobStatus(
  jobId: string,
  workspaceId: string,
  handlers: JobStreamHandlers
): () => void {
  let eventSource: EventSource | null = null;
  let isCancelled = false;

  const init = async () => {
    let accessToken: string;
    try {
      accessToken = await getAccessToken(workspaceId);
    } catch {
      if (!isCancelled) handlers.onError?.();
      return;
    }

    if (isCancelled) return;

    const streamUrl = `${API_BASE}/workflows/jobs/${jobId}/events?access_token=${encodeURIComponent(accessToken)}`;
    eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as JobResponse;
      handlers.onUpdate(payload);
    };

    eventSource.onerror = () => {
      handlers.onError?.();
      eventSource?.close();
    };
  };

  void init();

  return () => {
    isCancelled = true;
    if (eventSource) {
      eventSource.close();
    }
  };
}

export async function getKlingElementsLibrary(workspaceId: string): Promise<KlingElementsLibraryResponse> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/kling-elements-library`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Kling elements library');
  }

  const payload = (await response.json()) as { items?: unknown };
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  const items: ElementLibraryItem[] = [];
  const legacyItems: LegacyElementLibraryItem[] = [];

  for (const rawItem of rawItems) {
    const parsedItem = parseElementLibraryItem(rawItem);
    if (parsedItem) {
      items.push(parsedItem);
      continue;
    }

    const legacyItem = parseLegacyElementLibraryItem(rawItem);
    if (legacyItem) {
      legacyItems.push(legacyItem);
    }
  }

  return { items, legacyItems };
}

export async function updateKlingElementsLibrary(
  workspaceId: string,
  items: ElementLibraryItem[]
): Promise<{ success: boolean; count: number; deletedStorageObjects?: number }> {
  const normalizedItems = items.map((item) => {
    const normalized = parseElementLibraryItem(item);
    if (!normalized) {
      throw new Error(`Invalid element library item: ${item.id}`);
    }

    return normalized;
  });

  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/kling-elements-library`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ items: normalizedItems })
  });

  if (!response.ok) {
    throw new Error('Failed to update Kling elements library');
  }

  return response.json();
}

export async function listCustomSpaces(workspaceId: string): Promise<CustomSpacesResponse> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/spaces`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch custom spaces');
  }

  return response.json();
}

export async function createCustomSpace(
  workspaceId: string,
  payload: {
    name: string;
    description?: string;
    protection?: 'standard' | 'template-only' | 'locked' | 'team-shared';
    sharedWorkspaceIds?: string[];
  }
): Promise<{ item: CustomSpaceItem }> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/spaces`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to create custom space');
  }

  return response.json();
}

export async function createSpaceFromTemplate(
  workspaceId: string,
  payload: {
    templateKey: FeaturedTemplateKey;
    name: string;
    description?: string;
    protection: 'standard' | 'template-only' | 'locked' | 'team-shared';
    sharedWorkspaceIds?: string[];
  }
): Promise<{ item: CustomSpaceItem; canvasSeeded: boolean }> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/spaces/from-template`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to create space from template');
  }

  return response.json();
}

export async function updateCustomSpace(
  workspaceId: string,
  spaceId: string,
  payload: {
    name?: string;
    description?: string;
    protection?: 'standard' | 'template-only' | 'locked' | 'team-shared';
    sharedWorkspaceIds?: string[];
  }
): Promise<{ item: CustomSpaceItem }> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/spaces/${spaceId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to update custom space');
  }

  return response.json();
}

export async function deleteCustomSpace(
  workspaceId: string,
  spaceId: string
): Promise<{ success: boolean; deleted: boolean }> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/spaces/${spaceId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete custom space');
  }

  return response.json();
}

export async function getWorkspaceCanvas(workspaceId: string): Promise<WorkspaceCanvasPayload> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/canvas`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch workspace canvas');
  }

  return response.json();
}

export async function updateWorkspaceCanvas(
  workspaceId: string,
  payload: WorkspaceCanvasPayload
): Promise<{ success: boolean }> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/canvas`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Failed to save workspace canvas');
  }

  return response.json();
}

export async function uploadWorkspaceImage(workspaceId: string, file: File): Promise<string> {
  const accessToken = await getAccessToken(workspaceId);
  const base64Data = await readFileAsDataUrl(file);

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/files/upload`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      base64Data,
      fileName: file.name
    })
  });

  if (!response.ok) {
    let message = 'Failed to upload image file';
    try {
      const errorPayload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorPayload.message) && errorPayload.message.length > 0) {
        message = errorPayload.message[0];
      } else if (typeof errorPayload.message === 'string' && errorPayload.message.trim().length > 0) {
        message = errorPayload.message;
      }
    } catch {
      // Keep fallback message when response body is not JSON.
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as { fileUrl?: string };
  if (!payload.fileUrl) {
    throw new Error('Image upload response was missing fileUrl');
  }

  return payload.fileUrl;
}

export async function uploadElementLibraryImage(workspaceId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  const accessToken = await getAccessToken(workspaceId);
  const base64Data = await readFileAsDataUrl(file);

  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/element-library/upload`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      base64Data,
      fileName: file.name
    })
  });

  if (!response.ok) {
    let message = 'Failed to upload image to Supabase Storage';
    try {
      const errorPayload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorPayload.message) && errorPayload.message.length > 0) {
        message = errorPayload.message[0];
      } else if (typeof errorPayload.message === 'string' && errorPayload.message.trim().length > 0) {
        message = errorPayload.message;
      }
    } catch {
      // Preserve fallback.
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as { fileUrl?: string };
  if (!payload.fileUrl) {
    throw new Error('Supabase upload response was missing fileUrl');
  }

  return payload.fileUrl;
}

export async function getBillingBalance(): Promise<BillingBalanceResponse> {
  const accessToken = await getUserAccessToken();
  const response = await fetch(`${API_BASE}/billing/balance`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch billing balance');
  }

  return response.json();
}

export async function listGenerationHistory(
  limit = 100,
  filters: GenerationHistoryFilters = {}
): Promise<GenerationHistoryResponse> {
  const accessToken = await getUserAccessToken();
  const params = new URLSearchParams();
  params.set('limit', String(limit));

  if (filters.workspaceId?.trim()) {
    params.set('workspaceId', filters.workspaceId.trim());
  }

  if (filters.model?.trim()) {
    params.set('model', filters.model.trim());
  }

  if (filters.startDate?.trim()) {
    params.set('startDate', filters.startDate.trim());
  }

  if (filters.endDate?.trim()) {
    params.set('endDate', filters.endDate.trim());
  }

  const query = `?${params.toString()}`;
  const response = await fetch(`${API_BASE}/workflows/history${query}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch generation history');
  }

  return response.json();
}

export async function listBillingTransactions(limit = 50): Promise<BillingTransactionsResponse> {
  const accessToken = await getUserAccessToken();
  const query = `?limit=${encodeURIComponent(String(limit))}`;
  const response = await fetch(`${API_BASE}/billing/transactions${query}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch billing transactions');
  }

  return response.json();
}
