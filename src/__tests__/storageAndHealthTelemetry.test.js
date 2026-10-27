import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  safeGetStorageItem,
  safeSetStorageItem,
  safeRemoveStorageItem,
  safeGetStorageJson,
  safeSetStorageJson,
  hasLocalStorageQuotaHeadroom,
  pruneStaleFirestoreKeys,
  isSafariOrIos
} from '../services/storage';
import { reportHealthEvent } from '../services/healthTelemetry';
import { HEALTH_EVENT_KINDS } from '../domain/healthEvents';
import * as firebaseBackend from '../firebaseBackend';

vi.mock('../firebaseBackend', () => ({
  getFirebaseAuth: vi.fn(() => ({ currentUser: { email: 'teacher@test.com' } })),
  reportHealthEventToCloud: vi.fn(() => Promise.resolve(true))
}));

describe('Resilient Storage & Health Telemetry Engine Suite', () => {
  let mockStorageStore = {};
  let mockLocalStorage;
  let warnSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
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

    vi.stubGlobal('window', {
      localStorage: mockLocalStorage
    });

    vi.mocked(firebaseBackend.getFirebaseAuth).mockReturnValue({
      currentUser: { email: 'teacher@test.com' }
    });
    vi.mocked(firebaseBackend.reportHealthEventToCloud).mockClear();
    vi.mocked(firebaseBackend.reportHealthEventToCloud).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Storage Safe Wrapper - safeGetStorageItem', () => {
    it('returns fallbackValue when key is missing or empty', () => {
      expect(safeGetStorageItem('', 'default')).toBe('default');
      expect(safeGetStorageItem(null, 'default')).toBe('default');
      expect(safeGetStorageItem(undefined, 'default')).toBe('default');
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
    });

    it('returns fallbackValue when window or window.localStorage is undefined', () => {
      vi.stubGlobal('window', undefined);
      expect(safeGetStorageItem('key1', 'fallback')).toBe('fallback');

      vi.stubGlobal('window', {});
      expect(safeGetStorageItem('key1', 'fallback')).toBe('fallback');
    });

    it('returns stored item when key exists in storage', () => {
      mockStorageStore['tala_session'] = 'active_token_123';
      const result = safeGetStorageItem('tala_session', 'default');
      expect(result).toBe('active_token_123');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('tala_session');
    });

    it('returns fallbackValue when key is not present in storage', () => {
      const result = safeGetStorageItem('missing_key', 'fallback_val');
      expect(result).toBe('fallback_val');
    });

    it('returns fallbackValue and logs warning when localStorage.getItem throws SecurityError', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        const err = new Error('SecurityError: Access is denied');
        err.name = 'SecurityError';
        throw err;
      });

      const result = safeGetStorageItem('restricted_key', 'safe_fallback');
      expect(result).toBe('safe_fallback');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[storage] Failed to read key "restricted_key"'),
        expect.any(Error)
      );
    });
  });

  describe('Storage Safe Wrapper - safeSetStorageItem', () => {
    it('returns false when key is missing or empty', () => {
      expect(safeSetStorageItem('', 'val')).toBe(false);
      expect(safeSetStorageItem(null, 'val')).toBe(false);
      expect(safeSetStorageItem(undefined, 'val')).toBe(false);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('returns false when window or window.localStorage is undefined', () => {
      vi.stubGlobal('window', undefined);
      expect(safeSetStorageItem('key1', 'val')).toBe(false);

      vi.stubGlobal('window', {});
      expect(safeSetStorageItem('key1', 'val')).toBe(false);
    });

    it('writes value successfully and returns true, coercing nullish values to empty string', () => {
      expect(safeSetStorageItem('key_num', 42)).toBe(true);
      expect(mockStorageStore['key_num']).toBe('42');

      expect(safeSetStorageItem('key_null', null)).toBe(true);
      expect(mockStorageStore['key_null']).toBe('');

      expect(safeSetStorageItem('key_undefined', undefined)).toBe(true);
      expect(mockStorageStore['key_undefined']).toBe('');
    });

    it('catches QuotaExceededError, returns false without throwing, and warns', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const err = new Error('QuotaExceededError: The quota has been exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      });

      let threw = false;
      let result = null;
      try {
        result = safeSetStorageItem('large_payload', 'x'.repeat(1000));
      } catch {
        threw = true;
      }

      expect(threw).toBe(false);
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[storage] Failed to write key "large_payload" (possible quota limit)'),
        expect.any(Error)
      );
    });
  });

  describe('Storage Safe Wrapper - safeRemoveStorageItem', () => {
    it('returns false when key is empty or window.localStorage is missing', () => {
      expect(safeRemoveStorageItem('')).toBe(false);

      vi.stubGlobal('window', undefined);
      expect(safeRemoveStorageItem('any_key')).toBe(false);
    });

    it('removes item successfully and returns true', () => {
      mockStorageStore['to_delete'] = 'data';
      expect(safeRemoveStorageItem('to_delete')).toBe(true);
      expect(mockStorageStore['to_delete']).toBeUndefined();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('to_delete');
    });

    it('returns false without throwing when localStorage.removeItem throws', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(safeRemoveStorageItem('key')).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[storage] Failed to remove key "key"'),
        expect.any(Error)
      );
    });
  });

  describe('Storage Safe Wrapper - safeGetStorageJson & safeSetStorageJson', () => {
    it('parses and returns valid JSON objects and arrays', () => {
      mockStorageStore['profile'] = JSON.stringify({ name: 'Teacher', role: 'admin' });
      mockStorageStore['ids'] = JSON.stringify([1, 2, 3]);

      expect(safeGetStorageJson('profile')).toEqual({ name: 'Teacher', role: 'admin' });
      expect(safeGetStorageJson('ids')).toEqual([1, 2, 3]);
    });

    it('returns fallbackValue when stored item is null, empty string, or missing', () => {
      expect(safeGetStorageJson('non_existent', { fallback: true })).toEqual({ fallback: true });

      mockStorageStore['empty_entry'] = '';
      expect(safeGetStorageJson('empty_entry', [])).toEqual([]);
    });

    it('returns fallbackValue on corrupt/malformed JSON without throwing', () => {
      mockStorageStore['corrupted_entry'] = '{"name": "broken json';

      let result;
      expect(() => {
        result = safeGetStorageJson('corrupted_entry', { defaultData: 1 });
      }).not.toThrow();

      expect(result).toEqual({ defaultData: 1 });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[storage] Corrupted JSON in key "corrupted_entry"'),
        expect.any(SyntaxError)
      );
    });

    it('returns fallbackValue when parsed JSON evaluates to null or undefined', () => {
      mockStorageStore['null_json'] = 'null';
      expect(safeGetStorageJson('null_json', { recovered: true })).toEqual({ recovered: true });
    });

    it('serializes and stores JSON objects via safeSetStorageJson', () => {
      const payload = { settings: { theme: 'dark', notifications: true } };
      const success = safeSetStorageJson('user_settings', payload);

      expect(success).toBe(true);
      expect(JSON.parse(mockStorageStore['user_settings'])).toEqual(payload);
    });

    it('returns false without throwing when serializing circular reference in safeSetStorageJson', () => {
      const circularObj = {};
      circularObj.self = circularObj;

      let result;
      expect(() => {
        result = safeSetStorageJson('circular_key', circularObj);
      }).not.toThrow();

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[storage] Failed to serialize JSON for key "circular_key"'),
        expect.any(TypeError)
      );
    });

    it('returns false when underlying safeSetStorageItem fails under quota limit', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const res = safeSetStorageJson('heavy_data', { a: 1 });
      expect(res).toBe(false);
    });
  });

  describe('Health Telemetry Engine - reportHealthEvent', () => {
    it('dispatches health event to cloud with authenticated user email and structured payload', async () => {
      reportHealthEvent({
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'generate_goal_plan',
        error: { status: 429, message: 'Resource exhausted: rate limit exceeded' },
        extra: { promptLength: 520, stage: 'exploration' }
      });

      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(1);
      const dispatchedEvent = vi.mocked(firebaseBackend.reportHealthEventToCloud).mock.calls[0][0];

      expect(dispatchedEvent.kind).toBe(HEALTH_EVENT_KINDS.AI_PROXY_ERROR);
      expect(dispatchedEvent.operation).toBe('generate_goal_plan');
      expect(dispatchedEvent.category).toBe('rate_limit');
      expect(dispatchedEvent.status).toBe(429);
      expect(dispatchedEvent.userEmail).toBe('teacher@test.com');
      expect(dispatchedEvent.promptLength).toBe(520);
      expect(dispatchedEvent.stage).toBe('exploration');
      expect(dispatchedEvent.createdAtMs).toBe(Date.now());
      expect(dispatchedEvent.createdAtIso).toBe(new Date(Date.now()).toISOString());
    });

    it('deduplicates identical events within 30-second window (burst suppression)', () => {
      const basePayload = {
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'lesson_ai_query',
        error: { status: 500, message: 'Internal Server Error' }
      };

      // First dispatch succeeds
      reportHealthEvent(basePayload);
      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(1);

      // Rapid successive calls within 30 seconds should be dropped
      vi.advanceTimersByTime(5000); // 5s elapsed
      reportHealthEvent(basePayload);
      vi.advanceTimersByTime(10000); // 15s elapsed
      reportHealthEvent(basePayload);
      vi.advanceTimersByTime(14000); // 29s elapsed total
      reportHealthEvent(basePayload);

      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(1);

      // Once 30 seconds have passed, new event is allowed through
      vi.advanceTimersByTime(2000); // 31s elapsed total
      reportHealthEvent(basePayload);
      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(2);
    });

    it('does not deduplicate events with different operations or categories in the same window', () => {
      reportHealthEvent({
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'op_a',
        error: { status: 500, message: 'Server down' }
      });
      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(1);

      // Different operation within same timeframe is dispatched immediately
      reportHealthEvent({
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'op_b',
        error: { status: 500, message: 'Server down' }
      });
      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(2);

      // Different kind / category within same timeframe is dispatched immediately
      reportHealthEvent({
        kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK,
        operation: 'op_a',
        error: null
      });
      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(3);
    });

    it('safely handles missing authentication without throwing', () => {
      vi.mocked(firebaseBackend.getFirebaseAuth).mockReturnValue(null);

      expect(() => {
        reportHealthEvent({
          kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK,
          operation: 'unauthenticated_op'
        });
      }).not.toThrow();

      expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(1);
      const dispatched = vi.mocked(firebaseBackend.reportHealthEventToCloud).mock.calls[0][0];
      expect(dispatched.userEmail).toBe('');
    });

    it('swallows promise rejections and synchronous exceptions (fire-and-forget safety)', async () => {
      // Synchronous cloud throw
      vi.mocked(firebaseBackend.reportHealthEventToCloud).mockImplementationOnce(() => {
        throw new Error('Cloud function offline');
      });

      expect(() => {
        reportHealthEvent({
          kind: HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE,
          operation: 'empty_test_sync'
        });
      }).not.toThrow();

      // Advance time so dedupe does not block
      vi.advanceTimersByTime(35000);

      // Asynchronous cloud rejection
      vi.mocked(firebaseBackend.reportHealthEventToCloud).mockRejectedValueOnce(
        new Error('Network disconnected')
      );

      expect(() => {
        reportHealthEvent({
          kind: HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE,
          operation: 'empty_test_async'
        });
      }).not.toThrow();

      // Ensure no unhandled rejection crashes the process
      await vi.runAllTimersAsync();
    });

    it('swallows catastrophic errors inside reportHealthEvent (e.g. auth throwing)', () => {
      vi.mocked(firebaseBackend.getFirebaseAuth).mockImplementation(() => {
        throw new Error('Catastrophic Auth Failure');
      });

      expect(() => {
        reportHealthEvent({
          kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
          operation: 'catastrophic_op'
        });
      }).not.toThrow();
    });
  });
  describe('Safari & Quota Resilience Utilities', () => {
    describe('isSafariOrIos', () => {
      it('identifies iPad from userAgent string', () => {
        vi.stubGlobal('navigator', {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
          platform: 'iPad',
          maxTouchPoints: 5
        });
        expect(isSafariOrIos()).toBe(true);
      });

      it('identifies modern iPadOS desktop-class user agent (MacIntel + touch points)', () => {
        vi.stubGlobal('navigator', {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
          platform: 'MacIntel',
          maxTouchPoints: 5
        });
        expect(isSafariOrIos()).toBe(true);
      });

      it('identifies iPhone from userAgent string', () => {
        vi.stubGlobal('navigator', {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
          platform: 'iPhone',
          maxTouchPoints: 5
        });
        expect(isSafariOrIos()).toBe(true);
      });

      it('identifies desktop Safari from userAgent string', () => {
        vi.stubGlobal('navigator', {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
          platform: 'MacIntel',
          maxTouchPoints: 0
        });
        expect(isSafariOrIos()).toBe(true);
      });

      it('returns false for Windows Desktop Chrome', () => {
        vi.stubGlobal('navigator', {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          platform: 'Win32',
          maxTouchPoints: 0
        });
        expect(isSafariOrIos()).toBe(false);
      });
    });

    describe('hasLocalStorageQuotaHeadroom', () => {
      it('returns true when probe write succeeds and removes probe key', () => {
        const headroom = hasLocalStorageQuotaHeadroom(1024);
        expect(headroom).toBe(true);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('__tala_quota_probe__', expect.any(String));
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('__tala_quota_probe__');
      });

      it('returns false when localStorage.setItem throws QuotaExceededError', () => {
        mockLocalStorage.setItem.mockImplementationOnce(() => {
          throw new Error('The quota has been exceeded.');
        });
        const headroom = hasLocalStorageQuotaHeadroom(1024);
        expect(headroom).toBe(false);
      });

      it('returns false when window or localStorage is missing', () => {
        vi.stubGlobal('window', {});
        expect(hasLocalStorageQuotaHeadroom()).toBe(false);
      });
    });

    describe('pruneStaleFirestoreKeys', () => {
      it('removes orphaned firestore_, firebase:, and __sak keys while preserving tala_ keys', () => {
        mockStorageStore['firestore_clients_123'] = 'client-token';
        mockStorageStore['firestore_targets_abc'] = 'target-data';
        mockStorageStore['firestore_mutations_xyz'] = 'mutation-data';
        mockStorageStore['firebase:authUser:apiKey'] = 'auth-token';
        mockStorageStore['__sak'] = 'sak-token';
        mockStorageStore['tala_students_plans_v3'] = '[{"id":"st_1"}]';
        mockStorageStore['tala_allowed_users_v1'] = '[{"id":"u_1"}]';

        // Set up mock window.localStorage with key(i) and length
        const getKeys = () => Object.keys(mockStorageStore);
        mockLocalStorage.key = vi.fn((idx) => getKeys()[idx] || null);
        Object.defineProperty(mockLocalStorage, 'length', {
          get: () => getKeys().length,
          configurable: true
        });

        const removedCount = pruneStaleFirestoreKeys();
        expect(removedCount).toBe(5);
        expect(mockStorageStore['tala_students_plans_v3']).toBe('[{"id":"st_1"}]');
        expect(mockStorageStore['tala_allowed_users_v1']).toBe('[{"id":"u_1"}]');
        expect(mockStorageStore['firestore_clients_123']).toBeUndefined();
        expect(mockStorageStore['firestore_targets_abc']).toBeUndefined();
        expect(mockStorageStore['firestore_mutations_xyz']).toBeUndefined();
        expect(mockStorageStore['firebase:authUser:apiKey']).toBeUndefined();
        expect(mockStorageStore['__sak']).toBeUndefined();
      });

      it('returns 0 and does not throw when localStorage is missing', () => {
        vi.stubGlobal('window', {});
        expect(pruneStaleFirestoreKeys()).toBe(0);
      });
    });
  });

});
