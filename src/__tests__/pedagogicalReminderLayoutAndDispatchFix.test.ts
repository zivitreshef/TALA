import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildPedagogicalReminderEmailHtml,
  sendPedagogicalReminderEmailInBackground
} from '../emailService';
import {
  buildPedagogicalReminderEmailHtmlServer,
  dispatchPedagogicalRemindersServer
} from '../../functions/pedagogicalReminders';

describe('Pedagogical Reminder Layout & Dispatch Architecture Fixes', () => {
  describe('Email Layout Architecture (Outlook & Universal Email Client Compliance)', () => {
    it('uses presentation tables instead of flexbox for KPI badges in client email builder', () => {
      const html = buildPedagogicalReminderEmailHtml({
        teacherName: 'זיוית',
        totalStudents: 5,
        accomplishments: {
          recentObservations: [{
            studentName: 'דני',
            framework: 'גן',
            goalTitle: 'יעד',
            environment: 'כיתה',
            timestamp: '2026-11-10T10:00:00Z',
            note: 'מעולה',
            supportLevel: 'עצמאי'
          }],
          advancedGoals: [{
            studentName: 'דני',
            goalTitle: 'יעד 1',
            environment: 'כיתה',
            currentProgress: 80
          }],
          completedTasks: [{
            studentName: 'דני',
            text: 'משימה 1',
            date: '2026-11-10'
          }]
        },
        gaps: [{ studentId: 's1', studentName: 'דני', goalTitle: 'יעד', daysSinceObservation: 50 }] as any,
        siteUrl: 'https://zivitreshef.github.io/TALA/'
      });

      // Must be valid RTL HTML
      expect(html).toContain('dir="rtl"');
      // Must use HTML tables for structure rather than flexbox
      expect(html).toContain('table role="presentation"');
      expect(html).not.toContain('display:flex');
      expect(html).not.toContain('display: flex');

      // Badges must be rendered in table cells
      expect(html).toContain('תלמידים במעקב');
      expect(html).toContain('משימות שבוצעו');
      expect(html).toContain('תצפיות שתועדו');
      expect(html).toContain('יעדים בתנופה');
      expect(html).toContain('לרציפות (45+)');

      // Top bar for opening in browser
      expect(html).toContain('בעיות בהצגת המייל?');
      expect(html).toContain('view=class-readiness');
    });

    it('renders supportive empty state when no student cards exist', () => {
      const html = buildPedagogicalReminderEmailHtml({
        teacherName: 'מורה',
        totalStudents: 0,
        accomplishments: { recentObservations: [], advancedGoals: [], completedTasks: [] },
        gaps: []
      });

      expect(html).toContain('לא אותרו תצפיות או יעדים שהתקדמו בתקופה שנבדקה');
    });

    it('includes browser link in server-side cloud email template', () => {
      const serverHtml = buildPedagogicalReminderEmailHtmlServer({
        teacherName: 'זיוית',
        totalStudents: 3,
        accomplishments: { recentObservationsCount: 2, completedGoalsCount: 1, activeGoalsCount: 2 },
        gaps: []
      });

      expect(serverHtml).toContain('בעיות בהצגת המייל?');
      expect(serverHtml).toContain('לפתוח את דוח המוכנות ישירות במערכת TALA בדפדפן');
      expect(serverHtml).toContain('view=class-readiness');
    });
  });

  describe('Attachment & External Browser Support', () => {
    it('passes an HTML attachment blob when invoking sendPedagogicalReminderEmailInBackground', async () => {
      const globalFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('ok')
      });
      vi.stubGlobal('fetch', globalFetch);

      await sendPedagogicalReminderEmailInBackground({
        toEmail: 'teacher@school.com',
        teacherName: 'זיוית',
        students: [],
        gaps: [],
        accomplishments: { recentObservations: [], advancedGoals: [], completedTasks: [] },
        config: {
          appsScriptUrl: 'https://script.google.com/macros/s/test/exec',
          provider: 'apps_script'
        }
      });

      expect(globalFetch).toHaveBeenCalled();
      const payload = JSON.parse(globalFetch.mock.calls[0][1].body);
      expect(payload.filename).toBe('TALA_Pedagogical_Summary.html');
      expect(payload.mimeType).toBe('text/html');
      expect(payload.attachmentBase64).toBeDefined();
      expect(typeof payload.attachmentBase64).toBe('string');
      expect(payload.attachmentBase64.length).toBeGreaterThan(0);

      vi.unstubAllGlobals();
    });

    it('dispatches server reminders with base64 HTML attachment', async () => {
      const globalFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('ok')
      });
      vi.stubGlobal('fetch', globalFetch);

      const mockDb: any = {
        collection: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            empty: false,
            docs: [
              {
                id: 'teacher_doc',
                ref: { set: vi.fn().mockResolvedValue(true) },
                data: () => ({
                  userEmail: 'teacher@school.com',
                  pedagogicalReminderEnabled: true,
                  pedagogicalReminderFrequency: 'weekly',
                  pedagogicalReminderWeeklyDay: 'thursday',
                  pedagogicalReminderTime: '08:00'
                })
              }
            ]
          }),
          where: vi.fn(() => ({
            get: vi.fn().mockResolvedValue([])
          }))
        }))
      };

      // 2026-11-12 is Thursday, 10:00 Israel time (08:00 UTC)
      await dispatchPedagogicalRemindersServer({
        dryRun: false,
        db: mockDb,
        appsScriptUrl: 'https://script.google.com/test',
        referenceDate: new Date('2026-11-12T08:00:00Z')
      });

      expect(globalFetch).toHaveBeenCalled();
      const payload = JSON.parse(globalFetch.mock.calls[0][1].body);
      expect(payload.filename).toBe('דוח_מוכנות_פדגוגי_TALA.html');
      expect(payload.mimeType).toBe('text/html');
      expect(payload.attachmentBase64).toBeDefined();
      expect(payload.attachmentBase64.length).toBeGreaterThan(10);

      vi.unstubAllGlobals();
    });
  });

  describe('Elimination of Client-Side Race Conditions in App.tsx', () => {
    it('verifies App.tsx no longer contains automated interval or effect for sending digest emails', () => {
      const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');

      // Ensure the old redundant automated background effect is removed
      expect(appSource).not.toContain('// Automated Pedagogical Digest Scheduler based on Teacher Preferences');
      expect(appSource).not.toContain('const checkAndDispatchDigest = async');
      expect(appSource).not.toContain('setInterval(checkAndDispatchDigest');
    });
  });
});
