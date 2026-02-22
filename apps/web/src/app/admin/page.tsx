import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { KpiStats } from "@/components/admin/KpiStats";
import { ApiKeyManager } from "@/components/admin/ApiKeyManager";
import { SystemLogs } from "@/components/admin/SystemLogs";
import { ShieldAlert } from "lucide-react";

export const metadata = {
    title: "Admin Dashboard - Persona Engine",
};

export default async function AdminDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ secret?: string }>;
}) {
    // Simple MVP protection. For production this should use NextAuth/Clerk and middleware.
    const resolvedParams = await searchParams;
    const adminSecret = process.env.ADMIN_SECRET || "dev-admin-secret-123";

    // Check if they passed ?secret=... in the URL
    if (resolvedParams.secret !== adminSecret) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-red-900/50 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                    <p className="text-neutral-400">
                        You do not have permission to view the developer dashboard. Invalid or missing secret token.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 selection:bg-indigo-500/30">
            {/* Top Navbar */}
            <nav className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                            PE
                        </div>
                        <span className="font-semibold text-white tracking-tight">Persona Engine</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium ml-2">
                            Admin
                        </span>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 space-y-12 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Developer Dashboard</h1>
                    <p className="text-neutral-400">
                        Monitor infrastructure KPIs, manage load balancer capacity, and review system logs.
                    </p>
                </div>

                {/* KPIs */}
                <KpiStats />

                {/* API Key Load Balancer Management */}
                <ApiKeyManager />

                {/* System Logs */}
                <SystemLogs />
            </main>
        </div>
    );
}
