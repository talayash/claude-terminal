import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { TerminalTabs } from './components/TerminalTabs';
import { HintsPanel } from './components/HintsPanel';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { NewTerminalModal } from './components/NewTerminalModal';
import { SetupWizard } from './components/SetupWizard';
import { AutoUpdater } from './components/AutoUpdater';
import { useAppStore } from './store/appStore';
import { useTerminalStore } from './store/terminalStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface SystemStatus {
  node_installed: boolean;
  node_version: string | null;
  npm_installed: boolean;
  npm_version: string | null;
  claude_installed: boolean;
  claude_version: string | null;
}

function App() {
  const { sidebarOpen, hintsOpen, settingsOpen, profileModalOpen, newTerminalModalOpen } = useAppStore();
  const { handleTerminalOutput } = useTerminalStore();
  const [showSetup, setShowSetup] = useState<boolean | null>(null);

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

  useEffect(() => {
    const unlisten = listen<{ id: string; data: number[] }>('terminal-output', (event) => {
      handleTerminalOutput(event.payload.id, new Uint8Array(event.payload.data));
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [handleTerminalOutput]);

  // Show loading while checking
  if (showSetup === null) {
    return (
      <div className="h-screen w-screen bg-bg-primary flex items-center justify-center">
        <div className="text-accent-primary animate-pulse text-xl">Loading...</div>
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
          <TitleBar />

          <div className="flex-1 flex overflow-hidden">
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full"
                >
                  <Sidebar />
                </motion.div>
              )}
            </AnimatePresence>

            <main className="flex-1 flex flex-col overflow-hidden">
              <TerminalTabs />
            </main>

            <AnimatePresence mode="wait">
              {hintsOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full"
                >
                  <HintsPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {settingsOpen && <SettingsModal />}
            {profileModalOpen && <ProfileModal />}
            {newTerminalModalOpen && <NewTerminalModal />}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default App;
