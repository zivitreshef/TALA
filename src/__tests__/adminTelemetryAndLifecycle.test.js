import { describe, it, expect, beforeEach } from 'vitest';
import {
  extendUserTrial,
  upgradeUserToAnnualPaid,
  isPaidUserExpired,
  getPaidRemainingDays,
  getUserSubscriptionStatus,
  renameUserGroupInList,
  computeGroupStats,
  getDailyQuotaCount,
  incrementDailyQuotaCount,
  recordAiTelemetryForUser,
  DAILY_AI_QUOTA_LIMIT,
  DAILY_EMAIL_QUOTA_LIMIT,
  classifyUserGroup,
  sortUsersList
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

      expect(content).toContain('AdminUsageAndSecurityDashboard');
      expect(content).toContain('סה"כ שאילתות AI (מצטבר)');
      expect(content).toContain('שימושי AI (מצטבר)');
    });

    describe('Paying Customer Enhancements in Help Modal (TALA)', () => {
      it('calculates getPaidRemainingDays correctly for various user states', () => {
        const now = new Date('2026-10-23T12:00:00.000Z');

        // Paid user with paidExpiresAt 60 days ahead
        const userWithExp = {
          isTrialUser: false,
          subscriptionType: 'annual_paid',
          paidExpiresAt: '2026-12-22T12:00:00.000Z'
        };
        expect(getPaidRemainingDays(userWithExp, now)).toBe(60);

        // Admin user has Infinity
        const adminUser = { role: 'admin', isTrialUser: false };
        expect(getPaidRemainingDays(adminUser, now)).toBe(Infinity);

        const zivitUser = { email: 'zivit.reshef@gmail.com', isTrialUser: false };
        expect(getPaidRemainingDays(zivitUser, now)).toBe(Infinity);

        // Trial user returns null
        const trialUser = { isTrialUser: true, trialExpiresAt: '2026-10-30T00:00:00.000Z' };
        expect(getPaidRemainingDays(trialUser, now)).toBeNull();

        // Fallback for active paid user without explicit date
        const activePaid = { isTrialUser: false, active: true };
        expect(getPaidRemainingDays(activePaid, now)).toBe(365);
      });

      it('verifies TrialUpgradeModal includes renewal counter under active paid banner', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const modalContent = fs.readFileSync(
          path.resolve(__dirname, '../components/modals/TrialUpgradeModal.jsx'),
          'utf-8'
        );

        expect(modalContent).toContain('מנוי שנתי פעיל – מערכת TALA 🌷');
        expect(modalContent).toContain('נותרו עוד ${resolvedPaidRemainingDays} ימים לחידוש המנוי');
        expect(modalContent).toContain('חשבון מנהל (ללא הגבלת זמן)');
      });

      it('verifies TrialUpgradeModal includes minor RFE section and categories', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const modalContent = fs.readFileSync(
          path.resolve(__dirname, '../components/modals/TrialUpgradeModal.jsx'),
          'utf-8'
        );

        expect(modalContent).toContain('הצעות ייעול ושיפורים (RFE)');
        expect(modalContent).toContain('קטגוריית השיפור / ההצעה:');
        expect(modalContent).toContain('שיפור בטופס תל"א / תח"י');
        expect(modalContent).toContain('מאגר מטרות ויעדים');
        expect(modalContent).toContain('שליחת הצעת שיפור');
      });

      it('verifies TrialUpgradeModal includes comprehensive Fair Use policy with student and AI limits', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const modalContent = fs.readFileSync(
          path.resolve(__dirname, '../components/modals/TrialUpgradeModal.jsx'),
          'utf-8'
        );

        expect(modalContent).toContain('הסכם רישיון שימוש ומדיניות "שימוש נאות" (Fair Use)');
        expect(modalContent).toContain('1. רישיון אישי למורה / גננת (פר משתמשת)');
        expect(modalContent).toContain('איסור שיתוף פרטי גישה ואיסור אספקת דוחות לגורמי צד שלישי');
        expect(modalContent).toContain('3. מגבלות שימוש נאות (מכסת תלמידים ומכסת בינה מלאכותית)');
        expect(modalContent).toContain('עד 35 תלמידים פעילים בשנה');
        expect(modalContent).toContain('עד 20 שאילתות AI לתלמיד בשנה');
        expect(modalContent).toContain('איסור הנדסה לאחור (Reverse Engineering)');
        expect(modalContent).toContain('זכויות יוצרים וקניין רוחני');
      });

      it('verifies TrialUpgradeModal includes iPad/iPhone shortcut guide via Safari', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const modalContent = fs.readFileSync(
          path.resolve(__dirname, '../components/modals/TrialUpgradeModal.jsx'),
          'utf-8'
        );

        expect(modalContent).toContain('קיצור לאייפד / אייפון');
        expect(modalContent).toContain('איך להוסיף קיצור דרך של TALA למסך הבית באייפד ובאייפון');
        expect(modalContent).toContain('אין צורך להתחבר מראש עם שם וסיסמה');
        expect(modalContent).toContain('Safari');
        expect(modalContent).toContain('שיתוף');
        expect(modalContent).toContain('הוספה למסך הבית');
      });
    });

    describe('User Group Classification (classifyUserGroup)', () => {
      const now = new Date('2026-10-15T12:00:00.000Z');

      it('classifies admin accounts as admins', () => {
        expect(classifyUserGroup({ email: 'zivit.reshef@gmail.com', role: 'teacher' }, now)).toBe('admins');
        expect(classifyUserGroup({ email: 'admin@tala.org', role: 'admin' }, now)).toBe('admins');
      });

      it('classifies active paid subscribers as paying', () => {
        const paidUser = { email: 'paid@test.com', active: true, subscriptionType: 'annual_paid', paidExpiresAt: '2027-01-01T00:00:00.000Z' };
        expect(classifyUserGroup(paidUser, now)).toBe('paying');
      });

      it('classifies active trial accounts as trials', () => {
        const trialUser = { email: 'trial@test.com', active: true, isTrialUser: true, trialExpiresAt: '2026-10-25T00:00:00.000Z' };
        expect(classifyUserGroup(trialUser, now)).toBe('trials');
      });

      it('classifies expired trial, expired paid, disabled, and locked_out as expired_disabled', () => {
        const expiredTrial = { email: 'et@test.com', active: true, isTrialUser: true, trialExpiresAt: '2026-10-01T00:00:00.000Z' };
        const expiredPaid = { email: 'ep@test.com', active: true, subscriptionType: 'annual_paid', paidExpiresAt: '2026-10-01T00:00:00.000Z' };
        const disabled = { email: 'dis@test.com', active: false };
        const locked = { email: 'lock@test.com', active: true, lockedOut: true };

        expect(classifyUserGroup(expiredTrial, now)).toBe('expired_disabled');
        expect(classifyUserGroup(expiredPaid, now)).toBe('expired_disabled');
        expect(classifyUserGroup(disabled, now)).toBe('expired_disabled');
        expect(classifyUserGroup(locked, now)).toBe('expired_disabled');
      });
    });

    describe('User Directory Sorting (sortUsersList)', () => {
      const now = new Date('2026-10-15T12:00:00.000Z');
      const testUsers = [
        { id: '1', name: 'רונית כהן', email: 'ronit@test.com', group: 'מתי״א דרום', isTrialUser: true, trialExpiresAt: '2026-10-20T00:00:00.000Z', active: true },
        { id: '2', name: 'אבי לוי', email: 'avi@test.com', group: 'מתי״א מרכז', isTrialUser: false, active: true },
        { id: '3', name: 'דנה ישראלי', email: 'dana@test.com', group: 'מתי״א צפון', isTrialUser: true, trialExpiresAt: '2026-10-10T00:00:00.000Z', active: true }
      ];
      const studentMap = new Map([
        ['ronit@test.com', 10],
        ['avi@test.com', 25],
        ['dana@test.com', 2]
      ]);

      it('sorts by name with Hebrew alphabetical order', () => {
        const asc = sortUsersList(testUsers, 'name', 'asc');
        expect(asc.map(u => u.name)).toEqual(['אבי לוי', 'דנה ישראלי', 'רונית כהן']);

        const desc = sortUsersList(testUsers, 'name', 'desc');
        expect(desc.map(u => u.name)).toEqual(['רונית כהן', 'דנה ישראלי', 'אבי לוי']);
      });

      it('sorts by email ascending and descending', () => {
        const asc = sortUsersList(testUsers, 'email', 'asc');
        expect(asc.map(u => u.email)).toEqual(['avi@test.com', 'dana@test.com', 'ronit@test.com']);
      });

      it('sorts by capacity (student count)', () => {
        const asc = sortUsersList(testUsers, 'capacity', 'asc', studentMap);
        expect(asc.map(u => u.email)).toEqual(['dana@test.com', 'ronit@test.com', 'avi@test.com']);

        const desc = sortUsersList(testUsers, 'capacity', 'desc', studentMap);
        expect(desc.map(u => u.email)).toEqual(['avi@test.com', 'ronit@test.com', 'dana@test.com']);
      });

      it('sorts by status weight', () => {
        const desc = sortUsersList(testUsers, 'status', 'desc', studentMap, now);
        // Active paid (avi) > active trial (ronit) > expired trial (dana)
        expect(desc[0].email).toBe('avi@test.com');
        expect(desc[1].email).toBe('ronit@test.com');
        expect(desc[2].email).toBe('dana@test.com');
      });

      it('returns unchanged copy if sortField or sortDirection is invalid', () => {
        const unsorted = sortUsersList(testUsers, null, null);
        expect(unsorted).toEqual(testUsers);
      });
    });

    describe('Admin Control Center Layout & Modal Resizing Guard', () => {
      it('verifies AdminAllowlistModal has fixed height preventing layout shifts across tabs', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const modalContent = fs.readFileSync(
          path.resolve(__dirname, '../components/modals/AdminAllowlistModal.jsx'),
          'utf-8'
        );

        expect(modalContent).toContain('height: \'86vh\'');
        expect(modalContent).toContain('minHeight: \'640px\'');
      });

      it('verifies AdminAllowlistModal includes user group sub-tabs and sortable headers', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const modalContent = fs.readFileSync(
          path.resolve(__dirname, '../components/modals/AdminAllowlistModal.jsx'),
          'utf-8'
        );

        expect(modalContent).toContain('כל המשתמשים');
        expect(modalContent).toContain('מנהלי מערכת');
        expect(modalContent).toContain('מנויים משלמים');
        expect(modalContent).toContain('משתמשי ניסיון');
        expect(modalContent).toContain('פגי תוקף ומושבתים');
        expect(modalContent).toContain('תלמידים (Capacity)');
        expect(modalContent).toContain('handleSortToggle');
        expect(modalContent).toContain('renderSortIndicator');
        expect(modalContent).not.toContain('🤖 {aiCalls} פניות AI');
      });
    });
  });
});

