import { memo, useMemo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

import { useCanvasStore } from '@/store/canvas-store';

type ConnectionType = 'prompt' | 'image' | 'video' | 'items' | 'asset' | 'unknown';

const EDGE_PALETTE: Record<ConnectionType, { from: string; to: string; glow: string; dot: string }> = {
  prompt: {
    from: '#5eb6ff',
    to: '#2dd4ff',
    glow: 'rgba(74, 186, 255, 0.5)',
    dot: '#9ddcff'
  },
  image: {
    from: '#fb7185',
    to: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.45)',
    dot: '#ffc6cf'
  },
  video: {
    from: '#a78bfa',
    to: '#7c3aed',
    glow: 'rgba(139, 92, 246, 0.48)',
    dot: '#d9c8ff'
  },
  items: {
    from: '#fbbf24',
    to: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
    dot: '#fde68a'
  },
  asset: {
    from: '#34d399',
    to: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    dot: '#a7f3d0'
  },
  unknown: {
    from: '#94a3b8',
    to: '#64748b',
    glow: 'rgba(100, 116, 139, 0.42)',
    dot: '#cbd5e1'
  }
};

const inferConnectionTypeFromHandle = (handleId?: string | null): ConnectionType => {
  if (!handleId) {
    return 'unknown';
  }

  const normalized = handleId.toLowerCase();

  if (normalized.includes('asset') || normalized.includes('element')) {
    return 'asset';
  }

  if (
    normalized.includes('prompt') ||
    normalized.includes('text') ||
    normalized.includes('idea') ||
    normalized.includes('assistant') ||
    normalized.includes('style')
  ) {
    return 'prompt';
  }

  if (normalized.includes('item') || normalized.includes('list')) {
    return 'items';
  }

  if (
    normalized.includes('image') ||
    normalized.includes('upload') ||
    normalized.includes('upscale')
  ) {
    return 'image';
  }

  if (normalized.includes('video') || normalized.includes('motion')) {
    return 'video';
  }

  return 'unknown';
};

const parseConnectionType = (value: unknown): ConnectionType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return Object.hasOwn(EDGE_PALETTE, value) ? (value as ConnectionType) : null;
};

const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

function ConnectionEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  data,
  selected
}: EdgeProps<{ connectionType?: ConnectionType }>) {
  const nodes = useCanvasStore((state) => state.nodes);
  const sourceHandleType = inferConnectionTypeFromHandle(sourceHandleId);
  const targetHandleType = inferConnectionTypeFromHandle(targetHandleId);
  const inferredConnectionType = sourceHandleType !== 'unknown' ? sourceHandleType : targetHandleType;
  const connectionType = parseConnectionType(data?.connectionType) ?? inferredConnectionType;
  const palette = EDGE_PALETTE[connectionType];
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35
  });
  const gradientId = useMemo(() => `persona-edge-gradient-${sanitizeId(id)}`, [id]);
  const isRunning = useMemo(() => {
    const sourceNode = nodes.find((node) => node.id === source);
    const targetNode = nodes.find((node) => node.id === target);
    return sourceNode?.data.status === 'processing' || targetNode?.data.status === 'processing';
  }, [nodes, source, target]);

  const strokeWidth = selected ? 3 : 2.2;

  return (
    <>
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
      </defs>

      <BaseEdge
        path={edgePath}
        style={{
          stroke: palette.glow,
          strokeWidth: strokeWidth + 3.8,
          strokeLinecap: 'round',
          opacity: selected ? 0.62 : 0.36,
          filter: 'blur(2px)'
        }}
      />

      <BaseEdge
        path={edgePath}
        style={{
          stroke: `url(#${gradientId})`,
          strokeWidth,
          strokeLinecap: 'round',
          opacity: selected ? 1 : 0.92
        }}
      />

      {isRunning ? (
        <>
          <BaseEdge
            path={edgePath}
            style={{
              stroke: `url(#${gradientId})`,
              strokeWidth: strokeWidth + 0.25,
              strokeLinecap: 'round',
              strokeDasharray: '11 12',
              strokeDashoffset: 0,
              animation: 'persona-edge-dash 0.95s linear infinite'
            }}
          />
          <circle
            r={3.6}
            style={{
              fill: palette.dot,
              pointerEvents: 'none',
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animation: 'persona-edge-dot-pulse 0.9s ease-in-out infinite'
            }}
          >
            <animateMotion dur="1.05s" repeatCount="indefinite" rotate="auto" path={edgePath} />
          </circle>
        </>
      ) : null}
    </>
  );
}

export const ConnectionEdge = memo(ConnectionEdgeComponent);
