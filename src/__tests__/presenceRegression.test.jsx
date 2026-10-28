import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';
import { recordUserPresence, subscribeToUserPresence } from '../firebaseBackend';

// Mock dependencies
vi.mock('../firebaseBackend', () => {
  return {
    recordUserPresence: vi.fn().mockResolvedValue(true),
    subscribeToUserPresence: vi.fn().mockImplementation((cb) => {
      cb({});
      return vi.fn();
    })
  };
});

vi.mock('../telemetryService', () => ({
  fetchTelemetrySnapshot: vi.fn().mockResolvedValue({ aiLogs: [], emailLogs: [] }),
  aggregateTelemetryData: vi.fn().mockReturnValue({ aiTodayCount: 0, emailTodayCount: 0 }),
  getDailyQuotaCount: vi.fn().mockReturnValue(0)
}));

describe('Presence Instant Indicator & Zero-Delay Self-Status (Regression Tests)', () => {
  const mockAdminUser = {
    id: 'user_1',
    name: 'מוטי רשף',
    email: 'moti_reshef@bmc.com',
    role: 'admin',
    active: true
  };

  const mockOtherUser = {
    id: 'user_2',
    name: 'מורה לדוגמה',
    email: 'teacher@school.org',
    role: 'teacher',
    active: true
  };

  const allowedUsers = [mockAdminUser, mockOtherUser];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active presence badge immediately for current user (את/ה) even when presence map is empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockAdminUser,
        allowedUsers: allowedUsers,
        onUpdateAllowedUsers: vi.fn()
      })
    );

    // The current admin viewing the modal should immediately see "מחובר/ת (את/ה)"
    expect(html).toContain('מחובר/ת (את/ה)');
    // The other user with no presence entry should show as not connected
    expect(html).toContain('לא מחובר/ת');
  });

  it('renders other users with standard presence badge when presence data exists', () => {
    vi.mocked(subscribeToUserPresence).mockImplementationOnce((cb) => {
      cb({
        'teacher_school.org': {
          email: 'teacher@school.org',
          lastActiveIso: new Date().toISOString()
        }
      });
      return vi.fn();
    });

    const html = renderToStaticMarkup(
      React.createElement(AdminAllowlistModal, {
        isOpen: true,
        onClose: vi.fn(),
        currentUser: mockAdminUser,
        allowedUsers: allowedUsers,
        onUpdateAllowedUsers: vi.fn()
      })
    );

    expect(html).toContain('מחובר/ת (את/ה)');
    expect(html).toContain('פעיל/ה כעת');
  });
});
