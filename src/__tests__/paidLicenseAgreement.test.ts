import { describe, it, expect } from 'vitest';
import {
  mustUserAcceptPaidLicense,
  acceptPaidLicenseForUser,
  upgradeUserToAnnualPaid,
  CURRENT_PAID_LICENSE_VERSION,
  AllowedUserRecord
} from '../allowedUsers';

describe('Paid License Agreement Domain Rules', () => {
  const baseTeacher: AllowedUserRecord = {
    id: 'u_teacher_1',
    email: 'teacher@school.org',
    name: 'ישראלה ישראלי',
    role: 'teacher',
    active: true,
    passwordSalt: 'salt123',
    passwordHash: 'hash123',
    isTrialUser: true,
    trialDays: 7
  };

  it('identifies when a user must accept the paid license', () => {
    // 1. Trial user does not need paid license
    expect(mustUserAcceptPaidLicense(baseTeacher)).toBe(false);

    // 2. Admin user never blocked by paid license
    const adminUser: AllowedUserRecord = {
      ...baseTeacher,
      role: 'admin',
      subscriptionType: 'annual_paid'
    };
    expect(mustUserAcceptPaidLicense(adminUser)).toBe(false);

    // 3. Main admin email never blocked by paid license
    const mainAdminUser: AllowedUserRecord = {
      ...baseTeacher,
      email: 'zivit.reshef@gmail.com',
      subscriptionType: 'annual_paid'
    };
    expect(mustUserAcceptPaidLicense(mainAdminUser)).toBe(false);

    // 3b. Developer / primary admin email never blocked by paid license even in non-admin roles (e.g. behavior_analyst)
    const devUser: AllowedUserRecord = {
      ...baseTeacher,
      email: 'moti_reshef@bmc.com',
      role: 'behavior_analyst',
      subscriptionType: 'annual_paid'
    };
    expect(mustUserAcceptPaidLicense(devUser)).toBe(false);

    // 4. Paid user who has not accepted license MUST accept it
    const paidUser: AllowedUserRecord = {
      ...baseTeacher,
      isTrialUser: false,
      subscriptionType: 'annual_paid',
      upgradedToPaidAt: '2026-11-13T00:00:00.000Z'
    };
    expect(mustUserAcceptPaidLicense(paidUser)).toBe(true);

    // 5. Paid user with outdated license version MUST accept new version
    const outdatedUser: AllowedUserRecord = {
      ...paidUser,
      paidLicenseAccepted: true,
      paidLicenseVersion: '0.9'
    };
    expect(mustUserAcceptPaidLicense(outdatedUser)).toBe(true);

    // 6. Paid user who accepted current version does NOT need to accept
    const acceptedUser: AllowedUserRecord = {
      ...paidUser,
      paidLicenseAccepted: true,
      paidLicenseVersion: CURRENT_PAID_LICENSE_VERSION,
      paidLicenseAcceptedAt: '2026-11-13T00:05:00.000Z'
    };
    expect(mustUserAcceptPaidLicense(acceptedUser)).toBe(false);
  });

  it('accepts paid license and stamps user record properly', () => {
    const paidUser: AllowedUserRecord = {
      ...baseTeacher,
      isTrialUser: false,
      subscriptionType: 'annual_paid'
    };

    const fixedDate = new Date('2026-11-13T10:00:00.000Z');
    const updated = acceptPaidLicenseForUser(paidUser, fixedDate);

    expect(updated.paidLicenseAccepted).toBe(true);
    expect(updated.paidLicenseAcceptedAt).toBe(fixedDate.toISOString());
    expect(updated.paidLicenseVersion).toBe(CURRENT_PAID_LICENSE_VERSION);
    expect(mustUserAcceptPaidLicense(updated)).toBe(false);
  });

  it('resets paid license acceptance when upgrading user to annual paid', () => {
    const upgraded = upgradeUserToAnnualPaid(baseTeacher, new Date('2026-11-13T12:00:00.000Z'));
    expect(upgraded.isTrialUser).toBe(false);
    expect(upgraded.subscriptionType).toBe('annual_paid');
    expect(upgraded.paidLicenseAccepted).toBe(false);
    expect(upgraded.paidLicenseAcceptedAt).toBeNull();
    expect(upgraded.paidLicenseVersion).toBeNull();
    expect(mustUserAcceptPaidLicense(upgraded)).toBe(true);
  });

  it('ensures cloud function SELF_FIELDS preserves paid license fields for non-admin self-updates', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const functionsIndexPath = path.resolve(__dirname, '../../functions/index.js');
    const fileContent = fs.readFileSync(functionsIndexPath, 'utf-8');

    // Extract SELF_FIELDS declaration
    const match = fileContent.match(/const\s+SELF_FIELDS\s*=\s*(\[[^\]]+\]);/);
    expect(match).not.toBeNull();

    const rawArrayString = match![1];
    expect(rawArrayString).toContain('"paidLicenseAccepted"');
    expect(rawArrayString).toContain('"paidLicenseAcceptedAt"');
    expect(rawArrayString).toContain('"paidLicenseVersion"');

    // Simulate Cloud Function non-admin self-update sanitization
    const selfFields: string[] = JSON.parse(rawArrayString);
    const pick = (o: Record<string, any>, keys: string[]) => {
      const r: Record<string, any> = {};
      for (const k of keys) {
        if (o && k in o) r[k] = o[k];
      }
      return r;
    };

    const teacherUpdate = {
      email: 'teacher@school.org',
      role: 'admin', // Malicious elevation attempt: must be stripped
      active: true, // System flag: must be stripped
      paidLicenseAccepted: true,
      paidLicenseAcceptedAt: '2026-11-15T20:00:00.000Z',
      paidLicenseVersion: '1.0'
    };

    const sanitizedPatch = pick(teacherUpdate, selfFields);
    expect(sanitizedPatch.paidLicenseAccepted).toBe(true);
    expect(sanitizedPatch.paidLicenseAcceptedAt).toBe('2026-11-15T20:00:00.000Z');
    expect(sanitizedPatch.paidLicenseVersion).toBe('1.0');
    expect(sanitizedPatch.role).toBeUndefined();
    expect(sanitizedPatch.active).toBeUndefined();
  });
});
