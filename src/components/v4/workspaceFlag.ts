export const V4_WORKSPACE_STORAGE_KEY = 'tala_v4_workspace_enabled';

/**
 * Reads whether the v4.0.0 simplified teacher workspace is active.
 * Defaults to true in v4.0.0; can be toggled off per-browser to instantly
 * restore the classic 3.0.96 experience with zero data loss.
 */
export function readV4WorkspaceEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return true;
    }
    const raw = window.localStorage.getItem(V4_WORKSPACE_STORAGE_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function writeV4WorkspaceEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(V4_WORKSPACE_STORAGE_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // Ignore storage quota or private-mode errors
  }
}
