"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from 'next/navigation';
import { ChevronDown, LogIn, LogOut, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export function UserButton({ isCollapsed, variant = 'sidebar' }: { isCollapsed?: boolean; variant?: 'sidebar' | 'topbar' }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
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

    useEffect(() => {
        if (variant !== 'topbar' || !menuOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [menuOpen, variant]);

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
        setMenuOpen(false);
        router.push('/');
        router.refresh();
    };

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const initial = displayName.trim().charAt(0).toUpperCase() || 'U';

    if (loading) {
        if (variant === 'topbar') {
            return <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />;
        }

        return (
            <div className={`mb-3 rounded-xl border border-studio-700 bg-studio-850/90 p-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <div className="h-8 w-8 animate-pulse rounded-full bg-studio-700/70" />
            </div>
        );
    }

    if (!user) {
        if (variant === 'topbar') {
            return (
                <button
                    onClick={handleSignIn}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
                    title="Sign in with Google"
                >
                    <LogIn size={14} />
                    <span>Sign in</span>
                </button>
            );
        }

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

    if (variant === 'topbar') {
        return (
            <div ref={menuRef} className="relative">
                <button
                    type="button"
                    onClick={() => setMenuOpen((current) => !current)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                    aria-label="User menu"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                >
                    {user.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="h-7 w-7 rounded-full object-cover"
                        />
                    ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-xs">
                            {initial}
                        </span>
                    )}
                    <span className="hidden max-w-[120px] truncate text-xs md:block">{displayName}</span>
                    <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#12161d]/95 p-2 shadow-[0_22px_50px_rgba(0,0,0,0.45)] backdrop-blur-md">
                        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="Avatar"
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-sm font-semibold text-white">
                                    {initial}
                                </span>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                                <p className="truncate text-xs text-zinc-400">{user.email}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
                            title="Sign out"
                        >
                            <LogOut size={15} />
                            <span>Sign out</span>
                        </button>
                    </div>
                ) : null}
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
