import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, CheckCircle, AlertCircle, X, Rocket, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useUpdaterStore } from '../store/updaterStore';

const RELEASES_URL = 'https://github.com/talayash/claude-terminal/releases/latest';

export function AutoUpdater() {
  const { status, updateInfo, downloadProgress, error, checkForUpdates, downloadAndInstall, restart } = useUpdaterStore();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check for updates on mount
  useEffect(() => {
    const checkOnStartup = async () => {
      // Wait a bit before checking to not slow down startup
      await new Promise(resolve => setTimeout(resolve, 3000));
      const result = await checkForUpdates();
      if (result.available) {
        setShowBanner(true);
      }
    };
    checkOnStartup();
  }, []);

  // Show banner when update becomes available (e.g. from Settings check)
  useEffect(() => {
    if (status === 'available' && !dismissed) {
      setShowBanner(true);
    }
  }, [status, dismissed]);

  const dismissBanner = () => {
    setDismissed(true);
    setTimeout(() => setShowBanner(false), 300);
  };

  // Don't show anything if dismissed or no banner needed
  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-12 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
      >
        <div className="bg-bg-elevated border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              {status === 'checking' && <RefreshCw size={16} className="text-accent-primary animate-spin" />}
              {status === 'available' && <Download size={16} className="text-accent-primary" />}
              {status === 'downloading' && <RefreshCw size={16} className="text-accent-primary animate-spin" />}
              {status === 'ready' && <Rocket size={16} className="text-success" />}
              {status === 'up-to-date' && <CheckCircle size={16} className="text-success" />}
              {status === 'error' && <AlertCircle size={16} className="text-error" />}
              <span className="text-text-primary font-medium text-sm">
                {status === 'checking' && 'Checking for updates...'}
                {status === 'available' && `Update Available: v${updateInfo?.version}`}
                {status === 'downloading' && 'Downloading update...'}
                {status === 'ready' && 'Update Ready!'}
                {status === 'up-to-date' && 'You\'re up to date!'}
                {status === 'error' && 'Update Error'}
              </span>
            </div>
            <button
              onClick={dismissBanner}
              className="p-1 rounded hover:bg-white/10 text-text-secondary transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {status === 'available' && updateInfo && (
              <div className="space-y-3">
                {updateInfo.body && (
                  <p className="text-text-secondary text-xs line-clamp-3">
                    {updateInfo.body}
                  </p>
                )}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={downloadAndInstall}
                    className="flex-1 flex items-center justify-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={14} />
                    Download & Install
                  </motion.button>
                  <button
                    onClick={dismissBanner}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg text-sm transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}

            {status === 'downloading' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Downloading...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-text-secondary text-xs">
                  Please wait while the update downloads...
                </p>
              </div>
            )}

            {status === 'ready' && (
              <div className="space-y-3">
                <p className="text-text-secondary text-sm">
                  The update has been downloaded. Restart the app to apply the update.
                </p>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={restart}
                    className="flex-1 flex items-center justify-center gap-2 bg-success hover:bg-success/90 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Rocket size={14} />
                    Restart Now
                  </motion.button>
                  <button
                    onClick={dismissBanner}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg text-sm transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <p className="text-error text-xs">
                  {error || 'An error occurred while checking for updates.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => checkForUpdates()}
                    className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
                  >
                    <RefreshCw size={14} />
                    Try Again
                  </button>
                  <button
                    onClick={() => invoke('open_external_url', { url: RELEASES_URL })}
                    className="flex items-center gap-2 text-accent-primary hover:text-accent-primary/80 text-sm transition-colors"
                  >
                    <ExternalLink size={14} />
                    Download Manually
                  </button>
                </div>
              </div>
            )}

            {status === 'up-to-date' && (
              <p className="text-text-secondary text-sm">
                You're running the latest version of ClaudeTerminal.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
