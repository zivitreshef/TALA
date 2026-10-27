import { describe, it, expect } from 'vitest';
import {
  LOCKED_EDITABLE_FIELDS,
  applyFieldChange,
  applyGoalChange,
  removeGoalRow,
  toggleFocusDomain,
  applyShareToggle,
  createTeamMessage,
  appendTeamMessage,
  retractTeamMessage,
  addManualStatusSection,
  updateStatusSection,
  removeStatusSection
} from '../domain/workPlanEdits';
import { STATUS_REPORT_SECTIONS_SCHEMA } from '../goalBankData';

const now = new Date('2026-10-24T10:00:00Z');

describe('workPlanEdits', () => {
  it('locked reports still allow evaluation/status fields only', () => {
    expect(LOCKED_EDITABLE_FIELDS.has('evalReportSummary')).toBe(true);
    expect(LOCKED_EDITABLE_FIELDS.has('statusReportSections')).toBe(true);
    expect(LOCKED_EDITABLE_FIELDS.has('teacherFreeText')).toBe(false);
  });
  it('explicit stage choice is stamped as user_explicit', () => {
    const next = applyFieldChange({ stage: 'school' }, 'stage', 'kindergarten', now);
    expect(next).toMatchObject({
      stage: 'kindergarten',
      stageSource: 'user_explicit',
      stageReason: 'בחירת משתמש: גן ילדים',
      stageUpdatedAt: now.toISOString()
    });
  });
  it('does not auto-detect stage over an explicit user choice', () => {
    const prev = { stage: 'school', stageSource: 'user_explicit' };
    expect(applyFieldChange(prev, 'educationalFramework', 'גן חובה', now).stage).toBe('school');
  });
  it('eval edits do not mark a goal as teacher-modified; content edits do', () => {
    const prev = { goals: [{ id: 'g1' }] };
    expect(applyGoalChange(prev, 'g1', 'midYearEvaluation', 'x').goals[0].isTeacherModified).toBeUndefined();
    expect(applyGoalChange(prev, 'g1', 'title', 'x').goals[0].isTeacherModified).toBe(true);
  });
  it('removing a non-empty goal records it; an empty goal is not recorded', () => {
    const prev = {
      removedAiGoals: [],
      goals: [
        { id: 'g1', title: ' מטרה ', environment: 'כיתה' },
        { id: 'g2' }
      ]
    };
    const a = removeGoalRow(prev, 'g1');
    expect(a.goals.map((g) => g.id)).toEqual(['g2']);
    expect(a.removedAiGoals[0]).toMatchObject({ id: 'g1', title: 'מטרה', environment: 'כיתה' });
    expect(removeGoalRow(prev, 'g2').removedAiGoals).toEqual([]);
  });
  it('toggles focus domains', () => {
    expect(toggleFocusDomain({ talaFocusDomains: ['רגשי'] }, 'רגשי').talaFocusDomains).toEqual([]);
    expect(toggleFocusDomain({}, 'חברתי').talaFocusDomains).toEqual(['חברתי']);
  });
});

describe('sharing & status sections', () => {
  it('normalizes and toggles colleague emails', () => {
    const r1 = applyShareToggle({ sharedWith: [], sharedReadBy: ['a@b.com'] }, ' A@B.com ', { name: 'זיוית' }, '24.10.26');
    expect(r1).toMatchObject({ cleanEmail: 'a@b.com', isNewlyShared: true });
    expect(r1.next.sharedWith).toEqual(['a@b.com']);
    expect(r1.next.sharedAtByEmail['a@b.com']).toBe('24.10.26');
    expect(r1.next.sharedReadBy).toEqual([]);
    const r2 = applyShareToggle(r1.next, 'a@b.com', {}, 'x');
    expect(r2.isNewlyShared).toBe(false);
    expect(r2.next.sharedWith).toEqual([]);
    expect(applyShareToggle({}, '   ', {}, 'x')).toBeNull();
  });

  it('strictly blocks sharing with colleagues from different groups or when user has no group', () => {
    const allowedUsers = [
      { email: 'teacher1@center.org', group: 'מתי"א מרכז', active: true },
      { email: 'teacher2@center.org', group: 'מתי"א מרכז', active: true },
      { email: 'teacher3@north.org', group: 'מתי"א צפון', active: true },
      { email: 'admin@tala.org', group: '', active: true }
    ];

    const student = { sharedWith: [] };

    // 1. Success: same group (מתי"א מרכז -> מתי"א מרכז)
    const success = applyShareToggle(
      student,
      'teacher2@center.org',
      { email: 'teacher1@center.org', group: 'מתי"א מרכז' },
      'now',
      { allowedUsers }
    );
    expect(success).not.toBeNull();
    expect(success.next.sharedWith).toEqual(['teacher2@center.org']);

    // 2. Blocked: cross-group (מתי"א מרכז -> מתי"א צפון)
    const crossGroup = applyShareToggle(
      student,
      'teacher3@north.org',
      { email: 'teacher1@center.org', group: 'מתי"א מרכז' },
      'now',
      { allowedUsers }
    );
    expect(crossGroup).toBeNull();

    // 3. Blocked: user without group (admin with no group cannot share with teachers)
    const noGroup = applyShareToggle(
      student,
      'teacher1@center.org',
      { email: 'admin@tala.org', group: '' },
      'now',
      { allowedUsers }
    );
    expect(noGroup).toBeNull();

    // 4. Unsharing: always allowed even if groups differed or changed
    const unshare = applyShareToggle(
      { sharedWith: ['teacher3@north.org'] },
      'teacher3@north.org',
      { email: 'teacher1@center.org', group: 'מתי"א מרכז' },
      'now',
      { allowedUsers }
    );
    expect(unshare).not.toBeNull();
    expect(unshare.isNewlyShared).toBe(false);
    expect(unshare.next.sharedWith).toEqual([]);
  });

  it('adds a manual status section once, sorted; ignores unknown numbers', () => {
    const [first, second] = STATUS_REPORT_SECTIONS_SCHEMA;
    const a = addManualStatusSection({ statusReportSections: [] }, String(second.sectionNumber));
    const b = addManualStatusSection(a, first.sectionNumber);
    expect(b.statusReportSections.map((s) => s.sectionNumber)).toEqual([first.sectionNumber, second.sectionNumber]);
    expect(addManualStatusSection(b, first.sectionNumber)).toBe(b);
    expect(addManualStatusSection(b, 9999)).toBe(b);
  });
  it('updates and removes status sections', () => {
    const prev = { statusReportSections: [{ sectionNumber: 1, content: 'ישן' }, { sectionNumber: 2, content: '2' }] };
    const updated = updateStatusSection(prev, 1, 'חדש');
    expect(updated.statusReportSections[0].content).toBe('חדש');
    const removed = removeStatusSection(updated, 1);
    expect(removed.statusReportSections.map((s) => s.sectionNumber)).toEqual([2]);
  });

  describe('Team Messages & Share Handoff Notes', () => {
    it('creates, sanitizes, and limits team messages', () => {
      // 1. Valid message
      const msg = createTeamMessage({
        authorEmail: 'sara@school.org',
        authorName: 'שרה כהן',
        authorRole: 'מחנכת',
        text: '  היי דנה, אנא הוסיפי מטרות תקשורת  ',
        type: 'comment'
      });
      expect(msg).toMatchObject({
        authorEmail: 'sara@school.org',
        authorName: 'שרה כהן',
        authorRole: 'מחנכת',
        text: 'היי דנה, אנא הוסיפי מטרות תקשורת',
        type: 'comment'
      });
      expect(msg.id).toMatch(/^msg_/);
      expect(msg.createdAt).toBeDefined();

      // 2. Strips HTML tags and caps at 800 characters
      const longHtml = '<script>alert("xss")</script><b>הודעה חשובה:</b> ' + 'א'.repeat(1000);
      const sanitized = createTeamMessage({
        authorEmail: 'sara@school.org',
        text: longHtml
      });
      expect(sanitized.text.startsWith('הודעה חשובה: ')).toBe(true);
      expect(sanitized.text.includes('<script>')).toBe(false);
      expect(sanitized.text.length).toBeLessThanOrEqual(800);

      // 3. Rejects empty messages or missing author
      expect(createTeamMessage({ authorEmail: 'sara@school.org', text: '   ' })).toBeNull();
      expect(createTeamMessage({ authorEmail: '', text: 'תוכן תקין' })).toBeNull();
    });

    it('appends a team message to the student plan', () => {
      const student = { name: 'דניאל', teamMessages: [] };
      const msg = createTeamMessage({
        authorEmail: 'sara@school.org',
        authorName: 'שרה',
        text: 'הודעה ראשונה'
      });
      const updated = appendTeamMessage(student, msg);
      expect(updated.teamMessages).toHaveLength(1);
      expect(updated.teamMessages[0].id).toBe(msg.id);
      expect(updated.teamMessages[0].text).toBe('הודעה ראשונה');

      // Invalid message or student returns same
      expect(appendTeamMessage(student, null)).toBe(student);
    });

    it('enforces author-only message retraction', () => {
      const student = {
        name: 'דניאל',
        teamMessages: [
          {
            id: 'msg_1',
            authorEmail: 'sara@school.org',
            authorName: 'שרה',
            text: 'מטרות שפה מעודכנות'
          },
          {
            id: 'msg_2',
            authorEmail: 'dana@school.org',
            authorName: 'דנה',
            text: 'מטרות תקשורת'
          }
        ]
      };

      // 1. Sara cannot retract Dana's message
      const blocked = retractTeamMessage(student, 'msg_2', 'sara@school.org');
      expect(blocked.teamMessages.find((m) => m.id === 'msg_2').isDeleted).toBeUndefined();

      // 2. Dana can retract her own message
      const retracted = retractTeamMessage(student, 'msg_2', 'dana@school.org');
      const target = retracted.teamMessages.find((m) => m.id === 'msg_2');
      expect(target.isDeleted).toBe(true);
      expect(target.text).toBe('הודעה זו נמחקה על ידי המחבר/ת');
      expect(target.deletedAt).toBeDefined();

      // 3. Sara's message remains untouched
      expect(retracted.teamMessages.find((m) => m.id === 'msg_1').isDeleted).toBeUndefined();
    });

    it('automatically attaches a share handoff note when toggling share with note options', () => {
      const allowedUsers = [
        { email: 'teacher1@center.org', group: 'מתי"א מרכז', active: true },
        { email: 'therapist@center.org', group: 'מתי"א מרכז', active: true }
      ];
      const student = { sharedWith: [], teamMessages: [] };

      const res = applyShareToggle(
        student,
        'therapist@center.org',
        { email: 'teacher1@center.org', name: 'שרה המחנכת', group: 'מתי"א מרכז' },
        '24.10.26',
        {
          allowedUsers,
          handoffNote: 'נא להוסיף מטרות לקראת ועדת שילוב',
          recipientName: 'מיכל המרפאה'
        }
      );

      expect(res).not.toBeNull();
      expect(res.next.sharedWith).toEqual(['therapist@center.org']);
      expect(res.next.teamMessages).toHaveLength(1);
      const note = res.next.teamMessages[0];
      expect(note.type).toBe('share_handoff');
      expect(note.text).toBe('נא להוסיף מטרות לקראת ועדת שילוב');
      expect(note.recipientEmail).toBe('therapist@center.org');
      expect(note.authorEmail).toBe('teacher1@center.org');
    });
  });
});
