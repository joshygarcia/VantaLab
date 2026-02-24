"use client";

import { useState, useEffect } from "react";
import { Users, CreditCard, Activity, DollarSign, Layers, PieChart } from "lucide-react";
import { adminApiFetch } from '@/lib/admin-api';

type KpiResponse = {
    totalUsers: number;
    activeApiKeys: number;
    apiCalls: number;
    apiCostInCents: number;
    creditPurchases: number;
    overallRevenueInCents: number;
    workflowStats: Record<string, number>;
};

export function KpiStats() {
    const [stats, setStats] = useState<KpiResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await adminApiFetch('/admin/analytics/kpi');
                const data = (await res.json()) as KpiResponse;
                setStats(data);
                setErrorMessage(null);
            } catch (e) {
                console.error("Failed to fetch KPIs", e);
                setErrorMessage(e instanceof Error ? e.message : 'Failed to fetch KPIs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();

        // Poll every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading || !stats) {
        return (
            <>
                {errorMessage ? (
                    <div className="mb-6 rounded-xl border border-red-900/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {errorMessage}
                    </div>
                ) : null}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-32 rounded-xl border border-neutral-800 bg-neutral-900 p-6" />
                    ))}
                </div>
            </>
        );
    }

    const kpiCards = [
        {
            title: "Total Workspaces (Users)",
            value: stats.totalUsers?.toLocaleString() || "0",
            icon: <Users className="w-5 h-5 text-blue-400" />,
            change: "+12% this week"
        },
        {
            title: "Active API Keys",
            value: stats.activeApiKeys?.toLocaleString() || "0",
            icon: <Layers className="w-5 h-5 text-purple-400" />,
            change: "Load balancer capacity"
        },
        {
            title: "API Calls Made",
            value: stats.apiCalls?.toLocaleString() || "0",
            icon: <Activity className="w-5 h-5 text-emerald-400" />,
            change: "All time requests"
        },
        {
            title: "Total API Cost",
            value: `$${((stats.apiCostInCents || 0) / 100).toFixed(2)}`,
            icon: <PieChart className="w-5 h-5 text-red-400" />,
            change: "Across all active keys"
        },
        {
            title: "Credit Purchases",
            value: stats.creditPurchases?.toLocaleString() || "0",
            icon: <CreditCard className="w-5 h-5 text-indigo-400" />,
            change: "Credits injected"
        },
        {
            title: "Overall Revenue",
            value: `$${((stats.overallRevenueInCents || 0) / 100).toFixed(2)}`,
            icon: <DollarSign className="w-5 h-5 text-amber-400" />,
            change: "Gross profit"
        }
    ];

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {kpiCards.map((card, i) => (
                    <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg transition-transform hover:-translate-y-1 duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-neutral-400 text-sm font-medium">{card.title}</h3>
                            <div className="p-2 bg-neutral-800/50 rounded-lg">
                                {card.icon}
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {card.value}
                        </div>
                        <div className="text-xs text-neutral-500">
                            {card.change}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl w-full mb-8">
                <h3 className="text-lg font-bold text-white mb-4">Workflow Job Status Breakdown</h3>
                <div className="flex flex-wrap gap-4">
                    {Object.entries(stats.workflowStats || {}).map(([status, count]: [string, any]) => (
                        <div key={status} className="flex-1 min-w-[120px] bg-neutral-950 rounded-lg p-4 border border-neutral-800">
                            <div className="text-sm text-neutral-500 capitalize mb-1">{status}</div>
                            <div className="text-2xl font-bold text-white">{count.toLocaleString()}</div>
                        </div>
                    ))}
                    {Object.keys(stats.workflowStats || {}).length === 0 && (
                        <div className="text-neutral-500 text-sm italic">No workflow jobs recorded yet.</div>
                    )}
                </div>
            </div>
        </>
    );
}
