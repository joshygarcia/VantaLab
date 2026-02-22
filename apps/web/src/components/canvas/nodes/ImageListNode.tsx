import { ChangeEvent, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { ImagePlus, Plus, Upload } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import { useCanvasStore } from '@/store/canvas-store';
import { uploadWorkspaceImage } from '@/lib/api';

type ImageListNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

const parseSectionIndex = (controlId: string) => {
  if (!controlId.startsWith('image_item_')) {
    return null;
  }

  const parsed = Number.parseInt(controlId.slice('image_item_'.length), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const matchesHandleId = (actualHandleId: string | null | undefined, expectedHandleId: string) =>
  actualHandleId === expectedHandleId ||
  actualHandleId?.startsWith(`${expectedHandleId}_`) ||
  actualHandleId?.startsWith(`${expectedHandleId}-`);

export function ImageListNode({ id, data, isConnectable, selected = false }: ImageListNodeProps) {
  const updateNodeControl = useCanvasStore((state) => state.updateNodeControl);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setCanvas = useCanvasStore((state) => state.setCanvas);
  const workspaceId = useCanvasStore((state) => state.workspaceId);
  const [uploadingSections, setUploadingSections] = useState<Record<number, boolean>>({});
  const [uploadError, setUploadError] = useState('');

  const controls = data.controls ?? [];
  const sectionIndices = controls
    .filter((control) => control.type === 'textarea' && control.id.startsWith('image_item_'))
    .map((control) => parseSectionIndex(control.id))
    .filter((index): index is number => index !== null)
    .sort((a, b) => a - b);

  const normalizedIndices = sectionIndices.length > 0 ? sectionIndices : [0];

  const outputConnected = edges.some(
    (edge) => edge.source === id && matchesHandleId(edge.sourceHandle, 'image-out')
  );

  const addSection = () => {
    const currentNode = nodes.find((node) => node.id === id);
    if (!currentNode) {
      return;
    }

    const nextControls = currentNode.data.controls ? [...currentNode.data.controls] : [];
    const existingIndices = nextControls
      .filter((control) => control.type === 'textarea' && control.id.startsWith('image_item_'))
      .map((control) => parseSectionIndex(control.id))
      .filter((index): index is number => index !== null);

    const nextIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;
    nextControls.push({ type: 'textarea', id: `image_item_${nextIndex}`, value: '' });

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

  const handleFileChange = async (sectionIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    if (!workspaceId) {
      setUploadError('Workspace is not ready yet. Try again in a moment.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Please upload images smaller than 10MB.');
      return;
    }

    setUploadError('');
    setUploadingSections((previous) => ({
      ...previous,
      [sectionIndex]: true
    }));

    try {
      const uploadedUrl = await uploadWorkspaceImage(workspaceId, file);
      updateNodeControl(id, `image_item_${sectionIndex}`, uploadedUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed';
      setUploadError(message);
    } finally {
      setUploadingSections((previous) => ({
        ...previous,
        [sectionIndex]: false
      }));
    }
  };

  return (
    <div className="relative w-[380px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-sm font-medium">
        <ImagePlus size={14} className="text-zinc-400" />
        <span>{data.title || 'Image List'}</span>
      </div>

      <div className="space-y-2 p-3">
        {normalizedIndices.map((sectionIndex, positionIndex) => {
          const imageControl = controls.find(
            (control) => control.type === 'textarea' && control.id === `image_item_${sectionIndex}`
          );
          const imageValue = imageControl?.type === 'textarea' ? imageControl.value : '';
          const sectionUploading = uploadingSections[sectionIndex] ?? false;

          return (
            <div key={sectionIndex} className="rounded-md border border-white/5 bg-ink-900 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Image {positionIndex + 1}
                </span>

                <label
                  className={`nodrag inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors duration-200 ${sectionUploading ? 'cursor-wait border-white/5 bg-white/5 text-zinc-500' : 'border-white/10 bg-transparent text-white hover:bg-white/10'}`}
                >
                  <Upload size={12} />
                  {sectionUploading ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={sectionUploading}
                    onChange={(event) => {
                      void handleFileChange(sectionIndex, event);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                type="text"
                className="nodrag h-9 w-full rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20"
                placeholder="https://example.com/image.jpg or upload"
                value={imageValue}
                disabled={sectionUploading}
                onChange={(event) => updateNodeControl(id, `image_item_${sectionIndex}`, event.target.value)}
              />

              {imageValue ? (
                <img src={imageValue} alt={`Image section ${positionIndex + 1}`} className="nodrag mt-3 h-24 w-full rounded-md object-cover" />
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          className="nodrag inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-transparent px-3 text-xs font-medium text-white transition-colors duration-200 hover:bg-white/5"
          onClick={addSection}
        >
          <Plus size={14} />
          Add image section
        </button>

        {uploadError ? <p className="text-xs text-rose-300">{uploadError}</p> : null}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        isConnectable={isConnectable}
        className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 transition-colors duration-200 ${outputConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
      />

      <div
        className={`pointer-events-none absolute right-[-18px] top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${selected || outputConnected ? 'opacity-100' : 'opacity-0'} ${outputConnected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : ''}`}
        aria-hidden="true"
      >
        <ImagePlus size={12} strokeWidth={2.5} />
      </div>
    </div>
  );
}
