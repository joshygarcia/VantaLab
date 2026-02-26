import { AlignLeft, Check, ChevronDown, FileVideo, Image as ImageIcon, Link2, LoaderCircle, Play, Settings, Trash2, Type, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Handle, NodeResizer, Position } from 'reactflow';

import { useCanvasStore } from '@/store/canvas-store';
import { AddNodeType } from '../add-node-menu';

export type BaseNodeData = {
  title?: string;
  label?: string;
  icon?: 'settings' | 'image' | 'video' | 'zap' | 'text' | 'align-left';
  status?: 'idle' | 'processing' | 'succeeded' | 'failed';
  runnable?: boolean;
  creditCost?: number;
  type?: 'video' | 'image';
  text?: string;
  mediaUrl?: string;
  inputs?: Array<{ id: string; label?: string; type?: string }>;
  outputs?: Array<{ id: string; label?: string; type?: string }>;
  controls?: Array<
    | { type: 'textarea'; id: string; label?: string; value: string; placeholder?: string }
    | { type: 'select'; id: string; label?: string; value: string; options: Array<{ label: string; value: string }> }
  >;
  preview?:
    | { type: 'image'; url: string }
    | { type: 'video'; url: string }
    | { type: 'placeholder'; text: string };
  resultMedia?: Array<{ type: 'image' | 'video'; url: string }>;
  selectedResultIndex?: number;
};

type MainNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

type RunNodeMode = 'node-only' | 'chain-all' | 'upstream-and-self' | 'self-and-downstream';

const RUN_NODE_EVENT = 'persona:run-node';
const QUICK_CONNECT_NODE_EVENT = 'persona:quick-connect-node';
const DELETE_NODE_EVENT = 'persona:delete-node';

const RUN_MODE_OPTIONS: Array<{ value: RunNodeMode; label: string }> = [
  { value: 'node-only', label: 'Run this node' },
  { value: 'chain-all', label: 'Run this full chain' },
  { value: 'upstream-and-self', label: 'Run previous + this node' },
  { value: 'self-and-downstream', label: 'Run this + following nodes' }
];

const QUICK_CONNECT_OPTIONS: Array<{ type: AddNodeType; label: string }> = [
  { type: 'text-prompt', label: 'Text Prompt' },
  { type: 'image-generator', label: 'Image Generator' }
];

const ICONS = {
  settings: Settings,
  image: ImageIcon,
  video: FileVideo,
  zap: Zap,
  text: Type,
  'align-left': AlignLeft
};

const getPortIcon = (signature: string) => {
  if (signature.includes('prompt') || signature.includes('text') || signature.includes('idea')) {
    return <Type size={12} strokeWidth={2.5} />;
  }
  if (signature.includes('image') || signature.includes('asset') || signature.includes('upload')) {
    return <ImageIcon size={12} strokeWidth={2.5} />;
  }
  if (signature.includes('video') || signature.includes('motion')) {
    return <FileVideo size={12} strokeWidth={2.5} />;
  }
  if (signature.includes('list') || signature.includes('item')) {
    return <AlignLeft size={12} strokeWidth={2.5} />;
  }
  return <Zap size={12} strokeWidth={2.5} />;
};

const portBadgeClass = (
  show: boolean,
  connected: boolean,
  side: 'left' | 'right'
) =>
  [
    'pointer-events-none absolute -translate-y-1/2 rounded-full border bg-ink-900 p-1.5 text-zinc-300 transition-all duration-200 ease-out',
    show
      ? 'opacity-100 scale-100 translate-x-0'
      : `opacity-0 scale-90 ${side === 'left' ? '-translate-x-1' : 'translate-x-1'}`,
    connected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : 'border-white/10'
  ].join(' ');

const portHandleClass = (connected: boolean, show: boolean) =>
  [
    '!h-5 !w-5 !border-2 !border-[#1a1b1f] !bg-zinc-300 transition-all duration-200',
    show ? 'opacity-100 scale-100' : 'opacity-0 scale-75 !pointer-events-none',
    connected ? '!bg-sky-400 !border-sky-950' : ''
  ].join(' ');

const matchesHandle = (actual: string | null | undefined, expected: string) =>
  actual === expected || actual?.startsWith(`${expected}_`) || actual?.startsWith(`${expected}-`);

const selectTriggerClass = (open: boolean) =>
  [
    'nodrag inline-flex h-9 items-center gap-2 rounded-full border border-transparent px-3 text-xs font-semibold transition-all duration-200 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_14px_rgba(0,0,0,0.26)]',
    open
      ? 'border-sky-400/60 bg-[linear-gradient(180deg,#1c2736_0%,#151c28_100%)] text-sky-100'
      : 'bg-[linear-gradient(180deg,#1f2530_0%,#161b25_100%)] text-zinc-100 hover:border-transparent hover:bg-[linear-gradient(180deg,#252d3b_0%,#1b222f_100%)]'
  ].join(' ');

const parseAspectRatio = (value?: string) => {
  if (!value) {
    return null;
  }

  const parts = value.split(':');
  if (parts.length !== 2) {
    return null;
  }

  const width = Number(parts[0]);
  const height = Number(parts[1]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return width / height;
};

export function MainNode({ id, data, isConnectable, selected = false }: MainNodeProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isCursorNear, setIsCursorNear] = useState(false);
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [quickConnectMenuOpen, setQuickConnectMenuOpen] = useState(false);
  const edges = useCanvasStore((state) => state.edges);
  const updateNodeText = useCanvasStore((state) => state.updateNodeText);
  const updateNodeControl = useCanvasStore((state) => state.updateNodeControl);
  const Icon = data.icon ? ICONS[data.icon] : null;

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const near =
        event.clientX >= rect.left - 96 &&
        event.clientX <= rect.right + 96 &&
        event.clientY >= rect.top - 96 &&
        event.clientY <= rect.bottom + 96;
      setIsCursorNear((v) => (v === near ? v : near));
    };

    const onLeave = () => setIsCursorNear(false);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    if (selected) {
      return;
    }
    setOpenSelectId(null);
    setRunMenuOpen(false);
    setQuickConnectMenuOpen(false);
  }, [selected]);

  useEffect(() => {
    if (!openSelectId && !runMenuOpen && !quickConnectMenuOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpenSelectId(null);
        setRunMenuOpen(false);
        setQuickConnectMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenSelectId(null);
        setRunMenuOpen(false);
        setQuickConnectMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [openSelectId, quickConnectMenuOpen, runMenuOpen]);

  const title = data.title || data.label || 'Node';
  const showConnectionIcons = selected || isCursorNear;
  const inputs = data.inputs ?? [];
  const outputs = data.outputs ?? [];
  const textControls = (data.controls ?? []).filter((c) => c.type === 'textarea');
  const selectControls = (data.controls ?? []).filter((c) => c.type === 'select');
  const aspectControl = selectControls.find((control) => control.id.startsWith('aspect_'));
  const selectedAspectRatio = parseAspectRatio(aspectControl?.value);
  const lockMediaAspectRatio =
    !!selectedAspectRatio &&
    (data.icon === 'image' || data.icon === 'video' || data.type === 'image' || data.type === 'video');

  const primaryText = textControls[0];
  const extraText = textControls.slice(1);
  const isTextPromptLayout = data.icon === 'text' && inputs.length === 0;
  const canRunNode = data.runnable === true;
  const status = data.status ?? 'idle';
  const isProcessing = status === 'processing';
  const isFailed = status === 'failed';
  const selectedRingShadowClass =
    status === 'failed'
      ? 'shadow-[inset_0_0_0_2px_rgba(239,68,68,0.95)]'
      : status === 'processing'
        ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.9)]'
        : 'shadow-[inset_0_0_0_2px_#3d82ff]';

  const statusBadge = useMemo(() => {
    if (status === 'processing') {
      return {
        label: 'Running',
        className: 'border-sky-400/35 bg-sky-500/15 text-sky-100',
        icon: <LoaderCircle size={12} className="animate-spin" />
      };
    }
    if (status === 'succeeded') {
      return {
        label: 'Done',
        className: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100',
        icon: <Check size={12} />
      };
    }
    if (status === 'failed') {
      return {
        label: 'Failed',
        className: 'border-red-400/35 bg-red-500/15 text-red-100',
        icon: <X size={12} />
      };
    }
    return null;
  }, [status]);

  const isConnected = (kind: 'input' | 'output', handleId: string) => {
    if (kind === 'input') {
      return edges.some((edge) => edge.target === id && matchesHandle(edge.targetHandle, handleId));
    }
    return edges.some((edge) => edge.source === id && matchesHandle(edge.sourceHandle, handleId));
  };

  const dispatchRun = (mode: RunNodeMode) => {
    window.dispatchEvent(
      new CustomEvent(RUN_NODE_EVENT, {
        detail: { nodeId: id, mode }
      })
    );
  };

  return (
    <div ref={ref} className="relative h-full w-full pt-8">
      {selected ? (
        <div className="absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-full pb-2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#141820]/92 p-1 shadow-[0_16px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="relative">
              <div className="inline-flex items-center">
                <button
                  type="button"
                  disabled={!canRunNode || isProcessing}
                  className="nodrag inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => dispatchRun('node-only')}
                >
                  <Play size={13} />
                  <span>Run</span>
                </button>
                <button
                  type="button"
                  disabled={!canRunNode || isProcessing}
                  className="nodrag inline-flex h-8 w-7 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => {
                    setRunMenuOpen((value) => !value);
                    setQuickConnectMenuOpen(false);
                  }}
                  aria-expanded={runMenuOpen}
                  aria-haspopup="menu"
                >
                  <ChevronDown size={14} className={runMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
              </div>

              {runMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[250px] rounded-xl border border-white/10 bg-[#131922] p-1 shadow-[0_20px_32px_rgba(0,0,0,0.55)]">
                  {RUN_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="nodrag flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        dispatchRun(option.value);
                        setRunMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="h-5 w-px bg-white/10" />

            <div className="relative">
              <button
                type="button"
                className="nodrag inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
                onClick={() => {
                  setQuickConnectMenuOpen((value) => !value);
                  setRunMenuOpen(false);
                }}
                aria-expanded={quickConnectMenuOpen}
                aria-haspopup="menu"
              >
                <Link2 size={13} />
                <span>Quick connect</span>
                <ChevronDown size={14} className={quickConnectMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {quickConnectMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[200px] rounded-xl border border-white/10 bg-[#131922] p-1 shadow-[0_20px_32px_rgba(0,0,0,0.55)]">
                  {QUICK_CONNECT_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      className="nodrag flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent(QUICK_CONNECT_NODE_EVENT, {
                            detail: { nodeId: id, type: option.type }
                          })
                        );
                        setQuickConnectMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="h-5 w-px bg-white/10" />

            <button
              type="button"
              className="nodrag inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(DELETE_NODE_EVENT, {
                    detail: { nodeId: id }
                  })
                )
              }
              aria-label="Delete node"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-5 top-0 flex items-center gap-2 text-sm font-semibold text-white">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2a2d33] text-zinc-200">
          {Icon ? <Icon size={12} /> : <Zap size={12} />}
        </span>
        <span>{title}</span>
      </div>
      {typeof data.creditCost === 'number' && data.creditCost > 0 ? (
        <span className="pointer-events-none absolute right-5 top-0 inline-flex items-center rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
          {data.creditCost} cr
        </span>
      ) : null}
      {statusBadge ? (
        <span
          className={`pointer-events-none absolute right-5 top-7 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusBadge.className}`}
        >
          {statusBadge.icon}
          {statusBadge.label}
        </span>
      ) : null}

      <div className="relative h-[calc(100%-2rem)] rounded-[22px] bg-[#1a1b1f] text-white shadow-[0_22px_50px_rgba(0,0,0,0.5)]">
        <NodeResizer
          isVisible={selected}
          minWidth={280}
          minHeight={220}
          keepAspectRatio={lockMediaAspectRatio}
          handleClassName="main-node-resize-handle"
          lineStyle={{ borderColor: 'rgba(61,130,255,0.6)', borderWidth: 0 }}
          handleStyle={{
            width: 30,
            height: 30,
            borderRadius: 9999,
            border: 'none',
            background: 'transparent',
            opacity: 0
          }}
        />
        {isProcessing ? <div className="main-node-status-running pointer-events-none absolute inset-0 z-20 rounded-[22px]" /> : null}
        {isFailed ? <div className="main-node-status-failed pointer-events-none absolute inset-0 z-20 rounded-[22px]" /> : null}
        {selected ? <div className={`pointer-events-none absolute inset-0 z-30 rounded-[22px] ${selectedRingShadowClass}`} /> : null}

        {inputs.map((input, index) => {
          const top = `${((index + 1) * 100) / (inputs.length + 1)}%`;
          const connected = isConnected('input', input.id);
          const showPort = showConnectionIcons || connected;
          const signature = `${input.id} ${input.label ?? ''} ${input.type ?? ''}`.toLowerCase();
          return (
            <div key={`in-${input.id}`} className="absolute left-0 top-0 h-full w-0">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                isConnectable={isConnectable}
                style={{ left: -42, top }}
                className={portHandleClass(connected, showPort)}
              />
              <div
                style={{ left: '-42px', top }}
                className={portBadgeClass(showPort, connected, 'left')}
                aria-hidden="true"
              >
                {getPortIcon(signature)}
              </div>
            </div>
          );
        })}

        {outputs.map((output, index) => {
          const top = `${((index + 1) * 100) / (outputs.length + 1)}%`;
          const connected = isConnected('output', output.id);
          const showPort = showConnectionIcons || connected;
          const signature = `${output.id} ${output.label ?? ''} ${output.type ?? ''}`.toLowerCase();
          return (
            <div key={`out-${output.id}`} className="absolute right-0 top-0 h-full w-0">
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                isConnectable={isConnectable}
                style={{ right: -42, top }}
                className={portHandleClass(connected, showPort)}
              />
              <div
                style={{ right: '-42px', top }}
                className={portBadgeClass(showPort, connected, 'right')}
                aria-hidden="true"
              >
                {getPortIcon(signature)}
              </div>
            </div>
          );
        })}

        <div className="relative h-full overflow-hidden rounded-[22px]">
          <div className="relative h-full">
            {data.preview?.type === 'image' ? (
              <img
                src={data.preview.url}
                alt="Preview"
                draggable={false}
                className="nodrag pointer-events-none h-full w-full select-none object-cover"
              />
            ) : null}
            {data.preview?.type === 'video' ? (
              <video
                src={data.preview.url}
                controls
                autoPlay
                loop
                muted
                className="nodrag pointer-events-none h-full w-full object-cover"
              />
            ) : null}
            {data.preview?.type === 'placeholder' ? (
              <div className="flex h-full items-center justify-center px-5 text-center text-sm text-zinc-500">{data.preview.text}</div>
            ) : null}
            {!data.preview ? <div className="h-full w-full bg-gradient-to-br from-[#1d1f24] via-[#1b1c1f] to-[#17181a]" /> : null}
          </div>

          <div
            className={`absolute inset-x-0 p-4 ${
              isTextPromptLayout
                ? 'top-0 bg-gradient-to-b from-black/65 via-black/25 to-transparent'
                : 'bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent'
            }`}
          >
            {primaryText ? (
              <textarea
                className="nodrag min-h-[54px] w-full resize-none bg-transparent px-1 py-2 text-sm text-zinc-300 outline-none placeholder:text-zinc-500"
                value={primaryText.value}
                placeholder={primaryText.placeholder || 'Describe...'}
                rows={1}
                onChange={(event) => {
                  if (primaryText.id.startsWith('text_') || primaryText.id === 'text') {
                    updateNodeText(id, event.target.value);
                    return;
                  }
                  updateNodeControl(id, primaryText.id, event.target.value);
                }}
              />
            ) : null}

            {selected && (selectControls.length > 0 || extraText.length > 0 || canRunNode) ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selectControls.map((control) => {
                  const selectedOption = control.options.find((option) => option.value === control.value);
                  const menuOpen = openSelectId === control.id;

                  return (
                    <div key={control.id} className="relative">
                      {menuOpen ? (
                        <div className="absolute bottom-full left-0 z-40 mb-2 min-w-full rounded-xl border border-white/10 bg-[#151920] p-1 shadow-[0_18px_34px_rgba(0,0,0,0.58)] backdrop-blur-md">
                          <div className="max-h-48 overflow-y-auto">
                            {control.options.map((option) => {
                              const active = option.value === control.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={`nodrag flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                                    active
                                      ? 'bg-sky-500/18 text-sky-200'
                                      : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                                  }`}
                                  onClick={() => {
                                    updateNodeControl(id, control.id, option.value);
                                    setOpenSelectId(null);
                                  }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className={selectTriggerClass(menuOpen)}
                        onClick={() => setOpenSelectId((current) => (current === control.id ? null : control.id))}
                        aria-expanded={menuOpen}
                        aria-haspopup="listbox"
                      >
                        <span className="max-w-[140px] truncate">{selectedOption?.label ?? control.value}</span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180 text-sky-200' : 'text-zinc-300'}`}
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                  );
                })}

                {extraText.map((control) => (
                  <textarea
                    key={control.id}
                    className="nodrag min-h-[48px] w-full rounded-md border border-white/10 bg-black/55 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-white/20"
                    value={control.value}
                    placeholder={control.placeholder || 'Enter value...'}
                    onChange={(event) => updateNodeControl(id, control.id, event.target.value)}
                    rows={2}
                  />
                ))}

                {canRunNode ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-300 text-black transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-500"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('persona:run-node', {
                          detail: { nodeId: id }
                        })
                      )
                    }
                  >
                    <Zap size={16} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

