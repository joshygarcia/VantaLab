'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled error:', error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-950/30">
                <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                An unexpected error occurred. Our team has been notified. You can try
                again or return to the home page.
            </p>
            <div className="mt-6 flex gap-3">
                <button
                    onClick={reset}
                    className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                    Try Again
                </button>
                <a
                    href="/"
                    className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-zinc-200"
                >
                    Go Home
                </a>
            </div>
        </div>
    );
}
