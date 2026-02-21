import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useTerminalStore } from '../store/terminalStore';

export function useKeyboardShortcuts() {
  // Use refs for values that change frequently to avoid re-registering the listener
  const terminalsRef = useRef(useTerminalStore.getState().terminals);
  const activeIdRef = useRef(useTerminalStore.getState().activeTerminalId);
  const gridModeRef = useRef(useAppStore.getState().gridMode);

  useEffect(() => {
    const unsubTerminal = useTerminalStore.subscribe((state) => {
      terminalsRef.current = state.terminals;
      activeIdRef.current = state.activeTerminalId;
    });
    const unsubApp = useAppStore.subscribe((state) => {
      gridModeRef.current = state.gridMode;
    });
    return () => {
      unsubTerminal();
      unsubApp();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && shift && e.key === 'N') {
        e.preventDefault();
        useAppStore.getState().openNewTerminalModal();
      }

      // Ctrl+Shift+F is handled inside TerminalView for search

      if (ctrl && e.key === 'b') {
        e.preventDefault();
        useAppStore.getState().toggleSidebar();
      }

      if (ctrl && e.key === 'w') {
        e.preventDefault();
        const activeId = activeIdRef.current;
        if (activeId) useTerminalStore.getState().closeTerminal(activeId);
      }

      if (ctrl && e.key === ',') {
        e.preventDefault();
        useAppStore.getState().openSettings();
      }

      if (e.key === 'F1') {
        e.preventDefault();
        useAppStore.getState().toggleHints();
      }

      if (e.key === 'F2') {
        e.preventDefault();
        useAppStore.getState().toggleChanges();
      }

      // Toggle Grid Mode: Ctrl+G
      if (ctrl && e.key === 'g') {
        e.preventDefault();
        useAppStore.getState().toggleGridMode();
      }

      // Add current terminal to grid: Ctrl+Shift+G
      if (ctrl && shift && e.key === 'G') {
        e.preventDefault();
        const activeId = activeIdRef.current;
        if (activeId) {
          useAppStore.getState().addToGrid(activeId);
          if (!gridModeRef.current) useAppStore.getState().toggleGridMode();
        }
      }

      if (ctrl && e.key === 'Tab') {
        e.preventDefault();
        const terminals = terminalsRef.current;
        const activeId = activeIdRef.current;
        const terminalIds = Array.from(terminals.keys());
        if (terminalIds.length > 0 && activeId) {
          const currentIndex = terminalIds.indexOf(activeId);
          const nextIndex = shift
            ? (currentIndex - 1 + terminalIds.length) % terminalIds.length
            : (currentIndex + 1) % terminalIds.length;
          useTerminalStore.getState().setActiveTerminal(terminalIds[nextIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
