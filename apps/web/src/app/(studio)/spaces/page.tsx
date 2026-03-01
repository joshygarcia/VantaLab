'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createCustomSpace, deleteCustomSpace, listCustomSpaces, updateCustomSpace, CustomSpaceItem } from '@/lib/api';
import { Plus, X, Layers, Globe, Lock, Share2, Unlock } from 'lucide-react';
import { useProjectContext } from '@/components/projects/project-context';

type SpaceProtection = CustomSpaceItem['protection'];

type TemplateSpace = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  workspaceId: string;
};

const templateSpaces: TemplateSpace[] = [
  {
    id: 'template_influencer_launch',
    name: 'Influencer Launch Space',
    description: 'Pipeline for creating influencer portraits, clips, and publish-ready assets.',
    tags: ['Kling Elements', 'Image + Video', 'Social'],
    workspaceId: 'template-influencer-launch'
  },
  {
    id: 'template_product_story',
    name: 'Product Story Space',
    description: 'Generate product hero images and short narrative videos for campaigns.',
    tags: ['Product', 'Prompt Chains', 'Campaign'],
    workspaceId: 'template-product-story'
  },
  {
    id: 'template_content_batch',
    name: 'Content Batch Space',
    description: 'Batch-ready setup for weekly content production in one shared workspace.',
    tags: ['Batch', 'Workflow', 'Ops'],
    workspaceId: 'template-content-batch'
  }
];

const protectionLabels: Record<SpaceProtection, string> = {
  standard: 'Standard',
  'template-only': 'Template-only',
  locked: 'Locked',
  'team-shared': 'Team-shared'
};

const protectionIcons: Record<SpaceProtection, React.ReactNode> = {
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

const panelClass = 'rounded-2xl border border-white/5 bg-ink-950/80 backdrop-blur-sm';
const inputClass =
  'h-10 w-full rounded-lg border border-white/10 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-300/20';

export default function SpacesPage() {
  const { activeSpace } = useProjectContext();
  const ownerWorkspaceId = activeSpace?.id ?? 'local';
  const [customSpaces, setCustomSpaces] = useState<CustomSpaceItem[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [protection, setProtection] = useState<SpaceProtection>('standard');
  const [sharedWorkspaceIdsInput, setSharedWorkspaceIdsInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<CustomSpaceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProtection, setEditProtection] = useState<SpaceProtection>('standard');
  const [editSharedWorkspaceIdsInput, setEditSharedWorkspaceIdsInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
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
      setStatus('Custom spaces synced from backend');
    } catch {
      setStatus('Unable to load custom spaces for this owner workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomSpaces(ownerWorkspaceId);
  }, [ownerWorkspaceId]);

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
      setStatus('Failed to create custom space');
    }
  };

  const handleDelete = async (space: CustomSpaceItem) => {
    if (space.ownerWorkspaceId !== ownerWorkspaceId) {
      setStatus(`You can only delete spaces owned by ${ownerWorkspaceId}`);
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
      setStatus(`You can only edit spaces owned by ${ownerWorkspaceId}`);
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

  const metrics = useMemo(() => {
    const counts: Record<SpaceProtection, number> = {
      standard: 0,
      'template-only': 0,
      locked: 0,
      'team-shared': 0
    };

    for (const space of customSpaces) {
      counts[space.protection] += 1;
    }

    return {
      total: customSpaces.length,
      locked: counts.locked + counts['template-only'],
      teamShared: counts['team-shared']
    };
  }, [customSpaces]);

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_14%_8%,rgba(255,255,255,0.02),transparent_35%),linear-gradient(170deg,#000000_0%,#09090b_62%,#000000_100%)] p-5 md:p-7 relative">
      <header className={`${panelClass} flex flex-col md:flex-row md:items-start justify-between p-6`}>
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            Workspace Atlas
          </span>

          <h1 className="mt-3 font-display text-4xl leading-[0.9] text-zinc-50">Spaces</h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Spin up protected environments, launch curated templates, and keep team pipelines organized.
          </p>

          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Total</span>
              <strong className="text-lg text-zinc-50">{metrics.total}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Protected</span>
              <strong className="text-lg text-zinc-50">{metrics.locked}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Team Shared</span>
              <strong className="text-lg text-zinc-50">{metrics.teamShared}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.08em] text-zinc-500">Templates</span>
              <strong className="text-lg text-zinc-50">{templateSpaces.length}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col items-end gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadCustomSpaces(ownerWorkspaceId)}
              disabled={loading}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
            >
              {loading ? 'Refreshing...' : 'Refresh API'}
            </button>
            <span className="text-zinc-600">|</span>
            <Link href={`/canvas/${ownerWorkspaceId}`} className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition">
              Open Canvas →
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-6 mt-6 xl:grid-cols-[3fr,4fr]">
        {status ? (
          <div className="xl:col-span-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-zinc-300">
            {status}
          </div>
        ) : null}

        <section className={`${panelClass} p-5 flex flex-col`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-50">Templates</h2>
            </div>
          </div>

          <div className="grid gap-3 flex-grow content-start">
            {templateSpaces.map((space) => (
              <Link
                key={space.id}
                href={`/canvas/${space.workspaceId}`}
                className="group rounded-xl border border-white/5 bg-ink-900 p-4 transition-all hover:bg-white/5 hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-50 group-hover:text-white transition">{space.name}</h3>
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 transition group-hover:text-zinc-300">Open &rarr;</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">{space.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {space.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${panelClass} p-5 flex flex-col`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-50">Custom Spaces</h2>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Space
            </button>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search custom spaces..."
            className="h-9 w-full rounded-lg border border-white/10 bg-ink-900 px-3 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50 mb-4"
          />

          {filteredCustomSpaces.length === 0 ? (
            <div className="flex-grow flex items-center justify-center rounded-xl border border-white/5 bg-ink-900/50 text-xs text-zinc-500 min-h-[200px]">
              No custom spaces match this query.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 flex-grow content-start">
              {filteredCustomSpaces.map((space) => (
                <article key={space.id} className="group relative rounded-xl border border-white/5 bg-ink-900 p-4 transition-all hover:bg-white/5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-50">{space.name}</h3>
                    <div className="flex items-center text-zinc-500 group-hover:text-zinc-300 transition" title={protectionLabels[space.protection]}>
                      {protectionIcons[space.protection]}
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2 min-h-8">{space.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                      {protectionLabels[space.protection]}
                    </span>
                    {space.ownerWorkspaceId !== ownerWorkspaceId ? (
                      <span className="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                        Shared by {space.ownerWorkspaceId}
                      </span>
                    ) : null}
                  </div>

                  {space.protection === 'team-shared' && space.sharedWorkspaceIds.length > 0 ? (
                    <p className="mt-2 text-[10px] text-zinc-500">
                      Shared with: {space.sharedWorkspaceIds.join(', ')}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/canvas/${space.id}`}
                      className="inline-flex h-7 items-center justify-center rounded-md bg-white/5 px-2.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Open
                    </Link>

                    <button
                      type="button"
                      onClick={() => startEdit(space)}
                      disabled={space.ownerWorkspaceId !== ownerWorkspaceId || isImmutableProtection(space.protection)}
                      className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-semibold text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300 disabled:opacity-40"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(space)}
                      disabled={space.ownerWorkspaceId !== ownerWorkspaceId || isImmutableProtection(space.protection)}
                      className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[11px] font-semibold text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
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

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">New Custom Space</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition"
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
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 rounded-lg bg-zinc-100 px-5 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm"
                >
                  Create Space
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
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">Edit Custom Space</h2>
              <button
                type="button"
                onClick={() => setEditingSpace(null)}
                className="text-zinc-500 hover:text-zinc-300 transition"
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
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 rounded-lg bg-zinc-100 px-5 text-xs font-semibold text-ink-950 transition hover:bg-white shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
