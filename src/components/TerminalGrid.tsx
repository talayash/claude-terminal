import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

function TerminalCell({ terminalId, index, isFocused, onFocus, onRemove, onMaximize }: TerminalCellProps) {
  const { terminals } = useTerminalStore();
  const terminal = terminals.get(terminalId);

  if (!terminal) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary/30 border border-white/5 rounded-lg">
        <p className="text-text-secondary text-sm">Terminal not found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative h-full flex flex-col rounded-lg overflow-hidden border transition-all ${
        isFocused
          ? 'border-accent-primary shadow-lg shadow-accent-primary/20'
          : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onFocus}
    >
      {/* Cell Header */}
      <div className={`flex items-center justify-between px-2 py-1 bg-bg-secondary/80 border-b ${
        isFocused ? 'border-accent-primary/30' : 'border-white/5'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full ${terminal.config.color_tag || 'bg-accent-primary'}`} />
          <span className="text-xs text-text-primary truncate font-medium">
            {terminal.config.nickname || terminal.config.label}
          </span>
          <span className="text-xs text-text-secondary">#{index + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            title="Maximize"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded hover:bg-error/20 text-text-secondary hover:text-error transition-colors"
            title="Remove from grid"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        <TerminalView terminalId={terminalId} />
      </div>
    </motion.div>
  );
}

function AddTerminalCell() {
  const { terminals } = useTerminalStore();
  const { gridTerminalIds, openNewTerminalModal, addToGrid } = useAppStore();
  const [showPicker, setShowPicker] = useState(false);

  const availableTerminals = Array.from(terminals.values())
    .filter(t => !gridTerminalIds.includes(t.config.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col items-center justify-center bg-bg-secondary/20 border border-dashed border-white/10 rounded-lg hover:border-accent-primary/50 transition-colors cursor-pointer group relative"
      onClick={() => setShowPicker(true)}
    >
      <Plus size={32} className="text-text-secondary group-hover:text-accent-primary transition-colors" />
      <p className="text-text-secondary text-sm mt-2 group-hover:text-text-primary transition-colors">
        Add Terminal
      </p>

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
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 bg-bg-elevated border border-white/10 rounded-lg shadow-xl p-2 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-text-secondary text-xs px-2 py-1 mb-1">Select Terminal</p>
              {availableTerminals.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableTerminals.map((t) => (
                    <button
                      key={t.config.id}
                      onClick={() => {
                        addToGrid(t.config.id);
                        setShowPicker(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 text-left"
                    >
                      <div className={`w-2 h-2 rounded-full ${t.config.color_tag || 'bg-accent-primary'}`} />
                      <span className="text-text-primary text-sm truncate">
                        {t.config.nickname || t.config.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-xs px-2 py-2">No available terminals</p>
              )}
              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  onClick={() => {
                    openNewTerminalModal();
                    setShowPicker(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent-primary/20 text-accent-primary text-sm"
                >
                  <Plus size={14} />
                  Create New Terminal
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
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

  const handleMaximize = (terminalId: string) => {
    setActiveTerminal(terminalId);
    setGridMode(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Grid Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary/30 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Grid3X3 size={16} className="text-accent-primary" />
          <span className="text-text-primary text-sm font-medium">Grid View</span>
          <span className="text-text-secondary text-xs">
            ({gridTerminalIds.length}/8 terminals)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.layout}
                onClick={() => setGridLayout(option.layout)}
                className={`p-1.5 rounded transition-colors ${
                  gridLayout === option.layout
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
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
            className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
            title="Auto-fit layout"
          >
            Auto
          </button>

          {/* Exit Grid Mode */}
          <button
            onClick={() => setGridMode(false)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
          >
            <Minimize2 size={12} />
            Exit Grid
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div
        ref={containerRef}
        className="flex-1 p-2 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gridTemplateRows: `repeat(${config.rows}, 1fr)`,
          gap: '8px',
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
            <Grid3X3 size={48} className="text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary text-sm">Click the + cells to add terminals to the grid</p>
            <p className="text-text-secondary/70 text-xs mt-1">Supports up to 8 terminals</p>
          </div>
        </div>
      )}
    </div>
  );
}
