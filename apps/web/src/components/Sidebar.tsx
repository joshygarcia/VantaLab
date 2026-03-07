'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Compass,
  CreditCard,
  FlaskConical,
  GraduationCap,
  History,
  House,
  LayoutGrid,
  LibraryBig,
  LucideIcon,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert
} from 'lucide-react';
import { useProjectContext } from '@/components/projects/project-context';
import { UserButton } from '@/components/auth/UserButton';
import { createClient } from '@/lib/supabase/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const footerButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700/70 text-zinc-500 transition-colors duration-200 hover:border-indigo-500/35 hover:bg-indigo-500/10 hover:text-indigo-200';

const collapseButtonClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-white/45 transition-colors duration-200 hover:border-white/10 hover:bg-white/5 hover:text-white';

const linkClass = (active: boolean) =>
  [
    'group flex min-h-10 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition-all duration-200',
    active
      ? 'border-white/15 bg-white/5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.25)]'
      : 'border-transparent text-white/60 hover:border-white/10 hover:bg-white/5 hover:text-white'
  ].join(' ');

const linkIconClass = (active: boolean, accentClass: string) =>
  [
    'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-200',
    active
      ? `border-white/15 bg-white/5 ${accentClass.replace('opacity-70', 'opacity-100')}`
      : `border-transparent ${accentClass} group-hover:border-white/10 group-hover:bg-white/5 group-hover:opacity-100`
  ].join(' ');

type NavLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  accentClass: string;
};

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const projectSelectorRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    projects,
    activeProject,
    activeSpace,
    setActiveSelection,
    setActiveBySpaceId
  } = useProjectContext();

  const toggleSidebar = () => setIsCollapsed((previous) => !previous);

  useEffect(() => {
    const handleToggleRequest = () => {
      setIsCollapsed((previous) => !previous);
    };

    window.addEventListener('persona:toggle-sidebar', handleToggleRequest);
    return () => {
      window.removeEventListener('persona:toggle-sidebar', handleToggleRequest);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('sidebar-is-collapsed', isCollapsed);
    window.dispatchEvent(new CustomEvent('persona:sidebar-state', { detail: { collapsed: isCollapsed } }));
  }, [isCollapsed]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('sidebar-is-collapsed');
    };
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/canvas\/([^/?#]+)/);
    if (!match) {
      return;
    }

    setActiveBySpaceId(decodeURIComponent(match[1]));
  }, [pathname, setActiveBySpaceId]);

  useEffect(() => {
    if (!projectMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!projectSelectorRef.current?.contains(event.target as Node)) {
        setProjectMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [projectMenuOpen]);

  useEffect(() => {
    const supabase = createClient();

    const syncRole = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setIsDeveloper(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            authorization: `Bearer ${session.access_token}`
          }
        });

        if (!response.ok) {
          setIsDeveloper(false);
          return;
        }

        const body = (await response.json()) as { role?: string };
        setIsDeveloper(body.role === 'developer');
      } catch {
        setIsDeveloper(false);
      }
    };

    void syncRole();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void syncRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSelectProjectSpace = (projectId: string, spaceId: string) => {
    setActiveSelection(projectId, spaceId);
    setProjectMenuOpen(false);
    router.push(`/canvas/${spaceId}`);
  };

  const mainLinks: Array<NavLink> = [
    { name: 'Dashboard', href: '/dashboard', icon: House, accentClass: 'text-indigo-400 opacity-70' },
    { name: 'Projects', href: '/projects', icon: LayoutGrid, accentClass: 'text-cyan-400 opacity-70' },
    { name: 'Billing', href: '/billing', icon: CreditCard, accentClass: 'text-emerald-400 opacity-70' }
  ];

  const toolLinks: Array<NavLink> = [
    { name: 'Canvas', href: '/canvas', icon: Compass, accentClass: 'text-blue-400 opacity-70' },
    { name: 'Element Library', href: '/library', icon: LibraryBig, accentClass: 'text-purple-400 opacity-70' },
    { name: 'History', href: '/history', icon: History, accentClass: 'text-amber-400 opacity-70' },
    { name: 'Character Creator', href: '/element-creator-lab', icon: FlaskConical, accentClass: 'text-rose-400 opacity-70' }
  ];

  if (isDeveloper) {
    toolLinks.push({ name: 'Developer', href: '/admin', icon: ShieldAlert, accentClass: 'text-indigo-400 opacity-70' });
  }

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'collapsed !w-[74px]' : '!w-[280px]'} relative flex h-screen shrink-0 flex-col border-r border-white/10 bg-[#0b0d13]/95 shadow-[12px_0_42px_rgba(0,0,0,0.42)] backdrop-blur-md transition-[width] duration-300`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:34px_34px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_0%,rgba(99,102,241,0.14),transparent_32%)]" />

      <div className="relative z-10 border-b border-white/10 px-2.5 pb-3 pt-4">
        <div className={`relative flex min-h-[34px] items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed ? (
            <span className="inline-flex items-center gap-2.5">
              <img src="/branding/vanta-lab.svg" alt="Vanta Lab" className="h-6 w-auto invert" />
              <span className="h-4 w-px bg-white/10" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Vanta Lab v2.0</span>
            </span>
          ) : (
            <span className="mx-auto inline-flex h-6 w-6 items-center justify-center">
              <img src="/branding/vl_monogram.svg" alt="Vanta Lab" className="h-6 w-6 invert" />
            </span>
          )}

          {!isCollapsed ? (
            <button
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              type="button"
              className={`ml-auto ${collapseButtonClass}`}
            >
              <PanelLeftClose size={15} />
            </button>
          ) : null}
        </div>
      </div>

      {isCollapsed ? (
        <div className="relative z-10 px-2 pb-1 pt-2">
          <button
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            type="button"
            className="group flex min-h-10 w-full items-center justify-center rounded-lg border border-transparent text-white/60 transition-all duration-200 hover:border-white/10 hover:bg-white/5 hover:text-white"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-white/60 transition-colors duration-200 group-hover:border-white/10 group-hover:bg-white/5 group-hover:text-white">
              <PanelLeftOpen size={15} />
            </span>
          </button>
        </div>
      ) : null}

      <div className="relative z-10 px-3 py-3" ref={projectSelectorRef}>
        <button
          type="button"
          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${projectMenuOpen ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
          title="Switch active project and space"
          onClick={() => setProjectMenuOpen((value) => !value)}
          aria-expanded={projectMenuOpen}
          aria-haspopup="menu"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sm font-bold text-white">
            {activeProject?.name?.charAt(0).toUpperCase() || 'P'}
          </span>

          {!isCollapsed ? (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="truncate text-xs font-semibold text-white/90">{activeProject?.name || 'Projects'}</strong>
                <em className="truncate text-[10px] not-italic text-white/45">{activeSpace?.name || 'Select space'}</em>
              </span>
              <ChevronDown size={14} className={`text-white/45 transition ${projectMenuOpen ? 'rotate-180' : ''}`} />
            </>
          ) : null}
        </button>

        {projectMenuOpen ? (
          <div
            className={`absolute top-[calc(100%+10px)] z-50 rounded-xl border border-white/10 bg-[#131722]/95 p-2 shadow-studio ${isCollapsed ? 'left-[74px] w-[300px]' : 'left-0 right-0'}`}
            role="menu"
            aria-label="Project space selector"
            >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-white/90">Project Canvases</span>
              <Link
                href="/projects"
                className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                onClick={() => setProjectMenuOpen(false)}
              >
                Manage
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-700 px-3 py-4 text-center text-xs text-zinc-500">
                No projects yet.
              </div>
            ) : (
              <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                {projects.map((project) => (
                  <div key={project.id} className="flex flex-col gap-1">
                    <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{project.name}</div>
                    {project.spaces.map((space) => {
                      const active = activeProject?.id === project.id && activeSpace?.id === space.id;

                      return (
                        <button
                          key={space.id}
                          type="button"
                          className={`flex min-h-9 items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition ${active ? 'border-white/20 bg-white/10 text-indigo-200' : 'border-transparent bg-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5'}`}
                          onClick={() => handleSelectProjectSpace(project.id, space.id)}
                        >
                          <span className="truncate text-xs font-medium">{space.name}</span>
                          <span className="truncate font-mono text-[10px] text-zinc-500">{space.id}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {!isCollapsed && activeSpace ? (
        <div className="relative z-10 px-3 pb-3">
          <Link
            href={`/canvas/${activeSpace.id}`}
            className="group flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            title="Open active space in canvas"
          >
            <span className="truncate">Open Active Space</span>
            <ArrowUpRight size={14} className="shrink-0" />
          </Link>
        </div>
      ) : null}

      <nav className="relative z-10 flex-1 overflow-y-auto px-2 pb-3 pt-1">
        <ul className="space-y-1">
          {mainLinks.map((link) => {
            const active = pathname === link.href;

            return (
              <li key={link.name}>
                <Link href={link.href} className={linkClass(active)} title={link.name}>
                  <span className={linkIconClass(active, link.accentClass)}>
                    <link.icon size={16} strokeWidth={2} />
                  </span>
                  {!isCollapsed ? <span>{link.name}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>

        {!isCollapsed ? <div className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Studio Tools</div> : null}

        <ul className="space-y-1">
          {toolLinks.map((link) => {
            const active = pathname === link.href;

            return (
              <li key={link.name}>
                <Link href={link.href} className={linkClass(active)} title={link.name}>
                  <span className={linkIconClass(active, link.accentClass)}>
                    <link.icon size={16} strokeWidth={2} />
                  </span>
                  {!isCollapsed ? <span>{link.name}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative z-10 border-t border-white/10 px-3 pb-3 pt-3">
        <UserButton isCollapsed={isCollapsed} />

        <div className="flex items-center justify-between">
          <button title="Help" aria-label="Help" type="button" className={footerButtonClass}>
            <CircleHelp size={16} strokeWidth={2} />
          </button>
          <button title="Learn" aria-label="Learn" type="button" className={footerButtonClass}>
            <GraduationCap size={16} strokeWidth={2} />
          </button>
          <button title="Theme" aria-label="Theme" type="button" className={footerButtonClass}>
            <MoonStar size={16} strokeWidth={2} />
          </button>
          <button title="Notifications" aria-label="Notifications" type="button" className={footerButtonClass}>
            <Bell size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
