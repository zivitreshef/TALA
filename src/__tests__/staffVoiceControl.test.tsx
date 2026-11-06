import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StaffVoiceControl from '../components/form/StaffVoiceControl';
import {
  PREDEFINED_STAFF_ROLES,
  buildInviteDoc,
  buildStaffObservationNote,
  buildVoiceMergeText,
  buildWhatsAppShareUrl,
  extractStaffRecipientsFromStudent,
  getDefaultStaffQuestions,
  getInviteQuestions,
  summarizeInvites,
  type InviteDoc
} from '../domain/parentInvite';

vi.mock('../../firebaseBackend', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'teacher@school.org' }
  })
}));

vi.mock('../../services/inviteService', () => ({
  createInvite: vi.fn(),
  deleteInvite: vi.fn(),
  ensureTeacherSession: vi.fn(),
  markInviteReviewed: vi.fn(),
  subscribeToStudentInvites: vi.fn(() => () => {})
}));

describe('StaffVoiceControl & Multi-Disciplinary Team Feedback Domain', () => {
  it('extracts structured clickable staff recipients from populated student fields and splits comma-separated entries with roles', () => {
    const studentData = {
      homeroomTeacher: 'מיכל שליו',
      integrationTeacher: 'שרה כהן',
      learningSupportAssistant: 'נועה ברק',
      counselorName: 'גלית מור',
      psychologistName: 'ד"ר רונית שחר',
      matyaCoordinator: 'דפנה לוין',
      emotionalTherapist: 'עדי גבע',
      paraMedicalTeam: 'יעל רז (מרפאה בעיסוק, מתי"א), דנה לוי (מנתחת התנהגות)',
      additionalPartners: 'אורן כץ (מורה לספורט)'
    };

    const recipients = extractStaffRecipientsFromStudent(studentData, false);
    expect(recipients.length).toBe(10);

    // Verify specific extracted roles and names
    expect(recipients).toContainEqual(
      expect.objectContaining({
        role: 'פסיכולוגית',
        name: 'ד"ר רונית שחר',
        label: 'פסיכולוגית: ד"ר רונית שחר'
      })
    );
    expect(recipients).toContainEqual(
      expect.objectContaining({
        role: 'מטפלת רגשית / באומנויות',
        name: 'עדי גבע',
        label: 'מטפלת רגשית / באומנויות: עדי גבע'
      })
    );
    // Verify comma-separated paraMedicalTeam split into two distinct selectable staff members
    expect(recipients).toContainEqual(
      expect.objectContaining({
        role: 'מרפאה בעיסוק, מתי"א',
        name: 'יעל רז'
      })
    );
    expect(recipients).toContainEqual(
      expect.objectContaining({
        role: 'מנתחת התנהגות',
        name: 'דנה לוי'
      })
    );
    expect(recipients).toContainEqual(
      expect.objectContaining({
        role: 'מורה לספורט',
        name: 'אורן כץ'
      })
    );
  });

  it('builds staff invite doc, tailored staff questions, and WhatsApp share URL', () => {
    const doc = buildInviteDoc({
      ownerEmail: 'teacher@school.org',
      studentId: 'st_1',
      childFirstName: 'יונתן כהן',
      gender: 'boy',
      inviteType: 'staff',
      recipientRole: 'מרפאה בעיסוק',
      recipientName: 'יעל רז'
    });

    expect(doc.inviteType).toBe('staff');
    expect(doc.recipientRole).toBe('מרפאה בעיסוק');
    expect(doc.recipientName).toBe('יעל רז');
    expect(doc.childFirstName).toBe('יונתן');

    const questions = getInviteQuestions({
      childName: 'יונתן',
      gender: 'boy',
      inviteType: 'staff',
      recipientRole: 'מרפאה בעיסוק'
    });
    expect(questions).toHaveLength(3);
    expect(questions[0].label).toContain('במפגשי מרפאה בעיסוק');

    const defaultQs = getDefaultStaffQuestions({
      childName: 'נועה',
      gender: 'girl',
      recipientRole: 'מנתחת התנהגות'
    });
    expect(defaultQs[1]).toContain('מתמודדת');

    const waUrl = buildWhatsAppShareUrl('https://tala.app/#/share-input/tok123', {
      childFirstName: 'יונתן',
      inviteType: 'staff',
      recipientName: 'יעל רז',
      recipientRole: 'מרפאה בעיסוק'
    });
    const decoded = decodeURIComponent(waUrl);
    expect(decoded).toContain('שלום יעל רז (מרפאה בעיסוק)');
    expect(decoded).toContain('יונתן');
  });

  it('separates parent and staff invites in summarizeInvites and formats staff merge text & observation note', () => {
    const now = Date.now();
    const invites: Array<Partial<InviteDoc>> = [
      {
        token: 'parent_tok',
        status: 'submitted',
        responses: { strengths: 'ילד שמח' },
        createdAt: new Date(now - 1000)
      },
      {
        token: 'staff_tok',
        inviteType: 'staff',
        recipientName: 'יעל רז',
        recipientRole: 'מרפאה בעיסוק',
        status: 'submitted',
        responses: {
          strengths: 'מוטיבציה גבוהה במשחקי הרכבה',
          challenges: 'התעייפות מוטורית בכתיבה רציפה',
          goal: 'חיזוק חגורת כתפיים ואחיזת עיפרון'
        },
        createdAt: new Date(now)
      }
    ];

    const parentSummary = summarizeInvites(invites, now, 'parent');
    expect(parentSummary.unreviewed).toHaveLength(1);
    expect((parentSummary.unreviewed[0] as any).token).toBe('parent_tok');

    const staffSummary = summarizeInvites(invites, now, 'staff');
    expect(staffSummary.unreviewed).toHaveLength(1);
    expect((staffSummary.unreviewed[0] as any).token).toBe('staff_tok');

    const mergedBlock = buildVoiceMergeText(invites[1]);
    expect(mergedBlock).toContain('התייחסות צוות מקצועי (יעל רז – מרפאה בעיסוק)');
    expect(mergedBlock).toContain('מוטיבציה גבוהה במשחקי הרכבה');

    const obs = buildStaffObservationNote(invites[1]);
    expect(obs.authorName).toBe('יעל רז · מרפאה בעיסוק');
    expect(obs.note).toContain('חוזקות: מוטיבציה גבוהה במשחקי הרכבה');
    expect(obs.note).toContain('המלצות להמשך: חיזוק חגורת כתפיים ואחיזת עיפרון');
  });

  it('renders StaffVoiceControl modal with selectable staff chips from student card and submitted feedback actions', () => {
    const mockStudent = {
      id: 'st_100',
      name: 'יונתן כהן',
      gender: 'boy',
      psychologistName: 'ד"ר רונית שחר',
      emotionalTherapist: 'נועה לוי',
      paraMedicalTeam: 'יעל רז (מרפאה בעיסוק), דנה כץ (מנתחת התנהגות)'
    };

    const mockInvites = [
      {
        token: 'tok_staff_1',
        inviteType: 'staff' as const,
        recipientName: 'יעל רז',
        recipientRole: 'מרפאה בעיסוק',
        status: 'submitted',
        createdAt: new Date(),
        responses: {
          strengths: 'שיתוף פעולה מצוין',
          challenges: 'קושי בגזירה',
          goal: 'שימוש במספריים קפיציות'
        }
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(StaffVoiceControl, {
        student: mockStudent,
        currentUser: { email: 'teacher@school.org' },
        disabled: false,
        initialOpen: true,
        initialInvites: mockInvites
      })
    );

    expect(html).toContain('קול הצוות הרב-מקצועי');
    expect(html).toContain('פסיכולוגית: ד&quot;ר רונית שחר');
    expect(html).toContain('מטפלת רגשית / באומנויות: נועה לוי');
    expect(html).toContain('מרפאה בעיסוק: יעל רז');
    expect(html).toContain('מנתחת התנהגות: דנה כץ');
    expect(html).toContain('התקבל משוב מ: יעל רז · מרפאה בעיסוק');
    expect(html).toContain('שלבי בתיק התלמיד, במטרות וביומן התצפיות');
    expect(PREDEFINED_STAFF_ROLES).toContain('מנתחת התנהגות');
  });

  it('prevents 100% CPU infinite render loop in EcologicalWorkPlanForm and parses complex parenthesis strings in O(n) time', async () => {
    // 1. Regression test for linear O(n) parenthesis splitting (zero regex backtracking)
    const pathologicalInput = 'א'.repeat(50) + ' (' + ', '.repeat(250) + 'ללא סגירה';
    const t0 = performance.now();
    const parsed = extractStaffRecipientsFromStudent(
      {
        paraMedicalTeam: `${pathologicalInput}, יעל רז (מרפאה בעיסוק, מתי"א), דנה כץ (מנתחת התנהגות)`
      },
      false
    );
    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(50);
    expect(parsed.length).toBeGreaterThanOrEqual(1);

    // 2. Regression test for EcologicalWorkPlanForm draft-state useEffect dependency stability
    const fs = await import('fs');
    const path = await import('path');
    const formSource = fs.readFileSync(
      path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx'),
      'utf8'
    );
    expect(formSource).toContain('lastReportedDraftSigRef');
    expect(formSource).not.toContain('}, [formData, onDraftStateChange, onSaveStudentPlan]);');
  });
});
