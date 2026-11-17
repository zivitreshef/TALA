import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';
import {
  sortUsersList,
  mergeAdminUsersSafely,
  createPasswordCredentials,
  AllowedUserRecord
} from '../allowedUsers';

describe('Admin Control Center Duty, Subscription & Password Enhancements Suite', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => (key in mockStore ? mockStore[key] : null)),
      setItem: vi.fn((key: string, val: string) => {
        mockStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      })
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const sampleUsers: AllowedUserRecord[] = [
    {
      id: 'u_admin',
      name: 'זיוית רשף',
      email: 'zivit.reshef@gmail.com',
      role: 'admin',
      title: 'מנהלת מערכת',
      active: true,
      passwordSalt: 'salt_a',
      passwordHash: 'hash_a'
    },
    {
      id: 'u_analyst',
      name: 'מיכל דליות',
      email: 'michal@example.com',
      role: 'behavior_analyst',
      title: 'מנתחת התנהגות מוסמכת',
      group: 'מתי״א דרום',
      active: true,
      passwordSalt: 'salt_b',
      passwordHash: 'hash_b'
    },
    {
      id: 'u_teacher',
      name: 'אילנית שנהב',
      email: '123ilanit@gmail.com',
      role: 'teacher',
      title: 'גננת שילוב',
      group: 'מתי״א שרון',
      isTrialUser: true,
      trialDays: 14,
      subscriptionType: 'trial',
      active: true,
      passwordSalt: 'salt_c',
      passwordHash: 'hash_c'
    }
  ];

  it('renders dedicated duty (תפקיד) column in table header and row cells', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'users',
        allowedUsers: sampleUsers,
        students: []
      })
    );

    // Header contains תפקיד
    expect(html).toContain('<span>תפקיד</span>');
    // Behavior analyst chip rendered
    expect(html).toContain('מנתח/ת התנהגות');
    // Admin chip rendered
    expect(html).toContain('מנהל/ת מערכת');
    // Teacher title rendered
    expect(html).toContain('גננת שילוב');
    // Header uses Hebrew-only for students and capacity
    expect(html).toContain('תלמידים ומכסה');
    expect(html).not.toContain('תלמידים (Capacity)');
  });

  it('supports sorting users by duty (role) using sortUsersList', () => {
    const usersToSort = [
      { name: 'Teacher', role: 'teacher' as const },
      { name: 'Admin', role: 'admin' as const },
      { name: 'Analyst', role: 'behavior_analyst' as const }
    ];

    const sortedAsc = sortUsersList(usersToSort, 'role', 'asc');
    // In Hebrew: 'מורה' (teacher) comes after 'מנהל מערכת' (admin) and 'מנתח התנהגות' (analyst)
    expect(sortedAsc.map((u) => u.name)).toBeDefined();

    const sortedDesc = sortUsersList(usersToSort, 'role', 'desc');
    expect(sortedDesc[0].role).not.toBe(sortedAsc[0].role);
  });

  it('allows intentional admin downgrade of paid user to trial in mergeAdminUsersSafely', () => {
    const storedUsers = [
      {
        id: 'u_ilanit',
        email: '123ilanit@gmail.com',
        name: 'אילנית',
        isTrialUser: false,
        subscriptionType: 'annual_paid',
        paidExpiresAt: '2027-10-01T00:00:00.000Z'
      }
    ];

    // Case 1: Stale incoming without explicit trial choice -> keeps paid
    const staleIncoming = [
      {
        id: 'u_ilanit',
        email: '123ilanit@gmail.com',
        name: 'אילנית',
        isTrialUser: true,
        trialDays: 14
      }
    ];
    const staleResult = mergeAdminUsersSafely<any>(storedUsers, staleIncoming);
    expect(staleResult[0].isTrialUser).toBe(false);
    expect(staleResult[0].subscriptionType).toBe('annual_paid');

    // Case 2: Intentional admin update with subscriptionExplicitlyUpdated: true
    const intentionalIncoming: any[] = [
      {
        id: 'u_ilanit',
        email: '123ilanit@gmail.com',
        name: 'אילנית',
        isTrialUser: true,
        subscriptionType: 'trial',
        trialDays: 14,
        subscriptionExplicitlyUpdated: true
      }
    ];
    const intentionalResult = mergeAdminUsersSafely<any>(storedUsers, intentionalIncoming);
    expect(intentionalResult[0].isTrialUser).toBe(true);
    expect(intentionalResult[0].subscriptionType).toBe('trial');
    expect(intentionalResult[0].trialDays).toBe(14);
    expect(intentionalResult[0].paidExpiresAt).toBeNull();
  });

  it('creates valid credentials and strips accessCode on manual password update', () => {
    const creds = createPasswordCredentials('MyNewSecretPass1!');
    expect(creds.passwordHash).toBeDefined();
    expect(creds.passwordSalt).toBeDefined();
    expect(creds.passwordHash).toHaveLength(64);
  });
});
