import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockDb = { name: 'mock-firestore-db' };
const mockApp = { name: '[DEFAULT]' };
const mockAuth = {
  currentUser: { email: 'teacher@test.com' }
};

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
let mockDocSnap = { exists: () => false, data: () => null };
const mockGetDoc = vi.fn().mockImplementation(() => Promise.resolve(mockDocSnap));
const mockSignInWithCustomToken = vi.fn().mockResolvedValue({});

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApps: vi.fn(() => [mockApp])
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithCustomToken: (...args) => mockSignInWithCustomToken(...args),
  signOut: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  initializeFirestore: vi.fn(() => mockDb),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
  persistentSingleTabManager: vi.fn(),
  doc: vi.fn((db, col, id) => ({ db, col, id, path: `${col}/${id}` })),
  collection: vi.fn((db, col) => ({ db, col, path: col })),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn()
}));

import {
  loginWithTala,
  prewarmTalaLogin,
  _resetFirestoreInstanceForTesting,
  _resetLoginPrewarmThrottleForTesting
} from '../firebaseBackend';
import {
  checkActiveSession,
  activateSession,
  clearSession,
  setCachedClientIp,
  getClientIp
} from '../services/sessionSecurity';

describe('Login Latency Optimization & Pre-warm Pipeline', () => {
  let originalFetch;
  let mockFetch;
  let memoryStorage = {};

  beforeEach(() => {
    vi.clearAllMocks();
    _resetFirestoreInstanceForTesting();
    _resetLoginPrewarmThrottleForTesting();
    memoryStorage = {};
    mockDocSnap = { exists: () => false, data: () => null };

    vi.stubGlobal('localStorage', {
      getItem: (key) => memoryStorage[key] || null,
      setItem: (key, val) => { memoryStorage[key] = String(val); },
      removeItem: (key) => { delete memoryStorage[key]; },
      clear: () => { memoryStorage = {}; }
    });

    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('prewarmTalaLogin', () => {
    it('dispatches background pre-warm ping with ping: true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, pong: true })
      });

      await prewarmTalaLogin();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('talalogin');
      const body = JSON.parse(call[1].body);
      expect(body).toEqual({ ping: true });
    });

    it('throttles rapid subsequent pre-warm calls to avoid server spam', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, pong: true })
      });

      await prewarmTalaLogin();
      await prewarmTalaLogin();
      await prewarmTalaLogin();

      // Only the first call should dispatch within the 60s throttle window
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('swallows network or abort errors silently without throwing', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error / connection dropped'));

      // Must not throw
      await expect(prewarmTalaLogin()).resolves.toBeUndefined();
    });
  });

  describe('loginWithTala clientIp propagation', () => {
    it('returns clientIp and user on successful login and signs in with token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: true,
          token: 'custom-jwt-token-xyz',
          user: { email: 'teacher@school.edu', name: 'מורה' },
          clientIp: '82.80.12.34'
        })
      });

      const res = await loginWithTala('teacher@school.edu', 'secret123');

      expect(res.allowed).toBe(true);
      expect(res.user.email).toBe('teacher@school.edu');
      expect(res.clientIp).toBe('82.80.12.34');
      expect(mockSignInWithCustomToken).toHaveBeenCalledWith(mockAuth, 'custom-jwt-token-xyz');
    });

    it('handles denied login without signing into Firebase Auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          allowed: false,
          reason: 'קוד הגישה שגוי.'
        })
      });

      const res = await loginWithTala('teacher@school.edu', 'wrong-code');

      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('קוד הגישה שגוי.');
      expect(mockSignInWithCustomToken).not.toHaveBeenCalled();
    });

    it('handles network failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const res = await loginWithTala('teacher@school.edu', 'code');

      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('אינו זמין');
    });
  });

  describe('checkActiveSession with same IP & knownClientIp bypass', () => {
    it('bypasses external api.ipify.org fetch when knownClientIp is provided', async () => {
      const knownIp = '84.110.45.67';

      mockFetch.mockImplementation(() => {
        throw new Error('fetch should not be called when knownClientIp is provided!');
      });

      const check = await checkActiveSession('teacher@school.edu', 'sess_test_123', knownIp);

      expect(check.takeoverRequired).toBe(false);
      expect(check.clientIp).toBe(knownIp);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not require takeover if the active session is from the exact same client IP', async () => {
      const myIp = '199.203.68.10';
      // Simulate Firestore has an active session from the same IP (e.g. before relogin)
      mockDocSnap = {
        exists: () => true,
        data: () => ({
          sessionId: 'sess_prev_device',
          ipAddress: myIp,
          lastActiveIso: new Date().toISOString(),
          lastActiveMs: Date.now()
        })
      };

      const check = await checkActiveSession('teacher@school.edu', 'sess_new_login', myIp);

      // Must NOT require takeover because it is from the exact same IP
      expect(check.takeoverRequired).toBe(false);
    });

    it('requires takeover if the active session is from a DIFFERENT IP', async () => {
      const currentIp = '199.203.68.10';
      mockDocSnap = {
        exists: () => true,
        data: () => ({
          sessionId: 'sess_remote_laptop',
          ipAddress: '203.0.113.55', // Different IP!
          lastActiveIso: new Date().toISOString(),
          lastActiveMs: Date.now()
        })
      };

      const check = await checkActiveSession('teacher@school.edu', 'sess_new_login', currentIp);

      expect(check.takeoverRequired).toBe(true);
      expect(check.existingSession.ipAddress).toBe('203.0.113.55');
    });

    it('sets and updates cachedClientIp properly', async () => {
      setCachedClientIp('192.0.2.100');
      const ip = await getClientIp();
      expect(ip).toBe('192.0.2.100');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('clearSession on logout', () => {
    it('sets doc in Firestore with null session and clears localStorage', async () => {
      memoryStorage['tala_active_session_teacher_school.edu'] = JSON.stringify({ sessionId: 'sess_old' });

      await clearSession('teacher@school.edu', 'sess_old');

      expect(memoryStorage['tala_active_session_teacher_school.edu']).toBeUndefined();
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'tala_sessions/teacher_school.edu' }),
        expect.objectContaining({ sessionId: null, lastActiveMs: 0, ipAddress: null }),
        { merge: true }
      );
    });
  });

  describe('activateSession non-blocking presence', () => {
    it('activates session and records doc in Firestore without blocking', async () => {
      const payload = await activateSession('teacher@school.edu', 'sess_active_1', '192.0.2.100');

      expect(payload.email).toBe('teacher@school.edu');
      expect(payload.sessionId).toBe('sess_active_1');
      expect(payload.ipAddress).toBe('192.0.2.100');
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });
});
