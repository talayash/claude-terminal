import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Copy, Trash2, Edit3 } from 'lucide-react';
import { useTerminalStore } from '../store/terminalStore';
import { useAppStore } from '../store/appStore';
import { homeDir } from '@tauri-apps/api/path';

const STATUS_COLORS = {
  Running: 'bg-success',
  Idle: 'bg-warning',
  Error: 'bg-error',
  Stopped: 'bg-text-secondary',
};

const TAG_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
];

export function Sidebar() {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { terminals, activeTerminalId, setActiveTerminal, createTerminal, closeTerminal, updateLabel } = useTerminalStore();
  const { openProfileModal } = useAppStore();

  const terminalList = Array.from(terminals.values())
    .map(t => t.config)
    .filter(t => t.label.toLowerCase().includes(search.toLowerCase()));

  const handleNewTerminal = async () => {
    try {
      const home = await homeDir();
      console.log('Creating new terminal in:', home);
      await createTerminal(
        `Terminal ${terminals.size + 1}`,
        home,
        [],
        {},
        TAG_COLORS[terminals.size % TAG_COLORS.length]
      );
    } catch (error) {
      console.error('Failed to create terminal:', error);
      alert('Failed to create terminal: ' + String(error));
    }
  };

  const handleRename = async (id: string, newLabel: string) => {
    await updateLabel(id, newLabel);
    setEditingId(null);
  };

  return (
    <div className="h-full bg-bg-secondary/50 backdrop-blur-md border-r border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-white/5">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewTerminal}
          className="w-full flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={18} />
          New Terminal
        </motion.button>

        <div className="mt-3 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search terminals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Terminal List */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout">
          {terminalList.map((terminal) => (
            <motion.div
              key={terminal.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setActiveTerminal(terminal.id)}
              className={`group relative p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                activeTerminalId === terminal.id
                  ? 'bg-accent-primary/20 border border-accent-primary/30'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Color Tag */}
                <div className={`w-1 h-8 rounded-full ${terminal.color_tag || 'bg-accent-primary'}`} />

                {/* Status Indicator */}
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[terminal.status]} ${
                  terminal.status === 'Running' ? 'animate-pulse' : ''
                }`} />

                {/* Label */}
                <div className="flex-1 min-w-0">
                  {editingId === terminal.id ? (
                    <input
                      autoFocus
                      defaultValue={terminal.label}
                      onBlur={(e) => handleRename(terminal.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(terminal.id, e.currentTarget.value);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-full bg-transparent border-b border-accent-primary text-text-primary text-sm focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <p className="text-text-primary text-sm font-medium truncate">{terminal.label}</p>
                      <p className="text-text-secondary text-xs truncate">{terminal.working_directory}</p>
                    </>
                  )}
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === terminal.id ? null : terminal.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical size={14} className="text-text-secondary" />
                  </button>

                  <AnimatePresence>
                    {menuOpenId === terminal.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 bg-bg-elevated border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px] z-50"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(terminal.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-white/5"
                        >
                          <Edit3 size={14} /> Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-white/5"
                        >
                          <Copy size={14} /> Duplicate
                        </button>
                        <div className="h-px bg-white/10 my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTerminal(terminal.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
                        >
                          <Trash2 size={14} /> Close
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {terminalList.length === 0 && (
          <div className="text-center text-text-secondary text-sm py-8">
            {search ? 'No terminals found' : 'No terminals yet. Create one to get started!'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => openProfileModal()}
          className="w-full text-text-secondary hover:text-text-primary text-sm py-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
