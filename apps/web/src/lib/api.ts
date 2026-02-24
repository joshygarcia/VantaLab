import { createClient } from '@/lib/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const DEV_JWT = process.env.NEXT_PUBLIC_DEV_JWT;

const workspaceTokens = new Map<string, string>();

export type KlingElementLibraryItem = {
  id: string;
  name: string;
  description?: string;
  category: 'object' | 'character' | 'animal' | 'influencer' | 'custom';
  mode: 'images' | 'video';
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

type ExecuteRequest = {
  workspaceId: string;
  nodeId: string;
  model: string;
  parameters: {
    prompt: string;
    referenceImageUrl?: string;
    aspectRatio?: string;
    resolution?: string;
    amount?: number;
    duration?: string;
    mode?: 'std' | 'pro';
    sound?: boolean;
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

type ExecuteResponse = {
  status: string;
  jobId: string;
  message: string;
};

type JobResponse = {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  mediaUrl?: string;
};

type JobStreamHandlers = {
  onUpdate: (job: JobResponse) => void;
  onError?: () => void;
};

type KlingElementsLibraryResponse = {
  items: KlingElementLibraryItem[];
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

async function getAccessToken(workspaceId: string): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();

  if (data.session?.access_token) {
    return data.session.access_token;
  }

  if (DEV_JWT) {
    return DEV_JWT;
  }

  const existing = workspaceTokens.get(workspaceId);
  if (existing) {
    return existing;
  }

  const response = await fetch(`${API_BASE}/auth/dev-token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ workspaceIds: [workspaceId] })
  });

  if (!response.ok) {
    throw new Error('Failed to acquire auth token');
  }

  const body = (await response.json()) as { accessToken: string };
  workspaceTokens.set(workspaceId, body.accessToken);
  return body.accessToken;
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
    throw new Error('Failed to queue workflow');
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

  return response.json();
}

export async function updateKlingElementsLibrary(
  workspaceId: string,
  items: KlingElementLibraryItem[]
): Promise<{ success: boolean; count: number }> {
  const accessToken = await getAccessToken(workspaceId);
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/kling-elements-library`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ items })
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

export async function getBillingBalance(): Promise<BillingBalanceResponse> {
  const accessToken = await getAccessToken('local');
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

export async function listBillingTransactions(limit = 50): Promise<BillingTransactionsResponse> {
  const accessToken = await getAccessToken('local');
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
