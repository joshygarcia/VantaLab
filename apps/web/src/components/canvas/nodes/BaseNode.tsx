import { Handle, Position } from 'reactflow';
import { Settings, Image as ImageIcon, FileVideo, Zap, Type, AlignLeft } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';

export type BaseNodeData = {
  title: string;
  icon?: 'settings' | 'image' | 'video' | 'zap' | 'text' | 'align-left';
  status?: 'idle' | 'processing' | 'succeeded' | 'failed';
  inputs?: Array<{ id: string; label: string; type?: string }>;
  outputs?: Array<{ id: string; label: string; type?: string }>;
  controls?: Array<
    | { type: 'textarea'; id: string; label?: string; value: string; placeholder?: string; onChange?: (val: string) => void }
    | { type: 'select'; id: string; label?: string; value: string; options: Array<{ label: string; value: string }>; onChange?: (val: string) => void }
  >;
  preview?:
  | { type: 'image'; url: string }
  | { type: 'video'; url: string }
  | { type: 'placeholder'; text: string };
  resultMedia?: Array<{ type: 'image' | 'video'; url: string }>;
  selectedResultIndex?: number;
};

type BaseNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const IconMap = {
  settings: Settings,
  image: ImageIcon,
  video: FileVideo,
  zap: Zap,
  text: Type,
  'align-left': AlignLeft
};

const portBadgeClass = (showPort: boolean, connected: boolean) =>
  [
    'pointer-events-none absolute -translate-y-1/2 rounded-full border bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200',
    showPort ? 'opacity-100' : 'opacity-0',
    connected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : 'border-white/10'
  ].join(' ');

export function BaseNode({ id, data, isConnectable, selected = false }: BaseNodeProps) {
  const Icon = data.icon ? IconMap[data.icon] : null;
  const edges = useCanvasStore((state) => state.edges);

  const isHandleConnected = (kind: 'input' | 'output', handleId: string) => {
    const matches = (actualHandleId: string | null | undefined) =>
      actualHandleId === handleId ||
      actualHandleId?.startsWith(`${handleId}_`) ||
      actualHandleId?.startsWith(`${handleId}-`);

    if (kind === 'input') {
      return edges.some((edge) => edge.target === id && matches(edge.targetHandle));
    }

    return edges.some((edge) => edge.source === id && matches(edge.sourceHandle));
  };

  const renderPortIcon = (port: { id: string; label: string; type?: string }) => {
    const signature = `${port.type ?? ''} ${port.id} ${port.label}`.toLowerCase();

    if (
      signature.includes('prompt') ||
      signature.includes('text') ||
      signature.includes('idea') ||
      signature.includes('assistant') ||
      signature.includes('inspiration')
    ) {
      return <Type size={12} strokeWidth={2.5} />;
    }

    if (
      signature.includes('image') ||
      signature.includes('asset') ||
      signature.includes('upload') ||
      signature.includes('upscale')
    ) {
      return <ImageIcon size={12} strokeWidth={2.5} />;
    }

    if (signature.includes('video') || signature.includes('motion')) {
      return <FileVideo size={12} strokeWidth={2.5} />;
    }

    if (signature.includes('item') || signature.includes('list')) {
      return <AlignLeft size={12} strokeWidth={2.5} />;
    }

    return <Zap size={12} strokeWidth={2.5} />;
  };

  return (
    <div className="relative w-[330px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      {data.inputs?.map((input, index) => {
        const top = `${((index + 1) * 100) / (data.inputs!.length + 1)}%`;
        const isConnected = isHandleConnected('input', input.id);
        const showPort = selected || isConnected;

        return (
          <div key={`in-${input.id}`} style={{ top }} className="absolute left-[-18px]">
            <Handle
              type="target"
              position={Position.Left}
              id={input.id}
              isConnectable={isConnectable}
              className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 ${isConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
            />
            <div className={portBadgeClass(showPort, isConnected)} aria-hidden="true">
              {renderPortIcon(input)}
            </div>
          </div>
        );
      })}

      {data.outputs?.map((output, index) => {
        const top = `${((index + 1) * 100) / (data.outputs!.length + 1)}%`;
        const isConnected = isHandleConnected('output', output.id);
        const showPort = selected || isConnected;

        return (
          <div key={`out-${output.id}`} style={{ top }} className="absolute right-[-18px]">
            <Handle
              type="source"
              position={Position.Right}
              id={output.id}
              isConnectable={isConnectable}
              className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 ${isConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
            />
            <div className={portBadgeClass(showPort, isConnected)} aria-hidden="true">
              {renderPortIcon(output)}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-sm font-medium">
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={16} className="text-zinc-400" /> : null}
          <span>{data.title}</span>
        </div>
        {data.status === 'processing' ? <span className="text-amber-300">⏳</span> : null}
        {data.status === 'succeeded' ? <span className="text-emerald-300">✓</span> : null}
        {data.status === 'failed' ? <span className="text-rose-300">✕</span> : null}
      </div>

      <div className="space-y-2 p-3">
        {data.controls?.map((control) => (
          <div key={control.id} className="space-y-1">
            {control.label ? (
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                {control.label}
              </label>
            ) : null}

            {control.type === 'textarea' ? (
              <textarea
                className="nodrag min-h-[90px] w-full resize-y rounded-md border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20"
                placeholder={control.placeholder || 'Enter value...'}
                value={control.value || ''}
                onChange={(event) => control.onChange && control.onChange(event.target.value)}
                rows={4}
              />
            ) : null}

            {control.type === 'select' ? (
              <div className="relative nodrag">
                <select
                  className="nodrag h-10 w-full appearance-none rounded-md border border-white/10 bg-ink-900 px-3 pr-8 text-sm text-white outline-none transition-colors duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/20"
                  value={control.value}
                  onChange={(event) => control.onChange && control.onChange(event.target.value)}
                >
                  {control.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            ) : null}
          </div>
        ))}

        {data.preview ? (
          <div className="overflow-hidden rounded-md border border-white/5 bg-ink-900 mt-2">
            {data.preview.type === 'placeholder' ? (
              <div className="flex min-h-[120px] items-center justify-center px-4 text-center text-sm text-zinc-500">
                {data.preview.text}
              </div>
            ) : null}

            {data.preview.type === 'image' ? (
              <img src={data.preview.url} alt="Preview" className="nodrag h-52 w-full object-cover" />
            ) : null}

            {data.preview.type === 'video' ? (
              <video src={data.preview.url} controls autoPlay loop muted className="nodrag h-52 w-full object-cover" />
            ) : null}
          </div>
        ) : null}
      </div>

      {data.inputs && data.inputs.length > 0 ? (
        <div className="pointer-events-none absolute left-2 top-0 h-full">
          {data.inputs.map((input, index) => (
            <div
              key={input.id}
              className="absolute -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500"
              style={{ top: `${((index + 1) * 100) / (data.inputs!.length + 1)}%` }}
            >
              {input.label}
            </div>
          ))}
        </div>
      ) : null}

      {data.outputs && data.outputs.length > 0 ? (
        <div className="pointer-events-none absolute right-2 top-0 h-full">
          {data.outputs.map((output, index) => (
            <div
              key={output.id}
              className="absolute -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500"
              style={{ top: `${((index + 1) * 100) / (data.outputs!.length + 1)}%` }}
            >
              {output.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
