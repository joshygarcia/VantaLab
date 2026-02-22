import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center">
            <div className="mb-4 text-6xl font-black tracking-tighter text-white/10">404</div>
            <h1 className="text-xl font-bold text-white">Page not found</h1>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
                href="/"
                className="mt-6 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-zinc-200"
            >
                Back to Home
            </Link>
        </div>
    );
}
