'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, ArrowUpRight, Aperture } from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LandingVariantFour() {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Continuous organic rotation for prismatic blobs
        gsap.to('.blob-1', {
            rotation: 360,
            duration: 20,
            ease: "none",
            repeat: -1,
            transformOrigin: "center center"
        });
        gsap.to('.blob-2', {
            rotation: -360,
            duration: 25,
            ease: "none",
            repeat: -1,
            transformOrigin: "center center"
        });

        // Hero appearance
        gsap.from('.glass-card', {
            y: 100,
            opacity: 0,
            duration: 1.5,
            stagger: 0.2,
            ease: "elastic.out(1, 0.7)",
            delay: 0.2
        });

        // Text scramble/glitch effect on load
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        const title = container.current?.querySelector('.glitch-title');

        if (title) {
            const originalText = "Vanta Lab";
            let iterations = 0;

            const interval = setInterval(() => {
                title.textContent = originalText.split("").map((letter, index) => {
                    if (index < iterations) {
                        return originalText[index];
                    }
                    return letters[Math.floor(Math.random() * letters.length)]
                }).join("");

                if (iterations >= originalText.length) {
                    clearInterval(interval);
                }
                iterations += 1 / 3;
            }, 30);
        }

    }, { scope: container });

    return (
        <div ref={container} className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-fuchsia-500/50">

            {/* Prismatic Blobs using complex conic gradients and blur */}
            <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] blob-1 mix-blend-screen opacity-60 pointer-events-none"
                style={{
                    background: 'conic-gradient(from 0deg, #ff00ff, #00ffff, #ff00ff)',
                    filter: 'blur(100px)',
                    borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%'
                }}>
            </div>

            <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] blob-2 mix-blend-screen opacity-50 pointer-events-none"
                style={{
                    background: 'conic-gradient(from 180deg, #ff3366, #ff9933, #ff3366)',
                    filter: 'blur(120px)',
                    borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%'
                }}>
            </div>

            {/* Dotted noise texture overlay */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            <nav className="relative z-50 w-full px-8 py-6 flex justify-between items-center">
                <div className="font-bold text-2xl tracking-tighter mix-blend-difference glitch-title">Vanta Lab</div>
                <div className="flex gap-4">
                    <button className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 backdrop-blur-md transition-colors text-sm font-medium">Docs</button>
                    <button className="px-6 py-2 rounded-full bg-white text-black hover:scale-105 transition-transform text-sm font-medium">Launch</button>
                </div>
            </nav>

            <main className="relative z-10 w-full max-w-7xl mx-auto pt-20 px-6 pb-32 flex flex-col items-center">

                {/* Massive glass hero card */}
                <section className="glass-card w-full max-w-5xl rounded-[3rem] p-12 md:p-24 bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(255,255,255,0.05),inset_0_0_20px_rgba(255,255,255,0.05)] text-center relative overflow-hidden group">

                    {/* Inner glowing core that reacts to hover */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/20 rounded-full blur-3xl group-hover:w-64 group-hover:h-64 transition-all duration-700"></div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 mx-auto text-sm font-medium">
                        <Aperture className="w-4 h-4 text-fuchsia-400" />
                        <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Node-Based Intelligence</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 mix-blend-overlay">
                        BEYOND <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">LINEAR</span> <br />
                        CREATION.
                    </h1>

                    <p className="text-xl md:text-2xl text-white/60 font-medium max-w-2xl mx-auto leading-relaxed mb-12">
                        Wire together the world's most advanced generative models in a spatial, iridescent workflow.
                    </p>

                    <button className="group relative inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full text-lg font-bold overflow-hidden">
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-fuchsia-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <span className="mr-2">Start Generating</span>
                        <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </section>

                {/* Floating feature glass cards */}
                <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="glass-card rounded-3xl p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-transparent border border-fuchsia-500/50 flex items-center justify-center mb-6">
                            <Sparkles className="w-5 h-5 text-fuchsia-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Model Agnostic</h3>
                        <p className="text-white/50">Flux, Stable Diffusion, Kling, Midjourney. Route latency seamlessly between distinct topologies.</p>
                    </div>

                    <div className="glass-card rounded-3xl p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent border border-cyan-500/50 flex items-center justify-center mb-6">
                            <Sparkles className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Infinite Canvas</h3>
                        <p className="text-white/50">Zoom out to see the entire generative city. Zoom in to tune the exact noise schedule of a single node.</p>
                    </div>

                    <div className="glass-card rounded-3xl p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] justify-between flex flex-col">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">Pay per compute.</h3>
                            <p className="text-white/50 mb-6">No subscriptions. No artificial limits.</p>
                        </div>
                        <div className="w-full bg-white/10 rounded-xl p-4 border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/20 transition-colors">
                            <span className="font-bold">Add Credits</span>
                            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}
