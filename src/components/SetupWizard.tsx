import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Download, ExternalLink, Loader2, Terminal, Box, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SystemStatus {
  node_installed: boolean;
  node_version: string | null;
  npm_installed: boolean;
  npm_version: string | null;
  claude_installed: boolean;
  claude_version: string | null;
}

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const checkRequirements = async () => {
    setIsChecking(true);
    try {
      const result = await invoke<SystemStatus>('check_system_requirements');
      setStatus(result);

      if (result.claude_installed) {
        setTimeout(onComplete, 1500);
      }
    } catch (error) {
      console.error('Failed to check requirements:', error);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkRequirements();
  }, []);

  const handleInstallClaude = async () => {
    setIsInstalling(true);
    setInstallError(null);
    try {
      await invoke('install_claude_code');
      await checkRequirements();
    } catch (error) {
      setInstallError(String(error));
    }
    setIsInstalling(false);
  };

  const openUrl = async (url: string) => {
    await invoke('open_external_url', { url });
  };

  const steps = [
    {
      title: 'Node.js',
      description: 'JavaScript runtime required for Claude Code',
      installed: status?.node_installed,
      version: status?.node_version,
      downloadUrl: 'https://nodejs.org/',
      icon: Box,
    },
    {
      title: 'npm',
      description: 'Package manager (comes with Node.js)',
      installed: status?.npm_installed,
      version: status?.npm_version,
      downloadUrl: 'https://nodejs.org/',
      icon: Box,
    },
    {
      title: 'Claude Code',
      description: 'Anthropic\'s CLI tool for AI-powered coding',
      installed: status?.claude_installed,
      version: status?.claude_version,
      downloadUrl: 'https://docs.anthropic.com/en/docs/claude-code',
      icon: Terminal,
      canAutoInstall: status?.npm_installed,
    },
  ];

  const allInstalled = status?.node_installed && status?.npm_installed && status?.claude_installed;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-bg-primary flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-bg-elevated border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-primary/20 flex items-center justify-center"
          >
            <Terminal size={32} className="text-accent-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Welcome to ClaudeTerminal</h1>
          <p className="text-text-secondary">Let's make sure everything is set up correctly</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isChecking ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={48} className="text-accent-primary animate-spin mb-4" />
              <p className="text-text-secondary">Checking system requirements...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-xl border transition-all ${
                      step.installed
                        ? 'bg-success/10 border-success/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        step.installed ? 'bg-success/20' : 'bg-white/10'
                      }`}>
                        <Icon size={24} className={step.installed ? 'text-success' : 'text-text-secondary'} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-text-primary font-medium">{step.title}</h3>
                          {step.installed ? (
                            <CheckCircle size={16} className="text-success" />
                          ) : (
                            <XCircle size={16} className="text-error" />
                          )}
                        </div>
                        <p className="text-text-secondary text-sm">{step.description}</p>
                        {step.version && (
                          <p className="text-accent-primary text-xs mt-1">Version: {step.version}</p>
                        )}
                      </div>

                      {!step.installed && (
                        <div className="flex gap-2">
                          {step.canAutoInstall && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleInstallClaude}
                              disabled={isInstalling}
                              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                              {isInstalling ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                              {isInstalling ? 'Installing...' : 'Install'}
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openUrl(step.downloadUrl)}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-text-primary py-2 px-4 rounded-lg text-sm font-medium"
                          >
                            <ExternalLink size={16} />
                            Download
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {installError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-error/10 border border-error/30"
                >
                  <p className="text-error text-sm">
                    <strong>Installation Error:</strong> {installError}
                  </p>
                  <p className="text-text-secondary text-xs mt-2">
                    Try running manually: <code className="bg-white/10 px-2 py-1 rounded">npm install -g @anthropic-ai/claude-code</code>
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between items-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={checkRequirements}
            disabled={isChecking}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
            Recheck
          </motion.button>

          <AnimatePresence mode="wait">
            {allInstalled ? (
              <motion.button
                key="continue"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onComplete}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white py-2 px-6 rounded-lg font-medium"
              >
                <CheckCircle size={18} />
                Get Started
              </motion.button>
            ) : (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-text-secondary text-sm"
              >
                Install missing requirements to continue
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
