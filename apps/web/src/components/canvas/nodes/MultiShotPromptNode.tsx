import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import { useCanvasStore } from '@/store/canvas-store';

type MultiShotPromptNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const DURATION_OPTIONS = [
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
];

const parseShotIndex = (controlId: string, prefix: string) => {
  if (!controlId.startsWith(prefix)) {
    return null;
  }

  const suffix = controlId.slice(prefix.length);
  const parsed = Number.parseInt(suffix, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const matchesHandleId = (actualHandleId: string | null | undefined, expectedHandleId: string) =>
  actualHandleId === expectedHandleId ||
  actualHandleId?.startsWith(`${expectedHandleId}_`) ||
  actualHandleId?.startsWith(`${expectedHandleId}-`);

export function MultiShotPromptNode({ id, data, isConnectable, selected = false }: MultiShotPromptNodeProps) {
  const updateNodeControl = useCanvasStore((state) => state.updateNodeControl);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setCanvas = useCanvasStore((state) => state.setCanvas);

  const controls = data.controls ?? [];
  const shotIndices = controls
    .filter((control) => control.type === 'textarea' && control.id.startsWith('shot_prompt_'))
    .map((control) => parseShotIndex(control.id, 'shot_prompt_'))
    .filter((index): index is number => index !== null)
    .sort((a, b) => a - b);

  const outputConnected = edges.some(
    (edge) => edge.source === id && matchesHandleId(edge.sourceHandle, 'multi-prompt-out')
  );

  const addShot = () => {
    const currentNode = nodes.find((node) => node.id === id);
    if (!currentNode) {
      return;
    }

    const nextControls = currentNode.data.controls ? [...currentNode.data.controls] : [];
    const currentShotIndices = nextControls
      .filter((control) => control.type === 'textarea' && control.id.startsWith('shot_prompt_'))
      .map((control) => parseShotIndex(control.id, 'shot_prompt_'))
      .filter((index): index is number => index !== null);

    const nextShotIndex = currentShotIndices.length > 0 ? Math.max(...currentShotIndices) + 1 : 0;

    nextControls.push({ type: 'textarea', id: `shot_prompt_${nextShotIndex}`, value: '' });
    nextControls.push({ type: 'select', id: `shot_duration_${nextShotIndex}`, value: '3', options: DURATION_OPTIONS });

    const nextNodes = nodes.map((node) =>
      node.id === id
        ? {
          ...node,
          data: {
            ...node.data,
            controls: nextControls
          }
        }
        : node
    );

    setCanvas(nextNodes, edges);
  };

  return (
    <div className="relative w-[380px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-sm font-medium">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-ink-900 text-[11px] font-semibold text-zinc-300">
          MS
        </span>
        <span>{data.title || 'Multi-shot Prompt'}</span>
      </div>

      <div className="space-y-2 p-3">
        {shotIndices.map((shotIndex, positionIndex) => {
          const promptControl = controls.find(
            (control) => control.type === 'textarea' && control.id === `shot_prompt_${shotIndex}`
          );
          const durationControl = controls.find(
            (control) => control.type === 'select' && control.id === `shot_duration_${shotIndex}`
          );

          return (
            <div key={shotIndex} className="rounded-md border border-white/5 bg-ink-900 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Shot {positionIndex + 1}
                </span>
                <div className="nodrag">
                  <select
                    className="h-7 rounded-md border border-white/10 bg-ink-950 px-2 text-[11px] font-medium text-white outline-none transition-colors duration-200 focus:border-white/20"
                    value={durationControl?.type === 'select' ? durationControl.value : '3'}
                    onChange={(event) => updateNodeControl(id, `shot_duration_${shotIndex}`, event.target.value)}
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                className="nodrag min-h-[74px] w-full resize-y rounded-md border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20"
                rows={2}
                placeholder={`Describe shot ${positionIndex + 1}...`}
                value={promptControl?.type === 'textarea' ? promptControl.value : ''}
                onChange={(event) => updateNodeControl(id, `shot_prompt_${shotIndex}`, event.target.value)}
              />
            </div>
          );
        })}

        <button
          type="button"
          className="nodrag inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-transparent px-3 text-xs font-medium text-white transition-colors duration-200 hover:bg-white/5"
          onClick={addShot}
        >
          <Plus size={14} />
          Add shot
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="multi-prompt-out"
        isConnectable={isConnectable}
        className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${outputConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
      />

      <div
        className={`pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-[10px] font-bold text-zinc-300 transition-colors duration-200 ${selected || outputConnected ? 'opacity-100' : 'opacity-0'} ${outputConnected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : ''}`}
        aria-hidden="true"
      >
        MS
      </div>
    </div>
  );
}
