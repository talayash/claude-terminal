import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';

export interface TerminalConfig {
  id: string;
  label: string;
  profile_id: string | null;
  working_directory: string;
  claude_args: string[];
  env_vars: Record<string, string>;
  created_at: string;
  status: 'Running' | 'Idle' | 'Error' | 'Stopped';
  color_tag: string | null;
}

interface TerminalInstance {
  config: TerminalConfig;
  xterm: Terminal | null;
}

interface TerminalState {
  terminals: Map<string, TerminalInstance>;
  activeTerminalId: string | null;

  createTerminal: (
    label: string,
    workingDirectory: string,
    claudeArgs: string[],
    envVars: Record<string, string>,
    colorTag?: string
  ) => Promise<string>;
  closeTerminal: (id: string) => Promise<void>;
  setActiveTerminal: (id: string) => void;
  updateLabel: (id: string, label: string) => Promise<void>;
  writeToTerminal: (id: string, data: string) => Promise<void>;
  resizeTerminal: (id: string, cols: number, rows: number) => Promise<void>;
  setXterm: (id: string, xterm: Terminal) => void;
  handleTerminalOutput: (id: string, data: Uint8Array) => void;
  getTerminalList: () => TerminalConfig[];
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: new Map(),
  activeTerminalId: null,

  createTerminal: async (label, workingDirectory, claudeArgs, envVars, colorTag) => {
    try {
      console.log('Creating terminal with:', { label, workingDirectory, claudeArgs, envVars, colorTag });
      const config = await invoke<TerminalConfig>('create_terminal', {
        request: {
          label,
          working_directory: workingDirectory,
          claude_args: claudeArgs,
          env_vars: envVars,
          color_tag: colorTag || null,
        },
      });
      console.log('Terminal created:', config);

      set((state) => {
        const newTerminals = new Map(state.terminals);
        newTerminals.set(config.id, { config, xterm: null });
        return {
          terminals: newTerminals,
          activeTerminalId: config.id,
        };
      });

      return config.id;
    } catch (error) {
      console.error('Failed to create terminal:', error);
      throw error;
    }
  },

  closeTerminal: async (id) => {
    await invoke('close_terminal', { id });

    set((state) => {
      const newTerminals = new Map(state.terminals);
      const instance = newTerminals.get(id);
      if (instance?.xterm) {
        instance.xterm.dispose();
      }
      newTerminals.delete(id);

      const remainingIds = Array.from(newTerminals.keys());
      return {
        terminals: newTerminals,
        activeTerminalId: state.activeTerminalId === id
          ? (remainingIds[0] || null)
          : state.activeTerminalId,
      };
    });
  },

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  updateLabel: async (id, label) => {
    await invoke('update_terminal_label', { id, label });

    set((state) => {
      const newTerminals = new Map(state.terminals);
      const instance = newTerminals.get(id);
      if (instance) {
        instance.config.label = label;
      }
      return { terminals: newTerminals };
    });
  },

  writeToTerminal: async (id, data) => {
    const encoder = new TextEncoder();
    await invoke('write_to_terminal', { id, data: Array.from(encoder.encode(data)) });
  },

  resizeTerminal: async (id, cols, rows) => {
    await invoke('resize_terminal', { id, cols, rows });
  },

  setXterm: (id, xterm) => {
    set((state) => {
      const newTerminals = new Map(state.terminals);
      const instance = newTerminals.get(id);
      if (instance) {
        instance.xterm = xterm;
      }
      return { terminals: newTerminals };
    });
  },

  handleTerminalOutput: (id, data) => {
    const { terminals } = get();
    const instance = terminals.get(id);
    if (instance?.xterm) {
      instance.xterm.write(data);
    }
  },

  getTerminalList: () => {
    const { terminals } = get();
    return Array.from(terminals.values()).map((t) => t.config);
  },
}));
