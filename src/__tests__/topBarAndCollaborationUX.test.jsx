import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isStudentPlanShared } from '../domain/permissions';

describe('Top Bar and Team Collaboration UX Contract', () => {
  const ownerUser = {
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף'
  };

  const colleagueUser = {
    email: 'yossi.teacher@school.org',
    name: 'יוסי המורה'
  };

  const otherTeacher = {
    email: 'dana.therapist@school.org',
    name: 'דנה המטפלת'
  };

  describe('isStudentPlanShared domain helper', () => {
    it('returns false for a brand new unshared student report viewed by owner', () => {
      const newStudent = {
        id: 'st_123',
        name: 'דניאל ישראלי',
        ownerEmail: 'zivit.reshef@gmail.com',
        sharedWith: [],
        teamMessages: []
      };

      expect(isStudentPlanShared(newStudent, ownerUser)).toBe(false);
    });

    it('returns false when sharedWith is undefined and no messages exist', () => {
      const student = {
        id: 'st_124',
        name: 'רוני כהן',
        ownerEmail: 'zivit.reshef@gmail.com'
      };

      expect(isStudentPlanShared(student, ownerUser)).toBe(false);
    });

    it('returns true as soon as student is shared with one or more colleagues', () => {
      const sharedStudent = {
        id: 'st_125',
        name: 'אורן לוי',
        ownerEmail: 'zivit.reshef@gmail.com',
        sharedWith: ['yossi.teacher@school.org'],
        teamMessages: []
      };

      expect(isStudentPlanShared(sharedStudent, ownerUser)).toBe(true);
    });

    it('returns true when there are active (non-deleted) team messages even if sharedWith was cleared', () => {
      const studentWithChat = {
        id: 'st_126',
        name: 'נועה ברק',
        ownerEmail: 'zivit.reshef@gmail.com',
        sharedWith: [],
        teamMessages: [
          { id: 'm1', text: 'תיעוד שיחה קודמת', isDeleted: false }
        ]
      };

      expect(isStudentPlanShared(studentWithChat, ownerUser)).toBe(true);
    });

    it('returns false if all team messages are marked isDeleted and sharedWith is empty', () => {
      const studentWithDeletedChat = {
        id: 'st_127',
        name: 'איתי שחר',
        ownerEmail: 'zivit.reshef@gmail.com',
        sharedWith: [],
        teamMessages: [
          { id: 'm1', text: 'הודעה שנמחקה', isDeleted: true }
        ]
      };

      expect(isStudentPlanShared(studentWithDeletedChat, ownerUser)).toBe(false);
    });

    it('returns true when a colleague who received access views the plan', () => {
      const studentSharedWithYossi = {
        id: 'st_128',
        name: 'מיכל אלון',
        ownerEmail: 'zivit.reshef@gmail.com',
        sharedWith: ['yossi.teacher@school.org'],
        teamMessages: []
      };

      expect(isStudentPlanShared(studentSharedWithYossi, colleagueUser)).toBe(true);
    });

    it('returns true for an unowned or external viewer who cannot lock the report', () => {
      const studentOwnedByOther = {
        id: 'st_129',
        name: 'עומר דגן',
        ownerEmail: 'someone.else@school.org',
        sharedWith: ['dana.therapist@school.org']
      };

      expect(isStudentPlanShared(studentOwnedByOther, otherTeacher)).toBe(true);
    });

    it('returns false safely when studentObj is null or undefined', () => {
      expect(isStudentPlanShared(null, ownerUser)).toBe(false);
      expect(isStudentPlanShared(undefined, ownerUser)).toBe(false);
    });
  });

  describe('EcologicalWorkPlanForm UI Component Contract', () => {
    const formCode = fs.readFileSync(
      path.resolve(__dirname, '../EcologicalWorkPlanForm.jsx'),
      'utf8'
    );
    const cssCode = fs.readFileSync(
      path.resolve(__dirname, '../index.css'),
      'utf8'
    );

    it('guards top action bar team chat button with isPlanShared condition', () => {
      expect(formCode).toContain('const isPlanShared = isStudentPlanShared(formData, currentUser);');
      expect(formCode).toContain('{isPlanShared && (');
      expect(formCode).toContain('data-testid="top-action-bar-team-chat-btn"');
    });

    it('does NOT contain the redundant duplicate שיח צוות button in section 1 header', () => {
      expect(formCode).not.toContain('data-testid="section1-team-chat-btn"');
    });

    it('provides consolidated "הדפסה וייצוא" dropdown in the top action bar', () => {
      expect(formCode).toContain('data-testid="top-action-bar-export-dropdown-btn"');
      expect(formCode).toContain('הדפסה וייצוא');
      expect(formCode).toContain('data-testid="top-action-bar-export-menu"');
    });

    it('includes all export options (Print, Email, Word, Privacy toggle) inside the export dropdown', () => {
      expect(formCode).toContain('data-testid="export-menu-print-btn"');
      expect(formCode).toContain('הדפס תוכנית עבודה');

      expect(formCode).toContain('data-testid="export-menu-email-btn"');
      expect(formCode).toContain('שלח למייל (Word / PDF)');

      expect(formCode).toContain('data-testid="export-menu-word-btn"');
      expect(formCode).toContain('הורד קובץ Word (.doc)');

      expect(formCode).toContain('export-dropdown-privacy');
      expect(formCode).toContain('הסתר פרטים מזהים בהדפסה');
    });

    it('defines professional CSS rules for the export dropdown and team chat badge', () => {
      expect(cssCode).toContain('.export-dropdown-wrapper');
      expect(cssCode).toContain('.btn-export-dropdown');
      expect(cssCode).toContain('.export-dropdown-menu');
      expect(cssCode).toContain('.export-dropdown-item');
      expect(cssCode).toContain('.export-dropdown-privacy');
      expect(cssCode).toContain('.team-chat-badge');
    });
  });
});
