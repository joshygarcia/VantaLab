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
            <div className={`mb-3 rounded-xl border border-studio-700 bg-studio-850/90 p-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <div className="h-8 w-8 animate-pulse rounded-full bg-studio-700/70" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mb-3">
                <button
                    onClick={handleSignIn}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border border-studio-gold bg-studio-gold px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 ${isCollapsed ? 'p-2' : ''}`}
                    title="Sign in with Google"
                >
                    <LogIn size={16} />
                    {!isCollapsed && <span>Sign In</span>}
                </button>
            </div>
        );
    }

    return (
        <div className={`mb-3 overflow-hidden rounded-xl border border-studio-700 bg-studio-850/90 ${isCollapsed ? 'p-1' : 'p-2'}`}>
            <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
                {user.user_metadata?.avatar_url ? (
                    <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="h-8 w-8 shrink-0 rounded-full border border-studio-700 bg-studio-900 object-cover"
                    />
                ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-studio-700 bg-studio-900 text-zinc-400">
                        <UserIcon size={16} />
                    </div>
                )}

                {!isCollapsed && (
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-semibold text-studio-cream">
                            {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                        </span>
                        <span className="truncate text-[10px] text-zinc-500">
                            {user.email}
                        </span>
                    </div>
                )}

                {!isCollapsed && (
                    <button
                        onClick={handleSignOut}
                        className="shrink-0 rounded-lg border border-transparent p-1 text-zinc-500 transition hover:border-studio-700 hover:bg-studio-900 hover:text-studio-cream"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>
                )}
            </div>

            {isCollapsed && (
                <button
                    onClick={handleSignOut}
                    className="mt-2 flex w-full items-center justify-center rounded-lg border border-transparent p-1 text-zinc-500 transition hover:border-studio-700 hover:bg-studio-900 hover:text-studio-cream"
                    title="Sign out"
                >
                    <LogOut size={14} />
                </button>
            )}
        </div>
    );
}
