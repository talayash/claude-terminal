import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FolderOpen, Terminal, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { useTerminalStore } from '../store/terminalStore';
import { homeDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';

interface ConfigProfile {
  id: string;
  name: string;
  description: string | null;
  working_directory: string;
  claude_args: string[];
  env_vars: Record<string, string>;
  is_default: boolean;
}

const TAG_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
];

export function NewTerminalModal() {
  const { closeNewTerminalModal, defaultClaudeArgs } = useAppStore();
  const { terminals, createTerminal, writeToTerminal } = useTerminalStore();

  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [claudeArgs, setClaudeArgs] = useState<string[]>(defaultClaudeArgs);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProfiles();
    loadDefaultDirectory();
  }, []);

  useEffect(() => {
    // When profile is selected, update form with profile settings
    if (selectedProfileId) {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (profile) {
        if (profile.working_directory) {
          setWorkingDirectory(profile.working_directory);
        }
        if (profile.claude_args.length > 0) {
          setClaudeArgs(profile.claude_args);
        }
      }
    }
  }, [selectedProfileId, profiles]);

  const loadProfiles = async () => {
    try {
      const loadedProfiles = await invoke<ConfigProfile[]>('get_profiles');
      setProfiles(loadedProfiles);

      // Select default profile if exists
      const defaultProfile = loadedProfiles.find(p => p.is_default);
      if (defaultProfile) {
        setSelectedProfileId(defaultProfile.id);
      }
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadDefaultDirectory = async () => {
    try {
      const home = await homeDir();
      setWorkingDirectory(home);
    } catch (error) {
      console.error('Failed to get home directory:', error);
    }
  };

  const handleBrowseDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: workingDirectory,
      });
      if (selected && typeof selected === 'string') {
        setWorkingDirectory(selected);
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error);
    }
  };

  const handleCreateTerminal = async () => {
    setIsCreating(true);
    try {
      const label = `Terminal ${terminals.size + 1}`;
      const colorTag = TAG_COLORS[terminals.size % TAG_COLORS.length];

      // Create the terminal
      const terminalId = await createTerminal(
        label,
        workingDirectory,
        claudeArgs,
        {},
        colorTag,
        nickname || undefined
      );

      // Wait a brief moment for terminal to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Auto-run claude command with args
      const claudeCommand = ['claude', ...claudeArgs].join(' ');
      await writeToTerminal(terminalId, claudeCommand + '\r');

      closeNewTerminalModal();
    } catch (error) {
      console.error('Failed to create terminal:', error);
      alert('Failed to create terminal: ' + String(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={closeNewTerminalModal}
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
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-accent-primary" />
            <h2 className="text-text-primary text-lg font-semibold">New Terminal</h2>
          </div>
          <button
            onClick={closeNewTerminalModal}
            className="p-1 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Nickname */}
          <div>
            <label className="block text-text-secondary text-sm mb-1">
              Nickname (for your reference)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., My Project, Backend API, etc."
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50"
            />
          </div>

          {/* Profile Selection */}
          {profiles.length > 0 && (
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Select Profile (optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedProfileId(null)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedProfileId === null
                      ? 'bg-accent-primary/20 border-accent-primary/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-text-primary text-sm font-medium">No Profile</p>
                  <p className="text-text-secondary text-xs">Use custom settings</p>
                </button>
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedProfileId === profile.id
                        ? 'bg-accent-primary/20 border-accent-primary/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-text-primary text-sm font-medium truncate">{profile.name}</p>
                    <p className="text-text-secondary text-xs truncate">
                      {profile.description || profile.working_directory || 'No description'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Working Directory */}
          <div>
            <label className="block text-text-secondary text-sm mb-1">
              Working Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50"
                placeholder="C:\path\to\project"
              />
              <button
                onClick={handleBrowseDirectory}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <FolderOpen size={18} className="text-text-secondary" />
              </button>
            </div>
          </div>

          {/* Claude Arguments */}
          <div>
            <label className="block text-text-secondary text-sm mb-1">
              Claude Arguments (one per line)
            </label>
            <textarea
              value={claudeArgs.join('\n')}
              onChange={(e) => setClaudeArgs(e.target.value.split('\n').filter(Boolean))}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50 font-mono h-20 resize-none"
              placeholder="--dangerously-skip-permissions&#10;--model opus"
            />
            <p className="text-text-secondary text-xs mt-1">
              Terminal will auto-start with: <code className="text-accent-primary">claude {claudeArgs.join(' ')}</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-white/10">
          <button
            onClick={closeNewTerminalModal}
            className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateTerminal}
            disabled={isCreating || !workingDirectory}
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            <Zap size={16} />
            {isCreating ? 'Creating...' : 'Start Terminal'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
