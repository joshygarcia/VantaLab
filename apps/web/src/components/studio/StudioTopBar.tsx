'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Compass, CreditCard, FolderKanban, Grid2x2, History, LayoutGrid, Library, RefreshCcw, Settings, Sparkles } from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UserButton } from '@/components/auth/UserButton';
import { useProjectContext } from '@/components/projects/project-context';
import { getBillingBalance, listGenerationHistory } from '@/lib/api';
import { buildStudioNotifications, getStudioNotificationBadgeCount } from './studio-topbar-notifications';

type TopNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  accentClass: string;
  match: (pathname: string) => boolean;
};

const navItems: TopNavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutGrid,
    accentClass: 'text-blue-400',
    match: (pathname) => pathname === '/dashboard'
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: Grid2x2,
    accentClass: 'text-teal-400',
    match: (pathname) => pathname.startsWith('/projects')
  },
  {
    label: 'Canvas',
    href: '/canvas',
    icon: Compass,
    accentClass: 'text-purple-400',
    match: (pathname) => pathname.startsWith('/canvas')
  },
  {
    label: 'History',
    href: '/history',
    icon: History,
    accentClass: 'text-yellow-400',
    match: (pathname) => pathname.startsWith('/history')
  }
];

export function StudioTopBar() {
  const pathname = usePathname();
  const { activeProject, activeSpace } = useProjectContext();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsStatus, setNotificationsStatus] = useState('Opening studio activity...');
  const [notificationItems, setNotificationItems] = useState<ReturnType<typeof buildStudioNotifications>>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const activeCanvasHref = activeSpace ? `/canvas/${activeSpace.id}` : '/canvas';
  const badgeCount = getStudioNotificationBadgeCount(notificationItems);

  const settingsLinks = useMemo(() => ([
    {
      href: activeCanvasHref,
      label: activeSpace ? 'Open canvas' : 'Canvas',
      description: activeSpace ? `Resume work in ${activeSpace.name}.` : 'Open the studio canvas.',
      icon: Sparkles
    },
    {
      href: '/billing',
      label: 'Billing',
      description: 'Check credits and purchases.',
      icon: CreditCard
    },
    {
      href: '/library',
      label: 'Element Library',
      description: 'Manage reusable assets.',
      icon: Library
    },
    {
      href: '/spaces',
      label: 'Spaces',
      description: 'Review workspace spaces.',
      icon: FolderKanban
    },
    {
      href: '/history',
      label: 'History',
      description: 'Review recent outputs.',
      icon: History
    },
    {
      href: '/projects',
      label: 'Projects',
      description: 'Switch the active space.',
      icon: Grid2x2
    }
  ]), [activeCanvasHref, activeSpace]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsStatus('Loading studio activity...');

    try {
      const [balance, history] = await Promise.all([
        getBillingBalance().catch(() => ({ credits: null as number | null })),
        listGenerationHistory(8).catch(() => ({ retentionDays: 14, items: [] }))
      ]);

      const nextNotifications = buildStudioNotifications({
        credits: balance.credits,
        activeSpaceName: activeSpace?.name ?? null,
        historyItems: history.items,
        now: new Date()
      });

      setNotificationItems(nextNotifications);
      setNotificationsStatus(
        nextNotifications.length > 0
          ? `${nextNotifications.length} studio update${nextNotifications.length === 1 ? '' : 's'}`
          : 'No urgent studio updates.'
      );
    } catch {
      setNotificationItems([]);
      setNotificationsStatus('Unable to load studio activity right now.');
    } finally {
      setNotificationsLoading(false);
    }
  }, [activeSpace?.name]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    void loadNotifications();
  }, [loadNotifications, notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen && !settingsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setSettingsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [notificationsOpen, settingsOpen]);

  return (
    <>
    <header className="relative z-50 h-20 shrink-0 bg-transparent backdrop-blur-sm">
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-8 md:px-12">
        <div className="flex w-64 shrink-0 items-center gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <img src="/branding/vanta-lab.svg" alt="Vanta Lab" className="h-7 w-auto invert" />
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Vanta Lab v2.0
          </span>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex" aria-label="Studio navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-white' : 'text-white/55 hover:text-white'}`}
              >
                <Icon size={22} className={`${item.accentClass} ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex w-64 shrink-0 items-center justify-end gap-6">
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                notificationsOpen
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/8 bg-white/[0.03] text-white/60 hover:border-white/15 hover:bg-white/[0.06] hover:text-white'
              }`}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-haspopup="menu"
              onClick={() => {
                setNotificationsOpen((current) => !current);
                setSettingsOpen(false);
              }}
            >
              <Bell size={21} />
              {badgeCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full border border-[#0B0C10] bg-blue-500 px-1 text-[9px] font-bold text-white shadow-[0_0_0_4px_rgba(11,12,16,0.6)]">
                  {badgeCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-[calc(100%+14px)] z-50 w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.98)_0%,rgba(13,16,22,0.98)_100%)] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.52)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Studio activity</p>
                    <p className="mt-1 text-xs text-zinc-400">{notificationsStatus}</p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    aria-label="Refresh notifications"
                    onClick={() => {
                      void loadNotifications();
                    }}
                  >
                    <RefreshCcw size={14} className={notificationsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {notificationItems.length > 0 ? notificationItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 transition hover:border-white/15 hover:bg-white/[0.06]"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                            item.tone === 'critical'
                              ? 'bg-rose-400'
                              : item.tone === 'warning'
                                ? 'bg-amber-300'
                                : 'bg-sky-300'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{item.body}</p>
                        </div>
                      </div>
                    </Link>
                  )) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-4 text-sm text-zinc-400">
                      No urgent studio updates right now.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={settingsRef} className="relative">
            <button
              type="button"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                settingsOpen
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-white/8 bg-white/[0.03] text-white/60 hover:border-white/15 hover:bg-white/[0.06] hover:text-white'
              }`}
              aria-label="Settings"
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
              onClick={() => {
                setSettingsOpen((current) => !current);
                setNotificationsOpen(false);
              }}
            >
              <Settings size={21} />
            </button>

            {settingsOpen ? (
              <div className="absolute right-0 top-[calc(100%+14px)] z-50 w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,23,31,0.98)_0%,rgba(13,16,22,0.98)_100%)] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.52)] backdrop-blur-xl">
                <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),rgba(255,255,255,0.03)_45%,rgba(255,255,255,0.02)_100%)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Studio menu</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {activeSpace
                      ? activeSpace.name
                      : 'No active space selected'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {activeSpace && activeProject
                      ? `${activeProject.name} workspace`
                      : 'Choose a project space to ground history, canvas, and library actions.'}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {settingsLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3 transition hover:border-white/15 hover:bg-white/[0.06]"
                        onClick={() => setSettingsOpen(false)}
                      >
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200">
                          <Icon size={15} />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">{link.label}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{link.description}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <UserButton variant="topbar" />
        </div>
      </div>
    </header>
    </>
  );
}
