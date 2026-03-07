export default function StudioLoading() {
  return (
    <div className="flex h-full min-h-full items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-studio-700 bg-studio-900 px-8 py-7 shadow-studio">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-studio-gold" />
          <div
            className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-zinc-400"
            style={{ animationDirection: 'reverse', animationDuration: '0.9s' }}
          />
        </div>
        <span className="text-sm font-medium text-zinc-400">Loading studio...</span>
      </div>
    </div>
  );
}
