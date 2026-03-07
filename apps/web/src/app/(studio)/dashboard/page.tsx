'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Beaker, Bolt, ChevronLeft, ChevronRight, Compass, Grid2x2, LibraryBig, Rocket, Sparkles, Terminal } from 'lucide-react';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS } from '@/components/studio/StudioSection';
import { studioKickerClass } from '@/components/studio/StudioControls';

const toolCards = [
  {
    href: '/projects',
    title: 'Projects',
    body: 'Manage project environments and workflows.',
    icon: Grid2x2,
    iconClass: 'text-teal-300',
    iconBoxClass: 'bg-teal-500/12 border-teal-400/20'
  },
  {
    href: '/canvas',
    title: 'Canvas',
    body: 'Launch curated templates for your labs.',
    icon: Compass,
    iconClass: 'text-purple-300',
    iconBoxClass: 'bg-purple-500/12 border-purple-400/20'
  },
  {
    href: '/library',
    title: 'Element Library',
    body: 'Curate reusable element packs and styles.',
    icon: LibraryBig,
    iconClass: 'text-yellow-300',
    iconBoxClass: 'bg-yellow-500/12 border-yellow-400/20'
  },
  {
    href: '/element-creator-lab',
    title: 'Character Creator',
    body: 'Generate and sync cross-project identities.',
    icon: Beaker,
    iconClass: 'text-rose-300',
    iconBoxClass: 'bg-rose-500/12 border-rose-400/20'
  },
  {
    href: '/history',
    title: 'History',
    body: 'Track every change and iteration.',
    icon: Sparkles,
    iconClass: 'text-amber-300',
    iconBoxClass: 'bg-amber-500/12 border-amber-400/20'
  },
  {
    href: '/admin',
    title: 'Developer',
    body: 'Access API keys, diagnostics, and logs.',
    icon: Terminal,
    iconClass: 'text-indigo-300',
    iconBoxClass: 'bg-indigo-500/12 border-indigo-400/20'
  }
] as const;

const systemCards = [
  {
    title: 'Governed Production',
    body: 'Control spaces with protection modes and keep your workspace architecture reliable across various production stages.',
    icon: Bolt,
    iconClass: 'text-blue-400'
  },
  {
    title: 'Prompt-to-Asset Continuity',
    body: 'Create in the lab and immediately persist reusable assets for workflows and teams with seamless asset management.',
    icon: Sparkles,
    iconClass: 'text-purple-400'
  },
  {
    title: 'Operational Readiness',
    body: 'Launch from dashboard to execution surfaces with fewer hops and cleaner context for your engineering teams.',
    icon: Rocket,
    iconClass: 'text-teal-400'
  }
] as const;

export default function DashboardPage() {
  const toolsScrollerRef = useRef<HTMLDivElement | null>(null);
  const systemsScrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollRow = (container: HTMLDivElement | null, direction: 'left' | 'right') => {
    if (!container) {
      return;
    }

    const amount = Math.round(container.clientWidth * 0.72);
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  return (
    <StudioPageShell className="pb-20">
      <section className={`${STUDIO_PANEL_CLASS} relative mb-12 overflow-hidden p-6 md:p-10`}>
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 -translate-y-1/3 translate-x-1/3 rounded-full bg-studio-gold/10 blur-3xl" />
        <div className="relative z-10 max-w-4xl">
          <span className={studioKickerClass}>
            <span className="h-2 w-2 rounded-full bg-studio-gold" />
            Vanta Lab Studio
          </span>

          <h1 className="mt-6 text-2xl font-bold leading-tight text-white md:text-4xl">
            Continue building with the same cinematic language from your landing experience.
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-400">
            Move from concept to production with reusable spaces, character systems, and asset pipelines built for
            creative velocity.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Studio Tools</h2>
            <p className="mt-1 text-sm text-zinc-400">Quick access to core modules</p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Previous tools"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-studio-700 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
              onClick={() => scrollRow(toolsScrollerRef.current, 'left')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next tools"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-studio-700 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
              onClick={() => scrollRow(toolsScrollerRef.current, 'right')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div ref={toolsScrollerRef} className="hide-scrollbar flex snap-x gap-6 overflow-x-auto pb-4">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group w-72 flex-none snap-start rounded-xl border border-studio-700 bg-studio-900 p-6 transition-all hover:border-studio-600 hover:bg-studio-850"
              >
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-lg border transition-colors group-hover:bg-studio-850 ${tool.iconBoxClass}`}>
                  <Icon size={20} className={tool.iconClass} />
                </span>

                <h3 className="mt-6 text-lg font-bold text-white">{tool.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{tool.body}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
          <h2 className="text-lg font-bold text-white">Recent Activity &amp; Systems</h2>
          <p className="mt-1 text-sm text-zinc-400">Operational readiness and governance</p>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Previous systems"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-studio-700 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
              onClick={() => scrollRow(systemsScrollerRef.current, 'left')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next systems"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-studio-700 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
              onClick={() => scrollRow(systemsScrollerRef.current, 'right')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div ref={systemsScrollerRef} className="hide-scrollbar flex snap-x gap-6 overflow-x-auto pb-4">
          {systemCards.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="w-[400px] flex-none snap-start rounded-xl border border-studio-700 bg-studio-900 p-6">
                <div className="mb-4 inline-flex items-center gap-3">
                  <Icon size={18} className={item.iconClass} />
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </StudioPageShell>
  );
}
