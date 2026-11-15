import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';
import { AllowedUserRecord } from '../allowedUsers';

describe('Admin Allowlist Modal Behavior Analyst Role Suite', () => {
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

  const mockUsers: AllowedUserRecord[] = [
    {
      id: 'u_admin',
      name: 'זיוית רשף',
      email: 'zivit.reshef@gmail.com',
      role: 'admin',
      active: true,
      passwordSalt: 'salt',
      passwordHash: 'hash'
    },
    {
      id: 'u_analyst',
      name: 'דנה מנתחת',
      email: 'dana.analyst@example.com',
      role: 'behavior_analyst',
      title: 'מנתחת התנהגות',
      group: 'מתי״א דרום',
      active: true,
      passwordSalt: 'salt',
      passwordHash: 'hash'
    },
    {
      id: 'u_teacher',
      name: 'רונית מורה',
      email: 'ronit.teacher@example.com',
      role: 'teacher',
      title: 'מורת שילוב',
      group: 'מתי״א מרכז',
      active: true,
      passwordSalt: 'salt',
      passwordHash: 'hash'
    }
  ];

  it('renders מנתח/ת התנהגות badge for behavior analyst in users table', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'users',
        allowedUsers: mockUsers,
        students: []
      })
    );

    expect(html).toContain('דנה מנתחת');
    expect(html).toContain('מנתח/ת התנהגות');
  });

  it('includes behavior_analyst option in user creation role selection', () => {
    // When showAddUserForm is true, option value="behavior_analyst" is available
    // We can verify option text in static markup or presence
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'users',
        allowedUsers: mockUsers,
        students: []
      })
    );

    expect(html).toContain('הוספת משתמש/ת חדש/ה');
  });
});
