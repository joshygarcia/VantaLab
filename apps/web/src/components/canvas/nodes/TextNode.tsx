import { Handle, Position } from 'reactflow';
import { Type } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';

type TextNodeProps = {
  id: string;
  data: {
    label?: string;
    title?: string;
    text?: string;
    outputs?: Array<{ id: string }>;
    controls?: Array<{ type: 'textarea' | 'select'; value: string }>;
  };
  isConnectable: boolean;
  selected?: boolean;
};

export function TextNode({ id, data, isConnectable, selected = false }: TextNodeProps) {
  const updateNodeText = useCanvasStore((state) => state.updateNodeText);
  const edges = useCanvasStore((state) => state.edges);
  const textareaControl = data.controls?.find((control) => control.type === 'textarea');
  const textValue = data.text ?? textareaControl?.value ?? '';
  const outputHandleId = data.outputs?.[0]?.id ?? 'prompt-out';

  const isOutputConnected = edges.some(
    (edge) =>
      edge.source === id &&
      (!edge.sourceHandle ||
        edge.sourceHandle === outputHandleId ||
        edge.sourceHandle?.startsWith(`${outputHandleId}_`) ||
        edge.sourceHandle?.startsWith(`${outputHandleId}-`))
  );

  const showOutputPort = selected || isOutputConnected;

  return (
    <div className="relative w-[340px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-sm font-medium">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-ink-900 text-[11px] font-semibold text-zinc-300">
          T
        </span>
        <span>{data.label || data.title || 'Text Prompt'}</span>
      </div>

      <div className="p-3">
        <textarea
          className="nodrag min-h-[132px] w-full resize-y rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm leading-relaxed text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20"
          placeholder="Enter prompt..."
          value={textValue}
          onChange={(event) => updateNodeText(id, event.target.value)}
          rows={6}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id={outputHandleId}
        isConnectable={isConnectable}
        className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${isOutputConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
      />

      <div
        className={`pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${showOutputPort ? 'opacity-100' : 'opacity-0'} ${isOutputConnected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : ''}`}
        aria-hidden="true"
      >
        <Type size={12} strokeWidth={2.5} />
      </div>
    </div>
  );
}
