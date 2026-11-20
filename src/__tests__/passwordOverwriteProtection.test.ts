import { describe, it, expect } from 'vitest';
import { mergeAdminUsersSafely, createPasswordCredentials, reconcileCloudUsersWithLocal } from '../allowedUsers';
import fs from 'fs';
import path from 'path';

describe('Password overwrite protection', () => {
  const adminUser: any = {
    id: 'u_admin_1',
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף',
    role: 'admin',
    active: true,
    subscriptionType: 'annual_paid',
    ...createPasswordCredentials('AdminSecret123!', 'admin_salt_1234')
  };

  const teacherWithCustomPw: any = {
    id: 'u_teacher_michal',
    email: 'michal@school.org.il',
    name: 'מיכל כהן',
    role: 'teacher',
    group: 'מתי״א שרון',
    title: 'מורת שילוב',
    active: true,
    subscriptionType: 'annual_paid',
    mustChangePassword: false,
    ...createPasswordCredentials('MyPersonalSecret2026!', 'michal_custom_salt')
  };

  it('ignores incoming stale password when an admin edits user details (name, role, group, title)', () => {
    const stored = [adminUser, teacherWithCustomPw];

    // Admin tab has a stale copy where Michal still had default TALA2026 hash
    const defaultCreds = createPasswordCredentials('TALA2026', 'default_salt');
    const adminIncomingEdit = {
      ...teacherWithCustomPw,
      name: 'מיכל כהן (מעודכן)',
      title: 'מדריכת מתי״א בכירה',
      group: 'מתי״א מרכז',
      ...defaultCreds
    };

    const result = mergeAdminUsersSafely(stored, [adminUser, adminIncomingEdit]);
    const mergedMichal = result.find((u) => u.email === 'michal@school.org.il');

    // Details are updated
    expect(mergedMichal?.name).toBe('מיכל כהן (מעודכן)');
    expect(mergedMichal?.title).toBe('מדריכת מתי״א בכירה');
    expect(mergedMichal?.group).toBe('מתי״א מרכז');

    // Passwords MUST NOT be overwritten (remains Michal's custom password)
    expect(mergedMichal?.passwordHash).toBe(teacherWithCustomPw.passwordHash);
    expect(mergedMichal?.passwordSalt).toBe(teacherWithCustomPw.passwordSalt);
    expect(mergedMichal?.passwordHash).not.toBe(defaultCreds.passwordHash);
  });

  it('does not let a previous explicit password update leak into a later profile edit from the same tab', () => {
    const stored = [adminUser, teacherWithCustomPw];

    // 1st update: intentional password change via updatedPasswordEmails
    const newCreds = createPasswordCredentials('NewPass123!', 'salt_1');
    const incoming1 = {
      ...teacherWithCustomPw,
      ...newCreds
    };
    const afterFirstSave = mergeAdminUsersSafely(
      stored,
      [adminUser, incoming1],
      [],
      ['michal@school.org.il']
    );
    expect(afterFirstSave.find((u) => u.email === 'michal@school.org.il')?.passwordHash).toBe(newCreds.passwordHash);

    // Meanwhile, user Michal updates her password again in the cloud
    const cloudLatestCreds = createPasswordCredentials('MichalEvenNewerSecret!', 'salt_2');
    const cloudStoredState = afterFirstSave.map((u) =>
      u.email === 'michal@school.org.il'
        ? { ...u, ...cloudLatestCreds }
        : u
    );

    // 2nd update: Admin from the same tab edits Michal's title (without updatedPasswordEmails)
    const adminSubsequentEdit = {
      ...incoming1, // has old newCreds from earlier
      title: 'מנהלת צוות'
    };
    const afterSecondSave = mergeAdminUsersSafely(
      cloudStoredState,
      [adminUser, adminSubsequentEdit],
      [],
      [] // No password change requested on this second save!
    );

    const finalMichal = afterSecondSave.find((u) => u.email === 'michal@school.org.il');
    expect(finalMichal?.title).toBe('מנהלת צוות');
    // MUST keep cloudLatestCreds, NOT newCreds from the previous save!
    expect(finalMichal?.passwordHash).toBe(cloudLatestCreds.passwordHash);
    expect(finalMichal?.passwordSalt).toBe(cloudLatestCreds.passwordSalt);
  });

  describe('reconcileCloudUsersWithLocal (cloud password heal)', () => {
    const me = 'michal@school.org.il';
    const defaultCloud = { ...teacherWithCustomPw, ...createPasswordCredentials('TALA2026', 'cloud_default_salt') };
    const base = { nowMs: 1_000_000, recentLocalUpdates: new Map() };

    it('heals the signed-in user default cloud password with the local custom one and reports the email', () => {
      const { users, healedPasswordEmails } = reconcileCloudUsersWithLocal({
        ...base,
        cloudUsers: [adminUser, defaultCloud],
        localUsers: [adminUser, teacherWithCustomPw],
        currentUserEmail: '  Michal@School.org.il '
      });
      const healed = users.find((u) => u.email === me);
      expect(healed?.passwordHash).toBe(teacherWithCustomPw.passwordHash);
      expect(healed?.passwordSalt).toBe(teacherWithCustomPw.passwordSalt);
      expect(healed?.lockedOut).toBe(false);
      expect(healed?.failedLoginAttempts).toBe(0);
      expect(healedPasswordEmails).toEqual([me]);
    });

    it('never heals another user password', () => {
      const { users, healedPasswordEmails } = reconcileCloudUsersWithLocal({
        ...base,
        cloudUsers: [adminUser, defaultCloud],
        localUsers: [adminUser, teacherWithCustomPw],
        currentUserEmail: adminUser.email
      });
      expect(users.find((u) => u.email === me)?.passwordHash).toBe(defaultCloud.passwordHash);
      expect(healedPasswordEmails).toEqual([]);
    });

    it('does not heal when the cloud password is already custom or the local one is default', () => {
      const cloudCustom = reconcileCloudUsersWithLocal({
        ...base,
        cloudUsers: [{ ...teacherWithCustomPw, ...createPasswordCredentials('Other!', 's') }],
        localUsers: [teacherWithCustomPw],
        currentUserEmail: me
      });
      expect(cloudCustom.healedPasswordEmails).toEqual([]);

      const localDefault = reconcileCloudUsersWithLocal({
        ...base,
        cloudUsers: [defaultCloud],
        localUsers: [{ ...teacherWithCustomPw, ...createPasswordCredentials('1234', 's') }],
        currentUserEmail: me
      });
      expect(localDefault.healedPasswordEmails).toEqual([]);
      expect(localDefault.users[0].passwordHash).toBe(defaultCloud.passwordHash);
    });

    it('does nothing without a signed-in user', () => {
      const { users, healedPasswordEmails } = reconcileCloudUsersWithLocal({
        ...base,
        cloudUsers: [defaultCloud],
        localUsers: [teacherWithCustomPw],
        currentUserEmail: null
      });
      expect(users[0]).toBe(defaultCloud);
      expect(healedPasswordEmails).toEqual([]);
    });

    it('keeps a local edit made within the recent window and drops it after', () => {
      const recentLocalUpdates = new Map([[me, { timeMs: 1_000_000, user: { ...defaultCloud, title: 'עריכה מקומית' } }]]);
      const args = { cloudUsers: [defaultCloud], localUsers: [teacherWithCustomPw], currentUserEmail: adminUser.email, recentLocalUpdates };

      const inside = reconcileCloudUsersWithLocal({ ...args, nowMs: 1_000_000 + 14_999 });
      expect(inside.users[0].title).toBe('עריכה מקומית');

      const after = reconcileCloudUsersWithLocal({ ...args, nowMs: 1_000_000 + 15_000 });
      expect(after.users[0].title).toBe(defaultCloud.title);
    });
  });

  it('preserves stored mustChangePassword on a non-password edit', () => {
    const storedUserMustChange = {
      ...teacherWithCustomPw,
      mustChangePassword: true
    };
    const stored = [adminUser, storedUserMustChange];

    const incoming = {
      ...teacherWithCustomPw,
      name: 'מיכל כהן מעודכנת',
      mustChangePassword: false // stale client thinks false
    };

    const result = mergeAdminUsersSafely(stored, [adminUser, incoming], [], []);
    const merged = result.find((u) => u.email === 'michal@school.org.il');
    // Stored mustChangePassword is preserved when not explicitly reset
    expect(merged?.mustChangePassword).toBe(true);

    // Stored key present but undefined: incoming value wins (matches server `!==undefined` check)
    const storedUndefined = { ...teacherWithCustomPw, mustChangePassword: undefined };
    const r2 = mergeAdminUsersSafely([adminUser, storedUndefined], [adminUser, { ...teacherWithCustomPw, mustChangePassword: true }], [], []);
    expect(r2.find((u) => u.email === 'michal@school.org.il')?.mustChangePassword).toBe(true);
  });

  it('ignores incoming passwords when an admin resets daily AI quota', () => {
    const stored = [adminUser, teacherWithCustomPw];

    const adminQuotaReset = {
      ...teacherWithCustomPw,
      dailyAiUsageCount: 0,
      dailyAiUsageDate: '2026-11-20',
      passwordHash: 'stale_quota_hash',
      passwordSalt: 'stale_quota_salt'
    };

    const result = mergeAdminUsersSafely(stored, [adminUser, adminQuotaReset], [], []);
    const mergedMichal = result.find((u) => u.email === 'michal@school.org.il');

    expect(mergedMichal?.dailyAiUsageCount).toBe(0);
    expect(mergedMichal?.passwordHash).toBe(teacherWithCustomPw.passwordHash);
    expect(mergedMichal?.passwordSalt).toBe(teacherWithCustomPw.passwordSalt);
  });

  it('updates password when user email is passed in updatedPasswordEmails parameter', () => {
    const stored = [adminUser, teacherWithCustomPw];

    const newCreds = createPasswordCredentials('AnotherPassword321!', 'another_salt');
    const incoming = {
      ...teacherWithCustomPw,
      ...newCreds,
      mustChangePassword: false
    };

    const result = mergeAdminUsersSafely(
      stored,
      [adminUser, incoming],
      [],
      ['michal@school.org.il']
    );
    const mergedMichal = result.find((u) => u.email === 'michal@school.org.il');

    expect(mergedMichal?.passwordHash).toBe(newCreds.passwordHash);
    expect(mergedMichal?.passwordSalt).toBe(newCreds.passwordSalt);
  });

  it('accepts credentials for newly created users', () => {
    const stored = [adminUser];
    const initialCreds = createPasswordCredentials('Temp1234!', 'new_salt');
    const newUser = {
      id: 'u_new_user',
      email: 'newuser@school.org.il',
      name: 'מורה חדשה לגמרי',
      role: 'teacher',
      ...initialCreds
    };

    const result = mergeAdminUsersSafely(stored, [adminUser, newUser]);
    const mergedNewUser = result.find((u) => u.email === 'newuser@school.org.il');

    expect(mergedNewUser).toBeDefined();
    expect(mergedNewUser?.passwordHash).toBe(initialCreds.passwordHash);
    expect(mergedNewUser?.passwordSalt).toBe(initialCreds.passwordSalt);
  });

  it('verifies cloud function index.js contains mergeAdminUsersSafely with updatedPasswordEmails argument', () => {
    const indexPath = path.resolve(__dirname, '../../functions/index.js');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('function mergeAdminUsersSafely');
    expect(content).toContain('updatedPasswordEmails');
    expect(content).toContain('isExplicitPasswordUpdate=updatedPwSet.has(emailKey)');
  });
});
