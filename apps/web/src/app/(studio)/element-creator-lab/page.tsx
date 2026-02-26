'use client';

import { useState } from 'react';
import {
  ElementLibraryItem,
  executeWorkflow,
  getJobStatus,
  getKlingElementsLibrary,
  updateKlingElementsLibrary
} from '@/lib/api';
import { Sparkles, RotateCcw, Copy, Settings2, Plus, Image as ImageIcon, Box, PenTool, LayoutGrid, ChevronDown, ChevronUp, CheckCircle2, User, Users } from 'lucide-react';

type LabMode = 'builder' | 'prompt';
type AdvancedTab = 'face' | 'body' | 'style';

type BuilderState = {
  characterType: string;
  gender: string;
  ethnicity: string;
  skinColor: string;
  eyeColor: string;
  skinCondition: string;
  ageRange: string;
  hairStyle: string;
  bodyType: string;
  renderStyle: string;
};

type ElementType = 'influencer' | 'character' | 'animal' | 'object' | 'custom';

type PromptDraft = {
  id: string;
  name: string;
  mode: LabMode;
  type: ElementType;
  prompt: string;
  createdAt: string;
};

type GeneratedMedia = {
  type: 'image';
  url: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const makeLibraryItemId = (name: string) => {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${normalized || 'element'}_${Date.now()}`;
};

const normalizeTag = (rawTag: string) => rawTag.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24);

const buildElementTags = (elementType: ElementType, builderState: BuilderState): string[] => {
  const next = new Set<string>();
  next.add(normalizeTag(elementType));

  if (builderState.renderStyle) {
    next.add(normalizeTag(builderState.renderStyle));
  }

  return Array.from(next).filter((tag) => tag.length > 0).slice(0, 8);
};

const DEFAULT_BUILDER_STATE: BuilderState = {
  characterType: '',
  gender: '',
  ethnicity: '',
  skinColor: '',
  eyeColor: '',
  skinCondition: '',
  ageRange: '',
  hairStyle: '',
  bodyType: '',
  renderStyle: ''
};

const selectOptions = {
  characterType: ['Human', 'Alien', 'Lizard', 'Elf'],
  gender: ['Female', 'Male', 'Trans woman', 'Trans male', 'Non binary'],
  ethnicity: ['African', 'Asian', 'European', 'Indian', 'Middle Eastern', 'Latin'],
  skinColor: ['Porcelain', 'Fair', 'Light tan', 'Olive', 'Caramel', 'Deep brown', 'Custom Color'],
  eyeColor: ['Black', 'Purple', 'Green', 'White', 'Brown', 'Black (Solid:Void)', 'White (Blind)', 'Deep Brown', 'Blue', 'Amber', 'Red', 'Grey', 'Custom Color'],
  skinCondition: ['None', 'Vitiligo', 'Pigmentation', 'Freckles', 'Birthmarks', 'Scars', 'Burns', 'Albinism', 'Cracked / dry skin', 'Wrinkled skin'],
  ageRange: ['Adult', 'Mature', 'Senior'],
  hairStyle: ['Bald', 'Short hair', 'Long hair', 'Afro', 'Punk hairstyle', 'Fur', 'Tentacles', 'Spines'],
  bodyType: ['Athletic and proportional', 'Slim runway', 'Curvy hourglass', 'Strong muscular', 'Petite frame'],
  renderStyle: ['Hyper-realistic', 'Anime', 'Cartoon', '2D illustration']
};

function buildInfluencerPrompt(name: string, elementType: ElementType, values: BuilderState) {
  const identity = [values.characterType, values.gender, values.ageRange ? `age ${values.ageRange}` : '', values.ethnicity ? `${values.ethnicity} origin` : ''].filter(Boolean).join(', ');
  const face = [values.skinColor ? `${values.skinColor} skin tone` : '', values.eyeColor ? `${values.eyeColor} eyes` : '', values.skinCondition].filter(Boolean).join(', ');

  const segments = [
    `Create ${elementType} concept named ${name || 'Untitled concept'}`,
    identity,
    face,
    values.hairStyle,
    values.bodyType ? `${values.bodyType} physique` : '',
    values.renderStyle ? `Render Style: ${values.renderStyle}` : '',
    'Photorealistic, highly detailed, clean composition, high-end lighting'
  ].filter(Boolean);

  return `${segments.join('. ')}.`;
}

type SelectFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

const getImageUrl = (opt: string) => {
  const customColorPattern = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='; // Transparent base for CSS gradient

  if (opt === 'Custom Color') {
    return 'https://images.unsplash.com/photo-1557672211-14c11f42a66e?w=400&h=400&fit=crop';
  }

  const predefined: Record<string, string> = {
    'Human': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'Alien': 'https://images.unsplash.com/photo-1629813585141-9c60e0a5ea11?w=400&h=400&fit=crop',
    'Lizard': 'https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?w=400&h=400&fit=crop',
    'Elf': 'https://images.unsplash.com/photo-1606553251214-74737c35fa01?w=400&h=400&fit=crop',

    'Female': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'Male': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    'Non binary': 'https://images.unsplash.com/photo-1549068106-b024baf5062d?w=400&h=400&fit=crop',
    'Trans woman': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
    'Trans male': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',

    'African': 'https://images.unsplash.com/photo-1531123414780-f7424bf6738f?w=400&h=400&fit=crop',
    'Asian': 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&h=400&fit=crop',
    'Indian': 'https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?w=400&h=400&fit=crop',
    'European': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    'Middle Eastern': 'https://images.unsplash.com/photo-1564485377539-4af72d1f6a2f?w=400&h=400&fit=crop',
    'Latin': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',

    'Adult': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    'Mature': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    'Senior': 'https://images.unsplash.com/photo-1455274111113-575d080ce8cd?w=400&h=400&fit=crop',

    'Black': 'https://images.unsplash.com/photo-1507133750036-74fc21074eb6?w=400&h=400&fit=crop',
    'Purple': 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&h=400&fit=crop',
    'Green': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    'White': 'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?w=400&h=400&fit=crop',
    'Brown': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop',
    'Blue': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'Amber': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    'Red': 'https://images.unsplash.com/photo-1563811802958-f99a9a081577?w=400&h=400&fit=crop',

    'Vitiligo': 'https://images.unsplash.com/photo-1616087570653-a55d787d1599?w=400&h=400&fit=crop',
    'Freckles': 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=400&h=400&fit=crop',
    'Pigmentation': 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&h=400&fit=crop',
    'Albinism': 'https://images.unsplash.com/photo-1610486801905-2d4e772410a5?w=400&h=400&fit=crop',

    'Bald': 'https://images.unsplash.com/photo-1605335919637-299f074d2fc1?w=400&h=400&fit=crop',
    'Short hair': 'https://images.unsplash.com/photo-1521119989659-18c14101cc29?w=400&h=400&fit=crop',
    'Long hair': 'https://images.unsplash.com/photo-1506956191926-b8f4112e4fce?w=400&h=400&fit=crop',
    'Afro': 'https://images.unsplash.com/photo-1531123414780-f7424bf6738f?w=400&h=400&fit=crop',
    'Punk hairstyle': 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&h=400&fit=crop',

    'Hyper-realistic': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'Anime': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop',
    'Cartoon': 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=400&h=400&fit=crop',
    '2D illustration': 'https://images.unsplash.com/photo-1618331835717-814cb96ba805?w=400&h=400&fit=crop',
  };

  if (predefined[opt]) return predefined[opt];
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(opt)}`;
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
          <span className="text-xs text-lime-400 font-medium truncate max-w-[120px]">{value}</span>
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
                className={`group relative flex flex-col ${isIconic ? 'aspect-[4/3]' : 'aspect-square'} rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.2)]' : 'border-transparent hover:border-white/10'}`}
              >
                {isIconic ? (
                  <div className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-ink-950 transition-colors duration-300 group-hover:bg-ink-900`}>
                    <Icon className={`w-6 h-6 mb-1 transition-colors ${isSelected ? 'text-lime-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span className={`text-[10px] font-semibold tracking-wide text-center leading-tight px-2 transition-colors ${isSelected ? 'text-lime-400' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {opt}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-lime-400 rounded-full flex items-center justify-center shadow-lg">
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
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-lime-400 rounded-full flex items-center justify-center shadow-lg">
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
  const [mode, setMode] = useState<LabMode>('builder');
  const [activeTab, setActiveTab] = useState<AdvancedTab>('face');
  const [workspaceId, setWorkspaceId] = useState('local');
  const [elementName, setElementName] = useState('');
  const [elementType, setElementType] = useState<ElementType>('influencer');
  const [builder, setBuilder] = useState<BuilderState>(DEFAULT_BUILDER_STATE);
  const [manualPrompt, setManualPrompt] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [latestMedia, setLatestMedia] = useState<GeneratedMedia | null>(null);
  const [status, setStatus] = useState('Use Builder or Prompt mode to craft your element prompt.');
  const [drafts, setDrafts] = useState<PromptDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [libraryItemId, setLibraryItemId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const updateBuilder = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => {
    setBuilder((previous) => ({ ...previous, [key]: value }));
  };

  const resetCurrentMode = () => {
    if (mode === 'builder') {
      setBuilder(DEFAULT_BUILDER_STATE);
      setStatus('Builder attributes reset');
      return;
    }

    setManualPrompt('');
    setStatus('Manual prompt cleared');
  };

  const createNew = () => {
    setActiveDraftId(null);
    setLibraryItemId(null);
    setElementName('');
    setElementType('influencer');
    setBuilder(DEFAULT_BUILDER_STATE);
    setManualPrompt('');
    setGeneratedPrompt('');
    setLatestMedia(null);
    setMode('builder');
    setActiveTab('face');
    setStatus('New creation draft ready');
  };

  const buildCurrentPrompt = () =>
    mode === 'builder'
      ? buildInfluencerPrompt(elementName.trim(), elementType, builder)
      : manualPrompt.trim();

  const registerDraft = (prompt: string) => {
    const now = new Date();
    const draftId = `draft_${now.getTime()}`;
    const draftName = elementName.trim() || `${mode === 'builder' ? 'Influencer' : 'Custom'} Draft`;

    const draft: PromptDraft = {
      id: draftId,
      name: draftName,
      mode,
      type: elementType,
      prompt,
      createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setDrafts((previous) => [draft, ...previous].slice(0, 24));
    setActiveDraftId(draftId);
  };

  const waitForJobMedia = async (jobId: string, activeWorkspaceId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const job = await getJobStatus(jobId, activeWorkspaceId);
      if (job.status === 'succeeded' && job.mediaUrl) {
        return job.mediaUrl;
      }

      if (job.status === 'failed') {
        throw new Error('Generation failed in provider queue');
      }

      await sleep(3000);
    }

    throw new Error('Generation timed out');
  };

  const persistGeneratedMediaToLibrary = async (prompt: string, mediaUrl: string) => {
    const existingLibrary = await getKlingElementsLibrary(workspaceId);
    const libraryItems = Array.isArray(existingLibrary.items) ? existingLibrary.items : [];

    const normalizedName = elementName.trim() || 'Untitled Element';
    const matchedByName = libraryItems.find(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase()
    );

    const itemId = libraryItemId || matchedByName?.id || makeLibraryItemId(normalizedName);
    const existing = libraryItems.find((item) => item.id === itemId);

    const existingImages = (existing?.imageUrls ?? []).map((url) => url.trim()).filter((url) => url.length > 0);
    const uniqueImages = Array.from(new Set([...existingImages, mediaUrl])).slice(0, 4);
    const imageUrls = uniqueImages.length >= 2
      ? uniqueImages
      : uniqueImages.length === 1
        ? [uniqueImages[0], uniqueImages[0]]
        : [];

    const tags = buildElementTags(elementType, builder);
    const nextItem: ElementLibraryItem = {
      id: itemId,
      name: normalizedName,
      description: prompt.slice(0, 500),
      imageUrls,
      tags: tags.length > 0 ? tags : undefined
    };

    const nextItems = [
      ...libraryItems.filter((item) => item.id !== itemId),
      nextItem
    ].sort((a, b) => a.name.localeCompare(b.name));

    await updateKlingElementsLibrary(workspaceId, nextItems);
    setLibraryItemId(itemId);
  };

  const onGeneratePrompt = () => {
    const nextPrompt = buildCurrentPrompt();

    if (!nextPrompt) {
      setStatus('Write a manual prompt or use the builder options first');
      return;
    }

    setGeneratedPrompt(nextPrompt);
    registerDraft(nextPrompt);
    setStatus('Prompt generated. Use Generate + Save to run and store it in the Element Library.');
  };

  const onGenerateAndSave = async () => {
    if (generating) {
      return;
    }

    const nextPrompt = buildCurrentPrompt();
    if (!nextPrompt) {
      setStatus('Write a manual prompt or use the builder options first');
      return;
    }

    setGenerating(true);
    setGeneratedPrompt(nextPrompt);
    registerDraft(nextPrompt);

    try {
      setStatus('Queueing generation job...');
      const nodeId = `creator_lab_${Date.now()}`;

      const executeResult = await executeWorkflow({
        workspaceId,
        nodeId,
        model: 'nano-banana-pro',
        parameters: {
          prompt: nextPrompt,
          aspectRatio: '9:16',
          resolution: '2K',
          amount: 1
        }
      });

      setStatus('Generating media...');
      const mediaUrl = await waitForJobMedia(executeResult.jobId, workspaceId);

      setLatestMedia({
        type: 'image',
        url: mediaUrl
      });

      await persistGeneratedMediaToLibrary(nextPrompt, mediaUrl);
      setStatus('Generated and saved to Element Library');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const onCopy = async () => {
    if (!generatedPrompt) {
      setStatus('Generate a prompt first');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setStatus('Prompt copied to clipboard');
    } catch {
      setStatus('Clipboard permission unavailable');
    }
  };

  const onSelectDraft = (draft: PromptDraft) => {
    setActiveDraftId(draft.id);
    setLibraryItemId(null);
    setElementName(draft.name);
    setElementType(draft.type);
    setMode(draft.mode);
    setGeneratedPrompt(draft.prompt);
    if (draft.mode === 'prompt') {
      setManualPrompt(draft.prompt);
    }
    setStatus(`Loaded draft: ${draft.name}`);
  };

  const panelClass = 'rounded-2xl border border-white/5 bg-ink-950/80 backdrop-blur-md shadow-lg';
  const labelClass = 'text-[10px] uppercase font-semibold text-zinc-500 tracking-wider mb-1.5 block';

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.02),transparent_45%),linear-gradient(170deg,#000000_0%,#09090b_62%,#000000_100%)] p-4 text-zinc-100 h-screen overflow-hidden flex flex-col">
      <div className="flex gap-4 min-h-0 flex-1">
        {/* Compact Drafts Sidebar */}
        <aside className={`${panelClass} w-[260px] flex-shrink-0 flex flex-col`}>
          <div className="p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 items-center rounded-md border border-white/10 bg-white/5 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 shadow-sm">
                Creator Lab
              </span>
            </div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm"
              onClick={createNew}
            >
              <Plus className="w-3.5 h-3.5" /> New Draft
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {drafts.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
                No drafts yet
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    className={`w-full group flex flex-col gap-1 rounded-lg p-2.5 text-left transition border ${activeDraftId === draft.id
                      ? 'border-white/10 bg-white/5 shadow-inner'
                      : 'border-transparent hover:bg-white/5'
                      }`}
                    onClick={() => onSelectDraft(draft)}
                  >
                    <span className="block truncate text-[13px] font-semibold text-zinc-200 group-hover:text-white transition">{draft.name}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                      <span>{draft.mode}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{draft.createdAt}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Horizontal Config Bar */}
          <header className={`${panelClass} p-4 shrink-0 flex flex-wrap items-center justify-between gap-4`}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-zinc-400" />
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase font-semibold text-zinc-500 tracking-wider">Element Name</label>
                  <input
                    className="w-48 bg-transparent text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 focus:text-white border-b border-transparent focus:border-zinc-500 transition-colors pb-0.5"
                    value={elementName}
                    onChange={(event) => setElementName(event.target.value)}
                    placeholder="e.g. Luna Rivera"
                  />
                </div>
              </div>

              <div className="h-6 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-zinc-400" />
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase font-semibold text-zinc-500 tracking-wider">Type</label>
                  <select
                    className="bg-transparent text-sm font-semibold text-zinc-300 outline-none focus:text-white appearance-none cursor-pointer"
                    value={elementType}
                    onChange={(event) => setElementType(event.target.value as ElementType)}
                  >
                    <option value="influencer">Influencer</option>
                    <option value="character">Character</option>
                    <option value="animal">Animal</option>
                    <option value="object">Object</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="h-6 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <label className="text-[9px] uppercase font-semibold text-zinc-500 tracking-wider">Workspace ID</label>
                  <input
                    className="w-20 bg-transparent text-sm font-semibold text-zinc-300 outline-none placeholder:text-zinc-600 focus:text-white border-b border-transparent focus:border-zinc-500 transition-colors pb-0.5"
                    value={workspaceId}
                    onChange={(event) => setWorkspaceId(event.target.value || 'local')}
                    placeholder="local"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                onClick={resetCurrentMode}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-transparent px-3 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
                onClick={onGeneratePrompt}
              >
                <PenTool className="w-3.5 h-3.5" /> Draft Prompt
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm disabled:opacity-50"
                onClick={onGenerateAndSave}
                disabled={generating}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? 'Processing...' : 'Generate & Save'}
              </button>
            </div>
          </header>

          <div className="flex-1 grid grid-cols-[1fr_420px] gap-4 min-h-0">
            {/* Central Canvas */}
            <section className={`${panelClass} flex flex-col overflow-hidden`}>
              <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
                <div className="absolute top-4 left-4 z-10 bg-ink-950/80 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 shadow-sm text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  Live Preview
                </div>
                <div className="flex-1 rounded-xl border border-white/5 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.03),transparent_55%)] bg-ink-950/50 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
                  {latestMedia ? (
                    <img src={latestMedia.url} alt="Generated element" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-zinc-500">
                      <div className="h-16 w-16 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center shadow-sm">
                        <ImageIcon className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-300">{elementName.trim() || 'Untitled Element'}</p>
                        <p className="text-xs mt-1 max-w-[200px]">Design your element then hit Generate to see the result.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-white/5 p-4 bg-ink-950/30">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" /> Generated Prompt
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-medium italic">{status}</span>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                      onClick={onCopy}
                      disabled={!generatedPrompt || generating}
                      title="Copy prompt"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  className="w-full resize-none rounded-lg border border-white/10 bg-ink-900/50 px-3 py-2 text-xs leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  value={generatedPrompt}
                  readOnly
                  rows={4}
                  placeholder="Your compiled prompt will appear here..."
                />
              </div>
            </section>

            {/* Right Sidebar: Builder Controls */}
            <aside className={`${panelClass} flex flex-col overflow-hidden`}>
              <div className="border-b border-white/5 p-2 shrink-0">
                <div className="flex items-center justify-center bg-ink-900 rounded-lg p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'builder' ? 'bg-zinc-100 text-ink-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    onClick={() => setMode('builder')}
                  >
                    Visual Builder
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'prompt' ? 'bg-zinc-100 text-ink-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    onClick={() => setMode('prompt')}
                  >
                    Manual Prompt
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                {mode === 'builder' ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      <SelectField
                        label="Character Type"
                        value={builder.characterType}
                        options={selectOptions.characterType}
                        onChange={(value) => updateBuilder('characterType', value)}
                      />
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
                      <div className="flex justify-center border-b border-white/5 pb-3 mb-4">
                        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-950 p-1">
                          <button
                            type="button"
                            className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === 'face' ? 'bg-zinc-100 text-ink-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                            onClick={() => setActiveTab('face')}
                          >
                            Face
                          </button>
                          <button
                            type="button"
                            className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === 'body' ? 'bg-zinc-100 text-ink-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                            onClick={() => setActiveTab('body')}
                          >
                            Body
                          </button>
                          <button
                            type="button"
                            className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${activeTab === 'style' ? 'bg-zinc-100 text-ink-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                            onClick={() => setActiveTab('style')}
                          >
                            Style
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        {activeTab === 'face' && (
                          <>
                            <SelectField label="Skin Color" value={builder.skinColor} options={selectOptions.skinColor} onChange={(value) => updateBuilder('skinColor', value)} />
                            <SelectField label="Eye Color" value={builder.eyeColor} options={selectOptions.eyeColor} onChange={(value) => updateBuilder('eyeColor', value)} />
                            <SelectField label="Hair Style" value={builder.hairStyle} options={selectOptions.hairStyle} onChange={(value) => updateBuilder('hairStyle', value)} />
                            <SelectField label="Skin Conditions" value={builder.skinCondition} options={selectOptions.skinCondition} onChange={(value) => updateBuilder('skinCondition', value)} />
                          </>
                        )}

                        {activeTab === 'body' && (
                          <>
                            <SelectField label="Body Type" value={builder.bodyType} options={selectOptions.bodyType} onChange={(value) => updateBuilder('bodyType', value)} />
                          </>
                        )}

                        {activeTab === 'style' && (
                          <>
                            <div className="col-span-2">
                              <SelectField label="Render Style" value={builder.renderStyle} options={selectOptions.renderStyle} onChange={(value) => updateBuilder('renderStyle', value)} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full gap-2 opacity-0 animate-[fadeIn_300ms_ease-out_forwards]">
                    <label className={labelClass}>Manual Prompt</label>
                    <textarea
                      className="flex-1 min-h-[300px] w-full resize-none rounded-xl border border-white/10 bg-ink-900 px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/50"
                      value={manualPrompt}
                      onChange={(event) => setManualPrompt(event.target.value)}
                      placeholder="Describe your custom influencer or element in detail..."
                    />
                    <p className="text-[10px] text-zinc-500 text-center mt-2 px-4">
                      Use Prompt mode for custom objects, animals, or handcrafted influencer direction not supported by the visual builder.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
