"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export function UserButton({ isCollapsed }: { isCollapsed?: boolean }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Check active sessions and sets the user
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        fetchUser();

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const handleSignIn = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    if (loading) {
        return (
            <div className={`mb-3 rounded-lg border border-white/5 bg-ink-900 p-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mb-3">
                <button
                    onClick={handleSignIn}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 ${isCollapsed ? 'p-2' : ''}`}
                    title="Sign in with Google"
                >
                    <LogIn size={16} />
                    {!isCollapsed && <span>Sign In</span>}
                </button>
            </div>
        );
    }

    return (
        <div className={`mb-3 overflow-hidden rounded-lg border border-white/5 bg-ink-900 ${isCollapsed ? 'p-1' : 'p-2'}`}>
            <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
                {user.user_metadata?.avatar_url ? (
                    <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="h-8 w-8 shrink-0 rounded-full bg-ink-800 object-cover"
                    />
                ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-800 text-slate-400">
                        <UserIcon size={16} />
                    </div>
                )}

                {!isCollapsed && (
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-semibold text-white">
                            {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                        </span>
                        <span className="truncate text-[10px] text-slate-400">
                            {user.email}
                        </span>
                    </div>
                )}

                {!isCollapsed && (
                    <button
                        onClick={handleSignOut}
                        className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>
                )}
            </div>

            {isCollapsed && (
                <button
                    onClick={handleSignOut}
                    className="mt-2 flex w-full items-center justify-center rounded p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
                    title="Sign out"
                >
                    <LogOut size={14} />
                </button>
            )}
        </div>
    );
}
