import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Check, Rocket } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { useAutoUpdater } from './AutoUpdater';

interface UpdateCheckResult {
  current_version: string;
  latest_version: string;
  update_available: boolean;
}

export function SettingsModal() {
  const { closeSettings, defaultClaudeArgs, setDefaultClaudeArgs } = useAppStore();
  const [claudeVersion, setClaudeVersion] = useState<string>('');
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error' | 'uptodate'>('idle');
  const [updateMessage, setUpdateMessage] = useState<string>('');
  const [argsText, setArgsText] = useState(defaultClaudeArgs.join('\n'));

  // App auto-updater
  const appUpdater = useAutoUpdater();

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    setUpdateStatus('idle');
    setUpdateMessage('');
    try {
      const result = await invoke<UpdateCheckResult>('check_claude_update');
      setClaudeVersion(result.current_version);
      setLatestVersion(result.latest_version);
      setUpdateAvailable(result.update_available);
      if (!result.update_available) {
        setUpdateStatus('uptodate');
        setUpdateMessage('You have the latest version!');
      }
    } catch (error) {
      // Fallback to just getting version
      try {
        const version = await invoke<string>('get_claude_version');
        setClaudeVersion(version || 'Not installed');
      } catch {
        setClaudeVersion('Not installed');
      }
      setUpdateAvailable(null);
    }
    setIsChecking(false);
  };

  const handleUpdateClaude = async () => {
    if (updateAvailable === false) {
      setUpdateStatus('uptodate');
      setUpdateMessage('You already have the latest version!');
      return;
    }

    setIsUpdating(true);
    setUpdateStatus('idle');
    setUpdateMessage('Updating Claude Code...');
    try {
      const result = await invoke<string>('update_claude_code');
      setUpdateStatus('success');
      setUpdateMessage(result);
      // Re-check versions after update
      await checkForUpdates();
    } catch (error) {
      setUpdateStatus('error');
      setUpdateMessage(String(error));
    }
    setIsUpdating(false);
  };

  const openDocs = async () => {
    await invoke('open_external_url', { url: 'https://docs.anthropic.com/en/docs/claude-code' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={closeSettings}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-elevated border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-text-primary text-lg font-semibold">Settings</h2>
          <button
            onClick={closeSettings}
            className="p-1 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* App Updates */}
          <div>
            <h3 className="text-text-primary font-medium mb-3">App Updates</h3>
            <div className="bg-white/5 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary text-sm">ClaudeTerminal</p>
                  <p className="text-text-secondary text-xs">v1.3.0</p>
                  {appUpdater.status === 'available' && appUpdater.updateInfo && (
                    <p className="text-accent-primary text-xs mt-1">
                      Update available: v{appUpdater.updateInfo.version}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {appUpdater.status === 'up-to-date' ? (
                    <div className="flex items-center gap-2 bg-success/20 text-success py-2 px-4 rounded-lg text-sm font-medium">
                      <Check size={16} />
                      Up to date
                    </div>
                  ) : appUpdater.status === 'ready' ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={appUpdater.restart}
                      className="flex items-center gap-2 bg-success hover:bg-success/90 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Rocket size={16} />
                      Restart to Update
                    </motion.button>
                  ) : appUpdater.status === 'downloading' ? (
                    <div className="flex items-center gap-2 bg-white/10 text-text-primary py-2 px-4 rounded-lg text-sm font-medium">
                      <RefreshCw size={16} className="animate-spin" />
                      {appUpdater.downloadProgress}%
                    </div>
                  ) : appUpdater.status === 'available' ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={appUpdater.downloadAndInstall}
                      className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download size={16} />
                      Download Update
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={appUpdater.checkForUpdates}
                      disabled={appUpdater.status === 'checking'}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-text-primary py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {appUpdater.status === 'checking' ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      Check for Updates
                    </motion.button>
                  )}
                </div>
              </div>

              {appUpdater.status === 'downloading' && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${appUpdater.downloadProgress}%` }}
                    />
                  </div>
                  <p className="text-text-secondary text-xs">Downloading update...</p>
                </div>
              )}

              {appUpdater.error && (
                <div className="text-xs p-2 rounded bg-error/20 text-error">
                  {appUpdater.error}
                </div>
              )}
            </div>
          </div>

          {/* Claude Code Version */}
          <div>
            <h3 className="text-text-primary font-medium mb-3">Claude Code</h3>
            <div className="bg-white/5 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary text-sm">Current Version</p>
                  <p className="text-text-secondary text-xs">
                    {isChecking ? 'Checking...' : claudeVersion || 'Not installed'}
                  </p>
                  {latestVersion && updateAvailable && (
                    <p className="text-accent-primary text-xs mt-1">
                      Update available: v{latestVersion}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openDocs}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-text-primary py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink size={14} />
                    Docs
                  </motion.button>
                  {updateAvailable === false ? (
                    <div className="flex items-center gap-2 bg-success/20 text-success py-2 px-4 rounded-lg text-sm font-medium">
                      <Check size={16} />
                      Up to date
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleUpdateClaude}
                      disabled={isUpdating || isChecking}
                      className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                        updateAvailable
                          ? 'bg-accent-primary hover:bg-accent-primary/80 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-text-primary'
                      }`}
                    >
                      {isUpdating ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : isChecking ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : updateStatus === 'success' ? (
                        <CheckCircle size={16} />
                      ) : updateStatus === 'error' ? (
                        <AlertCircle size={16} />
                      ) : (
                        <Download size={16} />
                      )}
                      {isUpdating ? 'Updating...' : isChecking ? 'Checking...' : 'Update'}
                    </motion.button>
                  )}
                </div>
              </div>

              {updateMessage && (
                <div className={`text-xs p-2 rounded ${
                  updateStatus === 'success' ? 'bg-success/20 text-success' :
                  updateStatus === 'uptodate' ? 'bg-success/20 text-success' :
                  updateStatus === 'error' ? 'bg-error/20 text-error' :
                  'bg-white/10 text-text-secondary'
                }`}>
                  {updateMessage}
                </div>
              )}
            </div>
          </div>

          {/* Default Claude Arguments */}
          <div>
            <h3 className="text-text-primary font-medium mb-3">Default Claude Arguments</h3>
            <div className="bg-white/5 rounded-lg p-3 space-y-3">
              <p className="text-text-secondary text-xs">
                These arguments will be pre-filled when creating a new terminal. One argument per line.
              </p>
              <textarea
                value={argsText}
                onChange={(e) => setArgsText(e.target.value)}
                onBlur={() => setDefaultClaudeArgs(argsText.split('\n').filter(Boolean))}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50 font-mono h-24 resize-none"
                placeholder="--dangerously-skip-permissions&#10;--model opus"
              />
              <p className="text-text-secondary text-xs">
                Command: <code className="text-accent-primary">claude {argsText.split('\n').filter(Boolean).join(' ')}</code>
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-text-primary font-medium mb-3">Keyboard Shortcuts</h3>
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">New Terminal</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+Shift+N</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Close Terminal</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+W</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Toggle Sidebar</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+B</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Toggle Hints</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">F1</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Switch Tab</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+Tab</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Copy / Interrupt</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+C</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Paste</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+V</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Toggle Grid View</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+G</kbd>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Add to Grid</span>
                <kbd className="text-text-primary bg-white/10 px-2 py-0.5 rounded">Ctrl+Shift+G</kbd>
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-text-primary font-medium mb-3">About</h3>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-text-primary text-sm">ClaudeTerminal v1.3.0</p>
              <p className="text-text-secondary text-xs mt-1">
                A modern terminal manager for Claude Code
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
