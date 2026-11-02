import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import * as firebaseBackend from '../firebaseBackend';
import {
  subscribeToSupportThread,
  subscribeToAllSupportThreads,
  sendChatMessageToCloud,
  markThreadReadInCloud,
  clearSupportThreadInCloud,
  resolveSupportThreadInCloud,
  escalateSupportThreadInCloud,
  SUPPORT_THREADS_COLLECTION
} from '../services/supportChatService';
import {
  sessionDocKey,
  generateSessionId,
  setCachedClientIp,
  getClientIp,
  checkActiveSession,
  activateSession,
  sendSessionHeartbeat,
  clearSession,
  subscribeToSession,
  SESSION_INACTIVITY_LIMIT_MS
} from '../services/sessionSecurity';
import {
  pingAiProxy,
  startAiProxyKeepAlive,
  callAiProxyEndpoint
} from '../services/aiProxyClient';
import { usageTelemetryService } from '../services/usageTelemetryService';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn((_db, col, id) => ({ _type: 'docRef', col, id })),
    collection: vi.fn((_db, col) => ({ _type: 'colRef', col })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn((_ref, cb) => {
      cb({ exists: () => true, data: () => ({ id: 'thread_1', messages: [] }), docs: [] });
      return vi.fn();
    }),
    query: vi.fn((colRef) => colRef),
    orderBy: vi.fn(),
    limit: vi.fn()
  };
});

describe('TypeScript Migration Phase 2 - Batch 13 (Services Layer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('supportChatService.ts', () => {
    it('subscribes to a specific support thread and returns unsubscribe function', () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      const callback = vi.fn();
      const unsub = subscribeToSupportThread('teacher@school.org.il', callback);
      expect(typeof unsub).toBe('function');
      expect(firestore.onSnapshot).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ id: 'thread_1', messages: [] });
    });

    it('subscribes to all support threads for admin control', () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      const callback = vi.fn();
      const unsub = subscribeToAllSupportThreads(callback, 20);
      expect(typeof unsub).toBe('function');
      expect(firestore.collection).toHaveBeenCalledWith(mockDb, SUPPORT_THREADS_COLLECTION);
    });

    it('sends a chat message to cloud and updates Firestore thread doc', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);
      vi.spyOn(firebaseBackend, 'submitAdminRequestToCloud').mockResolvedValue({} as any);

      const updated = await sendChatMessageToCloud({
        userEmail: 'teacher@school.org.il',
        userName: 'רחל מורה',
        topic: 'שאלה על דוח שנתי',
        text: 'שלום, איך עורכים יעד?',
        senderRole: 'user'
      });

      expect(updated.messages?.length).toBe(1);
      expect(updated.messages?.[0].text).toBe('שלום, איך עורכים יעד?');
      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
    });

    it('marks thread read, clears, resolves and escalates thread doc', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      await markThreadReadInCloud('teacher_test_il', 'user');
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        { unreadByUser: false },
        { merge: true }
      );

      const cleared = await clearSupportThreadInCloud('teacher@test.il');
      expect(cleared).toBe(true);

      const resolved = await resolveSupportThreadInCloud('teacher@test.il', 'thumbs_up');
      expect(resolved).toBe(true);

      const escalated = await escalateSupportThreadInCloud('teacher@test.il', 'עדיין נתקל בבעיה');
      expect(escalated).toBe(true);
    });
  });

  describe('sessionSecurity.ts', () => {
    it('normalizes sessionDocKey and generates random sessionId', () => {
      const key = sessionDocKey('Teacher.Name+1@School.Gov.IL');
      expect(key).toBe('teacher.name_1_school.gov.il');

      const id = generateSessionId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThanOrEqual(10);
    });

    it('caches client IP and resolves correctly', async () => {
      setCachedClientIp('192.168.1.100');
      const ip = await getClientIp();
      expect(ip).toBe('192.168.1.100');
    });

    it('checks active session and detects takeover if active session exists from other host', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          sessionId: 'other_sess_123',
          ipAddress: '10.0.0.1',
          lastActiveMs: Date.now() - 60000 // 1 minute ago
        })
      } as any);

      const check = await checkActiveSession('user@school.gov.il', 'my_sess_456', '192.168.1.1');
      expect(check.takeoverRequired).toBe(true);
      expect(check.existingSession?.sessionId).toBe('other_sess_123');
    });

    it('activates session and records user heartbeat / clear', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);
      vi.spyOn(firebaseBackend, 'recordUserPresence').mockResolvedValue({} as any);

      const payload = await activateSession('user@school.gov.il', 'sess_test_1', '1.2.3.4');
      expect(payload.email).toBe('user@school.gov.il');
      expect(payload.sessionId).toBe('sess_test_1');
      expect(firestore.setDoc).toHaveBeenCalledTimes(1);

      await sendSessionHeartbeat('user@school.gov.il', 'sess_test_1');
      expect(firestore.updateDoc).toHaveBeenCalledTimes(1);

      await clearSession('user@school.gov.il', 'sess_test_1');
      expect(firestore.setDoc).toHaveBeenCalledTimes(2);

      expect(SESSION_INACTIVITY_LIMIT_MS).toBe(15 * 60 * 1000);
    });

    it('subscribes to session eviction events and returns cleanup function', () => {
      const unsub = subscribeToSession('user@school.gov.il', 'sess_test_1', vi.fn());
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('aiProxyClient.ts', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('pings AI proxy successfully and returns ping result with latency', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      }));

      const res = await pingAiProxy();
      expect(res.name).toBe('ai');
      expect(res.ok).toBe(true);
      expect(res.status).toBe(200);
    });

    it('starts keep alive ping interval and clears interval on cleanup', () => {
      vi.useFakeTimers();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      }));

      const cleanup = startAiProxyKeepAlive(60000);
      expect(typeof cleanup).toBe('function');

      vi.advanceTimersByTime(120000);
      cleanup();
      vi.useRealTimers();
    });

    it('calls AI proxy endpoint and records latency telemetry on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { summary: 'תקציר תקין' } })
      }));

      const trackSpy = vi.spyOn(usageTelemetryService, 'track').mockReturnValue(null as any);

      const result = await callAiProxyEndpoint({
        operation: 'summarize',
        payload: { text: 'בדיקת קלט' }
      });

      expect(result).toEqual({ summary: 'תקציר תקין' });
      expect(trackSpy).toHaveBeenCalledWith(
        'ai_latency_recorded',
        expect.objectContaining({
          operation: 'summarize',
          status: 'success'
        })
      );
    });
  });
});
