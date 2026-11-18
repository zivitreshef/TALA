import { describe, it, expect } from 'vitest';
import {
  getDeletionWarningStatus,
  AllowedUserRecord
} from '../allowedUsers';
import { OUTREACH_TEMPLATES, interpolateOutreachTemplate } from '../components/modals/AdminOutreachEmailModal';
import { buildSignedNdaDocumentHtml } from '../emailService';
import fs from 'fs';
import path from 'path';

describe('Trial Retention and Expired Account Lifecycle', () => {
  describe('getDeletionWarningStatus', () => {
    it('returns warningSent: false and canBePermanentlyDeleted: false when no warning was sent', () => {
      const user: Partial<AllowedUserRecord> = {
        id: 'u_1',
        email: 'teacher@school.org'
      };
      const status = getDeletionWarningStatus(user as AllowedUserRecord);
      expect(status.warningSent).toBe(false);
      expect(status.daysRemaining).toBe(30);
      expect(status.canBePermanentlyDeleted).toBe(false);
    });

    it('calculates daysRemaining correctly when warning was sent 10 days ago', () => {
      const now = new Date('2026-11-20T12:00:00.000Z');
      const warningDate = new Date('2026-11-10T12:00:00.000Z').toISOString();
      const user: Partial<AllowedUserRecord> = {
        id: 'u_2',
        email: 'teacher@school.org',
        deletionWarningSentAt: warningDate
      };
      const status = getDeletionWarningStatus(user as AllowedUserRecord, now);
      expect(status.warningSent).toBe(true);
      expect(status.daysRemaining).toBe(20);
      expect(status.canBePermanentlyDeleted).toBe(false);
    });

    it('approves permanent deletion when 30 days have elapsed', () => {
      const now = new Date('2026-11-30T12:00:00.000Z');
      const warningDate = new Date('2026-10-31T12:00:00.000Z').toISOString();
      const user: Partial<AllowedUserRecord> = {
        id: 'u_3',
        email: 'teacher@school.org',
        deletionWarningSentAt: warningDate
      };
      const status = getDeletionWarningStatus(user as AllowedUserRecord, now);
      expect(status.warningSent).toBe(true);
      expect(status.daysRemaining).toBe(0);
      expect(status.canBePermanentlyDeleted).toBe(true);
    });

    it('approves permanent deletion when more than 30 days have elapsed', () => {
      const now = new Date('2026-12-15T12:00:00.000Z');
      const warningDate = new Date('2026-10-15T12:00:00.000Z').toISOString();
      const user: Partial<AllowedUserRecord> = {
        id: 'u_4',
        email: 'teacher@school.org',
        deletionWarningSentAt: warningDate
      };
      const status = getDeletionWarningStatus(user as AllowedUserRecord, now);
      expect(status.warningSent).toBe(true);
      expect(status.daysRemaining).toBe(0);
      expect(status.canBePermanentlyDeleted).toBe(true);
    });
  });

  describe('Outreach Template for Expired Accounts', () => {
    it('includes the expired_deletion_warning template in OUTREACH_TEMPLATES', () => {
      const tmpl = OUTREACH_TEMPLATES.find((t) => t.key === 'expired_deletion_warning');
      expect(tmpl).toBeDefined();
      expect(tmpl?.name).toContain('התראת סיום תקופת פעילות ומחיקת נתונים בעוד 30 יום');
      expect(tmpl?.subject).toContain('סיום תקופת הפעילות ומועד מחיקת הנתונים בעוד 30 יום');
      expect(tmpl?.body).toContain('30 יום');
      expect(tmpl?.body).toContain('לצמיתות וללא אפשרות שחזור');
    });

    it('correctly interpolates name and details in outreach email template', () => {
      const tmpl = OUTREACH_TEMPLATES.find((t) => t.key === 'expired_deletion_warning');
      expect(tmpl).toBeDefined();
      const interpolated = interpolateOutreachTemplate(tmpl!.body, {
        name: 'מיכל כהן',
        group: 'מתי"א שרון'
      });
      expect(interpolated).toContain('שלום מיכל כהן');
      expect(interpolated).not.toContain('{name}');
    });
  });

  describe('Legal Terms Updates', () => {
    it('includes 30-day retention and permanent deletion clauses in NDA HTML builder', () => {
      const html = buildSignedNdaDocumentHtml({
        signerName: 'בדיקה מורה',
        signerEmail: 'test@school.org',
        trialDays: 14
      });
      expect(html).toContain('30 ימים (חודש) מתום תקופת הניסיון');
      expect(html).toContain('לצמיתות ללא אפשרות שחזור');
    });

    it('verifies license-agreement.html contains clauses 2.5 and 6.4 regarding 30-day retention and deletion', () => {
      const filePath = path.resolve(__dirname, '../../docs/legal/license-agreement.html');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('2.5. שמירת נתונים ומחיקה בתום תקופת הפעילות');
      expect(content).toContain('30 יום');
      expect(content).toContain('יימחקו משרתי המערכת לצמיתות וללא אפשרות שחזור');
      expect(content).toContain('6.4. מחיקת מידע לצמיתות');
    });
  });
});
