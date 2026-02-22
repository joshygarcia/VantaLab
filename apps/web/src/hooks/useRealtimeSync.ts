'use client';

import { useEffect, useRef } from 'react';
import { Edge, Node, NodeChange } from 'reactflow';
import { createClient } from '@/lib/supabase/client';
import { NodeData, useCanvasStore } from '@/store/canvas-store';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Broadcasts node position & dimension changes to all peers on the same
 * workspace channel using Supabase Realtime Broadcast.
 *
 * - Listens for `canvas:nodes-change` events from other clients.
 * - Publishes local position / dimension changes (debounced).
 * - Uses a unique `senderId` to avoid echoing own updates.
 */
export function useRealtimeSync(workspaceId: string | null) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const senderIdRef = useRef<string>(crypto.randomUUID());
    const pendingRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { nodes, edges, setCanvas } = useCanvasStore();

    // ── Subscribe to channel ──────────────────────────────────────────
    useEffect(() => {
        if (!workspaceId) return;

        const supabase = createClient();
        const channel = supabase.channel(`workspace-${workspaceId}`, {
            config: { broadcast: { self: false } },
        });

        channel.on('broadcast', { event: 'canvas:nodes-change' }, ({ payload }) => {
            if (!payload || payload.senderId === senderIdRef.current) return;

            const changes = payload.changes as Array<{
                id: string;
                position?: { x: number; y: number };
                width?: number;
                height?: number;
            }>;

            if (!Array.isArray(changes) || changes.length === 0) return;

            // Apply incoming changes to current store state
            const state = useCanvasStore.getState();
            const nodeMap = new Map(changes.map((c) => [c.id, c]));
            const updatedNodes = state.nodes.map((node) => {
                const change = nodeMap.get(node.id);
                if (!change) return node;

                const updated = { ...node };
                if (change.position) {
                    updated.position = change.position;
                }
                if (change.width !== undefined) {
                    updated.width = change.width;
                }
                if (change.height !== undefined) {
                    updated.height = change.height;
                }
                return updated;
            });

            state.setCanvas(updatedNodes, state.edges);
        });

        channel.on('broadcast', { event: 'canvas:edges-change' }, ({ payload }) => {
            if (!payload || payload.senderId === senderIdRef.current) return;
            const newEdges = payload.edges as Edge[];
            if (!Array.isArray(newEdges)) return;

            const state = useCanvasStore.getState();
            state.setCanvas(state.nodes, newEdges);
        });

        channel.on('broadcast', { event: 'canvas:full-sync' }, ({ payload }) => {
            if (!payload || payload.senderId === senderIdRef.current) return;
            const syncNodes = payload.nodes as Node<NodeData>[];
            const syncEdges = payload.edges as Edge[];
            if (!Array.isArray(syncNodes) || !Array.isArray(syncEdges)) return;

            const state = useCanvasStore.getState();
            state.setCanvas(syncNodes, syncEdges);
        });

        channel.subscribe();
        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [workspaceId]);

    // ── Broadcast helpers ─────────────────────────────────────────────
    const broadcastNodePositions = (nodeChanges: NodeChange[]) => {
        const positionChanges = nodeChanges.filter(
            (c): c is NodeChange & { type: 'position'; id: string; position: { x: number; y: number } } =>
                c.type === 'position' && 'position' in c && c.position != null
        );

        if (positionChanges.length === 0) return;

        for (const change of positionChanges) {
            pendingRef.current.set(change.id, change.position);
        }

        // Debounce to batch rapid drags (~33ms = ~30 fps)
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => {
            const channel = channelRef.current;
            if (!channel || pendingRef.current.size === 0) return;

            const changes = Array.from(pendingRef.current.entries()).map(([id, position]) => ({
                id,
                position,
            }));

            channel.send({
                type: 'broadcast',
                event: 'canvas:nodes-change',
                payload: { senderId: senderIdRef.current, changes },
            });

            pendingRef.current.clear();
        }, 33);
    };

    const broadcastEdges = (newEdges: Edge[]) => {
        const channel = channelRef.current;
        if (!channel) return;

        channel.send({
            type: 'broadcast',
            event: 'canvas:edges-change',
            payload: { senderId: senderIdRef.current, edges: newEdges },
        });
    };

    const broadcastFullSync = () => {
        const channel = channelRef.current;
        if (!channel) return;

        const state = useCanvasStore.getState();
        channel.send({
            type: 'broadcast',
            event: 'canvas:full-sync',
            payload: {
                senderId: senderIdRef.current,
                nodes: state.nodes,
                edges: state.edges,
            },
        });
    };

    return {
        broadcastNodePositions,
        broadcastEdges,
        broadcastFullSync,
    };
}
