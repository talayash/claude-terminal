import { useEffect, useRef, useState, memo, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, Plus, Grid3X3, LayoutGrid, Columns, Rows, Square } from 'lucide-react';
import { useTerminalStore } from '../store/terminalStore';
import { useAppStore, GridLayout, getOptimalLayout } from '../store/appStore';
import { TerminalView } from './TerminalView';

// Grid layout configurations
const GRID_CONFIGS: Record<GridLayout, { cols: number; rows: number }> = {
  '1x1': { cols: 1, rows: 1 },
  '1x2': { cols: 2, rows: 1 },
  '2x1': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
  '1x3': { cols: 3, rows: 1 },
  '3x1': { cols: 1, rows: 3 },
  '2x3': { cols: 3, rows: 2 },
  '3x2': { cols: 2, rows: 3 },
  '2x4': { cols: 4, rows: 2 },
  '4x2': { cols: 2, rows: 4 },
};

const LAYOUT_OPTIONS: { layout: GridLayout; icon: React.ReactNode; label: string }[] = [
  { layout: '1x1', icon: <Square size={14} />, label: 'Single' },
  { layout: '1x2', icon: <Columns size={14} />, label: '2 Columns' },
  { layout: '2x1', icon: <Rows size={14} />, label: '2 Rows' },
  { layout: '2x2', icon: <Grid3X3 size={14} />, label: '2x2 Grid' },
  { layout: '2x3', icon: <LayoutGrid size={14} />, label: '2x3 Grid' },
  { layout: '2x4', icon: <LayoutGrid size={14} />, label: '2x4 Grid' },
];

interface TerminalCellProps {
  terminalId: string;
  index: number;
  isFocused: boolean;
  onFocus: () => void;
  onRemove: () => void;
  onMaximize: () => void;
}

const TerminalCell = memo(function TerminalCell({ terminalId, isFocused, onFocus, onRemove, onMaximize }: TerminalCellProps) {
  const { terminals } = useTerminalStore();
  const terminal = terminals.get(terminalId);

  if (!terminal) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary border border-border rounded">
        <p className="text-text-tertiary text-[12px]">Terminal not found</p>
      </div>
    );
  }

  return (
    <div
      className={`relative h-full flex flex-col rounded overflow-hidden transition-all ${
        isFocused
          ? 'ring-2 ring-accent-primary'
          : 'ring-1 ring-border hover:ring-border-light'
      }`}
      onClick={onFocus}
    >
      {/* Cell Header */}
      <div className={`flex items-center justify-between px-3 h-6 bg-bg-secondary border-b ${
        isFocused ? 'border-accent-primary/30' : 'border-border'
      }`}>
        <span className="text-[11px] text-text-secondary truncate font-medium">
          {terminal.config.nickname || terminal.config.label}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            className="p-0.5 rounded hover:bg-white/[0.06] text-text-tertiary hover:text-text-secondary transition-colors"
            title="Maximize"
          >
            <Maximize2 size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-0.5 rounded hover:bg-red-500/10 text-text-tertiary hover:text-red-400 transition-colors"
            title="Remove from grid"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        <TerminalView terminalId={terminalId} />
      </div>
    </div>
  );
});

function AddTerminalCell() {
  const { terminals } = useTerminalStore();
  const { gridTerminalIds, openNewTerminalModal, addToGrid } = useAppStore();
  const [showPicker, setShowPicker] = useState(false);

  const availableTerminals = useMemo(() =>
    Array.from(terminals.values())
      .filter(t => !gridTerminalIds.includes(t.config.id)),
    [terminals, gridTerminalIds]
  );

  return (
    <div
      className="h-full flex flex-col items-center justify-center bg-[#131313] rounded ring-1 ring-border hover:ring-border-light transition-colors cursor-pointer group relative"
      onClick={() => setShowPicker(true)}
    >
      <Plus size={24} className="text-border-light group-hover:text-text-tertiary transition-colors" />

      {/* Terminal Picker Dropdown */}
      <AnimatePresence>
        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(false);
              }}
            />
            <div
              className="absolute z-50 bg-bg-elevated ring-1 ring-white/[0.08] rounded-lg shadow-xl p-2 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-text-tertiary text-[11px] px-2 py-1 mb-1">Select Terminal</p>
              {availableTerminals.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {availableTerminals.map((t) => (
                    <button
                      key={t.config.id}
                      onClick={() => {
                        addToGrid(t.config.id);
                        setShowPicker(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.06] text-left"
                    >
                      <span className="text-text-primary text-[12px] truncate">
                        {t.config.nickname || t.config.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-text-tertiary text-[11px] px-2 py-2">No available terminals</p>
              )}
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => {
                    openNewTerminalModal();
                    setShowPicker(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent-primary/10 text-accent-primary text-[12px]"
                >
                  <Plus size={14} />
                  Create New Terminal
                </button>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TerminalGrid() {
  const {
    gridTerminalIds,
    gridLayout,
    gridFocusedIndex,
    setGridFocusedIndex,
    removeFromGrid,
    setGridLayout,
    setGridMode,
  } = useAppStore();
  const { setActiveTerminal } = useTerminalStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const config = GRID_CONFIGS[gridLayout];
  const totalCells = config.cols * config.rows;
  const filledCells = gridTerminalIds.length;
  const emptyCells = Math.max(0, Math.min(totalCells - filledCells, 8 - filledCells));

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gridFocusedIndex && gridFocusedIndex !== 0) return;

      const { cols } = config;
      let newIndex = gridFocusedIndex;

      if (e.key === 'ArrowRight') {
        newIndex = Math.min(gridFocusedIndex + 1, gridTerminalIds.length - 1);
      } else if (e.key === 'ArrowLeft') {
        newIndex = Math.max(gridFocusedIndex - 1, 0);
      } else if (e.key === 'ArrowDown') {
        newIndex = Math.min(gridFocusedIndex + cols, gridTerminalIds.length - 1);
      } else if (e.key === 'ArrowUp') {
        newIndex = Math.max(gridFocusedIndex - cols, 0);
      } else if (e.key === 'Escape') {
        setGridFocusedIndex(null);
        return;
      }

      if (newIndex !== gridFocusedIndex) {
        e.preventDefault();
        setGridFocusedIndex(newIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridFocusedIndex, config, gridTerminalIds.length, setGridFocusedIndex]);

  const handleMaximize = useCallback((terminalId: string) => {
    setActiveTerminal(terminalId);
    setGridMode(false);
  }, [setActiveTerminal, setGridMode]);

  return (
    <div className="h-full flex flex-col">
      {/* Grid Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-2">
          <Grid3X3 size={14} className="text-text-secondary" />
          <span className="text-text-primary text-[12px] font-medium">Grid View</span>
          <span className="text-text-tertiary text-[11px]">
            ({gridTerminalIds.length}/8)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <div className="flex items-center gap-0.5 bg-bg-primary rounded-md p-0.5">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.layout}
                onClick={() => setGridLayout(option.layout)}
                className={`p-1 rounded transition-colors ${
                  gridLayout === option.layout
                    ? 'bg-accent-primary text-white'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04]'
                }`}
                title={option.label}
              >
                {option.icon}
              </button>
            ))}
          </div>

          {/* Auto Layout Button */}
          <button
            onClick={() => setGridLayout(getOptimalLayout(gridTerminalIds.length))}
            className="px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] rounded transition-colors"
            title="Auto-fit layout"
          >
            Auto
          </button>

          {/* Exit Grid Mode */}
          <button
            onClick={() => setGridMode(false)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] rounded transition-colors"
          >
            <Minimize2 size={12} />
            Exit Grid
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div
        ref={containerRef}
        className="flex-1 p-1 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gridTemplateRows: `repeat(${config.rows}, 1fr)`,
          gap: '4px',
        }}
      >
        <AnimatePresence mode="popLayout">
          {/* Filled terminal cells */}
          {gridTerminalIds.map((terminalId, index) => (
            <TerminalCell
              key={terminalId}
              terminalId={terminalId}
              index={index}
              isFocused={gridFocusedIndex === index}
              onFocus={() => setGridFocusedIndex(index)}
              onRemove={() => removeFromGrid(terminalId)}
              onMaximize={() => handleMaximize(terminalId)}
            />
          ))}

          {/* Empty cells for adding more terminals */}
          {Array.from({ length: emptyCells }).map((_, index) => (
            <AddTerminalCell key={`empty-${index}`} />
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Tips */}
      {gridTerminalIds.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Grid3X3 size={32} className="text-border mx-auto mb-3" />
            <p className="text-text-tertiary text-[12px]">Click + to add terminals to the grid</p>
          </div>
        </div>
      )}
    </div>
  );
}
