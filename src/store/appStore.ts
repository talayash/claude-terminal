import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GridLayout = '1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '2x3' | '3x2' | '2x4' | '4x2';

interface AppState {
  sidebarOpen: boolean;
  hintsOpen: boolean;
  settingsOpen: boolean;
  profileModalOpen: boolean;
  editingProfileId: string | null;
  newTerminalModalOpen: boolean;
  defaultClaudeArgs: string[];

  // Grid state
  gridMode: boolean;
  gridTerminalIds: string[];
  gridLayout: GridLayout;
  gridFocusedIndex: number | null;

  toggleSidebar: () => void;
  toggleHints: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openProfileModal: (profileId?: string) => void;
  closeProfileModal: () => void;
  openNewTerminalModal: () => void;
  closeNewTerminalModal: () => void;
  setDefaultClaudeArgs: (args: string[]) => void;

  // Grid actions
  toggleGridMode: () => void;
  setGridMode: (enabled: boolean) => void;
  addToGrid: (terminalId: string) => void;
  removeFromGrid: (terminalId: string) => void;
  setGridTerminals: (terminalIds: string[]) => void;
  setGridLayout: (layout: GridLayout) => void;
  setGridFocusedIndex: (index: number | null) => void;
  clearGrid: () => void;
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
      settingsOpen: false,
      profileModalOpen: false,
      editingProfileId: null,
      newTerminalModalOpen: false,
      defaultClaudeArgs: ['--dangerously-skip-permissions'],

      // Grid state
      gridMode: false,
      gridTerminalIds: [],
      gridLayout: '1x1',
      gridFocusedIndex: null,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleHints: () => set((state) => ({ hintsOpen: !state.hintsOpen })),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openProfileModal: (profileId) => set({ profileModalOpen: true, editingProfileId: profileId || null }),
      closeProfileModal: () => set({ profileModalOpen: false, editingProfileId: null }),
      openNewTerminalModal: () => set({ newTerminalModalOpen: true }),
      closeNewTerminalModal: () => set({ newTerminalModalOpen: false }),
      setDefaultClaudeArgs: (args) => set({ defaultClaudeArgs: args }),

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
    }),
    {
      name: 'claude-terminal-app',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        hintsOpen: state.hintsOpen,
        defaultClaudeArgs: state.defaultClaudeArgs,
      }),
    }
  )
);
