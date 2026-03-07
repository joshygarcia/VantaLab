import { ReactNode } from 'react';
import { ProjectProvider } from '@/components/projects/project-context';
import { StudioTopBar } from '@/components/studio/StudioTopBar';

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <ProjectProvider>
      <div className="app-layout relative z-10 flex h-screen flex-col overflow-hidden bg-studio-950 text-studio-cream selection:bg-indigo-500/30">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <StudioTopBar />
        <div className="app-content relative z-10 min-h-0 flex-1 overflow-auto">
          <div className="relative z-10 h-full min-h-full">{children}</div>
        </div>
      </div>
    </ProjectProvider>
  );
}
