import { ElementType, ReactNode } from 'react';

export const STUDIO_PANEL_CLASS =
  'rounded-2xl border border-studio-700 bg-studio-900 shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

export const STUDIO_PANEL_MUTED_CLASS =
  'rounded-xl border border-studio-700 bg-studio-900 shadow-[0_6px_18px_rgba(0,0,0,0.18)]';

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

type StudioSectionProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  tone?: 'default' | 'muted';
};

export function StudioSection({
  children,
  className,
  as: Component = 'section',
  tone = 'default'
}: StudioSectionProps) {
  return (
    <Component
      className={joinClasses(tone === 'muted' ? STUDIO_PANEL_MUTED_CLASS : STUDIO_PANEL_CLASS, className)}
    >
      {children}
    </Component>
  );
}
