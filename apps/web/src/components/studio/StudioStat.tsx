import { ReactNode } from 'react';
import { STUDIO_PANEL_MUTED_CLASS } from '@/components/studio/StudioSection';

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

type StudioStatProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  className?: string;
};

export function StudioStat({ label, value, hint, icon, className }: StudioStatProps) {
  return (
    <article className={joinClasses(STUDIO_PANEL_MUTED_CLASS, 'p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        {icon ? <span className="text-zinc-400">{icon}</span> : null}
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</span>
      </div>
      <div className="text-3xl font-bold leading-none text-white">{value}</div>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </article>
  );
}
