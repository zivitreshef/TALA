import { describe, it, expect } from 'vitest';
import { switchPlanType, switchSchoolYear } from '../domain/reportSwitching';
import { DEFAULT_PLAN_TYPE, TACHI_PLAN_TYPE, DEFAULT_SCHOOL_YEAR } from '../domain/yearReport';

const Y2 = 'תשפ"ז (2026-2027)';
const base = {
  id: 's1',
  schoolYear: DEFAULT_SCHOOL_YEAR,
  planType: DEFAULT_PLAN_TYPE,
  gender: 'girl',
  stage: 'school',
  teacherFreeText: 'מקור',
  schoolName: 'בית ספר א',
  goals: [{ id: 'g1', title: 'מטרה' }],
  reportsByYear: {},
  reportsByPlanType: {}
};

describe('switchPlanType', () => {
  it('is a no-op (same reference) for the same plan type', () => {
    expect(switchPlanType(base, DEFAULT_PLAN_TYPE)).toBe(base);
  });
  it('opens an empty תח"י report and stores the תל"א one', () => {
    const next = switchPlanType(base, TACHI_PLAN_TYPE);
    expect(next.planType).toBe(TACHI_PLAN_TYPE);
    expect(next.teacherFreeText).toBe('');
    expect(next.goals).toEqual([]);
    expect(next.reportsByPlanType[`${DEFAULT_SCHOOL_YEAR}__tala`].teacherFreeText).toBe('מקור');
  });
  it('round-trips back without losing data', () => {
    const back = switchPlanType(switchPlanType(base, TACHI_PLAN_TYPE), DEFAULT_PLAN_TYPE);
    expect(back.teacherFreeText).toBe('מקור');
    expect(back.goals.map((g) => g.title)).toEqual(['מטרה']);
  });
});

describe('switchSchoolYear', () => {
  it('is a no-op for the same year', () => {
    expect(switchSchoolYear(base, DEFAULT_SCHOOL_YEAR)).toBe(base);
  });
  it('creates a fresh report for an unseen year and stores the current one', () => {
    const next = switchSchoolYear(base, Y2);
    expect(next.schoolYear).toBe(Y2);
    expect(next.teacherFreeText).toBe('');
    expect(next.reportsByYear[DEFAULT_SCHOOL_YEAR].teacherFreeText).toBe('מקור');
  });
  it('round-trips back', () => {
    expect(switchSchoolYear(switchSchoolYear(base, Y2), DEFAULT_SCHOOL_YEAR).teacherFreeText).toBe('מקור');
  });
  it('keeps team fields from prev when the stored target report lacks them', () => {
    const withY2 = { ...base, reportsByYear: { [Y2]: { teacherFreeText: 'ב' } } };
    const next = switchSchoolYear(withY2, Y2);
    expect(next.teacherFreeText).toBe('ב');
    expect(next.schoolName).toBe('בית ספר א');
  });
});
