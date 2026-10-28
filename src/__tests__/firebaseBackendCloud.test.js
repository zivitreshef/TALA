import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDb = { name: 'mock-firestore-db' };
const mockApp = { name: '[DEFAULT]' };
const mockAuth = {
  currentUser: {
    email: 'teacher@test.com',
    getIdToken: vi.fn().mockResolvedValue('mock-id-token')
  },
  authStateReady: vi.fn().mockResolvedValue()
};

const mockDoc = vi.fn((db, col, id) => ({ db, col, id, path: `${col}/${id}` }));
const mockCollection = vi.fn((db, col) => ({ db, col, path: col }));
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockRunTransaction = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteField = vi.fn(() => 'DELETE_FIELD');
const mockWriteBatch = vi.fn(() => ({
  set: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApps: vi.fn(() => [mockApp])
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithCustomToken: vi.fn(),
  signOut: vi.fn()
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({}))
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  initializeFirestore: vi.fn(() => mockDb),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(() => ({ type: "mock-multi-tab-manager" })),
  persistentSingleTabManager: vi.fn(() => ({ type: "mock-single-tab-manager" })),
  persistentLocalCache: vi.fn((opts) => opts),
  doc: (...args) => mockDoc(...args),
  collection: (...args) => mockCollection(...args),
  setDoc: (...args) => mockSetDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  runTransaction: (...args) => mockRunTransaction(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteField: (...args) => mockDeleteField(...args),
  writeBatch: (...args) => mockWriteBatch(...args),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn()
}));

import {
  parseFirebaseConfigInput,
  isCloudBackendConfigured,
  saveStudentToCloud,
  deleteStudentFromCloud,
  fetchAllowedUsersFromCloud,
  saveAllowedUsersToCloud,
  pingFirestore,
  getFirestoreDb,
  _resetFirestoreInstanceForTesting
} from '../firebaseBackend';
import * as storageService from '../services/storage';

describe('Firebase Backend Cloud Config & Serialization', () => {
  let transactionGetSpy;
  let transactionSetSpy;
  let mockFetch;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    transactionGetSpy = vi.fn().mockResolvedValue({
      exists: () => false,
      data: () => null
    });
    transactionSetSpy = vi.fn();

    mockRunTransaction.mockImplementation(async (db, updateFunction) => {
      return updateFunction({
        get: transactionGetSpy,
        set: transactionSetSpy
      });
    });

    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('parseFirebaseConfigInput', () => {
    it('parses raw JS object or JSON configuration safely', () => {
      const rawJsConfig = `const firebaseConfig = {
        apiKey: "AIzaSyTestKey123",
        authDomain: "tala-test.firebaseapp.com",
        projectId: "tala-test-project",
        storageBucket: "tala-test-project.firebasestorage.app",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abcdef"
      };`;
      const parsedFromJs = parseFirebaseConfigInput(rawJsConfig);
      expect(parsedFromJs).toBeDefined();
      expect(parsedFromJs.apiKey).toBe('AIzaSyTestKey123');
      expect(parsedFromJs.projectId).toBe('tala-test-project');
      expect(parsedFromJs.authDomain).toBe('tala-test.firebaseapp.com');

      const jsonConfig = JSON.stringify({
        apiKey: 'AIzaSyJsonKey456',
        projectId: 'tala-json-project'
      });
      const parsedFromJson = parseFirebaseConfigInput(jsonConfig);
      expect(parsedFromJson).toBeDefined();
      expect(parsedFromJson.apiKey).toBe('AIzaSyJsonKey456');
      expect(parsedFromJson.projectId).toBe('tala-json-project');
    });

    it('rejects empty or corrupt firebase configuration strings', () => {
      expect(parseFirebaseConfigInput('')).toBeNull();
      expect(parseFirebaseConfigInput('   ')).toBeNull();
      expect(parseFirebaseConfigInput(null)).toBeNull();
      expect(parseFirebaseConfigInput(undefined)).toBeNull();
      expect(parseFirebaseConfigInput('corrupted { json')).toBeNull();
      expect(parseFirebaseConfigInput('{ invalid: true }')).toBeNull();
    });
  });

  describe('isCloudBackendConfigured', () => {
    it('returns true when Firestore db instance is available', () => {
      expect(isCloudBackendConfigured()).toBe(true);
    });
  });

  describe('saveStudentToCloud', () => {
    it('strips temporary UI flags before writing and saves student via transaction', async () => {
      const studentWithTempFlags = {
        id: 'student_101',
        name: 'דניאל כהן',
        grade: 'כיתה ד',
        notes: 'הערות פדגוגיות',
        _isEditing: undefined,
        _tempSelection: undefined,
        uiFlagUnsaved: undefined
      };

      const result = await saveStudentToCloud(studentWithTempFlags, 'teacher@test.com');
      expect(result).toBe(true);

      expect(mockRunTransaction).toHaveBeenCalledTimes(1);
      expect(transactionSetSpy).toHaveBeenCalledTimes(1);

      const [targetDocRef, writtenPayload] = transactionSetSpy.mock.calls[0];
      expect(targetDocRef).toEqual(expect.objectContaining({ path: 'tala_students/student_101' }));
      expect(writtenPayload).toEqual(
        expect.objectContaining({
          id: 'student_101',
          name: 'דניאל כהן',
          grade: 'כיתה ד',
          notes: 'הערות פדגוגיות',
          updatedAt: expect.any(String)
        })
      );
      expect(writtenPayload).not.toHaveProperty('_isEditing');
      expect(writtenPayload).not.toHaveProperty('_tempSelection');
      expect(writtenPayload).not.toHaveProperty('uiFlagUnsaved');
    });

    it('falls back to setDoc with merge when transaction fails, and handles invalid student objects', async () => {
      expect(await saveStudentToCloud(null)).toBe(false);
      expect(await saveStudentToCloud({})).toBe(false);
      expect(await saveStudentToCloud({ name: 'ללא מזהה' })).toBe(false);

      mockRunTransaction.mockRejectedValueOnce(new Error('Transaction unavailable in offline mode'));
      const student = { id: 'student_offline', name: 'תלמיד אופליין' };
      const fallbackResult = await saveStudentToCloud(student);

      expect(fallbackResult).toBe(true);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'tala_students/student_offline' }),
        expect.objectContaining({
          id: 'student_offline',
          name: 'תלמיד אופליין',
          updatedAt: expect.any(String)
        }),
        { merge: true }
      );
    });
  });

  describe('deleteStudentFromCloud', () => {
    it('uses atomic deleteDoc to remove student by id', async () => {
      const result = await deleteStudentFromCloud('student_to_delete', 'teacher@test.com');
      expect(result).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith(mockDb, 'tala_students', 'student_to_delete');
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'tala_students/student_to_delete' })
      );
    });

    it('returns false when studentId is empty or deleteDoc throws', async () => {
      expect(await deleteStudentFromCloud('')).toBe(false);
      expect(await deleteStudentFromCloud(null)).toBe(false);

      mockDeleteDoc.mockRejectedValueOnce(new Error('Cloud Firestore permission denied'));
      const result = await deleteStudentFromCloud('student_error');
      expect(result).toBe(false);
    });
  });

  describe('fetchAllowedUsersFromCloud & saveAllowedUsersToCloud', () => {
    it('fetches and auto-migrates unhashed passwords from cloud document', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          users: [
            { email: 'teacher1@school.org', accessCode: 'plain123' },
            { email: 'teacher2@school.org', passwordHash: 'alreadyhashed', passwordSalt: 'saltsalt' }
          ]
        })
      });

      const users = await fetchAllowedUsersFromCloud();
      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('teacher1@school.org');
      expect(users[0].passwordHash).toBeDefined();
      expect(users[0].passwordSalt).toBeDefined();
      expect(users[0].accessCode).toBeUndefined();

      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      expect(await fetchAllowedUsersFromCloud()).toBeNull();

      mockGetDoc.mockRejectedValueOnce(new Error('Network offline'));
      expect(await fetchAllowedUsersFromCloud()).toBeNull();
    });

    it('saves allowed users via secure cloud write endpoint', async () => {
      const usersList = [{ email: 'teacher@school.org', accessCode: 'secretCode' }];
      const result = await saveAllowedUsersToCloud(usersList);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/talaConfigWrite'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-id-token'
          }),
          body: expect.stringContaining('"kind":"users"')
        })
      );

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      expect(await saveAllowedUsersToCloud(usersList)).toBe(false);
    });
  });

  describe('pingFirestore', () => {
    it('resolves with ok=true and latencyMs on successful connection probe', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({})
      });

      const probe = await pingFirestore();
      expect(probe.ok).toBe(true);
      expect(typeof probe.latencyMs).toBe('number');
      expect(probe.latencyMs).toBeGreaterThanOrEqual(0);
      expect(probe.message).toBe('');
      expect(mockDoc).toHaveBeenCalledWith(mockDb, 'tala_config', 'settings');
    });

    it('resolves with ok=false and error message on network timeout or failure', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Network timeout contacting Firestore server'));

      const probe = await pingFirestore();
      expect(probe.ok).toBe(false);
      expect(typeof probe.latencyMs).toBe('number');
      expect(probe.latencyMs).toBeGreaterThanOrEqual(0);
      expect(probe.message).toContain('Network timeout');
    });
  });
  describe('Firestore Initialization & Safari / Quota Resilience', () => {
    let mockAppInstance;

    beforeEach(() => {
      _resetFirestoreInstanceForTesting();
      mockAppInstance = { name: '[DEFAULT]' };
      vi.spyOn(storageService, 'pruneStaleFirestoreKeys').mockReturnValue(0);
    });

    afterEach(() => {
      _resetFirestoreInstanceForTesting();
      vi.restoreAllMocks();
    });

    it('prunes stale firestore sync keys from localStorage on initialization', async () => {
      const { initializeFirestore } = await import('firebase/firestore');
      const pruneSpy = vi.spyOn(storageService, 'pruneStaleFirestoreKeys').mockReturnValue(3);

      getFirestoreDb();

      expect(pruneSpy).toHaveBeenCalled();
      expect(initializeFirestore).toHaveBeenCalled();
    });

    it('selects persistentSingleTabManager with forceOwnership: true on Safari/iOS', async () => {
      const { persistentSingleTabManager, persistentMultipleTabManager } = await import('firebase/firestore');
      vi.spyOn(storageService, 'isSafariOrIos').mockReturnValue(true);
      vi.spyOn(storageService, 'hasLocalStorageQuotaHeadroom').mockReturnValue(true);

      getFirestoreDb();

      expect(persistentSingleTabManager).toHaveBeenCalledWith({ forceOwnership: true });
      expect(persistentMultipleTabManager).not.toHaveBeenCalled();
    });

    it('selects persistentSingleTabManager when localStorage quota is exceeded or lacking headroom', async () => {
      const { persistentSingleTabManager, persistentMultipleTabManager } = await import('firebase/firestore');
      vi.spyOn(storageService, 'isSafariOrIos').mockReturnValue(false);
      vi.spyOn(storageService, 'hasLocalStorageQuotaHeadroom').mockReturnValue(false);

      getFirestoreDb();

      expect(persistentSingleTabManager).toHaveBeenCalledWith({ forceOwnership: true });
      expect(persistentMultipleTabManager).not.toHaveBeenCalled();
    });

    it('selects persistentMultipleTabManager on desktop browsers with ample quota headroom', async () => {
      const { persistentSingleTabManager, persistentMultipleTabManager } = await import('firebase/firestore');
      vi.spyOn(storageService, 'isSafariOrIos').mockReturnValue(false);
      vi.spyOn(storageService, 'hasLocalStorageQuotaHeadroom').mockReturnValue(true);

      getFirestoreDb();

      expect(persistentMultipleTabManager).toHaveBeenCalled();
      expect(persistentSingleTabManager).not.toHaveBeenCalled();
    });

    it('falls back to getFirestore(app) when initializeFirestore throws', async () => {
      const { initializeFirestore, getFirestore } = await import('firebase/firestore');
      vi.mocked(initializeFirestore).mockImplementationOnce(() => {
        throw new Error('Firestore already initialized or unsupported cache');
      }).mockImplementationOnce(() => {
        throw new Error('Fallback failed');
      });

      const db = getFirestoreDb();
      expect(getFirestore).toHaveBeenCalled();
      expect(db).toBeDefined();
    });

    it('recordUserPresence awaits authStateReady before writing presence document', async () => {
      const { recordUserPresence } = await import('../firebaseBackend');
      mockAuth.authStateReady.mockClear();
      mockSetDoc.mockClear();

      const success = await recordUserPresence({ email: 'teacher@test.com', name: 'מורה' });

      expect(mockAuth.authStateReady).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'tala_config/presence' }),
        expect.objectContaining({
          activeUsers: expect.objectContaining({
            'teacher_test.com': expect.objectContaining({
              email: 'teacher@test.com',
              name: 'מורה'
            })
          })
        }),
        { merge: true }
      );
      expect(success).toBe(true);
    });

    it('subscribeToUserPresence awaits authStateReady before attaching onSnapshot', async () => {
      const { subscribeToUserPresence } = await import('../firebaseBackend');
      const { onSnapshot } = await import('firebase/firestore');
      mockAuth.authStateReady.mockClear();

      const unsub = subscribeToUserPresence(vi.fn());
      await new Promise((r) => setTimeout(r, 10));

      expect(mockAuth.authStateReady).toHaveBeenCalled();
      expect(onSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'tala_config/presence' }),
        expect.any(Function),
        expect.any(Function)
      );

      if (typeof unsub === 'function') unsub();
    });
  });

});
