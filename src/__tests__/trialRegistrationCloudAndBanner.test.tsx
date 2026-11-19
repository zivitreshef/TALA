import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import NewVersionBanner from '../components/NewVersionBanner';
import { registerTrialUserInCloud } from '../firebaseBackend';

describe('Trial Registration Cloud Integration & Banner Text (v3.0.80)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('NewVersionBanner Text Alignment', () => {
    it('renders "גרסה חדשה של תל״א זמינה" rather than "טל״א"', () => {
      const html = renderToStaticMarkup(
        <NewVersionBanner latestVersion="3.0.80" hasUpdate={true} dismissed={false} />
      );

      expect(html).toContain('גרסה חדשה של תל״א זמינה (3.0.80)!');
      expect(html).not.toContain('גרסה חדשה של טל״א זמינה');
      expect(html).toContain('tala-new-version-banner');
      expect(html).toContain('רענן כעת');
    });

    it('renders dirty hint when isDirty is true', () => {
      const html = renderToStaticMarkup(
        <NewVersionBanner latestVersion="3.0.80" hasUpdate={true} dismissed={false} isDirty={true} />
      );

      expect(html).toContain('(שימו לב: מומלץ לשמור את השינויים לפני הרענון)');
    });
  });

  describe('registerTrialUserInCloud API Service', () => {
    it('successfully posts to talaConfigWrite with kind "registerTrial" and returns user and allUsers', async () => {
      const mockUser = {
        id: 'trial_123',
        name: 'ימית בראל',
        email: 'yamitbarel88@gmail.com',
        phone: '0546804935',
        group: 'מתיא נוף הגליל',
        title: 'מורת כיתת חינוך מיוחד',
        role: 'teacher',
        isTrialUser: true,
        trialDays: 7
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          user: mockUser,
          token: 'mock-custom-token',
          allUsers: [mockUser]
        })
      }) as any;

      const result = await registerTrialUserInCloud({
        name: 'ימית בראל',
        email: 'yamitbarel88@gmail.com',
        phone: '0546804935',
        group: 'מתיא נוף הגליל',
        title: 'מורת כיתת חינוך מיוחד',
        passwordSalt: 'salt123',
        passwordHash: 'hash456'
      });

      expect(result.ok).toBe(true);
      expect(result.user?.name).toBe('ימית בראל');
      expect(result.user?.isTrialUser).toBe(true);
      expect(result.allUsers).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/talaConfigWrite'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"kind":"registerTrial"')
        })
      );
    });

    it('handles cloud server rejection (e.g. email collision) gracefully with Hebrew error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: 'כתובת דוא״ל זו כבר רשומה במערכת. אנא התחברי באמצעות מסך הכניסה.'
        })
      }) as any;

      const result = await registerTrialUserInCloud({
        name: 'ימית בראל',
        email: 'yamitbarel88@gmail.com',
        phone: '0546804935',
        group: 'מתיא נוף הגליל',
        title: 'מורת כיתת חינוך מיוחד',
        passwordSalt: 'salt123',
        passwordHash: 'hash456'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('כתובת דוא״ל זו כבר רשומה במערכת');
    });

    it('handles network failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline')) as any;

      const result = await registerTrialUserInCloud({
        name: 'ימית בראל',
        email: 'yamitbarel88@gmail.com',
        phone: '0546804935',
        group: 'מתיא נוף הגליל',
        title: 'מורת כיתת חינוך מיוחד',
        passwordSalt: 'salt123',
        passwordHash: 'hash456'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Network offline');
    });
  });
});
