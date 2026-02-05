import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, CheckCircle, AlertCircle, X, Rocket } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  version: string;
  date: string;
  body: string;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'up-to-date';

export function AutoUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check for updates on mount
  useEffect(() => {
    const checkOnStartup = async () => {
      // Wait a bit before checking to not slow down startup
      await new Promise(resolve => setTimeout(resolve, 3000));
      await checkForUpdates(true);
    };
    checkOnStartup();
  }, []);

  const checkForUpdates = async (silent = false) => {
    try {
      setStatus('checking');
      setError(null);

      const update = await check();

      if (update) {
        setUpdateInfo({
          version: update.version,
          date: update.date || '',
          body: update.body || '',
        });
        setStatus('available');
        setShowBanner(true);
        setDismissed(false);
      } else {
        setStatus('up-to-date');
        if (!silent) {
          setShowBanner(true);
          setTimeout(() => setShowBanner(false), 3000);
        }
      }
    } catch (err) {
      console.error('Update check failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
      if (!silent) {
        setShowBanner(true);
      }
    }
  };

  const downloadAndInstall = async () => {
    try {
      setStatus('downloading');
      setDownloadProgress(0);

      const update = await check();
      if (!update) {
        setStatus('error');
        setError('Update no longer available');
        return;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      setStatus('ready');
    } catch (err) {
      console.error('Update download failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to download update');
    }
  };

  const restartApp = async () => {
    try {
      await relaunch();
    } catch (err) {
      console.error('Failed to restart:', err);
      setError('Failed to restart. Please restart manually.');
    }
  };

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
                    onClick={restartApp}
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
                <button
                  onClick={() => checkForUpdates(false)}
                  className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
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

// Export a hook for manual update checking from settings
export function useAutoUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = async () => {
    try {
      setStatus('checking');
      setError(null);

      const update = await check();

      if (update) {
        setUpdateInfo({
          version: update.version,
          date: update.date || '',
          body: update.body || '',
        });
        setStatus('available');
        return { available: true, version: update.version };
      } else {
        setStatus('up-to-date');
        return { available: false };
      }
    } catch (err) {
      console.error('Update check failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
      return { available: false, error: err };
    }
  };

  const downloadAndInstall = async () => {
    try {
      setStatus('downloading');
      setDownloadProgress(0);

      const update = await check();
      if (!update) {
        setStatus('error');
        setError('Update no longer available');
        return false;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      setStatus('ready');
      return true;
    } catch (err) {
      console.error('Update download failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to download update');
      return false;
    }
  };

  const restart = async () => {
    try {
      await relaunch();
    } catch (err) {
      console.error('Failed to restart:', err);
      setError('Failed to restart. Please restart manually.');
    }
  };

  return {
    status,
    updateInfo,
    downloadProgress,
    error,
    checkForUpdates,
    downloadAndInstall,
    restart,
  };
}
