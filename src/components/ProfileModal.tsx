import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { v4 as uuidv4 } from 'uuid';

interface ConfigProfile {
  id: string;
  name: string;
  description: string | null;
  working_directory: string;
  claude_args: string[];
  env_vars: Record<string, string>;
  is_default: boolean;
}

export function ProfileModal() {
  const { closeProfileModal, editingProfileId } = useAppStore();
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ConfigProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (editingProfileId && profiles.length > 0) {
      const profile = profiles.find(p => p.id === editingProfileId);
      if (profile) setSelectedProfile(profile);
    }
  }, [editingProfileId, profiles]);

  const loadProfiles = async () => {
    const loadedProfiles = await invoke<ConfigProfile[]>('get_profiles');
    setProfiles(loadedProfiles);
  };

  const handleCreateProfile = () => {
    setIsCreating(true);
    setSelectedProfile({
      id: uuidv4(),
      name: 'New Profile',
      description: '',
      working_directory: '',
      claude_args: [],
      env_vars: {},
      is_default: false,
    });
  };

  const handleSaveProfile = async () => {
    if (!selectedProfile) return;
    await invoke('save_profile', { profile: selectedProfile });
    await loadProfiles();
    setIsCreating(false);
  };

  const handleDeleteProfile = async (id: string) => {
    await invoke('delete_profile', { id });
    await loadProfiles();
    if (selectedProfile?.id === id) {
      setSelectedProfile(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={closeProfileModal}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-elevated border border-white/10 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-text-primary text-lg font-semibold">Configuration Profiles</h2>
          <button
            onClick={closeProfileModal}
            className="p-1 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[500px]">
          {/* Profile List */}
          <div className="w-64 border-r border-white/10 p-3 flex flex-col">
            <button
              onClick={handleCreateProfile}
              className="flex items-center gap-2 w-full bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-3 rounded-lg text-sm font-medium mb-3"
            >
              <Plus size={16} />
              New Profile
            </button>

            <div className="flex-1 overflow-y-auto space-y-1">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => {
                    setSelectedProfile(profile);
                    setIsCreating(false);
                  }}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedProfile?.id === profile.id
                      ? 'bg-accent-primary/20 border border-accent-primary/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <p className="text-text-primary text-sm font-medium truncate">{profile.name}</p>
                  <p className="text-text-secondary text-xs truncate">{profile.description || 'No description'}</p>
                </div>
              ))}

              {profiles.length === 0 && (
                <p className="text-text-secondary text-sm text-center py-4">
                  No profiles yet
                </p>
              )}
            </div>
          </div>

          {/* Profile Editor */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedProfile.name}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-sm mb-1">Description</label>
                  <input
                    type="text"
                    value={selectedProfile.description || ''}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-sm mb-1">Working Directory</label>
                  <input
                    type="text"
                    value={selectedProfile.working_directory}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, working_directory: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50"
                    placeholder="C:\path\to\project"
                  />
                </div>

                <div>
                  <label className="block text-text-secondary text-sm mb-1">Claude Arguments (one per line)</label>
                  <textarea
                    value={selectedProfile.claude_args.join('\n')}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, claude_args: e.target.value.split('\n').filter(Boolean) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-text-primary text-sm focus:outline-none focus:border-accent-primary/50 font-mono h-24 resize-none"
                    placeholder="--model opus&#10;--verbose"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={selectedProfile.is_default}
                    onChange={(e) => setSelectedProfile({ ...selectedProfile, is_default: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-accent-primary focus:ring-accent-primary"
                  />
                  <label htmlFor="is_default" className="text-text-primary text-sm">Set as default profile</label>
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white py-2 px-4 rounded-lg text-sm font-medium"
                  >
                    <Save size={16} />
                    Save Profile
                  </motion.button>

                  {!isCreating && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDeleteProfile(selectedProfile.id)}
                      className="flex items-center gap-2 bg-error/20 hover:bg-error/30 text-error py-2 px-4 rounded-lg text-sm font-medium"
                    >
                      <Trash2 size={16} />
                      Delete
                    </motion.button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary">
                Select a profile or create a new one
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
