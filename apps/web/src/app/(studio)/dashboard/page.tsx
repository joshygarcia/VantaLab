import Link from 'next/link';
import { LayoutGrid, Library, Component, FlaskConical } from 'lucide-react';

const surfaceClass =
  'rounded-3xl border border-white/5 bg-ink-950/80 backdrop-blur-md';

export default function HomePage() {
  return (
    <main className="flex min-h-full flex-col bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.02),transparent_34%),linear-gradient(165deg,#000000_0%,#09090b_58%,#000000_100%)] p-6 md:p-8 relative">
      <div className="flex-grow max-w-5xl mx-auto w-full flex flex-col pt-8 lg:pt-16">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            Persona Engine
          </span>

          <h1 className="mt-8 font-display text-4xl leading-[1.1] text-zinc-50 md:text-5xl lg:text-6xl max-w-4xl">
            Build a premium AI production studio, not another toy workflow.
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            Create reusable personas, lock governance with protected spaces, and ship generation pipelines with
            consistent visual direction across teams.
          </p>
        </div>

        {/* Primary Action Hub */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
          <Link
            href="/projects"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-ink-950 transition-transform group-hover:scale-110">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="mt-8">
              <strong className="block text-sm font-semibold text-zinc-50">Projects</strong>
              <p className="mt-1 text-xs text-zinc-400">Manage project environments</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-100/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/spaces"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-ink-950 transition-transform group-hover:scale-110">
              <Component className="h-5 w-5" />
            </div>
            <div className="mt-8">
              <strong className="block text-sm font-semibold text-zinc-50">Spaces</strong>
              <p className="mt-1 text-xs text-zinc-400">Launch curated templates</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-100/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/library"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-ink-950 transition-transform group-hover:scale-110">
              <Library className="h-5 w-5" />
            </div>
            <div className="mt-8">
              <strong className="block text-sm font-semibold text-zinc-50">Library</strong>
              <p className="mt-1 text-xs text-zinc-400">Curate influencer packs</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-100/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/element-creator-lab"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-ink-950 transition-transform group-hover:scale-110">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="mt-8">
              <strong className="block text-sm font-semibold text-zinc-50">Creator Lab</strong>
              <p className="mt-1 text-xs text-zinc-400">Design custom elements</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-100/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>

        {/* Feature Explanations */}
        <section className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Core workflows">
          {[
            {
              title: 'Project Isolation',
              body: 'Each project keeps its own spaces and canvas execution context.'
            },
            {
              title: 'Prompt Operations',
              body: 'Draft, iterate, and save production-grade prompts.'
            },
            {
              title: 'Library + Lab Loop',
              body: 'Persist assets straight into the library from the Lab.'
            },
            {
              title: 'Launch-Ready Spaces',
              body: 'Open templates or custom spaces instantly.'
            }
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/5 bg-ink-900/50 p-4"
            >
              <strong className="text-sm text-zinc-50">{item.title}</strong>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{item.body}</p>
            </article>
          ))}
        </section>
      </div>

      {/* Subdued Metrics Footer */}
      <div className="mt-auto pt-12">
        <aside className={`${surfaceClass} flex flex-wrap items-center justify-center gap-6 px-6 py-3 max-w-4xl mx-auto`} aria-label="Studio metrics">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Governance</span>
            <span className="text-sm font-medium text-zinc-300">4 protected modes</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Asset Reuse</span>
            <span className="text-sm font-medium text-zinc-300">Shared Library</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Runtime</span>
            <span className="text-sm font-medium text-zinc-300">Real-time async</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
