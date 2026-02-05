import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  sidebarOpen: boolean;
  hintsOpen: boolean;
  settingsOpen: boolean;
  profileModalOpen: boolean;
  editingProfileId: string | null;
  newTerminalModalOpen: boolean;
  defaultClaudeArgs: string[];

  toggleSidebar: () => void;
  toggleHints: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openProfileModal: (profileId?: string) => void;
  closeProfileModal: () => void;
  openNewTerminalModal: () => void;
  closeNewTerminalModal: () => void;
  setDefaultClaudeArgs: (args: string[]) => void;
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

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleHints: () => set((state) => ({ hintsOpen: !state.hintsOpen })),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openProfileModal: (profileId) => set({ profileModalOpen: true, editingProfileId: profileId || null }),
      closeProfileModal: () => set({ profileModalOpen: false, editingProfileId: null }),
      openNewTerminalModal: () => set({ newTerminalModalOpen: true }),
      closeNewTerminalModal: () => set({ newTerminalModalOpen: false }),
      setDefaultClaudeArgs: (args) => set({ defaultClaudeArgs: args }),
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
