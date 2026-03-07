import { useEffect, useMemo, useRef, useState } from 'react';
import { Hand, Unlink2 } from 'lucide-react';
import { ADD_NODE_MENU_ITEMS, AddNodeType, NodeMenuItem } from './add-node-menu';

type ToolMode = 'select' | 'draw' | 'disconnect';

type FloatingToolbarProps = {
  activeTool: ToolMode;
  canUndo: boolean;
  canRedo: boolean;
  onAddNode: (type: AddNodeType) => void;
  onSetTool: (tool: ToolMode) => void;
  onUndo: () => void;
  onRedo: () => void;
};

const iconButtonClass = (active = false) =>
  [
    'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors duration-200',
    active
      ? 'border-studio-gold/35 bg-studio-gold/15 text-blue-100'
      : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-white',
    'disabled:cursor-not-allowed disabled:opacity-45'
  ].join(' ');

export function FloatingToolbar({
  activeTool,
  canUndo,
  canRedo,
  onAddNode,
  onSetTool,
  onUndo,
  onRedo
}: FloatingToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filteredItems: NodeMenuItem[] = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return ADD_NODE_MENU_ITEMS;
    }
    return ADD_NODE_MENU_ITEMS.filter((item) => item.label.toLowerCase().includes(normalized));
  }, [query]);

  const identityItems = filteredItems.filter((item) => item.group === 'identity');
  const basicItems = filteredItems.filter((item) => item.group === 'basics');
  const mediaItems = filteredItems.filter((item) => item.group === 'media');

  const handleSelectNodeType = (type: AddNodeType) => {
    onAddNode(type);
    setMenuOpen(false);
    setQuery('');
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onEscape);
    };
  }, [menuOpen]);

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2" ref={rootRef}>
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-studio-700 bg-studio-900/90 p-1.5 shadow-[0_16px_28px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <button
          className={iconButtonClass(menuOpen)}
          title="Open node menu"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <div className="mx-2 h-5 w-px bg-studio-700" />

        <button
          className={iconButtonClass(activeTool === 'select')}
          title="Selection mode"
          onClick={() => onSetTool('select')}
          aria-pressed={activeTool === 'select'}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
        </button>

        <button
          className={iconButtonClass(activeTool === 'disconnect')}
          title="Disconnect mode"
          onClick={() => onSetTool('disconnect')}
          aria-pressed={activeTool === 'disconnect'}
          type="button"
        >
          <Unlink2 className="h-4 w-4" />
        </button>

        <button
          className={iconButtonClass(activeTool === 'draw')}
          title="Pan mode"
          onClick={() => onSetTool('draw')}
          aria-pressed={activeTool === 'draw'}
          type="button"
        >
          <Hand className="h-4 w-4" />
        </button>

        <div className="mx-2 h-5 w-px bg-studio-700" />

        <button className={iconButtonClass()} title="Undo" onClick={onUndo} disabled={!canUndo} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>

        <button className={iconButtonClass()} title="Redo" onClick={onRedo} disabled={!canRedo} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div className="pointer-events-auto mt-2 w-[320px] rounded-xl border border-studio-700 bg-studio-900 p-3 shadow-[0_16px_32px_rgba(0,0,0,0.4)]">
          <div className="text-sm font-semibold text-white">Add node</div>

          <div className="mt-3 flex items-center gap-2 rounded-md border border-studio-700 bg-studio-950 px-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 text-zinc-500">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              className="h-9 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          {identityItems.length > 0 ? (
            <>
              <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-300/80">Identity</div>
              <div className="mt-2 grid gap-1">
                {identityItems.map((item) => (
                  <button
                    key={item.type}
                    className="flex min-h-9 items-center justify-between rounded-md border border-transparent bg-transparent px-2.5 text-left text-xs text-zinc-300 transition-colors duration-200 hover:border-violet-500/20 hover:bg-violet-500/10 hover:text-white"
                    onClick={() => handleSelectNodeType(item.type)}
                    type="button"
                  >
                    <span>{item.label}</span>
                    {item.badge ? <em className="not-italic text-[10px] uppercase tracking-[0.08em] text-violet-400">{item.badge}</em> : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {basicItems.length > 0 ? (
            <>
              <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Basics</div>
              <div className="mt-2 grid gap-1">
                {basicItems.map((item) => (
                  <button
                    key={item.type}
                    className="flex min-h-9 items-center justify-between rounded-md border border-transparent bg-transparent px-2.5 text-left text-xs text-zinc-300 transition-colors duration-200 hover:border-white/10 hover:bg-white/5 hover:text-white"
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
                    className="flex min-h-9 items-center justify-between rounded-md border border-transparent bg-transparent px-2.5 text-left text-xs text-zinc-300 transition-colors duration-200 hover:border-white/10 hover:bg-white/5 hover:text-white"
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
      ) : null}
    </div>
  );
}
