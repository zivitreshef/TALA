import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sessionDocKey,
  generateSessionId,
  getClientIp,
  checkActiveSession,
  activateSession,
  clearSession,
  SESSION_INACTIVITY_LIMIT_MS
} from '../services/sessionSecurity';

describe('TALA Single Session Security & Takeover Tests', () => {
  const testEmail = 'teacher.test@school.com';
  let memoryStorage = {};

  beforeEach(() => {
    memoryStorage = {};
    // Ensure localStorage works in test environment
    vi.stubGlobal('localStorage', {
      getItem: (key) => memoryStorage[key] || null,
      setItem: (key, val) => { memoryStorage[key] = String(val); },
      removeItem: (key) => { delete memoryStorage[key]; },
      clear: () => { memoryStorage = {}; }
    });
  });

  describe('getClientIp', () => {
    it('returns a valid string and caches subsequent lookups', async () => {
      const ip1 = await getClientIp();
      expect(typeof ip1).toBe('string');
      expect(ip1.length).toBeGreaterThan(0);
      const ip2 = await getClientIp();
      expect(ip2).toBe(ip1);
    });
  });

  describe('sessionDocKey', () => {
    it('normalizes email addresses to safe document keys', () => {
      expect(sessionDocKey('Teacher.Test@School.com')).toBe('teacher.test_school.com');
      expect(sessionDocKey('  USER+tag@Domain.co.il  ')).toBe('user_tag_domain.co.il');
      expect(sessionDocKey('')).toBe('');
    });
  });

  describe('generateSessionId', () => {
    it('produces unique non-empty session strings', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });

  describe('checkActiveSession & Takeover Flow', () => {
    it('allows clean initial login without takeover requirement', async () => {
      const check = await checkActiveSession(testEmail, 'sess_device_1');
      expect(check.takeoverRequired).toBe(false);
      expect(check.clientIp).toBeDefined();
    });

    it('requires takeover when an active session exists on another device within threshold', async () => {
      // Device A activates session
      await activateSession(testEmail, 'sess_device_A', '203.0.113.195');

      // Device B attempts to check session
      const check = await checkActiveSession(testEmail, 'sess_device_B');
      expect(check.takeoverRequired).toBe(true);
      expect(check.existingSession).toBeDefined();
      expect(check.existingSession.sessionId).toBe('sess_device_A');
      expect(check.existingSession.ipAddress).toBe('203.0.113.195');
    });

    it('does not require takeover if the same device/session reconnects', async () => {
      await activateSession(testEmail, 'sess_device_same', '198.51.100.4');

      const check = await checkActiveSession(testEmail, 'sess_device_same');
      expect(check.takeoverRequired).toBe(false);
    });

    it('successfully takes over and updates active session for new device', async () => {
      // Device A was active
      await activateSession(testEmail, 'sess_device_A', '1.1.1.1');

      // Device B takes over
      await activateSession(testEmail, 'sess_device_B', '2.2.2.2');

      // Now Device B is active without takeover
      const checkB = await checkActiveSession(testEmail, 'sess_device_B');
      expect(checkB.takeoverRequired).toBe(false);

      // Device A checking again will see Device B took over
      const checkA = await checkActiveSession(testEmail, 'sess_device_A');
      expect(checkA.takeoverRequired).toBe(true);
      expect(checkA.existingSession.sessionId).toBe('sess_device_B');
      expect(checkA.existingSession.ipAddress).toBe('2.2.2.2');
    });

    it('does not require takeover if the previous session has been idle for > 15 minutes', async () => {
      const key = sessionDocKey(testEmail);
      const expiredMs = Date.now() - (SESSION_INACTIVITY_LIMIT_MS + 60000); // 16 mins ago
      localStorage.setItem(
        `tala_active_session_${key}`,
        JSON.stringify({
          email: testEmail,
          sessionId: 'sess_abandoned_device',
          ipAddress: '10.0.0.1',
          lastActiveMs: expiredMs,
          lastActiveIso: new Date(expiredMs).toISOString()
        })
      );

      const check = await checkActiveSession(testEmail, 'sess_new_device');
      expect(check.takeoverRequired).toBe(false);
    });

    it('clears active session on logout so subsequent login has no conflict', async () => {
      await activateSession(testEmail, 'sess_device_A', '1.1.1.1');
      await clearSession(testEmail, 'sess_device_A');

      const check = await checkActiveSession(testEmail, 'sess_device_B');
      expect(check.takeoverRequired).toBe(false);
    });
  });
});
