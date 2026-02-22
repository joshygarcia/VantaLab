import { Handle, Position } from 'reactflow';
import { User, Image as ImageIcon, Palette, Ban, X, Plus } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { BaseNodeData } from './BaseNode';
import { useState, useRef, DragEvent } from 'react';

type IdentityVaultNodeProps = {
    id: string;
    data: BaseNodeData;
    isConnectable: boolean;
    selected?: boolean;
};

const iconPortClass = (show: boolean, connected: boolean) =>
    [
        'pointer-events-none absolute -translate-y-1/2 rounded-full border bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200',
        show ? 'opacity-100' : 'opacity-0',
        connected ? 'border-violet-400 text-violet-400 bg-violet-950/30' : 'border-white/10'
    ].join(' ');

export function IdentityVaultNode({ id, data, isConnectable, selected = false }: IdentityVaultNodeProps) {
    const updateNodeControl = useCanvasStore((state) => state.updateNodeControl);
    const edges = useCanvasStore((state) => state.edges);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Parse stored seed images (comma-separated data URLs or external URLs)
    const seedImagesControl = data.controls?.find((c) => c.id.startsWith('seed_images_'));
    const seedImagesRaw = seedImagesControl?.value || '';
    const seedImages = seedImagesRaw ? seedImagesRaw.split('|||').filter(Boolean) : [];

    // Parse hex colors
    const colorsControl = data.controls?.find((c) => c.id.startsWith('brand_colors_'));
    const colorsRaw = colorsControl?.value || '';
    const hexColors = colorsRaw ? colorsRaw.split(',').filter(Boolean) : [];

    // Negative prompt
    const negativePromptControl = data.controls?.find((c) => c.id.startsWith('negative_'));

    // Handle connections
    const matchesHandleId = (actual: string | null | undefined, expected: string) =>
        actual === expected || actual?.startsWith(`${expected}_`) || actual?.startsWith(`${expected}-`);

    const isOutputConnected = (handleIds: string[]) =>
        edges.some(
            (edge) =>
                edge.source === id &&
                !!edge.sourceHandle &&
                handleIds.some((hid) => matchesHandleId(edge.sourceHandle, hid))
        );

    const imageOutConnected = isOutputConnected(['image-out', 'seed_out']);
    const promptOutConnected = isOutputConnected(['prompt-out', 'style_out']);

    // ── Seed Image Management ────────────────────────────────────────
    const addSeedImage = (dataUrl: string) => {
        const updated = [...seedImages, dataUrl].join('|||');
        updateNodeControl(id, 'seed_images_', updated);
    };

    const removeSeedImage = (index: number) => {
        const updated = seedImages.filter((_, i) => i !== index).join('|||');
        updateNodeControl(id, 'seed_images_', updated);
    };

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;
        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    addSeedImage(reader.result);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleFileSelect(e.dataTransfer.files);
    };

    // ── Hex Color Management ─────────────────────────────────────────
    const addColor = () => {
        const colors = [...hexColors, '#8B5CF6'];
        updateNodeControl(id, 'brand_colors_', colors.join(','));
    };

    const removeColor = (index: number) => {
        const colors = hexColors.filter((_, i) => i !== index);
        updateNodeControl(id, 'brand_colors_', colors.join(','));
    };

    const updateColor = (index: number, value: string) => {
        const colors = [...hexColors];
        colors[index] = value;
        updateNodeControl(id, 'brand_colors_', colors.join(','));
    };

    return (
        <div className="relative w-[360px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
            {/* Output handles */}
            <div className="absolute right-0 top-0 h-full w-0">
                <Handle
                    type="source"
                    position={Position.Right}
                    id="image-out"
                    isConnectable={isConnectable}
                    style={{ top: '35%' }}
                    className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${imageOutConnected ? '!bg-violet-400 !border-violet-950' : ''}`}
                />
                <div style={{ top: '35%' }} className={`${iconPortClass(selected || imageOutConnected, imageOutConnected)} absolute right-[-18px]`} aria-hidden="true">
                    <ImageIcon size={12} strokeWidth={2.5} />
                </div>

                <Handle
                    type="source"
                    position={Position.Right}
                    id="prompt-out"
                    isConnectable={isConnectable}
                    style={{ top: '65%' }}
                    className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${promptOutConnected ? '!bg-violet-400 !border-violet-950' : ''}`}
                />
                <div style={{ top: '65%' }} className={`${iconPortClass(selected || promptOutConnected, promptOutConnected)} absolute right-[-18px]`} aria-hidden="true">
                    <Palette size={12} strokeWidth={2.5} />
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/20">
                        <User size={13} className="text-violet-400" />
                    </div>
                    <span>{data.title || 'Identity Vault'}</span>
                </div>
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-400">PERSONA</span>
            </div>

            <div className="space-y-3 p-3">
                {/* Seed Images Section */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        <ImageIcon size={10} />
                        Seed Images
                    </label>
                    <div
                        className={`nodrag rounded-md border-2 border-dashed p-2 transition-colors duration-200 ${isDraggingOver
                                ? 'border-violet-400 bg-violet-950/20'
                                : 'border-white/10 bg-ink-900'
                            }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={handleDrop}
                    >
                        {seedImages.length > 0 ? (
                            <div className="grid grid-cols-4 gap-1.5">
                                {seedImages.map((img, index) => (
                                    <div key={`seed-${index}`} className="group relative overflow-hidden rounded">
                                        <img src={img} alt={`Seed ${index + 1}`} className="h-16 w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeSeedImage(index)}
                                            className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-black/80 text-white group-hover:flex"
                                        >
                                            <X size={8} />
                                        </button>
                                    </div>
                                ))}
                                {seedImages.length < 8 && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-16 items-center justify-center rounded border border-white/10 bg-ink-950 text-zinc-500 transition-colors hover:border-violet-400/30 hover:text-violet-400"
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex w-full flex-col items-center gap-1 py-4 text-zinc-500"
                            >
                                <ImageIcon size={20} />
                                <span className="text-xs">Drop images or click to upload</span>
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files)}
                    />
                </div>

                {/* Brand Colors Section */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        <Palette size={10} />
                        Brand Colors
                    </label>
                    <div className="nodrag flex flex-wrap items-center gap-1.5">
                        {hexColors.map((color, index) => (
                            <div key={`color-${index}`} className="group relative">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => updateColor(index, e.target.value)}
                                    className="nodrag h-8 w-8 cursor-pointer appearance-none rounded-md border border-white/10 bg-transparent p-0.5"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeColor(index)}
                                    className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                                >
                                    <X size={7} />
                                </button>
                            </div>
                        ))}
                        {hexColors.length < 6 && (
                            <button
                                type="button"
                                onClick={addColor}
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-white/10 text-zinc-500 transition-colors hover:border-violet-400/40 hover:text-violet-400"
                            >
                                <Plus size={12} />
                            </button>
                        )}
                    </div>
                    {hexColors.length > 0 && (
                        <div className="flex gap-1 text-[10px] text-zinc-600">
                            {hexColors.map((c) => c.toUpperCase()).join(' · ')}
                        </div>
                    )}
                </div>

                {/* Negative Prompt Section */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        <Ban size={10} />
                        Negative Prompt
                    </label>
                    <textarea
                        className="nodrag min-h-[56px] w-full resize-y rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20"
                        placeholder="Things to avoid: bad quality, distortion..."
                        value={negativePromptControl?.value || ''}
                        onChange={(e) => updateNodeControl(id, 'negative_', e.target.value)}
                        rows={2}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-3 py-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{seedImages.length} seed image{seedImages.length !== 1 ? 's' : ''} · {hexColors.length} color{hexColors.length !== 1 ? 's' : ''}</span>
                    <span className="text-violet-400/60">Identity outputs →</span>
                </div>
            </div>
        </div>
    );
}
