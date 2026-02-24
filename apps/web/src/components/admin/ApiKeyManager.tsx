"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Key, Activity, Clock, Trash2 } from "lucide-react";
import { adminApiFetch } from '@/lib/admin-api';

type ApiKeyItem = {
    id: string;
    key: string;
    isActive: boolean;
    usageCount: number;
    lastUsedAt: string | null;
};

export function ApiKeyManager() {
    const [keys, setKeys] = useState<ApiKeyItem[]>([]);
    const [newKey, setNewKey] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const res = await adminApiFetch('/admin/api-keys');
            const data = (await res.json()) as ApiKeyItem[];
            setKeys(data);
            setErrorMessage(null);
        } catch (e) {
            console.error("Failed to fetch keys", e);
            setErrorMessage(e instanceof Error ? e.message : 'Failed to fetch keys');
        } finally {
            setIsLoading(false);
        }
    };

    const addKey = async () => {
        if (!newKey.trim()) return;
        try {
            await adminApiFetch('/admin/api-keys', {
                method: "POST",
                body: JSON.stringify({ provider: "kie.ai", key: newKey.trim() })
            });
            setNewKey("");
            setErrorMessage(null);
            fetchKeys();
        } catch (e) {
            console.error("Failed to add key", e);
            setErrorMessage(e instanceof Error ? e.message : 'Failed to add key');
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await adminApiFetch(`/admin/api-keys/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ isActive: !currentStatus })
            });
            setErrorMessage(null);
            fetchKeys();
        } catch (e) {
            console.error("Failed to toggle status", e);
            setErrorMessage(e instanceof Error ? e.message : 'Failed to toggle status');
        }
    };

    const deleteKey = async (id: string) => {
        try {
            await adminApiFetch(`/admin/api-keys/${id}`, {
                method: "DELETE"
            });
            setErrorMessage(null);
            fetchKeys();
        } catch (e) {
            console.error("Failed to delete key", e);
            setErrorMessage(e instanceof Error ? e.message : 'Failed to delete key');
        }
    };

    if (isLoading) return <div className="p-8 text-neutral-400">Loading keys...</div>;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full space-y-6 shadow-xl">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-indigo-400" />
                        Kie.ai Load Balancer Pool
                    </h2>
                    <p className="text-sm text-neutral-400 mt-1">
                        Manage your API keys. Traps and evenly distributes generation requests.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="rounded-lg border border-red-900/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {errorMessage}
                </div>
            ) : null}

            <div className="flex gap-3">
                <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                    onClick={addKey}
                    disabled={!newKey.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <PlusCircle className="w-4 h-4" />
                    Add Key
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-neutral-800">
                <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="bg-neutral-950 text-xs text-neutral-500 uppercase">
                        <tr>
                            <th className="px-6 py-3">API Key Name / Prefix</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Usage Mux</th>
                            <th className="px-6 py-3">Last Used</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {keys.map((k) => (
                            <tr key={k.id} className="bg-neutral-900 hover:bg-neutral-800/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-neutral-300">
                                    {k.key.substring(0, 12)}...{k.key.substring(k.key.length - 4)}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        onClick={() => toggleStatus(k.id, k.isActive)}
                                        className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${k.isActive
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'
                                            }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${k.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                        {k.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-neutral-500" />
                                        {k.usageCount.toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => deleteKey(k.id)}
                                        className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {keys.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                    No API Keys added to the registry yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
