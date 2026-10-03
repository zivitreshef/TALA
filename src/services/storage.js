/**
 * Safe wrapper around browser localStorage to guard against QuotaExceededError,
 * private-mode restrictions, or corrupted JSON payloads.
 */

export function safeGetStorageItem(key, fallbackValue = null) {
  if (!key) return fallbackValue;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallbackValue;
    }
    const raw = window.localStorage.getItem(key);
    return raw !== null ? raw : fallbackValue;
  } catch (err) {
    console.warn(`[storage] Failed to read key "${key}":`, err);
    return fallbackValue;
  }
}

export function safeSetStorageItem(key, value) {
  if (!key) return false;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    window.localStorage.setItem(key, String(value ?? ''));
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to write key "${key}" (possible quota limit):`, err);
    return false;
  }
}

export function safeRemoveStorageItem(key) {
  if (!key) return false;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    window.localStorage.removeItem(key);
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
