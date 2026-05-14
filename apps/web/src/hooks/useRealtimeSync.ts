'use client';

import { useEffect, useRef } from 'react';
import { Edge, Node, NodeChange } from 'reactflow';
import {
    addDoc,
    collection,
    deleteDoc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    where,
} from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase/client';
import { NodeData, useCanvasStore } from '@/store/canvas-store';

/**
 * Broadcasts node position & dimension changes to all peers on the same
 * workspace using a Firestore `canvasEvents` subcollection.
 *
 * - Subscribes to `workspaces/{id}/canvasEvents` ordered by createdAt.
 * - Publishes local changes via `addDoc` (debounced for positions).
 * - Filters out own events via a per-tab `senderId`.
 */
export function useRealtimeSync(workspaceId: string | null) {
    const senderIdRef = useRef<string>(typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Math.random()}`);
    const pendingRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const eventsRefRef = useRef<ReturnType<typeof collection> | null>(null);

    useEffect(() => {
        if (!workspaceId) return;

        const firestore = getFirestore(getFirebaseApp());
        const eventsRef = collection(firestore, 'workspaces', workspaceId, 'canvasEvents');
        eventsRefRef.current = eventsRef;

        // Only observe events created after we mounted to avoid replaying history.
        const mountedAt = Timestamp.now();
        const q = query(eventsRef, where('createdAt', '>', mountedAt), orderBy('createdAt'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type !== 'added') return;
                const data = change.doc.data() as {
                    type?: string;
                    senderId?: string;
                    payload?: Record<string, unknown>;
                };
                if (!data || data.senderId === senderIdRef.current) return;

                const state = useCanvasStore.getState();

                if (data.type === 'nodes-change') {
                    const changes = data.payload?.changes as Array<{
                        id: string;
                        position?: { x: number; y: number };
                        width?: number;
                        height?: number;
                    }> | undefined;
                    if (!Array.isArray(changes) || changes.length === 0) return;
                    const nodeMap = new Map(changes.map((c) => [c.id, c]));
                    const updatedNodes = state.nodes.map((node) => {
                        const c = nodeMap.get(node.id);
                        if (!c) return node;
                        const updated = { ...node };
                        if (c.position) updated.position = c.position;
                        if (c.width !== undefined) updated.width = c.width;
                        if (c.height !== undefined) updated.height = c.height;
                        return updated;
                    });
                    state.setCanvas(updatedNodes, state.edges);
                } else if (data.type === 'edges-change') {
                    const edges = data.payload?.edges as Edge[] | undefined;
                    if (Array.isArray(edges)) state.setCanvas(state.nodes, edges);
                } else if (data.type === 'full-sync') {
                    const nodes = data.payload?.nodes as Node<NodeData>[] | undefined;
                    const edges = data.payload?.edges as Edge[] | undefined;
                    if (Array.isArray(nodes) && Array.isArray(edges)) state.setCanvas(nodes, edges);
                }

                // Best-effort cleanup of consumed events older than 60s
                const createdAt = (data as any).createdAt as Timestamp | undefined;
                if (createdAt && Date.now() - createdAt.toMillis() > 60_000) {
                    void deleteDoc(change.doc.ref).catch(() => undefined);
                }
            });
        });

        return () => {
            unsubscribe();
            eventsRefRef.current = null;
        };
    }, [workspaceId]);

    const publish = async (type: 'nodes-change' | 'edges-change' | 'full-sync', payload: Record<string, unknown>) => {
        const ref = eventsRefRef.current;
        if (!ref) return;
        try {
            await addDoc(ref, {
                type,
                senderId: senderIdRef.current,
                payload,
                createdAt: serverTimestamp(),
            });
        } catch {
            // Realtime is best-effort; persistence happens via the API.
        }
    };

    const broadcastNodePositions = (nodeChanges: NodeChange[]) => {
        const positionChanges = nodeChanges.filter(
            (c): c is NodeChange & { type: 'position'; id: string; position: { x: number; y: number } } =>
                c.type === 'position' && 'position' in c && c.position != null
        );
        if (positionChanges.length === 0) return;
        for (const change of positionChanges) {
            pendingRef.current.set(change.id, change.position);
        }
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        // Firestore writes are pricier than channel broadcasts; debounce harder.
        flushTimerRef.current = setTimeout(() => {
            if (pendingRef.current.size === 0) return;
            const changes = Array.from(pendingRef.current.entries()).map(([id, position]) => ({ id, position }));
            pendingRef.current.clear();
            void publish('nodes-change', { changes });
        }, 200);
    };

    const broadcastEdges = (newEdges: Edge[]) => {
        void publish('edges-change', { edges: newEdges });
    };

    const broadcastFullSync = () => {
        const state = useCanvasStore.getState();
        void publish('full-sync', { nodes: state.nodes, edges: state.edges });
    };

    return { broadcastNodePositions, broadcastEdges, broadcastFullSync };
}
