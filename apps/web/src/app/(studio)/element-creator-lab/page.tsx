'use client';

import { useEffect, useState } from 'react';
import {
  ElementLibraryItem,
  executeCharacterWorkflow,
  getJobStatus,
  getKlingElementsLibrary,
  updateKlingElementsLibrary
} from '@/lib/api';
import { useProjectContext } from '@/components/projects/project-context';
import { Sparkles, RotateCcw, Plus, Image as ImageIcon, ChevronDown, ChevronUp, CheckCircle2, User, Users, Trash2 } from 'lucide-react';

type BuilderState = {
  gender: string;
  ethnicity: string;
  eyeColor: string;
  skinCondition: string;
  ageRange: string;
  hairStyle: string;
  bodyType: string;
  renderStyle: string;
};

type GeneratedMedia = {
  type: 'image';
  url: string;
};

type CharacterImageModel = 'seedream-5' | 'nano-banana-2' | 'nano-banana-pro';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const makeLibraryItemId = (name: string) => {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${normalized || 'element'}_${Date.now()}`;
};

const normalizeTag = (rawTag: string) => rawTag.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24);

const CHARACTER_IMAGE_MODEL_OPTIONS: Array<{ value: CharacterImageModel; label: string }> = [
  { value: 'seedream-5', label: 'Seedream 5' },
  { value: 'nano-banana-2', label: 'Nano Banana 2' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro' }
];

const estimateCharacterCredits = (imageModel: CharacterImageModel): number => {
  if (imageModel === 'nano-banana-2') {
    return 37;
  }

  if (imageModel === 'nano-banana-pro') {
    return 55;
  }

  return 18;
};

const buildElementTags = (builderState: BuilderState): string[] => {
  const next = new Set<string>();
  next.add('character');

  if (builderState.renderStyle) {
    next.add(normalizeTag(builderState.renderStyle));
  }

  return Array.from(next).filter((tag) => tag.length > 0).slice(0, 8);
};

const DEFAULT_BUILDER_STATE: BuilderState = {
  gender: '',
  ethnicity: '',
  eyeColor: '',
  skinCondition: '',
  ageRange: '',
  hairStyle: '',
  bodyType: '',
  renderStyle: ''
};

const selectOptions = {
  gender: ['Female', 'Male', 'Trans woman', 'Trans male', 'Non binary'],
  ethnicity: ['African', 'Asian', 'European', 'Indian', 'Middle Eastern', 'Latin'],
  eyeColor: ['Black', 'Green', 'Brown', 'Blue', 'Grey', 'Custom Color'],
  skinCondition: ['None', 'Vitiligo', 'Freckles', 'Albinism'],
  ageRange: ['Adult', 'Mature', 'Senior'],
  hairStyle: ['Bald', 'Short hair', 'Long hair', 'Afro'],
  bodyType: ['Athletic and proportional', 'Slim runway', 'Curvy hourglass', 'Strong muscular', 'Petite frame'],
  renderStyle: ['Hyper-realistic', 'Anime', 'Cartoon', '2D illustration']
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

const CREATOR_LAB_ASSET_BASE_URL =
  process.env.NEXT_PUBLIC_CREATOR_LAB_ASSET_BASE_URL ??
  'https://esxcqbmwtndpmdnazvmm.supabase.co/storage/v1/object/public/creator-lab-assets/character-options';

const toSupabasePublicObjectUrl = (fileName: string) =>
  `${CREATOR_LAB_ASSET_BASE_URL.replace(/\/+$/, '')}/${encodeURIComponent(fileName)}`;

const predefinedImageFiles: Record<string, string> = {
  'Human': 'human.jpeg',
  'Alien': 'alien.jpeg',
  'Lizard': 'reptilian.jpeg',
  'Elf': 'elf.jpeg',

  'African': 'african.jpeg',
  'Asian': 'asian.jpeg',
  'European': 'european.jpeg',
  'Indian': 'indian.jpeg',
  'Middle Eastern': 'middle eastern.jpeg',
  'Latin': 'latin.jpeg',

  'Porcelain': 'albinism.jpeg',
  'Fair': 'european.jpeg',
  'Light tan': 'latin.jpeg',
  'Olive': 'middle eastern.jpeg',
  'Caramel': 'brown.jpeg',
  'Deep brown': 'black.jpeg',
  'Custom Color': 'anime.jpeg',

  'Black': 'black.jpeg',
  'Purple': 'anime.jpeg',
  'Green': 'green eyes.jpeg',
  'White': 'gray.jpeg',
  'Brown': 'brown.jpeg',
  'Black (Solid:Void)': 'black.jpeg',
  'White (Blind)': 'gray.jpeg',
  'Deep Brown': 'brown.jpeg',
  'Blue': 'blue eye.jpeg',
  'Amber': 'hazel.jpeg',
  'Red': 'anime.jpeg',
  'Grey': 'gray.jpeg',

  'None': 'human.jpeg',
  'Vitiligo': 'vitiligo.jpeg',
  'Pigmentation': 'freckles.jpeg',
  'Freckles': 'freckles.jpeg',
  'Birthmarks': 'freckles.jpeg',
  'Scars': 'muscular.jpeg',
  'Burns': 'reptilian.jpeg',
  'Albinism': 'albinism.jpeg',
  'Cracked / dry skin': 'reptilian.jpeg',
  'Wrinkled skin': 'gray.jpeg',

  'Bald': 'bald.jpg',
  'Short hair': 'short hair.jpeg',
  'Long hair': 'long hair.jpeg',
  'Afro': 'afro.jpeg',
  'Punk hairstyle': 'anime.jpeg',
  'Fur': 'reptilian.jpeg',
  'Tentacles': 'alien.jpeg',
  'Spines': 'reptilian.jpeg',

  'Athletic and proportional': 'athletic.jpg',
  'Slim runway': 'slim model.jpg',
  'Curvy hourglass': 'hour glass.jpg',
  'Strong muscular': 'muscular.jpg',
  'Petite frame': 'slim model.jpg',

  'Hyper-realistic': 'realistic.png',
  'Anime': 'anime.jpeg',
  'Cartoon': 'cartoon.jpeg',
  '2D illustration': '2D ilustration.jpeg'
};

const getImageUrl = (opt: string) => {
  const fileName = predefinedImageFiles[opt] ?? 'human.jpeg';
  return toSupabasePublicObjectUrl(fileName);
};

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  const [expanded, setExpanded] = useState(true);
  const isIconic = label === 'Gender' || label === 'Age';

  return (
    <div className="flex flex-col rounded-xl border border-white/5 bg-ink-900 overflow-hidden shadow-sm transition-all duration-300">
      <button
        type="button"
        className="flex items-center justify-between p-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">{label}</span>
          <span className="text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded-full">{options.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-400 font-medium truncate max-w-[120px]">{value}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className={`p-3 pt-0 grid ${isIconic ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2 bg-ink-900 border-t border-white/5 mt-2`}>
          {options.map((opt) => {
            const isSelected = opt === value;
            const Icon = opt === 'Non binary' ? Users : User;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setExpanded(false); }}
                className={`group relative flex flex-col ${isIconic ? 'aspect-[4/3]' : 'aspect-square'} rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.25)]' : 'border-transparent hover:border-white/10'}`}
              >
                {isIconic ? (
                  <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-ink-950 transition-colors duration-300 group-hover:bg-ink-900`}>
                    <Icon className={`w-6 h-6 mb-1 transition-colors ${isSelected ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span className={`text-[10px] font-semibold tracking-wide text-center leading-tight px-2 transition-colors ${isSelected ? 'text-blue-400' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {opt}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-blue-400 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-2 h-2 text-black" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <img src={getImageUrl(opt)} alt={opt} className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] sm:text-xs font-semibold text-white leading-tight text-left drop-shadow-md z-10">{opt}</span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-3 h-3 text-black" strokeWidth={3} />
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ElementCreatorLabPage() {
  const { activeSpace } = useProjectContext();
  const workspaceId = activeSpace?.id ?? 'local';
  const [elementName, setElementName] = useState('');
  const [imageModel, setImageModel] = useState<CharacterImageModel>('seedream-5');
  const [builder, setBuilder] = useState<BuilderState>(DEFAULT_BUILDER_STATE);
  const [customPrompt, setCustomPrompt] = useState('');
  const [latestMedia, setLatestMedia] = useState<GeneratedMedia | null>(null);
  const [latestMediaUrls, setLatestMediaUrls] = useState<string[]>([]);
  const [status, setStatus] = useState('Configure character attributes, then generate.');
  const [libraryItemId, setLibraryItemId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [characterElements, setCharacterElements] = useState<ElementLibraryItem[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [removingCharacterId, setRemovingCharacterId] = useState<string | null>(null);

  const updateBuilder = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => {
    setBuilder((previous) => ({ ...previous, [key]: value }));
  };

  const waitForJobMedia = async (jobId: string, activeWorkspaceId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const job = await getJobStatus(jobId, activeWorkspaceId);
      if (job.status === 'succeeded') {
        const normalizedResultUrls = Array.isArray(job.resultUrls)
          ? job.resultUrls.filter((url) => typeof url === 'string' && url.trim().length > 0)
          : [];
        const primaryUrl = (job.mediaUrl ?? '').trim() || normalizedResultUrls[0] || '';

        if (!primaryUrl) {
          throw new Error('Generation completed without media URLs');
        }

        return {
          primaryUrl,
          resultUrls: normalizedResultUrls.length > 0 ? normalizedResultUrls : [primaryUrl]
        };
      }

      if (job.status === 'failed') {
        const providerError = typeof job.error === 'string' ? job.error.trim() : '';
        throw new Error(providerError || 'Generation failed in provider queue');
      }

      await sleep(3000);
    }

    throw new Error('Generation timed out');
  };

  const loadCharacterElements = async (activeWorkspaceId: string) => {
    setLoadingCharacters(true);
    try {
      const library = await getKlingElementsLibrary(activeWorkspaceId);
      const libraryItems = Array.isArray(library.items) ? library.items : [];
      const next = libraryItems
        .filter((item) => (item.tags ?? []).some((tag) => tag.toLowerCase() === 'character'))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCharacterElements(next);
    } catch {
      setCharacterElements([]);
    } finally {
      setLoadingCharacters(false);
    }
  };

  useEffect(() => {
    void loadCharacterElements(workspaceId);
  }, [workspaceId]);

  const resetCurrentMode = () => {
    setBuilder(DEFAULT_BUILDER_STATE);
    setCustomPrompt('');
    setStatus('Character options reset');
  };

  const createNew = () => {
    setLibraryItemId(null);
    setElementName('');
    setBuilder(DEFAULT_BUILDER_STATE);
    setCustomPrompt('');
    setLatestMedia(null);
    setLatestMediaUrls([]);
    setStatus('New character form ready');
  };

  const buildCharacterDescription = () => {
    const selections = [
      builder.gender,
      builder.ethnicity,
      builder.ageRange,
      builder.eyeColor,
      builder.hairStyle,
      builder.skinCondition,
      builder.bodyType,
      builder.renderStyle
    ].filter((value) => value.trim().length > 0);

    const direction = customPrompt.trim();
    const descriptionParts = [
      selections.length > 0 ? `Selections: ${selections.join(', ')}` : '',
      direction ? `Custom prompt: ${direction}` : ''
    ].filter(Boolean);

    return descriptionParts.join('. ').slice(0, 500) || 'Character generated from selected options.';
  };

  const persistGeneratedMediaToLibrary = async (description: string, mediaUrls: string[]) => {
    const existingLibrary = await getKlingElementsLibrary(workspaceId);
    const libraryItems = Array.isArray(existingLibrary.items) ? existingLibrary.items : [];

    const normalizedName = elementName.trim() || 'Untitled Character';
    const matchedByName = libraryItems.find(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase()
    );

    const itemId = libraryItemId || matchedByName?.id || makeLibraryItemId(normalizedName);
    const existing = libraryItems.find((item) => item.id === itemId);

    const existingImages = (existing?.imageUrls ?? []).map((url) => url.trim()).filter((url) => url.length > 0);
    const nextGeneratedImages = mediaUrls.map((url) => url.trim()).filter((url) => url.length > 0);
    const uniqueImages = Array.from(new Set([...existingImages, ...nextGeneratedImages])).slice(0, 4);
    const imageUrls = uniqueImages.length >= 2
      ? uniqueImages
      : uniqueImages.length === 1
        ? [uniqueImages[0], uniqueImages[0]]
        : [];

    const tags = buildElementTags(builder);
    const nextItem: ElementLibraryItem = {
      id: itemId,
      name: normalizedName,
      description,
      imageUrls,
      tags: tags.length > 0 ? tags : undefined
    };

    const nextItems = [
      ...libraryItems.filter((item) => item.id !== itemId),
      nextItem
    ].sort((a, b) => a.name.localeCompare(b.name));

    await updateKlingElementsLibrary(workspaceId, nextItems);
    setLibraryItemId(itemId);
    await loadCharacterElements(workspaceId);
  };

  const onGenerateAndSave = async () => {
    if (generating) {
      return;
    }

    const hasSelections = Object.values(builder).some((value) => value.trim().length > 0);
    if (!elementName.trim() && !hasSelections && !customPrompt.trim()) {
      setStatus('Add a character name or selections before generating');
      return;
    }

    setGenerating(true);

    try {
      setStatus('Generating character prompt with LLM...');
      const nodeId = `creator_lab_${Date.now()}`;

      const executeResult = await executeCharacterWorkflow({
        workspaceId,
        nodeId,
        characterName: elementName.trim() || undefined,
        imageModel,
        selections: {
          gender: builder.gender || undefined,
          ethnicity: builder.ethnicity || undefined,
          eyeColor: builder.eyeColor || undefined,
          skinCondition: builder.skinCondition || undefined,
          ageRange: builder.ageRange || undefined,
          hairStyle: builder.hairStyle || undefined,
          bodyType: builder.bodyType || undefined,
          renderStyle: builder.renderStyle || undefined
        },
        customPrompt: customPrompt.trim() || undefined,
        aspectRatio: '9:16',
        resolution: '2K'
      });

      const estimatedCost = executeResult.estimatedCreditCost ?? estimateCharacterCredits(imageModel);
      setStatus(`Generating character image... Estimated cost: ${estimatedCost} credits`);
      const mediaResult = await waitForJobMedia(executeResult.jobId, workspaceId);

      setLatestMedia({
        type: 'image',
        url: mediaResult.primaryUrl
      });
      setLatestMediaUrls(mediaResult.resultUrls);

      await persistGeneratedMediaToLibrary(buildCharacterDescription(), mediaResult.resultUrls);
      setStatus('Character generated (profile, full body, sheet) and saved to Element Library');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Character generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const onSelectCharacter = (item: ElementLibraryItem) => {
    setLibraryItemId(item.id);
    setElementName(item.name);
    const previewUrl = item.imageUrls.find((url) => url.trim().length > 0);
    setLatestMedia(previewUrl ? { type: 'image', url: previewUrl } : null);
    setLatestMediaUrls(item.imageUrls.filter((url) => url.trim().length > 0).slice(0, 4));
    setStatus(`Loaded character: ${item.name}`);
  };

  const onDeleteCharacter = async (itemId: string) => {
    if (removingCharacterId || generating) {
      return;
    }

    setRemovingCharacterId(itemId);
    try {
      const existingLibrary = await getKlingElementsLibrary(workspaceId);
      const libraryItems = Array.isArray(existingLibrary.items) ? existingLibrary.items : [];
      const nextItems = libraryItems.filter((item) => item.id !== itemId);
      await updateKlingElementsLibrary(workspaceId, nextItems);
      setCharacterElements((previous) => previous.filter((item) => item.id !== itemId));

      if (libraryItemId === itemId) {
        setLibraryItemId(null);
        setLatestMedia(null);
        setLatestMediaUrls([]);
      }

      setStatus('Character removed from library');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to remove character');
    } finally {
      setRemovingCharacterId(null);
    }
  };

  const panelClass = 'rounded-2xl border border-white/5 bg-ink-950/80 backdrop-blur-md shadow-lg';

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.02),transparent_45%),linear-gradient(170deg,#000000_0%,#09090b_62%,#000000_100%)] p-4 text-zinc-100 h-screen overflow-hidden flex flex-col">
      <div className="flex gap-4 min-h-0 flex-1">
        <aside className={`${panelClass} w-[280px] flex-shrink-0 flex flex-col`}>
          <div className="p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 items-center rounded-md border border-white/10 bg-white/5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 shadow-sm">
                Character Elements
              </span>
            </div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm"
              onClick={createNew}
            >
              <Plus className="w-3.5 h-3.5" /> New Character
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {loadingCharacters ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
                Loading characters...
              </div>
            ) : characterElements.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
                No character elements yet
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {characterElements.map((item) => (
                  <div
                    key={item.id}
                    className={`w-full rounded-lg p-2 transition border ${libraryItemId === item.id
                      ? 'border-white/10 bg-white/5 shadow-inner'
                      : 'border-transparent hover:bg-white/5'
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => onSelectCharacter(item)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 overflow-hidden rounded-md border border-white/10 bg-black/20">
                            {item.imageUrls[0] ? (
                              <img src={item.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full" />
                            )}
                          </div>
                          <span className="block truncate text-[13px] font-semibold text-zinc-200 transition hover:text-white">{item.name}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-transparent text-zinc-500 transition hover:border-red-300/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                        onClick={() => onDeleteCharacter(item.id)}
                        title="Remove character"
                        aria-label={`Remove ${item.name}`}
                        disabled={removingCharacterId === item.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <header className={`${panelClass} p-4 shrink-0 flex flex-wrap items-end justify-between gap-4`}>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-semibold text-zinc-500 tracking-wider">Character Name</label>
                <input
                  className="w-56 rounded-lg border border-white/10 bg-ink-900/70 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  value={elementName}
                  onChange={(event) => setElementName(event.target.value)}
                  placeholder="e.g. Luna Rivera"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-semibold text-zinc-500 tracking-wider">Image Model</label>
                <select
                  className="h-[38px] min-w-[170px] rounded-lg border border-white/10 bg-ink-900/70 px-3 text-sm font-semibold text-zinc-300 outline-none focus:border-zinc-500"
                  value={imageModel}
                  onChange={(event) => setImageModel(event.target.value as CharacterImageModel)}
                >
                  {CHARACTER_IMAGE_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:inline">
                Est. {estimateCharacterCredits(imageModel)} credits
              </span>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                onClick={resetCurrentMode}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm disabled:opacity-50"
                onClick={onGenerateAndSave}
                disabled={generating}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? 'Processing...' : 'Generate Character'}
              </button>
            </div>
          </header>

          <div className="flex-1 grid grid-cols-[1fr_420px] gap-4 min-h-0">
            <section className={`${panelClass} flex flex-col overflow-hidden`}>
              <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
                <div className="absolute top-4 left-4 z-10 bg-ink-950/80 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 shadow-sm text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  Live Preview
                </div>
                <div className="flex-1 rounded-xl border border-white/5 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.03),transparent_55%)] bg-ink-950/50 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                  {latestMedia ? (
                    <div className="h-full w-full">
                      <img src={latestMedia.url} alt="Generated character" className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-zinc-500">
                      <div className="h-16 w-16 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center shadow-sm">
                        <ImageIcon className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-300">{elementName.trim() || 'Untitled Character'}</p>
                        <p className="text-xs mt-1 max-w-[220px]">Set attributes and generate to create a new character image.</p>
                      </div>
                    </div>
                  )}
                </div>
                {latestMediaUrls.length > 1 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {latestMediaUrls.map((url, index) => (
                      <button
                        type="button"
                        key={`${url}_${index}`}
                        className={`overflow-hidden rounded-lg border transition ${latestMedia?.url === url ? 'border-blue-400' : 'border-white/10 hover:border-white/30'}`}
                        onClick={() => setLatestMedia({ type: 'image', url })}
                      >
                        <img src={url} alt={`Generated variant ${index + 1}`} className="h-20 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 border-t border-white/5 p-4 bg-ink-950/30">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Status</span>
                <p className="text-xs text-zinc-300">{status}</p>
              </div>
            </section>

            <aside className={`${panelClass} flex flex-col overflow-hidden`}>
              <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <SelectField
                      label="Gender"
                      value={builder.gender}
                      options={selectOptions.gender}
                      onChange={(value) => updateBuilder('gender', value)}
                    />
                    <SelectField
                      label="Ethnicity"
                      value={builder.ethnicity}
                      options={selectOptions.ethnicity}
                      onChange={(value) => updateBuilder('ethnicity', value)}
                    />
                    <SelectField
                      label="Age"
                      value={builder.ageRange}
                      options={selectOptions.ageRange}
                      onChange={(value) => updateBuilder('ageRange', value)}
                    />
                  </div>

                  <div className="rounded-xl border border-white/5 bg-ink-900/30 p-4 shadow-inner">
                    <div className="flex flex-col gap-5">
                      <section className="space-y-3">
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Face</h3>
                        <SelectField label="Eye Color" value={builder.eyeColor} options={selectOptions.eyeColor} onChange={(value) => updateBuilder('eyeColor', value)} />
                        <SelectField label="Hair Style" value={builder.hairStyle} options={selectOptions.hairStyle} onChange={(value) => updateBuilder('hairStyle', value)} />
                        <SelectField label="Skin Conditions" value={builder.skinCondition} options={selectOptions.skinCondition} onChange={(value) => updateBuilder('skinCondition', value)} />
                      </section>

                      <section className="space-y-3 border-t border-white/5 pt-4">
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Body</h3>
                        <SelectField label="Body Type" value={builder.bodyType} options={selectOptions.bodyType} onChange={(value) => updateBuilder('bodyType', value)} />
                      </section>

                      <section className="space-y-3 border-t border-white/5 pt-4">
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Style</h3>
                        <SelectField label="Render Style" value={builder.renderStyle} options={selectOptions.renderStyle} onChange={(value) => updateBuilder('renderStyle', value)} />
                      </section>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Custom Prompt (optional)</label>
                    <textarea
                      className="min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50"
                      value={customPrompt}
                      onChange={(event) => setCustomPrompt(event.target.value)}
                      placeholder="Optional: write your own direction; if provided it is used with/over selector options"
                    />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
