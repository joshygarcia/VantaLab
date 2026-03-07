'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  createCustomSpace,
  deleteCustomSpace,
  getUserWorkspaceIds,
  listCustomSpaces,
  updateCustomSpace,
  CustomSpaceItem
} from '@/lib/api';
import { Plus, X, Layers, Globe, Lock, Share2, Unlock } from 'lucide-react';
import { useProjectContext } from '@/components/projects/project-context';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS } from '@/components/studio/StudioSection';
import {
  studioGhostButtonClass,
  studioInputClass,
  studioKickerClass,
  studioPrimaryButtonClass,
  studioSecondaryButtonClass,
  studioStatusClass
} from '@/components/studio/StudioControls';

type SpaceProtection = CustomSpaceItem['protection'];

type TemplateSpace = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  workspaceId: string;
  category: 'Marketing' | 'Product' | 'Social' | 'Operations';
  previewSrc: string;
  featured?: boolean;
};

const templateSpaces: TemplateSpace[] = [
  {
    id: 'template_influencer_launch',
    name: 'Influencer Launch Space',
    description: 'Pipeline for creating influencer portraits, clips, and publish-ready assets.',
    tags: ['Kling Elements', 'Image + Video', 'Social'],
    workspaceId: 'template-influencer-launch',
    category: 'Social',
    previewSrc: '/templates/influencer-launch.svg',
    featured: true
  },
  {
    id: 'template_product_story',
    name: 'Product Story Space',
    description: 'Generate product hero images and short narrative videos for campaigns.',
    tags: ['Product', 'Prompt Chains', 'Campaign'],
    workspaceId: 'template-product-story',
    category: 'Product',
    previewSrc: '/templates/product-story.svg',
    featured: true
  },
  {
    id: 'template_content_batch',
    name: 'Content Batch Space',
    description: 'Batch-ready setup for weekly content production in one shared workspace.',
    tags: ['Batch', 'Workflow', 'Ops'],
    workspaceId: 'template-content-batch',
    category: 'Operations',
    previewSrc: '/templates/content-batch.svg',
    featured: true
  },
  {
    id: 'template_brand_campaign',
    name: 'Brand Campaign Builder',
    description: 'Brand-safe campaign execution kit for launch windows and seasonal promotions.',
    tags: ['Brand', 'Campaign', 'Story'],
    workspaceId: 'template-brand-campaign',
    category: 'Marketing',
    previewSrc: '/templates/brand-campaign.svg'
  },
  {
    id: 'template_performance_ads',
    name: 'Performance Ads Engine',
    description: 'Structured experimentation setup for ad variants, hooks, and conversion assets.',
    tags: ['Ads', 'Performance', 'Experimentation'],
    workspaceId: 'template-performance-ads',
    category: 'Marketing',
    previewSrc: '/templates/performance-ads.svg'
  },
  {
    id: 'template_ugc_social',
    name: 'UGC Social Factory',
    description: 'Parallel social content production framework for creators and growth teams.',
    tags: ['UGC', 'Social', 'Scale'],
    workspaceId: 'template-ugc-social',
    category: 'Social',
    previewSrc: '/templates/ugc-social.svg'
  }
];

const protectionLabels: Record<SpaceProtection, string> = {
  standard: 'Standard',
  'template-only': 'Template-only',
  locked: 'Locked',
  'team-shared': 'Team-shared'
};

const protectionIcons: Record<SpaceProtection, ReactNode> = {
  standard: <Unlock className="w-3 h-3" />,
  'template-only': <Layers className="w-3 h-3" />,
  locked: <Lock className="w-3 h-3" />,
  'team-shared': <Share2 className="w-3 h-3" />
};

const isImmutableProtection = (protection: SpaceProtection) =>
  protection === 'template-only' || protection === 'locked';

const protectionDescription: Record<SpaceProtection, string> = {
  standard: 'Editable and removable by owner workspace.',
  'template-only': 'Read-only curated setup. Cannot be modified or deleted.',
  locked: 'Operationally frozen. Can be opened but not changed.',
  'team-shared': 'Visible to selected workspaces for collaborative usage.'
};

const panelClass = STUDIO_PANEL_CLASS;
const inputClass = studioInputClass;

export default function CanvasHubPage() {
  const { activeSpace } = useProjectContext();
  const preferredWorkspaceId = activeSpace?.id ?? 'local';
  const [ownerWorkspaceId, setOwnerWorkspaceId] = useState(preferredWorkspaceId);
  const [customSpaces, setCustomSpaces] = useState<CustomSpaceItem[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [protection, setProtection] = useState<SpaceProtection>('standard');
  const [sharedWorkspaceIdsInput, setSharedWorkspaceIdsInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('All');
  const [editingSpace, setEditingSpace] = useState<CustomSpaceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProtection, setEditProtection] = useState<SpaceProtection>('standard');
  const [editSharedWorkspaceIdsInput, setEditSharedWorkspaceIdsInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setIsTemplateModalOpen(false);
        setEditingSpace(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadCustomSpaces = async (workspaceId: string) => {
    setLoading(true);
    try {
      const response = await listCustomSpaces(workspaceId);
      setCustomSpaces(Array.isArray(response.items) ? response.items : []);
      setOwnerWorkspaceId(workspaceId);
      setStatus('Custom spaces synced from backend');
    } catch {
      const candidateWorkspaceIds = Array.from(new Set([...(await getUserWorkspaceIds()), 'local']))
        .map((candidate) => candidate.trim())
        .filter((candidate) => candidate.length > 0 && candidate !== workspaceId);

      for (const fallbackWorkspaceId of candidateWorkspaceIds) {
        try {
          const response = await listCustomSpaces(fallbackWorkspaceId);
          setCustomSpaces(Array.isArray(response.items) ? response.items : []);
          setOwnerWorkspaceId(fallbackWorkspaceId);
          setStatus(`Switched to workspace ${fallbackWorkspaceId} for custom canvases`);
          return;
        } catch {
        }
      }

      setStatus('Unable to load custom canvases for this owner workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomSpaces(preferredWorkspaceId);
  }, [preferredWorkspaceId]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus('Space name is required');
      return;
    }

    const sharedWorkspaceIds = sharedWorkspaceIdsInput
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    try {
      const response = await createCustomSpace(ownerWorkspaceId, {
        name: trimmedName,
        description: description.trim() || undefined,
        protection,
        sharedWorkspaceIds: protection === 'team-shared' ? sharedWorkspaceIds : undefined
      });

      setCustomSpaces((previous) => [response.item, ...previous]);
      setName('');
      setDescription('');
      setProtection('standard');
      setSharedWorkspaceIdsInput('');
      setStatus(`Created ${trimmedName}`);
      setIsCreateModalOpen(false);
    } catch {
      setStatus('Failed to create custom canvas');
    }
  };

  const handleDelete = async (space: CustomSpaceItem) => {
    if (space.ownerWorkspaceId !== ownerWorkspaceId) {
      setStatus(`You can only delete canvases owned by ${ownerWorkspaceId}`);
      return;
    }

    if (isImmutableProtection(space.protection)) {
      setStatus(`${space.name} is ${protectionLabels[space.protection]} and cannot be deleted`);
      return;
    }

    if (!window.confirm(`Delete ${space.name}?`)) {
      return;
    }

    try {
      await deleteCustomSpace(ownerWorkspaceId, space.id);
      setCustomSpaces((previous) => previous.filter((item) => item.id !== space.id));
      setStatus(`Deleted ${space.name}`);
    } catch {
      setStatus('Failed to delete custom space');
    }
  };

  const startEdit = (space: CustomSpaceItem) => {
    if (space.ownerWorkspaceId !== ownerWorkspaceId) {
      setStatus(`You can only edit canvases owned by ${ownerWorkspaceId}`);
      return;
    }

    if (isImmutableProtection(space.protection)) {
      setStatus(`${space.name} is ${protectionLabels[space.protection]} and cannot be edited`);
      return;
    }

    setEditingSpace(space);
    setEditName(space.name);
    setEditDescription(space.description);
    setEditProtection(space.protection);
    setEditSharedWorkspaceIdsInput(space.sharedWorkspaceIds.join(', '));
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingSpace) {
      return;
    }

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setStatus('Space name is required');
      return;
    }

    const sharedWorkspaceIds = editSharedWorkspaceIdsInput
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    try {
      const response = await updateCustomSpace(ownerWorkspaceId, editingSpace.id, {
        name: trimmedName,
        description: editDescription.trim() || undefined,
        protection: editProtection,
        sharedWorkspaceIds: editProtection === 'team-shared' ? sharedWorkspaceIds : undefined
      });

      setCustomSpaces((previous) =>
        previous.map((item) => (item.id === response.item.id ? response.item : item))
      );
      setStatus(`Updated ${response.item.name}`);
      setEditingSpace(null);
    } catch {
      setStatus('Failed to update custom space');
    }
  };

  const sortedCustomSpaces = useMemo(
    () => [...customSpaces].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [customSpaces]
  );

  const filteredCustomSpaces = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return sortedCustomSpaces;
    }

    return sortedCustomSpaces.filter(
      (space) =>
        space.name.toLowerCase().includes(normalizedSearch) ||
        space.description.toLowerCase().includes(normalizedSearch) ||
        protectionLabels[space.protection].toLowerCase().includes(normalizedSearch)
    );
  }, [search, sortedCustomSpaces]);

  const featuredTemplates = useMemo(
    () => templateSpaces.filter((template) => template.featured).slice(0, 3),
    []
  );

  const groupedTemplates = useMemo(() => {
    return templateSpaces.reduce<Record<string, TemplateSpace[]>>((accumulator, template) => {
      const bucket = accumulator[template.category] ?? [];
      bucket.push(template);
      accumulator[template.category] = bucket;
      return accumulator;
    }, {});
  }, []);

  const templateCategories = useMemo(
    () => ['All', ...Array.from(new Set(templateSpaces.map((template) => template.category)))],
    []
  );

  const visibleTemplateSections = useMemo(() => {
    return Object.entries(groupedTemplates).filter(([category]) => {
      return selectedTemplateCategory === 'All' || category === selectedTemplateCategory;
    });
  }, [groupedTemplates, selectedTemplateCategory]);

  return (
    <StudioPageShell className="pb-16">
      <header className={`${panelClass} relative overflow-hidden p-6 md:p-8`}>
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/4 translate-x-1/4 rounded-full bg-studio-gold/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className={studioKickerClass}>
              <span className="h-1.5 w-1.5 rounded-full bg-studio-gold" />
              Canvas Atlas
            </span>

            <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">Canvas</h1>
            <p className="max-w-3xl text-sm text-zinc-400 md:text-base">
              Spin up protected environments, launch curated templates, and keep team pipelines organized.
            </p>
          </div>

          <div className="rounded-xl border border-studio-700 bg-studio-950/70 p-4">
            <h2 className="text-sm font-semibold text-white">How Canvas Works</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">1. Start with a template</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Use featured templates for fast setup, then open in Canvas and customize for your project.
                </p>
              </div>
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">2. Set protection mode</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Choose Standard for editing, Locked for freeze mode, or Team-shared for collaborative canvases.
                </p>
              </div>
              <div className="rounded-lg border border-studio-700 bg-studio-900/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">3. Run in Canvas</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Every space routes to Canvas where prompts, assets, and generation pipelines are executed.
                </p>
              </div>
            </div>
          </div>

        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr,1.4fr]">
        {status ? (
          <div className={`xl:col-span-2 ${studioStatusClass}`}>
            {status}
          </div>
        ) : null}

        <section className={`${panelClass} p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-studio-cream">Templates</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTemplateCategory('All');
                setIsTemplateModalOpen(true);
              }}
              className="inline-flex h-8 items-center justify-center rounded-md border border-studio-gold/40 bg-studio-gold/15 px-3 text-[11px] font-semibold text-blue-100 transition hover:border-studio-gold/70 hover:bg-studio-gold/25"
            >
              More Templates
            </button>
          </div>

          <div className="grid gap-3">
            {featuredTemplates.map((space) => (
              <Link
                key={space.id}
                href={`/canvas/${space.workspaceId}`}
                className="group rounded-xl border border-studio-700 bg-studio-950/70 p-4 transition-colors hover:border-studio-600 hover:bg-studio-850"
              >
                <div className="mb-3 overflow-hidden rounded-lg border border-studio-700 bg-studio-900">
                  <img
                    src={space.previewSrc}
                    alt={`${space.name} preview`}
                    className="h-24 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white">{space.name}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 group-hover:text-zinc-300">Open</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{space.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {space.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-studio-700 bg-studio-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${panelClass} p-5`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-studio-cream">Custom Canvases</h2>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={`${studioPrimaryButtonClass} h-9 px-4 text-xs`}
            >
              <Plus className="h-3.5 w-3.5" />
                New Canvas
            </button>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search custom canvases..."
            className={`${inputClass} mb-4 h-9 text-xs`}
          />

          {filteredCustomSpaces.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-studio-700 bg-studio-950/70 text-xs text-zinc-500">
              No custom canvases match this query.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCustomSpaces.map((space) => (
                <article key={space.id} className="rounded-xl border border-studio-700 bg-studio-950/70 p-4 transition-colors hover:border-studio-600 hover:bg-studio-850">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100">{space.name}</h3>
                    <div className="text-zinc-500" title={protectionLabels[space.protection]}>
                      {protectionIcons[space.protection]}
                    </div>
                  </div>

                  <p className="mt-2 min-h-8 line-clamp-2 text-xs text-zinc-400">{space.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md border border-studio-700 bg-studio-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                      {protectionLabels[space.protection]}
                    </span>
                    {space.ownerWorkspaceId !== ownerWorkspaceId ? (
                      <span className="rounded-md border border-studio-700 bg-studio-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                        Shared by {space.ownerWorkspaceId}
                      </span>
                    ) : null}
                  </div>

                  {space.protection === 'team-shared' && space.sharedWorkspaceIds.length > 0 ? (
                    <p className="mt-2 text-[10px] text-zinc-500">Shared with: {space.sharedWorkspaceIds.join(', ')}</p>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/canvas/${space.id}`}
                      className="inline-flex h-7 items-center justify-center rounded-md border border-studio-700 bg-studio-900 px-2.5 text-[11px] font-semibold text-zinc-300 transition hover:border-studio-600 hover:bg-studio-850 hover:text-white"
                    >
                      Open
                    </Link>

                    <button
                      type="button"
                      onClick={() => startEdit(space)}
                      disabled={space.ownerWorkspaceId !== ownerWorkspaceId || isImmutableProtection(space.protection)}
                      className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-semibold text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300 disabled:opacity-40"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(space)}
                      disabled={space.ownerWorkspaceId !== ownerWorkspaceId || isImmutableProtection(space.protection)}
                      className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-semibold text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isTemplateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsTemplateModalOpen(false);
            }
          }}
        >
          <div className={`${panelClass} max-h-[86vh] w-full max-w-5xl overflow-hidden p-0`}>
            <div className="flex items-center justify-between border-b border-studio-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-studio-cream">Template Gallery</h2>
                <p className="mt-1 text-xs text-zinc-400">Browse all templates grouped by category.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className={`${studioGhostButtonClass} h-8 px-2`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(86vh-72px)] overflow-y-auto px-6 py-5">
              <div className="hide-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
                {templateCategories.map((category) => {
                  const active = selectedTemplateCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedTemplateCategory(category)}
                      className={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                        active
                          ? 'border-studio-gold/45 bg-studio-gold/15 text-blue-100'
                          : 'border-studio-700 bg-studio-900 text-zinc-400 hover:border-studio-600 hover:text-zinc-200'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-6">
                {visibleTemplateSections.map(([category, templates]) => (
                  <section key={category}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{category}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {templates.map((template) => (
                        <Link
                          key={template.id}
                          href={`/canvas/${template.workspaceId}`}
                          onClick={() => setIsTemplateModalOpen(false)}
                          className="group rounded-xl border border-studio-700 bg-studio-950/70 p-3 transition-colors hover:border-studio-600 hover:bg-studio-850"
                        >
                          <div className="overflow-hidden rounded-lg border border-studio-700 bg-studio-900">
                            <img
                              src={template.previewSrc}
                              alt={`${template.name} preview`}
                              className="h-28 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          </div>
                          <h4 className="mt-3 text-sm font-semibold text-zinc-100 group-hover:text-white">{template.name}</h4>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{template.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {template.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md border border-studio-700 bg-studio-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}

                {visibleTemplateSections.length === 0 ? (
                  <div className="rounded-xl border border-studio-700 bg-studio-950/70 px-4 py-8 text-center text-sm text-zinc-500">
                    No templates found for this category.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div className={`${panelClass} w-full max-w-md p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-studio-cream">New Custom Canvas</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                  className={`${studioGhostButtonClass} h-8 px-2`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleCreate}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Campaign Alpha"
                  maxLength={60}
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Description
                </label>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What is this space for?"
                  maxLength={140}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Protection
                </label>
                <select
                  value={protection}
                  onChange={(event) => setProtection(event.target.value as SpaceProtection)}
                  className={inputClass}
                >
                  <option value="standard">Standard (Editable)</option>
                  <option value="locked">Locked (Frozen)</option>
                  <option value="team-shared">Team-shared (Collaborative)</option>
                  <option value="template-only">Template-only (Read-only)</option>
                </select>
                <span className="text-[10px] text-zinc-400 leading-snug">{protectionDescription[protection]}</span>
              </div>

              {protection === 'team-shared' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Shared Workspaces
                  </label>
                  <input
                    value={sharedWorkspaceIdsInput}
                    onChange={(event) => setSharedWorkspaceIdsInput(event.target.value)}
                    placeholder="IDs, comma-separated"
                    className={inputClass}
                  />
                </div>
              )}

              <div className="mt-2 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`${studioGhostButtonClass} h-9 px-4 text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`${studioPrimaryButtonClass} h-9 px-5 text-xs`}
                >
                  Create Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSpace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingSpace(null);
          }}
        >
          <div className={`${panelClass} w-full max-w-md p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-studio-cream">Edit Custom Canvas</h2>
              <button
                type="button"
                onClick={() => setEditingSpace(null)}
                className={`${studioGhostButtonClass} h-8 px-2`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Name</label>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={60}
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Description</label>
                <input
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  maxLength={140}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Protection</label>
                <select
                  value={editProtection}
                  onChange={(event) => setEditProtection(event.target.value as SpaceProtection)}
                  className={inputClass}
                >
                  <option value="standard">Standard (Editable)</option>
                  <option value="locked">Locked (Frozen)</option>
                  <option value="team-shared">Team-shared (Collaborative)</option>
                </select>
                <span className="text-[10px] text-zinc-400 leading-snug">{protectionDescription[editProtection]}</span>
              </div>

              {editProtection === 'team-shared' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Shared Workspaces</label>
                  <input
                    value={editSharedWorkspaceIdsInput}
                    onChange={(event) => setEditSharedWorkspaceIdsInput(event.target.value)}
                    placeholder="IDs, comma-separated"
                    className={inputClass}
                  />
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSpace(null)}
                  className={`${studioGhostButtonClass} h-9 px-4 text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`${studioPrimaryButtonClass} h-9 px-5 text-xs`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StudioPageShell>
  );
}
