export type ProjectSpace = {
  id: string;
  name: string;
  createdAt: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  description: string;
  spaces: ProjectSpace[];
  createdAt: string;
  updatedAt: string;
};

export type ActiveProjectSelection = {
  projectId: string;
  spaceId: string;
};

export const PROJECT_STORAGE_KEY = 'persona-projects-v1';
export const ACTIVE_PROJECT_SELECTION_KEY = 'persona-active-project-space-v1';

export const nowIso = () => new Date().toISOString();

export const slugify = (value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'project';
};

export const createProjectSpace = (projectName: string, spaceName: string): ProjectSpace => {
  const now = nowIso();
  const base = `${slugify(projectName)}-${slugify(spaceName)}`;
  return {
    id: `${base}-${Date.now().toString(36)}`,
    name: spaceName,
    createdAt: now
  };
};

export const createProjectItem = (name: string, description: string): ProjectItem => {
  const now = nowIso();
  const base = slugify(name);

  return {
    id: `${base}-${Date.now().toString(36)}`,
    name,
    description,
    spaces: [createProjectSpace(name, 'Main Space')],
    createdAt: now,
    updatedAt: now
  };
};

export const defaultProject = (): ProjectItem => {
  const now = nowIso();

  return {
    id: 'personal-project',
    name: 'Personal Project',
    description: 'Default project for local experiments and quick generation tests.',
    spaces: [
      {
        id: 'local',
        name: 'Main Space',
        createdAt: now
      }
    ],
    createdAt: now,
    updatedAt: now
  };
};

export const parseStoredProjects = (raw: string | null): ProjectItem[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized: ProjectItem[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const candidate = item as Partial<ProjectItem>;
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
        continue;
      }

      const spaces = Array.isArray(candidate.spaces)
        ? candidate.spaces.filter(
            (space): space is ProjectSpace =>
              !!space && typeof space.id === 'string' && typeof space.name === 'string'
          )
        : [];

      normalized.push({
        id: candidate.id,
        name: candidate.name,
        description: typeof candidate.description === 'string' ? candidate.description : '',
        spaces: spaces.length > 0 ? spaces : [createProjectSpace(candidate.name, 'Main Space')],
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : nowIso(),
        updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : nowIso()
      });
    }

    return normalized;
  } catch {
    return [];
  }
};

export const parseStoredSelection = (raw: string | null): ActiveProjectSelection | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Partial<ActiveProjectSelection>;
    if (typeof candidate.projectId !== 'string' || typeof candidate.spaceId !== 'string') {
      return null;
    }

    return {
      projectId: candidate.projectId,
      spaceId: candidate.spaceId
    };
  } catch {
    return null;
  }
};

export const ensureProjects = (projects: ProjectItem[]) =>
  projects.length > 0 ? projects : [defaultProject()];

export const resolveActiveSelection = (
  projects: ProjectItem[],
  selection: ActiveProjectSelection | null
): ActiveProjectSelection => {
  const normalizedProjects = ensureProjects(projects);
  if (selection) {
    const project = normalizedProjects.find((item) => item.id === selection.projectId);
    const space = project?.spaces.find((item) => item.id === selection.spaceId);
    if (project && space) {
      return selection;
    }
  }

  const fallbackProject = normalizedProjects[0];
  const fallbackSpace = fallbackProject.spaces[0];
  return {
    projectId: fallbackProject.id,
    spaceId: fallbackSpace.id
  };
};

export const findProjectBySpaceId = (projects: ProjectItem[], spaceId: string) => {
  for (const project of projects) {
    const space = project.spaces.find((item) => item.id === spaceId);
    if (space) {
      return {
        project,
        space
      };
    }
  }

  return null;
};
