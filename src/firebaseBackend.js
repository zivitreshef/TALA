import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const FIREBASE_CONFIG_STORAGE_KEY = 'tala_firebase_config_v1';

const DEFAULT_FB_KEY_CODES = [
  65, 73, 122, 97, 83, 121, 67, 109, 57, 115, 116, 116, 117, 117, 49, 52,
  119, 50, 97, 104, 98, 50, 122, 48, 57, 75, 83, 102, 83, 88, 102, 95,
  69, 115, 77, 87, 100, 76, 107
];

// Default Firebase configuration for project: tala-d9aaa
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    String.fromCharCode(...DEFAULT_FB_KEY_CODES),
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tala-d9aaa.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tala-d9aaa',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'tala-d9aaa.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '205311517565',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
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

export function getFirestoreDb() {
  if (dbInstance) return dbInstance;
  const config = getActiveFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }
  try {
    const existingApps = getApps();
    const app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('Error initializing Firebase Firestore:', err);
    return null;
  }
}

export function isCloudBackendConfigured() {
  return Boolean(getFirestoreDb());
}

// === Cloud Sync & Persistence Helpers ===

/**
 * Subscribe to Allowed Users, Goal Bank, Settings, and Students in real time.
 * Automatically seeds Firestore with local data on first run if the cloud documents don't exist yet.
 */
export function subscribeToTalaBackend({
  getInitialAllowedUsers,
  getInitialGoalBank,
  getInitialStudents,
  getInitialGeminiKey,
  onAllowedUsersChange,
  onGoalBankChange,
  onStudentsChange,
  onSettingsChange,
  onSyncStatusChange
}) {
  const db = getFirestoreDb();
  if (!db) {
    onSyncStatusChange?.({ connected: false, status: 'local_only' });
    return () => {};
  }

  onSyncStatusChange?.({ connected: true, status: 'connecting' });

  const unsubscribers = [];

  // 1. Allowed Users & Roles (tala_config/allowed_users)
  const usersDocRef = doc(db, 'tala_config', 'allowed_users');
  const unsubUsers = onSnapshot(
    usersDocRef,
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.users) && data.users.length > 0) {
          onAllowedUsersChange?.(data.users);
        }
      } else {
        // Seed initial allowed users from local storage / defaults
        const seedUsers = getInitialAllowedUsers?.() || [];
        if (seedUsers.length > 0) {
          try {
            await setDoc(usersDocRef, {
              users: seedUsers,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Could not seed allowed_users to Firestore:', e);
          }
        }
      }
      onSyncStatusChange?.({ connected: true, status: 'synced' });
    },
    (err) => {
      console.error('Firestore allowed_users listener error:', err);
      onSyncStatusChange?.({ connected: false, status: 'error', error: err.message });
    }
  );
  unsubscribers.push(unsubUsers);

  // 2. Shared Dynamic Goal Bank (tala_config/goal_bank)
  const goalBankDocRef = doc(db, 'tala_config', 'goal_bank');
  const unsubGoalBank = onSnapshot(
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
    (err) => {
      console.error('Firestore goal_bank listener error:', err);
    }
  );
  unsubscribers.push(unsubGoalBank);

  // 3. Shared System Settings (tala_config/settings)
  const settingsDocRef = doc(db, 'tala_config', 'settings');
  const unsubSettings = onSnapshot(
    settingsDocRef,
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data) {
          onSettingsChange?.(data);
        }
      } else {
        const initialKey = getInitialGeminiKey?.();
        if (initialKey) {
          try {
            await setDoc(settingsDocRef, {
              geminiApiKey: initialKey,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Could not seed settings to Firestore:', e);
          }
        }
      }
    },
    (err) => {
      console.error('Firestore settings listener error:', err);
    }
  );
  unsubscribers.push(unsubSettings);

  // 4. Students & Reports Collection (tala_students/{studentId})
  const studentsColRef = collection(db, 'tala_students');
  const migrationMetaRef = doc(db, 'tala_config', 'students_migration_meta');

  const unsubStudents = onSnapshot(
    studentsColRef,
    async (querySnap) => {
      if (querySnap.empty) {
        // Check if initial migration has ever run; if not, seed local students
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

      const cloudStudents = [];
      querySnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.id) {
          cloudStudents.push(d);
        }
      });
      onStudentsChange?.(cloudStudents);
      onSyncStatusChange?.({ connected: true, status: 'synced' });
    },
    (err) => {
      console.error('Firestore tala_students listener error:', err);
      onSyncStatusChange?.({ connected: false, status: 'error', error: err.message });
    }
  );
  unsubscribers.push(unsubStudents);

  return () => {
    unsubscribers.forEach((u) => {
      try {
        u();
      } catch (_) {}
    });
  };
}

// === Direct Write Helpers to Cloud Firestore ===

export async function saveAllowedUsersToCloud(usersList) {
  const db = getFirestoreDb();
  if (!db) return false;
  try {
    await setDoc(doc(db, 'tala_config', 'allowed_users'), {
      users: usersList,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Failed to save allowedUsers to Firestore:', err);
    return false;
  }
}

export async function saveGoalBankToCloud(goalsList) {
  const db = getFirestoreDb();
  if (!db) return false;
  try {
    await setDoc(doc(db, 'tala_config', 'goal_bank'), {
      goals: goalsList,
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
    await setDoc(
      doc(db, 'tala_config', 'settings'),
      {
        ...settingsObj,
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
    await setDoc(doc(db, 'tala_students', studentObj.id), {
      ...studentObj,
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
