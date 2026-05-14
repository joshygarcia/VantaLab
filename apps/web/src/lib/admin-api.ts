import { getFirebaseAuth } from '@/lib/firebase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message) && body.message.length > 0) {
      return body.message[0];
    }

    if (typeof body.message === 'string' && body.message.trim().length > 0) {
      return body.message;
    }
  } catch {
    // Ignore parsing errors and fallback to generic message.
  }

  return `Request failed with status ${response.status}`;
};

export async function adminApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Missing authenticated session');
  }
  const accessToken = await user.getIdToken();

  const headers = new Headers(init.headers ?? {});
  headers.set('authorization', `Bearer ${accessToken}`);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response;
}
