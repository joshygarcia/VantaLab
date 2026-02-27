'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Film, Image as ImageIcon, RefreshCcw } from 'lucide-react';
import { GenerationHistoryItem, listGenerationHistory } from '@/lib/api';

const panelClass = 'rounded-2xl border border-white/5 bg-ink-950/80 backdrop-blur-sm';
const AUTO_APPLY_DELAY_MS = 200;

const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

const getDaysRemaining = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

export default function HistoryPage() {
  const autoApplyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [workspaceFilterDraft, setWorkspaceFilterDraft] = useState('');
  const [modelFilterDraft, setModelFilterDraft] = useState('');
  const [startDateDraft, setStartDateDraft] = useState('');
  const [endDateDraft, setEndDateDraft] = useState('');
  const [filterSourceItems, setFilterSourceItems] = useState<GenerationHistoryItem[]>([]);
  const [activeFilters, setActiveFilters] = useState<{
    workspaceId?: string;
    model?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [items, setItems] = useState<GenerationHistoryItem[]>([]);
  const [retentionDays, setRetentionDays] = useState(14);
  const [status, setStatus] = useState('Loading generation history...');
  const [loading, setLoading] = useState(false);

  const loadHistory = async (filters = activeFilters) => {
    setLoading(true);
    setStatus('Loading generation history...');

    try {
      const result = await listGenerationHistory(200, filters);
      setItems(result.items);
      setRetentionDays(result.retentionDays);

      const hasActiveFilter = Boolean(
        filters.workspaceId || filters.model || filters.startDate || filters.endDate
      );
      if (!hasActiveFilter) {
        setFilterSourceItems(result.items);
      }

      const filterLabels = [
        filters.workspaceId ? `workspace: ${filters.workspaceId}` : null,
        filters.model ? `model: ${filters.model}` : null,
        filters.startDate ? `from: ${filters.startDate}` : null,
        filters.endDate ? `to: ${filters.endDate}` : null
      ].filter((entry): entry is string => Boolean(entry));

      setStatus(
        result.items.length > 0
          ? `Loaded ${result.items.length} generations from the last ${result.retentionDays} days${
              filterLabels.length > 0 ? ` (${filterLabels.join(', ')})` : ''
            }`
          : `No generations in the last ${result.retentionDays} days${
              filterLabels.length > 0 ? ` (${filterLabels.join(', ')})` : ''
            }`
      );
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Failed to load generation history';
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory(activeFilters);
  }, []);

  useEffect(() => {
    return () => {
      if (autoApplyTimeoutRef.current) {
        clearTimeout(autoApplyTimeoutRef.current);
      }
    };
  }, []);

  const clearAutoApplyTimer = () => {
    if (autoApplyTimeoutRef.current) {
      clearTimeout(autoApplyTimeoutRef.current);
      autoApplyTimeoutRef.current = null;
    }
  };

  const applyFilters = () => {
    clearAutoApplyTimer();

    if (startDateDraft && endDateDraft && startDateDraft > endDateDraft) {
      setStatus('Start date must be before or equal to end date');
      return;
    }

    const nextFilters = {
      workspaceId: workspaceFilterDraft.trim() || undefined,
      model: modelFilterDraft.trim() || undefined,
      startDate: startDateDraft || undefined,
      endDate: endDateDraft || undefined
    };

    setActiveFilters(nextFilters);
    void loadHistory(nextFilters);
  };

  const applyFiltersWithDrafts = (overrides: {
    workspaceId?: string;
    model?: string;
  }) => {
    const nextFilters = {
      workspaceId: overrides.workspaceId ?? (workspaceFilterDraft.trim() || undefined),
      model: overrides.model ?? (modelFilterDraft.trim() || undefined),
      startDate: startDateDraft || undefined,
      endDate: endDateDraft || undefined
    };

    setActiveFilters(nextFilters);
    void loadHistory(nextFilters);
  };

  const scheduleAutoApply = (nextWorkspaceId?: string, nextModel?: string) => {
    clearAutoApplyTimer();
    autoApplyTimeoutRef.current = setTimeout(() => {
      applyFiltersWithDrafts({
        workspaceId: nextWorkspaceId,
        model: nextModel
      });
    }, AUTO_APPLY_DELAY_MS);
  };

  const clearFilters = () => {
    clearAutoApplyTimer();
    setWorkspaceFilterDraft('');
    setModelFilterDraft('');
    setStartDateDraft('');
    setEndDateDraft('');
    setActiveFilters({});
    void loadHistory({});
  };

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, GenerationHistoryItem[]>();
    for (const item of items) {
      const dateKey = new Date(item.createdAt).toISOString().slice(0, 10);
      const existing = groups.get(dateKey) ?? [];
      existing.push(item);
      groups.set(dateKey, existing);
    }

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  const workspaceOptions = useMemo(() => {
    return Array.from(new Set(filterSourceItems.map((item) => item.workspaceId)))
      .filter((value) => value.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [filterSourceItems]);

  const modelOptions = useMemo(() => {
    return Array.from(new Set(filterSourceItems.map((item) => item.model)))
      .filter((value) => value.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [filterSourceItems]);

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_14%_8%,rgba(255,255,255,0.02),transparent_40%),linear-gradient(165deg,#000000_0%,#09090b_58%,#000000_100%)] p-5 md:p-7">
      <header className={`${panelClass} p-6`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              Generation Timeline
            </span>
            <h1 className="mt-3 font-display text-4xl leading-[0.92] text-zinc-50">History</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your completed generations are available for {retentionDays} days and then automatically removed.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 disabled:opacity-60"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_180px_auto_auto]">
          <select
            value={workspaceFilterDraft}
            onChange={(event) => {
              const nextValue = event.target.value;
              setWorkspaceFilterDraft(nextValue);
              scheduleAutoApply(nextValue.trim() || undefined, modelFilterDraft.trim() || undefined);
            }}
            className="h-10 rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50"
          >
            <option value="">All workspaces</option>
            {workspaceOptions.map((workspaceId) => (
              <option key={workspaceId} value={workspaceId}>
                {workspaceId}
              </option>
            ))}
          </select>
          <select
            value={modelFilterDraft}
            onChange={(event) => {
              const nextValue = event.target.value;
              setModelFilterDraft(nextValue);
              scheduleAutoApply(workspaceFilterDraft.trim() || undefined, nextValue.trim() || undefined);
            }}
            className="h-10 rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50"
          >
            <option value="">All models</option>
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDateDraft}
            onChange={(event) => setStartDateDraft(event.target.value)}
            className="h-10 rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50"
          />
          <input
            type="date"
            value={endDateDraft}
            onChange={(event) => setEndDateDraft(event.target.value)}
            className="h-10 rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50"
          />
          <button
            type="button"
            onClick={applyFilters}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            Apply Date Range
          </button>
          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-60"
          >
            Clear
          </button>
        </div>

        <p className="mt-4 text-xs font-medium text-zinc-400">{status}</p>
      </header>

      <section className="mt-4 space-y-4">
        {groupedByDate.length === 0 ? (
          <div className={`${panelClass} flex h-36 items-center justify-center text-sm text-zinc-500`}>
            No completed generations yet.
          </div>
        ) : (
          groupedByDate.map(([dateKey, groupItems]) => (
            <section key={dateKey} className={panelClass}>
              <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">
                <Clock3 className="h-3.5 w-3.5" />
                {new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(undefined, { dateStyle: 'full' })}
              </div>

              <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {groupItems.map((item) => {
                  const daysRemaining = getDaysRemaining(item.expiresAt);
                  const video = isVideoUrl(item.mediaUrl);

                  return (
                    <article key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-ink-900/70">
                      <div className="aspect-video w-full overflow-hidden bg-black/40">
                        {video ? (
                          <video src={item.mediaUrl} controls preload="metadata" className="h-full w-full object-cover" />
                        ) : (
                          <img src={item.mediaUrl} alt="Generated media" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </div>

                      <div className="space-y-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-300">
                            {video ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                            {item.model}
                          </span>
                          <span className="text-[10px] text-zinc-500">{daysRemaining}d left</span>
                        </div>

                        <p className="line-clamp-3 text-xs leading-relaxed text-zinc-300">{item.prompt}</p>

                        <div className="text-[10px] text-zinc-500">
                          <p>Generated: {formatDateTime(item.createdAt)}</p>
                          <p>Expires: {formatDateTime(item.expiresAt)}</p>
                          <p className="truncate">Workspace: {item.workspaceId}</p>
                        </div>

                        <a
                          href={item.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-white/10"
                        >
                          Open media
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </section>
    </main>
  );
}
