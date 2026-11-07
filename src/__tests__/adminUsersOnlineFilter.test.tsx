import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';

const nowIso = new Date().toISOString();
const tenMinutesAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

const mockPresenceMap = {
  'teacher2_school.org': {
    email: 'teacher2@school.org',
    name: 'מורה אונליין',
    lastActiveIso: nowIso
  },
  'teacher3_school.org': {
    email: 'teacher3@school.org',
    name: 'מורה בהמתנה',
    lastActiveIso: tenMinutesAgoIso
  }
};

vi.mock('../firebaseBackend', () => {
  return {
    recordUserPresence: vi.fn().mockResolvedValue(true),
    subscribeToUserPresence: vi.fn().mockImplementation((cb) => {
      cb(mockPresenceMap);
      return vi.fn();
    })
  };
});

vi.mock('../services/telemetryService', () => ({
  fetchTelemetrySnapshot: vi.fn().mockResolvedValue({ aiLogs: [], emailLogs: [] }),
  aggregateTelemetryData: vi.fn().mockReturnValue({ aiTodayCount: 0, emailTodayCount: 0 }),
  getDailyQuotaCount: vi.fn().mockReturnValue(0)
}));

describe('Admin Users Tab Name & Online Filter Sub-tab', () => {
  const mockAdminUser = {
    id: 'user_admin',
    name: 'מנהל ראשי',
    email: 'admin@tala.org',
    role: 'admin',
    active: true
  };

  const mockOnlineUser = {
    id: 'user_online',
    name: 'מורה פעיל',
    email: 'teacher2@school.org',
    role: 'teacher',
    active: true
  };

  const mockIdleUser = {
    id: 'user_idle',
    name: 'מורה בהמתנה',
    email: 'teacher3@school.org',
    role: 'teacher',
    active: true
  };

  const mockOfflineUser = {
    id: 'user_offline',
    name: 'מורה לא מחובר',
    email: 'offline@school.org',
    role: 'teacher',
    active: true
  };

  const allowedUsers = [mockAdminUser, mockOnlineUser, mockIdleUser, mockOfflineUser];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tab name as "משתמשים" instead of "משתמשים ומנויים"', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockAdminUser,
        allowedUsers,
        initialPresenceMap: mockPresenceMap,
        onUpdateAllowedUsers: vi.fn()
      })
    );

    expect(html).toContain('משתמשים (4)');
    expect(html).not.toContain('משתמשים ומנויים');
  });

  it('renders the "מחוברים כעת" filter sub-tab immediately following "כל המשתמשים"', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockAdminUser,
        allowedUsers,
        initialPresenceMap: mockPresenceMap,
        onUpdateAllowedUsers: vi.fn()
      })
    );

    expect(html).toContain('data-testid="user-group-tab-all"');
    expect(html).toContain('data-testid="user-group-tab-online"');
    expect(html).toContain('מחוברים כעת');

    const indexAll = html.indexOf('data-testid="user-group-tab-all"');
    const indexOnline = html.indexOf('data-testid="user-group-tab-online"');
    const indexAdmins = html.indexOf('data-testid="user-group-tab-admins"');

    expect(indexAll).toBeGreaterThan(-1);
    expect(indexOnline).toBeGreaterThan(indexAll);
    expect(indexAdmins).toBeGreaterThan(indexOnline);
  });

  it('calculates the online count accurately including currentUser and users active <5 min', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockAdminUser,
        allowedUsers,
        initialPresenceMap: mockPresenceMap,
        onUpdateAllowedUsers: vi.fn()
      })
    );

    // Online users: mockAdminUser (self = 1) + mockOnlineUser (active now = 1) = 2 online users
    // mockIdleUser is 10 min ago (idle), mockOfflineUser has no presence
    expect(html).toContain('data-testid="user-group-tab-online"');
    const onlineTabSection = html.slice(
      html.indexOf('data-testid="user-group-tab-online"'),
      html.indexOf('data-testid="user-group-tab-admins"')
    );
    expect(onlineTabSection).toContain('מחוברים כעת');
    expect(onlineTabSection).toContain('2');
  });

  it('filters users table to only display online users when online tab is selected', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockAdminUser,
        allowedUsers,
        initialUserGroupTab: 'online',
        initialPresenceMap: mockPresenceMap,
        onUpdateAllowedUsers: vi.fn()
      })
    );

    // Should include online users
    expect(html).toContain('admin@tala.org');
    expect(html).toContain('teacher2@school.org');

    // Should NOT include idle or offline users in table
    expect(html).not.toContain('teacher3@school.org');
    expect(html).not.toContain('offline@school.org');
  });

  it('displays empty state when online tab is active and no users are online', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: { email: 'stranger@nowhere.com' },
        allowedUsers: [mockIdleUser, mockOfflineUser],
        initialUserGroupTab: 'online',
        initialPresenceMap: {},
        onUpdateAllowedUsers: vi.fn()
      })
    );

    expect(html).toContain('לא נמצאו משתמשים בקבוצה זו');
  });
});
