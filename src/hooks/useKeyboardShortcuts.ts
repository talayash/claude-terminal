import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useTerminalStore } from '../store/terminalStore';

export function useKeyboardShortcuts() {
  const { toggleSidebar, toggleHints, openSettings, openNewTerminalModal, toggleGridMode, addToGrid, gridMode } = useAppStore();
  const { terminals, activeTerminalId, setActiveTerminal, closeTerminal } = useTerminalStore();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && shift && e.key === 'N') {
        e.preventDefault();
        openNewTerminalModal();
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

      // Toggle Grid Mode: Ctrl+G
      if (ctrl && e.key === 'g') {
        e.preventDefault();
        toggleGridMode();
      }

      // Add current terminal to grid: Ctrl+Shift+G
      if (ctrl && shift && e.key === 'G') {
        e.preventDefault();
        if (activeTerminalId) {
          addToGrid(activeTerminalId);
          if (!gridMode) toggleGridMode();
        }
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
  }, [terminals, activeTerminalId, toggleSidebar, toggleHints, openSettings, openNewTerminalModal, setActiveTerminal, closeTerminal, toggleGridMode, addToGrid, gridMode]);
}
