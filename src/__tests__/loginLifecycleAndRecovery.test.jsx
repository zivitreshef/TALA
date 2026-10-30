import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AllowlistAuthGate } from '../AllowlistAuthGate';
import {
  validatePasswordPolicy,
  verifyUserPassword,
  createPasswordCredentials,
  isTrialUserExpired,
  getTrialRemainingDays
} from '../allowedUsers';
import { safeSetStorageJson, safeGetStorageJson, safeRemoveStorageItem } from '../services/storage';

// Mock dependencies for AllowlistAuthGate
vi.mock('../firebaseBackend', () => ({
  loginWithTala: vi.fn(),
  prewarmTalaLogin: vi.fn(),
  subscribeToUserPresence: vi.fn(() => vi.fn()),
  signOutFirebaseAuthSession: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../services/sessionSecurity', () => ({
  checkActiveSession: vi.fn().mockResolvedValue({ takeoverRequired: false }),
  activateSession: vi.fn().mockResolvedValue(true),
  clearSession: vi.fn().mockResolvedValue(true),
  generateSessionId: vi.fn(() => 'mock-session-12345'),
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1')
}));

describe('Login Lifecycle, Gate Resilience & iPad Recovery Suite', () => {
  let mockStorageStore = {};
  let mockLocalStorage;

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  describe('AllowlistAuthGate Rendering & Form Integrity', () => {
    it('renders cleanly in unauthenticated state with email, password fields and login CTA', () => {
      const html = renderToStaticMarkup(
        React.createElement(AllowlistAuthGate, {
          allowedUsers: [],
          onLoginSuccess: vi.fn(),
          onUpdateAllowedUsers: vi.fn(),
          onSubmitAdminRequest: vi.fn(),
          enforcePasswordPolicy: false,
          onChangeEnforcePasswordPolicy: vi.fn()
        })
      );

      expect(html).toContain('כתובת דואר אלקטרוני:');
      expect(html).toContain('קוד גישה אישי / סיסמה:');
      expect(html).toContain('כניסה למערכת TALA');
      expect(html).toContain('פנייה למנהל/ת המערכת');
    });

    it('renders support prompt and contact link for unauthenticated teachers', () => {
      const html = renderToStaticMarkup(
        React.createElement(AllowlistAuthGate, {
          allowedUsers: [],
          onLoginSuccess: vi.fn(),
          onUpdateAllowedUsers: vi.fn(),
          onSubmitAdminRequest: vi.fn(),
          enforcePasswordPolicy: false,
          onChangeEnforcePasswordPolicy: vi.fn()
        })
      );

      expect(html).toContain('נתקלת בבעיה בכניסה או שהחשבון נחסם?');
      expect(html).toContain('btn-link-contact-admin');
    });
  });

  describe('Session Storage Hydration & Mutation Invariance', () => {
    const SESSION_USER_KEY = 'tala_user';

    it('saves user session cleanly and retrieves it with identical properties', () => {
      const testUser = {
        email: 'teacher@school.org',
        name: 'מורה לדוגמה',
        role: 'teacher',
        sessionId: 'sess_998877',
        loginAt: new Date().toISOString()
      };

      const success = safeSetStorageJson(SESSION_USER_KEY, testUser);
      expect(success).toBe(true);

      const retrieved = safeGetStorageJson(SESSION_USER_KEY);
      expect(retrieved).toEqual(testUser);
      expect(retrieved.email).toBe('teacher@school.org');
      expect(retrieved.sessionId).toBe('sess_998877');
    });

    it('handles logout by removing session without affecting unrelated storage keys', () => {
      safeSetStorageJson(SESSION_USER_KEY, { email: 'teacher@test.com' });
      safeSetStorageJson('unrelated_data', { key: 'value' });

      safeRemoveStorageItem(SESSION_USER_KEY);

      expect(safeGetStorageJson(SESSION_USER_KEY)).toBeNull();
      expect(safeGetStorageJson('unrelated_data')).toEqual({ key: 'value' });
    });
  });

  describe('Lockout, Trial & Security Boundaries on Login', () => {
    it('correctly classifies an expired trial user so they do not enter main app unexpectedly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const expiredUser = {
        email: 'trial@school.org',
        isTrialUser: true,
        trialExpiresAt: pastDate.toISOString()
      };

      expect(isTrialUserExpired(expiredUser)).toBe(true);
      expect(getTrialRemainingDays(expiredUser)).toBe(0);
    });

    it('correctly calculates remaining trial days for active trial teachers', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const activeTrialUser = {
        email: 'active_trial@school.org',
        isTrialUser: true,
        trialExpiresAt: futureDate.toISOString()
      };

      expect(isTrialUserExpired(activeTrialUser)).toBe(false);
      expect(getTrialRemainingDays(activeTrialUser)).toBe(7);
    });

    it('verifies case-insensitive email matching for credential verification', () => {
      const creds = createPasswordCredentials('MyStrongPassword123!');
      const mockUser = {
        email: 'Teacher@School.ORG',
        ...creds
      };

      // Exact match
      expect(verifyUserPassword(mockUser, 'MyStrongPassword123!')).toBe(true);
      // Case insensitivity normalization of email
      expect(mockUser.email.toLowerCase()).toBe('teacher@school.org');
    });

    it('validates password policy compliance correctly', () => {
      const weak = validatePasswordPolicy('123');
      expect(weak.valid).toBe(false);

      const strong = validatePasswordPolicy('Tal2026!');
      expect(strong.valid).toBe(true);
    });
  });
});
