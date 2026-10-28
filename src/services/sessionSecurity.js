import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb, recordUserPresence } from '../firebaseBackend';

export const SESSION_INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

export function sessionDocKey(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_');
}

export function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

let cachedClientIp = null;
let clientIpPromise = null;

export function setCachedClientIp(ip) {
  if (ip && typeof ip === 'string' && !ip.startsWith('IP לא זמין')) {
    cachedClientIp = ip.trim();
  }
}

// Lightweight public IP detection with quick timeout, in-memory caching and local fallback
export async function getClientIp() {
  if (cachedClientIp) return cachedClientIp;
  if (clientIpPromise) return clientIpPromise;

  clientIpPromise = (async () => {
    let timer = null;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (controller) {
        timer = setTimeout(() => {
          try {
            controller.abort();
          } catch (_) {}
        }, 1200);
      }
      const res = await fetch('https://api.ipify.org?format=json', {
        signal: controller ? controller.signal : undefined
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          cachedClientIp = data.ip;
          return data.ip;
        }
      }
    } catch (e) {
      // Fallback if offline, ad-blocker, or unsupported
    } finally {
      if (timer) clearTimeout(timer);
      clientIpPromise = null;
    }
    return 'IP לא זמין / רשת מקומית';
  })();

  return clientIpPromise;
}

/**
 * Checks whether an active session is currently running on another host or tab.
 */
export async function checkActiveSession(email, currentSessionId, knownClientIp) {
  if (knownClientIp) {
    setCachedClientIp(knownClientIp);
  }
  const key = sessionDocKey(email);
  const db = getFirestoreDb();

  // If client IP is already known, resolve immediately without calling external ipify
  const ipPromise = knownClientIp ? Promise.resolve(knownClientIp) : getClientIp();

  const [clientIp, snap] = await Promise.all([
    ipPromise,
    db
      ? getDoc(doc(db, 'tala_sessions', key)).catch((err) => {
          console.warn('Firestore active session check warning:', err);
          return null;
        })
      : Promise.resolve(null)
  ]);

  if (snap && snap.exists()) {
    const data = snap.data();
    const now = Date.now();
    const lastActiveTime = data.lastActiveIso
      ? new Date(data.lastActiveIso).getTime()
      : data.lastActiveMs || 0;
    const isStillActive = (now - lastActiveTime) < SESSION_INACTIVITY_LIMIT_MS;

    if (isStillActive && data.sessionId && data.sessionId !== currentSessionId) {
      // If the active session is from the exact same client IP, allow seamless re-login
      const isSameIp = Boolean(
        clientIp &&
        data.ipAddress &&
        data.ipAddress !== 'IP לא זמין / רשת מקומית' &&
        data.ipAddress !== 'לא ידועה' &&
        data.ipAddress === clientIp
      );

      if (!isSameIp) {
        return {
          takeoverRequired: true,
          clientIp,
          existingSession: {
            sessionId: data.sessionId,
            ipAddress: data.ipAddress || 'לא ידועה',
            lastActiveIso: data.lastActiveIso || new Date(lastActiveTime).toISOString(),
            userAgent: data.userAgent || ''
          }
        };
      }
    }
  }

  // Local storage simulation fallback (cross-tab testing on same machine)
  try {
    const local = localStorage.getItem(`tala_active_session_${key}`);
    if (local) {
      const data = JSON.parse(local);
      const now = Date.now();
      const lastActiveTime = data.lastActiveIso
        ? new Date(data.lastActiveIso).getTime()
        : data.lastActiveMs || 0;
      const isStillActive = (now - lastActiveTime) < SESSION_INACTIVITY_LIMIT_MS;

      if (isStillActive && data.sessionId && data.sessionId !== currentSessionId) {
        return {
          takeoverRequired: true,
          clientIp,
          existingSession: {
            sessionId: data.sessionId,
            ipAddress: data.ipAddress || 'טאב/חלון אחר',
            lastActiveIso: data.lastActiveIso || new Date(lastActiveTime).toISOString()
          }
        };
      }
    }
  } catch (e) {}

  return { takeoverRequired: false, clientIp };
}

/**
 * Activates a new session, overwriting any previous host session.
 */
export async function activateSession(email, sessionId, clientIp) {
  const key = sessionDocKey(email);
  const ip = clientIp || cachedClientIp || 'IP לא זמין / רשת מקומית';
  const nowIso = new Date().toISOString();

  const payload = {
    email: email.trim().toLowerCase(),
    sessionId,
    ipAddress: ip,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    loginAtIso: nowIso,
    lastActiveIso: nowIso,
    lastActiveMs: Date.now()
  };

  // Sync to local storage & broadcast channel
  try {
    localStorage.setItem(`tala_active_session_${key}`, JSON.stringify(payload));
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(`tala_session_${key}`);
      ch.postMessage({ type: 'NEW_SESSION_ACTIVATED', ...payload });
      ch.close();
    }
  } catch (e) {}

  // Sync to Firestore (record presence in background, await session doc write)
  const db = getFirestoreDb();
  if (db) {
    try {
      recordUserPresence({ email, sessionId, ipAddress: ip }).catch(() => {});
      await setDoc(doc(db, 'tala_sessions', key), payload, { merge: true });
    } catch (err) {
      console.warn('Failed to record session activation in Firestore:', err);
    }
  }

  return payload;
}

/**
 * Listens for real-time eviction when another device takes over this user's session.
 */
export function subscribeToSession(email, sessionId, onEvicted) {
  if (!email || !sessionId) return () => {};
  const key = sessionDocKey(email);

  // 1. BroadcastChannel (immediate cross-tab eviction)
  let channel = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(`tala_session_${key}`);
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_SESSION_ACTIVATED') {
          if (event.data.sessionId && event.data.sessionId !== sessionId) {
            onEvicted?.({
              newIp: event.data.ipAddress || 'מכשיר אחר',
              evictedAt: event.data.lastActiveIso || new Date().toISOString()
            });
          }
        }
      };
    } catch (e) {}
  }

  // 2. Storage event (cross-tab fallback)
  const handleStorage = (e) => {
    if (e.key === `tala_active_session_${key}` && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.sessionId && data.sessionId !== sessionId) {
          onEvicted?.({
            newIp: data.ipAddress || 'מכשיר אחר',
            evictedAt: data.lastActiveIso || new Date().toISOString()
          });
        }
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Firestore onSnapshot (cross-host / cross-network real-time eviction)
  let unsubFirestore = () => {};
  const db = getFirestoreDb();
  if (db) {
    try {
      const sessionRef = doc(db, 'tala_sessions', key);
      unsubFirestore = onSnapshot(sessionRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.sessionId && data.sessionId !== sessionId) {
            onEvicted?.({
              newIp: data.ipAddress || 'מכשיר אחר',
              evictedAt: data.lastActiveIso || new Date().toISOString()
            });
          }
        }
      }, (err) => {
        console.warn('Firestore session listener warning:', err);
      });
    } catch (e) {}
  }

  return () => {
    if (channel) channel.close();
    window.removeEventListener('storage', handleStorage);
    unsubFirestore();
  };
}

/**
 * Periodically updates the active heartbeat so the session remains fresh.
 */
export async function sendSessionHeartbeat(email, sessionId) {
  if (!email || !sessionId) return;
  const key = sessionDocKey(email);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  try {
    const local = localStorage.getItem(`tala_active_session_${key}`);
    if (local) {
      const data = JSON.parse(local);
      if (data.sessionId === sessionId) {
        data.lastActiveIso = nowIso;
        data.lastActiveMs = nowMs;
        localStorage.setItem(`tala_active_session_${key}`, JSON.stringify(data));
      }
    }
  } catch (e) {}

  const db = getFirestoreDb();
  if (db) {
    try {
      await updateDoc(doc(db, 'tala_sessions', key), {
        lastActiveIso: nowIso,
        lastActiveMs: nowMs
      });
      await recordUserPresence({ email, sessionId });
    } catch (e) {}
  }
}

/**
 * Clears active session upon manual user logout.
 */
export async function clearSession(email, sessionId) {
  if (!email) return;
  const key = sessionDocKey(email);
  try {
    localStorage.removeItem(`tala_active_session_${key}`);
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(`tala_session_${key}`);
      ch.postMessage({ type: 'SESSION_CLEARED', email, sessionId });
      ch.close();
    }
  } catch (e) {}

  const db = getFirestoreDb();
  if (db) {
    try {
      const sessionRef = doc(db, 'tala_sessions', key);
      await setDoc(
        sessionRef,
        {
          sessionId: null,
          lastActiveMs: 0,
          lastActiveIso: null,
          ipAddress: null
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to clear session in Firestore:', e);
    }
  }
}
