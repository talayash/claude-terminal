import { useEffect, useRef, useCallback } from 'react';

export function useNotification() {
  const isFocused = useRef(true);

  useEffect(() => {
    const onFocus = () => { isFocused.current = true; };
    const onBlur = () => { isFocused.current = false; };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const notify = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted' && !isFocused.current) {
      new Notification(title, { body });
    }
  }, []);

  return { requestPermission, notify };
}
