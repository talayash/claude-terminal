import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, Check, ChevronDown, ChevronRight, Rocket, Folder, GitBranch, Code, Bug, Terminal, Star } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface Hint {
  title: string;
  command: string;
  description: string;
}

interface HintCategory {
  name: string;
  icon: string;
  hints: Hint[];
}

const iconMap: Record<string, React.ReactNode> = {
  star: <Star size={16} />,
  rocket: <Rocket size={16} />,
  folder: <Folder size={16} />,
  'git-branch': <GitBranch size={16} />,
  code: <Code size={16} />,
  bug: <Bug size={16} />,
  terminal: <Terminal size={16} />,
};

export function HintsPanel() {
  const [categories, setCategories] = useState<HintCategory[]>([]);
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  useEffect(() => {
    invoke<HintCategory[]>('get_hints').then(setCategories);
  }, []);

  const filteredCategories = categories.map(cat => ({
    ...cat,
    hints: cat.hints.filter(
      h => h.title.toLowerCase().includes(search.toLowerCase()) ||
           h.command.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.hints.length > 0);

  const copyToClipboard = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <div className="h-full bg-bg-secondary/50 backdrop-blur-md border-l border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-white/5">
        <h3 className="text-text-primary font-semibold mb-3">Hints & Commands</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.map((category) => (
          <div key={category.name} className="mb-2">
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category.name ? null : category.name
              )}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-accent-primary">{iconMap[category.icon] || <Terminal size={16} />}</span>
              <span className="flex-1 text-left text-text-primary text-sm font-medium">
                {category.name}
              </span>
              {expandedCategory === category.name ? (
                <ChevronDown size={16} className="text-text-secondary" />
              ) : (
                <ChevronRight size={16} className="text-text-secondary" />
              )}
            </button>

            <AnimatePresence>
              {expandedCategory === category.name && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {category.hints.map((hint) => (
                    <motion.div
                      key={hint.title}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="ml-4 p-2 rounded-lg hover:bg-white/5 group cursor-pointer"
                      onClick={() => copyToClipboard(hint.command)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium">{hint.title}</p>
                          <code className="text-accent-primary text-xs bg-accent-primary/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {hint.command}
                          </code>
                          <p className="text-text-secondary text-xs mt-1">{hint.description}</p>
                        </div>
                        <button className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          {copiedCommand === hint.command ? (
                            <Check size={14} className="text-success" />
                          ) : (
                            <Copy size={14} className="text-text-secondary" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Tip of the Day */}
      <div className="p-3 border-t border-white/5">
        <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-3">
          <p className="text-accent-primary text-xs font-medium mb-1">Tip of the Day</p>
          <p className="text-text-primary text-sm">
            Use <code className="bg-white/10 px-1 rounded">Ctrl+Shift+N</code> to open a new terminal
          </p>
        </div>
      </div>
    </div>
  );
}
