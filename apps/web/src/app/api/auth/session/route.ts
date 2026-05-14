import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

const SESSION_COOKIE = '__vanta_session';
// 14 days
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
    let body: { idToken?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const idToken = body.idToken;
    if (!idToken) {
        return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    try {
        const auth = getAdminAuth();
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_TTL_MS });

        const response = NextResponse.json({ ok: true });
        response.cookies.set(SESSION_COOKIE, sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_TTL_MS / 1000,
        });
        return response;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: `Failed to create session: ${message}` }, { status: 401 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
}
