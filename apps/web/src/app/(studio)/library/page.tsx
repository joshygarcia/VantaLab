'use client';

import { useEffect, useMemo, useState } from 'react';
import { getKlingElementsLibrary, KlingElementLibraryItem, updateKlingElementsLibrary } from '@/lib/api';
import { Server, Plus, Save, Trash2, Image as ImageIcon, Video, FolderArchive, Search, Settings2 } from 'lucide-react';

type LibraryDraft = {
  id: string;
  name: string;
  description: string;
  category: KlingElementLibraryItem['category'];
  mode: 'images' | 'video';
  imageUrls: [string, string, string, string];
  videoUrl: string;
};

type LibraryMediaSummary = {
  thumbnailKind: 'image' | 'video' | 'empty';
  thumbnailUrl?: string;
  isValid: boolean;
  validationLabel: string;
};

const panelClass = 'rounded-2xl border border-white/5 bg-ink-950/80 backdrop-blur-sm';
const inputClass =
  'h-10 w-full rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50';

const createEmptyDraft = (): LibraryDraft => ({
  id: '',
  name: '',
  description: '',
  category: 'influencer',
  mode: 'images',
  imageUrls: ['', '', '', ''],
  videoUrl: ''
});

const toDraft = (item: KlingElementLibraryItem): LibraryDraft => ({
  id: item.id,
  name: item.name,
  description: item.description ?? '',
  category: item.category,
  mode: item.mode,
  imageUrls: [
    item.imageUrls?.[0] ?? '',
    item.imageUrls?.[1] ?? '',
    item.imageUrls?.[2] ?? '',
    item.imageUrls?.[3] ?? ''
  ],
  videoUrl: item.videoUrls?.[0] ?? ''
});

const summarizeLibraryMedia = (item: KlingElementLibraryItem): LibraryMediaSummary => {
  const imageUrls = (item.imageUrls ?? []).map((url) => url.trim()).filter((url) => url.length > 0);
  const videoUrls = (item.videoUrls ?? []).map((url) => url.trim()).filter((url) => url.length > 0);

  if (item.mode === 'video') {
    const videoCount = videoUrls.length;
    return {
      thumbnailKind: videoUrls[0] ? 'video' : imageUrls[0] ? 'image' : 'empty',
      thumbnailUrl: videoUrls[0] ?? imageUrls[0],
      isValid: videoCount === 1,
      validationLabel: `${videoCount}/1 video`
    };
  }

  const imageCount = imageUrls.length;
  return {
    thumbnailKind: imageUrls[0] ? 'image' : videoUrls[0] ? 'video' : 'empty',
    thumbnailUrl: imageUrls[0] ?? videoUrls[0],
    isValid: imageCount >= 2 && imageCount <= 4,
    validationLabel: `${imageCount}/2-4 images`
  };
};

const createItemId = (name: string) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const normalized = slug || 'element';
  return `${normalized}_${Date.now()}`;
};

export default function LibraryPage() {
  const [workspaceId, setWorkspaceId] = useState('local');
  const [items, setItems] = useState<KlingElementLibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LibraryDraft>(createEmptyDraft());
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | KlingElementLibraryItem['category']>('all');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLibrary = async (activeWorkspaceId: string) => {
    setLoading(true);
    setStatus('Loading library...');

    try {
      const result = await getKlingElementsLibrary(activeWorkspaceId);
      const nextItems = Array.isArray(result.items) ? result.items : [];
      setItems(nextItems);
      setStatus(`Loaded ${nextItems.length} elements`);
    } catch {
      setStatus('Unable to load library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary(workspaceId);
  }, [workspaceId]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        (item.description ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [categoryFilter, items, query]);

  const persistItems = async (nextItems: KlingElementLibraryItem[], successMessage: string) => {
    try {
      await updateKlingElementsLibrary(workspaceId, nextItems);
      setItems(nextItems);
      setStatus(successMessage);
    } catch {
      setStatus('Failed to save library changes');
    }
  };

  const selectItem = (item: KlingElementLibraryItem) => {
    setSelectedId(item.id);
    setDraft(toDraft(item));
    setStatus(`Loaded ${item.name}`);
  };

  const createNewDraft = () => {
    setSelectedId(null);
    setDraft(createEmptyDraft());
    setStatus('New element draft');
  };

  const saveDraft = async () => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setStatus('Name is required');
      return;
    }

    const imageUrls = draft.imageUrls.map((url) => url.trim()).filter((url) => url.length > 0).slice(0, 4);
    const videoUrl = draft.videoUrl.trim();

    if (draft.mode === 'images' && imageUrls.length < 2) {
      setStatus('Images mode requires at least 2 URLs');
      return;
    }

    if (draft.mode === 'video' && !videoUrl) {
      setStatus('Video mode requires one URL');
      return;
    }

    const id = selectedId ?? (draft.id || createItemId(trimmedName));
    const nextItem: KlingElementLibraryItem = {
      id,
      name: trimmedName,
      description: draft.description.trim() || undefined,
      category: draft.category,
      mode: draft.mode,
      imageUrls: draft.mode === 'images' ? imageUrls : undefined,
      videoUrls: draft.mode === 'video' ? [videoUrl] : undefined
    };

    const nextItems = [...items.filter((item) => item.id !== id), nextItem].sort((a, b) => a.name.localeCompare(b.name));

    setSelectedId(id);
    setDraft(toDraft(nextItem));
    await persistItems(nextItems, `Saved ${nextItem.name}`);
  };

  const deleteSelected = async () => {
    if (!selectedId) {
      setStatus('Select an element to delete');
      return;
    }

    const selectedItem = items.find((item) => item.id === selectedId);
    if (!selectedItem) {
      setStatus('Selected element not found');
      return;
    }

    if (!window.confirm(`Delete ${selectedItem.name} from library?`)) {
      return;
    }

    const nextItems = items.filter((item) => item.id !== selectedId);
    setSelectedId(null);
    setDraft(createEmptyDraft());
    await persistItems(nextItems, `Deleted ${selectedItem.name}`);
  };

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_90%_7%,rgba(255,255,255,0.02),transparent_32%),linear-gradient(170deg,#000000_0%,#09090b_62%,#000000_100%)] p-5 md:p-7 relative flex flex-col h-screen overflow-hidden">
      <header className={`${panelClass} flex flex-col md:flex-row md:items-start justify-between p-6 shrink-0 z-10`}>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            Reusable Asset Vault
          </span>
          <h1 className="mt-3 font-display text-4xl leading-[0.9] text-zinc-50">Library</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Curate influencer packs, characters, animals, and custom elements for dependable generation outputs.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-sm">
            <Server className="w-4 h-4 text-zinc-400" />
            <label htmlFor="library-workspace-id" className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">
              Workspace
            </label>
            <input
              id="library-workspace-id"
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value || 'local')}
              placeholder="local"
              className="w-20 bg-transparent text-sm text-zinc-200 outline-none focus:text-white"
            />
          </div>
          <button
            onClick={() => loadLibrary(workspaceId)}
            disabled={loading}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
          >
            {loading ? 'Refreshing...' : 'Refresh API'}
          </button>
        </div>
      </header>

      {status && <div className="mt-4 text-xs font-medium text-zinc-400 shrink-0 px-2">{status}</div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[380px,1fr] min-h-0 flex-grow z-10">
        <section className={`${panelClass} flex flex-col overflow-hidden`}>
          <div className="p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-50">Elements</h2>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-white/5">
                {filteredItems.length}
              </span>
            </div>

            <div className="grid gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search elements..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${inputClass} !pl-9`}
                />
              </div>

              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as 'all' | KlingElementLibraryItem['category'])}
                  className={`${inputClass} appearance-none pr-8 !text-xs`}
                >
                  <option value="all">All Categories</option>
                  <option value="influencer">Influencer</option>
                  <option value="character">Character</option>
                  <option value="animal">Animal</option>
                  <option value="object">Object</option>
                  <option value="custom">Custom</option>
                </select>
                <FolderArchive className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            <div className="flex flex-col gap-1.5">
              {filteredItems.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
                  No elements found
                </div>
              ) : (
                filteredItems.map((item) => {
                  const media = summarizeLibraryMedia(item);
                  const active = item.id === selectedId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`group flex items-center justify-between gap-3 outline-none rounded-lg border p-2 text-left transition ${active ? 'border-zinc-300/30 bg-white/5 shadow-sm' : 'border-transparent hover:bg-white/5'
                        }`}
                      onClick={() => selectItem(item)}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink-950 shadow-inner ring-1 ring-white/10 ring-inset">
                          {media.thumbnailUrl ? (
                            media.thumbnailKind === 'video' ? (
                              <video src={media.thumbnailUrl} muted playsInline loop className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition" />
                            ) : (
                              <img src={media.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition" />
                            )
                          ) : (
                            <ImageIcon className="h-4 w-4 text-zinc-600" />
                          )}
                          {media.thumbnailKind === 'video' ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Video className="h-3.5 w-3.5 text-white/90 drop-shadow-md" />
                            </div>
                          ) : null}
                        </span>

                        <span className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-[13px] font-semibold text-zinc-200">{item.name}</span>
                          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                            {item.category}
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className={`${media.isValid ? 'text-zinc-500' : 'text-rose-400'}`}>{media.validationLabel}</span>
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className={`${panelClass} flex flex-col overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-white/5 p-4 shrink-0">
            <h2 className="text-lg font-semibold text-zinc-50">{selectedId ? 'Edit Element' : 'New Element'}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                onClick={createNewDraft}
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
                onClick={deleteSelected}
                disabled={!selectedId}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm"
                onClick={saveDraft}
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            <div className="mx-auto grid max-w-2xl gap-8">
              {/* Properties */}
              <div className="grid gap-5">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Settings2 className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Properties</h3>
                </div>

                <div className="grid gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Element ID</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. element_dog"
                      value={draft.name}
                      onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Description</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Optional tracking details"
                      value={draft.description}
                      onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Category</label>
                      <div className="relative">
                        <select
                          value={draft.category}
                          onChange={(event) =>
                            setDraft((previous) => ({
                              ...previous,
                              category: event.target.value as KlingElementLibraryItem['category']
                            }))
                          }
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          <option value="influencer">Influencer</option>
                          <option value="character">Character</option>
                          <option value="animal">Animal</option>
                          <option value="object">Object</option>
                          <option value="custom">Custom</option>
                        </select>
                        <FolderArchive className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Media Mode</label>
                      <div className="relative">
                        <select
                          value={draft.mode}
                          onChange={(event) =>
                            setDraft((previous) => ({ ...previous, mode: event.target.value as 'images' | 'video' }))
                          }
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          <option value="images">Image Sequence</option>
                          <option value="video">Reference Video</option>
                        </select>
                        {draft.mode === 'video' ? (
                          <Video className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                        ) : (
                          <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Sources */}
              <div className="grid gap-5">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  {draft.mode === 'video' ? <Video className="w-4 h-4 text-zinc-400" /> : <ImageIcon className="w-4 h-4 text-zinc-400" />}
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Media Sources</h3>
                </div>

                <div className="rounded-xl border border-white/5 bg-ink-900/50 p-5 shadow-inner">
                  {draft.mode === 'video' ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Video URL (1 Required)</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="https://your-cdn.com/asset.mp4"
                        value={draft.videoUrl}
                        onChange={(event) => setDraft((previous) => ({ ...previous, videoUrl: event.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 mb-1">Image URLs (2 - 4 Required)</label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[0, 1, 2, 3].map((index) => (
                          <div key={index} className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold ml-1">Shot {index + 1}</span>
                            <div className="relative">
                              <input
                                type="text"
                                className={`${inputClass} !pl-8 text-xs`}
                                placeholder="https://..."
                                value={draft.imageUrls[index]}
                                onChange={(event) =>
                                  setDraft((previous) => {
                                    const next = [...previous.imageUrls] as LibraryDraft['imageUrls'];
                                    next[index] = event.target.value;
                                    return { ...previous, imageUrls: next };
                                  })
                                }
                              />
                              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 text-center mt-2 leading-relaxed max-w-sm mx-auto">
                        For best results, provide shots of the element from multiple distinct angles.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
