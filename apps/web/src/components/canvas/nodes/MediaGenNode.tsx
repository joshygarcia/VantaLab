import { Handle, Position } from 'reactflow';
import { FileVideo, Image as ImageIcon, Type } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';

type MediaGenNodeProps = {
  id: string;
  data: {
    label: string;
    status?: 'idle' | 'processing' | 'succeeded' | 'failed';
    mediaUrl?: string;
    type: 'video' | 'image';
  };
  isConnectable: boolean;
  selected?: boolean;
};

export function MediaGenNode({ id, data, isConnectable, selected = false }: MediaGenNodeProps) {
  const OutputIcon = data.type === 'video' ? FileVideo : ImageIcon;
  const edges = useCanvasStore((state) => state.edges);
  const inputConnected = edges.some((edge) => edge.target === id && (edge.targetHandle === 'in' || !edge.targetHandle));
  const outputConnected = edges.some((edge) => edge.source === id && (edge.sourceHandle === 'out' || !edge.sourceHandle));

  return (
    <div className="relative w-[310px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectable}
        className={`!h-3 !w-3 !border-2 !border-slate-950 !bg-slate-300 ${inputConnected ? '!bg-sky-400' : ''}`}
      />
      <div
        className={`pointer-events-none absolute left-[-18px] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${selected || inputConnected ? 'opacity-100' : 'opacity-0'} ${inputConnected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : ''}`}
        aria-hidden="true"
      >
        <Type size={12} strokeWidth={2.5} />
      </div>

      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-sm font-medium">
        <span>{data.label}</span>
        {data.status === 'processing' ? <span className="text-amber-300">⏳</span> : null}
        {data.status === 'succeeded' ? <span className="text-emerald-300">✓</span> : null}
        {data.status === 'failed' ? <span className="text-rose-300">✕</span> : null}
      </div>

      <div className="p-3">
        {!data.mediaUrl && data.status !== 'processing' ? (
          <div className="flex h-[188px] items-center justify-center rounded-md border border-white/5 bg-ink-900 text-sm text-zinc-500">
            Awaiting input...
          </div>
        ) : null}

        {data.status === 'processing' ? (
          <div className="flex h-[188px] items-center justify-center rounded-md border border-sky-500/30 bg-sky-950/20 text-sm text-sky-300">
            Generating {data.type}...
          </div>
        ) : null}

        {data.mediaUrl && data.type === 'video' ? (
          <video src={data.mediaUrl} controls autoPlay loop muted className="h-[188px] w-full rounded-md object-cover" />
        ) : null}

        {data.mediaUrl && data.type === 'image' ? (
          <img src={data.mediaUrl} alt="Generated result" className="h-[188px] w-full rounded-md object-cover" />
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={isConnectable}
        className={`!h-3 !w-3 !border-2 !border-slate-950 !bg-slate-300 ${outputConnected ? '!bg-emerald-400' : ''}`}
      />
      <div
        className={`pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${selected || outputConnected ? 'opacity-100' : 'opacity-0'} ${outputConnected ? 'border-emerald-400 text-emerald-400 bg-emerald-950/30' : ''}`}
        aria-hidden="true"
      >
        <OutputIcon size={12} strokeWidth={2.5} />
      </div>
    </div>
  );
}
