'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ElementLibraryItem,
  executeCharacterWorkflow,
  getJobStatus,
  getKlingElementsLibrary,
  updateKlingElementsLibrary
} from '@/lib/api';
import { useProjectContext } from '@/components/projects/project-context';
import { Sparkles, RotateCcw, Plus, Image as ImageIcon, ChevronDown, ChevronUp, CheckCircle2, User, Users, Trash2 } from 'lucide-react';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS } from '@/components/studio/StudioSection';
import {
  studioInputClass,
  studioPrimaryButtonClass,
  studioSecondaryButtonClass,
  studioTextareaClass
} from '@/components/studio/StudioControls';

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
    <div className="flex flex-col overflow-hidden rounded-xl border border-studio-700 bg-studio-950/80 shadow-sm transition-all duration-300 hover:border-studio-600">
      <button
        type="button"
        className="flex items-center justify-between p-3 transition-colors duration-300 hover:bg-studio-900/70"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">{label}</span>
          <span className="rounded-full bg-studio-900 px-1.5 py-0.5 text-[10px] text-zinc-500">{options.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-300 font-medium truncate max-w-[120px]">{value}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      <div
        className={`grid overflow-hidden bg-studio-950/80 transition-[max-height,opacity,margin,padding,border-color] duration-300 ease-out ${
          expanded
            ? 'mt-2 max-h-[720px] border-t border-studio-700 p-3 pt-0 opacity-100'
            : 'mt-0 max-h-0 border-t border-transparent p-0 opacity-0 pointer-events-none'
        } ${isIconic ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} gap-2`}
      >
          {options.map((opt) => {
            const isSelected = opt === value;
            const Icon = opt === 'Non binary' ? Users : User;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setExpanded(false); }}
                className={`group relative flex flex-col ${isIconic ? 'aspect-[4/3]' : 'aspect-square'} overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5 ${isSelected ? 'border-studio-gold/45 shadow-[0_0_0_1px_rgba(234,179,8,0.22)]' : 'border-studio-700 hover:border-studio-600 hover:shadow-[0_8px_20px_rgba(0,0,0,0.22)]'}`}
              >
                {isIconic ? (
                  <div className={`absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-studio-900 transition-colors duration-300 group-hover:bg-studio-850`}>
                    <Icon className={`mb-1 h-6 w-6 transition-colors ${isSelected ? 'text-studio-gold' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span className={`px-2 text-center text-[10px] font-semibold leading-tight tracking-wide transition-colors ${isSelected ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {opt}
                    </span>
                    {isSelected && (
                      <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-studio-gold shadow-lg">
                        <CheckCircle2 className="h-2.5 w-2.5 text-ink-950" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <img src={getImageUrl(opt)} alt={opt} className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] sm:text-xs font-semibold text-white leading-tight text-left drop-shadow-md z-10">{opt}</span>
                    {isSelected && (
                      <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-studio-gold shadow-lg">
                        <CheckCircle2 className="h-3 w-3 text-ink-950" strokeWidth={3} />
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
      </div>
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
  const [activeSidebarTab, setActiveSidebarTab] = useState<'attributes' | 'library'>('attributes');
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

  const panelClass = STUDIO_PANEL_CLASS;
  const selectedAttributeCount = useMemo(
    () => Object.values(builder).filter((value) => value.trim().length > 0).length,
    [builder]
  );
  const creditEstimate = estimateCharacterCredits(imageModel);
  const generationState = useMemo(() => {
    if (generating) {
      return 'running' as const;
    }

    if (/failed|error|unable|timed out/i.test(status)) {
      return 'error' as const;
    }

    if (latestMediaUrls.length > 0) {
      return 'success' as const;
    }

    return 'idle' as const;
  }, [generating, latestMediaUrls.length, status]);

  return (
    <StudioPageShell className="pb-12">
      <section className="relative grid gap-4 xl:h-[calc(100dvh-170px)] xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-25 [background-image:linear-gradient(rgba(59,130,246,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />

        <div className="grid gap-4 opacity-0 animate-[modal-enter_420ms_ease_forwards] xl:h-full xl:grid-rows-[auto_minmax(0,1fr)]">
          <section className={`${panelClass} p-4`}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_176px] md:items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Character Name</label>
                <input
                  className={`${studioInputClass} w-full font-semibold`}
                  value={elementName}
                  onChange={(event) => setElementName(event.target.value)}
                  placeholder="e.g. Luna Rivera"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Image Model</label>
                <select
                  className={`${studioInputClass} w-full font-semibold text-zinc-300`}
                  value={imageModel}
                  onChange={(event) => setImageModel(event.target.value as CharacterImageModel)}
                >
                  {CHARACTER_IMAGE_MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex h-10 items-center justify-between rounded-lg border border-studio-gold/35 bg-studio-gold/10 px-3 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.08)]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-studio-gold/80">Estimated</p>
                <p className="text-sm font-semibold text-studio-gold">{creditEstimate} credits</p>
              </div>
            </div>
          </section>

          <section className={`${panelClass} flex min-h-0 flex-col p-4`}>
            <div className="relative flex h-[430px] min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-studio-700 bg-studio-950/85 shadow-inner sm:h-[520px] xl:h-[calc(100dvh-320px)] xl:min-h-[520px] xl:max-h-[680px]">
              {latestMedia ? (
                <img
                  src={latestMedia.url}
                  alt="Generated character"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-zinc-500">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-studio-700 bg-studio-900/80">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-zinc-100">{elementName.trim() || 'Untitled Character'}</p>
                    <p className="mt-1 text-lg text-zinc-500">Set attributes and generate to preview your character.</p>
                  </div>
                </div>
              )}

              {latestMediaUrls.length > 1 ? (
                <div className="absolute bottom-3 right-3 flex items-end -space-x-3">
                  {latestMediaUrls
                    .filter((url) => url !== latestMedia?.url)
                    .slice(0, 3)
                    .map((url, index) => (
                      <button
                        key={`${url}_${index}`}
                        type="button"
                        onClick={() => setLatestMedia({ type: 'image', url })}
                        className="relative h-14 w-12 overflow-hidden rounded-md border border-studio-600 bg-studio-900/90 shadow-lg transition hover:-translate-y-0.5 hover:border-studio-gold/40"
                        title={`Show variant ${index + 1}`}
                      >
                        <img src={url} alt={`Variant ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                </div>
              ) : null}

              {generationState === 'running' ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-studio-950/72 backdrop-blur-sm">
                  <div className="w-[82%] max-w-sm rounded-xl border border-studio-600 bg-studio-950/90 px-4 py-3 shadow-2xl">
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-300">
                        <span className="absolute inset-0 animate-ping rounded-full bg-blue-300/70" />
                      </span>
                      <p className="text-sm font-medium text-zinc-100">Generating character previews...</p>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-studio-900">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-400" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

          </section>
        </div>

        <aside
          className={`${panelClass} flex min-h-[520px] flex-col overflow-hidden opacity-0 animate-[modal-enter_420ms_ease_forwards] transition-colors duration-300 hover:border-studio-600 xl:max-h-[calc(100dvh-170px)] xl:min-h-[640px]`}
          style={{ animationDelay: '90ms' }}
        >
          <div className="grid grid-cols-2 border-b border-white/5 bg-studio-950/70">
            <button
              type="button"
              className={`h-12 text-xs font-semibold uppercase tracking-[0.08em] transition ${activeSidebarTab === 'attributes'
                ? 'border-b-2 border-blue-500 text-blue-300'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
              onClick={() => setActiveSidebarTab('attributes')}
            >
              Attributes
            </button>
            <button
              type="button"
              className={`h-12 text-xs font-semibold uppercase tracking-[0.08em] transition ${activeSidebarTab === 'library'
                ? 'border-b-2 border-blue-500 text-blue-300'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
              onClick={() => setActiveSidebarTab('library')}
            >
              Library
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {activeSidebarTab === 'attributes' ? (
              <div className="flex flex-col gap-6">
                <header>
                  <h2 className="text-3xl font-semibold text-zinc-100">Attributes</h2>
                  <p className="mt-1 text-sm text-zinc-500">Choose identity, face, body, and render style.</p>
                </header>

                <section className="space-y-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Identity</h3>
                  <SelectField label="Gender" value={builder.gender} options={selectOptions.gender} onChange={(value) => updateBuilder('gender', value)} />
                  <SelectField label="Ethnicity" value={builder.ethnicity} options={selectOptions.ethnicity} onChange={(value) => updateBuilder('ethnicity', value)} />
                  <SelectField label="Age" value={builder.ageRange} options={selectOptions.ageRange} onChange={(value) => updateBuilder('ageRange', value)} />
                </section>

                <section className="space-y-3 border-t border-white/5 pt-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Face</h3>
                  <SelectField label="Eye Color" value={builder.eyeColor} options={selectOptions.eyeColor} onChange={(value) => updateBuilder('eyeColor', value)} />
                  <SelectField label="Hair Style" value={builder.hairStyle} options={selectOptions.hairStyle} onChange={(value) => updateBuilder('hairStyle', value)} />
                  <SelectField label="Skin Conditions" value={builder.skinCondition} options={selectOptions.skinCondition} onChange={(value) => updateBuilder('skinCondition', value)} />
                </section>

                <section className="space-y-3 border-t border-white/5 pt-4">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Body & Style</h3>
                  <SelectField label="Body Type" value={builder.bodyType} options={selectOptions.bodyType} onChange={(value) => updateBuilder('bodyType', value)} />
                  <SelectField label="Render Style" value={builder.renderStyle} options={selectOptions.renderStyle} onChange={(value) => updateBuilder('renderStyle', value)} />
                </section>

                <section className="space-y-2 border-t border-white/5 pt-4">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Custom Prompt (optional)</label>
                  <textarea
                    className={`min-h-[130px] resize-none ${studioTextareaClass}`}
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    placeholder="Optional: add your own creative direction to steer tone, styling, and framing"
                  />
                </section>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-100">Character Library</h2>
                  <button
                    type="button"
                    className={`${studioPrimaryButtonClass} h-8 px-3 text-[11px]`}
                    onClick={createNew}
                  >
                    <Plus className="h-3.5 w-3.5" /> New
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Select an existing character to load it into the preview.</p>

                {loadingCharacters ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
                    Loading characters...
                  </div>
                ) : characterElements.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
                    No character elements yet
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {characterElements.map((item) => (
                      <article
                        key={item.id}
                        className={`group relative overflow-hidden rounded-xl border transition ${
                          libraryItemId === item.id
                            ? 'border-studio-gold/40'
                            : 'border-studio-700 hover:border-studio-600'
                        }`}
                      >
                        <button
                          type="button"
                          className="relative h-24 w-full text-left"
                          onClick={() => onSelectCharacter(item)}
                        >
                          {item.imageUrls[0] ? (
                            <img src={item.imageUrls[0]} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                          ) : (
                            <div className="h-full w-full bg-ink-900" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                          {item.imageUrls.length > 1 ? (
                            <div className="pointer-events-none absolute right-2 top-2 flex -space-x-2">
                              {item.imageUrls.slice(1, 4).map((url, idx) => (
                                <span key={`${item.id}_stack_${idx}`} className="h-7 w-7 overflow-hidden rounded-md border border-studio-600 bg-studio-900/90">
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="absolute bottom-2 left-2 right-2 truncate text-xs font-semibold text-zinc-100">{item.name}</p>
                        </button>

                        <button
                          type="button"
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-studio-700 bg-studio-900/90 text-zinc-300 transition hover:border-red-300/50 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50"
                          onClick={() => onDeleteCharacter(item.id)}
                          title="Remove character"
                          aria-label={`Remove ${item.name}`}
                          disabled={removingCharacterId === item.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 bg-studio-950/75 p-4">
            <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              <span>{selectedAttributeCount}/8 selected</span>
              <span>{creditEstimate} credits</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                className={`${studioSecondaryButtonClass} h-11 px-3 text-xs`}
                onClick={resetCurrentMode}
                disabled={generating}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={`${studioPrimaryButtonClass} h-11 text-base`}
                onClick={onGenerateAndSave}
                disabled={generating}
              >
                <Sparkles className="h-4 w-4" />
                {generating ? 'Processing...' : 'Generate'}
              </button>
            </div>
          </div>
        </aside>
      </section>
    </StudioPageShell>
  );
}
