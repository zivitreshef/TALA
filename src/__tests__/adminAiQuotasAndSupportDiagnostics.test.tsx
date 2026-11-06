import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getUserEffectiveDailyAiQuota,
  getUserDailyAiUsage,
  resetUserDailyAiQuotaInList,
  setGroupDailyAiQuotaInList,
  recordAiTelemetryForUser,
  DEFAULT_USER_DAILY_AI_QUOTA
} from '../allowedUsers';
import {
  parseBrowserSummary,
  buildTeacherDiagnosticSnapshot,
  createChatMessage,
  appendMessageToThread,
  SENDER_ROLES
} from '../domain/supportChat';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';

describe('Admin AI Quotas & Support Diagnostics (Features 3 & 5)', () => {
  describe('Flexible Daily AI Quota Management (Feature 3)', () => {
    it('computes effective daily quota for admins, paying users, trial users, and custom overrides', () => {
      expect(getUserEffectiveDailyAiQuota(null)).toBe(DEFAULT_USER_DAILY_AI_QUOTA);
      expect(getUserEffectiveDailyAiQuota({ role: 'admin', email: 'admin@tala.edu.il' })).toBe(Infinity);
      expect(getUserEffectiveDailyAiQuota({ role: 'teacher', isTrialUser: true })).toBe(50);
      expect(getUserEffectiveDailyAiQuota({ role: 'teacher', isTrialUser: false })).toBe(100);
      expect(getUserEffectiveDailyAiQuota({ role: 'teacher', isTrialUser: true, dailyAiQuotaLimit: 250 })).toBe(250);
    });

    it('tracks daily AI usage and resets automatically on a new calendar day', () => {
      const day1 = new Date('2026-11-06T10:00:00Z');
      const day2 = new Date('2026-11-07T10:00:00Z');

      let users = [
        { id: 'u1', email: 'teacher@tala.edu.il', name: 'מיכל', role: 'teacher' as const, aiUsageCount: 10 }
      ];

      users = recordAiTelemetryForUser('teacher@tala.edu.il', users, day1) || users;
      users = recordAiTelemetryForUser('teacher@tala.edu.il', users, day1) || users;

      expect(users[0].aiUsageCount).toBe(12);
      expect(getUserDailyAiUsage(users[0], day1)).toBe(2);
      // Next day without new calls returns 0
      expect(getUserDailyAiUsage(users[0], day2)).toBe(0);

      // New call on day 2 starts daily counter at 1 while preserving cumulative count
      users = recordAiTelemetryForUser('teacher@tala.edu.il', users, day2) || users;
      expect(users[0].aiUsageCount).toBe(13);
      expect(getUserDailyAiUsage(users[0], day2)).toBe(1);
    });

    it('allows admin to reset a specific teacher daily AI quota to 0', () => {
      const today = new Date('2026-11-06T12:00:00Z');
      const users = [
        {
          id: 'u1',
          email: 'teacher1@tala.edu.il',
          aiUsageCount: 50,
          aiDailyCount: 50,
          aiDailyDate: '2026-11-06'
        },
        {
          id: 'u2',
          email: 'teacher2@tala.edu.il',
          aiUsageCount: 20,
          aiDailyCount: 15,
          aiDailyDate: '2026-11-06'
        }
      ];

      const afterReset = resetUserDailyAiQuotaInList(users, 'teacher1@tala.edu.il', today);
      expect(getUserDailyAiUsage(afterReset[0], today)).toBe(0);
      expect(afterReset[0].aiUsageCount).toBe(50); // cumulative preserved
      expect(getUserDailyAiUsage(afterReset[1], today)).toBe(15); // other user untouched
    });

    it('allows admin to set custom daily AI quota for an entire Matya group', () => {
      const users = [
        { id: 'u1', email: 't1@tala.edu.il', role: 'teacher' as const, group: 'מתי"א צפון' },
        { id: 'u2', email: 't2@tala.edu.il', role: 'teacher' as const, group: 'מתי"א צפון' },
        { id: 'u3', email: 'admin@tala.edu.il', role: 'admin' as const, group: 'מתי"א צפון' },
        { id: 'u4', email: 't3@tala.edu.il', role: 'teacher' as const, group: 'מתי"א דרום' }
      ];

      const updated = setGroupDailyAiQuotaInList(users, 'מתי"א צפון', 200);
      expect(getUserEffectiveDailyAiQuota(updated[0])).toBe(200);
      expect(getUserEffectiveDailyAiQuota(updated[1])).toBe(200);
      expect(getUserEffectiveDailyAiQuota(updated[2])).toBe(Infinity); // admin stays unlimited
      expect(getUserEffectiveDailyAiQuota(updated[3])).toBe(100); // other group untouched
    });
  });

  describe('Zero-PII Teacher Support Diagnostics (Feature 5)', () => {
    it('parses browser and OS summary cleanly from User-Agent without PII', () => {
      expect(
        parseBrowserSummary(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        )
      ).toBe('Chrome (Windows)');
      expect(
        parseBrowserSummary(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
        )
      ).toBe('Safari (iOS)');
      expect(parseBrowserSummary('')).toBe('דפדפן לא מזוהה');
    });

    it('attaches teacher diagnostic snapshot to support thread only when sent by teacher', () => {
      const diag = buildTeacherDiagnosticSnapshot({
        appVersion: '2.6.15',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/130.0.0.0',
        cloudConnected: true,
        online: true,
        now: '2026-11-06T12:00:00.000Z'
      });

      expect(diag).toEqual({
        appVersion: '2.6.15',
        browser: 'Chrome (Mac)',
        cloudConnected: true,
        online: true,
        capturedAtIso: '2026-11-06T12:00:00.000Z'
      });

      const userMsg = createChatMessage({
        senderRole: SENDER_ROLES.USER,
        senderEmail: 'teacher@tala.edu.il',
        senderName: 'מיכל',
        text: 'שלום, יש לי שאלה'
      });

      const threadWithDiag = appendMessageToThread(null, userMsg, diag);
      expect(threadWithDiag.diagnostics).toEqual(diag);

      // Admin reply preserves existing teacher diagnostics and does not overwrite with admin's browser
      const adminMsg = createChatMessage({
        senderRole: SENDER_ROLES.ADMIN,
        senderEmail: 'admin@tala.edu.il',
        senderName: 'זיוית',
        text: 'אני בודקת'
      });
      const afterAdminReply = appendMessageToThread(threadWithDiag, adminMsg, {
        appVersion: '2.6.15',
        browser: 'Edge (Windows)',
        cloudConnected: true,
        online: true,
        capturedAtIso: '2026-11-06T12:05:00.000Z'
      });
      expect(afterAdminReply.diagnostics?.browser).toBe('Chrome (Mac)');
    });

    it('renders diagnostic strip and quota reset button in AdminAllowlistModal', () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const users = [
        {
          id: 'u_t1',
          email: 'michal@tala.edu.il',
          name: 'מיכל כהן',
          role: 'teacher',
          group: 'מתי"א מרכז',
          active: true,
          aiDailyCount: 12,
          aiDailyDate: todayStr,
          dailyAiQuotaLimit: 80
        }
      ];

      const usersHtml = renderToStaticMarkup(
        React.createElement(AdminAllowlistModal, {
          isOpen: true,
          onClose: () => {},
          initialTab: 'users',
          allowedUsers: users,
          students: []
        })
      );

      expect(usersHtml).toContain('היום: 12/80');
      expect(usersHtml).toContain('אפס מכסה');

      const requestsHtml = renderToStaticMarkup(
        React.createElement(AdminAllowlistModal, {
          isOpen: true,
          onClose: () => {},
          initialTab: 'requests',
          allowedUsers: users,
          initialSupportThreads: [
            {
              id: 'michal_tala.edu.il',
              userEmail: 'michal@tala.edu.il',
              userName: 'מיכל כהן',
              topic: 'תקלה בשמירה',
              status: 'active',
              unreadByAdmin: true,
              messages: [
                {
                  id: 'm1',
                  senderRole: 'user',
                  senderEmail: 'michal@tala.edu.il',
                  senderName: 'מיכל כהן',
                  text: 'לא נשמר לי',
                  createdAt: '06.11.2026',
                  timestamp: Date.now()
                }
              ],
              diagnostics: {
                appVersion: '2.6.15',
                browser: 'Chrome (Windows)',
                cloudConnected: true,
                online: true,
                capturedAtIso: new Date().toISOString()
              }
            }
          ],
          healthEvents: [
            {
              kind: 'ai_proxy_error',
              userEmail: 'michal@tala.edu.il',
              createdAtMs: Date.now(),
              message: 'timeout'
            }
          ]
        })
      );

      expect(requestsHtml).toContain('אבחון טכני:');
      expect(requestsHtml).toContain('2.6.15');
      expect(requestsHtml).toContain('Chrome (Windows)');
      expect(requestsHtml).toContain('ענן מחובר');
      expect(requestsHtml).toContain('מכסה יומית: 12/80');
      expect(requestsHtml).toContain('1 שגיאות אחרונות');
    });
  });
});
