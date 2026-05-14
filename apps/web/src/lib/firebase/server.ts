import 'server-only';
import { cookies } from 'next/headers';
import { getAdminAuth } from './admin';

const SESSION_COOKIE = '__vanta_session';

export async function getServerSessionUser(): Promise<{
    uid: string;
    email: string | null;
    sessionCookie: string;
} | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionCookie) return null;

    try {
        const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
        return {
            uid: decoded.uid,
            email: decoded.email ?? null,
            sessionCookie,
        };
    } catch {
        return null;
    }
}
