import { useState, useEffect, useRef } from 'react';

export interface OnlineStatusState {
  isOnline: boolean;
  justReconnected: boolean;
}

export function useOnlineStatus(): OnlineStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const wasOfflineRef = useRef<boolean>(!isOnline);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = (): void => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setJustReconnected(true);
        wasOfflineRef.current = false;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setJustReconnected(false);
          reconnectTimeoutRef.current = null;
        }, 4500);
      }
    };

    const handleOffline = (): void => {
      wasOfflineRef.current = true;
      setIsOnline(false);
      setJustReconnected(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { isOnline, justReconnected };
}
