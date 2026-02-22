import { useEffect, useMemo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Plus, Save } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import {
  getKlingElementsLibrary,
  KlingElementLibraryItem,
  updateKlingElementsLibrary
} from '@/lib/api';
import { useCanvasStore } from '@/store/canvas-store';

type KlingElementsNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const ELEMENT_MODE_OPTIONS = [
  { label: 'Images', value: 'images' },
  { label: 'Video', value: 'video' }
];

const ELEMENT_CATEGORY_OPTIONS = [
  { label: 'Influencer', value: 'influencer' },
  { label: 'Character', value: 'character' },
  { label: 'Animal', value: 'animal' },
  { label: 'Object', value: 'object' },
  { label: 'Custom', value: 'custom' }
];

const parseElementIndex = (controlId: string, prefix: string) => {
  if (!controlId.startsWith(prefix)) {
    return null;
  }

  const suffix = controlId.slice(prefix.length);
  const parsed = Number.parseInt(suffix, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const matchesHandleId = (actualHandleId: string | null | undefined, expectedHandleId: string) =>
  actualHandleId === expectedHandleId ||
  actualHandleId?.startsWith(`${expectedHandleId}_`) ||
  actualHandleId?.startsWith(`${expectedHandleId}-`);

type LibraryMediaSummary = {
  thumbnailKind: 'image' | 'video' | 'empty';
  thumbnailUrl?: string;
  mode: 'images' | 'video';
  isValid: boolean;
  validationLabel: string;
};

const summarizeLibraryMedia = (item: KlingElementLibraryItem): LibraryMediaSummary => {
  const imageUrls = (item.imageUrls ?? []).map((url) => url.trim()).filter((url) => url.length > 0);
  const videoUrls = (item.videoUrls ?? []).map((url) => url.trim()).filter((url) => url.length > 0);

  if (item.mode === 'video') {
    const videoCount = videoUrls.length;
    return {
      thumbnailKind: videoUrls[0] ? 'video' : imageUrls[0] ? 'image' : 'empty',
      thumbnailUrl: videoUrls[0] ?? imageUrls[0],
      mode: 'video',
      isValid: videoCount === 1,
      validationLabel: `${videoCount}/1 video`
    };
  }

  const imageCount = imageUrls.length;
  return {
    thumbnailKind: imageUrls[0] ? 'image' : videoUrls[0] ? 'video' : 'empty',
    thumbnailUrl: imageUrls[0] ?? videoUrls[0],
    mode: 'images',
    isValid: imageCount >= 2 && imageCount <= 4,
    validationLabel: `${imageCount}/2-4 images`
  };
};

const inputClass =
  'nodrag h-9 w-full rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 ring-offset-2 ring-offset-black';

export function KlingElementsNode({ id, data, isConnectable, selected = false }: KlingElementsNodeProps) {
  const updateNodeControl = useCanvasStore((state) => state.updateNodeControl);
  const workspaceId = useCanvasStore((state) => state.workspaceId);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setCanvas = useCanvasStore((state) => state.setCanvas);

  const [libraryItems, setLibraryItems] = useState<KlingElementLibraryItem[]>([]);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryCategory, setLibraryCategory] = useState<'all' | KlingElementLibraryItem['category']>('all');
  const [libraryStatus, setLibraryStatus] = useState('');

  const controls = data.controls ?? [];
  const elementIndices = controls
    .filter((control) => control.type === 'textarea' && control.id.startsWith('element_name_'))
    .map((control) => parseElementIndex(control.id, 'element_name_'))
    .filter((index): index is number => index !== null)
    .sort((a, b) => a - b);

  const outputConnected = edges.some(
    (edge) => edge.source === id && matchesHandleId(edge.sourceHandle, 'kling-elements-out')
  );

  const getTextareaValue = (controlId: string) => {
    const control = controls.find((item) => item.type === 'textarea' && item.id === controlId);
    return control?.type === 'textarea' ? control.value : '';
  };

  const getSelectValue = (controlId: string, fallback: string) => {
    const control = controls.find((item) => item.type === 'select' && item.id === controlId);
    return control?.type === 'select' ? control.value : fallback;
  };

  const persistLibrary = async (nextLibrary: KlingElementLibraryItem[]) => {
    if (!workspaceId) {
      setLibraryStatus('Workspace unavailable, unable to save library');
      return;
    }

    try {
      await updateKlingElementsLibrary(workspaceId, nextLibrary);
      setLibraryItems(nextLibrary);
      setLibraryStatus('Library saved');
    } catch {
      setLibraryStatus('Failed to save library');
    }
  };

  const appendElementSection = (prefill?: KlingElementLibraryItem) => {
    const currentNode = nodes.find((node) => node.id === id);
    if (!currentNode) {
      return;
    }

    const nextControls = currentNode.data.controls ? [...currentNode.data.controls] : [];
    const existingIndices = nextControls
      .filter((control) => control.type === 'textarea' && control.id.startsWith('element_name_'))
      .map((control) => parseElementIndex(control.id, 'element_name_'))
      .filter((index): index is number => index !== null);

    const nextIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;

    const imageUrls = (prefill?.imageUrls ?? []).slice(0, 4);
    nextControls.push({ type: 'textarea', id: `element_name_${nextIndex}`, value: prefill?.name ?? '' });
    nextControls.push({ type: 'textarea', id: `element_description_${nextIndex}`, value: prefill?.description ?? '' });
    nextControls.push({
      type: 'select',
      id: `element_category_${nextIndex}`,
      value: prefill?.category ?? 'influencer',
      options: ELEMENT_CATEGORY_OPTIONS
    });
    nextControls.push({
      type: 'select',
      id: `element_mode_${nextIndex}`,
      value: prefill?.mode ?? 'images',
      options: ELEMENT_MODE_OPTIONS
    });
    nextControls.push({ type: 'textarea', id: `element_library_id_${nextIndex}`, value: prefill?.id ?? '' });
    nextControls.push({ type: 'textarea', id: `element_image_url_${nextIndex}_0`, value: imageUrls[0] ?? '' });
    nextControls.push({ type: 'textarea', id: `element_image_url_${nextIndex}_1`, value: imageUrls[1] ?? '' });
    nextControls.push({ type: 'textarea', id: `element_image_url_${nextIndex}_2`, value: imageUrls[2] ?? '' });
    nextControls.push({ type: 'textarea', id: `element_image_url_${nextIndex}_3`, value: imageUrls[3] ?? '' });
    nextControls.push({
      type: 'textarea',
      id: `element_video_url_${nextIndex}`,
      value: prefill?.videoUrls?.[0] ?? ''
    });

    const nextNodes = nodes.map((node) =>
      node.id === id
        ? {
          ...node,
          data: {
            ...node.data,
            controls: nextControls
          }
        }
        : node
    );

    setCanvas(nextNodes, edges);
  };

  const addElement = () => {
    appendElementSection();
  };

  const saveSectionToLibrary = async (elementIndex: number) => {
    const mode = getSelectValue(`element_mode_${elementIndex}`, 'images') as 'images' | 'video';
    const category = getSelectValue(`element_category_${elementIndex}`, 'influencer') as KlingElementLibraryItem['category'];
    const name = getTextareaValue(`element_name_${elementIndex}`).trim();
    const description = getTextareaValue(`element_description_${elementIndex}`).trim();

    if (!name) {
      setLibraryStatus('Element name is required to save');
      return;
    }

    const imageUrls = [0, 1, 2, 3]
      .map((imageIndex) => getTextareaValue(`element_image_url_${elementIndex}_${imageIndex}`).trim())
      .filter((value) => value.length > 0)
      .slice(0, 4);

    const videoUrl = getTextareaValue(`element_video_url_${elementIndex}`).trim();

    if (mode === 'images' && imageUrls.length < 2) {
      setLibraryStatus('Images mode requires at least 2 image URLs');
      return;
    }

    if (mode === 'video' && !videoUrl) {
      setLibraryStatus('Video mode requires one video URL');
      return;
    }

    const linkedLibraryId = getTextareaValue(`element_library_id_${elementIndex}`).trim();
    const itemId = linkedLibraryId || `element_${Date.now()}_${elementIndex}`;

    const nextItem: KlingElementLibraryItem = {
      id: itemId,
      name,
      description: description || undefined,
      category,
      mode,
      imageUrls: mode === 'images' ? imageUrls : undefined,
      videoUrls: mode === 'video' ? [videoUrl] : undefined
    };

    const nextLibrary = [...libraryItems.filter((item) => item.id !== itemId), nextItem].sort((a, b) => a.name.localeCompare(b.name));

    updateNodeControl(id, `element_library_id_${elementIndex}`, itemId);
    await persistLibrary(nextLibrary);
  };

  const filteredLibrary = useMemo(() => {
    const normalizedQuery = libraryQuery.trim().toLowerCase();
    return libraryItems.filter((item) => {
      if (libraryCategory !== 'all' && item.category !== libraryCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        (item.description || '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [libraryCategory, libraryItems, libraryQuery]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!workspaceId) {
        return;
      }

      try {
        const result = await getKlingElementsLibrary(workspaceId);
        if (cancelled) {
          return;
        }
        setLibraryItems(Array.isArray(result.items) ? result.items : []);
      } catch {
        if (!cancelled) {
          setLibraryStatus('Unable to load library');
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return (
    <div className="relative w-[540px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-sm font-medium">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-ink-900 text-[11px] font-semibold text-zinc-300">
          KE
        </span>
        <span>{data.title || 'Kling Elements Library'}</span>
      </div>

      <div className="space-y-2 p-3">
        <div className="rounded-md border border-white/5 bg-ink-900 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Influencer & Elements Library
            </span>
            {libraryStatus ? <span className="text-[11px] text-zinc-400">{libraryStatus}</span> : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr,160px]">
            <input
              type="text"
              className={inputClass}
              placeholder="Search saved elements"
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
            />

            <select
              className={inputClass}
              value={libraryCategory}
              onChange={(event) => setLibraryCategory(event.target.value as 'all' | KlingElementLibraryItem['category'])}
            >
              <option value="all">All</option>
              <option value="influencer">Influencer</option>
              <option value="character">Character</option>
              <option value="animal">Animal</option>
              <option value="object">Object</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="mt-3 grid max-h-[250px] gap-2 overflow-y-auto pr-1">
            {filteredLibrary.length === 0 ? (
              <div className="rounded-md border border-white/5 bg-ink-950 px-3 py-4 text-center text-xs text-zinc-500">
                No saved elements yet
              </div>
            ) : (
              filteredLibrary.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="nodrag flex items-center justify-between gap-3 rounded-md border border-white/5 bg-ink-950 px-3 py-2 text-left transition-colors duration-200 hover:border-white/20 hover:bg-white/5"
                  onClick={() => appendElementSection(item)}
                >
                  {(() => {
                    const media = summarizeLibraryMedia(item);

                    return (
                      <>
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-ink-900">
                            {media.thumbnailUrl ? (
                              media.thumbnailKind === 'video' ? (
                                <video src={media.thumbnailUrl} muted playsInline loop className="h-full w-full object-cover" />
                              ) : (
                                <img src={media.thumbnailUrl} alt={`${item.name} thumbnail`} className="h-full w-full object-cover" />
                              )
                            ) : (
                              <span className="text-[9px] uppercase tracking-[0.08em] text-zinc-500">No media</span>
                            )}
                            {media.thumbnailKind === 'video' ? (
                              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[8px] font-bold text-white">
                                V
                              </span>
                            ) : null}
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white">{item.name}</span>
                            <span className="block truncate text-xs text-zinc-400">{item.category} • {item.mode}</span>
                          </span>
                        </span>

                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${media.isValid ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                          {media.validationLabel}
                        </span>
                      </>
                    );
                  })()}
                </button>
              ))
            )}
          </div>
        </div>

        {elementIndices.map((elementIndex, positionIndex) => {
          const mode = getSelectValue(`element_mode_${elementIndex}`, 'images');
          const category = getSelectValue(`element_category_${elementIndex}`, 'influencer');

          return (
            <div key={elementIndex} className="rounded-md border border-white/5 bg-ink-900 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Element {positionIndex + 1}
                </span>

                <button
                  type="button"
                  className="nodrag inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-transparent px-2.5 text-[11px] font-medium text-white transition-colors duration-200 hover:bg-white/10"
                  onClick={() => saveSectionToLibrary(elementIndex)}
                  title="Save section to library"
                >
                  <Save size={12} />
                  Save
                </button>
              </div>

              <input
                type="text"
                className={inputClass}
                placeholder="Element name (e.g. element_dog)"
                value={getTextareaValue(`element_name_${elementIndex}`)}
                onChange={(event) => updateNodeControl(id, `element_name_${elementIndex}`, event.target.value)}
              />

              <input
                type="text"
                className={`${inputClass} mt-2`}
                placeholder="Description (optional)"
                value={getTextareaValue(`element_description_${elementIndex}`)}
                onChange={(event) => updateNodeControl(id, `element_description_${elementIndex}`, event.target.value)}
              />

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select
                  className={inputClass}
                  value={mode}
                  onChange={(event) => updateNodeControl(id, `element_mode_${elementIndex}`, event.target.value)}
                >
                  {ELEMENT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  className={inputClass}
                  value={category}
                  onChange={(event) => updateNodeControl(id, `element_category_${elementIndex}`, event.target.value)}
                >
                  {ELEMENT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {mode === 'video' ? (
                <div className="mt-3 rounded-md border border-white/5 bg-ink-950 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Video URL (1)</span>
                  <input
                    type="text"
                    className={`${inputClass} mt-1`}
                    placeholder="https://your-cdn.com/element.mp4"
                    value={getTextareaValue(`element_video_url_${elementIndex}`)}
                    onChange={(event) => updateNodeControl(id, `element_video_url_${elementIndex}`, event.target.value)}
                  />
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-white/5 bg-ink-950 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Image URLs (2-4)</span>
                  <div className="mt-2 grid gap-2">
                    {[0, 1, 2, 3].map((imageIndex) => (
                      <input
                        key={imageIndex}
                        type="text"
                        className={inputClass}
                        placeholder={`Image URL ${imageIndex + 1}${imageIndex < 2 ? ' (required)' : ''}`}
                        value={getTextareaValue(`element_image_url_${elementIndex}_${imageIndex}`)}
                        onChange={(event) =>
                          updateNodeControl(id, `element_image_url_${elementIndex}_${imageIndex}`, event.target.value)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="nodrag inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-transparent px-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/5"
          onClick={addElement}
        >
          <Plus size={14} />
          Add element
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="kling-elements-out"
        isConnectable={isConnectable}
        className={`!h-3 !w-3 !border-2 !border-slate-950 !bg-slate-300 ${outputConnected ? '!bg-emerald-400' : ''}`}
      />

      <div
        className={`pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-[10px] font-bold text-zinc-300 transition-colors duration-200 ${selected || outputConnected ? 'opacity-100' : 'opacity-0'} ${outputConnected ? 'border-emerald-400 text-emerald-400 bg-emerald-950/30' : ''}`}
        aria-hidden="true"
      >
        KE
      </div>
    </div>
  );
}
