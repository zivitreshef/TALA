import { describe, it, expect } from 'vitest';
import {
  isUserAdmin,
  getUserSubscriptionStatus,
  mustUserAcceptPaidLicense,
  getPaidRemainingDays,
  type AllowedUserRecord
} from '../allowedUsers';
import { isUserAdmin as isUserAdminFromDashboard } from '../components/admin/AdminAnalyticsDashboard';

describe('Admin Privileges & Button Visibility for Primary Admins', () => {
  it('identifies moti_reshef@bmc.com as an admin even when assigned behavior_analyst role', () => {
    const user: Partial<AllowedUserRecord> = {
      email: 'moti_reshef@bmc.com',
      role: 'behavior_analyst',
      name: 'מוטי רשף'
    };

    expect(isUserAdmin(user)).toBe(true);
    expect(isUserAdminFromDashboard(user)).toBe(true);
    expect(getUserSubscriptionStatus(user)).toBe('admin');
    expect(mustUserAcceptPaidLicense(user)).toBe(false);
    expect(getPaidRemainingDays(user)).toBe(Infinity);
  });

  it('identifies zivit.reshef@gmail.com as an admin even when role is set to teacher or behavior_analyst', () => {
    const teacherUser: Partial<AllowedUserRecord> = { email: 'zivit.reshef@gmail.com', role: 'teacher' };
    const analystUser: Partial<AllowedUserRecord> = { email: 'zivit.reshef@gmail.com', role: 'behavior_analyst' };

    expect(isUserAdmin(teacherUser)).toBe(true);
    expect(isUserAdmin(analystUser)).toBe(true);
    expect(getUserSubscriptionStatus(teacherUser)).toBe('admin');
    expect(getUserSubscriptionStatus(analystUser)).toBe('admin');
  });

  it('correctly restricts standard behavior_analyst and teacher accounts from admin access', () => {
    const normalAnalyst: Partial<AllowedUserRecord> = {
      email: 'analyst@school.org',
      role: 'behavior_analyst',
      name: 'דנה מנתחת התנהגות'
    };
    const normalTeacher: Partial<AllowedUserRecord> = {
      email: 'teacher@school.org',
      role: 'teacher',
      name: 'רונית מורה'
    };

    expect(isUserAdmin(normalAnalyst)).toBe(false);
    expect(isUserAdmin(normalTeacher)).toBe(false);
  });

  it('grants admin access to standard accounts explicitly marked role admin or superadmin', () => {
    expect(isUserAdmin({ email: 'admin@school.org', role: 'admin' as const })).toBe(true);
    expect(isUserAdmin({ email: 'super@school.org', role: 'superadmin' })).toBe(true);
    expect(isUserAdmin({ email: 'someone@school.org', isAdmin: true })).toBe(true);
  });
});
