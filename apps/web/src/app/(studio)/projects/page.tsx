'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useProjectContext } from '@/components/projects/project-context';
import { createProjectItem, createProjectSpace, nowIso } from '@/lib/projects';
import { FolderGit2, Plus, Search, Trash2, ArrowRight, Boxes, X, LayoutGrid } from 'lucide-react';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS, STUDIO_PANEL_MUTED_CLASS } from '@/components/studio/StudioSection';
import {
  studioGhostButtonClass,
  studioInputClass,
  studioKickerClass,
  studioPrimaryButtonClass,
  studioSecondaryButtonClass,
  studioStatusClass
} from '@/components/studio/StudioControls';
import { StudioStat } from '@/components/studio/StudioStat';

const panelClass = STUDIO_PANEL_CLASS;
const fieldClass = studioInputClass;

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
    <StudioPageShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className={`${panelClass} flex flex-wrap items-end justify-between gap-6 p-6 md:p-8`}>
          <div>
            <span className={studioKickerClass}>
              <FolderGit2 className="h-3.5 w-3.5" />
              Studio Portfolio
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Create isolated project environments so workflows, spaces, and generation runs stay context-true.
            </p>
          </div>

          <StudioStat
            label="Active Projects"
            value={projects.length.toLocaleString()}
            className="w-full max-w-[220px]"
          />
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              className={`${fieldClass} pl-9 pr-4`}
              placeholder="Search projects..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <button type="button" onClick={() => setShowCreate(!showCreate)} className={studioPrimaryButtonClass}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>

        {status ? <div className={`${studioStatusClass} inline-flex self-start`}>{status}</div> : null}

        {showCreate ? (
          <section className={`${panelClass} animate-in fade-in slide-in-from-top-2 p-5 duration-300 md:p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <LayoutGrid className="h-4 w-4" />
                Create New Project
              </h3>
              <button type="button" onClick={() => setShowCreate(false)} className={studioGhostButtonClass}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid items-end gap-4 md:grid-cols-[1fr,1fr,auto]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Project Name</label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Client launch, seasonal campaign..."
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Description (optional)</label>
                <input
                  id="project-description"
                  type="text"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  placeholder="What this project space is for"
                  className={fieldClass}
                />
              </div>

              <button type="button" className={studioPrimaryButtonClass} onClick={handleCreateProject}>
                Create
              </button>
            </div>
          </section>
        ) : null}

        <section className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className={`${STUDIO_PANEL_MUTED_CLASS} group flex flex-col p-5 transition-all hover:border-studio-600 md:p-6`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate pr-4 text-xl font-medium text-studio-cream">{project.name}</h2>
                  <p className="mt-1.5 line-clamp-2 text-sm text-zinc-400">{project.description || 'No description provided.'}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className={`${studioSecondaryButtonClass} h-8 px-2.5 text-xs`}
                    onClick={() => handleAddSpace(project.id)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Space
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t border-studio-700/80 pt-5">
                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  <Boxes className="h-3.5 w-3.5" />
                  Project Canvases ({project.spaces.length})
                </h3>

                <div className="flex flex-col gap-2">
                  {project.spaces.map((space) => {
                    const isActiveSpace =
                      activeSelection?.projectId === project.id && activeSelection.spaceId === space.id;

                    return (
                      <div
                        key={space.id}
                        className={`group/space flex items-center justify-between rounded-xl border p-3 transition-colors md:p-4 ${
                          isActiveSpace
                            ? 'border-studio-600/70 bg-studio-800/80'
                            : 'border-studio-700 bg-studio-900/70 hover:border-studio-600 hover:bg-studio-800/75'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span
                            className={`text-sm font-medium transition-colors ${
                              isActiveSpace ? 'text-studio-cream' : 'text-zinc-200 group-hover/space:text-studio-cream'
                            }`}
                          >
                            {space.name}
                          </span>
                          <span className="mt-0.5 font-mono text-xs text-zinc-500">{space.id}</span>
                        </div>

                        <Link
                          href={`/canvas/${space.id}`}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                            isActiveSpace
                              ? 'border border-studio-600 bg-studio-800 text-studio-cream shadow-[0_0_16px_rgba(255,255,255,0.16)] hover:border-zinc-400 hover:bg-studio-800/90'
                              : 'border border-studio-700 bg-studio-900 text-zinc-400 hover:border-studio-600 hover:bg-studio-800 hover:text-studio-cream'
                          }`}
                          onClick={() => setActiveSelection(project.id, space.id)}
                        >
                          <ArrowRight className="h-4 w-4" />
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
    </StudioPageShell>
  );
}
