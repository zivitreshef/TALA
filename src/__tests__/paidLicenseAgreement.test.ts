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
});
