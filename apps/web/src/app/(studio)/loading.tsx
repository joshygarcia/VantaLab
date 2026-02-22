export default function StudioLoading() {
    return (
        <div className="flex h-screen items-center justify-center bg-ink-950">
            <div className="flex flex-col items-center gap-4">
                <div className="relative h-10 w-10">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-400" />
                    <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-violet-400" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                </div>
                <span className="text-sm font-medium text-zinc-500">Loading studio…</span>
            </div>
        </div>
    );
}
