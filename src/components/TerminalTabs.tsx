import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, Plus, Grid3X3 } from 'lucide-react';
import { useTerminalStore } from '../store/terminalStore';
import { useAppStore } from '../store/appStore';
import { TerminalView } from './TerminalView';
import { TerminalGrid } from './TerminalGrid';

export function TerminalTabs() {
  const { terminals, activeTerminalId, setActiveTerminal, closeTerminal, unreadTerminalIds } = useTerminalStore();
  const { openNewTerminalModal, gridMode, toggleGridMode, addToGrid, gridTerminalIds } = useAppStore();
  const terminalList = Array.from(terminals.values()).map(t => t.config);

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
      <div className="h-10 bg-bg-secondary/30 border-b border-white/5 flex items-center justify-between px-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Reorder.Group
            axis="x"
            values={terminalList}
            onReorder={() => {}}
            className="flex items-center gap-1 overflow-x-auto"
          >
            {terminalList.map((terminal) => (
              <Reorder.Item
                key={terminal.id}
                value={terminal}
                className="flex-shrink-0"
              >
                <motion.button
                  layout
                  onClick={() => setActiveTerminal(terminal.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    activeTerminalId === terminal.id
                      ? 'bg-bg-primary text-text-primary'
                      : 'hover:bg-white/5 text-text-secondary'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-1.5 h-1.5 rounded-full ${terminal.color_tag || 'bg-accent-primary'}`} />
                    {unreadTerminalIds.has(terminal.id) && activeTerminalId !== terminal.id && (
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent-primary animate-activity-pulse" />
                    )}
                  </div>
                  <span className="max-w-[120px] truncate">{terminal.nickname || terminal.label}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToGrid(terminal.id);
                      }}
                      className={`p-0.5 rounded hover:bg-accent-primary/20 transition-colors ${
                        gridTerminalIds.includes(terminal.id) ? 'text-accent-primary' : 'text-text-secondary hover:text-accent-primary'
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
                      className="p-0.5 rounded hover:bg-white/10 text-text-secondary"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.button>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <button
            onClick={handleNewTab}
            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors flex-shrink-0"
            title="New Terminal"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Grid Mode Toggle */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {gridTerminalIds.length > 0 && (
            <span className="text-xs text-text-secondary mr-1">
              {gridTerminalIds.length} in grid
            </span>
          )}
          <button
            onClick={toggleGridMode}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors ${
              gridTerminalIds.length > 0
                ? 'bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30'
                : 'hover:bg-white/10 text-text-secondary'
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
            <motion.div
              key={activeTerminalId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              <TerminalView terminalId={activeTerminalId} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary"
            >
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">Welcome to ClaudeTerminal</h2>
              <p className="text-sm mb-6">Create a new terminal to get started with Claude Code</p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNewTab}
                  className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-6 rounded-lg font-medium transition-colors"
                >
                  <Plus size={18} />
                  New Terminal
                </motion.button>
                {terminalList.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleGridMode}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-text-primary py-2 px-6 rounded-lg font-medium transition-colors"
                  >
                    <Grid3X3 size={18} />
                    Grid View
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
