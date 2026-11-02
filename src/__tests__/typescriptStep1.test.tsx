import { describe, it, expect, beforeEach } from 'vitest';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  length: 0,
  key: () => null
};
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = localStorageMock as any;
}
import {
  loadEmailEngineConfig,
  saveEmailEngineConfig,
  isDirectEmailEngineConfigured,
  buildOnboardingInvitationHtml,
  buildSignedNdaDocumentHtml,
  buildUserSurveyEmailHtml,
  buildPedagogicalReminderEmailHtml
} from '../emailService';
import {
  getActiveFirebaseConfig,
  parseFirebaseConfigInput,
  sanitizeForFirestore
} from '../firebaseBackend';
import { isUserAdmin } from '../components/admin/AdminAnalyticsDashboard';
import { calculateCurrentStreak } from '../components/DailyPedagogicalTracker';
import {
  detectStudentStage,
  hasKindergarten,
  hasSchool
} from '../studentStage';
import {
  loadGoalBank,
  saveGoalBank,
  getSortedGoalBank,
  canonicalizeEnvironment,
  getCanonicalEnvironmentsForStage
} from '../goalBankData';
import {
  loadAllowedUsers,
  isTrialUserExpired,
  getTrialRemainingDays
} from '../allowedUsers';

describe('TypeScript Migration Step 1 Suite (v2.5.20)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('emailService', () => {
    it('loads and saves email engine configuration', () => {
      const initial = loadEmailEngineConfig();
      expect(initial.provider).toBe('apps_script');

      const saved = saveEmailEngineConfig({
        provider: 'emailjs',
        emailjsServiceId: 'service_123',
        emailjsTemplateId: 'template_456',
        emailjsPublicKey: 'pub_789'
      });
      expect(saved.provider).toBe('emailjs');
      expect(saved.emailjsServiceId).toBe('service_123');
      expect(isDirectEmailEngineConfigured(saved)).toBe(true);
    });

    it('builds valid HTML templates for onboarding, NDA, survey, and reminders', () => {
      const inviteHtml = buildOnboardingInvitationHtml({
        userName: 'שרה כהן',
        userEmail: 'sara@example.com',
        userTitle: 'גננת מובילה',
        tempPassword: 'Pass123!@'
      });
      expect(inviteHtml).toContain('שרה כהן');
      expect(inviteHtml).toContain('sara@example.com');
      expect(inviteHtml).toContain('Pass123!@');

      const ndaHtml = buildSignedNdaDocumentHtml({
        signerName: 'יוסי כהן',
        signerEmail: 'yossi@example.com',
        signerIdNumber: '012345678',
        signatureText: 'יוסי כהן'
      });
      expect(ndaHtml).toContain('יוסי כהן');
      expect(ndaHtml).toContain('012345678');

      const surveyHtml = buildUserSurveyEmailHtml({
        userName: 'רחל לוי',
        ratings: { easeOfWebsite: 5, generateGoals: 5 }
      });
      expect(surveyHtml).toContain('רחל לוי');
      expect(surveyHtml).toContain('(5/5)');

      const reminderHtml = buildPedagogicalReminderEmailHtml({
        teacherName: 'מיכל ישראלי',
        totalStudents: 3,
        gaps: [{ studentName: 'דניאל', daysSinceObservation: 48 }]
      });
      expect(reminderHtml).toContain('מיכל ישראלי');
      expect(reminderHtml).toContain('דניאל');
    });
  });

  describe('firebaseBackend', () => {
    it('returns default active config and parses console config input', () => {
      const config = getActiveFirebaseConfig();
      expect(config).not.toBeNull();
      expect(config?.projectId).toBe('tala-d9aaa');

      const parsed = parseFirebaseConfigInput(JSON.stringify({
        apiKey: 'AIzaSyFakeKey123456789',
        projectId: 'custom-proj-999'
      }));
      expect(parsed?.apiKey).toBe('AIzaSyFakeKey123456789');
      expect(parsed?.projectId).toBe('custom-proj-999');
    });

    it('sanitizes undefined properties for Firestore safety', () => {
      expect(sanitizeForFirestore(undefined)).toBeNull();
      const dirty = { name: 'Student', age: undefined, details: { address: undefined, note: 'valid' } };
      const cleaned = sanitizeForFirestore(dirty);
      expect(cleaned.name).toBe('Student');
      expect(cleaned.age).toBeUndefined();
      expect(cleaned.details.address).toBeUndefined();
      expect(cleaned.details.note).toBe('valid');
    });
  });

  describe('studentStage & goalBankData', () => {
    it('infers stages and canonicalizes environments correctly', () => {
      expect(canonicalizeEnvironment('חצר')).toBe('חצר');
      const kdgEnvs = getCanonicalEnvironmentsForStage('kindergarten');
      expect(kdgEnvs).toContain('חצר');

      expect(hasKindergarten('ילד בגן חובה')).toBe(true);
      expect(hasSchool('תלמיד בכיתה ב')).toBe(true);
      const stageInfo = detectStudentStage({ educationalFramework: 'גן חובה' });
      expect(stageInfo.stage).toBe('kindergarten');
    });

    it('manages goal bank storage and classification', () => {
      const initialBank = loadGoalBank();
      expect(initialBank.length).toBeGreaterThan(0);

      const sorted = getSortedGoalBank(initialBank);
      expect(sorted.length).toBe(initialBank.length);

      const customBank = [{ id: 'test_1', title: 'מטרה לבדיקה', environment: 'חצר', stages: ['kindergarten'] }];
      saveGoalBank(customBank as any);
      expect(loadGoalBank().some((g) => g.id === 'test_1')).toBe(true);
    });
  });

  describe('allowedUsers & administration', () => {
    it('loads and checks user roles and trial status', () => {
      const users = loadAllowedUsers();
      expect(Array.isArray(users)).toBe(true);

      expect(isUserAdmin({ email: 'zivit.reshef@gmail.com', role: 'admin' })).toBe(true);
      expect(isUserAdmin({ email: 'teacher@school.org', role: 'teacher' })).toBe(false);

      const trialUser = {
        email: 'trial@test.com',
        isTrialUser: true,
        trialExpiresAt: new Date(Date.now() + 86400000 * 5).toISOString()
      };
      expect(isTrialUserExpired(trialUser)).toBe(false);
      expect(getTrialRemainingDays(trialUser)).toBeGreaterThan(0);
    });
  });

  describe('DailyPedagogicalTracker streak calculation', () => {
    it('calculates streak based on logged observation dates', () => {
      const today = '2026-11-02';
      const students = [
        {
          id: 'st_1',
          goals: [
            {
              observations: [
                { date: '2026-11-01' },
                { date: '2026-11-02' }
              ]
            }
          ]
        }
      ];

      const streak = calculateCurrentStreak(students, today);
      expect(streak).toBeGreaterThanOrEqual(1);
    });
  });
});
