import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  safeGetStorageItem,
  safeSetStorageItem,
  safeRemoveStorageItem,
  safeGetStorageJson,
  safeSetStorageJson,
  isSafariOrIos,
  hasLocalStorageQuotaHeadroom
} from '../services/storage';
import { normalizeEmail } from '../domain/permissions';

describe('Login Storage, iPad/Safari Resilience & Environment Edge Cases Suite', () => {
  let mockStorageStore = {};
  let mockLocalStorage;
  let warnSpy;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockStorageStore = {};
    mockLocalStorage = {
      getItem: vi.fn((key) => (key in mockStorageStore ? mockStorageStore[key] : null)),
      setItem: vi.fn((key, val) => {
        mockStorageStore[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete mockStorageStore[key];
      }),
      clear: vi.fn(() => {
        mockStorageStore = {};
      })
    };

    vi.stubGlobal('window', { localStorage: mockLocalStorage });
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    warnSpy.mockRestore();
  });

  describe('Safari & iPad QuotaExceededError Resilience', () => {
    it('catches Safari QuotaExceededError without crashing the login session save', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const quotaErr = new Error('The quota has been exceeded.');
        quotaErr.name = 'QuotaExceededError';
        quotaErr.code = 22;
        throw quotaErr;
      });

      const userSession = { email: 'teacher@school.org', name: 'מורה' };
      const result = safeSetStorageJson('tala_user', userSession);

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });

    it('catches Safari SecurityError (private browsing blocked storage) gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const secErr = new Error('The operation is insecure.');
        secErr.name = 'SecurityError';
        secErr.code = 18;
        throw secErr;
      });

      const result = safeSetStorageJson('tala_user', { email: 'private@school.org' });
      expect(result).toBe(false);
    });

    it('handles localStorage throwing on access (null or restricted window.localStorage)', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', undefined);

      const getRes = safeGetStorageJson('tala_user', null);
      expect(getRes).toBeNull();

      const setRes = safeSetStorageJson('tala_user', { email: 'test@test.com' });
      expect(setRes).toBe(false);
    });
  });

  describe('Corrupted Storage Recovery & Session Normalization', () => {
    it('gracefully handles truncated or malformed JSON in session key and returns fallback', () => {
      mockStorageStore['tala_user'] = '{"email": "broken_user@school.org", "name":';

      const user = safeGetStorageJson('tala_user', null);
      expect(user).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('handles empty string or non-JSON string values in session storage safely', () => {
      mockStorageStore['tala_user'] = '';
      expect(safeGetStorageJson('tala_user', null)).toBeNull();

      mockStorageStore['tala_user'] = 'undefined';
      expect(safeGetStorageJson('tala_user', null)).toBeNull();

      mockStorageStore['tala_user'] = 'null';
      expect(safeGetStorageJson('tala_user', null)).toBeNull();
    });

    it('normalizes email with erratic whitespace and casing before session operations', () => {
      expect(normalizeEmail('   Teacher.Name@School.ORG   ')).toBe('teacher.name@school.org');
      expect(normalizeEmail(null)).toBe('');
      expect(normalizeEmail(undefined)).toBe('');
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('Device & Browser Detection (iPad, iPhone, Safari)', () => {
    it('detects iPadOS with traditional iPad user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        platform: 'iPad'
      });
      expect(isSafariOrIos()).toBe(true);
    });

    it('detects iPadOS in modern desktop mode (MacIntel with touch points > 1)', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5
      });
      expect(isSafariOrIos()).toBe(true);
    });

    it('detects iPhone iOS user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        platform: 'iPhone'
      });
      expect(isSafariOrIos()).toBe(true);
    });

    it('returns false for standard Chrome on Windows desktop', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        platform: 'Win32',
        maxTouchPoints: 0
      });
      expect(isSafariOrIos()).toBe(false);
    });
  });

  describe('Storage Headroom Probing', () => {
    it('returns true when quota probe succeeds', () => {
      expect(hasLocalStorageQuotaHeadroom(1024)).toBe(true);
    });

    it('returns false when quota probe throws quota error', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      expect(hasLocalStorageQuotaHeadroom(1024)).toBe(false);
    });
  });
});
