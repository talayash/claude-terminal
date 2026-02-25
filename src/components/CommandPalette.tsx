import { useState, useEffect, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { useTerminalStore } from '../store/terminalStore';

interface HintCategory {
  category: string;
  hints: { command: string; description: string }[];
}

interface Snippet {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  category: string;
  action: () => void;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  // Substring match
  if (lower.includes(q)) return true;
  // Character-by-character match
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const { closeCommandPalette } = useAppStore();
  const { terminals, activeTerminalId, setActiveTerminal, writeToTerminal } = useTerminalStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hints, setHints] = useState<HintCategory[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    invoke<HintCategory[]>('get_hints').then(setHints).catch(() => {});
    invoke<Snippet[]>('get_snippets').then(setSnippets).catch(() => {});
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const result: PaletteItem[] = [];

    // Terminals
    terminals.forEach((instance) => {
      const config = instance.config;
      result.push({
        id: `terminal-${config.id}`,
        label: config.nickname || config.label,
        description: `${config.working_directory} (${config.status})`,
        category: 'Terminals',
        action: () => { setActiveTerminal(config.id); closeCommandPalette(); },
      });
    });

    // Actions
    const actions: { label: string; description: string; action: () => void }[] = [
      { label: 'New Terminal', description: 'Create a new terminal instance', action: () => { useAppStore.getState().openNewTerminalModal(); closeCommandPalette(); } },
      { label: 'Toggle Sidebar', description: 'Show or hide the sidebar', action: () => { useAppStore.getState().toggleSidebar(); closeCommandPalette(); } },
      { label: 'Open Settings', description: 'Open application settings', action: () => { useAppStore.getState().openSettings(); closeCommandPalette(); } },
      { label: 'Toggle Grid View', description: 'Switch between tab and grid view', action: () => { useAppStore.getState().toggleGridMode(); closeCommandPalette(); } },
      { label: 'Toggle Hints Panel', description: 'Show or hide Claude Code hints', action: () => { useAppStore.getState().toggleHints(); closeCommandPalette(); } },
      { label: 'Toggle File Changes', description: 'Show or hide the file changes panel', action: () => { useAppStore.getState().toggleChanges(); closeCommandPalette(); } },
      { label: 'Manage Profiles', description: 'Open profile management', action: () => { useAppStore.getState().openProfileModal(); closeCommandPalette(); } },
      { label: 'Workspaces', description: 'Open workspace manager', action: () => { useAppStore.getState().openWorkspaceModal(); closeCommandPalette(); } },
      { label: 'Snippets', description: 'Open snippet manager', action: () => { useAppStore.getState().openSnippetsModal(); closeCommandPalette(); } },
      { label: 'Session History', description: 'View past terminal sessions', action: () => { useAppStore.getState().openSessionHistory(); closeCommandPalette(); } },
    ];
    actions.forEach((a, i) => {
      result.push({ id: `action-${i}`, label: a.label, description: a.description, category: 'Actions', action: a.action });
    });

    // Hints
    hints.forEach((cat) => {
      cat.hints.forEach((hint, i) => {
        result.push({
          id: `hint-${cat.category}-${i}`,
          label: hint.command,
          description: hint.description,
          category: 'Hints',
          action: () => { navigator.clipboard.writeText(hint.command); closeCommandPalette(); },
        });
      });
    });

    // Snippets
    snippets.forEach((snippet) => {
      result.push({
        id: `snippet-${snippet.id}`,
        label: snippet.title,
        description: `[${snippet.category}] ${snippet.content.slice(0, 60)}${snippet.content.length > 60 ? '...' : ''}`,
        category: 'Snippets',
        action: () => {
          if (activeTerminalId) writeToTerminal(activeTerminalId, snippet.content);
          closeCommandPalette();
        },
      });
    });

    return result;
  }, [terminals, hints, snippets, activeTerminalId, closeCommandPalette, setActiveTerminal, writeToTerminal]);

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter(item =>
      fuzzyMatch(item.label, query) || fuzzyMatch(item.description, query)
    );
  }, [items, query]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: { category: string; items: PaletteItem[] }[] = [];
    const catMap = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const arr = catMap.get(item.category) || [];
      arr.push(item);
      catMap.set(item.category, arr);
    }
    for (const [category, items] of catMap) {
      groups.push({ category, items });
    }
    return groups;
  }, [filtered]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeCommandPalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50"
      onClick={closeCommandPalette}
    >
      <div
        className="mx-auto mt-[15vh] w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-bg-elevated ring-1 ring-white/[0.08] rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, terminals, snippets..."
              className="w-full bg-bg-primary ring-1 ring-border-light rounded-md h-9 px-3 text-text-primary text-[13px] focus:outline-none focus:ring-accent-primary transition-colors"
            />
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-1.5">
            {grouped.map((group) => (
              <div key={group.category}>
                <div className="px-2 py-1.5 text-text-tertiary text-[11px] font-medium uppercase tracking-wider">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <div
                      key={item.id}
                      data-index={idx}
                      onClick={item.action}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        selectedIndex === idx
                          ? 'bg-accent-primary/15 text-text-primary'
                          : 'hover:bg-white/[0.04] text-text-secondary'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">{item.label}</p>
                        <p className="text-text-tertiary text-[11px] truncate">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {flatItems.length === 0 && (
              <p className="text-text-tertiary text-[12px] text-center py-6">
                No results found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
