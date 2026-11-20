import { describe, it, expect, vi } from 'vitest';
import { mergeAdminUsersSafely, createPasswordCredentials } from '../allowedUsers';
import { saveAllowedUsersToCloud } from '../firebaseBackend';
import fs from 'fs';
import path from 'path';

describe('Explicit Password Update and Overwrite Protection Suite (v3.0.88)', () => {
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

  it('Finding 1 regression guard: successive updates from the same tab never resurrect an overwrite', () => {
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

  it('Finding 2 regression guard: saveAllowedUsersToCloud passes updatedPasswordUserEmails during cloud healing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      // Simulating cloud healing in App.tsx:
      const currentUserEmail = 'teacher@tala.edu.il';
      await saveAllowedUsersToCloud([adminUser], {
        updatedPasswordUserEmails: [currentUserEmail]
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('talaConfigWrite'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"updatedPasswordUserEmails":["teacher@tala.edu.il"]')
        })
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('Finding 3 regression guard: preserves mustChangePassword consistently when defined', () => {
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
