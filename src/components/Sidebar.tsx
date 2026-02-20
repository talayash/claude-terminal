import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Copy, Trash2, Edit3, Tag, Grid3X3, FolderOpen } from 'lucide-react';
import { useTerminalStore } from '../store/terminalStore';
import { useAppStore } from '../store/appStore';

const STATUS_COLORS = {
  Running: 'bg-success',
  Idle: 'bg-warning',
  Error: 'bg-error',
  Stopped: 'bg-text-tertiary',
};

const STATUS_LABELS: Record<string, string> = {
  Running: 'running',
  Idle: 'idle',
  Error: 'error',
  Stopped: 'stopped',
};

export function Sidebar() {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { terminals, activeTerminalId, setActiveTerminal, closeTerminal, updateLabel, updateNickname, unreadTerminalIds } = useTerminalStore();
  const { openProfileModal, openNewTerminalModal, openWorkspaceModal, addToGrid, removeFromGrid, gridTerminalIds, setGridMode } = useAppStore();

  const terminalList = useMemo(() =>
    Array.from(terminals.values())
      .map(t => t.config)
      .filter(t => {
        const searchLower = search.toLowerCase();
        return t.label.toLowerCase().includes(searchLower) ||
          (t.nickname && t.nickname.toLowerCase().includes(searchLower));
      }),
    [terminals, search]
  );

  const handleNewTerminal = () => {
    openNewTerminalModal();
  };

  const handleRename = async (id: string, newLabel: string) => {
    await updateLabel(id, newLabel);
    setEditingId(null);
  };

  const handleNicknameChange = async (id: string, newNickname: string) => {
    await updateNickname(id, newNickname);
    setEditingNicknameId(null);
  };

  return (
    <div className="h-full bg-bg-secondary border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <button
          onClick={handleNewTerminal}
          className="w-full flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white py-2 px-4 rounded-md font-medium text-[13px] transition-colors"
        >
          <Plus size={16} />
          New Terminal
        </button>

        <div className="mt-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Filter terminals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-primary ring-1 ring-border-light rounded-md py-1.5 pl-8 pr-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-accent-primary transition-colors"
          />
        </div>
      </div>

      {/* Terminal List */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {terminalList.map((terminal) => (
          <div
            key={terminal.id}
            onClick={() => setActiveTerminal(terminal.id)}
            className={`group relative py-2.5 px-3 rounded-md mb-0.5 cursor-pointer transition-colors ${
              activeTerminalId === terminal.id
                ? 'bg-white/[0.06] border-l-2 border-l-accent-primary'
                : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {/* Color Tag & Status & Unread */}
              <div className="mt-1.5 flex items-center gap-1.5 flex-shrink-0">
                {terminal.color_tag && (
                  <div className={`w-2 h-2 rounded-full ${terminal.color_tag} flex-shrink-0`} />
                )}
                <div className="relative">
                  <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[terminal.status]}`} />
                  {unreadTerminalIds.has(terminal.id) && activeTerminalId !== terminal.id && (
                    <div className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-accent-primary" />
                  )}
                </div>
              </div>

              {/* Label & Info */}
              <div className="flex-1 min-w-0">
                {editingId === terminal.id ? (
                  <input
                    autoFocus
                    defaultValue={terminal.label}
                    onBlur={(e) => handleRename(terminal.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(terminal.id, e.currentTarget.value);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full bg-transparent border-b border-accent-primary text-text-primary text-[12px] focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : editingNicknameId === terminal.id ? (
                  <input
                    autoFocus
                    defaultValue={terminal.nickname || ''}
                    placeholder="Enter nickname..."
                    onBlur={(e) => handleNicknameChange(terminal.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNicknameChange(terminal.id, e.currentTarget.value);
                      if (e.key === 'Escape') setEditingNicknameId(null);
                    }}
                    className="w-full bg-transparent border-b border-accent-primary text-text-primary text-[12px] focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary text-[12px] font-medium truncate">
                        {terminal.nickname || terminal.label}
                      </p>
                      <span className={`text-[11px] ${
                        terminal.status === 'Running' ? 'text-success' :
                        terminal.status === 'Error' ? 'text-error' :
                        'text-text-tertiary'
                      }`}>
                        {STATUS_LABELS[terminal.status]}
                      </span>
                    </div>
                    <p className="text-text-tertiary text-[11px] truncate mt-0.5">
                      {terminal.working_directory}
                    </p>
                  </>
                )}
              </div>

              {/* Actions Menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === terminal.id ? null : terminal.id);
                  }}
                  className="p-0.5 rounded hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical size={14} className="text-text-secondary" />
                </button>

                <AnimatePresence>
                  {menuOpenId === terminal.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(null);
                        }}
                      />
                      <div className="absolute right-0 top-full mt-1 bg-bg-elevated ring-1 ring-white/[0.08] rounded-lg shadow-xl py-1 min-w-[140px] z-50">
                        {gridTerminalIds.includes(terminal.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromGrid(terminal.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-accent-primary hover:bg-accent-primary/10"
                          >
                            <Grid3X3 size={14} /> Remove from Grid
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToGrid(terminal.id);
                              setGridMode(true);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-white/[0.04]"
                          >
                            <Grid3X3 size={14} /> Add to Grid
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNicknameId(terminal.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-white/[0.04]"
                        >
                          <Tag size={14} /> Set Nickname
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(terminal.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-white/[0.04]"
                        >
                          <Edit3 size={14} /> Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-white/[0.04]"
                        >
                          <Copy size={14} /> Duplicate
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTerminal(terminal.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={14} /> Close
                        </button>
                      </div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ))}

        {terminalList.length === 0 && (
          <div className="text-center text-text-tertiary text-[12px] py-8">
            {search ? 'No terminals found' : 'No terminals yet'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-0.5">
        <button
          onClick={() => openWorkspaceModal()}
          className="w-full flex items-center justify-center gap-1.5 text-text-secondary hover:text-text-primary text-[12px] py-1.5 hover:bg-white/[0.04] rounded-md transition-colors"
        >
          <FolderOpen size={13} />
          Workspaces
        </button>
        <button
          onClick={() => openProfileModal()}
          className="w-full text-text-secondary hover:text-text-primary text-[12px] py-1.5 hover:bg-white/[0.04] rounded-md transition-colors"
        >
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
