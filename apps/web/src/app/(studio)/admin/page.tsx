import { KpiStats } from '@/components/admin/KpiStats';
import { ApiKeyManager } from '@/components/admin/ApiKeyManager';
import { SystemLogs } from '@/components/admin/SystemLogs';
import { ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const metadata = {
  title: 'Admin Dashboard - Persona Engine'
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-red-900/50 bg-neutral-900 p-8 text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-neutral-400">
            You do not have permission to view the developer dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-500/20">
              PE
            </div>
            <span className="font-semibold tracking-tight text-white">Persona Engine</span>
            <span className="ml-2 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400">
              Admin
            </span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">Developer Dashboard</h1>
          <p className="text-neutral-400">
            Monitor infrastructure KPIs, manage load balancer capacity, and review system logs.
          </p>
        </div>

        <KpiStats />
        <ApiKeyManager />
        <SystemLogs />
      </main>
    </div>
  );
}
