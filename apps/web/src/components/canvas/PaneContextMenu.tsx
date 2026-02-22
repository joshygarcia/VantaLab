import { useMemo, useState } from 'react';
import { ADD_NODE_MENU_ITEMS, AddNodeType } from './add-node-menu';

type PaneContextMenuProps = {
  top: number;
  left: number;
  onAddNode: (type: AddNodeType) => void;
  onClose: () => void;
};

export function PaneContextMenu({ top, left, onAddNode, onClose }: PaneContextMenuProps) {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return ADD_NODE_MENU_ITEMS;
    }
    return ADD_NODE_MENU_ITEMS.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [query]);

  const basicItems = filteredItems.filter((item) => item.group === 'basics');
  const mediaItems = filteredItems.filter((item) => item.group === 'media');

  const handleSelectNodeType = (type: AddNodeType) => {
    onAddNode(type);
    onClose();
  };

  return (
    <div
      className="absolute z-[1000] w-[280px] rounded-lg border border-white/10 bg-ink-900 p-3 shadow-panel"
      role="dialog"
      aria-label="Add node context menu"
      style={{ top, left }}
    >
      <div className="text-sm font-medium text-white">Add node</div>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-ink-950 px-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4 text-zinc-500"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onClose();
            }
          }}
          className="h-9 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
        />
      </div>

      {basicItems.length > 0 ? (
        <>
          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Basics</div>
          <div className="mt-2 grid gap-1">
            {basicItems.map((item) => (
              <button
                key={item.type}
                className="flex min-h-9 items-center justify-between rounded-md border border-transparent bg-transparent px-2.5 text-left text-xs text-zinc-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                onClick={() => handleSelectNodeType(item.type)}
                type="button"
              >
                <span>{item.label}</span>
                {item.badge ? <em className="not-italic text-[10px] uppercase tracking-[0.08em] text-zinc-500">{item.badge}</em> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {mediaItems.length > 0 ? (
        <>
          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Media</div>
          <div className="mt-2 grid gap-1">
            {mediaItems.map((item) => (
              <button
                key={item.type}
                className="flex min-h-9 items-center justify-between rounded-md border border-transparent bg-transparent px-2.5 text-left text-xs text-zinc-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                onClick={() => handleSelectNodeType(item.type)}
                type="button"
              >
                <span>{item.label}</span>
                {item.badge ? <em className="not-italic text-[10px] uppercase tracking-[0.08em] text-zinc-500">{item.badge}</em> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
