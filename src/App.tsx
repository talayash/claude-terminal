import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { TerminalTabs } from './components/TerminalTabs';
import { HintsPanel } from './components/HintsPanel';
import { FileChangesPanel } from './components/FileChangesPanel';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { NewTerminalModal } from './components/NewTerminalModal';
import { WorkspaceModal } from './components/WorkspaceModal';
import { SessionHistory } from './components/SessionHistory';
import { SnippetsModal } from './components/SnippetsModal';
import { CommandPalette } from './components/CommandPalette';
import { SetupWizard } from './components/SetupWizard';
import { AutoUpdater } from './components/AutoUpdater';
import { WhatsNewModal } from './components/WhatsNewModal';
import { useAppStore } from './store/appStore';
import { useTerminalStore } from './store/terminalStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotification } from './hooks/useNotification';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-bg-primary flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <h2 className="text-text-primary text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-text-secondary text-sm mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 rounded-md text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface SystemStatus {
  node_installed: boolean;
  node_version: string | null;
  npm_installed: boolean;
  npm_version: string | null;
  claude_installed: boolean;
  claude_version: string | null;
}

interface SavedTerminalConfig {
  label: string;
  nickname: string | null;
  working_directory: string;
  claude_args: string[];
  env_vars: Record<string, string>;
  color_tag: string | null;
}

function App() {
  const { sidebarOpen, hintsOpen, changesOpen, settingsOpen, profileModalOpen, newTerminalModalOpen, workspaceModalOpen, sessionHistoryOpen, snippetsModalOpen, commandPaletteOpen, whatsNewOpen, notifyOnFinish, restoreSession, triggerChangesRefresh, showRestoreBanner, pendingRestoreConfigs, setShowRestoreBanner, setPendingRestoreConfigs, lastSeenVersion, setLastSeenVersion, openWhatsNew } = useAppStore();
  const { handleTerminalOutput, updateTerminalStatus, createTerminal } = useTerminalStore();
  const [showSetup, setShowSetup] = useState<boolean | null>(null);
  const { notify } = useNotification();

  useKeyboardShortcuts();

  useEffect(() => {
    // Check if Claude Code is installed on startup
    const checkSetup = async () => {
      try {
        const status = await invoke<SystemStatus>('check_system_requirements');
        setShowSetup(!status.claude_installed);
      } catch {
        setShowSetup(true);
      }
    };
    checkSetup();
  }, []);

  // What's New check — runs after setup is confirmed
  useEffect(() => {
    if (showSetup !== false) return;

    const checkWhatsNew = async () => {
      try {
        const currentVersion = await getVersion();
        if (!lastSeenVersion) {
          // Fresh install — just record the current version, no popup
          setLastSeenVersion(currentVersion);
        } else if (lastSeenVersion !== currentVersion) {
          openWhatsNew();
        }
      } catch (err) {
        console.error('Failed to check version for What\'s New:', err);
      }
    };

    checkWhatsNew();
  }, [showSetup]);

  useEffect(() => {
    const unlisten = listen<{ id: string; data: number[] }>('terminal-output', (event) => {
      handleTerminalOutput(event.payload.id, new Uint8Array(event.payload.data));
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [handleTerminalOutput]);

  useEffect(() => {
    const unlisten = listen<{ id: string }>('terminal-finished', (event) => {
      const { id } = event.payload;

      // Get the current terminal name from the store (always up-to-date, even after renames)
      const terminals = useTerminalStore.getState().terminals;
      const terminal = terminals.get(id);
      const name = terminal?.config.nickname || terminal?.config.label || 'Terminal';

      updateTerminalStatus(id, 'Stopped');
      triggerChangesRefresh();

      if (notifyOnFinish) {
        notify('Terminal Finished', `${name} has finished running.`);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [notifyOnFinish, notify, updateTerminalStatus]);

  // Restore previous session on startup — show banner instead of silently restoring
  useEffect(() => {
    if (showSetup !== false) return;
    if (!restoreSession) return;

    const checkLastSession = async () => {
      try {
        const configs = await invoke<SavedTerminalConfig[] | null>('get_last_session');
        if (!configs || configs.length === 0) return;
        setPendingRestoreConfigs(configs);
        setShowRestoreBanner(true);
      } catch (err) {
        console.error('Failed to check last session:', err);
      }
    };

    checkLastSession();
  }, [showSetup]);

  // Auto-save session every 30 seconds
  useEffect(() => {
    if (showSetup !== false) return;

    const interval = setInterval(() => {
      invoke('save_session_for_restore').catch((err) => {
        console.error('Failed to auto-save session:', err);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [showSetup]);

  const handleRestore = async () => {
    if (!pendingRestoreConfigs) return;
    await invoke('clear_last_session');
    for (const config of pendingRestoreConfigs) {
      try {
        await createTerminal(
          config.label,
          config.working_directory,
          config.claude_args,
          config.env_vars,
          config.color_tag ?? undefined,
          config.nickname ?? undefined
        );
      } catch (err) {
        console.error('Failed to restore terminal:', config.label, err);
      }
    }
    setShowRestoreBanner(false);
    setPendingRestoreConfigs(null);
  };

  const handleDismissRestore = async () => {
    await invoke('clear_last_session');
    setShowRestoreBanner(false);
    setPendingRestoreConfigs(null);
  };

  // Show loading while checking
  if (showSetup === null) {
    return (
      <div className="h-screen w-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col overflow-hidden rounded-lg">
      <AnimatePresence>
        {showSetup && (
          <SetupWizard onComplete={() => setShowSetup(false)} />
        )}
      </AnimatePresence>

      {!showSetup && (
        <>
          <AutoUpdater />

          {/* Restore Banner (F3) */}
          <AnimatePresence>
            {showRestoreBanner && pendingRestoreConfigs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-accent-primary/10 border-b border-accent-primary/20 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-text-primary text-[13px]">
                    Restore {pendingRestoreConfigs.length} terminal{pendingRestoreConfigs.length !== 1 ? 's' : ''} from your previous session?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRestore}
                      className="bg-accent-primary hover:bg-accent-secondary text-white px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      onClick={handleDismissRestore}
                      className="text-text-secondary hover:text-text-primary px-3 py-1 rounded-md text-[12px] transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <TitleBar />

          <div className="flex-1 flex overflow-hidden">
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <div
                  className="h-full overflow-hidden transition-all duration-150 ease-out"
                  style={{ width: 280 }}
                >
                  <Sidebar />
                </div>
              )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col overflow-hidden">
              <TerminalTabs />
            </main>

            <AnimatePresence mode="wait">
              {changesOpen && (
                <div
                  className="h-full overflow-hidden transition-all duration-150 ease-out"
                  style={{ width: 300 }}
                >
                  <FileChangesPanel />
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {hintsOpen && (
                <div
                  className="h-full overflow-hidden transition-all duration-150 ease-out"
                  style={{ width: 320 }}
                >
                  <HintsPanel />
                </div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {settingsOpen && <SettingsModal />}
            {profileModalOpen && <ProfileModal />}
            {newTerminalModalOpen && <NewTerminalModal />}
            {workspaceModalOpen && <WorkspaceModal />}
            {sessionHistoryOpen && <SessionHistory />}
            {snippetsModalOpen && <SnippetsModal />}
            {whatsNewOpen && <WhatsNewModal />}
          </AnimatePresence>
          {commandPaletteOpen && <CommandPalette />}
        </>
      )}
    </div>
  );
}

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithBoundary;
