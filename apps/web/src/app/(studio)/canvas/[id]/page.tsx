import { CanvasWorkspace } from '@/components/canvas/canvas-workspace';

export default async function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CanvasWorkspace workspaceId={id} />;
}
