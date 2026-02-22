'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useProjectContext } from '@/components/projects/project-context';
import { createProjectItem, createProjectSpace, nowIso } from '@/lib/projects';
import { FolderGit2, Plus, Search, Trash2, ArrowRight, Boxes, X, LayoutGrid } from 'lucide-react';

const panelClass = 'rounded-2xl border border-white/5 bg-ink-950/40 backdrop-blur-md shadow-2xl';
const fieldClass =
  'h-10 w-full rounded-xl border border-white/5 bg-ink-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50';

export default function ProjectsPage() {
  const { projects, setProjects, activeSelection, setActiveSelection } = useProjectContext();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery)
    );
  }, [projects, query]);

  const handleCreateProject = () => {
    const nextName = projectName.trim();
    if (!nextName) {
      setStatus('Project name is required.');
      return;
    }

    if (projects.some((project) => project.name.toLowerCase() === nextName.toLowerCase())) {
      setStatus('A project with that name already exists.');
      return;
    }

    const nextProject = createProjectItem(nextName, projectDescription.trim());
    setProjects((previous) => [nextProject, ...previous]);
    setActiveSelection(nextProject.id, nextProject.spaces[0].id);
    setProjectName('');
    setProjectDescription('');
    setShowCreate(false);
    setStatus(`Created project ${nextProject.name}.`);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleAddSpace = (projectId: string) => {
    let nextSpaceId: string | null = null;

    setProjects((previous) =>
      previous.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        const nextSpaceName = `Space ${project.spaces.length + 1}`;
        const nextSpace = createProjectSpace(project.name, nextSpaceName);
        nextSpaceId = nextSpace.id;

        return {
          ...project,
          spaces: [...project.spaces, nextSpace],
          updatedAt: nowIso()
        };
      })
    );

    if (nextSpaceId) {
      setActiveSelection(projectId, nextSpaceId);
    }

    setStatus('Added a new space to the project.');
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      setStatus('At least one project is required.');
      return;
    }

    const target = projects.find((project) => project.id === projectId);
    if (!target) {
      return;
    }

    if (!window.confirm(`Delete ${target.name}?`)) {
      return;
    }

    setProjects((previous) => previous.filter((project) => project.id !== projectId));
    setStatus(`Deleted project ${target.name}.`);
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.02),transparent_45%),linear-gradient(170deg,#000000_0%,#09090b_62%,#000000_100%)] p-4 md:p-8 text-zinc-100">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <header className={`${panelClass} flex flex-wrap items-end justify-between gap-6 p-6 md:p-8`}>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
              <FolderGit2 className="w-3.5 h-3.5" />
              Studio Portfolio
            </span>
            <h1 className="mt-4 font-display text-4xl md:text-5xl tracking-tight text-zinc-100">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Create isolated project environments so workflows, spaces, and generation runs stay context-true.
            </p>
          </div>

          <div className="flex flex-col items-end">
            <strong className="block text-4xl font-display text-zinc-100">{projects.length}</strong>
            <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Active Projects</span>
          </div>
        </header>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              className="h-10 w-full rounded-xl border border-white/5 bg-ink-900 pl-9 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300/50 shadow-sm"
              placeholder="Search projects..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-all hover:bg-zinc-200 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>

        {status && (
          <div className="px-3 py-2 text-xs font-medium text-lime-400 bg-lime-400/10 border border-lime-400/20 rounded-lg inline-flex self-start">
            {status}
          </div>
        )}

        {showCreate && (
          <section className={`${panelClass} p-5 md:p-6 animate-in fade-in slide-in-from-top-2 duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Create New Project
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr,1fr,auto] items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Project Name</label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Client launch, Seasonal campaign..."
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Description (optional)</label>
                <input
                  id="project-description"
                  type="text"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="What this project space is for"
                  className={fieldClass}
                />
              </div>

              <button
                type="button"
                className="h-10 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-all hover:bg-zinc-200 flex items-center justify-center gap-2 shadow-sm"
                onClick={handleCreateProject}
              >
                Create
              </button>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-2 lg:gap-6 items-start">
          {filteredProjects.map((project) => (
            <article key={project.id} className={`${panelClass} group flex flex-col p-5 md:p-6 transition-all hover:border-white/10`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-medium text-zinc-100 truncate pr-4">{project.name}</h2>
                  <p className="mt-1.5 text-sm text-zinc-400 line-clamp-2">{project.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="h-8 rounded-lg bg-white/5 border border-white/5 px-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-1.5 transition-colors"
                    onClick={() => handleAddSpace(project.id)}
                  >
                    <Plus className="w-3.5 h-3.5" /> Space
                  </button>
                  <button
                    type="button"
                    className="h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t border-white/5 pt-5">
                <h3 className="mb-4 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center gap-2">
                  <Boxes className="w-3.5 h-3.5" />
                  Project Spaces ({project.spaces.length})
                </h3>

                <div className="flex flex-col gap-2">
                  {project.spaces.map((space) => {
                    const isActiveSpace =
                      activeSelection?.projectId === project.id && activeSelection.spaceId === space.id;

                    return (
                      <div
                        key={space.id}
                        className={`group/space flex items-center justify-between rounded-xl border p-3 md:p-4 transition-colors ${isActiveSpace ? 'border-lime-400/30 bg-lime-400/5' : 'border-white/5 bg-ink-900/40 hover:bg-white/5 hover:border-white/10'}`}
                      >
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isActiveSpace ? 'text-lime-400' : 'text-zinc-200 group-hover/space:text-white transition-colors'}`}>{space.name}</span>
                          <span className="text-xs text-zinc-500 font-mono mt-0.5">{space.id}</span>
                        </div>

                        <Link
                          href={`/canvas/${space.id}`}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all ${isActiveSpace ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:brightness-110' : 'bg-white/5 text-zinc-400 hover:bg-white border border-transparent hover:border-white/20 hover:text-black hover:shadow-lg hover:scale-105'}`}
                          onClick={() => setActiveSelection(project.id, space.id)}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
