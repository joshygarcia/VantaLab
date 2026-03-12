'use client';

import { Library, LoaderCircle, RefreshCw, Search, X } from 'lucide-react';

import type { ElementLibrarySelectionItem } from './element-library-selection';

type ElementLibraryPickerModalProps = {
  open: boolean;
  items: ElementLibrarySelectionItem[];
  loading: boolean;
  query: string;
  selectedIds: string[];
  status?: string;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onToggleItem: (itemId: string) => void;
  onClose: () => void;
  onApply: () => void;
};

export function ElementLibraryPickerModal({
  open,
  items,
  loading,
  query,
  selectedIds,
  status,
  onQueryChange,
  onRefresh,
  onToggleItem,
  onClose,
  onApply
}: ElementLibraryPickerModalProps) {
  if (!open) {
    return null;
  }

  const selectedIdSet = new Set(selectedIds);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }

    const haystack = [item.name, item.description, ...(item.tags ?? [])].join(' ').toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#10141b] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200">
                <Library size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-white">Add characters or elements</h2>
                <p className="text-sm text-zinc-400">Pick reusable library entries for this run.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
                onClick={onRefresh}
                disabled={loading}
              >
                {loading ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
                onClick={onClose}
              >
                <X size={14} />
                <span>Close</span>
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-black transition hover:bg-zinc-200"
                onClick={onApply}
                disabled={loading}
              >
                Apply selection
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search by name, description, or tags..."
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
              />
            </div>
            <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300">
              {selectedIds.length} selected
            </div>
          </div>
          {status ? <p className="mt-3 text-xs text-zinc-400">{status}</p> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {filteredItems.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] text-sm text-zinc-500">
              {loading ? 'Loading library...' : 'No matching library items'}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const active = selectedIdSet.has(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`group relative overflow-hidden rounded-[24px] border text-left transition ${
                      active
                        ? 'border-sky-400/60 bg-sky-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                    onClick={() => onToggleItem(item.id)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {item.imageUrls[0] ? (
                        <img
                          src={item.imageUrls[0]}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                      <div className="absolute right-3 top-3 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-black/45 px-2 text-[11px] font-semibold text-white">
                        {active ? 'Added' : 'Add'}
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{item.imageUrls.length} refs</span>
                        <span>{(item.tags ?? []).length} tags</span>
                      </div>

                      {(item.tags ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(item.tags ?? []).slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-semibold text-zinc-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
