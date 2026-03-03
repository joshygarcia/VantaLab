'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Play } from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LandingVariantOne() {
    const container = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        // High-end editorial entry animation
        gsap.set('.edit-char', { y: '120%', opacity: 0 });
        gsap.set('.edit-fade', { opacity: 0, y: 20 });
        gsap.set('.image-scale', { scale: 1.1 });

        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        tl.to('.edit-char', {
            y: '0%',
            opacity: 1,
            duration: 1.5,
            stagger: 0.05
        })
            .to('.image-scale', {
                scale: 1,
                duration: 2,
                ease: "power2.out"
            }, "-=1")
            .to('.edit-fade', {
                opacity: 1,
                y: 0,
                duration: 1,
                stagger: 0.2
            }, "-=1.5");

        // Parallax and smooth scroll reveals
        const sections = gsap.utils.toArray('.editorial-section');
        sections.forEach((section: any) => {
            gsap.fromTo(section.querySelector('.content-block'),
                { y: 100, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1.5,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 70%",
                    }
                }
            );

            // Image parallax
            const img = section.querySelector('.parallax-img');
            if (img) {
                gsap.to(img, {
                    yPercent: 20,
                    ease: "none",
                    scrollTrigger: {
                        trigger: section,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: true
                    }
                });
            }
        });

    }, { scope: container });

    return (
        <div ref={container} className="min-h-screen bg-[#FDFCF8] text-[#111111] selection:bg-black selection:text-[#FDFCF8] font-serif overflow-x-hidden">

            {/* Minimalist Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16 py-8 edit-fade mix-blend-difference text-white">
                <div className="font-sans text-[10px] uppercase tracking-[0.2em] font-medium">Vanta Lab</div>
                <div className="hidden md:flex items-center gap-12 font-sans text-[10px] uppercase tracking-[0.2em]">
                    <span className="cursor-pointer hover:opacity-50 transition-opacity">Vision</span>
                    <span className="cursor-pointer hover:opacity-50 transition-opacity">Capabilities</span>
                    <span className="cursor-pointer hover:opacity-50 transition-opacity">Archive</span>
                </div>
                <button className="font-sans text-[10px] uppercase tracking-[0.2em] font-medium border-b border-white pb-1">Select Plan</button>
            </nav>

            <main className="relative z-10 w-full max-w-[1800px] mx-auto">

                {/* Hero */}
                <section className="h-screen w-full flex flex-col md:flex-row items-center px-8 md:px-16 pt-32 pb-16 gap-12">

                    {/* Left: Typography */}
                    <div className="flex-1 flex flex-col justify-center h-full">
                        <div className="font-sans text-[10px] uppercase tracking-[0.2em] edit-fade mb-12 text-[#111]/40">No. 01 — Visual Synthesis</div>

                        <h1 className="text-7xl md:text-[9rem] font-light leading-[0.85] tracking-tight mb-8">
                            <div className="overflow-hidden"><span className="edit-char inline-block">Absolute</span></div>
                            <div className="overflow-hidden"><span className="edit-char inline-block text-[#111]/30 italic">Control.</span></div>
                        </h1>

                        <div className="edit-fade mt-auto max-w-sm">
                            <p className="font-sans text-sm font-medium leading-relaxed tracking-wide text-[#111]/60">
                                Vanta Lab acts as a sophisticated visual loom, weaving disparate generative models into a singular, cohesive tapestry of production-ready media.
                            </p>
                            <Link href="/dashboard" className="group mt-12 inline-flex items-center gap-4 font-sans text-[11px] uppercase tracking-[0.2em] font-semibold">
                                <span className="border-b border-[#111] pb-1">Enter Studio</span>
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" strokeWidth={1.5} />
                            </Link>
                        </div>
                    </div>

                    {/* Right: Editorial Image */}
                    <div className="flex-1 w-full h-[60vh] md:h-[80vh] overflow-hidden relative">
                        <div className="absolute inset-0 bg-[#E5E0D8] z-0"></div>
                        <img src="https://images.unsplash.com/photo-1604004555489-723a93d6ce74?q=80&w=1200"
                            className="image-scale w-full h-[120%] object-cover absolute top-[-10%] z-10 grayscale contrast-125 brightness-90" alt="Editorial Fashion" />

                        <div className="absolute bottom-8 right-8 z-20 font-sans text-[9px] uppercase tracking-[0.3em] bg-white/90 backdrop-blur px-4 py-2">
                            Fig 1. Base Render
                        </div>
                    </div>
                </section>

                {/* Section 2: Split Asymmetry */}
                <section className="editorial-section min-h-screen w-full px-8 md:px-16 py-32 flex flex-col md:flex-row gap-24 items-center">
                    <div className="flex-1 w-full h-[70vh] overflow-hidden relative border border-[#111]/10">
                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000"
                            className="parallax-img w-full h-[130%] object-cover absolute top-[-15%]" alt="Portrait" />
                    </div>

                    <div className="flex-1 content-block max-w-xl">
                        <h2 className="text-5xl md:text-7xl font-light leading-none mb-12">
                            Consistency is an art form.
                        </h2>
                        <div className="font-sans text-sm leading-relaxed tracking-wide text-[#111]/60 space-y-8">
                            <p>
                                The true hallmark of professional creation isn't generating a single beautiful image. It is the rigorous ability to replicate that exact aesthetic, character, and tone endlessly.
                            </p>
                            <p>
                                We architected our node ecosystem to lock seeds, route spatial data, and preserve identity through complex, multi-model pipelines.
                            </p>
                        </div>

                        <div className="mt-16 grid grid-cols-2 gap-8 font-sans border-t border-[#111]/10 pt-8">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-[#111]/40 mb-2">Capabilities</div>
                                <div className="text-xs uppercase tracking-wider font-semibold">Temporal Logic</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-[#111]/40 mb-2">Models</div>
                                <div className="text-xs uppercase tracking-wider font-semibold">Agnostic Integration</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Full Width Interstitial */}
                <section className="editorial-section w-full py-40 bg-[#111] text-[#FDFCF8] flex flex-col items-center justify-center text-center px-8">
                    <div className="content-block flex flex-col items-center">
                        <div className="overflow-hidden w-24 h-24 rounded-full border border-white/20 mb-12 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white ml-2" strokeWidth={1} />
                        </div>
                        <h2 className="text-4xl md:text-6xl font-light italic tracking-tight max-w-4xl leading-tight">
                            "The architecture of imagination requires the precision of engineering."
                        </h2>
                        <div className="mt-16 font-sans text-[10px] uppercase tracking-[0.3em] text-white/40">Watch The Manifesto</div>
                    </div>
                </section>

            </main>
        </div>
    );
}
