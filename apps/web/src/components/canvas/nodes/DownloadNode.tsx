import { Handle, Position } from 'reactflow';
import { Download, FileVideo, Image as ImageIcon } from 'lucide-react';
import { BaseNodeData } from './BaseNode';
import { useCanvasStore } from '@/store/canvas-store';

type DownloadNodeProps = {
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  selected?: boolean;
};

type MediaKind = 'image' | 'video';

type ConnectedMedia = {
  url: string;
  kind: MediaKind;
  sourceLabel: string;
};

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

const inferKindFromUrl = (url: string): MediaKind => {
  const normalized = url.toLowerCase();
  if (
    normalized.includes('.mp4') ||
    normalized.includes('.webm') ||
    normalized.includes('.mov') ||
    normalized.includes('/video')
  ) {
    return 'video';
  }

  return 'image';
};

const inferFileExtension = (url: string, kind: MediaKind) => {
  try {
    const path = new URL(url).pathname;
    const extension = path.split('.').pop()?.toLowerCase();
    if (extension && extension.length <= 5) {
      return extension;
    }
  } catch {
    // Ignore malformed URL parse and fallback.
  }

  return kind === 'video' ? 'mp4' : 'png';
};

export function DownloadNode({ id, data, isConnectable, selected = false }: DownloadNodeProps) {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  const hasInputConnection = (targetHandleIds: string[]) =>
    edges.some((edge) => edge.target === id && handleIdMatches(edge.targetHandle, targetHandleIds));

  const getConnectedSourceNode = (targetHandleIds: string[]) => {
    const edge = edges.find(
      (candidate) => candidate.target === id && handleIdMatches(candidate.targetHandle, targetHandleIds)
    );

    if (!edge) {
      return undefined;
    }

    return nodes.find((node) => node.id === edge.source);
  };

  const extractMedia = (sourceNode: (typeof nodes)[number] | undefined, preferredKind: MediaKind): ConnectedMedia | null => {
    if (!sourceNode) {
      return null;
    }

    const sourceLabel =
      (typeof sourceNode.data.title === 'string' && sourceNode.data.title) ||
      (typeof sourceNode.data.label === 'string' && sourceNode.data.label) ||
      sourceNode.id;

    if (sourceNode.data.preview?.type === 'image' || sourceNode.data.preview?.type === 'video') {
      return {
        url: sourceNode.data.preview.url,
        kind: sourceNode.data.preview.type,
        sourceLabel
      };
    }

    if (typeof sourceNode.data.mediaUrl === 'string' && sourceNode.data.mediaUrl.length > 0) {
      return {
        url: sourceNode.data.mediaUrl,
        kind: sourceNode.data.type ?? inferKindFromUrl(sourceNode.data.mediaUrl) ?? preferredKind,
        sourceLabel
      };
    }

    return null;
  };

  const imageSourceNode = getConnectedSourceNode(['image-in', 'image_in', 'asset-in', 'asset_in']);
  const videoSourceNode = getConnectedSourceNode(['video-in', 'video_in']);

  const imageConnected = hasInputConnection(['image-in', 'image_in', 'asset-in', 'asset_in']);
  const videoConnected = hasInputConnection(['video-in', 'video_in']);

  const imageMedia = extractMedia(imageSourceNode, 'image');
  const videoMedia = extractMedia(videoSourceNode, 'video');
  const media = videoMedia ?? imageMedia;

  const handleDownload = async () => {
    if (!media) {
      return;
    }

    const extension = inferFileExtension(media.url, media.kind);
    const stamp = new Date().toISOString().replace(/[.:]/g, '-');
    const fileName = `persona-${media.kind}-${stamp}.${extension}`;

    try {
      const response = await fetch(media.url);
      if (!response.ok) {
        throw new Error('Unable to download media');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(media.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative w-[320px] rounded-xl border border-white/10 bg-ink-950 text-white shadow-panel">
      <div
        className={`pointer-events-none absolute left-[-18px] top-[35%] -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${selected || imageConnected ? 'opacity-100' : 'opacity-0'} ${imageConnected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : ''}`}
        aria-hidden="true"
      >
        <ImageIcon size={12} strokeWidth={2.5} />
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="image-in"
        isConnectable={isConnectable}
        style={{ top: '35%' }}
        className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 ${imageConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
      />

      <div
        className={`pointer-events-none absolute left-[-18px] top-[65%] -translate-y-1/2 rounded-full border border-white/10 bg-ink-900 p-1.5 text-zinc-300 transition-colors duration-200 ${selected || videoConnected ? 'opacity-100' : 'opacity-0'} ${videoConnected ? 'border-sky-400 text-sky-400 bg-sky-950/30' : ''}`}
        aria-hidden="true"
      >
        <FileVideo size={12} strokeWidth={2.5} />
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="video-in"
        isConnectable={isConnectable}
        style={{ top: '65%' }}
        className={`!h-3 !w-3 !border-2 !border-ink-950 !bg-zinc-300 ${videoConnected ? '!bg-sky-400 !border-sky-950' : ''}`}
      />

      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-sm font-medium">
        <Download size={14} className="text-zinc-400" />
        <span>{data.title || 'Download'}</span>
      </div>

      <div className="p-3">
        <div className="overflow-hidden rounded-md border border-white/5 bg-ink-900">
          {media?.kind === 'image' ? <img src={media.url} alt="Connected media" className="h-44 w-full object-cover" /> : null}
          {media?.kind === 'video' ? <video src={media.url} controls className="h-44 w-full object-cover" /> : null}
          {!media ? (
            <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-zinc-500">
              Connect an image or video output to enable download.
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="nodrag inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-ink-950 transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleDownload}
            disabled={!media}
          >
            <Download size={14} />
            Download
          </button>

          {media ? (
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="nodrag inline-flex h-9 items-center rounded-md border border-white/10 bg-transparent px-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/5"
            >
              Open Source
            </a>
          ) : null}
        </div>

        <div className="mt-4 text-xs font-medium text-zinc-500">{media ? `Source: ${media.sourceLabel}` : 'Source: none connected'}</div>
      </div>
    </div>
  );
}
