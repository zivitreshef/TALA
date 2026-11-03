import { useState, useEffect, useCallback, useRef } from 'react';
import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';
import { reloadApplication } from './appRefresh';

export interface VersionManifest {
  version: string;
  builtAt?: string;
  [key: string]: unknown;
}

/**
 * Compares two semantic version strings (e.g. "2.6.3" vs "2.6.2").
 * Returns true only if remote is strictly newer than current.
 */
export function isNewerVersion(remote?: string | null, current: string = CURRENT_APP_VERSION): boolean {
  if (!remote || !current) return false;
  if (remote.trim() === current.trim()) return false;

  const parseParts = (v: string): number[] => {
    return v
      .split('.')
      .map((seg) => {
        const num = parseInt(seg, 10);
        return Number.isFinite(num) ? num : 0;
      });
  };

  const rParts = parseParts(remote);
  const cParts = parseParts(current);
  const maxLen = Math.max(rParts.length, cParts.length);

  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] ?? 0;
    const c = cParts[i] ?? 0;
    if (r > c) return true;
    if (r < c) return false;
  }

  return false;
}

/**
 * Fetches the latest published version manifest from the static hosting root.
 * Always bypasses browser cache using cache: 'no-store' and a timestamp param.
 */
export async function fetchLatestVersion(
  url: string = './version.json'
): Promise<VersionManifest | null> {
  try {
    const cacheBuster = `_t=${Date.now()}`;
    const targetUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && typeof data === 'object' && typeof data.version === 'string') {
      return data as VersionManifest;
    }
    return null;
  } catch (_) {
    // Network offline or fetch aborted - fail silent and gracefully
    return null;
  }
}

export interface UseAppVersionCheckOptions {
  currentVersion?: string;
  checkIntervalMs?: number | null;
  initialDelayMs?: number;
  minVisibilityIntervalMs?: number;
  enabled?: boolean;
}

export interface UseAppVersionCheckReturn {
  latestVersion: string | null;
  hasUpdate: boolean;
  dismissed: boolean;
  dismiss: () => void;
  refreshNow: () => void;
  checkNow: () => Promise<void>;
}

const DEFAULT_INITIAL_DELAY_MS = 3 * 1000; // 3 seconds after boot
const DEFAULT_VISIBILITY_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export function useAppVersionCheck({
  currentVersion = CURRENT_APP_VERSION,
  checkIntervalMs = null,
  initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
  minVisibilityIntervalMs = DEFAULT_VISIBILITY_THROTTLE_MS,
  enabled = true
}: UseAppVersionCheckOptions = {}): UseAppVersionCheckReturn {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const lastCheckedAtRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const checkNow = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    lastCheckedAtRef.current = Date.now();

    const manifest = await fetchLatestVersion('./version.json');
    if (!isMountedRef.current || !manifest) return;

    if (isNewerVersion(manifest.version, currentVersion)) {
      setLatestVersion(manifest.version);
      setHasUpdate(true);
    }
  }, [enabled, currentVersion]);

  const dismiss = useCallback((): void => {
    setDismissed(true);
  }, []);

  const refreshNow = useCallback((): void => {
    reloadApplication();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (!enabled) return;

    // 1. Initial delayed check
    const initialTimer = setTimeout(() => {
      checkNow();
    }, initialDelayMs);

    // 2. Periodic interval (only if explicitly configured)
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (checkIntervalMs && checkIntervalMs > 0) {
      intervalId = setInterval(() => {
        checkNow();
      }, checkIntervalMs);
    }

    // 3. Visibility check when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsedSinceLastCheck = Date.now() - lastCheckedAtRef.current;
        if (elapsedSinceLastCheck >= minVisibilityIntervalMs) {
          checkNow();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, checkNow, initialDelayMs, checkIntervalMs, minVisibilityIntervalMs]);

  return {
    latestVersion,
    hasUpdate,
    dismissed,
    dismiss,
    refreshNow,
    checkNow
  };
}
