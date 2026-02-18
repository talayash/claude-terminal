import { useMemo } from 'react';
import { AnimatePresence, Reorder } from 'framer-motion';
import { X, Plus, Grid3X3 } from 'lucide-react';
import { useTerminalStore } from '../store/terminalStore';
import { useAppStore } from '../store/appStore';
import { TerminalView } from './TerminalView';
import { TerminalGrid } from './TerminalGrid';

export function TerminalTabs() {
  const { terminals, activeTerminalId, setActiveTerminal, closeTerminal, unreadTerminalIds } = useTerminalStore();
  const { openNewTerminalModal, gridMode, toggleGridMode, addToGrid, gridTerminalIds } = useAppStore();
  const terminalList = useMemo(() => Array.from(terminals.values()).map(t => t.config), [terminals]);

  const handleNewTab = () => {
    openNewTerminalModal();
  };

  const handleAddToGrid = (terminalId: string) => {
    addToGrid(terminalId);
    if (!gridMode) {
      toggleGridMode();
    }
  };

  // If grid mode is active, show the grid
  if (gridMode) {
    return <TerminalGrid />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="h-10 bg-bg-secondary border-b border-border flex items-center justify-between px-1">
        <div className="flex items-center flex-1 min-w-0">
          <Reorder.Group
            axis="x"
            values={terminalList}
            onReorder={() => {}}
            className="flex items-center overflow-x-auto"
          >
            {terminalList.map((terminal) => (
              <Reorder.Item
                key={terminal.id}
                value={terminal}
                className="flex-shrink-0"
              >
                <button
                  onClick={() => setActiveTerminal(terminal.id)}
                  className={`group relative flex items-center gap-2 px-3 h-10 text-[12px] transition-colors border-t-2 ${
                    activeTerminalId === terminal.id
                      ? 'bg-bg-primary text-text-primary border-t-accent-primary'
                      : 'hover:bg-white/[0.04] text-text-secondary border-t-transparent'
                  }`}
                >
                  {unreadTerminalIds.has(terminal.id) && activeTerminalId !== terminal.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary flex-shrink-0" />
                  )}
                  <span className="max-w-[160px] truncate">{terminal.nickname || terminal.label}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToGrid(terminal.id);
                      }}
                      className={`p-0.5 rounded hover:bg-white/[0.08] transition-colors ${
                        gridTerminalIds.includes(terminal.id) ? 'text-accent-primary' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                      title="Add to grid"
                    >
                      <Grid3X3 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTerminal(terminal.id);
                      }}
                      className="p-0.5 rounded hover:bg-white/[0.08] text-text-tertiary hover:text-text-secondary"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <button
            onClick={handleNewTab}
            className="p-1.5 rounded hover:bg-white/[0.04] text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0 ml-1"
            title="New Terminal"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Grid Mode Toggle */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {gridTerminalIds.length > 0 && (
            <span className="text-[11px] text-text-tertiary mr-1">
              {gridTerminalIds.length} in grid
            </span>
          )}
          <button
            onClick={toggleGridMode}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] transition-colors ${
              gridTerminalIds.length > 0
                ? 'bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/20'
                : 'hover:bg-white/[0.04] text-text-secondary'
            }`}
            title="Toggle Grid View"
          >
            <Grid3X3 size={14} />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {activeTerminalId ? (
            <div
              key={activeTerminalId}
              className="absolute inset-0"
            >
              <TerminalView terminalId={activeTerminalId} />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary">
              <p className="text-[13px] text-text-tertiary mb-4">Press Ctrl+Shift+N to start a new terminal</p>
              <div className="flex gap-3">
                <button
                  onClick={handleNewTab}
                  className="flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white py-2 px-5 rounded-md text-[13px] font-medium transition-colors"
                >
                  <Plus size={16} />
                  New Terminal
                </button>
                {terminalList.length > 0 && (
                  <button
                    onClick={toggleGridMode}
                    className="flex items-center gap-2 ring-1 ring-border-light hover:bg-white/[0.04] text-text-primary py-2 px-5 rounded-md text-[13px] font-medium transition-colors"
                  >
                    <Grid3X3 size={16} />
                    Grid View
                  </button>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
