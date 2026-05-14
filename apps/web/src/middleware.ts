import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
    '/canvas',
    '/dashboard',
    '/spaces',
    '/library',
    '/history',
    '/projects',
    '/element-creator-lab',
    '/billing',
    '/admin',
];

const SESSION_COOKIE = '__vanta_session';

// Middleware runs in the Edge runtime where firebase-admin is unavailable.
// We treat the presence of the session cookie as a soft signal; server
// components and API routes re-verify the cookie cryptographically.
export function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
    const isProtectedRoute = PROTECTED_PREFIXES.some(
        (prefix) => request.nextUrl.pathname.startsWith(prefix)
    );

    if (!sessionCookie && isProtectedRoute) {
        // BYPASSED FOR LOCAL SHOWCASE CAPTURE
        // const redirectUrl = request.nextUrl.clone();
        // redirectUrl.pathname = '/';
        // return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next({ request });
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
