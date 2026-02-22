"use client";

import { useState, useEffect } from "react";
import { Terminal, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export function SystemLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const API_URL = "http://localhost:4000/api/v1/admin/analytics/logs";

    const fetchLogs = async (silent = false) => {
        if (!silent) setIsLoading(true);
        setIsRefreshing(true);
        try {
            const res = await fetch(API_URL);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(() => fetchLogs(true), 15000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'succeeded': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'processing': return <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />;
            default: return <Clock className="w-4 h-4 text-amber-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'succeeded': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'processing': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    if (isLoading && logs.length === 0) {
        return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full animate-pulse h-64">
                <div className="h-6 w-48 bg-neutral-800 rounded mb-6"></div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-8 bg-neutral-800 rounded w-full"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex justify-between items-center relative z-10">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-indigo-400" />
                        System Job Logs
                    </h2>
                    <p className="text-sm text-neutral-400 mt-1">
                        Real-time feed of the last 50 generation tasks across all users.
                    </p>
                </div>

                <button
                    onClick={() => fetchLogs(false)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors border border-neutral-700"
                    title="Refresh Logs"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-neutral-800 relative z-10">
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-neutral-400">
                        <thead className="bg-neutral-950 text-xs text-neutral-500 uppercase sticky top-0 z-20">
                            <tr>
                                <th className="px-6 py-3 whitespace-nowrap">Time</th>
                                <th className="px-6 py-3 whitespace-nowrap">Job ID</th>
                                <th className="px-6 py-3">Model</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 w-1/3">Prompt / Error</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {logs.map((log) => (
                                <tr key={log.id} className="bg-neutral-900 hover:bg-neutral-800/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                                        {new Date(log.createdAt).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-neutral-500">
                                        {log.id.split('_')[1]?.substring(0, 8) || log.id.substring(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                                        {log.model}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(log.status)}`}
                                        >
                                            {getStatusIcon(log.status)}
                                            <span className="capitalize">{log.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.status === 'failed' && log.error ? (
                                            <div className="text-red-400 text-xs break-words line-clamp-2" title={log.error}>
                                                {log.error}
                                            </div>
                                        ) : (
                                            <div className="text-neutral-300 text-xs break-words line-clamp-2" title={log.prompt}>
                                                {log.prompt || 'No prompt provided'}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                        No system logs recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
