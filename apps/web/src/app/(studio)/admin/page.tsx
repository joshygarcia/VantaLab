import { KpiStats } from '@/components/admin/KpiStats';
import { ApiKeyManager } from '@/components/admin/ApiKeyManager';
import { SystemLogs } from '@/components/admin/SystemLogs';
import { ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StudioPageShell } from '@/components/studio/StudioPageShell';
import { STUDIO_PANEL_CLASS } from '@/components/studio/StudioSection';
import { studioKickerClass } from '@/components/studio/StudioControls';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const metadata = {
  title: 'Admin Dashboard - Vanta Lab'
};

async function hasDeveloperAccess() {
  const supabase = await createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return false;
  }

  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    return false;
  }

  const profile = (await response.json()) as { role?: string };
  return profile.role === 'developer';
}

export default async function AdminDashboardPage() {
  const allowed = await hasDeveloperAccess();

  if (!allowed) {
    return (
      <StudioPageShell className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-red-900/50 bg-studio-900 p-8 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-neutral-400">
            You do not have permission to view the developer dashboard.
          </p>
        </div>
      </StudioPageShell>
    );
  }

  return (
    <StudioPageShell className="space-y-10 pb-16">
      <section className={`${STUDIO_PANEL_CLASS} p-8 md:p-10`}>
        <span className={studioKickerClass}>
          <span className="h-2 w-2 rounded-full bg-studio-gold" />
          Developer Console
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight text-white">Developer Dashboard</h1>
        <p className="mt-3 text-lg text-zinc-400">
            Monitor infrastructure KPIs, manage load balancer capacity, and review system logs.
        </p>
      </section>

      <KpiStats />
      <ApiKeyManager />
      <SystemLogs />
    </StudioPageShell>
  );
}
