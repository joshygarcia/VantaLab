'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SlidersHorizontal, Settings2, Power, Layers } from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LandingVariantTwo() {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Master power-on sequence
        const tl = gsap.timeline();

        gsap.set('.crt-overlay', { opacity: 0.8 });

        tl.to('.crt-overlay', {
            opacity: 0.05,
            duration: 0.5,
            ease: "power2.inOut",
            yoyo: true,
            repeat: 3
        })
            .from('.hardware-panel', {
                y: 50,
                opacity: 0,
                duration: 1.2,
                stagger: 0.1,
                ease: "back.out(1.2)"
            }, "-=0.5")
            .from('.led-indicator', {
                backgroundColor: "#2a2a2a",
                boxShadow: "0 0 0px #2a2a2a",
                duration: 0.1,
                stagger: 0.05
            }, "-=0.8");

        // Fader animations on scroll
        const faders = gsap.utils.toArray('.fader-track');
        faders.forEach((track: any) => {
            const knob = track.querySelector('.fader-knob');
            const fill = track.querySelector('.fader-fill');

            gsap.to([knob, fill], {
                y: () => -(track.clientHeight - 40), // Move up the track
                height: () => track.clientHeight, // Fill the track
                ease: "none",
                scrollTrigger: {
                    trigger: track,
                    start: "top bottom",
                    end: "bottom center",
                    scrub: 1
                }
            });
        });

    }, { scope: container });

    return (
        <div ref={container} className="min-h-screen bg-[#1A1817] text-[#D8D4CF] font-mono relative overflow-x-hidden selection:bg-[#E26132] selection:text-white">

            {/* CRT Noise Overlay */}
            <div className="crt-overlay pointer-events-none fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>

            {/* Scanlines */}
            <div className="pointer-events-none fixed inset-0 z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"></div>

            {/* Top Navigation / Interface Header */}
            <nav className="fixed top-0 w-full bg-[#1F1C1B] border-b-2 border-[#2A2624] z-30 px-6 py-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="led-indicator w-2 h-2 rounded-full bg-[#E26132] shadow-[0_0_8px_#E26132]"></div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#E26132]">PWR</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="led-indicator w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]"></div>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8A847C]">SYNC</span>
                        </div>
                    </div>
                    <div className="h-8 w-1 bg-[#2A2624] rounded-full"></div>
                    <span className="text-xl font-bold tracking-tight text-[#E8E4DF] uppercase">Vanta Lab</span>
                </div>

                <div className="flex items-center gap-4 bg-[#141211] p-2 rounded border border-[#0A0909] inset-shadow-sm">
                    <span className="text-[10px] text-[#E26132] uppercase tracking-wider">Master Out</span>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="w-1.5 h-4 bg-[#2A2624] rounded-sm led-level"
                                style={{ backgroundColor: i > 4 ? (i === 6 ? '#EF4444' : '#E26132') : '#4ADE80', opacity: 0.3 + (i * 0.1) }}>
                            </div>
                        ))}
                    </div>
                </div>
            </nav>

            <main className="relative z-10 w-full max-w-[1400px] mx-auto pt-32 px-6 pb-24 flex flex-col gap-12">

                {/* Hero Panel */}
                <section className="hardware-panel w-full bg-[#24211F] rounded-xl border-t border-[#3A3532] border-x border-[#1A1817] border-b-4 border-b-[#0F0E0D] shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] p-8 relative overflow-hidden">

                    {/* Air vents design */}
                    <div className="absolute top-4 right-8 flex gap-2 opacity-30">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="w-1 h-12 bg-black rounded-full shadow-[inset_1px_0_1px_rgba(255,255,255,0.1)]"></div>
                        ))}
                    </div>

                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 bg-[#141211] border border-[#0A0909] px-3 py-1 rounded text-[#E26132] text-xs font-bold uppercase tracking-widest mb-8 shadow-inner">
                            <Settings2 className="w-4 h-4" />
                            <span>System 1.0</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-[#E8E4DF] leading-none mb-6 drop-shadow-md">
                            TACTILE <br />
                            <span className="text-[#8A847C]">GENERATION.</span>
                        </h1>

                        <p className="text-lg text-[#A39D95] font-medium leading-relaxed max-w-xl mb-12">
                            Dial in your prompts. Patch modules together. Route outputs to new inputs. We built Vanta Lab to feel like a high-end analog synthesizer for generative AI.
                        </p>

                        <div className="flex items-center gap-6">
                            {/* Big clunky hardware button */}
                            <button className="group relative bg-[#141211] w-48 h-16 rounded border-2 border-[#0A0909] shadow-[0_8px_0_#0F0E0D] active:shadow-[0_2px_0_#0F0E0D] active:translate-y-[6px] transition-all">
                                <div className="absolute inset-0 bg-gradient-to-b from-[#E26132] to-[#B03F12] border border-[#F48D68] m-[2px] rounded-sm flex items-center justify-center p-2 group-active:translate-y-0 group-active:from-[#B03F12] group-active:to-[#8E320D]">
                                    <span className="text-white font-bold tracking-widest uppercase text-sm drop-shadow-md">Start Patching</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Features: The Mixer Board */}
                <section className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Fader Channel 1 */}
                    <div className="hardware-panel bg-[#24211F] rounded-xl border-t border-[#3A3532] border-x border-[#1A1817] border-b-4 border-b-[#0F0E0D] p-6 flex flex-col items-center">
                        <div className="w-full bg-[#141211] border border-[#0A0909] p-2 text-center rounded text-[10px] uppercase font-bold text-[#8A847C] mb-8">
                            Channel 01: Connect
                        </div>

                        <div className="fader-track w-8 h-64 bg-[#141211] rounded-full border border-[#0A0909] relative flex justify-center shadow-inner mb-8">
                            {/* Tick marks */}
                            <div className="absolute left-[-10px] h-full flex flex-col justify-between py-4">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="w-2 h-[1px] bg-[#3A3532]"></div>)}
                            </div>

                            {/* Fader fill (animated via GSAP) */}
                            <div className="fader-fill absolute bottom-0 left-1 right-1 bg-gradient-to-t from-[#E26132]/20 to-[#E26132]/60 rounded-full h-0"></div>

                            {/* The physical knob */}
                            <div className="fader-knob absolute bottom-4 w-12 h-8 bg-[#3A3532] rounded shadow-[0_4px_4px_rgba(0,0,0,0.5),inset_0_2px_1px_rgba(255,255,255,0.2)] border-b-4 border-[#1A1817] cursor-pointer flex flex-col items-center justify-center gap-[2px]">
                                <div className="w-8 h-[2px] bg-white opacity-80"></div>
                                <div className="w-8 h-[2px] bg-black opacity-30"></div>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-[#E8E4DF] text-center mb-2">Model Routing</h3>
                        <p className="text-sm text-[#8A847C] text-center">Seamlessly pass latent data between distinct AI architectures.</p>
                    </div>

                    {/* Fader Channel 2 */}
                    <div className="hardware-panel bg-[#24211F] rounded-xl border-t border-[#3A3532] border-x border-[#1A1817] border-b-4 border-b-[#0F0E0D] p-6 flex flex-col items-center">
                        <div className="w-full bg-[#141211] border border-[#0A0909] p-2 text-center rounded text-[10px] uppercase font-bold text-[#E26132] mb-8 shadow-[inset_0_0_10px_rgba(226,97,50,0.2)]">
                            Channel 02: Control
                        </div>

                        <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 mb-8">
                            {/* Knobs */}
                            <div className="flex gap-6">
                                <div className="w-16 h-16 rounded-full bg-[#141211] relative shadow-inner border border-[#0A0909] flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-[#3A3532] shadow-[0_5px_10px_rgba(0,0,0,0.5),inset_0_2px_1px_rgba(255,255,255,0.1)] border-b-[3px] border-[#1A1817] relative transform rotate-45">
                                        <div className="absolute top-1 left-1/2 w-1 h-3 bg-white -translate-x-1/2 rounded-full"></div>
                                    </div>
                                    <div className="absolute -bottom-5 text-[9px] uppercase font-bold text-[#8A847C]">Lo-Freq</div>
                                </div>
                                <div className="w-16 h-16 rounded-full bg-[#141211] relative shadow-inner border border-[#0A0909] flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-[#3A3532] shadow-[0_5px_10px_rgba(0,0,0,0.5),inset_0_2px_1px_rgba(255,255,255,0.1)] border-b-[3px] border-[#1A1817] relative transform -rotate-12">
                                        <div className="absolute top-1 left-1/2 w-1 h-3 bg-[#E26132] -translate-x-1/2 rounded-full"></div>
                                    </div>
                                    <div className="absolute -bottom-5 text-[9px] uppercase font-bold text-[#8A847C]">Hi-Res</div>
                                </div>
                            </div>

                            <div className="w-full h-24 bg-[#141211] border border-[#0A0909] rounded shadow-inner p-2 relative overflow-hidden">
                                {/* Waveform mock */}
                                <div className="absolute inset-0 flex items-center justify-evenly px-2 gap-1 opacity-50">
                                    {[1, 3, 2, 5, 8, 4, 2, 6, 7, 3, 2, 1].map((h, i) => (
                                        <div key={i} className="w-2 bg-[#E26132] rounded-sm" style={{ height: `${h * 10}%` }}></div>
                                    ))}
                                </div>
                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white opacity-50"></div>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-[#E8E4DF] text-center mb-2">Absolute Precision</h3>
                        <p className="text-sm text-[#8A847C] text-center">Fine-tune seeds, denoise strength, and CFG scales with hardware-like latency.</p>
                    </div>

                    {/* Output Screen */}
                    <div className="hardware-panel bg-[#24211F] rounded-xl border-t border-[#3A3532] border-x border-[#1A1817] border-b-4 border-b-[#0F0E0D] p-6 lg:row-span-2">
                        <div className="w-full flex items-center justify-between bg-[#141211] border border-[#0A0909] p-2 rounded mb-4">
                            <span className="text-[10px] uppercase font-bold text-[#8A847C]">Display Mon</span>
                            <div className="led-indicator w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]"></div>
                        </div>

                        <div className="w-full aspect-square bg-[#0A0909] rounded-lg border-2 border-[#1A1817] shadow-inner relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] mix-blend-multiply z-10 pointer-events-none"></div>
                            <img src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=800" className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" alt="Output rendering" />
                            <div className="absolute top-4 left-4 z-20 bg-black/80 px-2 py-1 border border-white/10 text-[10px] font-bold tracking-widest text-[#E26132]">REC</div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex justify-between items-center text-xs font-bold text-[#8A847C] uppercase border-b border-[#3A3532] pb-2">
                                <span>Output</span>
                                <span className="text-[#E8E4DF]">1024x1024</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-[#8A847C] uppercase border-b border-[#3A3532] pb-2">
                                <span>Format</span>
                                <span className="text-[#E8E4DF]">ProRes 4444</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-[#8A847C] uppercase">
                                <span>Status</span>
                                <span className="text-[#4ADE80]">Rendering...</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
