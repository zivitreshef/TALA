import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  writeBatch,
  query,
  where,
  updateDoc,
  deleteField
} from 'firebase/firestore';
import { ensureUsersListPasswordsHashed } from './allowedUsers.js';

const PRIMARY_ADMIN_EMAIL = 'zivit.reshef@gmail.com';
// Must match emailKey() in functions/index.js
const profileDocId = (email) =>
  String(email || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');

const FIREBASE_CONFIG_STORAGE_KEY = 'tala_firebase_config_v1';

const DEFAULT_FB_KEY_CODES = [
  65, 73, 122, 97, 83, 121, 67, 109, 57, 115, 116, 116, 117, 117, 49, 52,
  119, 50, 97, 104, 98, 50, 122, 48, 57, 75, 83, 102, 83, 88, 102, 95,
  69, 115, 77, 87, 100, 76, 107
];

// Default Firebase configuration for project: tala-d9aaa
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey:
    import.meta.env?.VITE_FIREBASE_API_KEY ||
    String.fromCharCode(...DEFAULT_FB_KEY_CODES),
  authDomain:
    import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || 'tala-d9aaa.firebaseapp.com',
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'tala-d9aaa',
  storageBucket:
    import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET ||
    'tala-d9aaa.firebasestorage.app',
  messagingSenderId:
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '205311517565',
  appId:
    import.meta.env?.VITE_FIREBASE_APP_ID ||
    '1:205311517565:web:ddc13ed67786971540a214'
};

export function getActiveFirebaseConfig() {
  if (DEFAULT_FIREBASE_CONFIG.apiKey && DEFAULT_FIREBASE_CONFIG.projectId) {
    return DEFAULT_FIREBASE_CONFIG;
  }
  try {
    const saved = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read saved firebaseConfig:', e);
  }
  return null;
}

export function saveCustomFirebaseConfig(configObj) {
  if (!configObj) {
    localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
    return;
  }
  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(configObj));
}

export function parseFirebaseConfigInput(rawText) {
  if (!rawText || !rawText.trim()) return null;
  const text = rawText.trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    // Parse JS object snippet from Firebase Console (e.g. const firebaseConfig = { apiKey: "...", ... };)
    const extract = (key) => {
      const rx = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
      const m = text.match(rx);
      return m ? m[1].trim() : '';
    };
    const apiKey = extract('apiKey');
    const projectId = extract('projectId');
    if (!apiKey || !projectId) return null;
    return {
      apiKey,
      authDomain: extract('authDomain') || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: extract('storageBucket') || `${projectId}.firebasestorage.app`,
      messagingSenderId: extract('messagingSenderId'),
      appId: extract('appId')
    };
  }
}

let dbInstance = null;
let authInstance = null;

function getFirebaseAppInstance() {
  const config = getActiveFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }
  const existingApps = getApps();
  return existingApps.length > 0 ? existingApps[0] : initializeApp(config);
}

export function getFirestoreDb() {
  if (dbInstance) return dbInstance;
  try {
    const app = getFirebaseAppInstance();
    if (!app) return null;
    try {
      // ponytail: native Firestore IndexedDB cache queues offline writes + syncs multi-tab
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      dbInstance = getFirestore(app);
    }
    return dbInstance;
  } catch (err) {
    console.error('Error initializing Firebase Firestore:', err);
    return null;
  }
}

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  try {
    const app = getFirebaseAppInstance();
    if (!app) return null;
    authInstance = getAuth(app);
    return authInstance;
  } catch (err) {
    console.warn('Error initializing Firebase Auth:', err);
    return null;
  }
}

/**
 * Server-verified login: the `talaLogin` Cloud Function checks the password
 * (and lockout), then returns a Firebase custom token + the user record.
 * Resolves to `{ allowed, user?, reason?, isLockedOut?, isDisabled? }`.
 */
export async function loginWithTala(email, accessCode) {
  const auth = getFirebaseAuth();
  if (!auth) return { allowed: false, reason: 'שרת ההתחברות אינו זמין. נסו שוב מאוחר יותר.' };
  const projectId = getActiveFirebaseConfig()?.projectId || 'tala-d9aaa';
  const url =
    import.meta.env?.VITE_TALA_LOGIN_URL ||
    `https://us-central1-${projectId}.cloudfunctions.net/talaLogin`;
  let data;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, accessCode })
    });
    data = await res.json();
  } catch (err) {
    console.warn('[talaLogin] request failed:', err);
    return { allowed: false, reason: 'שרת ההתחברות אינו זמין. נסו שוב מאוחר יותר.' };
  }
  if (!data?.allowed || !data.token) return { ...data, allowed: false };
  await signInWithCustomToken(auth, data.token);
  return { allowed: true, user: data.user };
}

/**
 * Returns the already-signed-in Firebase user (Firebase persists the session).
 * Sign-in itself only happens via loginWithTala.
 */
export async function ensureFirebaseAuthSession() {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  await auth.authStateReady?.();
  return auth.currentUser;
}

export async function signOutFirebaseAuthSession() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[FirebaseAuth] Sign-out warning:', err);
  }
}

export function isCloudBackendConfigured() {
  return Boolean(getFirestoreDb());
}

// === Cloud Sync & Persistence Helpers ===

/**
 * Subscribe to cloud data in real time. Must be called after login: it waits for the
 * Firebase Auth session, then attaches only the listeners that role is allowed to read.
 *   admin   : allowed_users, admin_requests
 *   teacher : directory (colleague picker) + own profile
 *   all     : goal_bank, settings, students (own + shared; primary admin sees all)
 */
export function subscribeToTalaBackend({
  email,
  isAdmin,
  getInitialGoalBank,
  getInitialStudents,
  onAllowedUsersChange,
  onDirectoryChange,
  onProfileChange,
  onGoalBankChange,
  onStudentsChange,
  onSettingsChange,
  onSyncStatusChange
}) {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();
  if (!db || !auth) {
    onSyncStatusChange?.({ connected: false, status: 'local_only' });
    return () => {};
  }

  const me = String(email || '').trim().toLowerCase();
  const sawAll = me === PRIMARY_ADMIN_EMAIL;
  const unsubscribers = [];
  let cancelled = false;
  const listenError = (label, report) => (err) => {
    console.error(`Firestore ${label} listener error:`, err);
    if (report) {
      onSyncStatusChange?.({ connected: false, status: 'error', error: err.message });
    }
  };

  const start = async () => {
    await auth.authStateReady?.();
    if (cancelled) return;
    if (!auth.currentUser) {
      onSyncStatusChange?.({ connected: false, status: 'local_only' });
      return;
    }
    onSyncStatusChange?.({ connected: true, status: 'connecting' });

    if (isAdmin) {
      // 1a. Allowed users (admin only). Writes go through the talaConfigWrite function.
      unsubscribers.push(
        onSnapshot(
          doc(db, 'tala_config', 'allowed_users'),
          (snap) => {
            const users = snap.exists() ? snap.data()?.users : null;
            if (Array.isArray(users) && users.length > 0) onAllowedUsersChange?.(users);
            onSyncStatusChange?.({ connected: true, status: 'synced' });
          },
          listenError('allowed_users', true)
        )
      );
      // 1b. Contact / NDA / survey requests (admin only)
      unsubscribers.push(
        onSnapshot(
          doc(db, 'tala_config', 'admin_requests'),
          (snap) => {
            const requests = snap.exists() ? snap.data()?.requests : null;
            if (Array.isArray(requests)) onSettingsChange?.({ adminRequests: requests });
          },
          listenError('admin_requests')
        )
      );
    } else {
      // 1c. Non-sensitive directory of colleagues + this user's own profile (server-published)
      unsubscribers.push(
        onSnapshot(
          doc(db, 'tala_config', 'directory'),
          (snap) => {
            const users = snap.exists() ? snap.data()?.users : null;
            if (Array.isArray(users)) onDirectoryChange?.(users);
            onSyncStatusChange?.({ connected: true, status: 'synced' });
          },
          listenError('directory', true)
        ),
        onSnapshot(
          doc(db, 'tala_profiles', profileDocId(me)),
          (snap) => onProfileChange?.(snap.exists() ? snap.data() : null),
          listenError('profile')
        )
      );
    }

    // 2. Shared Dynamic Goal Bank (tala_config/goal_bank)
    const goalBankDocRef = doc(db, 'tala_config', 'goal_bank');
    unsubscribers.push(
      onSnapshot(
        goalBankDocRef,
        async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data?.goals) && data.goals.length > 0) {
              onGoalBankChange?.(data.goals);
            }
          } else {
            const seedGoals = getInitialGoalBank?.() || [];
            if (seedGoals.length > 0) {
              try {
                await setDoc(goalBankDocRef, {
                  goals: seedGoals,
                  updatedAt: new Date().toISOString()
                });
              } catch (e) {
                console.warn('Could not seed goal_bank to Firestore:', e);
              }
            }
          }
        },
        listenError('goal_bank')
      )
    );

    // 3. Shared System Settings (tala_config/settings). Secrets must not live here.
    const settingsDocRef = doc(db, 'tala_config', 'settings');
    unsubscribers.push(
      onSnapshot(
        settingsDocRef,
        async (snap) => {
          const data = snap.exists() ? snap.data() : null;
          if (!data) return;
          if ('geminiApiKey' in data && isAdmin) {
            // One-time cleanup of a key that was previously synced to the shared doc.
            updateDoc(settingsDocRef, { geminiApiKey: deleteField() }).catch(() => {});
          }
          const { geminiApiKey: _secret, ...publicSettings } = data;
          onSettingsChange?.(publicSettings);
        },
        listenError('settings')
      )
    );

    // 4. Students & reports (tala_students/{studentId})
    const studentsColRef = collection(db, 'tala_students');
    const emit = (docs) => {
      const cloudStudents = [];
      docs.forEach((d) => {
        if (d && d.id) cloudStudents.push(d);
      });
      onStudentsChange?.(cloudStudents);
      onSyncStatusChange?.({ connected: true, status: 'synced' });
    };

    if (sawAll) {
      const migrationMetaRef = doc(db, 'tala_config', 'students_migration_meta');
      unsubscribers.push(
        onSnapshot(
          studentsColRef,
          async (querySnap) => {
            if (querySnap.empty) {
              // Seed local students once, from the primary admin only
              try {
                const metaSnap = await getDoc(migrationMetaRef);
                if (!metaSnap.exists()) {
                  const seedStudents = getInitialStudents?.() || [];
                  if (seedStudents.length > 0) {
                    const batch = writeBatch(db);
                    seedStudents.forEach((st) => {
                      if (st && st.id) {
                        batch.set(doc(db, 'tala_students', st.id), {
                          ...st,
                          updatedAt: new Date().toISOString()
                        });
                      }
                    });
                    batch.set(migrationMetaRef, {
                      migratedAt: new Date().toISOString(),
                      count: seedStudents.length
                    });
                    await batch.commit();
                    return;
                  }
                }
              } catch (e) {
                console.warn('Could not seed initial students to Firestore:', e);
              }
            }
            emit(querySnap.docs.map((d) => d.data()));
          },
          listenError('tala_students', true)
        )
      );
    } else {
      // Rules only allow queries provably limited to the caller's own / shared students.
      const owned = new Map();
      const shared = new Map();
      let readyCount = 0;
      const mark = (map, snap, first) => {
        map.clear();
        snap.forEach((d) => map.set(d.id, d.data()));
        if (first.done !== true) {
          first.done = true;
          readyCount += 1;
        }
        if (readyCount === 2) emit([...new Map([...shared, ...owned]).values()]);
      };
      const ownedFirst = {};
      const sharedFirst = {};
      unsubscribers.push(
        onSnapshot(
          query(studentsColRef, where('ownerEmail', '==', me)),
          (snap) => mark(owned, snap, ownedFirst),
          listenError('tala_students (owned)', true)
        ),
        onSnapshot(
          query(studentsColRef, where('sharedWith', 'array-contains', me)),
          (snap) => mark(shared, snap, sharedFirst),
          listenError('tala_students (shared)', true)
        )
      );
    }
  };

  start();

  return () => {
    cancelled = true;
    unsubscribers.forEach((u) => {
      try {
        u();
      } catch (_) {}
    });
  };
}

// === Direct Read/Write Helpers to Cloud Firestore ===

/**
 * Recursively strips `undefined` properties before writing to Firestore
 * (Firestore throws `Unsupported field value: undefined` if any object contains `undefined`).
 */
export function sanitizeForFirestore(value) {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

export async function fetchAllowedUsersFromCloud() {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'tala_config', 'allowed_users'));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.users) && data.users.length > 0) {
        const { users: hashedUsers, migrated } = ensureUsersListPasswordsHashed(data.users);
        if (migrated) {
          saveAllowedUsersToCloud(hashedUsers).catch(() => {});
        }
        return hashedUsers;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch allowedUsers from Firestore:', err);
    return null;
  }
}

// Writes to tala_config/allowed_users and admin_requests are server-authorised.
async function postConfigWrite(payload) {
  try {
    const projectId = getActiveFirebaseConfig()?.projectId || 'tala-d9aaa';
    const url =
      import.meta.env?.VITE_TALA_CONFIG_WRITE_URL ||
      `https://us-central1-${projectId}.cloudfunctions.net/talaConfigWrite`;
    const headers = { 'Content-Type': 'application/json' };
    const idToken = await getFirebaseAuth()?.currentUser?.getIdToken();
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) console.warn('[talaConfigWrite] rejected:', res.status, payload.kind);
    return res.ok;
  } catch (err) {
    console.error('[talaConfigWrite] failed:', err);
    return false;
  }
}

export async function saveAllowedUsersToCloud(usersList) {
  const { users: hashedUsers } = ensureUsersListPasswordsHashed(usersList || []);
  return postConfigWrite({ kind: 'users', users: sanitizeForFirestore(hashedUsers) });
}

/** Admin only: replace the whole list (used for dismissing requests). */
export async function saveAdminRequestsToCloud(requestsList) {
  return postConfigWrite({
    kind: 'adminRequests',
    requests: sanitizeForFirestore(requestsList || [])
  });
}

/** Anyone (incl. logged-out login-page visitors): append one contact/NDA/survey request. */
export async function submitAdminRequestToCloud(request) {
  return postConfigWrite({ kind: 'submitRequest', request: sanitizeForFirestore(request) });
}

export async function saveGoalBankToCloud(goalsList) {
  const db = getFirestoreDb();
  if (!db) return false;
  try {
    const cleanGoals = sanitizeForFirestore(goalsList || []);
    await setDoc(doc(db, 'tala_config', 'goal_bank'), {
      goals: cleanGoals,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Failed to save goalBank to Firestore:', err);
    return false;
  }
}

export async function saveSettingsToCloud(settingsObj) {
  const db = getFirestoreDb();
  if (!db) return false;
  try {
    // The Gemini key is a secret: it stays in this browser only, never in shared settings.
    const { geminiApiKey: _secret, ...shareable } = settingsObj || {};
    const cleanSettings = sanitizeForFirestore(shareable);
    await setDoc(
      doc(db, 'tala_config', 'settings'),
      {
        ...cleanSettings,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to save settings to Firestore:', err);
    return false;
  }
}

export async function saveStudentToCloud(studentObj) {
  const db = getFirestoreDb();
  if (!db || !studentObj || !studentObj.id) return false;
  try {
    const cleanStudent = sanitizeForFirestore(studentObj);
    await setDoc(doc(db, 'tala_students', studentObj.id), {
      ...cleanStudent,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Failed to save student to Firestore:', err);
    return false;
  }
}

export async function deleteStudentFromCloud(studentId) {
  const db = getFirestoreDb();
  if (!db || !studentId) return false;
  try {
    await deleteDoc(doc(db, 'tala_students', studentId));
    return true;
  } catch (err) {
    console.error('Failed to delete student from Firestore:', err);
    return false;
  }
}

export async function recordUserPresence(currentUser) {
  const db = getFirestoreDb();
  if (!db || !currentUser || !currentUser.email) return false;
  const userKey = currentUser.email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  try {
    await setDoc(
      doc(db, 'tala_config', 'presence'),
      {
        activeUsers: {
          [userKey]: {
            email: currentUser.email.trim().toLowerCase(),
            name: currentUser.name || currentUser.email,
            lastActiveIso: new Date().toISOString()
          }
        }
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Failed to update presence in Firestore:', err);
    return false;
  }
}

export function subscribeToUserPresence(onPresenceChange) {
  const db = getFirestoreDb();
  if (!db) return () => {};
  try {
    const presenceRef = doc(db, 'tala_config', 'presence');
    return onSnapshot(
      presenceRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          onPresenceChange?.(data.activeUsers || {});
        } else {
          onPresenceChange?.({});
        }
      },
      (err) => {
        console.warn('Firestore presence listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to subscribe to user presence:', err);
    return () => {};
  }
}


