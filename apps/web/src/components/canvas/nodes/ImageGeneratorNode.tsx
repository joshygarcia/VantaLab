import { Handle, Position } from 'reactflow';
import { Play, Image as ImageIcon, MonitorPlay, Settings } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import { useCanvasStore } from '@/store/canvas-store';

type ImageGeneratorNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const iconPortClass = (show: boolean, connected: boolean) =>
  [
    'pointer-events-none absolute left-[-18px] -translate-y-1/2 rounded-full border bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200',
    show ? 'opacity-100' : 'opacity-0',
    connected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : 'border-white/10'
  ].join(' ');

export function ImageGeneratorNode({ id, data, isConnectable, selected = false }: ImageGeneratorNodeProps) {
  const updateNodeControl = useCanvasStore((state) => state.updateNodeControl);
  const setNodeResultPreview = useCanvasStore((state) => state.setNodeResultPreview);
  const edges = useCanvasStore((state) => state.edges);

  const promptControl = data.controls?.find((control) => control.id.startsWith('prompt_'));
  const modelControl = data.controls?.find((control) => control.id.startsWith('model_'));
  const aspectControl = data.controls?.find((control) => control.id.startsWith('aspect_'));
  const resControl = data.controls?.find((control) => control.id.startsWith('res_'));
  const amountControl = data.controls?.find((control) => control.id.startsWith('amount_'));

  const acceptsImageInput = modelControl?.value !== 'z-image';
  const resultMedia = (data.resultMedia ?? []).filter((item) => item.type === 'image' && item.url);
  const selectedResultIndex =
    typeof data.selectedResultIndex === 'number' ? data.selectedResultIndex : Math.max(0, resultMedia.length - 1);

  const matchesHandleId = (actualHandleId: string | null | undefined, expectedHandleId: string) =>
    actualHandleId === expectedHandleId ||
    actualHandleId?.startsWith(`${expectedHandleId}_`) ||
    actualHandleId?.startsWith(`${expectedHandleId}-`);

  const isInputConnected = (handleIds: string[]) =>
    edges.some(
      (edge) =>
        edge.target === id &&
        !!edge.targetHandle &&
        handleIds.some((handleId) => matchesHandleId(edge.targetHandle, handleId))
    );

  const isOutputConnected = (handleIds: string[]) =>
    edges.some(
      (edge) =>
        edge.source === id &&
        !!edge.sourceHandle &&
        handleIds.some((handleId) => matchesHandleId(edge.sourceHandle, handleId))
    );

  const promptConnected = isInputConnected(['prompt-in', 'prompt_in']);
  const imageConnected = isInputConnected(['image-in', 'image_in']);
  const outputConnected = isOutputConnected(['image-out', 'style_out']);

  return (
    <div className="relative w-[420px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <div className="absolute left-0 top-0 h-full w-0">
        <Handle
          type="target"
          position={Position.Left}
          id="prompt-in"
          isConnectable={isConnectable}
          style={{ top: '34%' }}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${promptConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
        />
        <div style={{ top: '34%' }} className={iconPortClass(selected || promptConnected, promptConnected)} aria-hidden="true">
          <span className="text-[11px] font-semibold">T</span>
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in"
          isConnectable={isConnectable && acceptsImageInput}
          style={{ top: '66%' }}
          className={`!h-3 !w-3 !border-2 !border-ink-950 transition-colors duration-200 ${acceptsImageInput ? '!bg-zinc-300' : '!bg-ink-800 !opacity-50'} ${imageConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
        />
        <div style={{ top: '66%' }} className={iconPortClass(selected || imageConnected, imageConnected)} aria-hidden="true">
          <ImageIcon size={12} strokeWidth={2.5} />
        </div>
      </div>

      <div className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2">
        <Handle
          type="source"
          position={Position.Right}
          id="image-out"
          isConnectable={isConnectable}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${outputConnected ? '!bg-emerald-400 !border-emerald-950' : ''}`}
        />
        <div
          className={`pointer-events-none absolute right-[-18px] top-0 -translate-y-1/2 rounded-full border bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${selected || outputConnected ? 'opacity-100' : 'opacity-0'} ${outputConnected ? 'border-emerald-400 text-emerald-400 bg-emerald-950/30' : 'border-white/10'}`}
          aria-hidden="true"
        >
          <ImageIcon size={12} strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ImageIcon size={14} className="text-zinc-400" />
          <span>{data.title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-transparent text-zinc-300 transition-colors duration-200 hover:bg-white/5">
            <Play size={12} fill="currentColor" />
          </button>
          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-transparent text-zinc-300 transition-colors duration-200 hover:bg-white/5">
            <Settings size={12} />
          </button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="overflow-hidden rounded-md border border-white/5 bg-ink-950">
          {data.preview && data.preview.type === 'image' ? (
            <img src={data.preview.url} alt="Generated result" className="nodrag h-40 w-full object-cover" />
          ) : (
            <div className="h-40 bg-ink-900" />
          )}

          <div className="space-y-3 border-t border-white/5 p-3">
            <textarea
              className="nodrag min-h-[54px] w-full resize-y rounded-md border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20"
              placeholder="Describe the image you want to generate..."
              rows={1}
              value={promptControl?.value || ''}
              onChange={(event) => {
                if (promptControl) {
                  updateNodeControl(id, 'prompt_', event.target.value);
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <select
                className="nodrag h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-white outline-none transition-colors duration-200 focus:border-white/20"
                value={amountControl?.value || '1'}
                onChange={(event) => amountControl && updateNodeControl(id, 'amount_', event.target.value)}
              >
                <option value="1">x1</option>
                <option value="2">x2</option>
                <option value="3">x3</option>
                <option value="4">x4</option>
              </select>

              <select
                className="nodrag h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-white outline-none transition-colors duration-200 focus:border-white/20"
                value={modelControl?.value || 'nano-banana-pro'}
                onChange={(event) => modelControl && updateNodeControl(id, 'model_', event.target.value)}
              >
                <option value="nano-banana-pro">Nano Banana Pro</option>
                <option value="z-image">Z-Image (Text only)</option>
              </select>

              <label className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-zinc-300 transition-colors duration-200">
                <MonitorPlay size={12} className="text-zinc-500" />
                <select
                  className="nodrag h-8 bg-transparent text-xs text-white outline-none"
                  value={aspectControl?.value || '16:9'}
                  onChange={(event) => aspectControl && updateNodeControl(id, 'aspect_', event.target.value)}
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                </select>
              </label>

              <select
                className="nodrag h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-white outline-none transition-colors duration-200 focus:border-white/20"
                value={resControl?.value || '1K'}
                onChange={(event) => resControl && updateNodeControl(id, 'res_', event.target.value)}
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>

              <button
                type="button"
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white text-black transition-colors duration-200 hover:bg-zinc-200"
                onClick={() => {
                  document.querySelector<HTMLButtonElement>('.run-form button')?.click();
                }}
              >
                <Play size={14} fill="currentColor" stroke="none" />
              </button>
            </div>
          </div>
        </div>

        {resultMedia.length > 0 ? (
          <div className="rounded-md border border-white/5 bg-ink-900 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Batch Results ({resultMedia.length})
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {resultMedia.map((item, index) => (
                <button
                  type="button"
                  key={`${item.url}_${index}`}
                  className={`nodrag relative overflow-hidden rounded-md border transition-colors duration-200 ${selectedResultIndex === index ? 'border-sky-400' : 'border-white/5'}`}
                  onClick={() => setNodeResultPreview(id, index)}
                >
                  <img src={item.url} alt={`Batch result ${index + 1}`} className="h-14 w-full object-cover" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[8px] font-bold text-white">
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {data.status === 'failed' ? (
          <div className="rounded-md border border-rose-500/20 bg-rose-950/20 p-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20">
                <span className="text-xs text-rose-400">!</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-rose-300">Generation failed</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-rose-400/70">
                  The request may have timed out or the API returned an error. Check your API key balance or try a simpler prompt.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors duration-200 hover:bg-rose-500/20"
              onClick={() => {
                document.querySelector<HTMLButtonElement>('.run-form button')?.click();
              }}
            >
              ↻ Retry Generation
            </button>
          </div>
        ) : null}
      </div>

      {data.status === 'processing' ? (
        <div className="h-1.5 overflow-hidden rounded-b-xl bg-ink-900">
          <div className="h-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-sky-400 to-transparent" style={{ backgroundSize: '200% 100%' }} />
        </div>
      ) : null}

      {data.status === 'failed' ? (
        <div className="h-1.5 overflow-hidden rounded-b-xl bg-rose-950">
          <div className="h-full w-full bg-rose-500/60" />
        </div>
      ) : null}
    </div >
  );
}
