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

// Lightweight public IP detection with quick timeout and local fallback
export async function getClientIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) return data.ip;
    }
  } catch (e) {
    // Fallback if offline or blocked by ad-blocker
  }
  return 'IP לא זמין / רשת מקומית';
}

/**
 * Checks whether an active session is currently running on another host or tab.
 */
export async function checkActiveSession(email, currentSessionId) {
  const key = sessionDocKey(email);
  const clientIp = await getClientIp();
  const db = getFirestoreDb();

  if (db) {
    try {
      const sessionRef = doc(db, 'tala_sessions', key);
      const snap = await getDoc(sessionRef);

      if (snap.exists()) {
        const data = snap.data();
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
              ipAddress: data.ipAddress || 'לא ידועה',
              lastActiveIso: data.lastActiveIso || new Date(lastActiveTime).toISOString(),
              userAgent: data.userAgent || ''
            }
          };
        }
      }
    } catch (err) {
      console.warn('Firestore active session check warning:', err);
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
  const ip = clientIp || await getClientIp();
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

  // Sync to Firestore
  const db = getFirestoreDb();
  if (db) {
    try {
      await setDoc(doc(db, 'tala_sessions', key), payload, { merge: true });
      await recordUserPresence({ email, sessionId, ipAddress: ip });
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
    const local = localStorage.getItem(`tala_active_session_${key}`);
    if (local) {
      const data = JSON.parse(local);
      if (data.sessionId === sessionId) {
        localStorage.removeItem(`tala_active_session_${key}`);
      }
    }
  } catch (e) {}

  const db = getFirestoreDb();
  if (db) {
    try {
      const sessionRef = doc(db, 'tala_sessions', key);
      const snap = await getDoc(sessionRef);
      if (snap.exists() && snap.data().sessionId === sessionId) {
        await updateDoc(sessionRef, { sessionId: null, lastActiveMs: 0 });
      }
    } catch (e) {}
  }
}
