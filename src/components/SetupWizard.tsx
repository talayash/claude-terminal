import { useState, useEffect, useRef } from 'react';
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

  const mountedRef = useRef(true);

  const checkRequirements = async () => {
    setIsChecking(true);
    try {
      const result = await invoke<SystemStatus>('check_system_requirements');
      if (!mountedRef.current) return;
      setStatus(result);

      if (result.claude_installed) {
        setTimeout(onComplete, 1500);
      }
    } catch (error) {
      console.error('Failed to check requirements:', error);
    }
    if (mountedRef.current) setIsChecking(false);
  };

  useEffect(() => {
    checkRequirements();
    return () => { mountedRef.current = false; };
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
      <div className="bg-bg-elevated ring-1 ring-white/[0.08] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-bg-surface flex items-center justify-center">
            <Terminal size={24} className="text-text-secondary" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-1">Welcome to ClaudeTerminal</h1>
          <p className="text-text-secondary text-[13px]">Let's make sure everything is set up correctly</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isChecking ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 size={32} className="text-text-secondary animate-spin mb-4" />
              <p className="text-text-tertiary text-[13px]">Checking system requirements...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className={`p-4 rounded-md ring-1 transition-all ${
                      step.installed
                        ? 'bg-success/5 ring-success/20'
                        : 'bg-bg-primary ring-border'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                        step.installed ? 'bg-success/10' : 'bg-bg-secondary'
                      }`}>
                        <Icon size={20} className={step.installed ? 'text-success' : 'text-text-tertiary'} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-text-primary text-[13px] font-medium">{step.title}</h3>
                          {step.installed ? (
                            <CheckCircle size={14} className="text-success" />
                          ) : (
                            <XCircle size={14} className="text-error" />
                          )}
                        </div>
                        <p className="text-text-tertiary text-[12px]">{step.description}</p>
                        {step.version && (
                          <p className="text-text-secondary text-[11px] mt-0.5">Version: {step.version}</p>
                        )}
                      </div>

                      {!step.installed && (
                        <div className="flex gap-2">
                          {step.canAutoInstall && (
                            <button
                              onClick={handleInstallClaude}
                              disabled={isInstalling}
                              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-secondary text-white h-9 px-4 rounded-md text-[12px] font-medium disabled:opacity-50 transition-colors"
                            >
                              {isInstalling ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                              {isInstalling ? 'Installing...' : 'Install'}
                            </button>
                          )}
                          <button
                            onClick={() => openUrl(step.downloadUrl)}
                            className="flex items-center gap-2 bg-bg-secondary ring-1 ring-border-light hover:bg-white/[0.04] text-text-primary h-9 px-4 rounded-md text-[12px] font-medium transition-colors"
                          >
                            <ExternalLink size={14} />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {installError && (
                <div className="p-3 rounded-md bg-error/5 ring-1 ring-error/20">
                  <p className="text-error text-[12px]">
                    <strong>Installation Error:</strong> {installError}
                  </p>
                  <p className="text-text-tertiary text-[11px] mt-1.5">
                    Try running manually: <code className="bg-bg-primary px-1.5 py-0.5 rounded text-[11px]">npm install -g @anthropic-ai/claude-code</code>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center">
          <button
            onClick={() => checkRequirements()}
            disabled={isChecking}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-[12px] transition-colors"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            Recheck
          </button>

          <AnimatePresence mode="wait">
            {allInstalled ? (
              <button
                onClick={onComplete}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white h-9 px-5 rounded-md text-[13px] font-medium transition-colors"
              >
                <CheckCircle size={16} />
                Get Started
              </button>
            ) : (
              <span className="text-text-tertiary text-[12px]">
                Install missing requirements to continue
              </span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
