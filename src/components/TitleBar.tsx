import { PanelLeft, Lightbulb, Settings, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from '../store/appStore';

export function TitleBar() {
  const { toggleSidebar, toggleHints, openSettings, sidebarOpen, hintsOpen } = useAppStore();
  const appWindow = getCurrentWindow();

  return (
    <div className="h-8 bg-bg-secondary flex items-center justify-between px-2 border-b border-border drag-region">
      <div className="flex items-center gap-3 no-drag">
        <button
          onClick={toggleSidebar}
          className={`p-1 rounded transition-colors ${
            sidebarOpen ? 'bg-accent-primary/15 text-accent-primary' : 'hover:bg-white/[0.04] text-text-secondary'
          }`}
        >
          <PanelLeft size={16} />
        </button>

        <span className="text-text-tertiary text-xs font-medium select-none">ClaudeTerminal</span>
      </div>

      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={toggleHints}
          className={`p-1 rounded transition-colors ${
            hintsOpen ? 'bg-accent-primary/15 text-accent-primary' : 'hover:bg-white/[0.04] text-text-secondary'
          }`}
        >
          <Lightbulb size={16} />
        </button>

        <button
          onClick={openSettings}
          className="p-1 rounded hover:bg-white/[0.04] text-text-secondary transition-colors"
        >
          <Settings size={16} />
        </button>

        <div className="w-3" />

        <button
          onClick={() => appWindow.minimize()}
          className="w-[46px] h-8 flex items-center justify-center hover:bg-white/[0.06] text-text-secondary transition-colors"
        >
          <Minus size={10} />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="w-[46px] h-8 flex items-center justify-center hover:bg-white/[0.06] text-text-secondary transition-colors"
        >
          <Square size={10} />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="w-[46px] h-8 flex items-center justify-center hover:bg-red-500/80 text-text-secondary hover:text-white transition-colors"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}
