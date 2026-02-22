import { Handle, Position } from 'reactflow';
import { FileVideo, Image as ImageIcon, MonitorPlay, Play, Volume2, VolumeX } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import { useCanvasStore } from '@/store/canvas-store';

type VideoGeneratorNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const isEnabled = (value: unknown) => value === true || value === 'true';

const handleIdMatches = (actualHandleId: string | null | undefined, supportedHandleIds: string[]) => {
  if (!actualHandleId) {
    return false;
  }

  return supportedHandleIds.some(
    (supportedHandleId) =>
      actualHandleId === supportedHandleId ||
      actualHandleId.startsWith(`${supportedHandleId}_`) ||
      actualHandleId.startsWith(`${supportedHandleId}-`)
  );
};

const ELEMENT_MODE_OPTIONS = [
  { label: 'Images', value: 'images' },
  { label: 'Video', value: 'video' }
];

const ELEMENT_CATEGORY_OPTIONS = [
  { label: 'Influencer', value: 'influencer' },
  { label: 'Character', value: 'character' },
  { label: 'Animal', value: 'animal' },
  { label: 'Object', value: 'object' },
  { label: 'Custom', value: 'custom' }
];

const portBadgeClass = (show: boolean, connected: boolean) =>
  [
    'pointer-events-none absolute left-[-18px] -translate-y-1/2 rounded-full border bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200',
    show ? 'opacity-100' : 'opacity-0',
    connected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : 'border-white/10'
  ].join(' ');

export function VideoGeneratorNode({ id, data, isConnectable, selected = false }: VideoGeneratorNodeProps) {
  const updateNodeControl = useCanvasStore((state) => state.updateNodeControl);
  const setNodeResultPreview = useCanvasStore((state) => state.setNodeResultPreview);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setCanvas = useCanvasStore((state) => state.setCanvas);

  const promptControl = data.controls?.find((control) => control.id.startsWith('prompt_'));
  const modelControl = data.controls?.find((control) => control.id.startsWith('model_'));
  const aspectControl = data.controls?.find((control) => control.id.startsWith('aspect_'));
  const durationControl = data.controls?.find((control) => control.id.startsWith('duration_'));
  const modeControl = data.controls?.find((control) => control.id.startsWith('mode_'));
  const soundControl = data.controls?.find((control) => control.id.startsWith('sound_'));
  const multiShotsControl = data.controls?.find((control) => control.id.startsWith('multi_shots_'));
  const multiPromptControl = data.controls?.find((control) => control.id.startsWith('multi_prompt_'));
  const soundEnabled = isEnabled(soundControl?.value);
  const multiShotsEnabled = isEnabled(multiShotsControl?.value);
  const modelValue = typeof modelControl?.value === 'string' ? modelControl.value : 'kling-3.0/video';
  const isKlingModel = modelValue === 'kling-3.0/video';
  const multiPromptValue = typeof multiPromptControl?.value === 'string' ? multiPromptControl.value : '';
  const resultMedia = (data.resultMedia ?? []).filter((item) => item.url);
  const selectedResultIndex =
    typeof data.selectedResultIndex === 'number' ? data.selectedResultIndex : Math.max(0, resultMedia.length - 1);

  const ensureMultiShotPromptNode = () => {
    if (!isKlingModel) {
      return;
    }

    updateNodeControl(id, 'multi_shots_', 'true');

    const hasExistingConnection = edges.some(
      (edge) => edge.target === id && handleIdMatches(edge.targetHandle, ['multi-prompt-in', 'multi_prompt_in'])
    );

    if (hasExistingConnection) {
      return;
    }

    const currentNode = nodes.find((node) => node.id === id);
    if (!currentNode) {
      return;
    }

    const timestamp = Date.now();
    const multiPromptNodeId = `multi_prompt_${timestamp}`;
    const seedShotPrompt =
      multiPromptValue.trim().length > 0 ? multiPromptValue.split('\n')[0].split('|')[0].trim() : '';

    const multiPromptNode: (typeof nodes)[number] = {
      id: multiPromptNodeId,
      type: 'multi-shot-prompt',
      position: {
        x: currentNode.position.x - 360,
        y: currentNode.position.y + 140
      },
      data: {
        title: 'Multi-shot Prompt',
        label: 'Multi-shot Prompt',
        outputs: [{ id: 'multi-prompt-out', label: 'Multi-shot', type: 'prompt' }],
        controls: [
          { type: 'textarea' as const, id: 'shot_prompt_0', value: seedShotPrompt },
          {
            type: 'select' as const,
            id: 'shot_duration_0',
            value: '3',
            options: [
              { label: '1s', value: '1' },
              { label: '2s', value: '2' },
              { label: '3s', value: '3' },
              { label: '4s', value: '4' },
              { label: '5s', value: '5' },
              { label: '6s', value: '6' },
              { label: '7s', value: '7' },
              { label: '8s', value: '8' },
              { label: '9s', value: '9' },
              { label: '10s', value: '10' },
              { label: '11s', value: '11' },
              { label: '12s', value: '12' },
              { label: '13s', value: '13' },
              { label: '14s', value: '14' },
              { label: '15s', value: '15' }
            ]
          }
        ],
        status: 'idle' as const
      }
    };

    const edge: (typeof edges)[number] = {
      id: `edge_${multiPromptNodeId}_${id}_multi_prompt`,
      source: multiPromptNodeId,
      sourceHandle: 'multi-prompt-out',
      target: id,
      targetHandle: 'multi-prompt-in'
    };

    setCanvas([...nodes, multiPromptNode], [...edges, edge]);
  };

  const ensureKlingElementsNode = () => {
    if (!isKlingModel) {
      return;
    }

    const hasExistingConnection = edges.some(
      (edge) => edge.target === id && handleIdMatches(edge.targetHandle, ['kling-elements-in', 'kling_elements_in'])
    );

    if (hasExistingConnection) {
      return;
    }

    const currentNode = nodes.find((node) => node.id === id);
    if (!currentNode) {
      return;
    }

    const timestamp = Date.now();
    const klingElementsNodeId = `kling_elements_${timestamp}`;

    const klingElementsNode: (typeof nodes)[number] = {
      id: klingElementsNodeId,
      type: 'kling-elements',
      position: {
        x: currentNode.position.x - 390,
        y: currentNode.position.y + 300
      },
      data: {
        title: 'Kling Elements',
        label: 'Kling Elements',
        outputs: [{ id: 'kling-elements-out', label: 'Elements', type: 'asset' }],
        controls: [
          { type: 'textarea' as const, id: 'element_name_0', value: '' },
          { type: 'textarea' as const, id: 'element_description_0', value: '' },
          {
            type: 'select' as const,
            id: 'element_category_0',
            value: 'influencer',
            options: ELEMENT_CATEGORY_OPTIONS
          },
          { type: 'select' as const, id: 'element_mode_0', value: 'images', options: ELEMENT_MODE_OPTIONS },
          { type: 'textarea' as const, id: 'element_library_id_0', value: '' },
          { type: 'textarea' as const, id: 'element_image_url_0_0', value: '' },
          { type: 'textarea' as const, id: 'element_image_url_0_1', value: '' },
          { type: 'textarea' as const, id: 'element_image_url_0_2', value: '' },
          { type: 'textarea' as const, id: 'element_image_url_0_3', value: '' },
          { type: 'textarea' as const, id: 'element_video_url_0', value: '' }
        ],
        status: 'idle' as const
      }
    };

    const edge: (typeof edges)[number] = {
      id: `edge_${klingElementsNodeId}_${id}_kling_elements`,
      source: klingElementsNodeId,
      sourceHandle: 'kling-elements-out',
      target: id,
      targetHandle: 'kling-elements-in'
    };

    setCanvas([...nodes, klingElementsNode], [...edges, edge]);
  };

  const matchesHandleId = (actualHandleId: string | null | undefined, expectedHandleId: string) =>
    actualHandleId === expectedHandleId ||
    actualHandleId?.startsWith(`${expectedHandleId}_`) ||
    actualHandleId?.startsWith(`${expectedHandleId}-`);

  const isInputConnected = (handleIds: string[]) =>
    edges.some(
      (edge) => edge.target === id && !!edge.targetHandle && handleIds.some((handleId) => matchesHandleId(edge.targetHandle, handleId))
    );

  const isOutputConnected = (handleIds: string[]) =>
    edges.some(
      (edge) => edge.source === id && !!edge.sourceHandle && handleIds.some((handleId) => matchesHandleId(edge.sourceHandle, handleId))
    );

  const promptConnected = isInputConnected(['prompt-in']);
  const imageConnected = isInputConnected(['image-in', 'motion_in']);
  const multiPromptConnected = isInputConnected(['multi-prompt-in', 'multi_prompt_in']);
  const klingElementsConnected = isInputConnected(['kling-elements-in', 'kling_elements_in']);
  const outputConnected = isOutputConnected(['video-out', 'motion_out']);

  return (
    <div className="relative w-[460px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <div className="absolute left-0 top-0 h-full w-0">
        <Handle
          type="target"
          position={Position.Left}
          id="prompt-in"
          isConnectable={isConnectable}
          style={{ top: '22%' }}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${promptConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
        />
        <div style={{ top: '22%' }} className={portBadgeClass(selected || promptConnected, promptConnected)} aria-hidden="true">
          <span className="text-[11px] font-semibold">T</span>
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="image-in"
          isConnectable={isConnectable}
          style={{ top: '42%' }}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${imageConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="motion_in"
          isConnectable={isConnectable}
          style={{ top: '42%' }}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 !opacity-0 transition-colors duration-200 ${imageConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
        />
        <div style={{ top: '42%' }} className={portBadgeClass(selected || imageConnected, imageConnected)} aria-hidden="true">
          <ImageIcon size={12} strokeWidth={2.5} />
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="multi-prompt-in"
          isConnectable={isConnectable}
          style={{ top: '62%' }}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${multiPromptConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
        />
        <div style={{ top: '62%' }} className={portBadgeClass(selected || multiPromptConnected, multiPromptConnected)} aria-hidden="true">
          <span className="text-[10px] font-semibold">MS</span>
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="kling-elements-in"
          isConnectable={isConnectable}
          style={{ top: '82%' }}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${klingElementsConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
        />
        <div style={{ top: '82%' }} className={portBadgeClass(selected || klingElementsConnected, klingElementsConnected)} aria-hidden="true">
          <span className="text-[10px] font-semibold">KE</span>
        </div>
      </div>

      <div className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2">
        <Handle
          type="source"
          position={Position.Right}
          id="video-out"
          isConnectable={isConnectable}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${outputConnected ? '!bg-emerald-400 !border-emerald-950' : ''}`}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="motion_out"
          isConnectable={isConnectable}
          className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 !opacity-0 transition-colors duration-200 ${outputConnected ? '!bg-emerald-400 !border-emerald-950' : ''}`}
        />
        <div
          className={`pointer-events-none absolute right-[-18px] top-0 -translate-y-1/2 rounded-full border bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${selected || outputConnected ? 'opacity-100' : 'opacity-0'} ${outputConnected ? 'border-emerald-400 text-emerald-400 bg-emerald-950/30' : 'border-white/10'}`}
          aria-hidden="true"
        >
          <FileVideo size={12} strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-sm font-medium">
        <FileVideo size={14} className="text-zinc-400" />
        <span>{data.title}</span>
      </div>

      <div className="space-y-2 p-3">
        <div className="overflow-hidden rounded-md border border-white/5 bg-ink-950">
          {data.preview?.type === 'video' ? (
            <video src={data.preview.url} controls autoPlay loop muted className="nodrag h-44 w-full object-cover" />
          ) : (
            <div className="h-44 bg-ink-900" />
          )}

          <div className="space-y-3 border-t border-white/5 p-3">
            <textarea
              className="nodrag min-h-[54px] w-full resize-y rounded-md border border-white/10 bg-ink-950 px-3 py-2 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20"
              placeholder="Describe the video you want to generate..."
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
                value={modelControl?.value || 'kling-3.0/video'}
                onChange={(event) => modelControl && updateNodeControl(id, 'model_', event.target.value)}
              >
                <option value="kling-3.0/video">Kling 3.0 Video</option>
                <option value="veo-3.1">Veo 3.1</option>
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
                </select>
              </label>

              <select
                className="nodrag h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-white outline-none transition-colors duration-200 focus:border-white/20"
                value={durationControl?.value || '5'}
                onChange={(event) => durationControl && updateNodeControl(id, 'duration_', event.target.value)}
              >
                <option value="3">3s</option>
                <option value="4">4s</option>
                <option value="5">5s</option>
                <option value="6">6s</option>
                <option value="7">7s</option>
                <option value="8">8s</option>
                <option value="9">9s</option>
                <option value="10">10s</option>
                <option value="11">11s</option>
                <option value="12">12s</option>
                <option value="13">13s</option>
                <option value="14">14s</option>
                <option value="15">15s</option>
              </select>

              <select
                className="nodrag h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-white outline-none transition-colors duration-200 focus:border-white/20"
                value={modeControl?.value || 'pro'}
                onChange={(event) => modeControl && updateNodeControl(id, 'mode_', event.target.value)}
              >
                <option value="pro">Pro</option>
                <option value="std">Std</option>
              </select>

              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-colors duration-200 ${soundEnabled ? 'border-sky-400 bg-sky-950/30 text-sky-400' : 'border-white/10 bg-transparent text-zinc-300 hover:bg-white/5'}`}
                title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
                onClick={() => updateNodeControl(id, 'sound_', soundEnabled ? 'false' : 'true')}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>

              <button
                type="button"
                className={`rounded-md border px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 ${multiShotsEnabled ? 'border-sky-400 bg-sky-950/30 text-sky-400' : 'border-white/10 bg-transparent text-zinc-400 hover:bg-white/5'} ${!isKlingModel ? 'cursor-not-allowed opacity-45' : ''}`}
                title={
                  isKlingModel
                    ? multiShotsEnabled
                      ? 'Multi-shot enabled'
                      : 'Create multi-shot prompt node'
                    : 'Multi-shot is available with Kling 3.0'
                }
                onClick={ensureMultiShotPromptNode}
                disabled={!isKlingModel}
              >
                Multi-shot
              </button>

              <button
                type="button"
                className={`rounded-md border px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 ${klingElementsConnected ? 'border-emerald-400 bg-emerald-950/30 text-emerald-400' : 'border-white/10 bg-transparent text-zinc-400 hover:bg-white/5'} ${!isKlingModel ? 'cursor-not-allowed opacity-45' : ''}`}
                title={
                  isKlingModel
                    ? klingElementsConnected
                      ? 'Kling elements connected'
                      : 'Create Kling elements node'
                    : 'Kling elements are available with Kling 3.0'
                }
                onClick={ensureKlingElementsNode}
                disabled={!isKlingModel}
              >
                Elements
              </button>

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
                  {item.type === 'video' ? (
                    <video src={item.url} muted loop className="h-14 w-full object-cover" />
                  ) : (
                    <img src={item.url} alt={`Batch result ${index + 1}`} className="h-14 w-full object-cover" />
                  )}
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
                  The video generation timed out or the API returned an error. Check your API key balance or try a shorter duration.
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

      {
        data.status === 'processing' ? (
          <div className="h-1.5 overflow-hidden rounded-b-xl bg-ink-900">
            <div className="h-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-sky-400 to-transparent" style={{ backgroundSize: '200% 100%' }} />
          </div>
        ) : null
      }

      {data.status === 'failed' ? (
        <div className="h-1.5 overflow-hidden rounded-b-xl bg-rose-950">
          <div className="h-full w-full bg-rose-500/60" />
        </div>
      ) : null}
    </div >
  );
}
