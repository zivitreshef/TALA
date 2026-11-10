import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SCHOOL_YEAR,
  DEFAULT_PLAN_TYPE,
  getPlanTypeStorageKey,
  normalizeStudentForForm
} from '../domain/yearReport';
import {
  getNextSchoolYear,
  buildRolloverStudentForNextYear,
  SCHOOL_YEARS_LIST
} from '../domain/schoolYearRollover';
import { INITIAL_STUDENTS_DATA } from '../goalBankData';
import { DEMO_STUDENT_DATA } from '../domain/onboardingJourney';

describe('Default Working School Year 2026-2027 Configuration', () => {
  it('sets DEFAULT_SCHOOL_YEAR to תשפ"ז (2026-2027)', () => {
    expect(DEFAULT_SCHOOL_YEAR).toBe('תשפ"ז (2026-2027)');
    expect(SCHOOL_YEARS_LIST).toContain(DEFAULT_SCHOOL_YEAR);
  });

  it('calculates the next school year sequentially from 2026-2027 to 2027-2028', () => {
    expect(getNextSchoolYear(DEFAULT_SCHOOL_YEAR)).toBe('תשפ"ח (2027-2028)');
    expect(getNextSchoolYear(null)).toBe('תשפ"ח (2027-2028)');
    expect(getNextSchoolYear(undefined)).toBe('תשפ"ח (2027-2028)');
  });

  it('defaults buildRolloverStudentForNextYear sourceYear to 2026-2027 when unspecified', () => {
    const emptyStudent = {
      name: 'רוני ישראלי',
      goals: []
    };
    const rolled = buildRolloverStudentForNextYear(emptyStudent);
    expect(rolled).not.toBeNull();
    expect(rolled?.schoolYear).toBe('תשפ"ח (2027-2028)');
    expect(rolled?.reportsByYear?.[DEFAULT_SCHOOL_YEAR]).toBeDefined();
  });

  it('normalizes new students to DEFAULT_SCHOOL_YEAR when schoolYear is omitted', () => {
    const rawStudent = {
      id: 'st_new_default',
      name: 'תמר לוי',
      goals: []
    };
    const normalized = normalizeStudentForForm(rawStudent);
    expect(normalized.schoolYear).toBe('תשפ"ז (2026-2027)');
    expect(normalized.reportsByYear['תשפ"ז (2026-2027)']).toBeDefined();
  });

  it('generates storage keys using DEFAULT_SCHOOL_YEAR when schoolYear is undefined', () => {
    expect(getPlanTypeStorageKey(undefined, DEFAULT_PLAN_TYPE)).toBe('תשפ"ז (2026-2027)__tala');
  });

  it('aligns demo and initial student datasets with the active 2026-2027 working year', () => {
    expect(INITIAL_STUDENTS_DATA[0].schoolYear).toBe('תשפ"ז (2026-2027)');
    expect(DEMO_STUDENT_DATA.schoolYear).toBe('תשפ"ז (2026-2027)');
    expect((DEMO_STUDENT_DATA.statusReport as any)?.academicYear).toBe('תשפ"ז (2026-2027)');
  });
});
