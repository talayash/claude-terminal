import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useTerminalStore } from '../store/terminalStore';
import { TerminalView } from './TerminalView';
import { homeDir } from '@tauri-apps/api/path';

export function TerminalTabs() {
  const { terminals, activeTerminalId, setActiveTerminal, closeTerminal, createTerminal } = useTerminalStore();
  const terminalList = Array.from(terminals.values()).map(t => t.config);

  const handleNewTab = async () => {
    const home = await homeDir();
    await createTerminal(`Terminal ${terminals.size + 1}`, home, [], {});
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="h-10 bg-bg-secondary/30 border-b border-white/5 flex items-center px-2 gap-1">
        <Reorder.Group
          axis="x"
          values={terminalList}
          onReorder={() => {}}
          className="flex items-center gap-1"
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
                <div className={`w-1.5 h-1.5 rounded-full ${terminal.color_tag || 'bg-accent-primary'}`} />
                <span className="max-w-[120px] truncate">{terminal.label}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(terminal.id);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </motion.button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <button
          onClick={handleNewTab}
          className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
        >
          <Plus size={16} />
        </button>
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNewTab}
                className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-6 rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                New Terminal
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
