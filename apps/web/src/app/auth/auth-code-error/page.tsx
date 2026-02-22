import Link from 'next/link';

export default function AuthCodeError() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-950/30">
                <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-xl font-bold text-white">Sign-in failed</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                We couldn't verify your account. This can happen if the sign-in link
                expired or was already used. Please try signing in again.
            </p>
            <div className="mt-6 flex gap-3">
                <Link
                    href="/"
                    className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-zinc-200"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
