import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useTerminalStore } from '../store/terminalStore';
import { homeDir } from '@tauri-apps/api/path';

export function useKeyboardShortcuts() {
  const { toggleSidebar, toggleHints, openSettings } = useAppStore();
  const { terminals, activeTerminalId, setActiveTerminal, createTerminal, closeTerminal } = useTerminalStore();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && shift && e.key === 'N') {
        e.preventDefault();
        const home = await homeDir();
        await createTerminal(`Terminal ${terminals.size + 1}`, home, [], {});
      }

      if (ctrl && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      if (ctrl && e.key === 'w') {
        e.preventDefault();
        if (activeTerminalId) closeTerminal(activeTerminalId);
      }

      if (ctrl && e.key === ',') {
        e.preventDefault();
        openSettings();
      }

      if (e.key === 'F1') {
        e.preventDefault();
        toggleHints();
      }

      if (ctrl && e.key === 'Tab') {
        e.preventDefault();
        const terminalIds = Array.from(terminals.keys());
        if (terminalIds.length > 0 && activeTerminalId) {
          const currentIndex = terminalIds.indexOf(activeTerminalId);
          const nextIndex = shift
            ? (currentIndex - 1 + terminalIds.length) % terminalIds.length
            : (currentIndex + 1) % terminalIds.length;
          setActiveTerminal(terminalIds[nextIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [terminals, activeTerminalId, toggleSidebar, toggleHints, openSettings, setActiveTerminal, createTerminal, closeTerminal]);
}
