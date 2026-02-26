'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ElementLibraryItem,
  LegacyElementLibraryItem,
  getKlingElementsLibrary,
  updateKlingElementsLibrary,
  uploadElementLibraryImage
} from '@/lib/api';
import { AlertTriangle, Plus, Save, Search, Server, Settings2, Tag, Trash2, Upload } from 'lucide-react';

type DraftImageSlot = {
  url: string;
  file: File | null;
  previewUrl: string | null;
};

type LibraryDraft = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  imageSlots: DraftImageSlot[];
};

const panelClass = 'rounded-2xl border border-white/5 bg-ink-950/80 backdrop-blur-sm';
const inputClass =
  'h-10 w-full rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50';

const DEFAULT_TAGS = ['character', 'product', 'environment', 'style', 'prop', 'logo', 'outfit', 'vehicle'] as const;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TAG_LENGTH = 24;
const MAX_TAG_COUNT = 8;

const createEmptyImageSlots = (): DraftImageSlot[] =>
  Array.from({ length: 4 }, () => ({
    url: '',
    file: null,
    previewUrl: null
  }));

const createEmptyDraft = (): LibraryDraft => ({
  id: '',
  name: '',
  description: '',
  tags: [],
  imageSlots: createEmptyImageSlots()
});

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

const normalizeTags = (tags: string[]): string[] => {
  const next: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of tags) {
    const tag = normalizeTag(rawTag);
    if (!tag || tag.length > MAX_TAG_LENGTH || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    next.push(tag);
    if (next.length >= MAX_TAG_COUNT) {
      break;
    }
  }

  return next;
};

const buildDraftFromItem = (item: ElementLibraryItem): LibraryDraft => {
  const imageSlots = createEmptyImageSlots();
  item.imageUrls.slice(0, 4).forEach((url, index) => {
    imageSlots[index] = {
      url,
      file: null,
      previewUrl: null
    };
  });

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    tags: normalizeTags(item.tags ?? []),
    imageSlots
  };
};

const buildItemId = (name: string) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${slug || 'element'}_${Date.now()}`;
};

const isValidImageFile = (file: File) => file.type.startsWith('image/');

export default function ElementLibraryPage() {
  const [workspaceId, setWorkspaceId] = useState('local');
  const [items, setItems] = useState<ElementLibraryItem[]>([]);
  const [legacyItems, setLegacyItems] = useState<LegacyElementLibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LibraryDraft>(createEmptyDraft());
  const [tagInput, setTagInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetDraft = (nextDraft: LibraryDraft) => {
    setDraft((previousDraft) => {
      previousDraft.imageSlots.forEach((slot) => {
        if (slot.previewUrl) {
          URL.revokeObjectURL(slot.previewUrl);
        }
      });
      return nextDraft;
    });
  };

  const loadLibrary = async (activeWorkspaceId: string) => {
    setLoading(true);
    setStatus('Loading element library...');

    try {
      const result = await getKlingElementsLibrary(activeWorkspaceId);
      setItems(result.items);
      setLegacyItems(result.legacyItems);
      setStatus(
        result.legacyItems.length > 0
          ? `Loaded ${result.items.length} elements and ${result.legacyItems.length} legacy entries`
          : `Loaded ${result.items.length} elements`
      );
    } catch {
      setStatus('Unable to load element library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLibrary(workspaceId);
  }, [workspaceId]);

  const allTagOptions = useMemo(() => {
    const next = new Set<string>(DEFAULT_TAGS);
    items.forEach((item) => {
      (item.tags ?? []).forEach((tag) => next.add(tag));
    });
    return Array.from(next).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      if (selectedTagFilters.length > 0) {
        const itemTags = new Set(item.tags ?? []);
        const passesTagFilter = selectedTagFilters.every((tag) => itemTags.has(tag));
        if (!passesTagFilter) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [item.name, item.description, ...(item.tags ?? [])].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, query, selectedTagFilters]);

  const persistItems = async (nextItems: ElementLibraryItem[], successMessage: string) => {
    setSaving(true);

    try {
      const updateResult = await updateKlingElementsLibrary(workspaceId, nextItems);
      const refreshed = await getKlingElementsLibrary(workspaceId);
      setItems(refreshed.items);
      setLegacyItems(refreshed.legacyItems);

      if ((updateResult.deletedStorageObjects ?? 0) > 0) {
        setStatus(`${successMessage} Removed ${updateResult.deletedStorageObjects} image(s) from storage.`);
      } else {
        setStatus(successMessage);
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Failed to save element library changes';
      setStatus(message);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const selectItem = (item: ElementLibraryItem) => {
    setSelectedId(item.id);
    resetDraft(buildDraftFromItem(item));
    setTagInput('');
    setStatus(`Loaded ${item.name}`);
  };

  const createNewDraft = () => {
    setSelectedId(null);
    resetDraft(createEmptyDraft());
    setTagInput('');
    setStatus('New element draft');
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTagFilters((previous) =>
      previous.includes(tag) ? previous.filter((value) => value !== tag) : [...previous, tag]
    );
  };

  const clearTagFilters = () => setSelectedTagFilters([]);

  const toggleDraftTag = (tag: string) => {
    setDraft((previous) => {
      const nextTags = previous.tags.includes(tag)
        ? previous.tags.filter((value) => value !== tag)
        : normalizeTags([...previous.tags, tag]);

      return {
        ...previous,
        tags: nextTags
      };
    });
  };

  const removeDraftTag = (tag: string) => {
    setDraft((previous) => ({
      ...previous,
      tags: previous.tags.filter((value) => value !== tag)
    }));
  };

  const addCustomTag = () => {
    const normalized = normalizeTag(tagInput);
    if (!normalized) {
      setTagInput('');
      return;
    }

    if (normalized.length > MAX_TAG_LENGTH) {
      setStatus(`Tag must be ${MAX_TAG_LENGTH} characters or fewer`);
      return;
    }

    setDraft((previous) => {
      const next = normalizeTags([...previous.tags, normalized]);
      if (next.length === previous.tags.length) {
        setStatus('Tag already exists or tag limit reached');
        return previous;
      }

      return {
        ...previous,
        tags: next
      };
    });

    setTagInput('');
  };

  const updateImageFile = (slotIndex: number, file: File | null) => {
    setDraft((previous) => {
      const nextSlots = previous.imageSlots.map((slot, index) => {
        if (index !== slotIndex) {
          return slot;
        }

        if (slot.previewUrl) {
          URL.revokeObjectURL(slot.previewUrl);
        }

        return {
          url: '',
          file,
          previewUrl: file ? URL.createObjectURL(file) : null
        };
      });

      return {
        ...previous,
        imageSlots: nextSlots
      };
    });
  };

  const clearImageSlot = (slotIndex: number) => {
    setDraft((previous) => {
      const nextSlots = previous.imageSlots.map((slot, index) => {
        if (index !== slotIndex) {
          return slot;
        }

        if (slot.previewUrl) {
          URL.revokeObjectURL(slot.previewUrl);
        }

        return {
          url: '',
          file: null,
          previewUrl: null
        };
      });

      return {
        ...previous,
        imageSlots: nextSlots
      };
    });
  };

  const onSelectImageFile = (slotIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!isValidImageFile(file)) {
      setStatus('Only image files are allowed');
      return;
    }

    updateImageFile(slotIndex, file);
  };

  const collectImageUrls = async () => {
    const uploadedUrls: string[] = [];

    for (let index = 0; index < draft.imageSlots.length; index += 1) {
      const slot = draft.imageSlots[index];
      if (slot.file) {
        setStatus(`Uploading image ${index + 1}/4 to Supabase...`);
        const uploadedUrl = await uploadElementLibraryImage(workspaceId, slot.file);
        uploadedUrls.push(uploadedUrl.trim());
        continue;
      }

      const existingUrl = slot.url.trim();
      if (existingUrl) {
        uploadedUrls.push(existingUrl);
      }
    }

    return Array.from(new Set(uploadedUrls)).slice(0, 4);
  };

  const saveDraft = async () => {
    const trimmedName = draft.name.trim();
    const trimmedDescription = draft.description.trim();
    const normalizedTags = normalizeTags(draft.tags);

    if (!trimmedName) {
      setStatus('Name is required');
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setStatus(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
      return;
    }

    if (!trimmedDescription) {
      setStatus('Description is required');
      return;
    }

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setStatus(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
      return;
    }

    if (normalizedTags.length > MAX_TAG_COUNT) {
      setStatus(`You can add up to ${MAX_TAG_COUNT} tags`);
      return;
    }

    try {
      const imageUrls = await collectImageUrls();
      if (imageUrls.length < 2 || imageUrls.length > 4) {
        setStatus('Each element requires 2-4 images');
        return;
      }

      const id = selectedId ?? (draft.id || buildItemId(trimmedName));
      const nextItem: ElementLibraryItem = {
        id,
        name: trimmedName,
        description: trimmedDescription,
        imageUrls,
        tags: normalizedTags.length > 0 ? normalizedTags : undefined
      };

      const nextItems = [...items.filter((item) => item.id !== id), nextItem].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setSelectedId(id);
      resetDraft(buildDraftFromItem(nextItem));
      await persistItems(nextItems, `Saved ${nextItem.name}. Legacy entries were purged.`);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed while uploading images or saving the element';
      setStatus(message);
    }
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

    if (!window.confirm(`Delete ${selectedItem.name} from Element Library?`)) {
      return;
    }

    const nextItems = items.filter((item) => item.id !== selectedId);
    setSelectedId(null);
    resetDraft(createEmptyDraft());
    await persistItems(nextItems, `Deleted ${selectedItem.name}. Legacy entries were purged.`);
  };

  const removeLegacyItem = (legacyId: string) => {
    setLegacyItems((previous) => previous.filter((item) => item.id !== legacyId));
    setStatus('Legacy entry removed locally. Save to persist cleanup.');
  };

  const imageCount = draft.imageSlots.reduce((count, slot) => {
    return slot.file || slot.url.trim() ? count + 1 : count;
  }, 0);

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_90%_7%,rgba(255,255,255,0.02),transparent_32%),linear-gradient(170deg,#000000_0%,#09090b_62%,#000000_100%)] p-5 md:p-7 relative flex flex-col h-screen overflow-hidden">
      <header className={`${panelClass} flex flex-col md:flex-row md:items-start justify-between p-6 shrink-0 z-10`}>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            Reusable Asset Vault
          </span>
          <h1 className="mt-3 font-display text-4xl leading-[0.9] text-zinc-50">Element Library</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Save reusable elements with a name, description, tags, and 2-4 uploaded reference images.
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
            onClick={() => void loadLibrary(workspaceId)}
            disabled={loading}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition disabled:opacity-60"
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

            <div className="grid gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search name, description, or tags..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${inputClass} !pl-9`}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {allTagOptions.map((tag) => {
                  const active = selectedTagFilters.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTagFilter(tag)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition border ${
                        active
                          ? 'bg-zinc-100 text-ink-950 border-zinc-100'
                          : 'bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {selectedTagFilters.length > 0 ? (
                <button
                  type="button"
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 text-left"
                  onClick={clearTagFilters}
                >
                  Clear tag filters
                </button>
              ) : null}
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
                  const active = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`group flex items-center justify-between gap-3 outline-none rounded-lg border p-2 text-left transition ${
                        active ? 'border-zinc-300/30 bg-white/5 shadow-sm' : 'border-transparent hover:bg-white/5'
                      }`}
                      onClick={() => selectItem(item)}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink-950 shadow-inner ring-1 ring-white/10 ring-inset">
                          {item.imageUrls[0] ? (
                            <img src={item.imageUrls[0]} alt="" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition" />
                          ) : (
                            <Upload className="h-4 w-4 text-zinc-600" />
                          )}
                        </span>

                        <span className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-[13px] font-semibold text-zinc-200">{item.name}</span>
                          <span className="truncate text-[10px] text-zinc-500">{item.imageUrls.length}/2-4 images</span>
                          {(item.tags ?? []).length > 0 ? (
                            <span className="truncate text-[10px] text-zinc-500">{(item.tags ?? []).join(', ')}</span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {legacyItems.length > 0 ? (
              <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-xs font-semibold">Legacy entries</p>
                </div>
                <p className="mt-2 text-[11px] text-amber-200/80">
                  These entries are from the old schema and are read-only. Delete them here if needed; any successful Save also purges remaining legacy entries.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {legacyItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-black/20 px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-amber-100">{item.name}</p>
                        <p className="truncate text-[10px] text-amber-200/70">
                          {item.mode ? `mode: ${item.mode}` : 'legacy entry'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLegacyItem(item.id)}
                        className="rounded-md border border-amber-500/30 px-2 py-1 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
                onClick={() => void deleteSelected()}
                disabled={!selectedId || saving}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm disabled:opacity-50"
                onClick={() => void saveDraft()}
                disabled={saving}
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            <div className="mx-auto grid max-w-2xl gap-8">
              <div className="grid gap-5">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Settings2 className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Properties</h3>
                </div>

                <div className="grid gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Name</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. element_dog"
                      value={draft.name}
                      onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
                    />
                    <p className="text-[10px] text-zinc-500">{draft.name.trim().length}/{MAX_NAME_LENGTH}</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Description</label>
                    <textarea
                      className="min-h-[84px] w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50"
                      placeholder="Describe the element clearly."
                      value={draft.description}
                      onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                    />
                    <p className="text-[10px] text-zinc-500">{draft.description.trim().length}/{MAX_DESCRIPTION_LENGTH}</p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Tags (optional, up to {MAX_TAG_COUNT})
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_TAGS.map((tag) => {
                        const active = draft.tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleDraftTag(tag)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition border ${
                              active
                                ? 'bg-zinc-100 text-ink-950 border-zinc-100'
                                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    {draft.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {draft.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => removeDraftTag(tag)}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/10"
                            title="Remove tag"
                          >
                            {tag} ×
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className={inputClass}
                        value={tagInput}
                        maxLength={MAX_TAG_LENGTH}
                        placeholder="Add custom tag"
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addCustomTag();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addCustomTag}
                        className="h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">Reference Images</h3>
                  <span className={`text-[10px] font-semibold ${imageCount >= 2 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {imageCount}/2-4 images
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {draft.imageSlots.map((slot, index) => {
                    const previewSource = slot.previewUrl || slot.url;
                    const hasImage = Boolean(previewSource);

                    return (
                      <div key={index} className="rounded-xl border border-white/10 bg-ink-900/70 p-3">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 mb-2 font-semibold">Image {index + 1}</p>
                        <div className="aspect-video rounded-lg border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center">
                          {hasImage ? (
                            <img src={previewSource ?? ''} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-zinc-600">No image selected</span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 px-2.5 text-[11px] font-semibold text-zinc-300 hover:bg-white/5">
                            {hasImage ? 'Replace' : 'Upload'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => onSelectImageFile(index, event)}
                            />
                          </label>
                          {hasImage ? (
                            <button
                              type="button"
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-500/20 px-2.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10"
                              onClick={() => clearImageSlot(index)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
