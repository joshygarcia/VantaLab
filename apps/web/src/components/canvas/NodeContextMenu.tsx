type NodeContextMenuProps = {
  id: string;
  top: number;
  left: number;
  onDuplicate: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function NodeContextMenu({ id, top, left, onDuplicate, onDelete, onClose }: NodeContextMenuProps) {
  return (
    <div
      className="absolute z-[1000] w-[210px] rounded-lg border border-white/10 bg-ink-900 p-2 shadow-panel"
      role="menu"
      aria-label="Node context menu"
      style={{ top, left }}
    >
      <div className="grid gap-1">
        <button
          className="flex min-h-9 items-center rounded-md border border-transparent bg-transparent px-2.5 text-left text-xs text-white transition hover:bg-white/10"
          onClick={() => {
            onDuplicate(id, top, left);
            onClose();
          }}
          type="button"
        >
          Duplicate
        </button>

        <button
          className="flex min-h-9 items-center rounded-md border border-transparent bg-transparent px-2.5 text-left text-xs text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
          onClick={() => {
            onDelete(id);
            onClose();
          }}
          type="button"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
