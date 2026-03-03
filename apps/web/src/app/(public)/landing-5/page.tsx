'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Grip, Hexagon, Component, Cpu, CornerUpRight } from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LandingVariantFive() {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // Initial grid draw animation
        const tl = gsap.timeline();

        gsap.set('.grid-line-h', { scaleX: 0, transformOrigin: "left center" });
        gsap.set('.grid-line-v', { scaleY: 0, transformOrigin: "top center" });
        gsap.set('.content-fade', { opacity: 0, x: -20 });

        tl.to('.grid-line-h', {
            scaleX: 1,
            duration: 1,
            stagger: 0.1,
            ease: "expo.inOut"
        })
            .to('.grid-line-v', {
                scaleY: 1,
                duration: 1,
                stagger: 0.1,
                ease: "expo.inOut"
            }, "-=0.8")
            .to('.content-fade', {
                opacity: 1,
                x: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: "power2.out"
            }, "-=0.5");

        // Hover effects on blueprint blocks
        const blocks = gsap.utils.toArray('.blueprint-block');
        blocks.forEach((block: any) => {
            block.addEventListener('mouseenter', () => {
                gsap.to(block, { backgroundColor: 'rgba(0, 112, 243, 0.05)', duration: 0.3 });
                gsap.to(block.querySelector('.corner-accent'), { width: 16, height: 16, duration: 0.3, ease: 'back.out' });
            });
            block.addEventListener('mouseleave', () => {
                gsap.to(block, { backgroundColor: 'transparent', duration: 0.3 });
                gsap.to(block.querySelector('.corner-accent'), { width: 8, height: 8, duration: 0.3, ease: 'power2.inOut' });
            });
        });

    }, { scope: container });

    return (
        <div ref={container} className="min-h-screen bg-[#FAFAFA] text-[#111111] font-mono selection:bg-[#0070F3] selection:text-white relative overflow-x-hidden">

            {/* Background absolute grid (faint) */}
            <div className="fixed inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: 'linear-gradient(rgba(17,17,17,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}>
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto min-h-screen flex flex-col border-x border-[#111111]/20 pb-20">

                {/* Structural Top Nav */}
                <header className="w-full flex border-b border-[#111111]/20">
                    <div className="p-6 border-r border-[#111111]/20 flex items-center justify-center shrink-0 w-32 content-fade">
                        <Hexagon className="w-8 h-8 text-[#0070F3]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 flex flex-col justify-center px-8 border-r border-[#111111]/20 content-fade">
                        <h1 className="text-xl font-bold tracking-tight uppercase">Vanta Lab Architecture</h1>
                        <span className="text-xs text-[#111111]/50 uppercase tracking-widest mt-1">v.1.0 // System Build</span>
                    </div>
                    <div className="flex">
                        <div className="p-6 border-r border-[#111111]/20 flex items-center content-fade hover:bg-[#111111]/5 transition-colors cursor-pointer">
                            <span className="text-xs font-bold uppercase tracking-wider">Specs</span>
                        </div>
                        <div className="p-6 border-r border-[#111111]/20 flex items-center content-fade hover:bg-[#111111]/5 transition-colors cursor-pointer">
                            <span className="text-xs font-bold uppercase tracking-wider">Models</span>
                        </div>
                        <div className="p-6 flex items-center bg-[#111] text-white content-fade hover:bg-[#0070F3] transition-colors cursor-pointer">
                            <span className="text-xs font-bold uppercase tracking-wider">Initialize</span>
                            <CornerUpRight className="w-4 h-4 ml-2" />
                        </div>
                    </div>
                </header>

                {/* Hero Grid Section */}
                <div className="flex-1 flex flex-col lg:flex-row w-full">

                    {/* Left Column: Typography & Action */}
                    <div className="flex-[1.5] border-r border-[#111111]/20 flex flex-col relative">
                        {/* Internal grid lines */}
                        <div className="grid-line-h absolute top-1/2 left-0 right-0 h-px bg-[#111] opacity-10"></div>
                        <div className="grid-line-v absolute top-0 bottom-0 left-12 w-px bg-[#111] opacity-10"></div>

                        <div className="flex-1 p-12 lg:p-24 flex flex-col justify-center content-fade pl-24">
                            <div className="inline-flex items-center gap-2 text-[#0070F3] text-[10px] font-bold uppercase tracking-[0.2em] mb-12 border border-[#0070F3] px-3 py-1 bg-[#0070F3]/5">
                                <Cpu className="w-4 h-4" />
                                <span>Engine Status: Online</span>
                            </div>

                            <h2 className="text-6xl lg:text-[7rem] font-bold tracking-tighter leading-[0.85] mb-8 uppercase text-[#111]">
                                Construct <br />
                                The <span className="text-[#0070F3] block mt-2">Impossible.</span>
                            </h2>

                            <p className="text-lg text-[#111111]/60 max-w-lg mb-12 font-medium leading-relaxed">
                                A highly structured, deterministic node environment for generative AI. Route data physically. Connect distinct topologies. Compile imagination into pixels.
                            </p>

                            <div className="grid grid-cols-2 gap-px bg-[#111111]/20 border border-[#111111]/20 rounded-lg overflow-hidden w-fit">
                                <button className="bg-white px-8 py-4 text-xs font-bold uppercase tracking-widest text-[#111] hover:bg-[#FAFAFA] transition-colors">
                                    View Docs
                                </button>
                                <button className="bg-[#0070F3] px-8 py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                                    <span>Deploy Node</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Architectural Diagrams / Features */}
                    <div className="flex-1 flex flex-col border-b border-[#111111]/20 lg:border-none">

                        {/* Block 1 */}
                        <div className="blueprint-block relative flex-1 border-b border-[#111111]/20 p-12 transition-colors duration-300">
                            <div className="corner-accent absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#0070F3]"></div>
                            <div className="corner-accent absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#0070F3]"></div>
                            <div className="corner-accent absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#0070F3]"></div>
                            <div className="corner-accent absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#0070F3]"></div>

                            <div className="content-fade h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#111111]/50">[ MOD 01 ]</div>
                                    <Component className="w-6 h-6 text-[#111]" strokeWidth={1} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight uppercase mb-4">Topology Routing</h3>
                                    <p className="text-sm text-[#111111]/60 leading-relaxed max-w-sm">Structurally valid connections between text encoders, diffusion models, and upscalers.</p>
                                </div>
                                {/* Technical diagram mockup */}
                                <div className="w-full h-32 mt-8 border border-[#111111]/20 bg-[#111111]/[0.02] flex items-center justify-center relative overflow-hidden p-4">
                                    <div className="w-full h-[1px] bg-[#0070F3] absolute top-1/2 -translate-y-1/2 border-dashed border-b border-[#0070F3]"></div>
                                    <div className="w-16 h-16 bg-white border-2 border-[#111] z-10 mr-12 flex items-center justify-center text-[10px] font-bold">IN</div>
                                    <div className="w-16 h-16 bg-white border-2 border-[#0070F3] z-10 text-[#0070F3] flex items-center justify-center text-[10px] font-bold">OUT</div>
                                </div>
                            </div>
                        </div>

                        {/* Block 2 */}
                        <div className="blueprint-block relative flex-1 p-12 transition-colors duration-300">
                            <div className="corner-accent absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#0070F3]"></div>
                            <div className="corner-accent absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#0070F3]"></div>
                            <div className="corner-accent absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#0070F3]"></div>
                            <div className="corner-accent absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#0070F3]"></div>

                            <div className="content-fade h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#111111]/50">[ MOD 02 ]</div>
                                    <Grip className="w-6 h-6 text-[#111]" strokeWidth={1} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-bold tracking-tight uppercase mb-4">State Preservation</h3>
                                    <p className="text-sm text-[#111111]/60 leading-relaxed max-w-sm">Absolute reproduction of seed states across multiple instances simultaneously.</p>
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <div className="flex-1 border border-[#111111]/20 bg-[#111111]/[0.02] h-12 flex items-center justify-between px-4">
                                        <span className="text-[10px] font-bold uppercase">Seed:</span>
                                        <span className="text-[10px] font-bold text-[#0070F3]">893847291</span>
                                    </div>
                                    <div className="flex-1 border border-[#111111]/20 bg-[#111111]/[0.02] h-12 flex items-center justify-between px-4">
                                        <span className="text-[10px] font-bold uppercase">Step:</span>
                                        <span className="text-[10px] font-bold text-[#0070F3]">45/50</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
}
