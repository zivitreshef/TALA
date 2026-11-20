import { describe, it, expect, vi } from 'vitest';
import { mergeAdminUsersSafely, createPasswordCredentials } from '../allowedUsers';
import { saveAllowedUsersToCloud } from '../firebaseBackend';
import fs from 'fs';
import path from 'path';

describe('Gitignore-Style Password Overwrite Protection (v3.0.87)', () => {
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

  it('ignores incoming passwords when an admin toggles active/lockedOut status', () => {
    const stored = [adminUser, teacherWithCustomPw];

    const adminIncomingToggle = {
      ...teacherWithCustomPw,
      active: false,
      passwordHash: 'stale_accidental_hash',
      passwordSalt: 'stale_accidental_salt'
    };

    const result = mergeAdminUsersSafely(stored, [adminUser, adminIncomingToggle]);
    const mergedMichal = result.find((u) => u.email === 'michal@school.org.il');

    expect(mergedMichal?.active).toBe(false);
    expect(mergedMichal?.passwordHash).toBe(teacherWithCustomPw.passwordHash);
    expect(mergedMichal?.passwordSalt).toBe(teacherWithCustomPw.passwordSalt);
  });

  it('updates password when passwordExplicitlyUpdated is true (admin password reset)', () => {
    const stored = [adminUser, teacherWithCustomPw];

    const newCreds = createPasswordCredentials('FreshTempPassword987!', 'fresh_salt');
    const adminExplicitReset = {
      ...teacherWithCustomPw,
      ...newCreds,
      mustChangePassword: true,
      passwordExplicitlyUpdated: true
    };

    const result = mergeAdminUsersSafely(stored, [adminUser, adminExplicitReset]);
    const mergedMichal = result.find((u) => u.email === 'michal@school.org.il');

    expect(mergedMichal?.passwordHash).toBe(newCreds.passwordHash);
    expect(mergedMichal?.passwordSalt).toBe(newCreds.passwordSalt);
    expect(mergedMichal?.mustChangePassword).toBe(true);
    expect(mergedMichal?.passwordExplicitlyUpdated).toBeUndefined();
  });

  it('updates password when user email is passed in updatedPasswordEmails parameter', () => {
    const stored = [adminUser, teacherWithCustomPw];

    const newCreds = createPasswordCredentials('AnotherPassword321!', 'another_salt');
    const incomingWithoutFlag = {
      ...teacherWithCustomPw,
      ...newCreds,
      mustChangePassword: false
    };

    const result = mergeAdminUsersSafely(
      stored,
      [adminUser, incomingWithoutFlag],
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

  it('forwards updatedPasswordUserEmails to cloud function write payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      await saveAllowedUsersToCloud([adminUser], {
        updatedPasswordUserEmails: ['michal@school.org.il']
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('talaConfigWrite'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"updatedPasswordUserEmails":["michal@school.org.il"]')
        })
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('verifies cloud function index.js implements the gitignore-style password protection', () => {
    const indexPath = path.resolve(__dirname, '../../functions/index.js');
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('const storedHasCreds=Boolean(stored.passwordHash&&stored.passwordSalt)');
    expect(content).toContain('const isExplicitPasswordUpdate=Boolean(inc.passwordExplicitlyUpdated===true||updatedPwSet.has(emailKey))');
    expect(content).toContain('if(storedHasCreds&&!isExplicitPasswordUpdate)');
    expect(content).toContain('delete merged.passwordExplicitlyUpdated');
  });
});
