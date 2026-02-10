import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useNotification() {
  const notify = useCallback(async (title: string, body: string) => {
    try {
      await invoke('send_notification', { title, body });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  }, []);

  return { notify };
}
