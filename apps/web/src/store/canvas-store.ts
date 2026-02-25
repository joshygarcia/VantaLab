import { Edge, EdgeChange, Node, NodeChange, addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { create } from 'zustand';

import { BaseNodeData } from '@/components/canvas/nodes/MainNode';

type NodeStatus = 'idle' | 'processing' | 'succeeded' | 'failed';

type ResultMediaItem = {
  type: 'image' | 'video';
  url: string;
};

export type NodeData = Partial<BaseNodeData> & {
  label?: string;
  status?: NodeStatus;
  mediaUrl?: string;
  type?: 'video' | 'image';
  text?: string;
  onChange?: (val: string) => void;
};

type CanvasState = {
  workspaceId: string | null;
  nodes: Node<NodeData>[];
  edges: Edge[];
  setWorkspaceId: (workspaceId: string) => void;
  setCanvas: (nodes: Node<NodeData>[], edges: Edge[]) => void;
  setNodes: (changes: NodeChange[]) => void;
  setEdges: (changes: EdgeChange[]) => void;
  connectEdge: (connection: Parameters<typeof addEdge>[0]) => void;
  markNodeStatus: (nodeId: string, status: NodeStatus, mediaUrl?: string) => void;
  updateNodeText: (nodeId: string, text: string) => void;
  updateNodeControl: (nodeId: string, controlIdPrefix: string, value: any) => void;
  clearNodeResultMedia: (nodeId: string) => void;
  appendNodeResultMedia: (nodeId: string, item: ResultMediaItem) => void;
  setNodeResultPreview: (nodeId: string, resultIndex: number) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string, x?: number, y?: number) => void;
};

const initialNodes: Node<NodeData>[] = [];

const initialEdges: Edge[] = [];

const MIN_NODE_WIDTH = 280;
const MIN_NODE_HEIGHT = 220;

const parseAspectRatio = (value: unknown): number | null => {
  if (typeof value !== 'string') {
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

const fitSizeToAspect = (baseWidth: number, baseHeight: number, ratio: number) => {
  let width = Math.max(baseWidth, MIN_NODE_WIDTH);
  let height = width / ratio;

  if (height < MIN_NODE_HEIGHT) {
    height = MIN_NODE_HEIGHT;
    width = height * ratio;
  }

  if (width < MIN_NODE_WIDTH) {
    width = MIN_NODE_WIDTH;
    height = width / ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

export const useCanvasStore = create<CanvasState>((set) => ({
  workspaceId: null,
  nodes: initialNodes,
  edges: initialEdges,
  setWorkspaceId: (workspaceId) =>
    set(() => ({
      workspaceId
    })),
  setCanvas: (nodes, edges) =>
    set(() => ({
      nodes,
      edges
    })),
  setNodes: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes)
    })),
  setEdges: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges)
    })),
  connectEdge: (connection) =>
    set((state) => ({
      edges: addEdge(connection, state.edges)
    })),
  markNodeStatus: (nodeId, status, mediaUrl) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        let preview = node.data.preview;
        if (mediaUrl) {
          preview = { type: node.data.icon === 'image' ? 'image' : 'video', url: mediaUrl };
        } else if (status === 'processing') {
          preview = { type: 'placeholder', text: 'Generating media...' };
        }
        return { ...node, data: { ...node.data, status, preview } };
      })
    })),
  updateNodeText: (nodeId, text) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        // Also update controls if it's a base node
        const controls = node.data.controls?.map(c =>
          c.type === 'textarea' ? { ...c, value: text } : c
        ) || node.data.controls;
        return { ...node, data: { ...node.data, text, controls } };
      })
    })),
  updateNodeControl: (nodeId, controlIdPrefix, value) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        if (!node.data.controls) return node;

        const controls = node.data.controls.map((c) =>
          c.id.startsWith(controlIdPrefix) || c.id === controlIdPrefix
            ? { ...c, value }
            : c
        );
        const isAspectControlUpdate =
          typeof controlIdPrefix === 'string' &&
          (controlIdPrefix.startsWith('aspect_') || controlIdPrefix === 'aspect');
        const isMediaNode =
          node.data.icon === 'image' ||
          node.data.icon === 'video' ||
          node.data.type === 'image' ||
          node.data.type === 'video';

        if (!isAspectControlUpdate || !isMediaNode) {
          return { ...node, data: { ...node.data, controls } };
        }

        const ratio = parseAspectRatio(value);
        if (!ratio) {
          return { ...node, data: { ...node.data, controls } };
        }

        const currentWidth = typeof node.style?.width === 'number' ? node.style.width : MIN_NODE_WIDTH;
        const currentHeight = typeof node.style?.height === 'number' ? node.style.height : MIN_NODE_HEIGHT;
        const resized = fitSizeToAspect(currentWidth, currentHeight, ratio);

        return {
          ...node,
          style: {
            ...(node.style ?? {}),
            width: resized.width,
            height: resized.height
          },
          data: { ...node.data, controls }
        };
      })
    })),
  clearNodeResultMedia: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                resultMedia: [],
                selectedResultIndex: undefined
              }
            }
          : node
      )
    })),
  appendNodeResultMedia: (nodeId, item) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const existing = Array.isArray(node.data.resultMedia) ? node.data.resultMedia : [];
        const nextIndex = existing.length;
        return {
          ...node,
          data: {
            ...node.data,
            resultMedia: [...existing, item],
            selectedResultIndex: nextIndex
          }
        };
      })
    })),
  setNodeResultPreview: (nodeId, resultIndex) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const results = Array.isArray(node.data.resultMedia) ? node.data.resultMedia : [];
        const selected = results[resultIndex];
        if (!selected) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            selectedResultIndex: resultIndex,
            preview: {
              type: selected.type,
              url: selected.url
            }
          }
        };
      })
    })),
  deleteNode: (nodeId) =>
    set((state) => {
      const idsToRemove = new Set<string>([nodeId]);
      let foundNestedChildren = true;

      while (foundNestedChildren) {
        foundNestedChildren = false;
        for (const node of state.nodes) {
          if (!node.parentId || idsToRemove.has(node.id)) {
            continue;
          }

          if (idsToRemove.has(node.parentId)) {
            idsToRemove.add(node.id);
            foundNestedChildren = true;
          }
        }
      }

      return {
        nodes: state.nodes.filter((node) => !idsToRemove.has(node.id)),
        edges: state.edges.filter((edge) => !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target))
      };
    }),
  duplicateNode: (nodeId, x, y) =>
    set((state) => {
      const nodeToDuplicate = state.nodes.find((n) => n.id === nodeId);
      if (!nodeToDuplicate) return state;

      const newId = `${nodeToDuplicate.id}_copy_${Date.now()}`;
      const newNode: Node<NodeData> = {
        ...nodeToDuplicate,
        id: newId,
        position: {
          x: x ?? nodeToDuplicate.position.x + 50,
          y: y ?? nodeToDuplicate.position.y + 50
        },
        selected: false,
        data: {
          ...nodeToDuplicate.data
        }
      };

      return {
        ...state,
        nodes: [...state.nodes, newNode]
      };
    })
}));
