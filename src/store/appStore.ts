import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GridLayout = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '2x3' | '3x2' | '2x4' | '4x2';

export type SplitOrientation = 'horizontal' | 'vertical';

interface AppState {
  sidebarOpen: boolean;
  hintsOpen: boolean;
  changesOpen: boolean;
  settingsOpen: boolean;
  profileModalOpen: boolean;
  editingProfileId: string | null;
  newTerminalModalOpen: boolean;
  workspaceModalOpen: boolean;
  defaultClaudeArgs: string[];
  notifyOnFinish: boolean;
  restoreSession: boolean;

  // Changes panel
  changesRefreshTrigger: number;

  // Grid state
  gridMode: boolean;
  gridTerminalIds: string[];
  gridLayout: GridLayout;
  gridFocusedIndex: number | null;

  // Command Palette (F1)
  commandPaletteOpen: boolean;

  // Session History (F2)
  sessionHistoryOpen: boolean;

  // Crash Recovery (F3)
  showRestoreBanner: boolean;
  pendingRestoreConfigs: SavedTerminalConfig[] | null;

  // Split Pane (Ctrl+\)
  splitMode: boolean;
  splitTerminalIds: [string, string] | null;
  splitOrientation: SplitOrientation;
  splitRatio: number;

  // Agent Teams (F4)
  orchestrationOpen: boolean;

  // Snippets (F5)
  snippetsModalOpen: boolean;

  // What's New
  whatsNewOpen: boolean;
  lastSeenVersion: string | null;

  toggleSidebar: () => void;
  toggleHints: () => void;
  toggleChanges: () => void;
  triggerChangesRefresh: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openProfileModal: (profileId?: string) => void;
  closeProfileModal: () => void;
  openNewTerminalModal: () => void;
  closeNewTerminalModal: () => void;
  openWorkspaceModal: () => void;
  closeWorkspaceModal: () => void;
  setDefaultClaudeArgs: (args: string[]) => void;
  setNotifyOnFinish: (enabled: boolean) => void;
  setRestoreSession: (enabled: boolean) => void;

  // Grid actions
  toggleGridMode: () => void;
  setGridMode: (enabled: boolean) => void;
  addToGrid: (terminalId: string) => void;
  removeFromGrid: (terminalId: string) => void;
  setGridTerminals: (terminalIds: string[]) => void;
  setGridLayout: (layout: GridLayout) => void;
  setGridFocusedIndex: (index: number | null) => void;
  clearGrid: () => void;

  // Command Palette actions (F1)
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // Session History actions (F2)
  openSessionHistory: () => void;
  closeSessionHistory: () => void;

  // Crash Recovery actions (F3)
  setShowRestoreBanner: (show: boolean) => void;
  setPendingRestoreConfigs: (configs: SavedTerminalConfig[] | null) => void;

  // Split Pane actions (Ctrl+\)
  toggleSplitMode: () => void;
  setSplitMode: (enabled: boolean) => void;
  setSplitTerminals: (ids: [string, string] | null) => void;
  setSplitOrientation: (orientation: SplitOrientation) => void;
  setSplitRatio: (ratio: number) => void;
  clearSplit: () => void;

  // Agent Teams actions (F4)
  toggleOrchestration: () => void;

  // Snippets actions (F5)
  openSnippetsModal: () => void;
  closeSnippetsModal: () => void;

  // What's New actions
  openWhatsNew: () => void;
  closeWhatsNew: () => void;
  setLastSeenVersion: (version: string) => void;
}

interface SavedTerminalConfig {
  label: string;
  nickname: string | null;
  working_directory: string;
  claude_args: string[];
  env_vars: Record<string, string>;
  color_tag: string | null;
}

// Helper to determine optimal layout based on terminal count
export function getOptimalLayout(count: number): GridLayout {
  switch (count) {
    case 1: return '1x1';
    case 2: return '1x2';
    case 3: return '1x3';
    case 4: return '2x2';
    case 5:
    case 6: return '2x3';
    case 7:
    case 8: return '2x4';
    default: return '1x1';
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      hintsOpen: false,
      changesOpen: false,
      settingsOpen: false,
      profileModalOpen: false,
      editingProfileId: null,
      newTerminalModalOpen: false,
      workspaceModalOpen: false,
      defaultClaudeArgs: [],
      notifyOnFinish: true,
      restoreSession: true,

      // Changes panel
      changesRefreshTrigger: 0,

      // Grid state
      gridMode: false,
      gridTerminalIds: [],
      gridLayout: '1x1',
      gridFocusedIndex: null,

      // Command Palette (F1)
      commandPaletteOpen: false,

      // Session History (F2)
      sessionHistoryOpen: false,

      // Crash Recovery (F3)
      showRestoreBanner: false,
      pendingRestoreConfigs: null,

      // Split Pane (Ctrl+\)
      splitMode: false,
      splitTerminalIds: null,
      splitOrientation: 'horizontal' as SplitOrientation,
      splitRatio: 0.5,

      // Agent Teams (F4)
      orchestrationOpen: false,

      // Snippets (F5)
      snippetsModalOpen: false,

      // What's New
      whatsNewOpen: false,
      lastSeenVersion: null,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleHints: () => set((state) => ({ hintsOpen: !state.hintsOpen })),
      toggleChanges: () => set((state) => ({ changesOpen: !state.changesOpen })),
      triggerChangesRefresh: () => set((state) => ({ changesRefreshTrigger: state.changesRefreshTrigger + 1 })),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openProfileModal: (profileId) => set({ profileModalOpen: true, editingProfileId: profileId || null }),
      closeProfileModal: () => set({ profileModalOpen: false, editingProfileId: null }),
      openNewTerminalModal: () => set({ newTerminalModalOpen: true }),
      closeNewTerminalModal: () => set({ newTerminalModalOpen: false }),
      openWorkspaceModal: () => set({ workspaceModalOpen: true }),
      closeWorkspaceModal: () => set({ workspaceModalOpen: false }),
      setDefaultClaudeArgs: (args) => set({ defaultClaudeArgs: args }),
      setNotifyOnFinish: (enabled) => set({ notifyOnFinish: enabled }),
      setRestoreSession: (enabled) => set({ restoreSession: enabled }),

      // Grid actions
      toggleGridMode: () => set((state) => ({ gridMode: !state.gridMode })),
      setGridMode: (enabled) => set({ gridMode: enabled }),
      addToGrid: (terminalId) => set((state) => {
        if (state.gridTerminalIds.includes(terminalId)) return state;
        if (state.gridTerminalIds.length >= 8) return state;
        const newIds = [...state.gridTerminalIds, terminalId];
        return {
          gridTerminalIds: newIds,
          gridLayout: getOptimalLayout(newIds.length),
        };
      }),
      removeFromGrid: (terminalId) => set((state) => {
        const newIds = state.gridTerminalIds.filter(id => id !== terminalId);
        return {
          gridTerminalIds: newIds,
          gridLayout: getOptimalLayout(newIds.length),
          gridFocusedIndex: state.gridFocusedIndex !== null && state.gridFocusedIndex >= newIds.length
            ? null
            : state.gridFocusedIndex,
        };
      }),
      setGridTerminals: (terminalIds) => set({
        gridTerminalIds: terminalIds.slice(0, 8),
        gridLayout: getOptimalLayout(Math.min(terminalIds.length, 8)),
      }),
      setGridLayout: (layout) => set({ gridLayout: layout }),
      setGridFocusedIndex: (index) => set({ gridFocusedIndex: index }),
      clearGrid: () => set({
        gridTerminalIds: [],
        gridLayout: '1x1',
        gridFocusedIndex: null,
        gridMode: false,
      }),

      // Command Palette actions (F1)
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      // Session History actions (F2)
      openSessionHistory: () => set({ sessionHistoryOpen: true }),
      closeSessionHistory: () => set({ sessionHistoryOpen: false }),

      // Crash Recovery actions (F3)
      setShowRestoreBanner: (show) => set({ showRestoreBanner: show }),
      setPendingRestoreConfigs: (configs) => set({ pendingRestoreConfigs: configs }),

      // Split Pane actions (Ctrl+\)
      toggleSplitMode: () => set((state) => ({ splitMode: !state.splitMode })),
      setSplitMode: (enabled) => set({ splitMode: enabled }),
      setSplitTerminals: (ids) => set({ splitTerminalIds: ids }),
      setSplitOrientation: (orientation) => set({ splitOrientation: orientation }),
      setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.2, Math.min(0.8, ratio)) }),
      clearSplit: () => set({ splitMode: false, splitTerminalIds: null, splitRatio: 0.5 }),

      // Agent Teams actions (F4)
      toggleOrchestration: () => set((state) => ({ orchestrationOpen: !state.orchestrationOpen })),

      // Snippets actions (F5)
      openSnippetsModal: () => set({ snippetsModalOpen: true }),
      closeSnippetsModal: () => set({ snippetsModalOpen: false }),

      // What's New actions
      openWhatsNew: () => set({ whatsNewOpen: true }),
      closeWhatsNew: () => set({ whatsNewOpen: false }),
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
    }),
    {
      name: 'claude-terminal-app',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        hintsOpen: state.hintsOpen,
        changesOpen: state.changesOpen,
        defaultClaudeArgs: state.defaultClaudeArgs,
        notifyOnFinish: state.notifyOnFinish,
        restoreSession: state.restoreSession,
        orchestrationOpen: state.orchestrationOpen,
        lastSeenVersion: state.lastSeenVersion,
      }),
    }
  )
);
