import { describe, it, expect } from 'vitest';
import {
  LOCKED_EDITABLE_FIELDS,
  applyFieldChange,
  applyGoalChange,
  removeGoalRow,
  toggleFocusDomain
} from '../domain/workPlanEdits';

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
