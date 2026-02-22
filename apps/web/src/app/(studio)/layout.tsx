import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { ProjectProvider } from '@/components/projects/project-context';

export default function StudioLayout({ children }: { children: ReactNode }) {
    return (
        <ProjectProvider>
            <div className="app-layout relative z-10 flex h-screen overflow-hidden">
                <Sidebar />
                <div className="app-content relative flex-1 overflow-auto">{children}</div>
            </div>
        </ProjectProvider>
    );
}
