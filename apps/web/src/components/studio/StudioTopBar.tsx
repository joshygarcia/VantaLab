'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Compass, Grid2x2, History, LayoutGrid, Settings } from 'lucide-react';
import type { ComponentType } from 'react';

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

  return (
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
          <button type="button" className="relative text-white/60 transition-colors hover:text-white" aria-label="Notifications">
            <Bell size={21} />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-[#0B0C10] bg-blue-500" />
          </button>
          <button type="button" className="text-white/60 transition-colors hover:text-white" aria-label="Settings">
            <Settings size={21} />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-sm font-semibold text-white transition-opacity hover:opacity-85" aria-label="User menu">
            J
          </button>
        </div>
      </div>
    </header>
  );
}
