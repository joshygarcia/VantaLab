'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Sparkles, Layers, Fingerprint, Cpu, Search, Activity, Box, Plus, Network, User, Image as ImageIcon, FileText, Video, Play, Film, Bot, Zap, Globe, Triangle, Hexagon, CircleDashed, ChevronLeft, ChevronRight, Check, X, Command, Cloud, Star, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from '@/components/auth/AuthModal';
import type { User as SupabaseUser } from '@supabase/supabase-js';

gsap.registerPlugin(useGSAP);

export default function SaaSLandingPage() {
    const container = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const supabase = createClient();

    // Check auth state on mount
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const handleGetStarted = useCallback(() => {
        if (user) {
            router.push('/dashboard');
        } else {
            setAuthModalOpen(true);
        }
    }, [user, router]);

    // GSAP Fade-In Animations
    useGSAP(() => {
        gsap.from('.stagger-fade', {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            delay: 0.1
        });

        // Spaces Data Flow Sequence
        const tl = gsap.timeline({ repeat: -1, delay: 0.5 });

        // Reset state
        gsap.set('.pulse-dot-1, .pulse-dot-2', { opacity: 0, offsetDistance: "0%" });

        // Node 1 (Input) -> Node 2 (Render)
        tl.to('.node-1', { borderColor: 'rgba(99,102,241,0.8)', boxShadow: '0 0 30px rgba(99,102,241,0.2)', duration: 0.3 })
            .to('.path-1', { stroke: 'rgba(99,102,241,0.5)', duration: 0.3 }, '<')
            .to('.pulse-dot-1', { opacity: 1, duration: 0.2 }, '<')
            .to('.pulse-dot-1', { offsetDistance: "100%", duration: 1.2, ease: "power2.inOut" })
            .to('.pulse-dot-1', { opacity: 0, duration: 0.2 })

            // Node 2 (Render) -> Node 3 (Output)
            .to('.node-1', { borderColor: 'rgba(255,255,255,0.1)', boxShadow: 'none', duration: 0.4 }, '<')
            .to('.path-1', { stroke: 'rgba(255,255,255,0.1)', duration: 0.4 }, '<')
            .to('.node-2', { borderColor: 'rgba(16,185,129,0.8)', boxShadow: '0 0 30px rgba(16,185,129,0.2)', duration: 0.3 }, '<')
            .to('.path-2', { stroke: 'rgba(16,185,129,0.5)', duration: 0.3 }, '<')
            .to('.pulse-dot-2', { opacity: 1, duration: 0.2 }, '<')
            .to('.pulse-dot-2', { offsetDistance: "100%", duration: 1.5, ease: "power2.inOut" })
            .to('.pulse-dot-2', { opacity: 0, duration: 0.2 })

            // Node 3 (Output Playing)
            .to('.node-2', { borderColor: 'rgba(255,255,255,0.1)', boxShadow: 'none', duration: 0.4 }, '<')
            .to('.path-2', { stroke: 'rgba(255,255,255,0.1)', duration: 0.4 }, '<')
            .to('.node-3', { borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0 0 40px rgba(255,255,255,0.15)', duration: 0.3 }, '<')
            .to('.video-progress-bar', { width: "100%", duration: 2.5, ease: "linear" })

            // Reset everything for next loop
            .to('.node-3', { borderColor: 'rgba(255,255,255,0.1)', boxShadow: 'none', duration: 0.5 })
            .set('.video-progress-bar', { width: "0%" });

        // Video Simulation Pan Animation
        gsap.to('.animate-pan-video', {
            x: "-5%",
            y: "-5%",
            scale: 1.05,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            duration: 6
        });

    }, { scope: container });

    return (
        <div ref={container} className="relative min-h-screen bg-[#050505] text-[#FAF8F5] selection:bg-white/20 selection:text-white font-body selection:rounded-md antialiased overflow-x-hidden">

            {/* A) Minimalist Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-md bg-[#050505]/60 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <img src="/branding/vl_monogram.svg" alt="Vanta Lab" className="h-5 w-5 invert" />
                    <span className="font-display text-xl font-bold tracking-tight text-[#FAF8F5]">Vanta Lab</span>
                    <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                    <span className="text-xs font-mono text-white/40 hidden md:block uppercase tracking-widest">Vanta Lab</span>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="#pricing" className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block">Pricing</Link>
                    <button
                        onClick={handleGetStarted}
                        className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#FAF8F5] transition-all hover:bg-white/10 hover:border-white/20"
                    >
                        <span>{user ? 'Dashboard' : 'Get Started'}</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>
            </nav>

            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[20%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
            <div className="absolute top-[20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-[#C9A84C]/5 blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-40 px-6 md:px-12 lg:px-24 mx-auto max-w-[1400px]">

                {/* B) Clean Hero Section */}
                <section className="flex flex-col items-center justify-center text-center pb-32">
                    <div className="stagger-fade mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
                        <Sparkles className="h-3 w-3 text-[#C9A84C]" />
                        <span>Engine v2.0 is now live</span>
                    </div>

                    <h1 className="stagger-fade mb-6 max-w-4xl text-5xl font-semibold tracking-tight text-[#FAF8F5] md:text-7xl lg:text-8xl leading-[1.05]">
                        The precise environment for <span className="text-white/40">AI asset generation.</span>
                    </h1>

                    <p className="stagger-fade mb-10 max-w-2xl text-lg text-white/50 md:text-xl font-light leading-relaxed">
                        Zero friction workspaces. Absolute control over your digital personas. Designed for high-density, pro-tier workflows without the visual noise.
                    </p>

                    <div className="stagger-fade flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleGetStarted}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FAF8F5] px-8 py-3.5 text-sm font-semibold text-[#050505] transition-all hover:bg-white/90 hover:scale-[1.02]"
                        >
                            Start Creating
                        </button>
                        <Link
                            href="#features"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-[#FAF8F5] transition-all hover:bg-white/10"
                        >
                            Explore Architecture
                        </Link>
                    </div>

                    {/* Spaces Showcase Mockup */}
                    <div className="stagger-fade mt-24 w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0A0A0C] p-2 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 transition-opacity duration-1000 group-hover:opacity-100 pointer-events-none"></div>
                        <div className="h-[480px] w-full rounded-xl border border-white/5 bg-[#0D0D10] flex flex-col overflow-hidden relative">
                            {/* Mock Window Header */}
                            <div className="border-b border-white/5 p-4 flex items-center justify-between bg-[#0A0A0C]/80 backdrop-blur z-20 absolute top-0 left-0 right-0">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-white/10"></div>
                                    <div className="w-3 h-3 rounded-full bg-white/10"></div>
                                    <div className="w-3 h-3 rounded-full bg-white/10"></div>
                                </div>
                                <div className="text-xs font-mono text-white/40 tracking-wider">SPACE: KINETIC_RENDER_PIPELINE</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[10px] text-emerald-500 font-mono tracking-widest uppercase">Running</span>
                                    </div>
                                </div>
                            </div>

                            {/* Canvas Area */}
                            <div className="flex-1 relative overflow-hidden mt-14 bg-[#0A0A0D]">
                                {/* Grid Background */}
                                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <pattern id="spacesGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                                            <circle cx="40" cy="40" r="1" fill="currentColor" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#spacesGrid)" />
                                </svg>

                                {/* Scrollable Inner Canvas to Support 1024px Width */}
                                <div className="absolute inset-0 overflow-x-auto overflow-y-hidden custom-scrollbar">
                                    <div className="w-[1024px] h-full relative group/canvas">

                                        {/* Connecting Lines (SVG) */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                                            {/* Node 1 -> 2 */}
                                            <path className="path-1" d="M 280 210 L 400 210" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                                            {/* Node 2 -> 3 */}
                                            <path className="path-2" d="M 600 210 L 700 210" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />

                                            {/* Animated Pulses */}
                                            <circle className="pulse-dot-1" cx="0" cy="0" r="4" fill="#6366f1" style={{ offsetPath: "path('M 280 210 L 400 210')", opacity: 0 }} />
                                            <circle className="pulse-dot-2" cx="0" cy="0" r="4" fill="#10b981" style={{ offsetPath: "path('M 600 210 L 700 210')", opacity: 0 }} />
                                        </svg>

                                        {/* Node A: Persona Element */}
                                        <div className="node-1 absolute top-[160px] left-[100px] w-[180px] rounded-xl border border-white/10 bg-[#121215]/90 backdrop-blur p-3 shadow-lg z-10 transition-transform hover:scale-105 cursor-default">
                                            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                                                <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-semibold text-white/80">Element Input</span>
                                            </div>
                                            <div className="flex gap-3 bg-[#0A0A0C] border border-white/5 rounded-md p-2">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop" alt="Synthia" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="text-[10px] text-white/60">
                                                    ID: Synthia_01
                                                    <br />
                                                    <span className="text-white/30 truncate block mt-0.5">Base traits loaded</span>
                                                </div>
                                            </div>
                                            <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#121215] border border-white/10 flex items-center justify-center -translate-y-1/2 z-20">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500/50"></div>
                                            </div>
                                        </div>

                                        {/* Node C: Base Image Render */}
                                        <div className="node-2 absolute top-[130px] left-[400px] w-[200px] rounded-xl border border-white/10 bg-[#121215]/90 backdrop-blur p-3 shadow-lg z-10 transition-transform hover:scale-105 cursor-default overflow-hidden">
                                            <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-[#121215] border border-white/10 flex items-center justify-center -translate-y-1/2 z-20">
                                                <div className="w-2 h-2 rounded-full bg-white/30"></div>
                                            </div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-500">
                                                        <Box className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-white/80">Base Render</span>
                                                </div>
                                            </div>
                                            <div className="relative w-full h-24 rounded-lg border border-white/5 overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0c]/80 via-transparent to-transparent z-10"></div>
                                                <img src="https://images.unsplash.com/photo-1604004555489-723a93d6ce74?q=80&w=500&auto=format&fit=crop" className="w-full h-full object-cover opacity-80" alt="Generated Scene" />
                                                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[8px] font-mono text-emerald-400 border border-white/10 z-20">LOCKED</div>
                                            </div>
                                            <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#121215] border border-white/10 flex items-center justify-center -translate-y-1/2 z-20">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                                            </div>
                                        </div>

                                        {/* Node F: Final Cinematic Output */}
                                        <div className="node-3 absolute top-[110px] left-[700px] w-[220px] rounded-xl border border-white/10 bg-[#121215]/90 backdrop-blur p-3 shadow-2xl z-10 transition-transform hover:scale-105 cursor-default overflow-hidden group/video">
                                            <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-[#121215] border border-white/10 flex items-center justify-center -translate-y-1/2 z-20">
                                                <div className="w-2 h-2 rounded-full bg-white/30"></div>
                                            </div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-white/10 text-white">
                                                        <Film className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-white/80">Cinematic Sequence</span>
                                                </div>
                                                <span className="text-[9px] font-mono text-white/40 border border-white/10 px-1.5 py-0.5 rounded-md">mp4</span>
                                            </div>
                                            <div className="relative w-full h-28 rounded-lg border border-white/10 bg-[#0A0A0C] mt-2 overflow-hidden flex items-center justify-center group/play">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0c]/80 via-transparent to-transparent z-10 pointer-events-none"></div>
                                                <img src="https://images.unsplash.com/photo-1604004555489-723a93d6ce74?q=80&w=1000&auto=format&fit=crop" className="animate-pan-video absolute inset-0 w-[120%] h-[120%] max-w-none object-cover opacity-80" alt="Video Output" />
                                                <button className="relative z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center group-hover/play:bg-white/30 transition-colors">
                                                    <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                                                </button>
                                                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center z-20">
                                                    <div className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden mr-2">
                                                        <div className="video-progress-bar h-full w-0 bg-white rounded-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* AI Models Marquee */}
                <section className="stagger-fade py-16 border-t border-white/5 relative overflow-hidden flex flex-col items-center">
                    <div className="text-center mb-10 w-full z-20">
                        <span className="text-sm font-medium text-white/50">Powered by the latest AI image, video, and text models.</span>
                    </div>

                    {/* Gradient Masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-32 md:w-64 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-32 md:w-64 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>

                    {/* Row 1 */}
                    <div className="flex overflow-hidden w-full group cursor-default">
                        <div className="flex animate-[scroll_45s_linear_infinite] group-hover:[animation-play-state:paused] w-max shrink-0">
                            {[1, 2, 3].map((set) => (
                                <div key={`row1-${set}`} className="flex shrink-0 items-center gap-12 pr-12">
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Bot className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Google Imagen</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Globe className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Google Nano Banana</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Sparkles className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">ChatGPT</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Hexagon className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Ideogram</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Triangle className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Mystic</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Wand2 className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Runway Gen-3</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Cpu className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Luma Dream Machine</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex animate-[scroll_45s_linear_infinite] group-hover:[animation-play-state:paused] w-max shrink-0" aria-hidden="true">
                            {[1, 2, 3].map((set) => (
                                <div key={`row1-clone-${set}`} className="flex shrink-0 items-center gap-12 pr-12">
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Bot className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Google Imagen</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Globe className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Google Nano Banana</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Sparkles className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">ChatGPT</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Hexagon className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Ideogram</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Triangle className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Mystic</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Wand2 className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Runway Gen-3</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Cpu className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Luma Dream Machine</span></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 2 (Reverse) */}
                    <div className="mt-8 flex overflow-hidden w-full group cursor-default">
                        <div className="flex animate-[scroll-reverse_55s_linear_infinite] group-hover:[animation-play-state:paused] w-max shrink-0">
                            {[1, 2, 3].map((set) => (
                                <div key={`row2-${set}`} className="flex shrink-0 items-center gap-12 pr-12">
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Video className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Kling 3.0</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Zap className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Google Veo 3.1</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Layers className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Midjourney</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Box className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Stable Diffusion 3</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Command className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Flux.1 Pro</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Cloud className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Pika Labs</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Star className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Claude 3.5 Sonnet</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex animate-[scroll-reverse_55s_linear_infinite] group-hover:[animation-play-state:paused] w-max shrink-0" aria-hidden="true">
                            {[1, 2, 3].map((set) => (
                                <div key={`row2-clone-${set}`} className="flex shrink-0 items-center gap-12 pr-12">
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Video className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Kling 3.0</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Zap className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Google Veo 3.1</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Layers className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Midjourney</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Box className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Stable Diffusion 3</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Command className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Flux.1 Pro</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Cloud className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Pika Labs</span></div>
                                    <div className="flex shrink-0 items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"><Star className="w-5 h-5 shrink-0" /><span className="text-base font-semibold tracking-tight whitespace-nowrap">Claude 3.5 Sonnet</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Templates Carousel */}
                <section className="stagger-fade py-24 border-t border-white/5 relative w-full overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div className="max-w-xl">
                            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl mb-3">Production-ready templates</h2>
                            <p className="text-white/50 text-base font-light leading-relaxed">
                                Professional-grade logic workflows designed for real use cases. Start from any template and add your personas and prompts to make it yours.
                            </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Container */}
                    <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory custom-scrollbar relative -mx-6 px-6 md:-mx-12 md:px-12 lg:-mx-24 lg:px-24">
                        {/* Template 1 */}
                        <div className="shrink-0 w-[280px] md:w-[320px] snap-center group cursor-pointer">
                            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A0A0C] border border-white/10 mb-4 relative">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10 duration-500"></div>
                                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop" alt="Persona Training" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90" />
                            </div>
                            <h3 className="text-base font-medium text-white/90 group-hover:text-white transition-colors">Consistent Persona Training</h3>
                        </div>

                        {/* Template 2 */}
                        <div className="shrink-0 w-[280px] md:w-[320px] snap-center group cursor-pointer">
                            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A0A0C] border border-white/10 mb-4 relative">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10 duration-500"></div>
                                <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=600&auto=format&fit=crop" alt="AI Influencer Photoshoot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90" />
                            </div>
                            <h3 className="text-base font-medium text-white/90 group-hover:text-white transition-colors">AI Influencer Photoshoot</h3>
                        </div>

                        {/* Template 3 */}
                        <div className="shrink-0 w-[280px] md:w-[320px] snap-center group cursor-pointer">
                            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A0A0C] border border-white/10 mb-4 relative">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10 duration-500"></div>
                                <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop" alt="UGC Influencer Ads" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90" />
                            </div>
                            <h3 className="text-base font-medium text-white/90 group-hover:text-white transition-colors">UGC Influencer Ads</h3>
                        </div>

                        {/* Template 4 */}
                        <div className="shrink-0 w-[280px] md:w-[320px] snap-center group cursor-pointer">
                            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A0A0C] border border-white/10 mb-4 relative">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10 duration-500"></div>
                                <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop" alt="Video Motion Control" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-90" />
                            </div>
                            <h3 className="text-base font-medium text-white/90 group-hover:text-white transition-colors">Video Motion Control</h3>
                        </div>

                        {/* Template 5 */}
                        <div className="shrink-0 w-[280px] md:w-[320px] snap-center group cursor-pointer">
                            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#0A0A0C] border border-white/10 mb-4 relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent z-10"></div>
                                <Plus className="w-8 h-8 text-white/20 group-hover:scale-125 transition-transform duration-500" strokeWidth={1} />
                            </div>
                            <h3 className="text-base font-medium text-white/50 group-hover:text-white/80 transition-colors">And more coming soon...</h3>
                        </div>
                    </div>
                </section>

                {/* C) Bento Box Feature Grid */}
                <section id="features" className="py-24 border-t border-white/5">
                    <div className="stagger-fade mb-16 max-w-2xl">
                        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl mb-4">Engineered for focus.</h2>
                        <p className="text-white/50 text-lg font-light leading-relaxed">We stripped away the complexity, leaving only the tools required to bring your digital personas to life.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">

                        {/* 1. Distraction-Free Creation */}
                        <div className="stagger-fade col-span-1 md:col-span-2 rounded-3xl border border-white/10 bg-[#0A0A0D] p-8 flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-20 transition-opacity group-hover:opacity-40">
                                <Search className="w-32 h-32" strokeWidth={1} />
                            </div>
                            <div className="z-10 bg-white/5 border border-white/10 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-8">
                                <Layers className="text-[#C9A84C] w-5 h-5" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-2xl font-semibold mb-3">Distraction-Free Creation</h3>
                                <p className="text-white/50 leading-relaxed max-w-md">A streamlined, high-contrast lab environment optimized for rapid element and character generation without visual noise.</p>
                            </div>
                        </div>

                        {/* 2. Pro-Tier Workflows */}
                        <div className="stagger-fade col-span-1 rounded-3xl border border-white/10 bg-[#0A0A0D] p-8 flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_50%)]"></div>
                            <div className="z-10 bg-white/5 border border-white/10 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-8">
                                <Activity className="text-white w-5 h-5" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-xl font-semibold mb-3">Pro-Tier Workflows</h3>
                                <p className="text-white/50 leading-relaxed text-sm">Engineered for action-oriented production with zero interface lag.</p>
                            </div>
                        </div>

                        {/* 3. Logic Routing */}
                        <div className="stagger-fade col-span-1 rounded-3xl border border-white/10 bg-[#0A0A0D] p-8 flex flex-col justify-between overflow-hidden group">
                            <div className="z-10 bg-white/5 border border-white/10 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-8">
                                <Network className="text-white w-5 h-5" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-xl font-semibold mb-3">Modular Logic</h3>
                                <p className="text-white/50 leading-relaxed text-sm">Connect elements securely with intuitive node-based logic architecture.</p>
                            </div>
                        </div>

                        {/* 4. Frictionless Management */}
                        <div className="stagger-fade col-span-1 md:col-span-2 rounded-3xl border border-white/10 bg-[#0A0A0D] p-8 flex flex-col justify-between overflow-hidden relative group">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="z-10 bg-white/5 border border-white/10 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-8">
                                <Fingerprint className="text-[#C9A84C] w-5 h-5" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-2xl font-semibold mb-3">Frictionless Management</h3>
                                <p className="text-white/50 leading-relaxed max-w-md">A meticulously organized library to effectively manage custom spaces, logic templates, and reference media continuously.</p>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 border-t border-white/5 bg-[#050505]">
                    <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative flex flex-col items-center">
                        <div className="text-center mb-12">
                            <h2 className="stagger-fade text-4xl font-semibold tracking-tight md:text-5xl mb-4">Pay as you generate</h2>
                            <p className="stagger-fade text-lg text-white/50 max-w-2xl mx-auto text-balance">
                                No recurring subscriptions. Buy credits when you need them.<br className="hidden md:block" /> Unused credits never expire.
                            </p>
                        </div>

                        {/* Pricing Grid */}
                        <div className="stagger-fade grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-[1000px]">
                            {/* Starter Pack */}
                            <div className="rounded-2xl border border-white/5 bg-[#0A0A0C] p-6 flex flex-col relative transition-transform hover:scale-[1.02]">
                                <h3 className="text-xl font-semibold mb-1">Starter</h3>
                                <p className="text-xs text-white/50 mb-6">Dip your toes into AI generation</p>
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold">$5</span>
                                    </div>
                                    <div className="text-[10px] text-white/40 mt-1">One-time payment</div>
                                </div>
                                <button className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-sm mb-6 hover:bg-white/90 transition-colors">Buy Starter Pack</button>
                                <div className="bg-white/5 rounded-xl p-3 mb-6 border border-white/5">
                                    <div className="text-xs font-medium text-white/90">500 Credits</div>
                                    <div className="text-[10px] text-white/50 mt-1">$0.010 per credit</div>
                                </div>
                                <ul className="space-y-3 text-xs text-white/70">
                                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Access to all image, video models</span></li>
                                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Unlimited concurrent generations</span></li>
                                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Credits never expire</span></li>
                                </ul>
                            </div>

                            {/* Creator Pack */}
                            <div className="rounded-2xl border border-white/5 bg-[#0A0A0C] p-6 flex flex-col relative transition-transform hover:scale-[1.02]">
                                <h3 className="text-xl font-semibold mb-1">Creator</h3>
                                <p className="text-xs text-white/50 mb-6">For regular content production</p>
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold">$10</span>
                                    </div>
                                    <div className="text-[10px] text-white/40 mt-1">One-time payment</div>
                                </div>
                                <button className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-sm mb-6 hover:bg-white/90 transition-colors">Buy Creator Pack</button>
                                <div className="bg-white/5 rounded-xl p-3 mb-6 border border-white/5">
                                    <div className="text-xs font-medium text-white/90">1,000 Credits</div>
                                    <div className="text-[10px] text-white/50 mt-1">$0.010 per credit</div>
                                </div>
                                <ul className="space-y-3 text-xs text-white/70">
                                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Access to all image, video models</span></li>
                                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Unlimited concurrent generations</span></li>
                                    <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Credits never expire</span></li>
                                </ul>
                            </div>

                            {/* Pro Pack (Best Value) */}
                            <div className="rounded-2xl border-2 border-[#3b82f6] bg-[#0A0A0C] flex flex-col relative transition-transform hover:scale-[1.02] lg:-mt-4 shadow-[0_0_30px_rgba(59,130,246,0.15)] z-10 w-full overflow-hidden">
                                <div className="bg-[#3b82f6] text-white text-[10px] font-bold text-center py-1.5 uppercase tracking-wider w-full">Best Value</div>
                                <div className="p-6 pt-5 flex flex-col flex-1">
                                    <h3 className="text-xl font-semibold mb-1">Pro</h3>
                                    <p className="text-xs text-white/50 mb-6">For power users and small teams</p>
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold">$50</span>
                                        </div>
                                        <div className="text-[10px] text-white/40 mt-1">One-time payment</div>
                                    </div>
                                    <button className="w-full py-2.5 rounded-full bg-[#3b82f6] text-white font-semibold text-sm mb-6 hover:bg-blue-600 transition-colors">Buy Pro Pack</button>
                                    <div className="bg-white/5 rounded-xl p-3 mb-6 border border-[#3b82f6]/30">
                                        <div className="text-xs font-medium text-white/90">5,500 Credits</div>
                                        <div className="text-[10px] text-emerald-400 mt-1">Save 9% vs Starter</div>
                                    </div>
                                    <ul className="space-y-3 text-xs text-white/70">
                                        <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Access to all image, video models</span></li>
                                        <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Unlimited concurrent generations</span></li>
                                        <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Credits never expire</span></li>
                                    </ul>
                                </div>
                            </div>

                            {/* Studio Pack (Expert Choice) */}
                            <div className="rounded-2xl border-2 border-purple-500/50 bg-[#0A0A0C] flex flex-col relative transition-transform hover:scale-[1.02] lg:-mt-4 shadow-[0_0_30px_rgba(168,85,247,0.1)] z-10 w-full overflow-hidden">
                                <div className="bg-purple-500 text-white text-[10px] font-bold text-center py-1.5 uppercase tracking-wider w-full">Studio Scale</div>
                                <div className="p-6 pt-5 flex flex-col flex-1">
                                    <h3 className="text-xl font-semibold mb-1">Studio</h3>
                                    <p className="text-xs text-white/50 mb-6">For high-volume productions</p>
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold">$100</span>
                                        </div>
                                        <div className="text-[10px] text-white/40 mt-1">One-time payment</div>
                                    </div>
                                    <button className="w-full py-2.5 rounded-full bg-purple-500 text-white font-semibold text-sm mb-6 hover:bg-purple-600 transition-colors">Buy Studio Pack</button>
                                    <div className="bg-white/5 rounded-xl p-3 mb-6 border border-purple-500/30">
                                        <div className="text-xs font-medium text-white/90">11,500 Credits</div>
                                        <div className="text-[10px] text-emerald-400 mt-1">Save 13% vs Starter</div>
                                    </div>
                                    <ul className="space-y-3 text-xs text-white/70">
                                        <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Access to all image, video models</span></li>
                                        <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Unlimited concurrent generations</span></li>
                                        <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" /><span>Credits never expire</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* D) Direct Call to Action */}
                <section className="stagger-fade py-32 border-t border-white/5 flex flex-col justify-center text-center">
                    <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-8">Ready to Create?</h2>
                    <div className="flex justify-center">
                        <Link
                            href="/dashboard"
                            className="group relative inline-flex items-center justify-center gap-3 rounded-xl bg-[#FAF8F5] px-10 py-4 text-base font-semibold text-[#050505] transition-all hover:bg-white hover:scale-[1.02]"
                        >
                            <span>Enter the Studio</span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </section>

            </main>

            {/* E) Minimalist Footer */}
            <footer className="border-t border-white/5 bg-[#030303]">
                <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <img src="/branding/vl_monogram.svg" alt="Vanta Lab" className="h-5 w-5 invert" />
                        <span className="font-display text-xl font-bold tracking-tight text-[#FAF8F5]">Vanta Lab</span>
                        <span className="text-xs text-white/40">&copy; {new Date().getFullYear()}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <a href="#" className="text-xs font-medium text-white/40 hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="text-xs font-medium text-white/40 hover:text-white transition-colors">GitHub</a>
                        <a href="#" className="text-xs font-medium text-white/40 hover:text-white transition-colors">Documentation</a>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="font-mono text-[9px] font-medium tracking-widest text-emerald-500 uppercase">All Systems Normal</span>
                    </div>
                </div>
            </footer>

            {/* Auth Modal */}
            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </div>
    );
}
