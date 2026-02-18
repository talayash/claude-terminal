import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { useTerminalStore } from '../store/terminalStore';
import { TerminalSearch } from './TerminalSearch';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  terminalId: string;
}

export function TerminalView({ terminalId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const { terminals, writeToTerminal, resizeTerminal, setXterm } = useTerminalStore();
  const instance = terminals.get(terminalId);

  const toggleSearch = useCallback(() => {
    setSearchVisible(prev => !prev);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !instance) return;

    const terminal = new Terminal({
      theme: {
        background: '#101010',
        foreground: '#E5E5E5',
        cursor: '#E5E5E5',
        cursorAccent: '#101010',
        selectionBackground: 'rgba(59, 130, 246, 0.25)',
        black: '#171717',
        red: '#EF4444',
        green: '#4ADE80',
        yellow: '#FBBF24',
        blue: '#3B82F6',
        magenta: '#A855F7',
        cyan: '#22D3EE',
        white: '#E5E5E5',
        brightBlack: '#525252',
        brightRed: '#F87171',
        brightGreen: '#86EFAC',
        brightYellow: '#FDE047',
        brightBlue: '#60A5FA',
        brightMagenta: '#C084FC',
        brightCyan: '#67E8F9',
        brightWhite: '#FFFFFF',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);
    searchAddonRef.current = searchAddon;

    terminal.open(containerRef.current);
    fitAddon.fit();

    // Handle Ctrl+C (copy) and Ctrl+V (paste) keyboard shortcuts
    terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+F: Toggle search
      if (isCtrl && e.shiftKey && e.key === 'F' && e.type === 'keydown') {
        e.preventDefault();
        toggleSearch();
        return false;
      }

      if (isCtrl && e.key === 'c' && e.type === 'keydown') {
        if (terminal.hasSelection()) {
          navigator.clipboard.writeText(terminal.getSelection());
          terminal.clearSelection();
          return false; // Prevent xterm from sending \x03
        }
        // No selection — let xterm send interrupt signal (Ctrl+C)
        return true;
      }

      if (isCtrl && e.key === 'v') {
        if (e.type === 'keydown') {
          e.preventDefault();
          navigator.clipboard.readText().then((text) => {
            if (text) {
              writeToTerminal(terminalId, text);
            }
          });
        }
        return false; // Block both keydown and keyup from xterm
      }

      return true;
    });

    terminal.onData((data) => {
      writeToTerminal(terminalId, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      resizeTerminal(terminalId, terminal.cols, terminal.rows);
    });
    resizeObserver.observe(containerRef.current);

    setXterm(terminalId, terminal);

    return () => {
      resizeObserver.disconnect();
      searchAddonRef.current = null;
      terminal.dispose();
    };
  }, [terminalId, instance, writeToTerminal, resizeTerminal, setXterm, toggleSearch]);

  return (
    <div className="h-full w-full bg-bg-primary relative">
      <TerminalSearch
        searchAddon={searchAddonRef.current}
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
      />
      <div
        ref={containerRef}
        className="h-full w-full"
      />
    </div>
  );
}
