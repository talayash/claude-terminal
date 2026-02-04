import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';

export function SettingsModal() {
  const { closeSettings } = useAppStore();
  const [claudeVersion, setClaudeVersion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [updateMessage, setUpdateMessage] = useState<string>('');

  useEffect(() => {
    invoke<string>('get_claude_version').then(setClaudeVersion).catch(() => setClaudeVersion('Not installed'));
  }, []);

  const handleUpdateClaude = async () => {
    setIsUpdating(true);
    setUpdateStatus('idle');
    setUpdateMessage('Updating Claude Code...');
    try {
      const result = await invoke<string>('update_claude_code');
      const newVersion = await invoke<string>('get_claude_version');
      setClaudeVersion(newVersion);
      setUpdateStatus('success');
      setUpdateMessage(result);
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
          {/* Claude Code Version */}
          <div>
            <h3 className="text-text-primary font-medium mb-3">Claude Code</h3>
            <div className="bg-white/5 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary text-sm">Current Version</p>
                  <p className="text-text-secondary text-xs">{claudeVersion || 'Checking...'}</p>
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
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateClaude}
                    disabled={isUpdating}
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/80 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {isUpdating ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : updateStatus === 'success' ? (
                      <CheckCircle size={16} />
                    ) : updateStatus === 'error' ? (
                      <AlertCircle size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                    {isUpdating ? 'Updating...' : 'Update'}
                  </motion.button>
                </div>
              </div>

              {updateMessage && (
                <div className={`text-xs p-2 rounded ${
                  updateStatus === 'success' ? 'bg-success/20 text-success' :
                  updateStatus === 'error' ? 'bg-error/20 text-error' :
                  'bg-white/10 text-text-secondary'
                }`}>
                  {updateMessage}
                </div>
              )}
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
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-text-primary font-medium mb-3">About</h3>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-text-primary text-sm">ClaudeTerminal v1.0.0</p>
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
