'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Compass,
  CreditCard,
  FlaskConical,
  GraduationCap,
  History,
  House,
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
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors duration-200 hover:bg-white/5 hover:text-white';

const linkClass = (active: boolean) =>
  [
    'group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200',
    active
      ? 'bg-ink-800 text-white'
      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
  ].join(' ');

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

  const mainLinks: Array<{ name: string; href: string; icon: LucideIcon }> = [
    { name: 'Home', href: '/dashboard', icon: House },
    { name: 'Billing', href: '/billing', icon: CreditCard }
  ];

  const toolLinks: Array<{ name: string; href: string; icon: LucideIcon }> = [
    { name: 'Spaces', href: '/spaces', icon: Compass },
    { name: 'Element Library', href: '/library', icon: LibraryBig },
    { name: 'History', href: '/history', icon: History },
    { name: 'Element Creator Lab', href: '/element-creator-lab', icon: FlaskConical }
  ];

  if (isDeveloper) {
    toolLinks.push({ name: 'Developer', href: '/admin', icon: ShieldAlert });
  }

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'collapsed !w-[74px]' : '!w-[276px]'} relative flex h-screen shrink-0 flex-col border-r border-white/5 bg-ink-950 transition-[width] duration-300`}
    >
      <div className="flex h-[72px] items-center justify-between border-b border-slate-700/40 px-3">
        <div className="min-w-0">
          {!isCollapsed ? (
            <span className="flex flex-col">
              <span className="font-display text-[22px] leading-[0.9] tracking-[0.01em] text-slate-100">Persona Engine</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Studio Console</span>
            </span>
          ) : (
            <span className="font-display text-[22px] text-slate-100">P</span>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <div className="relative px-3 py-3" ref={projectSelectorRef}>
        <button
          type="button"
          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${projectMenuOpen ? 'border-white/10 bg-ink-800' : 'border-white/5 bg-ink-900 hover:border-white/10 hover:bg-white/5'}`}
          title="Switch active project and space"
          onClick={() => setProjectMenuOpen((value) => !value)}
          aria-expanded={projectMenuOpen}
          aria-haspopup="menu"
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-ink-950">
            {activeProject?.name?.charAt(0).toUpperCase() || 'P'}
          </span>

          {!isCollapsed ? (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <strong className="truncate text-xs font-semibold text-slate-100">{activeProject?.name || 'Projects'}</strong>
                <em className="truncate text-[10px] not-italic text-slate-400">{activeSpace?.name || 'Select space'}</em>
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition ${projectMenuOpen ? 'rotate-180' : ''}`} />
            </>
          ) : null}
        </button>

        {projectMenuOpen ? (
          <div
            className={`absolute top-[calc(100%+10px)] z-50 rounded-xl border border-white/5 bg-ink-900 p-2 shadow-panel ${isCollapsed ? 'left-[74px] w-[300px]' : 'left-0 right-0'}`}
            role="menu"
            aria-label="Project space selector"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-100">Project Spaces</span>
              <Link
                href="/projects"
                className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                onClick={() => setProjectMenuOpen(false)}
              >
                Manage
              </Link>
            </div>

            <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
              {projects.map((project) => (
                <div key={project.id} className="flex flex-col gap-1">
                  <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{project.name}</div>
                  {project.spaces.map((space) => {
                    const active = activeProject?.id === project.id && activeSpace?.id === space.id;

                    return (
                      <button
                        key={space.id}
                        type="button"
                        className={`flex min-h-9 items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition ${active ? 'border-white/10 bg-white/5 text-white' : 'border-transparent bg-transparent text-zinc-300 hover:bg-white/5'}`}
                        onClick={() => handleSelectProjectSpace(project.id, space.id)}
                      >
                        <span className="truncate text-xs font-medium">{space.name}</span>
                        <span className="truncate text-[10px] text-slate-500">{space.id}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-1">
        <ul className="space-y-1">
          {mainLinks.map((link) => (
            <li key={link.name}>
              <Link href={link.href} className={linkClass(pathname === link.href)} title={link.name}>
                <span className="text-slate-300 transition group-hover:text-slate-100">
                  <link.icon size={16} strokeWidth={2} />
                </span>
                {!isCollapsed ? <span>{link.name}</span> : null}
              </Link>
            </li>
          ))}
        </ul>

        {!isCollapsed ? <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tools</div> : null}

        <ul className="space-y-1">
          {toolLinks.map((link) => (
            <li key={link.name}>
              <Link href={link.href} className={linkClass(pathname === link.href)} title={link.name}>
                <span className="text-slate-300 transition group-hover:text-slate-100">
                  <link.icon size={16} strokeWidth={2} />
                </span>
                {!isCollapsed ? <span>{link.name}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-700/30 px-3 pb-3 pt-3">
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
