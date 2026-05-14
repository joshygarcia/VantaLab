import { NextResponse } from 'next/server';

// Firebase Auth uses popup/redirect flows that complete on the client and
// post the resulting ID token to /api/auth/session. This legacy callback
// route is kept only to redirect any stale Supabase OAuth links back to
// the app entry point.
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const next = searchParams.get('next') ?? '/dashboard';
    return NextResponse.redirect(`${origin}${next}`);
}
