'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ElementLibraryItem,
  LegacyElementLibraryItem,
  getKlingElementsLibrary,
  updateKlingElementsLibrary,
  uploadElementLibraryImage
} from '@/lib/api';
import { AlertTriangle, Plus, Save, Search, Settings2, Tag, Trash2, Upload } from 'lucide-react';
import { useProjectContext } from '@/components/projects/project-context';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS } from '@/components/studio/StudioSection';
import {
  studioGhostButtonClass,
  studioInputClass,
  studioKickerClass,
  studioPrimaryButtonClass,
  studioSecondaryButtonClass,
  studioTextareaClass
} from '@/components/studio/StudioControls';

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

const panelClass = STUDIO_PANEL_CLASS;
const inputClass = studioInputClass;

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
  const { activeSpace } = useProjectContext();
  const workspaceId = activeSpace?.id ?? 'local';
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
  const [isElementModalOpen, setIsElementModalOpen] = useState(false);

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
    setIsElementModalOpen(true);
  };

  const createNewDraft = () => {
    setSelectedId(null);
    resetDraft(createEmptyDraft());
    setTagInput('');
    setStatus('New element draft');
    setIsElementModalOpen(true);
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
      setIsElementModalOpen(false);
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
    setIsElementModalOpen(false);
  };

  const removeLegacyItem = (legacyId: string) => {
    setLegacyItems((previous) => previous.filter((item) => item.id !== legacyId));
    setStatus('Legacy entry removed locally. Save to persist cleanup.');
  };

  const imageCount = draft.imageSlots.reduce((count, slot) => {
    return slot.file || slot.url.trim() ? count + 1 : count;
  }, 0);

  return (
    <StudioPageShell className="flex h-full min-h-full flex-col pb-14">
      <header className={`${panelClass} relative overflow-hidden p-6 md:p-8 shrink-0 z-10`}>
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/4 translate-x-1/4 rounded-full bg-studio-gold/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className={studioKickerClass}>
              <span className="h-1.5 w-1.5 rounded-full bg-studio-gold" />
              Reusable Asset Vault
            </span>
            <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">Element Library</h1>
            <p className="max-w-3xl text-sm text-zinc-400 md:text-base">
              Save reusable elements with names, descriptions, tags, and 2-4 reference images to keep prompts and visual systems consistent.
            </p>
          </div>

          <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-4">
            <h2 className="text-sm font-semibold text-white">How Element Library Works</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">1. Add visual references</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Upload 2-4 images so every element starts with strong, reusable visual grounding.
                </p>
              </div>
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">2. Describe and tag</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Add concise descriptions and tags to make elements easy to discover in future sessions.
                </p>
              </div>
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">3. Reuse in Canvas</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Pull stored elements into Canvas workflows to keep prompts and output style consistent.
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => void loadLibrary(workspaceId)}
              disabled={loading}
              className={`${studioSecondaryButtonClass} h-9 px-4 text-xs`}
            >
              {loading ? 'Refreshing...' : 'Refresh Library'}
            </button>
          </div>
        </div>
      </header>

      {status ? (
        <div className="mt-4 shrink-0 rounded-xl border border-studio-600/60 bg-studio-900/90 px-3 py-2 text-xs font-medium text-zinc-300">
          {status}
        </div>
      ) : null}

      <section className={`${panelClass} mt-6 z-10 p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-studio-cream">Stored Elements</h2>
            <span className="rounded-full border border-studio-700 bg-studio-900/85 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              {filteredItems.length}
            </span>
          </div>

          <button
            type="button"
            className={`${studioPrimaryButtonClass} h-9 px-4 text-xs`}
            onClick={createNewDraft}
          >
            <Plus className="h-3.5 w-3.5" /> New Element
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr,auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search name, description, or tags..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${inputClass} !pl-9`}
            />
          </div>

          {selectedTagFilters.length > 0 ? (
            <button
              type="button"
              className={`${studioGhostButtonClass} h-10 px-3 text-xs`}
              onClick={clearTagFilters}
            >
              Clear Filters
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {allTagOptions.map((tag) => {
            const active = selectedTagFilters.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTagFilter(tag)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition border ${
                  active
                    ? 'border-studio-gold/35 bg-studio-gold/15 text-blue-100'
                    : 'border-studio-700 bg-studio-900 text-zinc-400 hover:border-studio-600 hover:text-zinc-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {filteredItems.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-studio-700 text-sm text-zinc-500">
              No elements found
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const active = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`group relative min-h-[260px] overflow-hidden rounded-xl border text-left transition ${
                      active
                        ? 'border-studio-gold/35'
                        : 'border-studio-700 hover:border-studio-600'
                    }`}
                    onClick={() => selectItem(item)}
                  >
                    <div className="absolute inset-0 bg-studio-900">
                      {item.imageUrls[0] ? (
                        <img
                          src={item.imageUrls[0]}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
                    </div>

                    {!item.imageUrls[0] ? (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                        <Upload className="h-6 w-6" />
                      </div>
                    ) : null}

                    <div className="relative z-10 flex h-full flex-col justify-end p-4">
                      <h3 className="truncate text-sm font-semibold text-zinc-100">{item.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-300">{item.description}</p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-300/90">
                        <span>{item.imageUrls.length}/2-4 images</span>
                        <span>{(item.tags ?? []).length} tags</span>
                      </div>

                      {(item.tags ?? []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(item.tags ?? []).slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-md border border-white/20 bg-black/35 px-2 py-0.5 text-[10px] text-zinc-200">
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

        {legacyItems.length > 0 ? (
          <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-xs font-semibold">Legacy entries</p>
            </div>
            <p className="mt-2 text-[11px] text-amber-200/80">
              These entries are from the old schema and are read-only. Delete them here if needed; any successful save also purges remaining legacy entries.
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
      </section>

      {isElementModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsElementModalOpen(false);
            }
          }}
        >
          <section className={`${panelClass} flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden`}>
            <div className="shrink-0 border-b border-studio-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-studio-cream">{selectedId ? 'Edit Element' : 'New Element'}</h2>
                <div className="flex items-center gap-2">
                  {selectedId ? (
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                      onClick={() => void deleteSelected()}
                      disabled={saving}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${studioSecondaryButtonClass} h-8 px-3 text-xs`}
                    onClick={() => setIsElementModalOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className={`${studioPrimaryButtonClass} h-8 px-4 text-xs`}
                    onClick={() => void saveDraft()}
                    disabled={saving}
                  >
                    <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
              <div className="mx-auto grid max-w-2xl gap-8">
                <div className="grid gap-5">
                  <div className="flex items-center gap-2 border-b border-studio-700 pb-2">
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
                        className={`min-h-[84px] ${studioTextareaClass}`}
                        placeholder="Describe the element clearly."
                        value={draft.description}
                        onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                      />
                      <p className="text-[10px] text-zinc-500">{draft.description.trim().length}/{MAX_DESCRIPTION_LENGTH}</p>
                    </div>

                    <div className="grid gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
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
                                  ? 'border-studio-gold/35 bg-studio-gold/15 text-blue-100'
                                  : 'border-studio-700 bg-studio-900 text-zinc-400 hover:border-studio-600 hover:text-zinc-200'
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
                              className="rounded-full border border-studio-700 bg-studio-900 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:border-studio-600 hover:bg-studio-850"
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
                          className="h-10 rounded-lg border border-studio-700 bg-studio-900 px-3 text-xs font-semibold text-zinc-300 hover:border-studio-600 hover:bg-studio-850"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5">
                  <div className="flex items-center justify-between gap-2 border-b border-studio-700 pb-2">
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
                        <div key={index} className="rounded-xl border border-studio-700 bg-studio-950/70 p-3">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Image {index + 1}</p>
                          <div className="aspect-video flex items-center justify-center overflow-hidden rounded-lg border border-studio-700 bg-black/20">
                            {hasImage ? (
                              <img src={previewSource ?? ''} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-zinc-600">No image selected</span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-studio-700 bg-studio-900 px-2.5 text-[11px] font-semibold text-zinc-300 hover:border-studio-600 hover:bg-studio-850">
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
      ) : null}
    </StudioPageShell>
  );
}
