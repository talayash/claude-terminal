import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronUp, ChevronDown, CaseSensitive } from 'lucide-react';
import type { SearchAddon } from '@xterm/addon-search';

interface TerminalSearchProps {
  searchAddon: SearchAddon | null;
  visible: boolean;
  onClose: () => void;
}

export function TerminalSearch({ searchAddon, visible, onClose }: TerminalSearchProps) {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      searchAddon?.clearDecorations();
      setQuery('');
    }
  }, [visible, searchAddon]);

  const doSearch = useCallback((searchQuery: string, options: { caseSensitive: boolean }, direction: 'next' | 'prev' = 'next') => {
    if (!searchAddon || !searchQuery) {
      searchAddon?.clearDecorations();
      return;
    }

    const searchOptions = {
      caseSensitive: options.caseSensitive,
      incremental: true,
      decorations: {
        matchBackground: '#E9456040',
        matchBorder: '#E94560',
        matchOverviewRuler: '#E94560',
        activeMatchBackground: '#E94560',
        activeMatchBorder: '#FFFFFF',
        activeMatchColorOverviewRuler: '#FFFFFF',
      },
    };

    if (direction === 'prev') {
      searchAddon.findPrevious(searchQuery, searchOptions);
    } else {
      searchAddon.findNext(searchQuery, searchOptions);
    }
  }, [searchAddon]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    doSearch(newQuery, { caseSensitive });
  };

  const handleNext = () => {
    if (!query) return;
    doSearch(query, { caseSensitive }, 'next');
  };

  const handlePrev = () => {
    if (!query) return;
    doSearch(query, { caseSensitive }, 'prev');
  };

  const toggleCaseSensitive = () => {
    const newValue = !caseSensitive;
    setCaseSensitive(newValue);
    if (query) {
      doSearch(query, { caseSensitive: newValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="absolute top-2 right-4 z-30 flex items-center gap-1.5 bg-bg-elevated/95 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1.5 shadow-xl"
        >
          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="w-48 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary/50 transition-colors font-mono"
          />

          {/* Case sensitive toggle */}
          <button
            onClick={toggleCaseSensitive}
            className={`p-1 rounded transition-colors ${
              caseSensitive
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
            }`}
            title="Match Case"
          >
            <CaseSensitive size={16} />
          </button>

          {/* Previous match */}
          <button
            onClick={handlePrev}
            disabled={!query}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Match (Shift+Enter)"
          >
            <ChevronUp size={16} />
          </button>

          {/* Next match */}
          <button
            onClick={handleNext}
            disabled={!query}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Match (Enter)"
          >
            <ChevronDown size={16} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
            title="Close (Escape)"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
