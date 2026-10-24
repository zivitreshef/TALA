import { describe, it, expect } from 'vitest';
import {
  LOCKED_EDITABLE_FIELDS,
  applyFieldChange,
  applyGoalChange,
  removeGoalRow,
  toggleFocusDomain,
  applyShareToggle,
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
});
