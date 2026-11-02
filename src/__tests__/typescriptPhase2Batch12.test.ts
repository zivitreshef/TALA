import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createInvite,
  fetchInviteForRespondent,
  submitInviteResponses,
  markInviteReviewed,
  deleteInvite
} from '../services/inviteService';
import {
  maskEmailForPrivacy,
  recordEmailAuditLogToCloud,
  fetchTelemetrySnapshot,
  setEmergencyAiFreeze
} from '../services/telemetryService';
import {
  getTimeRangeStartMs,
  saveTelemetryBatch,
  fetchTelemetryEvents,
  setupUsageTelemetryTransport,
  TELEMETRY_EVENTS_COLLECTION,
  FIRESTORE_BATCH_LIMIT
} from '../services/telemetryStorage';
import {
  MAX_DOSSIER_FILE_SIZE_BYTES,
  openDossierFilePreview
} from '../services/dossierFileStorage';
import * as firebaseBackend from '../firebaseBackend';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}`, id })),
    setDoc: vi.fn().mockResolvedValue(undefined),
    getDoc: vi.fn(),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((_db, col) => ({ path: col })),
    query: vi.fn((c) => c),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(),
    writeBatch: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP')
  };
});

describe('TypeScript Migration Phase 2 - Batch 12 (Services Layer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      location: {
        href: 'https://zivitreshef.github.io/TALA/'
      },
      open: vi.fn()
    });
  });

  describe('inviteService.ts', () => {
    it('creates an invite and returns token with URL', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      const result = await createInvite({
        ownerEmail: 'teacher@school.org.il',
        studentId: 'st_123',
        childFirstName: 'יונתן',
        gender: 'boy'
      });

      expect(result.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(result.url).toContain(result.token);
      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
    });

    it('returns missing state on invalid token', async () => {
      const result = await fetchInviteForRespondent('invalid-short-token');
      expect(result.state).toBe('missing');
      expect(result.invite).toBeNull();
    });

    it('submits invite responses with sanitization', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      const validToken = '0123456789abcdef012345';
      await submitInviteResponses(validToken, {
        strengths: '<script>alert("xss")</script>תשובת הורה'
      });

      expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
      const updateArgs = vi.mocked(firestore.updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
      expect(updateArgs.status).toBe('submitted');
      expect((updateArgs.responses as Record<string, unknown>).strengths).toContain('תשובת הורה');
    });

    it('marks invite as reviewed and deletes invite', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      const token = '0123456789abcdef0123456789abcdef';
      await markInviteReviewed(token, 'applied');
      expect(firestore.updateDoc).toHaveBeenCalledTimes(1);

      await deleteInvite(token);
      expect(firestore.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('telemetryService.ts', () => {
    it('masks email addresses for privacy', () => {
      expect(maskEmailForPrivacy('teacher@school.org.il')).toBe('t***r@school.org.il');
      expect(maskEmailForPrivacy('ab@school.org.il')).toBe('*@school.org.il');
      expect(maskEmailForPrivacy('')).toBe('');
      expect(maskEmailForPrivacy('invalid-email')).toBe('invalid-email');
    });

    it('records email audit log without throwing', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      const success = await recordEmailAuditLogToCloud({ recipientEmail: 'parent@example.com' });
      expect(success).toBe(true);
      expect(firestore.setDoc).toHaveBeenCalledTimes(1);
    });

    it('fetches telemetry snapshot gracefully when offline or online', async () => {
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(null);
      const offline = await fetchTelemetrySnapshot();
      expect(offline.isOnline).toBe(false);
      expect(offline.aiLogs).toEqual([]);
      expect(offline.emailLogs).toEqual([]);
    });

    it('toggles emergency AI freeze circuit breaker', async () => {
      const settingsSpy = vi.spyOn(firebaseBackend, 'saveSettingsToCloud').mockResolvedValue(true as any);
      const res = await setEmergencyAiFreeze(true);
      expect(res).toBe(true);
      expect(settingsSpy).toHaveBeenCalledWith({ aiFreeze: true });
    });
  });

  describe('telemetryStorage.ts', () => {
    it('calculates start timestamps for all predefined time ranges', () => {
      const fixedNow = 1700000000000;
      expect(getTimeRangeStartMs('24h', null, fixedNow)).toBe(fixedNow - 24 * 60 * 60 * 1000);
      expect(getTimeRangeStartMs('7d', null, fixedNow)).toBe(fixedNow - 7 * 24 * 60 * 60 * 1000);
      expect(getTimeRangeStartMs('30d', null, fixedNow)).toBe(fixedNow - 30 * 24 * 60 * 60 * 1000);
      expect(getTimeRangeStartMs('90d', null, fixedNow)).toBe(fixedNow - 90 * 24 * 60 * 60 * 1000);
      expect(getTimeRangeStartMs('all', null, fixedNow)).toBe(0);
      expect(getTimeRangeStartMs('custom', 1650000000000, fixedNow)).toBe(1650000000000);
    });

    it('saves batch of telemetry events in Firestore batches', async () => {
      const mockBatch = {
        set: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined)
      };
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);
      vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any);

      const events = [
        { eventName: 'session_start', category: 'engagement' },
        { eventName: 'goal_created', category: 'workflow' }
      ];

      const success = await saveTelemetryBatch(events);
      expect(success).toBe(true);
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      expect(FIRESTORE_BATCH_LIMIT).toBe(450);
      expect(TELEMETRY_EVENTS_COLLECTION).toBe('tala_telemetry_events');
    });

    it('filters telemetry events with in-memory criteria', async () => {
      const mockDb = { type: 'mockDb' };
      vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(mockDb as any);

      const fakeDocs = [
        {
          id: 'ev_1',
          data: () => ({ eventName: 'e1', category: 'engagement', accountType: 'teacher', timestampMs: 1000 })
        },
        {
          id: 'ev_2',
          data: () => ({ eventName: 'e2', category: 'workflow', accountType: 'admin', timestampMs: 2000 })
        }
      ];

      vi.mocked(firestore.getDocs).mockResolvedValue({
        forEach: (cb: (doc: any) => void) => fakeDocs.forEach(cb)
      } as any);

      const events = await fetchTelemetryEvents({
        timeRange: 'all',
        excludeInternal: true
      });

      expect(events.length).toBe(1);
      expect(events[0].id).toBe('ev_1');
    });

    it('plugs transport into usage telemetry service', () => {
      const mockService = {
        setTransport: vi.fn()
      };
      const result = setupUsageTelemetryTransport(mockService as any);
      expect(result).toBe(mockService);
      expect(mockService.setTransport).toHaveBeenCalledWith(saveTelemetryBatch);
    });
  });

  describe('dossierFileStorage.ts', () => {
    it('specifies the max dossier file size as 20 MB', () => {
      expect(MAX_DOSSIER_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
    });

    it('previews document with URL or returns false for non-visual text', async () => {
      const pdfDoc = {
        id: 'doc_1',
        fileName: 'assessment.pdf',
        fileType: 'pdf',
        storageUrl: 'https://storage.googleapis.com/test.pdf'
      };

      const opened = await openDossierFilePreview(pdfDoc);
      expect(opened).toBe(true);
      expect(window.open).toHaveBeenCalledWith(pdfDoc.storageUrl, '_blank');

      const textDoc = {
        id: 'doc_2',
        fileName: 'notes.txt',
        fileType: 'txt'
      };
      const textOpened = await openDossierFilePreview(textDoc);
      expect(textOpened).toBe(false);
    });
  });
});
