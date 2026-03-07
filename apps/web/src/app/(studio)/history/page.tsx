'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Download, Film, Image as ImageIcon, RefreshCcw, X } from 'lucide-react';
import { GenerationHistoryItem, listGenerationHistory } from '@/lib/api';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS, STUDIO_PANEL_MUTED_CLASS } from '@/components/studio/StudioSection';
import {
  studioGhostButtonClass,
  studioInputClass,
  studioKickerClass,
  studioSecondaryButtonClass,
  studioStatusClass
} from '@/components/studio/StudioControls';

const panelClass = STUDIO_PANEL_CLASS;
const AUTO_APPLY_DELAY_MS = 200;

const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

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
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

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

  useEffect(() => {
    if (!viewerImageUrl) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewerImageUrl(null);
      }
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [viewerImageUrl]);

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

  const historyMetrics = useMemo(() => {
    const videoCount = items.filter((item) => {
      const mediaUrls = Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0
        ? item.mediaUrls
        : [item.mediaUrl];
      return mediaUrls.some((url) => isVideoUrl(url));
    }).length;

    return {
      total: items.length,
      videos: videoCount,
      images: Math.max(0, items.length - videoCount),
      workspaces: new Set(items.map((item) => item.workspaceId)).size
    };
  }, [items]);

  return (
    <StudioPageShell className="pb-14">
      <header className={`${panelClass} relative overflow-hidden p-6 md:p-8`}>
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/4 translate-x-1/4 rounded-full bg-studio-gold/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-3">
              <span className={studioKickerClass}>
                <span className="h-1.5 w-1.5 rounded-full bg-studio-gold" />
                Generation Timeline
              </span>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">History</h1>
              <p className="max-w-3xl text-sm text-zinc-400 md:text-base">
                Audit recent outputs, review prompts, and recover production assets before they expire after {retentionDays} days.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={loading}
              className={`${studioSecondaryButtonClass} h-9 px-4 text-xs`}
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh History'}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Items</p>
              <p className="mt-1 text-2xl font-bold text-white">{historyMetrics.total}</p>
            </div>
            <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Images</p>
              <p className="mt-1 text-2xl font-bold text-white">{historyMetrics.images}</p>
            </div>
            <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Videos</p>
              <p className="mt-1 text-2xl font-bold text-white">{historyMetrics.videos}</p>
            </div>
            <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Workspaces</p>
              <p className="mt-1 text-2xl font-bold text-white">{historyMetrics.workspaces}</p>
            </div>
          </div>

          <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-4">
            <h2 className="text-sm font-semibold text-white">How History Works</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">1. Track every run</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Each generation stores prompt, model, workspace, and media output in one timeline.
                </p>
              </div>
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">2. Narrow quickly</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Filter by workspace, model, or date range to isolate the exact batch you need.
                </p>
              </div>
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">3. Export before expiry</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Open assets directly and archive critical outputs before retention windows end.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-4">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_180px_auto_auto]">
              <select
                value={workspaceFilterDraft}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setWorkspaceFilterDraft(nextValue);
                  scheduleAutoApply(nextValue.trim() || undefined, modelFilterDraft.trim() || undefined);
                }}
                className={studioInputClass}
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
                className={studioInputClass}
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
                className={studioInputClass}
              />
              <input
                type="date"
                value={endDateDraft}
                onChange={(event) => setEndDateDraft(event.target.value)}
                className={studioInputClass}
              />
              <button
                type="button"
                onClick={applyFilters}
                disabled={loading}
                className={`${studioSecondaryButtonClass} px-3 text-xs`}
              >
                Apply Date Range
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={loading}
                className={`${studioGhostButtonClass} px-3 text-xs`}
              >
                Clear
              </button>
            </div>
          </div>

          <div className={studioStatusClass}>{status}</div>
        </div>
      </header>

      <section className="mt-6 space-y-4">
        {groupedByDate.length === 0 ? (
          <div className={`${STUDIO_PANEL_MUTED_CLASS} flex h-44 flex-col items-center justify-center gap-2 text-sm text-zinc-500`}>
            <Clock3 className="h-5 w-5 text-zinc-600" />
            <span>No completed generations yet.</span>
          </div>
        ) : (
          groupedByDate.map(([dateKey, groupItems]) => (
            <section key={dateKey} className={`${panelClass} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  {new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString(undefined, { dateStyle: 'full' })}
                </div>
                <span className="rounded-full border border-studio-700 bg-studio-900/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                  {groupItems.length} item{groupItems.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {groupItems.map((item) => {
                  const daysRemaining = getDaysRemaining(item.expiresAt);
                  const mediaUrls = Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0
                    ? item.mediaUrls
                    : [item.mediaUrl];
                  const primaryMediaUrl = mediaUrls[0];
                  const video = isVideoUrl(primaryMediaUrl);

                  return (
                    <article
                      key={item.id}
                      className={`group relative min-h-[320px] overflow-hidden rounded-xl border border-white/10 bg-ink-900/75 transition hover:border-white/20 ${video ? '' : 'cursor-zoom-in'}`}
                      onClick={(event) => {
                        if (video) {
                          return;
                        }

                        const target = event.target as HTMLElement;
                        if (target.closest('a,button')) {
                          return;
                        }

                        setViewerImageUrl(primaryMediaUrl);
                      }}
                    >
                      <div className="absolute inset-0 bg-black/40">
                        {video ? (
                          <video
                            src={primaryMediaUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setViewerImageUrl(primaryMediaUrl)}
                            className="h-full w-full"
                            aria-label="Open image viewer"
                          >
                            <img
                              src={primaryMediaUrl}
                              alt="Generated media"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          </button>
                        )}
                        <div
                          className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-[2px] [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,0.85)_50%,rgba(0,0,0,0)_100%)]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/20" />
                      </div>

                      <div className="relative z-10 flex h-full flex-col justify-between p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-200 backdrop-blur-sm">
                            {video ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                            {item.model}
                          </span>
                          <span className="rounded-full border border-amber-300/35 bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-100 backdrop-blur-sm">
                            {daysRemaining}d left
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-200">{item.prompt}</p>

                          {mediaUrls.length > 1 ? (
                            <div className="grid grid-cols-3 gap-1.5">
                              {mediaUrls.map((url, index) => {
                                const thumbIsVideo = isVideoUrl(url);

                                return (
                                  thumbIsVideo ? (
                                    <a
                                      key={`${item.id}_${index}`}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="overflow-hidden rounded-md border border-white/20 bg-black/30 transition hover:border-white/40"
                                      title={`Open media ${index + 1}`}
                                    >
                                      <video src={url} preload="metadata" className="h-16 w-full object-cover" />
                                    </a>
                                  ) : (
                                    <button
                                      key={`${item.id}_${index}`}
                                      type="button"
                                      onClick={() => setViewerImageUrl(url)}
                                      className="overflow-hidden rounded-md border border-white/20 bg-black/30 transition hover:border-white/40"
                                      title={`Open media ${index + 1}`}
                                      aria-label={`Open image ${index + 1}`}
                                    >
                                      <img src={url} alt={`Generated media ${index + 1}`} className="h-16 w-full object-cover" loading="lazy" />
                                    </button>
                                  )
                                );
                              })}
                            </div>
                          ) : null}

                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </section>

      {viewerImageUrl ? (
        <div
          className="fixed inset-0 z-[220] bg-black/88 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setViewerImageUrl(null);
            }
          }}
        >
          <div className="flex min-h-full items-center justify-center px-4 pb-6 pt-24">
            <div className="relative inline-flex max-h-[calc(100dvh-8rem)] max-w-[min(92vw,1200px)] items-center justify-center">
              <a
                href={viewerImageUrl}
                download
                className="absolute right-12 top-2 z-10 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 text-xs font-semibold text-zinc-100 transition hover:bg-black/80"
                aria-label="Download image"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
              <button
                type="button"
                onClick={() => setViewerImageUrl(null)}
                className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-zinc-100 transition hover:bg-black/80"
                aria-label="Close image viewer"
              >
                <X className="h-4 w-4" />
              </button>

              <img
                src={viewerImageUrl}
                alt="History preview"
                className="block h-auto w-auto max-h-[calc(100dvh-8rem)] max-w-[min(92vw,1200px)] rounded-lg border border-white/15 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </StudioPageShell>
  );
}
