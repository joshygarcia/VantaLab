'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { MousePointer2, Move, ZoomIn, Image as ImageIcon, Video, Layers, Wand2, ArrowRight, Sparkles, Fingerprint, Cpu, Search, Activity, Box, Network, Cloud, Star, Command, Zap, Bot, Globe, Triangle, Hexagon } from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { AuthModal } from '@/components/auth/AuthModal';

export default function LandingVariantThree() {
    const CANVAS_SIZE = 6000;
    const CANVAS_CENTER = CANVAS_SIZE / 2;
    const GRID_CELL_SIZE = 100;
    const MAX_SCALE = 2;

    const container = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const currentScale = useRef(1);
    const positionRef = useRef({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const router = useRouter();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Check auth state on mount
    useEffect(() => {
        const auth = getFirebaseAuth();
        const unsubscribe = onAuthStateChanged(auth, (next) => setUser(next));
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const syncMobileState = () => {
            setIsMobile(window.innerWidth < 768);
        };

        syncMobileState();
        window.addEventListener('resize', syncMobileState);

        return () => {
            window.removeEventListener('resize', syncMobileState);
        };
    }, []);

    const handleGetStarted = useCallback(() => {
        if (user) {
            router.push('/dashboard');
        } else {
            setAuthModalOpen(true);
        }
    }, [user, router]);

    const modelCatalog = [
        { label: 'Google Imagen', icon: Bot, iconColor: 'text-cyan-300/80' },
        { label: 'Google Nano Banana', icon: Globe, iconColor: 'text-blue-300/80' },
        { label: 'ChatGPT', icon: Sparkles, iconColor: 'text-emerald-300/80' },
        { label: 'Ideogram', icon: Hexagon, iconColor: 'text-purple-300/80' },
        { label: 'Mystic', icon: Triangle, iconColor: 'text-pink-300/80' },
        { label: 'Runway Gen-3', icon: Wand2, iconColor: 'text-indigo-300/80' },
        { label: 'Kling 3.0', icon: Video, iconColor: 'text-pink-300/80' },
        { label: 'Google Veo 3.1', icon: Zap, iconColor: 'text-yellow-300/80' },
        { label: 'Midjourney', icon: Layers, iconColor: 'text-violet-300/80' },
        { label: 'Stable Diffusion 3', icon: Box, iconColor: 'text-orange-300/80' },
        { label: 'Flux.1 Pro', icon: Command, iconColor: 'text-blue-300/80' },
        { label: 'Pika Labs', icon: Cloud, iconColor: 'text-sky-300/80' },
        { label: 'Claude 3.5 Sonnet', icon: Star, iconColor: 'text-emerald-300/80' },
        { label: 'Luma Dream Machine', icon: Cpu, iconColor: 'text-white/80' }
    ];

    const modelNodeSlots = [
        { x: 122, y: 146 },
        { x: 332, y: 74 },
        { x: 620, y: 92 },
        { x: 922, y: 116 },
        { x: 1114, y: 278 },
        { x: 1088, y: 538 },
        { x: 842, y: 666 },
        { x: 522, y: 700 },
        { x: 226, y: 610 },
        { x: 104, y: 380 }
    ];

    const workflowNodeSlots = [
        { label: 'Prompt List', x: 172, y: 196, icon: Command, iconColor: 'text-cyan-300/80' },
        { label: 'Element Library', x: 208, y: 542, icon: Box, iconColor: 'text-cyan-300/80' },
        { label: 'Image Generation', x: 526, y: 132, icon: ImageIcon, iconColor: 'text-cyan-300/80' },
        { label: 'Video Generation', x: 862, y: 224, icon: Video, iconColor: 'text-cyan-300/80' },
        { label: 'Output Merge', x: 852, y: 546, icon: Network, iconColor: 'text-cyan-300/80' }
    ];

    const creatorLabNodeSlots = [
        {
            label: 'Attribute Builder',
            subLabel: 'Face + Body + Style',
            x: 182,
            y: 220,
            icon: Fingerprint,
            iconColor: 'text-rose-300/80'
        },
        {
            label: 'Model Selector',
            subLabel: 'Seedream 5 / Nano Banana 2 / Pro',
            x: 244,
            y: 542,
            icon: Cpu,
            iconColor: 'text-rose-300/80'
        },
        {
            label: 'Live Preview',
            subLabel: 'Realtime update',
            x: 532,
            y: 132,
            icon: ImageIcon,
            iconColor: 'text-rose-300/80'
        },
        {
            label: 'Variants',
            subLabel: 'Profile / Full Body / Sheet',
            x: 860,
            y: 214,
            icon: Layers,
            iconColor: 'text-rose-300/80'
        },
        {
            label: 'Element Library Sync',
            subLabel: 'Auto-save ready',
            x: 858,
            y: 542,
            icon: Cloud,
            iconColor: 'text-rose-300/80'
        }
    ];

    const featuresNodeSlots = [
        {
            label: 'Distraction-Free Creation',
            subLabel: 'High-focus interface',
            x: 150,
            y: 214,
            icon: Search,
            iconColor: 'text-blue-300/85'
        },
        {
            label: 'Pro-Tier Workflows',
            subLabel: 'Production speed',
            x: 910,
            y: 214,
            icon: Activity,
            iconColor: 'text-blue-300/85'
        },
        {
            label: 'Modular Logic',
            subLabel: 'Secure node routing',
            x: 530,
            y: 654,
            icon: Network,
            iconColor: 'text-blue-300/85'
        }
    ];

    const templatesNodeSlots = [
        {
            label: 'AI Photoshoot',
            subLabel: 'Campaign-ready portraits',
            x: 118,
            y: 198,
            titleX: 118,
            titleY: 62,
            icon: ImageIcon,
            iconColor: 'text-purple-300/85',
            imageSrc: 'https://xmzrorlomoflwjzswatg.supabase.co/storage/v1/object/public/general/Photoshoot.png',
            fallbackSrc: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=900&auto=format&fit=crop'
        },
        {
            label: 'Consistent Character Content',
            subLabel: 'Identity continuity',
            x: 530,
            y: 112,
            titleX: 530,
            titleY: 18,
            icon: Fingerprint,
            iconColor: 'text-purple-300/85',
            imageSrc: 'https://xmzrorlomoflwjzswatg.supabase.co/storage/v1/object/public/general/Consistent.png',
            fallbackSrc: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=900&auto=format&fit=crop'
        },
        {
            label: 'UGC Ads',
            subLabel: 'Creator-native promos',
            x: 942,
            y: 198,
            titleX: 942,
            titleY: 62,
            icon: Video,
            iconColor: 'text-purple-300/85',
            imageSrc: 'https://xmzrorlomoflwjzswatg.supabase.co/storage/v1/object/public/general/UGC.png',
            fallbackSrc: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=900&auto=format&fit=crop'
        },
        {
            label: 'Product Story Campaigns',
            subLabel: 'Hero + narrative shots',
            x: 928,
            y: 622,
            titleX: 928,
            titleY: 486,
            icon: Box,
            iconColor: 'text-purple-300/85',
            imageSrc: 'https://xmzrorlomoflwjzswatg.supabase.co/storage/v1/object/public/general/Product.png',
            fallbackSrc: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900&auto=format&fit=crop'
        },
        {
            label: 'Content Batch Production',
            subLabel: 'Weekly content systems',
            x: 132,
            y: 622,
            titleX: 132,
            titleY: 486,
            icon: Layers,
            iconColor: 'text-purple-300/85',
            imageSrc: 'https://xmzrorlomoflwjzswatg.supabase.co/storage/v1/object/public/general/Batch.png',
            fallbackSrc: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=900&auto=format&fit=crop'
        }
    ];

    const pricingNodeSlots = [
        {
            label: 'Starter',
            price: '$5',
            credits: '500 Credits',
            note: '$0.010 per credit',
            x: 162,
            y: 202,
            icon: Star,
            iconColor: 'text-emerald-300/80',
            highlight: false
        },
        {
            label: 'Creator',
            price: '$10',
            credits: '1,000 Credits',
            note: '$0.010 per credit',
            x: 178,
            y: 560,
            icon: Sparkles,
            iconColor: 'text-emerald-300/80',
            highlight: false
        },
        {
            label: 'Pro',
            price: '$50',
            credits: '5,500 Credits',
            note: 'Save 9%',
            x: 922,
            y: 234,
            icon: Zap,
            iconColor: 'text-emerald-300/80',
            highlight: true
        },
        {
            label: 'Studio',
            price: '$100',
            credits: '11,500 Credits',
            note: 'Save 13%',
            x: 930,
            y: 558,
            icon: Command,
            iconColor: 'text-emerald-300/80',
            highlight: false
        }
    ];

    const MODEL_SLOT_COUNT = modelNodeSlots.length;
    const [modelSlotIndices, setModelSlotIndices] = useState<number[]>(() =>
        modelNodeSlots.map((_, index) => index % modelCatalog.length)
    );
    const [activeModelSwapSlots, setActiveModelSwapSlots] = useState<number[]>([]);
    const [pairedModelSwapSlots, setPairedModelSwapSlots] = useState<number[]>([]);
    const swapCycleTimeoutRef = useRef<number | null>(null);
    const swapApplyTimeoutRef = useRef<number | null>(null);

    // Canvas center is 3000, 3000 relative to its own coordinate space.
    // The canvas is absolute top-1/2 left-1/2 translated by -50%, -50% visually.
    // So 0, 0 in 'position' state means seeing exactly the center (3000,3000) of the canvas.

    const getMinScale = useCallback(() => {
        if (typeof window === 'undefined') {
            return 0.2;
        }

        return Math.max(window.innerWidth / CANVAS_SIZE, window.innerHeight / CANVAS_SIZE, 0.2);
    }, [CANVAS_SIZE]);

    const clampPosition = useCallback((nextPosition: { x: number; y: number }, scale = currentScale.current) => {
        if (typeof window === 'undefined') {
            return nextPosition;
        }

        const halfScaledCanvas = (CANVAS_SIZE * scale) / 2;
        const maxX = Math.max(0, halfScaledCanvas - window.innerWidth / 2);
        const maxY = Math.max(0, halfScaledCanvas - window.innerHeight / 2);

        return {
            x: Math.min(maxX, Math.max(-maxX, nextPosition.x)),
            y: Math.min(maxY, Math.max(-maxY, nextPosition.y))
        };
    }, [CANVAS_SIZE]);

    const animateViewport = useCallback((nextPosition: { x: number; y: number }, duration = 2, targetScale?: number) => {
        const minScale = getMinScale();
        const nextScale = targetScale === undefined
            ? currentScale.current
            : Math.min(Math.max(minScale, targetScale), MAX_SCALE);
        const clampedPosition = clampPosition(nextPosition, nextScale);
        const scaledGridCell = GRID_CELL_SIZE * nextScale;

        currentScale.current = nextScale;

        positionRef.current = clampedPosition;
        setPosition(clampedPosition);

        if (canvasRef.current) {
            gsap.to(canvasRef.current, {
                x: clampedPosition.x,
                y: clampedPosition.y,
                scale: nextScale,
                duration,
                ease: 'power3.inOut'
            });
        }

        if (gridRef.current) {
            gsap.to(gridRef.current, {
                backgroundPosition: `${clampedPosition.x * nextScale}px ${clampedPosition.y * nextScale}px`,
                backgroundSize: `${scaledGridCell}px ${scaledGridCell}px`,
                duration,
                ease: 'power3.inOut'
            });
        }
    }, [GRID_CELL_SIZE, MAX_SCALE, clampPosition, getMinScale]);

    const focusSection = useCallback((bounds: { minX: number; maxX: number; minY: number; maxY: number }, padding = 220) => {
        if (typeof window === 'undefined') {
            return;
        }

        const viewportWidth = window.innerWidth;
        const responsivePadding = viewportWidth < 430
            ? padding + 105
            : viewportWidth < 768
                ? padding + 80
                : viewportWidth < 1280
                    ? padding + 35
                    : padding;

        const sectionWidth = Math.max(1, bounds.maxX - bounds.minX);
        const sectionHeight = Math.max(1, bounds.maxY - bounds.minY);
        const availableWidth = Math.max(1, window.innerWidth - responsivePadding * 2);
        const availableHeight = Math.max(1, window.innerHeight - responsivePadding * 2);

        const fitScale = Math.min(availableWidth / sectionWidth, availableHeight / sectionHeight, MAX_SCALE);
        const targetX = (bounds.minX + bounds.maxX) / 2;
        const targetY = (bounds.minY + bounds.maxY) / 2;
        const nextPosition = {
            x: (CANVAS_CENTER - targetX) * fitScale,
            y: (CANVAS_CENTER - targetY) * fitScale
        };

        animateViewport(nextPosition, 2, fitScale);
    }, [MAX_SCALE, CANVAS_CENTER, animateViewport]);

    const scrollToPricing = useCallback(() => {
        focusSection({
            minX: 3960,
            maxX: 5050,
            minY: 3880,
            maxY: 4510
        }, 205);
    }, [focusSection]);

    const scrollToModels = useCallback(() => {
        focusSection({
            minX: 850,
            maxX: 2110,
            minY: 1080,
            maxY: 1880
        }, 180);
    }, [focusSection]);

    const scrollToWorkflow = useCallback(() => {
        focusSection({
            minX: 1450,
            maxX: 2350,
            minY: 2740,
            maxY: 3260
        }, 190);
    }, [focusSection]);

    const scrollToCreatorLab = useCallback(() => {
        focusSection({
            minX: 3600,
            maxX: 4600,
            minY: 2740,
            maxY: 3260
        }, 190);
    }, [focusSection]);

    const scrollToFeatures = useCallback(() => {
        focusSection({
            minX: 940,
            maxX: 2060,
            minY: 3780,
            maxY: 4620
        }, 200);
    }, [focusSection]);

    const scrollToTemplates = useCallback(() => {
        focusSection({
            minX: 3890,
            maxX: 5110,
            minY: 1040,
            maxY: 1870
        }, 195);
    }, [focusSection]);

    const scrollToHero = useCallback(() => {
        focusSection({
            minX: 2720,
            maxX: 3280,
            minY: 2720,
            maxY: 3280
        }, 240);
    }, [focusSection]);

    const scrollToMobileSection = useCallback((sectionId: string) => {
        if (typeof window === 'undefined') {
            return;
        }

        const section = document.getElementById(sectionId);
        if (!section) {
            return;
        }

        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const orbitCenterX = 620;
        const orbitCenterY = 380;
        const slotDistances = modelNodeSlots.map((slot) => Math.hypot(slot.x - orbitCenterX, slot.y - orbitCenterY));
        const maxDistance = slotDistances.reduce((currentMax, distance) => Math.max(currentMax, distance), 1);
        const slotWeights = slotDistances.map((distance) => {
            const normalizedDistance = distance / maxDistance;
            return 0.25 + Math.pow(normalizedDistance, 2.1) * 3.1;
        });

        const pickWeightedSlot = (excludedSlots: Set<number>) => {
            const candidates: Array<{ index: number; weight: number }> = [];
            let totalWeight = 0;

            for (let index = 0; index < MODEL_SLOT_COUNT; index += 1) {
                if (excludedSlots.has(index)) {
                    continue;
                }

                const weight = slotWeights[index];
                totalWeight += weight;
                candidates.push({ index, weight });
            }

            if (candidates.length === 0) {
                return null;
            }

            let cursor = Math.random() * totalWeight;

            for (const candidate of candidates) {
                cursor -= candidate.weight;
                if (cursor <= 0) {
                    return candidate.index;
                }
            }

            return candidates[candidates.length - 1].index;
        };

        const pickNearestPairedSlot = (anchorSlot: number, excludedSlots: Set<number>) => {
            const nearbyCandidates: Array<{ index: number; distance: number; weight: number }> = [];

            for (let index = 0; index < MODEL_SLOT_COUNT; index += 1) {
                if (index === anchorSlot || excludedSlots.has(index)) {
                    continue;
                }

                const distance = Math.hypot(
                    modelNodeSlots[index].x - modelNodeSlots[anchorSlot].x,
                    modelNodeSlots[index].y - modelNodeSlots[anchorSlot].y
                );

                nearbyCandidates.push({
                    index,
                    distance,
                    weight: slotWeights[index]
                });
            }

            if (nearbyCandidates.length === 0) {
                return null;
            }

            nearbyCandidates.sort((left, right) => left.distance - right.distance);
            const shortlist = nearbyCandidates.slice(0, Math.min(4, nearbyCandidates.length));
            let totalWeight = 0;

            shortlist.forEach((candidate) => {
                const proximityWeight = 1 / Math.max(candidate.distance, 1);
                candidate.weight = candidate.weight + proximityWeight * 220;
                totalWeight += candidate.weight;
            });

            let cursor = Math.random() * totalWeight;

            for (const candidate of shortlist) {
                cursor -= candidate.weight;
                if (cursor <= 0) {
                    return candidate.index;
                }
            }

            return shortlist[shortlist.length - 1].index;
        };

        const scheduleSwap = () => {
            if (isCancelled) {
                return;
            }

            const cycleDelay = 520 + Math.random() * 980;

            swapCycleTimeoutRef.current = window.setTimeout(() => {
                if (isCancelled) {
                    return;
                }

                const shouldPairCrossfade = Math.random() < 0.3;
                const targetSlots = new Set<number>();
                const primarySlot = pickWeightedSlot(targetSlots);

                if (primarySlot === null) {
                    scheduleSwap();
                    return;
                }

                targetSlots.add(primarySlot);

                if (shouldPairCrossfade) {
                    const pairedSlot = pickNearestPairedSlot(primarySlot, targetSlots);
                    if (pairedSlot !== null) {
                        targetSlots.add(pairedSlot);
                    }
                } else {
                    const extraSwapRoll = Math.random();
                    const extraSwapCount = extraSwapRoll > 0.82 ? 2 : extraSwapRoll > 0.48 ? 1 : 0;

                    for (let swapIndex = 0; swapIndex < extraSwapCount; swapIndex += 1) {
                        const extraSlot = pickWeightedSlot(targetSlots);
                        if (extraSlot === null) {
                            break;
                        }

                        targetSlots.add(extraSlot);
                    }
                }

                const slots = Array.from(targetSlots);
                const pairedSlots = shouldPairCrossfade && slots.length === 2 ? slots : [];
                setActiveModelSwapSlots(slots);
                setPairedModelSwapSlots(pairedSlots);

                const swapDelay = pairedSlots.length === 2
                    ? 280 + Math.random() * 140
                    : 170 + Math.random() * 170;

                swapApplyTimeoutRef.current = window.setTimeout(() => {
                    if (isCancelled) {
                        return;
                    }

                    setModelSlotIndices((previous) => {
                        const next = [...previous];
                        const slotSet = new Set(slots);
                        const staticModels = new Set<number>();
                        const assignedModels = new Set<number>();
                        const allModelIndices = Array.from({ length: modelCatalog.length }, (_, index) => index);

                        previous.forEach((modelIndex, slotIndex) => {
                            if (!slotSet.has(slotIndex)) {
                                staticModels.add(modelIndex);
                            }
                        });

                        const availableModels = allModelIndices.filter((index) => !staticModels.has(index));

                        slots.forEach((slotIndex) => {
                            const uniqueCandidates = availableModels.filter(
                                (index) => !assignedModels.has(index) && index !== previous[slotIndex]
                            );
                            const fallbackCandidates = availableModels.filter((index) => !assignedModels.has(index));
                            const candidatePool = uniqueCandidates.length > 0 ? uniqueCandidates : fallbackCandidates;

                            const nextModelIndex = candidatePool.length > 0
                                ? candidatePool[Math.floor(Math.random() * candidatePool.length)]
                                : previous[slotIndex];

                            next[slotIndex] = nextModelIndex;
                            assignedModels.add(nextModelIndex);
                        });

                        return next;
                    });

                    setActiveModelSwapSlots([]);
                    setPairedModelSwapSlots([]);
                    scheduleSwap();
                }, swapDelay);
            }, cycleDelay);
        };

        scheduleSwap();

        return () => {
            isCancelled = true;

            if (swapCycleTimeoutRef.current !== null) {
                window.clearTimeout(swapCycleTimeoutRef.current);
            }

            if (swapApplyTimeoutRef.current !== null) {
                window.clearTimeout(swapApplyTimeoutRef.current);
            }
        };
    }, [MODEL_SLOT_COUNT, modelCatalog.length]);

    useGSAP(() => {
        if (isMobile || !canvasRef.current) {
            return;
        }

        const prefersReducedMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Initial zoom-in animation
        gsap.set(canvasRef.current, { x: 0, y: 0 }); // guarantee center load

        gsap.fromTo(canvasRef.current,
            { scale: 0.6, opacity: 0 },
            { scale: 1, opacity: 1, duration: prefersReducedMotion ? 0.8 : 2, ease: "power3.out" }
        );

        if (prefersReducedMotion) {
            return;
        }

        // Floating node animations - subtle but clearly visible
        gsap.to('.hero-cluster, .workflow-cluster, .creator-cluster, .models-cluster, .features-cluster, .templates-cluster, .pricing-cluster', {
            y: 'random(-22, 22)',
            x: 'random(-18, 18)',
            rotation: 'random(-1.8, 1.8)',
            scale: 'random(0.992, 1.012)',
            duration: 'random(3.8, 5.8)',
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            repeatRefresh: true,
            stagger: 0.12
        });

        gsap.to('.features-chip-node', {
            y: 'random(-18, 18)',
            x: 'random(-14, 14)',
            rotation: 'random(-1.6, 1.6)',
            scale: 'random(0.99, 1.015)',
            duration: 'random(3.4, 5.2)',
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            repeatRefresh: true,
            stagger: 0.08
        });

        // Pulse connections
        gsap.to('.connection-line', {
            strokeDashoffset: -220,
            duration: 6,
            ease: "none",
            repeat: -1
        });

        gsap.to('.connection-signal-line', {
            strokeDashoffset: -140,
            duration: 2.3,
            ease: 'none',
            repeat: -1
        });

        gsap.to('.workflow-chip-node, .creator-chip-node, .features-chip-node, .templates-chip-node, .pricing-chip-node', {
            opacity: 'random(0.68, 1)',
            scale: 'random(0.93, 1.08)',
            y: 'random(-5, 5)',
            duration: 'random(1.7, 2.8)',
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            repeatRefresh: true,
            stagger: 0.08
        });

        gsap.to('.model-star-node', {
            opacity: 'random(0.55, 1)',
            scale: 'random(0.92, 1.09)',
            duration: 'random(1.5, 2.6)',
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            repeatRefresh: true,
            stagger: 0.06
        });

        gsap.to('.model-star-glow', {
            opacity: 'random(0.22, 0.78)',
            duration: 'random(1.2, 2)',
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            repeatRefresh: true,
            stagger: 0.08
        });

    }, { scope: container, dependencies: [isMobile], revertOnUpdate: true });

    const handlePointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
        setIsDragging(true);
        setStartPos({ x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y });
        if (canvasRef.current) gsap.to(canvasRef.current, { cursor: 'grabbing', duration: 0.1 });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const newX = e.clientX - startPos.x;
        const newY = e.clientY - startPos.y;
        const clampedPosition = clampPosition({ x: newX, y: newY });

        positionRef.current = clampedPosition;
        setPosition(clampedPosition);

        if (canvasRef.current) {
            gsap.set(canvasRef.current, { x: clampedPosition.x, y: clampedPosition.y });
        }
        if (gridRef.current) {
            const scaledGridCell = GRID_CELL_SIZE * currentScale.current;
            gsap.set(gridRef.current, {
                backgroundPosition: `${clampedPosition.x * currentScale.current}px ${clampedPosition.y * currentScale.current}px`,
                backgroundSize: `${scaledGridCell}px ${scaledGridCell}px`
            });
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        if (canvasRef.current) gsap.to(canvasRef.current, { cursor: 'grab', duration: 0.1 });
    };

    useEffect(() => {
        if (isMobile) {
            return;
        }

        const el = container.current;
        if (!el) return;

        const syncViewport = () => {
            const minScale = getMinScale();
            currentScale.current = Math.max(minScale, currentScale.current);

            const clampedPosition = clampPosition(positionRef.current, currentScale.current);
            positionRef.current = clampedPosition;
            setPosition(clampedPosition);

            if (canvasRef.current) {
                gsap.set(canvasRef.current, {
                    x: clampedPosition.x,
                    y: clampedPosition.y,
                    scale: currentScale.current
                });
            }

            if (gridRef.current) {
                const scaledGridCell = GRID_CELL_SIZE * currentScale.current;
                gsap.set(gridRef.current, {
                    backgroundPosition: `${clampedPosition.x * currentScale.current}px ${clampedPosition.y * currentScale.current}px`,
                    backgroundSize: `${scaledGridCell}px ${scaledGridCell}px`
                });
            }
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const zoomSensitivity = 0.0015;
            const delta = -e.deltaY * zoomSensitivity;
            const currentPosition = positionRef.current;
            const currentScaleValue = currentScale.current;
            const minScale = getMinScale();
            const nextScale = Math.min(Math.max(minScale, currentScaleValue + delta), MAX_SCALE);
            currentScale.current = nextScale;

            const rect = el.getBoundingClientRect();
            const cursorX = e.clientX - rect.left - rect.width / 2;
            const cursorY = e.clientY - rect.top - rect.height / 2;
            const scaleRatio = nextScale / currentScaleValue;

            const zoomTargetPosition = {
                x: cursorX - (cursorX - currentPosition.x) * scaleRatio,
                y: cursorY - (cursorY - currentPosition.y) * scaleRatio
            };

            const clampedPosition = clampPosition(zoomTargetPosition, nextScale);
            positionRef.current = clampedPosition;
            setPosition(clampedPosition);
            const scaledGridCell = GRID_CELL_SIZE * nextScale;

            if (canvasRef.current) {
                gsap.to(canvasRef.current, {
                    x: clampedPosition.x,
                    y: clampedPosition.y,
                    scale: nextScale,
                    duration: 0.2,
                    ease: 'power2.out'
                });
            }
            if (gridRef.current) {
                gsap.to(gridRef.current, {
                    backgroundPosition: `${clampedPosition.x * nextScale}px ${clampedPosition.y * nextScale}px`,
                    backgroundSize: `${scaledGridCell}px ${scaledGridCell}px`,
                    duration: 0.2,
                    ease: 'power2.out'
                });
            }
        };

        syncViewport();
        el.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('resize', syncViewport);
        // Handle touch pinch to zoom if desired later, but for now wheel is fine.
        return () => {
            el.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resize', syncViewport);
        };
    }, [MAX_SCALE, GRID_CELL_SIZE, clampPosition, getMinScale, isMobile]);

    // SVG coordinate mapping
    // Center: (3000, 3000)
    // Models constellation hub (top-left): center (1480, 1480)
    // Section bounds approximately:
    // - x: 850 to 2110
    // - y: 1080 to 1880

    // Workflow canvas hub (left): center (1900, 3000)
    // - x: 1450 to 2350
    // - y: 2740 to 3260

    // Character lab hub (right): center (4100, 3000)
    // - x: 3600 to 4600
    // - y: 2740 to 3260

    // Features constellation hub (bottom-left): center (1500, 4200)
    // - x: 940 to 2060
    // - y: 3780 to 4620

    // Templates constellation hub (top-right): center (4500, 1500)
    // - x: 3890 to 5110
    // - y: 1040 to 1870

    // Pricing constellation hub (bottom-right): center (4500, 4200)
    // - x: 3960 to 5050
    // - y: 3880 to 4510

    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#0E0E11] text-white font-sans">
                <header className="sticky top-0 z-50 border-b border-[#2A2A35] bg-[#111116]/95 pt-[max(env(safe-area-inset-top),0px)] backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                        <button onClick={() => scrollToMobileSection('mobile-hero')} className="font-display text-base font-bold tracking-tight text-[#FAF8F5] flex items-center gap-2">
                            <img src="/branding/vl_monogram.svg" alt="Vanta Lab" className="h-[18px] w-[18px] invert" />
                            Vanta Lab
                        </button>
                        <button
                            onClick={handleGetStarted}
                            className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium text-[#FAF8F5] transition-all hover:bg-white/10 hover:border-white/20"
                        >
                            <span>{user ? 'Dashboard' : 'Get Started'}</span>
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>
                    <div className="relative border-t border-white/5 px-2.5 py-2">
                        <div className="pointer-events-none absolute inset-y-2 left-2.5 z-10 w-5 bg-gradient-to-r from-[#111116] to-transparent"></div>
                        <div className="pointer-events-none absolute inset-y-2 right-2.5 z-10 w-5 bg-gradient-to-l from-[#111116] to-transparent"></div>
                        <div className="flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <button onClick={() => scrollToMobileSection('mobile-models')} className="snap-start shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10.5px] font-medium text-white/80">Models</button>
                            <button onClick={() => scrollToMobileSection('mobile-workflow')} className="snap-start shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10.5px] font-medium text-white/80">Workflow</button>
                            <button onClick={() => scrollToMobileSection('mobile-creator')} className="snap-start shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10.5px] font-medium text-white/80">Creator Lab</button>
                            <button onClick={() => scrollToMobileSection('mobile-features')} className="snap-start shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10.5px] font-medium text-white/80">Features</button>
                            <button onClick={() => scrollToMobileSection('mobile-templates')} className="snap-start shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10.5px] font-medium text-white/80">Templates</button>
                            <button onClick={() => scrollToMobileSection('mobile-pricing')} className="snap-start shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10.5px] font-medium text-white/80">Pricing</button>
                        </div>
                    </div>
                </header>

                <main className="space-y-4 px-3.5 pb-14 pt-3.5">
                    <section id="mobile-hero" className="rounded-2xl border border-[#2A2A35] bg-[#18181F]/92 p-4 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/70">
                            <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]" />
                            Engine v2.0 is now live
                        </div>
                        <h1 className="text-[1.65rem] font-bold leading-[1.18]">
                            The precise environment for <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI asset generation.</span>
                        </h1>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-white/60">
                            Zero friction workspaces. Absolute control over digital personas. Built for production-grade creation.
                        </p>
                    </section>

                    <section id="mobile-models" className="rounded-2xl border border-[#2A2A35] bg-[#18181F]/92 p-3.5">
                        <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/90"><Cpu className="h-4 w-4 text-indigo-300" /> Models</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {modelCatalog.map((model) => {
                                const Icon = model.icon;

                                return (
                                    <div key={`mobile-model-${model.label}`} className="flex items-center gap-2 rounded-xl border border-[#2A2A35] bg-[#121218] px-2.5 py-2">
                                        <Icon className={`h-3.5 w-3.5 ${model.iconColor}`} />
                                        <span className="truncate text-[10.5px] font-medium text-white/85">{model.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section id="mobile-workflow" className="rounded-2xl border border-[#2A2A35] bg-[#18181F]/92 p-3.5">
                        <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/90"><MousePointer2 className="h-4 w-4 text-cyan-300" /> Workflow Canvas</h2>
                        <p className="mb-2.5 text-[11px] leading-relaxed text-white/55">Compose reusable node pipelines from prompt logic to image/video output.</p>
                        <div className="space-y-2">
                            {workflowNodeSlots.map((slot) => {
                                const Icon = slot.icon;

                                return (
                                    <div key={`mobile-workflow-${slot.label}`} className="flex items-center gap-2 rounded-xl border border-[#2A2A35] bg-[#121218] px-2.5 py-2">
                                        <Icon className={`h-3.5 w-3.5 ${slot.iconColor}`} />
                                        <span className="text-[11px] font-medium text-white/85">{slot.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section id="mobile-creator" className="rounded-2xl border border-[#2A2A35] bg-[#18181F]/92 p-3.5">
                        <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/90"><Fingerprint className="h-4 w-4 text-rose-300" /> Character Lab</h2>
                        <p className="mb-2.5 text-[11px] leading-relaxed text-white/55">Create character systems with attributes, model selection, and live preview workflows.</p>
                        <div className="space-y-2">
                            {creatorLabNodeSlots.map((slot) => {
                                const Icon = slot.icon;

                                return (
                                    <div key={`mobile-creator-${slot.label}`} className="rounded-xl border border-[#2A2A35] bg-[#121218] px-2.5 py-2">
                                        <div className="flex items-center gap-2">
                                            <Icon className={`h-3.5 w-3.5 ${slot.iconColor}`} />
                                            <span className="text-[11px] font-medium text-white/88">{slot.label}</span>
                                        </div>
                                        <p className="mt-1 text-[10px] text-white/50">{slot.subLabel}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section id="mobile-features" className="rounded-2xl border border-[#2A2A35] bg-[#18181F]/92 p-3.5">
                        <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/90"><Activity className="h-4 w-4 text-blue-300" /> Features</h2>
                        <div className="space-y-2">
                            {featuresNodeSlots.map((slot) => {
                                const Icon = slot.icon;

                                return (
                                    <div key={`mobile-feature-${slot.label}`} className="rounded-xl border border-[#2A2A35] bg-[#121218] px-2.5 py-2">
                                        <div className="flex items-center gap-2">
                                            <Icon className={`h-3.5 w-3.5 ${slot.iconColor}`} />
                                            <span className="text-[11px] font-medium text-white/88">{slot.label}</span>
                                        </div>
                                        <p className="mt-1 text-[10px] text-white/50">{slot.subLabel}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section id="mobile-templates" className="rounded-2xl border border-[#2A2A35] bg-[#18181F]/92 p-3.5">
                        <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/90"><Layers className="h-4 w-4 text-purple-300" /> Templates</h2>
                        <div className="space-y-2.5">
                            {templatesNodeSlots.map((slot) => (
                                <Link key={`mobile-template-${slot.label}`} href="/canvas" className="block overflow-hidden rounded-2xl border border-[#2A2A35] bg-[#121218]">
                                    <img
                                        src={slot.imageSrc}
                                        alt={slot.label}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) => {
                                            event.currentTarget.src = slot.fallbackSrc;
                                        }}
                                        className="aspect-video w-full object-cover"
                                    />
                                    <div className="px-2.5 py-2">
                                        <p className="text-[11px] font-semibold text-white/90">{slot.label}</p>
                                        <p className="mt-0.5 text-[10px] text-white/50">{slot.subLabel}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section id="mobile-pricing" className="rounded-2xl border border-[#2A2A35] bg-[#18181F]/92 p-3.5">
                        <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/90"><Star className="h-4 w-4 text-emerald-300" /> Pricing</h2>
                        <div className="space-y-2">
                            {pricingNodeSlots.map((slot) => {
                                const isPro = slot.label === 'Pro';
                                const isStudio = slot.label === 'Studio';

                                return (
                                    <Link
                                        key={`mobile-pricing-${slot.label}`}
                                        href="/billing"
                                        className={`block rounded-xl border px-2.5 py-2.5 ${isPro
                                            ? 'border-blue-500/55 bg-blue-500/10'
                                            : isStudio
                                                ? 'border-purple-500/55 bg-purple-500/10'
                                                : 'border-[#2A2A35] bg-[#121218]'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[13px] font-semibold text-white/90">{slot.label}</span>
                                            <span className="text-[18px] font-bold text-white">{slot.price}</span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-[10.5px]">
                                            <span className="text-white/65">{slot.credits}</span>
                                            <span className={slot.note.startsWith('Save') ? 'text-emerald-300' : 'text-white/45'}>{slot.note}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                </main>

                <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            </div>
        );
    }

    return (
        <div ref={container} className="h-screen w-screen bg-[#0E0E11] text-white font-sans overflow-hidden relative selection:bg-indigo-500/30">
            {/* FULL SCREEN INFINITE GRID BACKGROUND */}
            <div
                ref={gridRef}
                className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]"
                style={{
                    backgroundSize: `${GRID_CELL_SIZE * currentScale.current}px ${GRID_CELL_SIZE * currentScale.current}px`,
                    backgroundPosition: `${position.x * currentScale.current}px ${position.y * currentScale.current}px`
                }}
            />

            {/* Contextual UI Overlay */}
            <nav className="absolute top-0 w-full px-6 py-6 flex items-center justify-between z-50 pointer-events-none">
                <div className="flex items-center gap-3">
                    <button onClick={scrollToHero} className="font-display text-xl font-bold tracking-tight text-[#FAF8F5] pointer-events-auto flex items-center gap-2">
                        <img src="/branding/vl_monogram.svg" alt="Vanta Lab" className="h-6 w-6 invert" />
                        Vanta Lab
                    </button>
                    <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                    <span className="text-xs font-mono text-white/40 hidden md:block uppercase tracking-widest">Vanta Lab v2.0</span>
                </div>

                <div className="flex items-center gap-6 pointer-events-auto">
                    <button onClick={scrollToModels} className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block group flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        Models
                    </button>
                    <button onClick={scrollToWorkflow} className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block group flex items-center gap-2">
                        <MousePointer2 className="w-4 h-4 text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        Workflow
                    </button>
                    <button onClick={scrollToCreatorLab} className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block group flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-rose-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        Creator Lab
                    </button>
                    <button onClick={scrollToFeatures} className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block group flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        Features
                    </button>
                    <button onClick={scrollToTemplates} className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block group flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        Templates
                    </button>
                    <button onClick={scrollToPricing} className="text-sm font-medium text-white/60 hover:text-white transition-colors hidden md:block group flex items-center gap-2">
                        <Star className="w-4 h-4 text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                        Pricing
                    </button>
                    <button
                        onClick={handleGetStarted}
                        className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#FAF8F5] transition-all hover:bg-white/10 hover:border-white/20 shadow-lg"
                    >
                        <span>{user ? 'Dashboard' : 'Get Started'}</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>
            </nav>

            {/* Global Overlays */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#1A1A20]/80 backdrop-blur-md border border-[#2A2A35] px-6 py-3 rounded-full pointer-events-auto shadow-2xl">
                <Move className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400 font-medium whitespace-nowrap">Click & Drag to Explore</span>
                <div className="w-px h-5 bg-[#2A2A35] mx-2"></div>
                <ZoomIn className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400 font-medium whitespace-nowrap">Scroll to Zoom</span>
            </div>

            <footer className="absolute bottom-6 right-6 z-50 pointer-events-auto hidden md:block">
                <div className="flex items-center gap-4">
                    <a href="#" className="text-xs font-medium text-white/40 hover:text-white transition-colors">Twitter</a>
                    <a href="#" className="text-xs font-medium text-white/40 hover:text-white transition-colors">GitHub</a>
                    <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1.5 backdrop-blur-md">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="font-mono text-[9px] font-medium tracking-widest text-emerald-500 uppercase">All Systems Normal</span>
                    </div>
                </div>
            </footer>

            {/* The Infinite Canvas (Constellation Layout) */}
            <div
                ref={canvasRef}
                className="w-[6000px] h-[6000px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ transformOrigin: 'center center' }}
            >
                {/* SVG Connections Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    {/* Hero to Models Hub (nav: Models / indigo) */}
                    <g>
                        <path d="M 3000 3000 C 2680 2500, 2260 1940, 1480 1480" fill="none" stroke="rgba(129, 140, 248, 0.34)" strokeWidth="4" className="connection-line" strokeDasharray="14 12" />
                        <path d="M 3000 3000 C 2680 2500, 2260 1940, 1480 1480" fill="none" stroke="rgba(165, 180, 252, 0.88)" strokeWidth="2.8" strokeDasharray="2 24" strokeLinecap="round" className="connection-signal-line" />
                    </g>

                    {/* Hero to Workflow Hub (nav: Workflow / cyan) */}
                    <g>
                        <path d="M 3000 3000 C 2760 2860, 2340 2870, 1900 3000" fill="none" stroke="rgba(34, 211, 238, 0.32)" strokeWidth="3.4" className="connection-line" strokeDasharray="10 10" />
                        <path d="M 3000 3000 C 2760 2860, 2340 2870, 1900 3000" fill="none" stroke="rgba(103, 232, 249, 0.86)" strokeWidth="2.5" strokeDasharray="2 22" strokeLinecap="round" className="connection-signal-line" />
                    </g>

                    {/* Hero to Character Lab Hub (nav: Creator Lab / rose) */}
                    <g>
                        <path d="M 3000 3000 C 3240 2860, 3660 2870, 4100 3000" fill="none" stroke="rgba(251, 113, 133, 0.32)" strokeWidth="3.4" className="connection-line" strokeDasharray="10 10" />
                        <path d="M 3000 3000 C 3240 2860, 3660 2870, 4100 3000" fill="none" stroke="rgba(253, 164, 175, 0.86)" strokeWidth="2.5" strokeDasharray="2 22" strokeLinecap="round" className="connection-signal-line" />
                    </g>

                    {/* Hero to Features Hub (1500, 4200) */}
                    <g>
                        <path d="M 3000 3000 C 3000 4200, 2500 4200, 1500 4200" fill="none" stroke="rgba(96, 165, 250, 0.28)" strokeWidth="2.2" className="connection-line" strokeDasharray="8 10" />
                        <path d="M 3000 3000 C 3000 4200, 2500 4200, 1500 4200" fill="none" stroke="rgba(147, 197, 253, 0.82)" strokeWidth="2.2" strokeDasharray="2 20" strokeLinecap="round" className="connection-signal-line" />
                    </g>

                    {/* Hero to Templates Hub (4500, 1500) */}
                    <g>
                        <path d="M 3000 3000 C 3000 1500, 3500 1500, 4500 1500" fill="none" stroke="rgba(192, 132, 252, 0.3)" strokeWidth="2.2" className="connection-line" strokeDasharray="8 10" />
                        <path d="M 3000 3000 C 3000 1500, 3500 1500, 4500 1500" fill="none" stroke="rgba(216, 180, 254, 0.84)" strokeWidth="2.2" strokeDasharray="2 20" strokeLinecap="round" className="connection-signal-line" />
                    </g>

                    {/* Hero to Pricing Hub (4500, 4200) */}
                    <g>
                        <path d="M 3000 3000 C 3000 4200, 3500 4200, 4500 4200" fill="none" stroke="rgba(52, 211, 153, 0.34)" strokeWidth="4" className="connection-line" strokeDasharray="14 12" />
                        <path d="M 3000 3000 C 3000 4200, 3500 4200, 4500 4200" fill="none" stroke="rgba(110, 231, 183, 0.88)" strokeWidth="2.8" strokeDasharray="2 24" strokeLinecap="round" className="connection-signal-line" />
                    </g>

                </svg>

                {/* --- CENTER AREA: HERO --- */}
                <div className="hero-cluster absolute top-[3000px] left-[3000px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto">
                    <div className="hero-node w-[480px] bg-[#18181F]/90 backdrop-blur-xl border border-[#2A2A35] rounded-3xl shadow-[0_0_80px_rgba(99,102,241,0.15)] relative">
                        <div className="p-4 border-b border-[#2A2A35] flex items-center justify-between bg-[#1A1A20]/80 rounded-t-3xl">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></div>
                                <span className="text-sm font-semibold text-white/90">Master Sequence / Canvas Root</span>
                            </div>
                            <Wand2 className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="p-10">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm mb-8">
                                <Sparkles className="h-4 w-4 text-[#C9A84C]" />
                                <span>Engine v2.0 is now live</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.15]">
                                The precise environment for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI asset generation.</span>
                            </h1>
                            <p className="text-gray-400 text-base leading-relaxed mb-10 font-medium">
                                Zero friction workspaces. Absolute control over your digital personas. Designed for high-density, pro-tier workflows without the visual noise.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={handleGetStarted} className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl py-3.5 px-8 font-semibold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 text-white">
                                    <span>Start Engine</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button className="w-full sm:w-auto bg-[#2A2A35] hover:bg-[#3A3A45] rounded-xl py-3.5 px-8 font-semibold transition-colors flex items-center justify-center gap-2 text-white/90 group">
                                    <span>Explore Nodes</span>
                                    <Move className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                        </div>
                        {/* Output ports */}
                        <div className="absolute top-[40%] -right-3 w-6 h-6 bg-[#2A2A35] border-2 border-[#18181F] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        </div>
                        <div className="absolute top-[60%] -right-3 w-6 h-6 bg-[#2A2A35] border-2 border-[#18181F] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-[#2A2A35] border-2 border-[#18181F] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        </div>
                    </div>
                </div>


                {/* --- WORKFLOW CANVAS (Left of Hero) --- */}
                <div className="workflow-cluster absolute top-[3000px] left-[1900px] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                    <div className="relative h-[760px] w-[1060px]">
                        <div className="pointer-events-none absolute left-[420px] top-[290px] h-[220px] w-[220px] rounded-full bg-cyan-500/10 blur-3xl"></div>

                        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1060 760" fill="none" aria-hidden="true">
                            {workflowNodeSlots.map((slot, index) => {
                                const centerX = 530;
                                const centerY = 380;
                                const deltaX = slot.x - centerX;
                                const deltaY = slot.y - centerY;
                                const controlX = centerX + deltaX * 0.55 + ((index % 3) - 1) * 18;
                                const controlY = centerY + deltaY * 0.58 + ((index % 4) - 1.5) * 16;
                                const connectorPath = `M ${centerX} ${centerY} Q ${controlX} ${controlY} ${slot.x} ${slot.y}`;

                                return (
                                    <g key={`workflow-link-${slot.label}`}>
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(34, 211, 238, 0.24)"
                                            strokeWidth={index % 2 === 0 ? 2.1 : 1.7}
                                            strokeDasharray={index % 2 === 0 ? '8 9' : '6 12'}
                                            className="connection-line"
                                        />
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(103, 232, 249, 0.88)"
                                            strokeWidth="2.5"
                                            strokeDasharray="2 26"
                                            strokeLinecap="round"
                                            className="connection-signal-line"
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute left-[530px] top-[380px] -translate-x-1/2 -translate-y-1/2">
                            <div className="workflow-node relative w-[430px] rounded-3xl border border-[#2A2A35] bg-[#18181F]/92 backdrop-blur-xl shadow-[0_0_60px_rgba(6,182,212,0.18)]">
                                <div className="rounded-t-3xl border-b border-[#2A2A35] bg-[#1A1A20]/90 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                            <MousePointer2 className="h-4 w-4 text-cyan-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">Build Layer</p>
                                            <h2 className="text-base font-semibold text-white/90">Workflow Canvas</h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-6">
                                    <p className="text-sm leading-relaxed text-white/65">
                                        Compose reusable node pipelines visually, from prompt logic to media generation. Route every branch with precision and merge outputs into one production-ready flow.
                                    </p>
                                    <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                                        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-300">Node Routing</span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Reusable Flows</span>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                                </div>
                                <div className="absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                                </div>
                            </div>
                        </div>

                        {workflowNodeSlots.map((slot) => {
                            const Icon = slot.icon;

                            return (
                                <div
                                    key={`workflow-node-${slot.label}`}
                                    className="workflow-chip-node pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: slot.x, top: slot.y }}
                                >
                                    <div className="relative flex min-w-[176px] items-center gap-2 rounded-2xl border border-[#2A2A35] bg-[#18181F]/95 px-3.5 py-2 text-sm text-white/80 shadow-[0_12px_28px_rgba(5,5,10,0.4)]">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/16 to-cyan-500/0"></div>
                                        <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                            <Icon className={`h-3.5 w-3.5 ${slot.iconColor}`} />
                                        </div>
                                        <span className="relative whitespace-nowrap font-semibold tracking-tight">{slot.label}</span>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pointer-events-none absolute left-[120px] top-[144px] h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_10px_rgba(103,232,249,0.75)]"></div>
                        <div className="pointer-events-none absolute right-[120px] top-[210px] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.6)]"></div>
                    </div>
                </div>


                {/* --- CHARACTER LAB (Right of Hero) --- */}
                <div className="creator-cluster absolute top-[3000px] left-[4100px] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                    <div className="relative h-[760px] w-[1060px]">
                        <div className="pointer-events-none absolute left-[420px] top-[290px] h-[220px] w-[220px] rounded-full bg-rose-500/10 blur-3xl"></div>

                        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1060 760" fill="none" aria-hidden="true">
                            {creatorLabNodeSlots.map((slot, index) => {
                                const centerX = 530;
                                const centerY = 380;
                                const deltaX = slot.x - centerX;
                                const deltaY = slot.y - centerY;
                                const controlX = centerX + deltaX * 0.52 + ((index % 4) - 1.5) * 18;
                                const controlY = centerY + deltaY * 0.56 + ((index % 3) - 1) * 16;
                                const connectorPath = `M ${centerX} ${centerY} Q ${controlX} ${controlY} ${slot.x} ${slot.y}`;

                                return (
                                    <g key={`creator-link-${slot.label}`}>
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(251, 113, 133, 0.24)"
                                            strokeWidth={index % 2 === 0 ? 2.1 : 1.7}
                                            strokeDasharray={index % 2 === 0 ? '8 9' : '6 12'}
                                            className="connection-line"
                                        />
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(253, 164, 175, 0.86)"
                                            strokeWidth="2.5"
                                            strokeDasharray="2 26"
                                            strokeLinecap="round"
                                            className="connection-signal-line"
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute left-[530px] top-[380px] -translate-x-1/2 -translate-y-1/2">
                            <div className="creator-node relative w-[430px] rounded-3xl border border-[#2A2A35] bg-[#18181F]/92 backdrop-blur-xl shadow-[0_0_60px_rgba(244,63,94,0.14)]">
                                <div className="rounded-t-3xl border-b border-[#2A2A35] bg-[#1A1A20]/90 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                            <Fingerprint className="h-4 w-4 text-rose-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">Studio Module</p>
                                            <h2 className="text-base font-semibold text-white/90">Character Lab</h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-6">
                                    <p className="text-sm leading-relaxed text-white/65">
                                        Build character systems from guided attributes, route them through production image models, and save generated variants directly into your Element Library.
                                    </p>
                                    <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                                        <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-rose-300">Lab Mode</span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Library Sync</span>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-rose-400"></div>
                                </div>
                                <div className="absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-rose-400"></div>
                                </div>
                            </div>
                        </div>

                        {creatorLabNodeSlots.map((slot) => {
                            const Icon = slot.icon;

                            return (
                                <div
                                    key={`creator-node-${slot.label}`}
                                    className="creator-chip-node pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: slot.x, top: slot.y }}
                                >
                                    <div className="relative flex w-[240px] items-center gap-2 rounded-2xl border border-[#2A2A35] bg-[#18181F]/95 px-3.5 py-2 text-sm text-white/80 shadow-[0_12px_28px_rgba(5,5,10,0.4)]">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-500/0 via-rose-500/16 to-rose-500/0"></div>
                                        <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                            <Icon className={`h-3.5 w-3.5 ${slot.iconColor}`} />
                                        </div>
                                        <div className="relative min-w-0">
                                            <p className="truncate text-xs font-semibold tracking-tight text-white/88">{slot.label}</p>
                                            <p className="truncate text-[10px] text-white/45">{slot.subLabel}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pointer-events-none absolute left-[128px] top-[198px] h-1.5 w-1.5 rounded-full bg-rose-300/80 shadow-[0_0_10px_rgba(253,164,175,0.75)]"></div>
                        <div className="pointer-events-none absolute right-[130px] bottom-[182px] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.6)]"></div>
                    </div>
                </div>


                {/* --- MODELS CONSTELLATION HUB (Top Left) --- */}
                <div className="models-cluster absolute top-[1480px] left-[1480px] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                    <div className="relative h-[760px] w-[1240px]">
                        <div className="pointer-events-none absolute left-[340px] top-[300px] h-[220px] w-[220px] rounded-full bg-indigo-500/10 blur-3xl"></div>
                        <div className="pointer-events-none absolute right-[210px] top-[130px] h-[180px] w-[180px] rounded-full bg-blue-500/10 blur-3xl"></div>

                        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1240 760" fill="none" aria-hidden="true">
                            {modelNodeSlots.map((slot, index) => {
                                const centerX = 620;
                                const centerY = 380;
                                const deltaX = slot.x - centerX;
                                const deltaY = slot.y - centerY;
                                const controlX = centerX + deltaX * 0.45 + ((index % 4) - 1.5) * 22;
                                const controlY = centerY + deltaY * 0.5 + ((index % 5) - 2) * 18;
                                const connectorOpacity = index % 3 === 0 ? 0.36 : index % 2 === 0 ? 0.24 : 0.18;

                                return (
                                    <g key={`model-link-${index}`}>
                                        <path
                                            d={`M ${centerX} ${centerY} Q ${controlX} ${controlY} ${slot.x} ${slot.y}`}
                                            stroke={`rgba(129, 140, 248, ${connectorOpacity})`}
                                            strokeWidth={index % 3 === 0 ? 2.2 : 1.5}
                                            strokeDasharray={index % 2 === 0 ? '9 8' : '6 12'}
                                            className="connection-line"
                                        />
                                        <path
                                            d={`M ${centerX} ${centerY} Q ${controlX} ${controlY} ${slot.x} ${slot.y}`}
                                            stroke="rgba(165, 180, 252, 0.82)"
                                            strokeWidth="2"
                                            strokeDasharray="2 22"
                                            strokeLinecap="round"
                                            className="connection-signal-line"
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute left-[620px] top-[380px] -translate-x-1/2 -translate-y-1/2">
                            <div className="model-hub-node relative w-[430px] rounded-3xl border border-[#2A2A35] bg-[#18181F]/92 backdrop-blur-xl shadow-[0_0_60px_rgba(99,102,241,0.16)]">
                                <div className="rounded-t-3xl border-b border-[#2A2A35] bg-[#1A1A20]/90 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                            <Sparkles className="h-4 w-4 text-indigo-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">Powered Stack</p>
                                            <h2 className="text-base font-semibold text-white/90">Latest AI Models, Unified</h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-6">
                                    <p className="text-sm leading-relaxed text-white/65">
                                        Powered by the latest image, video, and reasoning models. This constellation continuously rotates models in and out so your stack always reflects the current frontier.
                                    </p>
                                    <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">14 Engines</span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Live Routing</span>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-indigo-400"></div>
                                </div>
                                <div className="absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                </div>
                            </div>
                        </div>

                        {modelNodeSlots.map((slot, index) => {
                            const model = modelCatalog[modelSlotIndices[index] % modelCatalog.length];
                            const Icon = model.icon;
                            const isSwapping = activeModelSwapSlots.includes(index);
                            const isPairedSwap = pairedModelSwapSlots.includes(index);

                            return (
                                <div
                                    key={`model-slot-${index}`}
                                    className="model-star-node pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: slot.x, top: slot.y }}
                                >
                                    <div className={`relative flex items-center gap-2 rounded-2xl border border-[#2A2A35] bg-[#18181F]/95 px-3.5 py-2 text-sm text-white/80 shadow-[0_12px_28px_rgba(5,5,10,0.4)] transition-all ${isPairedSwap ? 'duration-500 ring-1 ring-indigo-300/30 shadow-[0_0_26px_rgba(129,140,248,0.18)]' : 'duration-300'} ${isSwapping ? 'opacity-0 scale-90 blur-[1px]' : 'opacity-100 scale-100'}`}>
                                        <div className={`model-star-glow absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/16 to-blue-400/0 ${isPairedSwap ? 'opacity-80' : ''}`}></div>
                                        {isPairedSwap ? <div className="absolute -inset-[2px] rounded-2xl border border-indigo-300/25 animate-pulse"></div> : null}
                                        <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                            <Icon className={`h-3.5 w-3.5 ${model.iconColor}`} />
                                        </div>
                                        <span className="relative whitespace-nowrap font-semibold tracking-tight">{model.label}</span>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pointer-events-none absolute left-[96px] top-[104px] h-1.5 w-1.5 rounded-full bg-indigo-300/70 shadow-[0_0_12px_rgba(165,180,252,0.75)]"></div>
                        <div className="pointer-events-none absolute right-[132px] top-[144px] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.6)]"></div>
                        <div className="pointer-events-none absolute right-[208px] bottom-[96px] h-1.5 w-1.5 rounded-full bg-blue-300/70 shadow-[0_0_12px_rgba(147,197,253,0.75)]"></div>
                    </div>
                </div>


                {/* --- FEATURES CONSTELLATION (Bottom Left) --- */}
                <div className="features-cluster absolute top-[4200px] left-[1500px] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                    <div className="relative h-[760px] w-[1060px]">
                        <div className="pointer-events-none absolute left-[420px] top-[290px] h-[220px] w-[220px] rounded-full bg-blue-500/10 blur-3xl"></div>

                        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1060 760" fill="none" aria-hidden="true">
                            {featuresNodeSlots.map((slot, index) => {
                                const centerX = 530;
                                const centerY = 380;
                                const deltaX = slot.x - centerX;
                                const deltaY = slot.y - centerY;
                                const controlX = centerX + deltaX * 0.52 + ((index % 4) - 1.5) * 16;
                                const controlY = centerY + deltaY * 0.56 + ((index % 3) - 1) * 14;
                                const connectorPath = `M ${centerX} ${centerY} Q ${controlX} ${controlY} ${slot.x} ${slot.y}`;

                                return (
                                    <g key={`features-link-${slot.label}`}>
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(96, 165, 250, 0.24)"
                                            strokeWidth="1.9"
                                            strokeDasharray="8 10"
                                            className="connection-line"
                                        />
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(147, 197, 253, 0.82)"
                                            strokeWidth="2.2"
                                            strokeDasharray="2 22"
                                            strokeLinecap="round"
                                            className="connection-signal-line"
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute left-[530px] top-[380px] -translate-x-1/2 -translate-y-1/2">
                            <div className="feature-hub-node relative w-[430px] rounded-3xl border border-[#2A2A35] bg-[#18181F]/92 backdrop-blur-xl shadow-[0_0_60px_rgba(59,130,246,0.16)]">
                                <div className="rounded-t-3xl border-b border-[#2A2A35] bg-[#1A1A20]/90 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                            <Activity className="h-4 w-4 text-blue-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">Core Layer</p>
                                            <h2 className="text-base font-semibold text-white/90">Engineered for focus</h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-6">
                                    <p className="text-sm leading-relaxed text-white/65">
                                        Purpose-built tooling for high-output teams: distraction-free creation, production-grade speed, and modular routing across every generation workflow.
                                    </p>
                                    <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                                        <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2.5 py-1 text-blue-300">3 Core Capabilities</span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Ops Ready</span>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                </div>
                                <div className="absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                                </div>
                            </div>
                        </div>

                        {featuresNodeSlots.map((slot) => {
                            const Icon = slot.icon;

                            return (
                                <div
                                    key={`features-node-${slot.label}`}
                                    className="features-chip-node absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                    style={{ left: slot.x, top: slot.y }}
                                >
                                    <div className="group relative w-[268px] rounded-2xl border border-[#2A2A35] bg-[#18181F]/95 px-4 py-3 text-white/85 shadow-[0_12px_28px_rgba(5,5,10,0.4)] transition-transform hover:-translate-y-1">
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/12 to-blue-500/0"></div>
                                        <div className="relative flex items-center gap-2.5">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                                <Icon className={`h-4 w-4 ${slot.iconColor}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white/90">{slot.label}</p>
                                                <p className="truncate text-[11px] text-white/45">{slot.subLabel}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pointer-events-none absolute left-[120px] top-[220px] h-1.5 w-1.5 rounded-full bg-blue-300/80 shadow-[0_0_10px_rgba(147,197,253,0.75)]"></div>
                        <div className="pointer-events-none absolute right-[126px] top-[220px] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.6)]"></div>
                    </div>
                </div>


                {/* --- TEMPLATES CONSTELLATION (Top Right) --- */}
                <div className="templates-cluster absolute top-[1500px] left-[4500px] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                    <div className="relative h-[760px] w-[1060px]">
                        <div className="pointer-events-none absolute left-[420px] top-[290px] h-[220px] w-[220px] rounded-full bg-purple-500/10 blur-3xl"></div>

                        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1060 760" fill="none" aria-hidden="true">
                            {templatesNodeSlots.map((slot, index) => {
                                const centerX = 530;
                                const centerY = 380;
                                const deltaX = slot.x - centerX;
                                const deltaY = slot.y - centerY;
                                const controlX = centerX + deltaX * 0.52 + ((index % 4) - 1.5) * 16;
                                const controlY = centerY + deltaY * 0.56 + ((index % 3) - 1) * 14;
                                const connectorPath = `M ${centerX} ${centerY} Q ${controlX} ${controlY} ${slot.x} ${slot.y}`;
                                const titleControlX = (slot.x + slot.titleX) / 2 + (slot.titleX > slot.x ? 14 : slot.titleX < slot.x ? -14 : 0);
                                const titleControlY = (slot.y + slot.titleY) / 2 + (slot.titleY > slot.y ? 10 : -10);
                                const titleConnectorPath = `M ${slot.x} ${slot.y} Q ${titleControlX} ${titleControlY} ${slot.titleX} ${slot.titleY}`;

                                return (
                                    <g key={`templates-link-${slot.label}`}>
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(192, 132, 252, 0.24)"
                                            strokeWidth="1.9"
                                            strokeDasharray="8 10"
                                            className="connection-line"
                                        />
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(216, 180, 254, 0.82)"
                                            strokeWidth="2.2"
                                            strokeDasharray="2 22"
                                            strokeLinecap="round"
                                            className="connection-signal-line"
                                        />
                                        <path
                                            d={titleConnectorPath}
                                            stroke="rgba(192, 132, 252, 0.2)"
                                            strokeWidth="1.6"
                                            strokeDasharray="7 11"
                                            className="connection-line"
                                        />
                                        <path
                                            d={titleConnectorPath}
                                            stroke="rgba(216, 180, 254, 0.74)"
                                            strokeWidth="1.8"
                                            strokeDasharray="2 18"
                                            strokeLinecap="round"
                                            className="connection-signal-line"
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute left-[530px] top-[380px] -translate-x-1/2 -translate-y-1/2">
                            <div className="template-hub-node relative w-[430px] rounded-3xl border border-[#2A2A35] bg-[#18181F]/92 backdrop-blur-xl shadow-[0_0_60px_rgba(168,85,247,0.16)]">
                                <div className="rounded-t-3xl border-b border-[#2A2A35] bg-[#1A1A20]/90 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                            <Layers className="h-4 w-4 text-purple-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">Template Engine</p>
                                            <h2 className="text-base font-semibold text-white/90">Production-ready templates</h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-6">
                                    <p className="text-sm leading-relaxed text-white/65">
                                        Start from proven content systems for photoshoots, character consistency, UGC ads, product campaigns, and batch production workflows.
                                    </p>
                                    <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                                        <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-1 text-purple-300">5 Core Templates</span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Launch Faster</span>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                                </div>
                                <div className="absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                                </div>
                            </div>
                        </div>

                        {templatesNodeSlots.map((slot) => (
                            <Link
                                key={`templates-image-node-${slot.label}`}
                                href="/canvas"
                                className="templates-image-node absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                style={{ left: slot.x, top: slot.y }}
                            >
                                <img
                                    src={slot.imageSrc}
                                    alt={slot.label}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(event) => {
                                        event.currentTarget.src = slot.fallbackSrc;
                                    }}
                                    className="h-[206px] w-[366px] rounded-xl object-cover shadow-[0_16px_34px_rgba(5,5,10,0.45)] transition-transform duration-700 hover:scale-[1.02]"
                                />
                            </Link>
                        ))}

                        {templatesNodeSlots.map((slot) => {
                            const Icon = slot.icon;

                            return (
                                <Link
                                    key={`templates-title-node-${slot.label}`}
                                    href="/canvas"
                                    className="templates-title-node templates-chip-node absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                    style={{ left: slot.titleX, top: slot.titleY }}
                                >
                                    <div className="group inline-flex max-w-[260px] items-center gap-2 rounded-2xl border border-[#2A2A35] bg-[#18181F]/95 px-3.5 py-2.5 text-white/85 shadow-[0_10px_22px_rgba(5,5,10,0.4)] transition-transform hover:-translate-y-0.5">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                            <Icon className={`h-3.5 w-3.5 ${slot.iconColor}`} />
                                        </div>
                                        <p className="truncate text-xs font-semibold text-white/90">{slot.label}</p>
                                    </div>
                                </Link>
                            );
                        })}

                        <div className="pointer-events-none absolute left-[120px] top-[188px] h-1.5 w-1.5 rounded-full bg-purple-300/80 shadow-[0_0_10px_rgba(216,180,254,0.75)]"></div>
                        <div className="pointer-events-none absolute right-[126px] top-[220px] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.6)]"></div>
                    </div>
                </div>


                {/* --- PRICING CONSTELLATION (Bottom Right) --- */}
                <div className="pricing-cluster absolute top-[4200px] left-[4500px] -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                    <div className="relative h-[760px] w-[1060px]">
                        <div className="pointer-events-none absolute left-[420px] top-[290px] h-[220px] w-[220px] rounded-full bg-emerald-500/10 blur-3xl"></div>

                        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 1060 760" fill="none" aria-hidden="true">
                            {pricingNodeSlots.map((slot, index) => {
                                const centerX = 530;
                                const centerY = 380;
                                const deltaX = slot.x - centerX;
                                const deltaY = slot.y - centerY;
                                const controlX = centerX + deltaX * 0.52 + ((index % 4) - 1.5) * 16;
                                const controlY = centerY + deltaY * 0.56 + ((index % 3) - 1) * 14;
                                const connectorPath = `M ${centerX} ${centerY} Q ${controlX} ${controlY} ${slot.x} ${slot.y}`;

                                return (
                                    <g key={`pricing-link-${slot.label}`}>
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(52, 211, 153, 0.24)"
                                            strokeWidth={slot.highlight ? 2.2 : 1.8}
                                            strokeDasharray={slot.highlight ? '9 9' : '7 11'}
                                            className="connection-line"
                                        />
                                        <path
                                            d={connectorPath}
                                            stroke="rgba(110, 231, 183, 0.84)"
                                            strokeWidth={slot.highlight ? 2.6 : 2.2}
                                            strokeDasharray="2 22"
                                            strokeLinecap="round"
                                            className="connection-signal-line"
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute left-[530px] top-[380px] -translate-x-1/2 -translate-y-1/2">
                            <div className="pricing-node relative w-[430px] rounded-3xl border border-[#2A2A35] bg-[#18181F]/92 backdrop-blur-xl shadow-[0_0_60px_rgba(16,185,129,0.16)]">
                                <div className="rounded-t-3xl border-b border-[#2A2A35] bg-[#1A1A20]/90 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                            <Star className="h-4 w-4 text-emerald-300" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">Billing Layer</p>
                                            <h2 className="text-base font-semibold text-white/90">Pay as you generate</h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-6">
                                    <p className="text-sm leading-relaxed text-white/65">
                                        No recurring subscriptions. Buy credits only when you need them, scale your usage with demand, and keep unused credits available for future runs.
                                    </p>
                                    <div className="mt-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">No Expiry</span>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Usage-Based</span>
                                    </div>
                                </div>
                                <div className="absolute top-1/2 -right-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                                </div>
                                <div className="absolute top-1/2 -left-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#18181F] bg-[#2A2A35]">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                                </div>
                            </div>
                        </div>

                        {pricingNodeSlots.map((slot) => {
                            const Icon = slot.icon;
                            const isPro = slot.label === 'Pro';
                            const isStudio = slot.label === 'Studio';
                            const badgeLabel = isPro ? 'Best Value' : isStudio ? 'Studio' : null;

                            return (
                                <div
                                    key={`pricing-node-${slot.label}`}
                                    className="pricing-chip-node absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                    style={{ left: slot.x, top: slot.y }}
                                >
                                    {isPro ? (
                                        <div className="pointer-events-none absolute inset-[-18px] rounded-3xl bg-blue-500/24 blur-[26px]"></div>
                                    ) : null}
                                    {isStudio ? (
                                        <div className="pointer-events-none absolute inset-[-18px] rounded-3xl bg-purple-500/24 blur-[26px]"></div>
                                    ) : null}

                                    <div className={`group relative z-10 w-[264px] rounded-2xl bg-[#0A0A0C] p-5 text-white/80 transition-all ${isPro
                                        ? 'border-2 border-blue-500 shadow-[0_0_34px_rgba(59,130,246,0.2)]'
                                        : isStudio
                                            ? 'border border-purple-500/55 shadow-[0_0_26px_rgba(168,85,247,0.16)]'
                                            : 'border border-[#2A2A35] shadow-xl'
                                        }`}>
                                        {badgeLabel ? (
                                            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white ${isPro ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                                {badgeLabel}
                                            </div>
                                        ) : null}

                                        <div className="mb-3 flex items-center gap-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                                <Icon className={`h-3.5 w-3.5 ${slot.iconColor}`} />
                                            </div>
                                            <h3 className="truncate text-xl font-semibold text-white">{slot.label}</h3>
                                        </div>

                                        <div className="mb-5 flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-white">{slot.price}</span>
                                        </div>

                                        <div className={`rounded-xl p-3 border mb-4 ${isPro ? 'border-blue-500/30 bg-white/5' : isStudio ? 'border-purple-500/30 bg-white/5' : 'border-white/5 bg-white/5'}`}>
                                            <p className="text-xs font-medium text-white/90">{slot.credits}</p>
                                            <p className={`mt-1 text-[10px] ${slot.note.startsWith('Save') ? 'text-emerald-400' : 'text-white/50'}`}>{slot.note}</p>
                                        </div>

                                        <Link
                                            href="/billing"
                                            className={`block w-full rounded-lg py-2 text-center text-xs font-semibold text-white transition-colors ${isPro
                                                ? 'bg-blue-500 hover:bg-blue-600'
                                                : isStudio
                                                    ? 'bg-purple-500 hover:bg-purple-600'
                                                    : 'bg-white/10 group-hover:bg-white/20'
                                                }`}
                                        >
                                            Buy Pack
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pointer-events-none absolute left-[120px] top-[188px] h-1.5 w-1.5 rounded-full bg-emerald-300/80 shadow-[0_0_10px_rgba(110,231,183,0.75)]"></div>
                        <div className="pointer-events-none absolute right-[126px] top-[220px] h-1 w-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.6)]"></div>
                    </div>
                </div>

            </div>

            {/* Auth Modal */}
            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </div>
    );
}
