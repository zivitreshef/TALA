import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  safeGetStorageItem,
  safeSetStorageItem,
  safeRemoveStorageItem,
  safeGetStorageJson,
  safeSetStorageJson,
  isSafariOrIos,
  hasLocalStorageQuotaHeadroom,
  pruneStaleFirestoreKeys
} from '../services/storage';
import { reportHealthEvent } from '../services/healthTelemetry';
import { parseAiJsonResult, callAiJson } from '../services/aiJsonClient';
import { processChatImageFile } from '../services/chatImageHelper';
import * as firebaseBackend from '../firebaseBackend';
import * as aiProxyClient from '../services/aiProxyClient';

describe('TypeScript Migration Phase 2 - Batch 11 (Services Layer)', () => {
  const mockStorageMap = new Map<string, string>();

  beforeEach(() => {
    mockStorageMap.clear();
    const mockStorage = {
      getItem: (k: string) => (mockStorageMap.has(k) ? mockStorageMap.get(k)! : null),
      setItem: (k: string, v: string) => mockStorageMap.set(k, String(v)),
      removeItem: (k: string) => mockStorageMap.delete(k),
      clear: () => mockStorageMap.clear(),
      get length() {
        return mockStorageMap.size;
      },
      key: (i: number) => Array.from(mockStorageMap.keys())[i] || null
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  });

  describe('storage.ts', () => {
    it('handles safe get, set, and remove operations on localStorage', () => {
      expect(safeSetStorageItem('test_key', 'hello')).toBe(true);
      expect(safeGetStorageItem('test_key')).toBe('hello');
      expect(safeRemoveStorageItem('test_key')).toBe(true);
      expect(safeGetStorageItem('test_key', 'default')).toBe('default');
    });

    it('handles falsy or empty keys gracefully', () => {
      expect(safeSetStorageItem('', 'val')).toBe(false);
      expect(safeGetStorageItem('', 'fallback')).toBe('fallback');
      expect(safeRemoveStorageItem('')).toBe(false);
    });

    it('safely serializes and parses JSON payloads', () => {
      const data = { foo: 'bar', count: 42, active: true };
      expect(safeSetStorageJson('json_key', data)).toBe(true);

      const parsed = safeGetStorageJson<typeof data>('json_key');
      expect(parsed).toEqual(data);
    });

    it('returns fallback value on corrupted JSON in localStorage', () => {
      safeSetStorageItem('corrupted_key', '{not valid json');
      const fallback = { fallback: true };
      expect(safeGetStorageJson('corrupted_key', fallback)).toEqual(fallback);
    });

    it('detects platform and verifies quota headroom', () => {
      expect(typeof isSafariOrIos()).toBe('boolean');
      expect(hasLocalStorageQuotaHeadroom(1024)).toBe(true);
    });

    it('prunes stale Firestore multi-tab keys while preserving application keys', () => {
      safeSetStorageItem('tala_user_settings', 'keep_me');
      safeSetStorageItem('firestore_clients_sync', 'prune_me');
      safeSetStorageItem('firebase:host:123', 'prune_me_too');
      safeSetStorageItem('__sak_target', 'prune_me_three');

      const prunedCount = pruneStaleFirestoreKeys();
      expect(prunedCount).toBe(3);
      expect(safeGetStorageItem('tala_user_settings')).toBe('keep_me');
      expect(safeGetStorageItem('firestore_clients_sync')).toBeNull();
      expect(safeGetStorageItem('firebase:host:123')).toBeNull();
      expect(safeGetStorageItem('__sak_target')).toBeNull();
    });
  });

  describe('healthTelemetry.ts', () => {
    it('reports health events without throwing and deduplicates rapid bursts', () => {
      const reportSpy = vi.spyOn(firebaseBackend, 'reportHealthEventToCloud').mockImplementation(async () => true);
      const authSpy = vi.spyOn(firebaseBackend, 'getFirebaseAuth').mockReturnValue({
        currentUser: { email: 'teacher@school.org.il' }
      } as any);

      reportHealthEvent({
        kind: 'ai_proxy_error',
        operation: 'generate_plan',
        error: new Error('Network timeout'),
        extra: { statusCode: 504 }
      });

      expect(reportSpy).toHaveBeenCalledTimes(1);

      // Rapid identical second call within dedupe window (30s) must be suppressed
      reportHealthEvent({
        kind: 'ai_proxy_error',
        operation: 'generate_plan',
        error: new Error('Network timeout'),
        extra: { statusCode: 504 }
      });

      expect(reportSpy).toHaveBeenCalledTimes(1);

      reportSpy.mockRestore();
      authSpy.mockRestore();
    });
  });

  describe('aiJsonClient.ts', () => {
    it('parses direct JSON responses and markdown-fenced JSON responses', () => {
      const direct = parseAiJsonResult({ raw: '{"name":"יונתן","grade":"ב"}' });
      expect(direct).toEqual({ name: 'יונתן', grade: 'ב' });

      const fenced = parseAiJsonResult({ raw: '```json\n{"environment":"חצר","status":"active"}\n```' });
      expect(fenced).toEqual({ environment: 'חצר', status: 'active' });

      const passthrough = { goals: [{ title: 'Goal 1' }] };
      expect(parseAiJsonResult(passthrough)).toEqual(passthrough);
    });

    it('calls AI proxy endpoint with masked student details', async () => {
      const proxySpy = vi.spyOn(aiProxyClient, 'callAiProxyEndpoint').mockResolvedValue({
        raw: '{"goals":[{"title":"יעד מותאם"}]}'
      });

      const student = {
        name: 'דניאל כהן',
        gender: 'boy',
        educationalFramework: 'בית ספר יסודי "ארזים"'
      };

      const result = await callAiJson('בנה מטרות עבור דניאל כהן', student);
      expect(result).toEqual({ goals: [{ title: 'יעד מותאם' }] });
      expect(proxySpy).toHaveBeenCalledTimes(1);

      proxySpy.mockRestore();
    });
  });

  describe('chatImageHelper.ts', () => {
    it('rejects empty or null file inputs', async () => {
      const result = await processChatImageFile(null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('לא נבחר קובץ');
    });

    it('rejects files with invalid or dangerous extensions', async () => {
      const fakeFile = {
        name: 'malicious.exe',
        type: 'application/octet-stream',
        size: 5000
      };
      const result = await processChatImageFile(fakeFile as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('processes valid image files safely in Node/non-browser fallback environment', async () => {
      const validFile = {
        name: 'screenshot.png',
        type: 'image/png',
        size: 50 * 1024
      };
      const result = await processChatImageFile(validFile as any);
      expect(result.success).toBe(true);
      expect(result.attachment).toBeDefined();
      expect(result.attachment?.type).toBe('image/jpeg');
    });
  });
});
