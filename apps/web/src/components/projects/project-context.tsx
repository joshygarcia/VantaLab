'use client';

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  ACTIVE_PROJECT_SELECTION_KEY,
  ActiveProjectSelection,
  ensureProjects,
  findProjectBySpaceId,
  parseStoredProjects,
  parseStoredSelection,
  ProjectItem,
  PROJECT_STORAGE_KEY,
  resolveActiveSelection
} from '@/lib/projects';

type ProjectContextValue = {
  hydrated: boolean;
  projects: ProjectItem[];
  setProjects: Dispatch<SetStateAction<ProjectItem[]>>;
  activeSelection: ActiveProjectSelection | null;
  activeProject: ProjectItem | null;
  activeSpace: ProjectItem['spaces'][number] | null;
  setActiveSelection: (projectId: string, spaceId: string) => void;
  setActiveBySpaceId: (spaceId: string) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [projectsState, setProjectsState] = useState<ProjectItem[]>([]);
  const [activeSelectionState, setActiveSelectionState] = useState<ActiveProjectSelection | null>(null);

  useEffect(() => {
    const loadedProjects = ensureProjects(parseStoredProjects(window.localStorage.getItem(PROJECT_STORAGE_KEY)));
    const loadedSelection = parseStoredSelection(window.localStorage.getItem(ACTIVE_PROJECT_SELECTION_KEY));
    const resolvedSelection = resolveActiveSelection(loadedProjects, loadedSelection);

    setProjectsState(loadedProjects);
    setActiveSelectionState(resolvedSelection);
    setHydrated(true);
  }, []);

  const setProjects: Dispatch<SetStateAction<ProjectItem[]>> = useCallback((updater) => {
    setProjectsState((previous) => {
      const next = typeof updater === 'function'
        ? (updater as (state: ProjectItem[]) => ProjectItem[])(previous)
        : updater;
      return ensureProjects(next);
    });
  }, []);

  const setActiveSelection = useCallback((projectId: string, spaceId: string) => {
    setActiveSelectionState({ projectId, spaceId });
  }, []);

  const setActiveBySpaceId = useCallback((spaceId: string) => {
    const match = findProjectBySpaceId(projectsState, spaceId);
    if (!match) {
      return;
    }

    setActiveSelectionState({
      projectId: match.project.id,
      spaceId: match.space.id
    });
  }, [projectsState]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectsState));
  }, [hydrated, projectsState]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const resolved = resolveActiveSelection(projectsState, activeSelectionState);
    if (
      !activeSelectionState ||
      resolved.projectId !== activeSelectionState.projectId ||
      resolved.spaceId !== activeSelectionState.spaceId
    ) {
      setActiveSelectionState(resolved);
      return;
    }

    window.localStorage.setItem(ACTIVE_PROJECT_SELECTION_KEY, JSON.stringify(activeSelectionState));
  }, [activeSelectionState, hydrated, projectsState]);

  const activeProject = useMemo(() => {
    if (!activeSelectionState) {
      return null;
    }

    return projectsState.find((project) => project.id === activeSelectionState.projectId) ?? null;
  }, [activeSelectionState, projectsState]);

  const activeSpace = useMemo(() => {
    if (!activeProject || !activeSelectionState) {
      return null;
    }

    return activeProject.spaces.find((space) => space.id === activeSelectionState.spaceId) ?? null;
  }, [activeProject, activeSelectionState]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      hydrated,
      projects: projectsState,
      setProjects,
      activeSelection: activeSelectionState,
      activeProject,
      activeSpace,
      setActiveSelection,
      setActiveBySpaceId
    }),
    [
      activeProject,
      activeSelectionState,
      activeSpace,
      hydrated,
      projectsState,
      setActiveBySpaceId,
      setActiveSelection,
      setProjects
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }

  return context;
}
