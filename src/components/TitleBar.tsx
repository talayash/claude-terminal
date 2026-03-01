import { useState, useEffect } from 'react';
import { PanelLeft, Lightbulb, FileDiff, Users, Settings, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { useAppStore } from '../store/appStore';

const isMac = navigator.platform.toUpperCase().includes('MAC');

export function TitleBar() {
  const { toggleSidebar, toggleHints, toggleChanges, toggleOrchestration, openSettings, sidebarOpen, hintsOpen, changesOpen, orchestrationOpen } = useAppStore();
  const appWindow = getCurrentWindow();
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  return (
    <div className="h-8 bg-bg-secondary flex items-center justify-between px-2 border-b border-border drag-region">
      <div className="flex items-center gap-3 no-drag">
        {isMac && (
          <div className="flex items-center gap-1.5 mr-1">
            <button
              onClick={() => appWindow.close()}
              className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition-all"
              title="Close"
            />
            <button
              onClick={() => appWindow.minimize()}
              className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition-all"
              title="Minimize"
            />
            <button
              onClick={() => appWindow.toggleMaximize()}
              className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition-all"
              title="Maximize"
            />
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className={`p-1 rounded transition-colors ${
            sidebarOpen ? 'bg-accent-primary/15 text-accent-primary' : 'hover:bg-white/[0.04] text-text-secondary'
          }`}
        >
          <PanelLeft size={16} />
        </button>

        <span className="text-text-tertiary text-xs font-medium select-none">
          ClaudeTerminal{appVersion && <span className="text-text-tertiary/50 ml-1.5 text-[10px]">v{appVersion}</span>}
        </span>
      </div>

      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={toggleChanges}
          className={`p-1 rounded transition-colors ${
            changesOpen ? 'bg-accent-primary/15 text-accent-primary' : 'hover:bg-white/[0.04] text-text-secondary'
          }`}
          title="File Changes (F2)"
        >
          <FileDiff size={16} />
        </button>

        <button
          onClick={toggleOrchestration}
          className={`p-1 rounded transition-colors ${
            orchestrationOpen ? 'bg-accent-primary/15 text-accent-primary' : 'hover:bg-white/[0.04] text-text-secondary'
          }`}
          title="Agent Teams (F4)"
        >
          <Users size={16} />
        </button>

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

        {!isMac && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
