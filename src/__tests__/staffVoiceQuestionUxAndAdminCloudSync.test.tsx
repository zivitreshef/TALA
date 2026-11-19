import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StaffVoiceControl from '../components/form/StaffVoiceControl';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';
import { subscribeToTalaBackend } from '../firebaseBackend';

vi.mock('../firebaseBackend', async () => {
  const actual = await vi.importActual<any>('../firebaseBackend');
  return {
    ...actual,
    getFirebaseAuth: vi.fn(() => ({
      currentUser: { email: 'admin@school.org' },
      authStateReady: vi.fn().mockResolvedValue(undefined)
    })),
    ensureFirebaseAuthSession: vi.fn().mockResolvedValue({ email: 'admin@school.org' }),
    isCloudBackendConfigured: vi.fn(() => true)
  };
});

vi.mock('../services/inviteService', () => ({
  createInvite: vi.fn(),
  deleteInvite: vi.fn(),
  ensureTeacherSession: vi.fn(),
  markInviteReviewed: vi.fn(),
  subscribeToStudentInvites: vi.fn(() => () => {})
}));

describe('Staff Voice Questionnaire UX & Admin Cloud Sync Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Staff Voice Questionnaire Customization UX', () => {
    const mockStudent = {
      id: 'st_123',
      name: 'אימרי לוי',
      gender: 'boy',
      homeroomTeacher: 'מיטל עמר (גננת)'
    };

    it('renders the clear, actionable question customization trigger card with intuitive edit badge and button', () => {
      const html = renderToStaticMarkup(
        React.createElement(StaffVoiceControl, {
          student: mockStudent,
          currentUser: { email: 'teacher@school.org' },
          disabled: false,
          initialOpen: true
        })
      );

      // Verifies the modal header and candidate selection
      expect(html).toContain('קול הצוות הרב-מקצועי');
      expect(html).toContain('איסוף התייחסות מהצוות החינוכי והטיפולי של אימרי');

      // Verifies the new prominent, clickable questionnaire customization card
      expect(html).toContain('התאמת שאלות השאלון עבור מיטל עמר (גננת)');
      expect(html).toContain('לחצי לצפייה ועריכה ✏️');
      expect(html).toContain('עריכת שאלות');
      expect(html).toContain('title="לחצי כדי לערוך, להוסיף או להסיר שאלות בשאלון לאיש/אשת הצוות"');
    });
  });

  describe('2. Admin Control Center Cloud Sync Indicator', () => {
    const mockAdminUser = {
      email: 'admin@school.org',
      name: 'מנהלת מערכת',
      role: 'admin',
      active: true
    };

    it('displays "ענן מחובר" when cloud sync state is fully connected', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAllowlistModal, {
          isOpen: true,
          onClose: vi.fn(),
          allowedUsers: [mockAdminUser],
          onUpdateAllowedUsers: vi.fn(),
          enforcePasswordPolicy: false,
          onChangeEnforcePasswordPolicy: vi.fn(),
          geminiApiKey: '',
          onChangeGeminiApiKey: vi.fn(),
          adminRequests: [],
          onDismissAdminRequest: vi.fn(),
          cloudSyncState: { connected: true, status: 'synced' },
          students: [],
          healthEvents: [],
          healthReviewedMs: 0,
          onMarkHealthReviewed: vi.fn(),
          onClearHealthEvents: vi.fn(),
          currentUser: mockAdminUser
        })
      );

      expect(html).toContain('☁️ ענן מחובר');
      expect(html).not.toContain('💾 מקומי');
    });

    it('displays "מתחבר לענן..." while connection is actively establishing rather than falsely displaying "מקומי"', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminAllowlistModal, {
          isOpen: true,
          onClose: vi.fn(),
          allowedUsers: [mockAdminUser],
          onUpdateAllowedUsers: vi.fn(),
          enforcePasswordPolicy: false,
          onChangeEnforcePasswordPolicy: vi.fn(),
          geminiApiKey: '',
          onChangeGeminiApiKey: vi.fn(),
          adminRequests: [],
          onDismissAdminRequest: vi.fn(),
          cloudSyncState: { connected: false, status: 'connecting' },
          students: [],
          healthEvents: [],
          healthReviewedMs: 0,
          onMarkHealthReviewed: vi.fn(),
          onClearHealthEvents: vi.fn(),
          currentUser: mockAdminUser
        })
      );

      expect(html).toContain('🔄 מתחבר לענן...');
      expect(html).not.toContain('💾 מקומי');
    });

    it('displays "מקומי" only when explicitly in local mode with an error or unauthenticated state', async () => {
      const { getFirebaseAuth } = await import('../firebaseBackend');
      vi.mocked(getFirebaseAuth).mockReturnValueOnce({
        currentUser: null,
        authStateReady: vi.fn().mockResolvedValue(undefined)
      } as any);

      const html = renderToStaticMarkup(
        React.createElement(AdminAllowlistModal, {
          isOpen: true,
          onClose: vi.fn(),
          allowedUsers: [mockAdminUser],
          onUpdateAllowedUsers: vi.fn(),
          enforcePasswordPolicy: false,
          onChangeEnforcePasswordPolicy: vi.fn(),
          geminiApiKey: '',
          onChangeGeminiApiKey: vi.fn(),
          adminRequests: [],
          onDismissAdminRequest: vi.fn(),
          cloudSyncState: { connected: false, status: 'local_only' },
          students: [],
          healthEvents: [],
          healthReviewedMs: 0,
          onMarkHealthReviewed: vi.fn(),
          onClearHealthEvents: vi.fn(),
          currentUser: mockAdminUser
        })
      );

      expect(html).toContain('💾 מקומי');
    });
  });

  describe('3. subscribeToTalaBackend Auth Listener Lifecycle', () => {
    it('initializes and returns a clean cleanup function that unregisters live listeners', () => {
      const onSyncStatusChange = vi.fn();
      const unsub = subscribeToTalaBackend({
        email: 'admin@school.org',
        isAdmin: true,
        onSyncStatusChange
      });

      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });
  });
});
