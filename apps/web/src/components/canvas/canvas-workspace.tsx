'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactFlow, { Background, Connection, Edge, MiniMap, Node, ReactFlowProvider, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { NodeData, useCanvasStore } from '@/store/canvas-store';
import { executeWorkflow, getJobStatus, getWorkspaceCanvas, subscribeToJobStatus, updateWorkspaceCanvas } from '@/lib/api';
import { findProjectBySpaceId } from '@/lib/projects';
import { useProjectContext } from '@/components/projects/project-context';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

import { TextNode } from './nodes/TextNode';
import { MediaGenNode } from './nodes/MediaGenNode';
import { GroupNode } from './nodes/GroupNode';
import { BaseNode } from './nodes/BaseNode';
import { ImageGeneratorNode } from './nodes/ImageGeneratorNode';
import { VideoGeneratorNode } from './nodes/VideoGeneratorNode';
import { MultiShotPromptNode } from './nodes/MultiShotPromptNode';
import { KlingElementsNode } from './nodes/KlingElementsNode';
import { DownloadNode } from './nodes/DownloadNode';
import { PromptListNode } from './nodes/PromptListNode';
import { ImageListNode } from './nodes/ImageListNode';
import { IdentityVaultNode } from './nodes/IdentityVaultNode';
import { FloatingToolbar } from './FloatingToolbar';
import { AddNodeType } from './add-node-menu';
import { NodeContextMenu } from './NodeContextMenu';
import { PaneContextMenu } from './PaneContextMenu';
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal';
import {
  ChevronDown,
  CreditCard,
  FolderOpen,
  Languages,
  LifeBuoy,
  LogOut,
  PanelLeftOpen,
  Moon,
  Settings,
  Sparkles,
  UserRound
} from 'lucide-react';

const nodeTypes = {
  text: TextNode,
  media: MediaGenNode,
  group: GroupNode,
  base: BaseNode,
  'image-generator': ImageGeneratorNode,
  'video-generator': VideoGeneratorNode,
  'multi-shot-prompt': MultiShotPromptNode,
  'kling-elements': KlingElementsNode,
  download: DownloadNode,
  'prompt-list': PromptListNode,
  'image-list': ImageListNode,
  'identity-vault': IdentityVaultNode
};

type CanvasWorkspaceProps = {
  workspaceId: string;
};

type PortType = 'prompt' | 'image' | 'video' | 'items' | 'asset' | 'unknown';

type ConnectionLike = {
  source?: string | null;
  target?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type KlingMultiPromptItem = {
  prompt: string;
  duration: number;
};

type KlingElementParameter = {
  name: string;
  description?: string;
  elementInputUrls?: string[];
  elementInputVideoUrls?: string[];
};

const portCompatibility: Record<Exclude<PortType, 'unknown'>, PortType[]> = {
  prompt: ['prompt'],
  image: ['image', 'asset'],
  video: ['video'],
  items: ['prompt'],
  asset: ['image', 'asset']
};

const modelInputRestrictions: Record<string, { disallowedTargetHandles: string[] }> = {
  'z-image': {
    disallowedTargetHandles: ['image-in', 'image_in']
  }
};

const getMiniMapNodeColor = (node: Node<NodeData>) => {
  const status = node.data?.status;
  if (status === 'failed') {
    return '#ef4444';
  }

  if (status === 'succeeded') {
    return '#10b981';
  }

  if (status === 'processing') {
    return '#3b82f6';
  }

  if (node.type === 'image-generator' || node.type === 'video-generator') {
    return '#64748b';
  }

  if (node.type === 'image-list' || node.type === 'prompt-list') {
    return '#475569';
  }

  return '#334155';
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

const inferPortTypeFromHandleId = (handleId?: string | null): PortType => {
  if (!handleId) {
    return 'unknown';
  }

  const normalized = handleId.toLowerCase();

  if (
    normalized.includes('prompt') ||
    normalized.includes('text') ||
    normalized.includes('idea') ||
    normalized.includes('assistant') ||
    normalized.includes('list') ||
    normalized.includes('style')
  ) {
    return 'prompt';
  }

  if (
    normalized.includes('image') ||
    normalized.includes('asset') ||
    normalized.includes('upload') ||
    normalized.includes('upscale')
  ) {
    return 'image';
  }

  if (normalized.includes('video') || normalized.includes('motion')) {
    return 'video';
  }

  if (normalized.includes('item')) {
    return 'items';
  }

  return 'unknown';
};

const MAX_MULTI_SHOT_DURATION = 15;
const clampShotDuration = (duration: number) => Math.min(MAX_MULTI_SHOT_DURATION, Math.max(1, duration));

const limitMultiPromptTotalDuration = (shots: KlingMultiPromptItem[]) => {
  let remaining = MAX_MULTI_SHOT_DURATION;
  const limited: KlingMultiPromptItem[] = [];

  for (const shot of shots) {
    if (remaining <= 0) {
      break;
    }

    const prompt = shot.prompt.trim();
    if (!prompt) {
      continue;
    }

    const boundedDuration = Math.min(remaining, clampShotDuration(shot.duration));
    if (boundedDuration <= 0) {
      continue;
    }

    limited.push({ prompt, duration: boundedDuration });
    remaining -= boundedDuration;
  }

  return limited;
};

const parseMultiPrompt = (value: string): KlingMultiPromptItem[] => {
  const source = value.trim();
  if (!source) {
    return [];
  }

  if (source.startsWith('[')) {
    try {
      const parsed = JSON.parse(source) as Array<{ prompt?: unknown; duration?: unknown }>;
      return limitMultiPromptTotalDuration(parsed
        .map((item) => {
          const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
          if (!prompt) {
            return null;
          }

          const durationNumber = Number(item.duration);
          const duration = Number.isFinite(durationNumber)
            ? clampShotDuration(Math.round(durationNumber))
            : 3;

          return {
            prompt,
            duration
          };
        })
        .filter((item): item is KlingMultiPromptItem => item !== null));
    } catch {
      return [];
    }
  }

  return limitMultiPromptTotalDuration(source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [promptPart, durationPart] = line.split('|').map((part) => part.trim());
      if (!promptPart) {
        return null;
      }

      const parsedDuration = Number.parseInt(durationPart || '3', 10);
      return {
        prompt: promptPart,
        duration: clampShotDuration(Number.isFinite(parsedDuration) ? parsedDuration : 3)
      };
    })
    .filter((item): item is KlingMultiPromptItem => item !== null));
};

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

const extractMultiPromptFromNode = (node: Node<NodeData> | undefined): KlingMultiPromptItem[] => {
  if (!node) {
    return [];
  }

  const controls = node.data.controls ?? [];
  const shotPrompts = controls
    .filter((control) => control.type === 'textarea' && control.id.startsWith('shot_prompt_'))
    .map((control) => {
      const index = parseShotIndex(control.id, 'shot_prompt_');
      if (index === null) {
        return null;
      }

      const prompt = control.value.trim();
      if (!prompt) {
        return null;
      }

      const durationControl = controls.find(
        (candidate) => candidate.type === 'select' && candidate.id === `shot_duration_${index}`
      );
      const durationNumber = Number.parseInt(durationControl?.type === 'select' ? durationControl.value : '3', 10);

      return {
        index,
        prompt,
        duration: clampShotDuration(Number.isFinite(durationNumber) ? durationNumber : 3)
      };
    })
    .filter((shot): shot is { index: number; prompt: string; duration: number } => shot !== null)
    .sort((a, b) => a.index - b.index)
    .map(({ prompt, duration }) => ({ prompt, duration }));

  if (shotPrompts.length > 0) {
    return limitMultiPromptTotalDuration(shotPrompts);
  }

  const fallbackTextarea = controls.find((control) => control.type === 'textarea');
  const fallbackText =
    fallbackTextarea?.type === 'textarea'
      ? fallbackTextarea.value
      : typeof node.data.text === 'string'
        ? node.data.text
        : '';

  return parseMultiPrompt(fallbackText);
};

const extractKlingElementsFromNode = (node: Node<NodeData> | undefined): KlingElementParameter[] => {
  if (!node) {
    return [];
  }

  const controls = node.data.controls ?? [];
  const elementIndices = controls
    .filter((control) => control.type === 'textarea' && control.id.startsWith('element_name_'))
    .map((control) => parseShotIndex(control.id, 'element_name_'))
    .filter((index): index is number => index !== null)
    .sort((a, b) => a - b);

  const elements: KlingElementParameter[] = [];

  for (const index of elementIndices) {
    const nameControl = controls.find(
      (control) => control.type === 'textarea' && control.id === `element_name_${index}`
    );

    const name = nameControl?.type === 'textarea' ? nameControl.value.trim() : '';
    if (!name) {
      continue;
    }

    const descriptionControl = controls.find(
      (control) => control.type === 'textarea' && control.id === `element_description_${index}`
    );
    const description = descriptionControl?.type === 'textarea'
      ? descriptionControl.value.trim()
      : '';

    const modeControl = controls.find(
      (control) => control.type === 'select' && control.id === `element_mode_${index}`
    );
    const mode = modeControl?.type === 'select' ? modeControl.value : 'images';

    const imageUrls = [0, 1, 2, 3]
      .map((imageIndex) =>
        controls.find(
          (control) => control.type === 'textarea' && control.id === `element_image_url_${index}_${imageIndex}`
        )
      )
      .map((control) => (control?.type === 'textarea' ? control.value.trim() : ''))
      .filter((value) => value.length > 0)
      .slice(0, 4);

    const videoUrlControl = controls.find(
      (control) => control.type === 'textarea' && control.id === `element_video_url_${index}`
    );
    const videoUrl = videoUrlControl?.type === 'textarea' ? videoUrlControl.value.trim() : '';

    if (mode === 'video' && videoUrl) {
      elements.push({
        name,
        description: description || undefined,
        elementInputVideoUrls: [videoUrl]
      });
      continue;
    }

    if (imageUrls.length >= 2) {
      elements.push({
        name,
        description: description || undefined,
        elementInputUrls: imageUrls
      });
      continue;
    }

    if (videoUrl) {
      elements.push({
        name,
        description: description || undefined,
        elementInputVideoUrls: [videoUrl]
      });
    }
  }

  return elements;
};

const extractPromptListSectionsFromNode = (node: Node<NodeData> | undefined): string[] => {
  if (!node) {
    return [];
  }

  if (node.type !== 'prompt-list') {
    return [];
  }

  const controls = node.data.controls ?? [];
  const sections = controls
    .filter((control) => control.type === 'textarea' && control.id.startsWith('prompt_item_'))
    .map((control) => {
      const index = parseShotIndex(control.id, 'prompt_item_');
      if (index === null) {
        return null;
      }

      return {
        index,
        value: control.value.trim()
      };
    })
    .filter((section): section is { index: number; value: string } => section !== null && section.value.length > 0)
    .sort((a, b) => a.index - b.index)
    .map((section) => section.value);

  if (sections.length === 0) {
    const fallback = controls.find((control) => control.type === 'textarea');
    if (fallback?.type === 'textarea') {
      return fallback.value
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter((line) => line.length > 0);
    }
  }

  return sections;
};

const extractImageListSectionsFromNode = (node: Node<NodeData> | undefined): string[] => {
  if (!node) {
    return [];
  }

  if (node.type !== 'image-list') {
    return [];
  }

  const controls = node.data.controls ?? [];
  const sections = controls
    .filter((control) => control.type === 'textarea' && control.id.startsWith('image_item_'))
    .map((control) => {
      const index = parseShotIndex(control.id, 'image_item_');
      if (index === null) {
        return null;
      }

      return {
        index,
        value: control.value.trim()
      };
    })
    .filter((section): section is { index: number; value: string } => section !== null && section.value.length > 0)
    .sort((a, b) => a.index - b.index)
    .map((section) => section.value);

  if (sections.length === 0) {
    const fallback = controls.find((control) => control.type === 'textarea');
    if (fallback?.type === 'textarea') {
      return fallback.value
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter((line) => line.length > 0);
    }
  }

  return sections;
};

const pickBatchedValue = (values: string[], index: number): string | undefined => {
  if (values.length === 0) {
    return undefined;
  }

  const boundedIndex = Math.min(index, values.length - 1);
  return values[boundedIndex];
};

export function CanvasWorkspace({ workspaceId }: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner workspaceId={workspaceId} />
    </ReactFlowProvider>
  );
}

function CanvasInner({ workspaceId }: CanvasWorkspaceProps) {
  const reactFlow = useReactFlow();
  const { projects, activeProject, activeSpace, setActiveBySpaceId } = useProjectContext();
  const [running, setRunning] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'draw'>('select');
  const [focusMode, setFocusMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [history, setHistory] = useState<Array<{ nodes: Node<NodeData>[]; edges: Edge[] }>>([]);
  const [future, setFuture] = useState<Array<{ nodes: Node<NodeData>[]; edges: Edge[] }>>([]);
  const nodeCounterRef = useRef(1);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSavedGraphRef = useRef<string>('');
  const viewportRef = useRef<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 1 });
  const [viewportVersion, setViewportVersion] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasError, setCanvasError] = useState('');

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const setWorkspaceId = useCanvasStore((state) => state.setWorkspaceId);
  const setCanvas = useCanvasStore((state) => state.setCanvas);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const connectEdge = useCanvasStore((state) => state.connectEdge);
  const markNode = useCanvasStore((state) => state.markNodeStatus);
  const clearNodeResultMedia = useCanvasStore((state) => state.clearNodeResultMedia);
  const appendNodeResultMedia = useCanvasStore((state) => state.appendNodeResultMedia);
  const duplicateNode = useCanvasStore((state) => state.duplicateNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);

  // ── Supabase Realtime Sync ──────────────────────────────────────
  const { broadcastNodePositions, broadcastEdges } = useRealtimeSync(workspaceId);

  const [nodeContextMenu, setNodeContextMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [paneContextMenu, setPaneContextMenu] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setWorkspaceId(workspaceId);
  }, [setWorkspaceId, workspaceId]);

  useEffect(() => {
    setActiveBySpaceId(workspaceId);
  }, [setActiveBySpaceId, workspaceId]);

  const workspaceMatch = useMemo(() => findProjectBySpaceId(projects, workspaceId), [projects, workspaceId]);
  const breadcrumbProjectLabel = workspaceMatch?.project.name ?? activeProject?.name ?? 'Projects';
  const breadcrumbWorkspaceLabel = workspaceMatch?.space.name
    ?? (activeSpace?.id === workspaceId ? activeSpace.name : workspaceId);
  const localCanvasKey = `persona:canvas:${workspaceId}`;

  const readLocalCanvas = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(localCanvasKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as {
        nodes?: Node<NodeData>[];
        edges?: Edge[];
        viewport?: { x: number; y: number; zoom: number };
      };

      return {
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
        viewport: parsed.viewport
      };
    } catch {
      return null;
    }
  }, [localCanvasKey]);

  const writeLocalCanvas = useCallback((graphNodes: Node<NodeData>[], graphEdges: Edge[], viewport: { x: number; y: number; zoom: number }) => {
    try {
      window.localStorage.setItem(
        localCanvasKey,
        JSON.stringify({
          nodes: graphNodes,
          edges: graphEdges,
          viewport
        })
      );
    } catch {
      // Ignore local storage errors.
    }
  }, [localCanvasKey]);

  const serializeCanvas = useCallback((graphNodes: Node<NodeData>[], graphEdges: Edge[], viewport?: { x: number; y: number; zoom: number }) => {
    return JSON.stringify({
      nodes: graphNodes,
      edges: graphEdges,
      viewport
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCanvas = async () => {
      setCanvasReady(false);
      setCanvasError('');

      try {
        const payload = await getWorkspaceCanvas(workspaceId);
        if (cancelled) {
          return;
        }

        const loadedNodes = Array.isArray(payload.nodes) ? (payload.nodes as Node<NodeData>[]) : [];
        const loadedEdges = Array.isArray(payload.edges) ? (payload.edges as Edge[]) : [];
        setCanvas(loadedNodes, loadedEdges);

        if (payload.viewport &&
          typeof payload.viewport.x === 'number' &&
          typeof payload.viewport.y === 'number' &&
          typeof payload.viewport.zoom === 'number') {
          viewportRef.current = payload.viewport;
          reactFlow.setViewport(payload.viewport, { duration: 0 });
        } else {
          viewportRef.current = reactFlow.getViewport();
        }

        latestSavedGraphRef.current = serializeCanvas(loadedNodes, loadedEdges, viewportRef.current);
      } catch {
        if (cancelled) {
          return;
        }

        const localSnapshot = readLocalCanvas();
        if (localSnapshot) {
          const fallbackNodes = localSnapshot.nodes;
          const fallbackEdges = localSnapshot.edges;
          setCanvas(fallbackNodes, fallbackEdges);

          if (localSnapshot.viewport &&
            typeof localSnapshot.viewport.x === 'number' &&
            typeof localSnapshot.viewport.y === 'number' &&
            typeof localSnapshot.viewport.zoom === 'number') {
            viewportRef.current = localSnapshot.viewport;
            reactFlow.setViewport(localSnapshot.viewport, { duration: 0 });
          } else {
            viewportRef.current = reactFlow.getViewport();
          }

          latestSavedGraphRef.current = serializeCanvas(fallbackNodes, fallbackEdges, viewportRef.current);
          setCanvasError('Cloud sync unavailable. Loaded your local backup for this space.');
        } else {
          setCanvas([], []);
          viewportRef.current = reactFlow.getViewport();
          latestSavedGraphRef.current = serializeCanvas([], [], viewportRef.current);
          setCanvasError('Cloud sync unavailable. Starting from a blank workspace.');
        }
      } finally {
        if (!cancelled) {
          setCanvasReady(true);
        }
      }
    };

    void loadCanvas();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [workspaceId, setCanvas, reactFlow, readLocalCanvas, serializeCanvas]);

  useEffect(() => {
    document.body.classList.add('canvas-workspace-page');

    return () => {
      document.body.classList.remove('canvas-workspace-page');
    };
  }, []);

  useEffect(() => {
    if (!canvasReady) {
      return;
    }

    const viewport = viewportRef.current;
    const serializedGraph = serializeCanvas(nodes, edges, viewport);
    if (serializedGraph === latestSavedGraphRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          writeLocalCanvas(nodes, edges, viewport);

          await updateWorkspaceCanvas(workspaceId, {
            nodes: nodes as unknown as Record<string, unknown>[],
            edges: edges as unknown as Record<string, unknown>[],
            viewport
          });

          latestSavedGraphRef.current = serializedGraph;
          setCanvasError('');
        } catch {
          setCanvasError('Cloud sync unavailable. Changes are saved locally for this space.');
        }
      })();
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [canvasReady, edges, nodes, serializeCanvas, viewportVersion, workspaceId, writeLocalCanvas]);

  useEffect(() => {
    const syncSidebarStateFromDom = () => {
      const sidebarElement = document.querySelector('.sidebar');
      const collapsedViaDom = sidebarElement?.classList.contains('collapsed') ?? false;
      const collapsedViaBodyClass = document.body.classList.contains('sidebar-is-collapsed');
      setIsSidebarCollapsed(collapsedViaDom || collapsedViaBodyClass);
    };

    const handleSidebarState = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed?: boolean }>).detail;
      if (typeof detail?.collapsed === 'boolean') {
        setIsSidebarCollapsed(detail.collapsed);
        return;
      }

      syncSidebarStateFromDom();
    };

    syncSidebarStateFromDom();
    window.addEventListener('persona:sidebar-state', handleSidebarState);

    return () => {
      window.removeEventListener('persona:sidebar-state', handleSidebarState);
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        event.target instanceof globalThis.Node &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  const getPortType = (
    node: Node<NodeData> | undefined,
    handleId: string | null | undefined,
    direction: 'inputs' | 'outputs'
  ): PortType => {
    if (node && handleId) {
      const ports = direction === 'inputs' ? node.data.inputs : node.data.outputs;
      const configured = ports?.find((port) => port.id === handleId)?.type as PortType | undefined;
      if (configured) {
        return configured;
      }
    }

    return inferPortTypeFromHandleId(handleId);
  };

  const getNodeModel = (node: Node<NodeData> | undefined) => {
    const modelControl = node?.data.controls?.find(
      (control) => control.type === 'select' && control.id.startsWith('model_')
    );

    return typeof modelControl?.value === 'string' ? modelControl.value : undefined;
  };

  const isConnectionCompatible = (connection: ConnectionLike) => {
    if (!connection.source || !connection.target) {
      return false;
    }

    const sourceNode = nodes.find((node) => node.id === connection.source);
    const targetNode = nodes.find((node) => node.id === connection.target);
    const targetModel = getNodeModel(targetNode);

    if (targetNode?.type === 'image-generator' && targetModel) {
      const restrictions = modelInputRestrictions[targetModel];
      if (restrictions && handleIdMatches(connection.targetHandle, restrictions.disallowedTargetHandles)) {
        return false;
      }
    }

    const sourceType = getPortType(sourceNode, connection.sourceHandle, 'outputs');
    const targetType = getPortType(targetNode, connection.targetHandle, 'inputs');

    if (sourceType === 'unknown' || targetType === 'unknown') {
      return true;
    }

    return portCompatibility[sourceType]?.includes(targetType) ?? false;
  };

  const onConnect = (params: Parameters<typeof connectEdge>[0]) => {
    if (!isConnectionCompatible(params)) {
      return;
    }
    connectEdge(params);
  };

  const onNodeContextMenu = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const pane = document.querySelector('.react-flow__pane')?.getBoundingClientRect();
    if (pane) {
      setNodeContextMenu({
        id: node.id,
        top: event.clientY - pane.top,
        left: event.clientX - pane.left
      });
    }
  };

  const onPaneContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    const pane = document.querySelector('.react-flow__pane')?.getBoundingClientRect();
    if (pane) {
      setPaneContextMenu({
        top: event.clientY - pane.top,
        left: event.clientX - pane.left
      });
    }
  };

  const closeContextMenus = () => {
    setNodeContextMenu(null);
    setPaneContextMenu(null);
    setUserMenuOpen(false);
  };

  const cloneGraph = () => ({
    nodes: nodes.map((node) => ({ ...node, data: { ...node.data } })),
    edges: edges.map((edge) => ({ ...edge }))
  });

  const rememberGraph = () => {
    const snapshot = cloneGraph();
    setHistory((prev) => [...prev, snapshot].slice(-40));
    setFuture([]);
  };

  const buildNode = (kind: AddNodeType | 'comment'): Node<NodeData> => {
    const idSeed = `${Date.now()}_${nodeCounterRef.current}`;
    nodeCounterRef.current += 1;
    const index = nodes.length + nodeCounterRef.current;
    const position = {
      x: 180 + (index % 6) * 64,
      y: 100 + (index % 4) * 76
    };

    if (kind === 'comment') {
      return {
        id: `comment_${idSeed}`,
        type: 'base',
        position,
        data: {
          title: 'Sticky Comment',
          icon: 'align-left',
          controls: [{ type: 'textarea', id: `comment_text_${idSeed}`, value: 'Drop context for your future self.' }]
        }
      };
    }

    const templates: Record<AddNodeType, Omit<NodeData, 'status'>> = {
      text: {
        title: 'Text Prompt',
        label: 'Text Prompt',
        text: 'Dream up a scene with bold visual direction.',
        outputs: [{ id: 'prompt-out', label: 'Prompt', type: 'prompt' }]
      },
      'prompt-list': {
        title: 'Prompt List',
        icon: 'align-left',
        controls: [{ type: 'textarea', id: 'prompt_item_0', value: 'Hero shot prompt' }],
        outputs: [{ id: 'prompt-out', label: 'Prompt', type: 'prompt' }]
      },
      'image-list': {
        title: 'Image List',
        icon: 'align-left',
        controls: [{ type: 'textarea', id: 'image_item_0', value: '' }],
        outputs: [{ id: 'image-out', label: 'Image', type: 'image' }]
      },
      'image-generator': {
        title: 'Image Generator #25',
        icon: 'image',
        inputs: [
          { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
          { id: 'image-in', label: 'Image', type: 'image' }
        ],
        outputs: [{ id: 'image-out', label: 'Image', type: 'image' }],
        preview: { type: 'placeholder', text: '' },
        controls: [
          { type: 'textarea', id: `prompt_${idSeed}`, value: '' },
          {
            type: 'select',
            id: `model_${idSeed}`,
            value: 'nano-banana-pro',
            options: [
              { label: 'Nano Banana Pro', value: 'nano-banana-pro' },
              { label: 'Z-Image (Text only)', value: 'z-image' }
            ]
          },
          {
            type: 'select',
            id: `aspect_${idSeed}`,
            value: '16:9',
            options: [
              { label: '16:9', value: '16:9' },
              { label: '9:16', value: '9:16' },
              { label: '1:1', value: '1:1' },
              { label: '4:3', value: '4:3' },
              { label: '3:4', value: '3:4' }
            ]
          },
          {
            type: 'select',
            id: `res_${idSeed}`,
            value: '1K',
            options: [
              { label: '1K', value: '1K' },
              { label: '2K', value: '2K' },
              { label: '4K', value: '4K' }
            ]
          },
          {
            type: 'select',
            id: `amount_${idSeed}`,
            value: '1',
            options: [
              { label: 'x1', value: '1' },
              { label: 'x2', value: '2' },
              { label: 'x3', value: '3' },
              { label: 'x4', value: '4' }
            ]
          }
        ]
      },
      'video-generator': {
        title: 'Motion Burst',
        icon: 'video',
        inputs: [
          { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
          { id: 'image-in', label: 'Image', type: 'image' },
          { id: 'multi-prompt-in', label: 'Multi-shot', type: 'prompt' },
          { id: 'kling-elements-in', label: 'Elements', type: 'asset' }
        ],
        outputs: [{ id: 'video-out', label: 'Video', type: 'video' }],
        preview: { type: 'placeholder', text: '' },
        controls: [
          { type: 'textarea', id: `prompt_${idSeed}`, value: '' },
          {
            type: 'select',
            id: `model_${idSeed}`,
            value: 'kling-3.0/video',
            options: [
              { label: 'Kling 3.0 Video', value: 'kling-3.0/video' },
              { label: 'Veo 3.1', value: 'veo-3.1' }
            ]
          },
          {
            type: 'select',
            id: `aspect_${idSeed}`,
            value: '16:9',
            options: [
              { label: '16:9', value: '16:9' },
              { label: '9:16', value: '9:16' },
              { label: '1:1', value: '1:1' }
            ]
          },
          {
            type: 'select',
            id: `duration_${idSeed}`,
            value: '5',
            options: [
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
          },
          {
            type: 'select',
            id: `mode_${idSeed}`,
            value: 'pro',
            options: [
              { label: 'Pro', value: 'pro' },
              { label: 'Std', value: 'std' }
            ]
          },
          {
            type: 'select',
            id: `sound_${idSeed}`,
            value: 'false',
            options: [
              { label: 'Sound off', value: 'false' },
              { label: 'Sound on', value: 'true' }
            ]
          },
          {
            type: 'select',
            id: `multi_shots_${idSeed}`,
            value: 'false',
            options: [
              { label: 'Single shot', value: 'false' },
              { label: 'Multi-shot', value: 'true' }
            ]
          },
          {
            type: 'textarea',
            id: `multi_prompt_${idSeed}`,
            value: 'Aerial sweep over the skyline at sunset | 3\nClose-up of neon reflections in rain puddles | 2'
          }
        ]
      },
      download: {
        title: 'Download',
        icon: 'settings',
        inputs: [
          { id: 'image-in', label: 'Image', type: 'image' },
          { id: 'video-in', label: 'Video', type: 'video' }
        ]
      },
      assistant: {
        title: 'Assistant',
        icon: 'zap',
        inputs: [{ id: 'prompt-in', label: 'Prompt', type: 'prompt' }],
        outputs: [{ id: 'prompt-out', label: 'Response', type: 'prompt' }],
        controls: [{ type: 'textarea', id: `assistant_text_${idSeed}`, value: 'You are a creative co-pilot. Keep suggestions concise.' }]
      },
      upscaler: {
        title: 'Image Upscaler',
        icon: 'image',
        inputs: [{ id: 'image-in', label: 'Image', type: 'image' }],
        outputs: [{ id: 'image-out', label: 'Image', type: 'image' }],
        preview: { type: 'placeholder', text: 'Waiting for an image to upscale.' }
      },
      list: {
        title: 'List',
        icon: 'align-left',
        controls: [{ type: 'textarea', id: `list_text_${idSeed}`, value: '- Shot idea one\n- Shot idea two\n- Shot idea three' }],
        outputs: [{ id: 'items-out', label: 'Items', type: 'items' }]
      },
      upload: {
        title: 'Upload',
        icon: 'settings',
        outputs: [{ id: 'asset-out', label: 'Asset', type: 'asset' }],
        preview: { type: 'placeholder', text: 'Upload support is coming next.' }
      },
      assets: {
        title: 'Assets',
        icon: 'settings',
        outputs: [{ id: 'asset-out', label: 'Asset', type: 'asset' }],
        preview: { type: 'placeholder', text: 'Your asset library will appear here.' }
      },
      inspiration: {
        title: 'Find Inspiration',
        icon: 'text',
        controls: [{ type: 'textarea', id: `inspiration_text_${idSeed}`, value: 'Search references: moody cyberpunk streets, neon rain, dramatic low-angle.' }],
        outputs: [{ id: 'prompt-out', label: 'References', type: 'prompt' }]
      },
      'identity-vault': {
        title: 'Identity Vault',
        outputs: [
          { id: 'image-out', label: 'Seed Images', type: 'image' },
          { id: 'prompt-out', label: 'Style', type: 'prompt' }
        ],
        controls: [
          { type: 'textarea', id: `seed_images_${idSeed}`, value: '' },
          { type: 'textarea', id: `brand_colors_${idSeed}`, value: '' },
          { type: 'textarea', id: `negative_${idSeed}`, value: '' }
        ]
      }
    };

    const template = templates[kind];

    return {
      id: `node_${idSeed}`,
      type:
        kind === 'image-generator' ||
          kind === 'video-generator' ||
          kind === 'text' ||
          kind === 'download' ||
          kind === 'prompt-list' ||
          kind === 'image-list' ||
          kind === 'identity-vault'
          ? kind
          : 'base',
      position,
      data: {
        ...template,
        status: 'idle'
      }
    };
  };

  useEffect(() => {
    let hasChanges = false;

    const nextNodes = nodes.map((node) => {
      const isLegacyVideoBaseNode =
        node.type === 'base' &&
        node.data.icon === 'video' &&
        typeof node.data.title === 'string' &&
        node.data.title.toLowerCase().includes('motion');

      const isVideoGeneratorNode = node.type === 'video-generator' || isLegacyVideoBaseNode;

      if (!isVideoGeneratorNode) {
        return node;
      }

      let nextNode = node;
      if (isLegacyVideoBaseNode) {
        hasChanges = true;
        nextNode = {
          ...node,
          type: 'video-generator',
          data: {
            ...node.data,
            inputs: [
              { id: 'prompt-in', label: 'Prompt', type: 'prompt' },
              { id: 'image-in', label: 'Image', type: 'image' },
              { id: 'multi-prompt-in', label: 'Multi-shot', type: 'prompt' },
              { id: 'kling-elements-in', label: 'Elements', type: 'asset' }
            ],
            outputs: [{ id: 'video-out', label: 'Video', type: 'video' }],
            preview: node.data.preview || { type: 'placeholder', text: '' }
          }
        };
      }

      const inputs = nextNode.data.inputs ? [...nextNode.data.inputs] : [];
      const ensureInput = (id: string, label: string, type: string) => {
        const exists = inputs.some((input) => input.id === id || input.id.startsWith(`${id}_`) || input.id.startsWith(`${id}-`));
        if (!exists) {
          inputs.push({ id, label, type });
        }
      };

      ensureInput('prompt-in', 'Prompt', 'prompt');
      ensureInput('image-in', 'Image', 'image');
      ensureInput('multi-prompt-in', 'Multi-shot', 'prompt');
      ensureInput('kling-elements-in', 'Elements', 'asset');

      const hasInputChanges = !nextNode.data.inputs || inputs.length !== nextNode.data.inputs.length;

      if (hasInputChanges) {
        hasChanges = true;
        nextNode = {
          ...nextNode,
          data: {
            ...nextNode.data,
            inputs
          }
        };
      }

      const controls = nextNode.data.controls ? [...nextNode.data.controls] : [];
      const initialLength = controls.length;

      const ensureTextarea = (prefix: string, value: string) => {
        const exists = controls.some((control) => control.id.startsWith(prefix));
        if (!exists) {
          controls.push({ type: 'textarea', id: `${prefix}${nextNode.id}`, value });
        }
      };

      const ensureSelect = (prefix: string, value: string, options: Array<{ label: string; value: string }>) => {
        const exists = controls.some((control) => control.id.startsWith(prefix));
        if (!exists) {
          controls.push({ type: 'select', id: `${prefix}${nextNode.id}`, value, options });
        }
      };

      ensureTextarea('prompt_', '');
      ensureSelect('model_', 'kling-3.0/video', [
        { label: 'Kling 3.0 Video', value: 'kling-3.0/video' },
        { label: 'Veo 3.1', value: 'veo-3.1' }
      ]);
      ensureSelect('aspect_', '16:9', [
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' }
      ]);
      ensureSelect('duration_', '5', [
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
      ]);
      ensureSelect('mode_', 'pro', [
        { label: 'Pro', value: 'pro' },
        { label: 'Std', value: 'std' }
      ]);
      ensureSelect('sound_', 'false', [
        { label: 'Sound off', value: 'false' },
        { label: 'Sound on', value: 'true' }
      ]);
      ensureSelect('multi_shots_', 'false', [
        { label: 'Single shot', value: 'false' },
        { label: 'Multi-shot', value: 'true' }
      ]);
      ensureTextarea('multi_prompt_', 'Aerial sweep over the skyline at sunset | 3\nClose-up of neon reflections in rain puddles | 2');

      if (controls.length === initialLength) {
        return nextNode;
      }

      hasChanges = true;
      return {
        ...nextNode,
        data: {
          ...nextNode.data,
          controls
        }
      };
    });

    if (hasChanges) {
      setCanvas(nextNodes, edges);
    }
  }, [edges, nodes, setCanvas]);

  useEffect(() => {
    let hasChanges = false;

    const nextNodes = nodes.map((node) => {
      const isLegacyKlingElementsTextNode =
        node.type === 'text' &&
        (
          (typeof node.data.title === 'string' && node.data.title.toLowerCase().includes('kling element')) ||
          (typeof node.data.label === 'string' && node.data.label.toLowerCase().includes('kling element')) ||
          node.data.outputs?.some((output) => output.id === 'kling-elements-out')
        );

      const isKlingElementsNode = node.type === 'kling-elements' || isLegacyKlingElementsTextNode;
      if (!isKlingElementsNode) {
        return node;
      }

      const existingControls = node.data.controls ?? [];
      const nameByIndex = new Map<number, string>();
      const descriptionByIndex = new Map<number, string>();
      const categoryByIndex = new Map<number, string>();
      const modeByIndex = new Map<number, string>();
      const libraryIdByIndex = new Map<number, string>();
      const imageUrlsByIndex = new Map<number, string[]>();
      const videoUrlByIndex = new Map<number, string>();

      for (const control of existingControls) {
        if (control.type === 'textarea') {
          const nameIndex = parseShotIndex(control.id, 'element_name_');
          if (nameIndex !== null) {
            nameByIndex.set(nameIndex, control.value);
            continue;
          }

          const descriptionIndex = parseShotIndex(control.id, 'element_description_');
          if (descriptionIndex !== null) {
            descriptionByIndex.set(descriptionIndex, control.value);
            continue;
          }

          const libraryIdIndex = parseShotIndex(control.id, 'element_library_id_');
          if (libraryIdIndex !== null) {
            libraryIdByIndex.set(libraryIdIndex, control.value);
            continue;
          }

          const videoIndex = parseShotIndex(control.id, 'element_video_url_');
          if (videoIndex !== null) {
            videoUrlByIndex.set(videoIndex, control.value);
            continue;
          }

          const imageMatch = /^element_image_url_(\d+)_(\d+)$/.exec(control.id);
          if (imageMatch) {
            const index = Number.parseInt(imageMatch[1], 10);
            const slot = Number.parseInt(imageMatch[2], 10);
            if (Number.isFinite(index) && Number.isFinite(slot) && slot >= 0 && slot < 4) {
              const currentUrls = imageUrlsByIndex.get(index) ?? ['', '', '', ''];
              currentUrls[slot] = control.value;
              imageUrlsByIndex.set(index, currentUrls);
            }
          }

          continue;
        }

        const categoryIndex = parseShotIndex(control.id, 'element_category_');
        if (categoryIndex !== null) {
          categoryByIndex.set(categoryIndex, control.value);
          continue;
        }

        const modeIndex = parseShotIndex(control.id, 'element_mode_');
        if (modeIndex !== null) {
          modeByIndex.set(modeIndex, control.value);
        }
      }

      if (nameByIndex.size === 0) {
        nameByIndex.set(0, '');
      }

      const indices = Array.from(nameByIndex.keys()).sort((a, b) => a - b);
      const normalizedControls: NonNullable<typeof node.data.controls> = [];

      for (const index of indices) {
        normalizedControls.push({ type: 'textarea', id: `element_name_${index}`, value: nameByIndex.get(index) ?? '' });
        normalizedControls.push({
          type: 'textarea',
          id: `element_description_${index}`,
          value: descriptionByIndex.get(index) ?? ''
        });
        normalizedControls.push({
          type: 'select',
          id: `element_category_${index}`,
          value: categoryByIndex.get(index) ?? 'influencer',
          options: [
            { label: 'Influencer', value: 'influencer' },
            { label: 'Character', value: 'character' },
            { label: 'Animal', value: 'animal' },
            { label: 'Object', value: 'object' },
            { label: 'Custom', value: 'custom' }
          ]
        });
        normalizedControls.push({
          type: 'select',
          id: `element_mode_${index}`,
          value: modeByIndex.get(index) === 'video' ? 'video' : 'images',
          options: [
            { label: 'Images', value: 'images' },
            { label: 'Video', value: 'video' }
          ]
        });
        normalizedControls.push({
          type: 'textarea',
          id: `element_library_id_${index}`,
          value: libraryIdByIndex.get(index) ?? ''
        });

        const imageUrls = imageUrlsByIndex.get(index) ?? ['', '', '', ''];
        for (let slot = 0; slot < 4; slot += 1) {
          normalizedControls.push({
            type: 'textarea',
            id: `element_image_url_${index}_${slot}`,
            value: imageUrls[slot] ?? ''
          });
        }

        normalizedControls.push({
          type: 'textarea',
          id: `element_video_url_${index}`,
          value: videoUrlByIndex.get(index) ?? ''
        });
      }

      const outputs = node.data.outputs ? [...node.data.outputs] : [];
      const hasOutput = outputs.some(
        (output) =>
          output.id === 'kling-elements-out' ||
          output.id.startsWith('kling-elements-out_') ||
          output.id.startsWith('kling-elements-out-')
      );

      if (!hasOutput) {
        outputs.push({ id: 'kling-elements-out', label: 'Elements', type: 'asset' });
      }

      const controlsChanged = JSON.stringify(existingControls) !== JSON.stringify(normalizedControls);
      const outputsChanged = JSON.stringify(node.data.outputs ?? []) !== JSON.stringify(outputs);
      const typeChanged = node.type !== 'kling-elements';
      const titleChanged = node.data.title !== 'Kling Elements' || node.data.label !== 'Kling Elements';

      if (!controlsChanged && !outputsChanged && !typeChanged && !titleChanged) {
        return node;
      }

      hasChanges = true;
      return {
        ...node,
        type: 'kling-elements',
        data: {
          ...node.data,
          title: 'Kling Elements',
          label: 'Kling Elements',
          text: undefined,
          controls: normalizedControls,
          outputs
        }
      };
    });

    if (hasChanges) {
      setCanvas(nextNodes, edges);
    }
  }, [edges, nodes, setCanvas]);

  useEffect(() => {
    let hasChanges = false;

    const nextNodes = nodes.map((node) => {
      const isLegacyMultiShotTextNode =
        node.type === 'text' &&
        (
          (typeof node.data.title === 'string' && node.data.title.toLowerCase().includes('multi-shot')) ||
          (typeof node.data.label === 'string' && node.data.label.toLowerCase().includes('multi-shot')) ||
          node.data.outputs?.some((output) => output.id === 'multi-prompt-out')
        );

      const isMultiShotPromptNode = node.type === 'multi-shot-prompt' || isLegacyMultiShotTextNode;
      if (!isMultiShotPromptNode) {
        return node;
      }

      const legacyTextValue =
        node.data.controls?.find((control) => control.type === 'textarea')?.type === 'textarea'
          ? node.data.controls.find((control) => control.type === 'textarea')?.value || ''
          : typeof node.data.text === 'string'
            ? node.data.text
            : '';

      const existingControls = node.data.controls ?? [];
      const promptByIndex = new Map<number, string>();
      const durationByIndex = new Map<number, string>();

      for (const control of existingControls) {
        if (control.type === 'textarea') {
          const index = parseShotIndex(control.id, 'shot_prompt_');
          if (index !== null) {
            promptByIndex.set(index, control.value);
          }
          continue;
        }

        const index = parseShotIndex(control.id, 'shot_duration_');
        if (index !== null) {
          durationByIndex.set(index, control.value);
        }
      }

      if (promptByIndex.size === 0) {
        const parsedLegacyShots = parseMultiPrompt(legacyTextValue);
        if (parsedLegacyShots.length > 0) {
          parsedLegacyShots.forEach((shot, index) => {
            promptByIndex.set(index, shot.prompt);
            durationByIndex.set(index, String(shot.duration));
          });
        }
      }

      if (promptByIndex.size === 0) {
        promptByIndex.set(0, '');
      }

      const sortedIndices = Array.from(promptByIndex.keys()).sort((a, b) => a - b);
      const normalizedControls: NonNullable<typeof node.data.controls> = [];

      for (const index of sortedIndices) {
        normalizedControls.push({ type: 'textarea', id: `shot_prompt_${index}`, value: promptByIndex.get(index) ?? '' });
        normalizedControls.push({
          type: 'select',
          id: `shot_duration_${index}`,
          value: durationByIndex.get(index) ?? '3',
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
        });
      }

      const outputs = node.data.outputs ? [...node.data.outputs] : [];
      const hasMultiPromptOutput = outputs.some(
        (output) => output.id === 'multi-prompt-out' || output.id.startsWith('multi-prompt-out_') || output.id.startsWith('multi-prompt-out-')
      );

      if (!hasMultiPromptOutput) {
        outputs.push({ id: 'multi-prompt-out', label: 'Multi-shot', type: 'prompt' });
      }

      const controlsChanged = JSON.stringify(existingControls) !== JSON.stringify(normalizedControls);
      const outputChanged = JSON.stringify(node.data.outputs ?? []) !== JSON.stringify(outputs);
      const typeChanged = node.type !== 'multi-shot-prompt';
      const titleChanged = node.data.title !== 'Multi-shot Prompt' || node.data.label !== 'Multi-shot Prompt';

      if (!controlsChanged && !outputChanged && !typeChanged && !titleChanged) {
        return node;
      }

      hasChanges = true;
      return {
        ...node,
        type: 'multi-shot-prompt',
        data: {
          ...node.data,
          title: 'Multi-shot Prompt',
          label: 'Multi-shot Prompt',
          text: undefined,
          controls: normalizedControls,
          outputs
        }
      };
    });

    if (hasChanges) {
      setCanvas(nextNodes, edges);
    }
  }, [edges, nodes, setCanvas]);

  useEffect(() => {
    let hasChanges = false;

    const nextNodes = nodes.map((node) => {
      if (node.type !== 'prompt-list' && node.type !== 'image-list') {
        return node;
      }

      const controls = node.data.controls ?? [];
      const prefix = node.type === 'prompt-list' ? 'prompt_item_' : 'image_item_';
      const hasIndexedControls = controls.some(
        (control) => control.type === 'textarea' && control.id.startsWith(prefix)
      );

      const outputId = node.type === 'prompt-list' ? 'prompt-out' : 'image-out';
      const outputLabel = node.type === 'prompt-list' ? 'Prompt' : 'Image';
      const outputType = node.type === 'prompt-list' ? 'prompt' : 'image';
      const outputs = [{ id: outputId, label: outputLabel, type: outputType }];
      const outputChanged = JSON.stringify(node.data.outputs ?? []) !== JSON.stringify(outputs);

      if (hasIndexedControls && !outputChanged) {
        return node;
      }

      const fallbackTextarea = controls.find((control) => control.type === 'textarea');
      const fallbackLines = fallbackTextarea?.type === 'textarea'
        ? fallbackTextarea.value
          .split('\n')
          .map((line) => line.replace(/^[-*]\s*/, '').trim())
          .filter((line) => line.length > 0)
        : [];

      const normalizedValues = fallbackLines.length > 0 ? fallbackLines : [''];
      const normalizedControls = normalizedValues.map((value, index) => ({
        type: 'textarea' as const,
        id: `${prefix}${index}`,
        value
      }));

      hasChanges = true;
      return {
        ...node,
        data: {
          ...node.data,
          title: node.type === 'prompt-list' ? 'Prompt List' : 'Image List',
          controls: hasIndexedControls ? controls : normalizedControls,
          outputs
        }
      };
    });

    if (hasChanges) {
      setCanvas(nextNodes, edges);
    }
  }, [edges, nodes, setCanvas]);

  const handleAddNode = (type: AddNodeType) => {
    rememberGraph();
    setCanvas([...nodes, buildNode(type)], edges);
  };

  const handleAddComment = () => {
    rememberGraph();
    setCanvas([...nodes, buildNode('comment')], edges);
  };

  const handleCutSelection = () => {
    const selectedIds = nodes.filter((node) => node.selected).map((node) => node.id);
    if (selectedIds.length === 0) {
      return;
    }

    const idsToRemove = new Set(selectedIds);
    let foundNestedChildren = true;

    while (foundNestedChildren) {
      foundNestedChildren = false;
      for (const node of nodes) {
        if (!node.parentId || idsToRemove.has(node.id)) {
          continue;
        }

        if (idsToRemove.has(node.parentId)) {
          idsToRemove.add(node.id);
          foundNestedChildren = true;
        }
      }
    }

    rememberGraph();
    setCanvas(
      nodes.filter((node) => !idsToRemove.has(node.id)),
      edges.filter((edge) => !idsToRemove.has(edge.source) && !idsToRemove.has(edge.target))
    );
  };

  const handleUndo = () => {
    setHistory((prevHistory) => {
      const previous = prevHistory[prevHistory.length - 1];
      if (!previous) {
        return prevHistory;
      }

      setFuture((prevFuture) => [cloneGraph(), ...prevFuture].slice(0, 40));
      setCanvas(previous.nodes, previous.edges);
      return prevHistory.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setFuture((prevFuture) => {
      const [next, ...rest] = prevFuture;
      if (!next) {
        return prevFuture;
      }

      setHistory((prevHistory) => [...prevHistory, cloneGraph()].slice(-40));
      setCanvas(next.nodes, next.edges);
      return rest;
    });
  };

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const modifierPressed = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifierPressed && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handleCutSelection();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handleCutSelection, handleRedo, handleUndo]);

  const isRunnableMediaNode = (node: Node<NodeData>) =>
    node.type === 'image-generator' ||
    node.type === 'video-generator' ||
    (node.type === 'media' && node.data.type === 'video') ||
    (node.type === 'base' && node.data.icon === 'video');

  const selectedMediaNode = useMemo(() => {
    const selected = nodes.find((node) => node.selected && isRunnableMediaNode(node));
    if (selected) {
      return selected;
    }
    return nodes.find((node) => isRunnableMediaNode(node));
  }, [nodes]);

  const onRun = async () => {
    if (!selectedMediaNode || running) {
      return;
    }

    const isImageGen = selectedMediaNode.type === 'image-generator';
    const isVideoGen =
      selectedMediaNode.type === 'video-generator' ||
      (selectedMediaNode.type === 'media' && selectedMediaNode.data.type === 'video') ||
      (selectedMediaNode.type === 'base' && selectedMediaNode.data.icon === 'video');

    let modelToUse = isImageGen ? 'nano-banana-pro' : 'kling-3.0/video';
    const modelControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('model_'));
    if (modelControl?.value) {
      modelToUse = modelControl.value;
    }

    const getConnectedSourceNodes = (targetHandleIds: string[]) =>
      edges
        .filter(
          (candidate) =>
            candidate.target === selectedMediaNode.id &&
            handleIdMatches(candidate.targetHandle, targetHandleIds)
        )
        .map((edge) => nodes.find((node) => node.id === edge.source))
        .filter((node): node is Node<NodeData> => !!node);

    const getConnectedSourceNode = (targetHandleIds: string[]) =>
      getConnectedSourceNodes(targetHandleIds)[0];

    const extractPrompt = (node?: Node<NodeData>) => {
      const control = node?.data?.controls?.find?.((c: any) => c.type === 'textarea');
      if (control?.value) {
        return control.value as string;
      }
      return node?.data?.text;
    };

    const extractImageUrl = (node?: Node<NodeData>) => {
      if (!node) {
        return undefined;
      }

      if (node.data.preview?.type === 'image') {
        return node.data.preview.url;
      }

      return node.data.mediaUrl;
    };

    const promptSourceNodes = getConnectedSourceNodes(['prompt-in', 'style_in', 'prompt_in']);
    const connectedPromptNode = promptSourceNodes.find((node) => node.type === 'prompt-list') ?? promptSourceNodes[0];
    const connectedPromptSections = extractPromptListSectionsFromNode(connectedPromptNode);

    let promptText = 'Cinematic industrial shot with mannequin silhouette';
    const promptControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('prompt_'));
    if (connectedPromptSections.length > 0) {
      promptText = connectedPromptSections[0];
    } else if (promptControl?.value) {
      promptText = promptControl.value;
    } else {
      const connectedPrompt = extractPrompt(connectedPromptNode);
      if (connectedPrompt) {
        promptText = connectedPrompt;
      } else {
        // Legacy fallback for older video nodes that only read from text nodes.
        const promptNode = nodes.find((n) => n.type === 'text' || (n.type === 'base' && n.data.icon === 'text'));
        const fallbackPrompt = extractPrompt(promptNode);
        if (fallbackPrompt) {
          promptText = fallbackPrompt;
        }
      }
    }

    let aspectRatio = '16:9';
    const aspectControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('aspect_'));
    if (aspectControl?.value) {
      aspectRatio = aspectControl.value;
    }

    let resolution = '1K';
    let amount = 1;
    if (isImageGen) {
      const resControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('res_'));
      if (resControl?.value) {
        resolution = resControl.value;
      }

      const amountControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('amount_'));
      if (amountControl?.value) {
        amount = parseInt(amountControl.value, 10) || 1;
      }
    }

    let duration = '5';
    let mode: 'std' | 'pro' = 'pro';
    let sound = false;
    let multiShots = false;
    let multiPrompt: KlingMultiPromptItem[] = [];
    let klingElements: KlingElementParameter[] = [];
    const imageSourceNodes = getConnectedSourceNodes(['image-in', 'image_in', 'motion_in', 'upscale_in']);
    const connectedImageNode = imageSourceNodes.find((node) => node.type === 'image-list') ?? imageSourceNodes[0];
    const connectedImageSections = extractImageListSectionsFromNode(connectedImageNode);
    const referenceImageUrl = extractImageUrl(connectedImageNode);

    if (isVideoGen) {
      const durationControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('duration_'));
      if (durationControl?.value) {
        duration = durationControl.value;
      }

      const modeControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('mode_'));
      if (modeControl?.value === 'std' || modeControl?.value === 'pro') {
        mode = modeControl.value;
      }

      const soundControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('sound_'));
      sound = soundControl?.value === 'true';

      const multiShotsControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('multi_shots_'));
      const connectedMultiPromptNode = getConnectedSourceNode(['multi-prompt-in', 'multi_prompt_in']);
      const connectedMultiPromptShots = extractMultiPromptFromNode(connectedMultiPromptNode);
      multiShots = modelToUse === 'kling-3.0/video' && (
        multiShotsControl?.value === 'true' ||
        connectedMultiPromptShots.length > 0
      );

      const multiPromptControl = selectedMediaNode.data?.controls?.find((c: any) => c.id.startsWith('multi_prompt_'));
      if (connectedMultiPromptShots.length > 0) {
        multiPrompt = connectedMultiPromptShots;
      } else {
        const rawMultiPrompt = typeof multiPromptControl?.value === 'string' ? multiPromptControl.value : '';
        multiPrompt = parseMultiPrompt(rawMultiPrompt);
      }

      const connectedKlingElementsNode = getConnectedSourceNode(['kling-elements-in', 'kling_elements_in']);
      klingElements = extractKlingElementsFromNode(connectedKlingElementsNode);

      if (multiShots && multiPrompt.length === 0) {
        const fallbackDuration = clampShotDuration(Number.parseInt(duration, 10) || 5);
        multiPrompt = [{ prompt: promptText, duration: fallbackDuration }];
      }

      if (multiShots) {
        sound = true;
      }
    }

    const promptBatchValues = connectedPromptSections;
    const imageBatchValues = connectedImageSections;
    const batchCount = Math.max(promptBatchValues.length, imageBatchValues.length, 1);
    const resultMediaType: 'image' | 'video' = isImageGen ? 'image' : 'video';

    const buildParametersForIteration = (
      iterationPrompt: string,
      iterationReferenceImageUrl?: string
    ): Parameters<typeof executeWorkflow>[0]['parameters'] => {
      const parameters: Parameters<typeof executeWorkflow>[0]['parameters'] = {
        prompt: iterationPrompt,
        aspectRatio
      };

      if (isImageGen) {
        parameters.resolution = resolution;
        parameters.amount = amount;
        if (iterationReferenceImageUrl) {
          parameters.referenceImageUrl = iterationReferenceImageUrl;
        }
      }

      if (isVideoGen) {
        parameters.duration = duration;
        parameters.mode = mode;
        parameters.sound = sound;
        parameters.multiShots = multiShots;
        if (multiShots) {
          parameters.multiPrompt = multiPrompt;
        }
        if (klingElements.length > 0) {
          parameters.klingElements = klingElements;
        }
        if (iterationReferenceImageUrl) {
          parameters.referenceImageUrl = iterationReferenceImageUrl;
        }
      }

      return parameters;
    };

    const runSingleWorkflow = async (
      parameters: Parameters<typeof executeWorkflow>[0]['parameters']
    ) => {
      const executeResult = await executeWorkflow({
        workspaceId,
        nodeId: selectedMediaNode.id,
        model: modelToUse,
        parameters
      });

      return new Promise<string | undefined>((resolve, reject) => {
        let settled = false;
        let fallbackAttempted = false;
        let unsubscribe: () => void = () => undefined;

        const settleSuccess = (mediaUrl?: string) => {
          if (settled) {
            return;
          }

          settled = true;
          unsubscribe();
          resolve(mediaUrl);
        };

        const settleFailure = () => {
          if (settled) {
            return;
          }

          settled = true;
          unsubscribe();
          reject(new Error('Workflow execution failed'));
        };

        const runRestFallback = async () => {
          if (settled || fallbackAttempted) {
            return;
          }

          fallbackAttempted = true;

          try {
            const latest = await getJobStatus(executeResult.jobId, workspaceId);
            if (latest.status === 'succeeded') {
              settleSuccess(latest.mediaUrl);
              return;
            }

            if (latest.status === 'failed') {
              settleFailure();
              return;
            }
          } catch {
            // Continue to shared failure path.
          }

          settleFailure();
        };

        unsubscribe = subscribeToJobStatus(executeResult.jobId, workspaceId, {
          onUpdate: (job) => {
            if (job.status === 'succeeded') {
              settleSuccess(job.mediaUrl);
              return;
            }

            if (job.status === 'failed') {
              settleFailure();
            }
          },
          onError: () => {
            if (settled) {
              return;
            }

            unsubscribe();
            void runRestFallback();
          }
        });
      });
    };

    setRunning(true);
    clearNodeResultMedia(selectedMediaNode.id);
    markNode(selectedMediaNode.id, 'processing');

    try {
      let lastMediaUrl: string | undefined;

      for (let batchIndex = 0; batchIndex < batchCount; batchIndex += 1) {
        const iterationPrompt = pickBatchedValue(promptBatchValues, batchIndex) ?? promptText;
        const iterationReferenceImageUrl =
          pickBatchedValue(imageBatchValues, batchIndex) ??
          referenceImageUrl;

        const iterationParameters = buildParametersForIteration(iterationPrompt, iterationReferenceImageUrl);
        const mediaUrl = await runSingleWorkflow(iterationParameters);
        if (mediaUrl) {
          lastMediaUrl = mediaUrl;
          appendNodeResultMedia(selectedMediaNode.id, { type: resultMediaType, url: mediaUrl });
        }

        if (batchIndex < batchCount - 1) {
          markNode(selectedMediaNode.id, 'processing', lastMediaUrl);
        }
      }

      markNode(selectedMediaNode.id, 'succeeded', lastMediaUrl);
    } catch {
      markNode(selectedMediaNode.id, 'failed');
    } finally {
      setRunning(false);
    }
  };

  const userMenuItemClass = 'w-full rounded-lg border border-transparent px-2.5 py-2 text-left text-sm text-slate-200 transition hover:border-slate-700/70 hover:bg-slate-800/70';

  return (
    <main className="flex h-full min-h-full flex-col">
      <div className="run-form sr-only" aria-hidden="true">
        <button
          type="button"
          className="rounded-lg bg-sky-700 px-3 py-2 font-semibold text-white disabled:bg-slate-500"
          onClick={onRun}
          disabled={running}
          tabIndex={-1}
        >
          {running ? 'Generating Pipeline...' : 'Run Pipeline'}
        </button>
      </div>

      <header className="flex min-h-[58px] items-center justify-between gap-3 border-b border-white/5 bg-ink-950 px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap">
          <div
            className={`inline-flex items-center gap-3 overflow-hidden transition-all duration-300 ${isSidebarCollapsed
              ? 'max-w-[280px] translate-x-0 opacity-100'
              : 'pointer-events-none max-w-0 -translate-x-3 opacity-0'
              }`}
            aria-hidden={!isSidebarCollapsed}
          >
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-ink-900 text-zinc-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Expand sidebar"
              disabled={!isSidebarCollapsed}
              tabIndex={isSidebarCollapsed ? 0 : -1}
              onClick={() => {
                window.dispatchEvent(new Event('persona:toggle-sidebar'));
              }}
            >
              <PanelLeftOpen size={16} />
            </button>
            <div className="text-sm font-black tracking-[0.08em] text-white sm:text-base" aria-label="Persona logo">
              PERSONA ENGINE
            </div>
          </div>

          <nav className="flex min-w-0 items-center gap-2 text-sm text-slate-300" aria-label="Workspace breadcrumbs">
            <Link href="/projects" className="truncate transition hover:text-white">
              {breadcrumbProjectLabel}
            </Link>
            <span className="text-slate-500">/</span>
            <Link href="/spaces" className="truncate transition hover:text-white">
              Spaces
            </Link>
            <span className="text-slate-500">/</span>
            <span className="max-w-[220px] truncate font-semibold text-slate-100" title={breadcrumbWorkspaceLabel}>
              {breadcrumbWorkspaceLabel}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-ink-900 text-zinc-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={20} />
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-medium text-ink-950 transition-colors duration-200 ${userMenuOpen
                ? 'bg-white ring-2 ring-white/20 ring-offset-2 ring-offset-black'
                : 'bg-zinc-200 hover:bg-white'
                }`}
              aria-label="Open user menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              U
            </button>

            {userMenuOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+10px)] z-40 w-[320px] max-w-[92vw] overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-panel"
                role="menu"
                aria-label="User settings menu"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 font-medium text-ink-950">U</div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <strong className="truncate text-sm font-medium leading-none text-white">Persona User</strong>
                    <span className="truncate text-xs text-zinc-400">creator@persona.local</span>
                  </div>
                </div>

                <div className="grid gap-2 px-4 pb-3">
                  <button
                    type="button"
                    className="h-9 rounded-md bg-white text-sm font-medium text-ink-950 transition-colors duration-200 hover:bg-zinc-200"
                  >
                    Get a plan
                  </button>
                  <button
                    type="button"
                    className="h-9 rounded-md border border-white/10 bg-ink-900 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10"
                  >
                    Create your team
                  </button>
                </div>

                <div className="border-t border-slate-800 p-2">
                  <button type="button" className={userMenuItemClass}>
                    <span className="inline-flex items-center gap-2.5">
                      <CreditCard size={16} />
                      <span>Plan &amp; billing</span>
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">Free</span>
                  </button>
                  <button
                    type="button"
                    className={userMenuItemClass}
                    onClick={() => {
                      setSettingsOpen(true);
                      setUserMenuOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Settings size={16} />
                      <span>Settings</span>
                    </span>
                  </button>
                  <button type="button" className={userMenuItemClass}>
                    <span className="inline-flex items-center gap-2.5">
                      <UserRound size={16} />
                      <span>Creator profile</span>
                    </span>
                  </button>
                  <button type="button" className={userMenuItemClass}>
                    <span className="inline-flex items-center gap-2.5">
                      <FolderOpen size={16} />
                      <span>My collections</span>
                    </span>
                  </button>
                  <button type="button" className={userMenuItemClass}>
                    <span className="inline-flex items-center gap-2.5">
                      <Languages size={16} />
                      <span>Language</span>
                    </span>
                    <span className="inline-flex h-8 min-w-[108px] items-center justify-center gap-1 rounded-md border border-slate-700/70 bg-slate-900 px-2 text-xs text-slate-100">
                      English <ChevronDown size={14} />
                    </span>
                  </button>
                  <button type="button" className={userMenuItemClass}>
                    <span className="inline-flex items-center gap-2.5">
                      <Moon size={16} />
                      <span>Theme</span>
                    </span>
                    <span className="inline-flex h-8 min-w-[108px] items-center justify-center gap-1 rounded-md border border-slate-700/70 bg-slate-900 px-2 text-xs text-slate-100">
                      Dark <ChevronDown size={14} />
                    </span>
                  </button>
                  <button type="button" className={userMenuItemClass}>
                    <span className="inline-flex items-center gap-2.5">
                      <Sparkles size={16} />
                      <span>Use AI code</span>
                    </span>
                  </button>
                  <button type="button" className={userMenuItemClass}>
                    <span className="inline-flex items-center gap-2.5">
                      <LifeBuoy size={16} />
                      <span>Help center</span>
                    </span>
                  </button>
                </div>

                <div className="border-t border-slate-800 px-2 py-2.5">
                  <button type="button" className={`${userMenuItemClass} text-slate-100`}>
                    <span className="inline-flex items-center gap-2.5">
                      <LogOut size={16} />
                      <span>Log out</span>
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <WorkspaceSettingsModal
        workspaceId={workspaceId}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {canvasError ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          {canvasError}
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 overflow-hidden bg-[#0f0f11]" onClick={closeContextMenus}>
        <FloatingToolbar
          activeTool={activeTool}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onAddNode={handleAddNode}
          onCutSelection={handleCutSelection}
          onSetTool={setActiveTool}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          proOptions={{ hideAttribution: true }}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => {
            setNodes(changes);
            broadcastNodePositions(changes);
          }}
          onEdgesChange={setEdges}
          onConnect={(connection) => {
            onConnect(connection);
            broadcastEdges(useCanvasStore.getState().edges);
          }}
          onMoveEnd={(_, viewport) => {
            viewportRef.current = viewport;
            setViewportVersion((version) => version + 1);
          }}
          isValidConnection={(connection: Connection) => isConnectionCompatible(connection)}
          deleteKeyCode={null}
          elementsSelectable={activeTool === 'select'}
          nodesDraggable={activeTool === 'select'}
          panOnDrag={activeTool === 'draw'}
          selectionOnDrag={activeTool === 'select'}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          fitView
        >
          {nodeContextMenu && (
            <NodeContextMenu
              id={nodeContextMenu.id}
              top={nodeContextMenu.top}
              left={nodeContextMenu.left}
              onDuplicate={(id, x, y) => duplicateNode(id, x, y)}
              onDelete={deleteNode}
              onClose={() => setNodeContextMenu(null)}
            />
          )}
          {paneContextMenu && (
            <PaneContextMenu
              top={paneContextMenu.top}
              left={paneContextMenu.left}
              onAddNode={(type: AddNodeType) => {
                handleAddNode(type);
              }}
              onClose={() => setPaneContextMenu(null)}
            />
          )}
          {!focusMode ? (
            <MiniMap
              className="!rounded-lg !border !border-white/10 !bg-ink-950"
              style={{ backgroundColor: '#000' }}
              maskColor="var(--ink-800)"
              nodeColor={getMiniMapNodeColor}
              nodeStrokeColor="rgba(255,255,255,0.1)"
            />
          ) : null}
          <Background gap={focusMode ? 48 : 24} size={1.5} color="rgba(255,255,255,0.1)" />
        </ReactFlow>
      </section>
    </main>
  );
}
