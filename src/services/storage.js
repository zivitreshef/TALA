/**
 * Safe wrapper around browser localStorage to guard against QuotaExceededError,
 * private-mode restrictions, or corrupted JSON payloads.
 */

function getLocalStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

export function safeGetStorageItem(key, fallbackValue = null) {
  if (!key) return fallbackValue;
  try {
    const storage = getLocalStorage();
    if (!storage) {
      return fallbackValue;
    }
    const raw = storage.getItem(key);
    return raw !== null ? raw : fallbackValue;
  } catch (err) {
    console.warn(`[storage] Failed to read key "${key}":`, err);
    return fallbackValue;
  }
}

export function safeSetStorageItem(key, value) {
  if (!key) return false;
  try {
    const storage = getLocalStorage();
    if (!storage) {
      return false;
    }
    storage.setItem(key, String(value ?? ''));
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to write key "${key}" (possible quota limit):`, err);
    return false;
  }
}

export function safeRemoveStorageItem(key) {
  if (!key) return false;
  try {
    const storage = getLocalStorage();
    if (!storage) {
      return false;
    }
    storage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to remove key "${key}":`, err);
    return false;
  }
}

export function safeGetStorageJson(key, fallbackValue = null) {
  const raw = safeGetStorageItem(key, null);
  if (raw === null || raw === '') return fallbackValue;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallbackValue;
  } catch (err) {
    console.warn(`[storage] Corrupted JSON in key "${key}":`, err);
    return fallbackValue;
  }
}

export function safeSetStorageJson(key, value) {
  try {
    return safeSetStorageItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] Failed to serialize JSON for key "${key}":`, err);
    return false;
  }
}

/**
 * Detects whether the current environment is running on Safari, iOS, or iPadOS.
 * Safari limits localStorage to 5MB and enforces aggressive throttling/quota limits,
 * making multi-tab IndexedDB persistence coordination via localStorage prone to b815 crashes.
 */
export function isSafariOrIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return Boolean(isIos || isSafari);
}

/**
 * Checks if localStorage has at least `requiredBytes` (default 50KB) of headroom.
 * Returns false if quota is full or if private browsing locks localStorage.
 */
export function hasLocalStorageQuotaHeadroom(requiredBytes = 50 * 1024) {
  const storage = getLocalStorage();
  if (!storage) return false;
  const probeKey = '__tala_quota_probe__';
  try {
    const probeData = 'X'.repeat(requiredBytes);
    storage.setItem(probeKey, probeData);
    storage.removeItem(probeKey);
    return true;
  } catch {
    try {
      storage.removeItem(probeKey);
    } catch {
      // ignore
    }
    return false;
  }
}

/**
 * Prunes orphaned Firestore/Firebase multi-tab synchronization keys from localStorage.
 * Over time, WebStorageSharedClientState leaves orphaned target/client keys that clog
 * the 5MB Safari storage quota and cause "QuotaExceededError" (ID: b815) assertion crashes.
 * Preserves all application keys (`tala_*`).
 */
export function pruneStaleFirestoreKeys() {
  const storage = getLocalStorage();
  if (!storage) return 0;
  try {
    const keysToRemove = [];
    const len = storage.length || 0;
    for (let i = 0; i < len; i++) {
      const key = storage.key(i);
      if (
        key &&
        (key.startsWith('firestore_') ||
          key.startsWith('firebase:') ||
          key.startsWith('__sak'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        storage.removeItem(k);
      } catch {
        // ignore
      }
    });
    return keysToRemove.length;
  } catch (err) {
    console.warn('[storage] Failed to prune stale firestore keys:', err);
    return 0;
  }
}
