import { ReactNode } from 'react';

const BASE_CLASS =
  'relative mx-auto w-full max-w-[1400px] px-4 py-8 text-studio-cream md:px-8 lg:px-12';

const joinClasses = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

type StudioPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function StudioPageShell({ children, className }: StudioPageShellProps) {
  return <main className={joinClasses(BASE_CLASS, className)}>{children}</main>;
}
