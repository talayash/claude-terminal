import { motion } from 'framer-motion';
import { Minus, Square, X, PanelLeft, Lightbulb, Settings } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../store/appStore';

export function TitleBar() {
  const { toggleSidebar, toggleHints, openSettings, sidebarOpen, hintsOpen } = useAppStore();
  const appWindow = getCurrentWindow();

  return (
    <div className="h-10 bg-bg-secondary/80 backdrop-blur-md flex items-center justify-between px-2 border-b border-white/5 drag-region">
      <div className="flex items-center gap-2 no-drag">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className={`p-1.5 rounded-md transition-colors ${
            sidebarOpen ? 'bg-accent-primary/20 text-accent-primary' : 'hover:bg-white/10 text-text-secondary'
          }`}
        >
          <PanelLeft size={18} />
        </motion.button>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-text-primary font-semibold text-sm">ClaudeTerminal</span>
        </div>
      </div>

      <div className="flex items-center gap-1 no-drag">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleHints}
          className={`p-1.5 rounded-md transition-colors ${
            hintsOpen ? 'bg-accent-primary/20 text-accent-primary' : 'hover:bg-white/10 text-text-secondary'
          }`}
        >
          <Lightbulb size={18} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openSettings}
          className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
        >
          <Settings size={18} />
        </motion.button>

        <div className="w-px h-4 bg-white/10 mx-2" />

        <button
          onClick={() => appWindow.minimize()}
          className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
        >
          <Square size={14} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="p-1.5 rounded-md hover:bg-red-500/80 text-text-secondary hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
