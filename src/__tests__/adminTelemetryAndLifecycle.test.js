import { describe, it, expect, beforeEach } from 'vitest';
import {
  extendUserTrial,
  upgradeUserToAnnualPaid,
  isPaidUserExpired,
  getUserSubscriptionStatus,
  renameUserGroupInList,
  computeGroupStats,
  getDailyQuotaCount,
  incrementDailyQuotaCount,
  recordAiTelemetryForUser,
  DAILY_AI_QUOTA_LIMIT,
  DAILY_EMAIL_QUOTA_LIMIT
} from '../allowedUsers.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

describe('Admin Telemetry & User Lifecycle Domain Logic', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });


  describe('Trial Extension (extendUserTrial)', () => {
    it('extends an active trial by 7 additional days from its current expiration date', () => {
      const now = new Date('2026-10-14T10:00:00.000Z');
      const activeUser = {
        id: 'u1',
        email: 'teacher1@test.com',
        isTrialUser: true,
        trialExpiresAt: '2026-10-20T10:00:00.000Z'
      };

      const updated = extendUserTrial(activeUser, 7, now);
      expect(updated.isTrialUser).toBe(true);
      expect(updated.trialExpiresAt).toBe('2026-10-27T10:00:00.000Z');
      expect(updated.trialDays).toBe(13); // 6 remaining + 7 = 13 days
    });

    it('extends an expired trial from the current date', () => {
      const now = new Date('2026-10-14T10:00:00.000Z');
      const expiredUser = {
        id: 'u2',
        email: 'teacher2@test.com',
        isTrialUser: true,
        trialExpiresAt: '2026-10-01T10:00:00.000Z' // Expired in the past
      };

      const updated = extendUserTrial(expiredUser, 14, now);
      expect(updated.isTrialUser).toBe(true);
      expect(updated.trialExpiresAt).toBe('2026-10-28T10:00:00.000Z');
      expect(updated.trialDays).toBe(14);
    });
  });

  describe('Annual Paid Upgrade & Status (upgradeUserToAnnualPaid)', () => {
    it('converts a trial user to a paying annual user with 365 days validity', () => {
      const now = new Date('2026-10-14T10:00:00.000Z');
      const trialUser = {
        id: 'u3',
        email: 'paying@test.com',
        isTrialUser: true,
        trialExpiresAt: '2026-10-15T00:00:00.000Z'
      };

      const upgraded = upgradeUserToAnnualPaid(trialUser, now);
      expect(upgraded.isTrialUser).toBe(false);
      expect(upgraded.subscriptionType).toBe('annual_paid');
      expect(upgraded.trialExpiresAt).toBeNull();
      expect(upgraded.paidExpiresAt).toBe('2027-10-14T10:00:00.000Z');
    });

    it('correctly evaluates expired vs active annual paid users', () => {
      const now = new Date('2026-10-14T10:00:00.000Z');
      const activePaid = {
        subscriptionType: 'annual_paid',
        paidExpiresAt: '2027-01-01T00:00:00.000Z'
      };
      const expiredPaid = {
        subscriptionType: 'annual_paid',
        paidExpiresAt: '2026-09-01T00:00:00.000Z'
      };

      expect(isPaidUserExpired(activePaid, now)).toBe(false);
      expect(isPaidUserExpired(expiredPaid, now)).toBe(true);
    });
  });

  describe('Subscription Status Categorization (getUserSubscriptionStatus)', () => {
    const now = new Date('2026-10-14T10:00:00.000Z');

    it('identifies admin, disabled, and locked accounts', () => {
      expect(getUserSubscriptionStatus({ email: 'zivit.reshef@gmail.com', role: 'admin' }, now)).toBe('admin');
      expect(getUserSubscriptionStatus({ active: false }, now)).toBe('disabled');
      expect(getUserSubscriptionStatus({ active: false, lockedOut: true }, now)).toBe('locked_out');
    });

    it('identifies trial_active and trial_expired', () => {
      const activeTrial = { isTrialUser: true, trialExpiresAt: '2026-10-20T00:00:00.000Z', active: true };
      const expiredTrial = { isTrialUser: true, trialExpiresAt: '2026-10-10T00:00:00.000Z', active: true };

      expect(getUserSubscriptionStatus(activeTrial, now)).toBe('trial_active');
      expect(getUserSubscriptionStatus(expiredTrial, now)).toBe('trial_expired');
    });

    it('identifies paid_active and paid_expired', () => {
      const activePaid = { active: true, subscriptionType: 'annual_paid', paidExpiresAt: '2027-01-01T00:00:00.000Z' };
      const expiredPaid = { active: true, subscriptionType: 'annual_paid', paidExpiresAt: '2026-01-01T00:00:00.000Z' };

      expect(getUserSubscriptionStatus(activePaid, now)).toBe('paid_active');
      expect(getUserSubscriptionStatus(expiredPaid, now)).toBe('paid_expired');
    });
  });

  describe('Group & Matya Management (renameUserGroupInList & computeGroupStats)', () => {
    const sampleUsers = [
      { id: '1', email: 'a@test.com', group: 'מתי״א מרכז', isTrialUser: false, aiUsageCount: 15 },
      { id: '2', email: 'b@test.com', group: 'מתי״א מרכז', isTrialUser: true, aiUsageCount: 5 },
      { id: '3', email: 'c@test.com', group: 'מתי״א צפון', isTrialUser: false, aiUsageCount: 8 }
    ];

    const sampleStudents = [
      { id: 's1', ownerEmail: 'a@test.com' },
      { id: 's2', ownerEmail: 'a@test.com' },
      { id: 's3', ownerEmail: 'b@test.com' },
      { id: 's4', ownerEmail: 'c@test.com' }
    ];

    it('renames a group across all users (bulk rename)', () => {
      const renamed = renameUserGroupInList(sampleUsers, 'מתי״א מרכז', 'מתי״א שרון-מרכז');
      expect(renamed[0].group).toBe('מתי״א שרון-מרכז');
      expect(renamed[1].group).toBe('מתי״א שרון-מרכז');
      expect(renamed[2].group).toBe('מתי״א צפון'); // untouched
    });

    it('computes accurate group stats including students, teachers and AI calls', () => {
      const stats = computeGroupStats(sampleUsers, sampleStudents);
      const centerMatya = stats.find((s) => s.name === 'מתי״א מרכז');
      const northMatya = stats.find((s) => s.name === 'מתי״א צפון');

      expect(centerMatya).toBeDefined();
      expect(centerMatya.teachersCount).toBe(2);
      expect(centerMatya.studentsCount).toBe(3);
      expect(centerMatya.aiUsageTotal).toBe(20);
      expect(centerMatya.payingCount).toBe(1);
      expect(centerMatya.trialCount).toBe(1);

      expect(northMatya.teachersCount).toBe(1);
      expect(northMatya.studentsCount).toBe(1);
    });
  });

  describe('Quota Tracking & Telemetry (AI & Email counters)', () => {
    it('tracks daily quota count with daily reset separation', () => {
      const day1 = new Date('2026-10-14T10:00:00.000Z');
      const day2 = new Date('2026-10-15T10:00:00.000Z');

      expect(getDailyQuotaCount('ai', day1)).toBe(0);
      incrementDailyQuotaCount('ai', 1, day1);
      incrementDailyQuotaCount('ai', 4, day1);
      expect(getDailyQuotaCount('ai', day1)).toBe(5);

      // On next day, counter starts fresh at 0
      expect(getDailyQuotaCount('ai', day2)).toBe(0);
    });

    it('records AI telemetry per user in users list', () => {
      const users = [
        { id: 'u1', email: 'teacher@test.com', aiUsageCount: 3 }
      ];

      const updated = recordAiTelemetryForUser('teacher@test.com', users);
      expect(updated[0].aiUsageCount).toBe(4);
      expect(updated[0].lastAiUsedAt).toBeDefined();
    });

    it('exports proper quota limits', () => {
      expect(DAILY_AI_QUOTA_LIMIT).toBe(1500);
      expect(DAILY_EMAIL_QUOTA_LIMIT).toBe(100);
    });
  });

  describe('Privacy & Contact Security (Masking Phone Number)', () => {
    it('verifies TrialUpgradeModal does not render the plain text phone number in visible labels', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../components/modals/TrialUpgradeModal.jsx'),
        'utf-8'
      );

      // Plain text visible phone number must NOT appear in visible JSX tags
      expect(content).not.toContain('(055-9236606)');
      expect(content).not.toContain('{whatsappDisplayPhone}');
    });

    it('verifies TrialUpgradeModal includes about toggle for paid users and hides letter by default', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../components/modals/TrialUpgradeModal.jsx'),
        'utf-8'
      );

      expect(content).toContain('showAboutLetter');
      expect(content).toContain('אודות TALA ואיך נולדה האפליקציה');
    });

    it('verifies TrialUpgradeModal declares all hooks before any early return to avoid React error #310', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../components/modals/TrialUpgradeModal.jsx'),
        'utf-8'
      );

      const earlyReturnIndex = content.indexOf('if (!isOpen || !currentUser) return null;');
      const showAboutLetterHookIndex = content.indexOf('useState(!isNonTrialUser)');
      expect(earlyReturnIndex).toBeGreaterThan(-1);
      expect(showAboutLetterHookIndex).toBeGreaterThan(-1);
      expect(showAboutLetterHookIndex).toBeLessThan(earlyReturnIndex);
    });

    it('verifies App.jsx uses concise "עזרה" text for the support button', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../App.jsx'),
        'utf-8'
      );

      expect(content).toContain('<span>עזרה</span>');
      expect(content).not.toContain('<span>עזרה ופנייה למנהלת</span>');
    });

    it('verifies AdminAllowlistModal clarifies daily vs cumulative AI usage', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../components/modals/AdminAllowlistModal.jsx'),
        'utf-8'
      );

      expect(content).toContain('AI יומי:');
      expect(content).toContain('סה"כ שאילתות AI (מצטבר)');
      expect(content).toContain('שימושי AI (מצטבר)');
    });
  });
});

