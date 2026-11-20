import { describe, it, expect, vi } from 'vitest';
import { mergeAdminUsersSafely } from '../allowedUsers';
import { saveAllowedUsersToCloud } from '../firebaseBackend';
import fs from 'fs';
import path from 'path';

describe('Allowed Users Stale Overwrite Protection (Architecture & Cloud Integrity)', () => {
  const baseAdmin: any = {
    id: 'u_admin',
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף',
    role: 'admin',
    active: true,
    isTrialUser: false,
    subscriptionType: 'annual_paid'
  };

  const saraHindi: any = {
    id: 'u_sara_hindi',
    email: 'sarale4579@gmail.com',
    name: 'שרה הינדי',
    role: 'teacher',
    group: 'מתי״א ראש העין',
    active: true,
    isTrialUser: false,
    subscriptionType: 'annual_paid',
    paidExpiresAt: '2027-11-16T00:00:00.000Z',
    upgradedToPaidAt: '2026-11-15T10:00:00.000Z'
  };

  const anafa: any = {
    id: 'u_anafa',
    email: '1000300595@educ.org.il',
    name: 'אנפה יהודה לוי',
    role: 'teacher',
    group: 'מתי״א ראש העין',
    active: true,
    isTrialUser: false,
    subscriptionType: 'annual_paid',
    paidExpiresAt: '2027-11-16T00:00:00.000Z',
    upgradedToPaidAt: '2026-11-15T10:00:00.000Z',
    passwordSalt: '7e2c9fda2d2c33646071f11e5c8af3f0',
    passwordHash: '5ae8a62a94122a7400a87ce5613ad691d0d4b5cc9fdb3f71cb7d6eab3c64a252',
    lockedOut: false,
    failedLoginAttempts: 0
  };

  it('preserves existing users in stored that were missing from incoming (stale tab prevention)', () => {
    const stored = [baseAdmin, saraHindi, anafa];
    // Stale tab that only knows about admin and anafa, but doesn't have Sara Hindi
    const incomingStale = [baseAdmin, anafa];

    const result = mergeAdminUsersSafely(stored, incomingStale);

    expect(result).toHaveLength(3);
    const foundSara = result.find((u) => u.email === 'sarale4579@gmail.com');
    expect(foundSara).toBeDefined();
    expect(foundSara?.name).toBe('שרה הינדי');
    expect(foundSara?.subscriptionType).toBe('annual_paid');
  });

  it('allows explicit deletion when user email is passed in deletedEmails', () => {
    const stored = [baseAdmin, saraHindi, anafa];
    const incomingAfterDelete = [baseAdmin, anafa];

    const result = mergeAdminUsersSafely(stored, incomingAfterDelete, ['sarale4579@gmail.com']);

    expect(result).toHaveLength(2);
    expect(result.some((u) => u.email === 'sarale4579@gmail.com')).toBe(false);
  });

  it('prevents stale downgrade of an annual paid subscriber to trial', () => {
    const stored = [baseAdmin, anafa]; // Anafa is annual_paid in cloud
    // Stale tab sends an old record where Anafa was still marked as trial
    const staleAnafa = {
      ...anafa,
      isTrialUser: true,
      subscriptionType: 'trial',
      trialExpiresAt: '2026-10-25T16:16:38.864Z'
    };
    const incomingStale = [baseAdmin, staleAnafa];

    const result = mergeAdminUsersSafely(stored, incomingStale);

    const mergedAnafa = result.find((u) => u.email === '1000300595@educ.org.il');
    expect(mergedAnafa?.isTrialUser).toBe(false);
    expect(mergedAnafa?.subscriptionType).toBe('annual_paid');
    expect(mergedAnafa?.paidExpiresAt).toBe('2027-11-16T00:00:00.000Z');
    expect(mergedAnafa?.trialExpiresAt).toBeNull();
  });

  it('preserves custom password hash and salt if incoming sends blank or omitted password', () => {
    const stored = [baseAdmin, anafa];
    const incomingWithoutPw = {
      ...anafa,
      name: 'אנפה יהודה לוי (מעודכן)',
      passwordHash: '',
      passwordSalt: ''
    };

    const result = mergeAdminUsersSafely(stored, [baseAdmin, incomingWithoutPw]);
    const mergedAnafa = result.find((u) => u.email === '1000300595@educ.org.il');
    expect(mergedAnafa?.name).toBe('אנפה יהודה לוי (מעודכן)');
    expect(mergedAnafa?.passwordHash).toBe('5ae8a62a94122a7400a87ce5613ad691d0d4b5cc9fdb3f71cb7d6eab3c64a252');
    expect(mergedAnafa?.passwordSalt).toBe('7e2c9fda2d2c33646071f11e5c8af3f0');
  });

  it('adds newly created users from incoming without dropping any existing users', () => {
    const stored = [baseAdmin, anafa];
    const newUser = {
      id: 'u_new_teacher',
      email: 'newteacher@school.org',
      name: 'מורה חדשה',
      role: 'teacher'
    };

    const result = mergeAdminUsersSafely(stored, [baseAdmin, anafa, newUser]);
    expect(result).toHaveLength(3);
    expect(result.some((u) => u.email === 'newteacher@school.org')).toBe(true);
  });

  it('ignores incoming stale password hash on profile updates and preserves cloud credentials (gitignore style)', () => {
    const stored = [baseAdmin, anafa];
    // Admin edited Anafa's title/group from an old tab where Anafa had a different/stale password
    const incomingStalePw = {
      ...anafa,
      title: 'מדריכת שילוב בכירה',
      passwordHash: 'stale_old_hash_from_months_ago',
      passwordSalt: 'stale_old_salt'
    };

    const result = mergeAdminUsersSafely(stored, [baseAdmin, incomingStalePw]);
    const mergedAnafa = result.find((u) => u.email === '1000300595@educ.org.il');
    expect(mergedAnafa?.title).toBe('מדריכת שילוב בכירה');
    // Stored credentials MUST be preserved, stale incoming hash ignored!
    expect(mergedAnafa?.passwordHash).toBe('5ae8a62a94122a7400a87ce5613ad691d0d4b5cc9fdb3f71cb7d6eab3c64a252');
    expect(mergedAnafa?.passwordSalt).toBe('7e2c9fda2d2c33646071f11e5c8af3f0');
  });

  it('allows password update when passwordExplicitlyUpdated is true or email in updatedPasswordEmails', () => {
    const stored = [baseAdmin, anafa];
    // Explicit password update by admin or user
    const explicitUpdate = {
      ...anafa,
      passwordHash: 'new_fresh_hash',
      passwordSalt: 'new_fresh_salt',
      passwordExplicitlyUpdated: true
    };

    const result = mergeAdminUsersSafely(stored, [baseAdmin, explicitUpdate]);
    const mergedAnafa = result.find((u) => u.email === '1000300595@educ.org.il');
    expect(mergedAnafa?.passwordHash).toBe('new_fresh_hash');
    expect(mergedAnafa?.passwordSalt).toBe('new_fresh_salt');
    expect(mergedAnafa?.passwordExplicitlyUpdated).toBeUndefined();

    // Via updatedPasswordEmails parameter
    const explicitViaParam = {
      ...anafa,
      passwordHash: 'param_fresh_hash',
      passwordSalt: 'param_fresh_salt'
    };
    const resultParam = mergeAdminUsersSafely(stored, [baseAdmin, explicitViaParam], [], ['1000300595@educ.org.il']);
    const mergedParam = resultParam.find((u) => u.email === '1000300595@educ.org.il');
    expect(mergedParam?.passwordHash).toBe('param_fresh_hash');
    expect(mergedParam?.passwordSalt).toBe('param_fresh_salt');
  });

  it('guarantees cloud function index.js implements mergeAdminUsersSafely and calls it for admin users write', () => {
    const functionsIndexPath = path.resolve(__dirname, '../../functions/index.js');
    const fileContent = fs.readFileSync(functionsIndexPath, 'utf-8');

    expect(fileContent).toContain('function mergeAdminUsersSafely');
    expect(fileContent).toContain('mergeAdminUsersSafely(stored,sub,deletedEmails,updatedPasswordEmails)');
  });

  it('passes deletedUserEmails and updatedPasswordUserEmails option through saveAllowedUsersToCloud to postConfigWrite', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      await saveAllowedUsersToCloud([baseAdmin], {
        deletedUserEmails: ['deleted@school.org'],
        updatedPasswordUserEmails: ['reset@school.org']
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('talaConfigWrite'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"updatedPasswordUserEmails":["reset@school.org"]')
        })
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
