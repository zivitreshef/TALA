import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SCHOOL_YEAR,
  DEFAULT_PLAN_TYPE,
  getPlanTypeStorageKey,
  normalizeStudentForForm,
  getSchoolYearForDate,
  getCurrentSchoolYear,
  associateStudentToWorkingYear
} from '../domain/yearReport';
import {
  getNextSchoolYear,
  buildRolloverStudentForNextYear,
  SCHOOL_YEARS_LIST
} from '../domain/schoolYearRollover';
import { INITIAL_STUDENTS_DATA } from '../goalBankData';
import { DEMO_STUDENT_DATA } from '../domain/onboardingJourney';

describe('Default Working School Year and Automatic August Transition', () => {
  it('sets DEFAULT_SCHOOL_YEAR dynamically and includes it in SCHOOL_YEARS_LIST', () => {
    expect(DEFAULT_SCHOOL_YEAR).toBe('תשפ"ז (2026-2027)');
    expect(getCurrentSchoolYear()).toBe('תשפ"ז (2026-2027)');
    expect(SCHOOL_YEARS_LIST).toContain(DEFAULT_SCHOOL_YEAR);
  });

  describe('getSchoolYearForDate: Last day of August transition rule', () => {
    it('remains in 2025-2026 prior to the last day of August 2026', () => {
      // August 30th, 2026 -> Still 2025-2026
      const aug30 = new Date(2026, 7, 30);
      expect(getSchoolYearForDate(aug30)).toBe('תשפ"ו (2025-2026)');

      // Mid-year: June 15, 2026
      const jun15 = new Date(2026, 5, 15);
      expect(getSchoolYearForDate(jun15)).toBe('תשפ"ו (2025-2026)');
    });

    it('transitions to 2026-2027 on August 31st (last day of August) and onward', () => {
      // August 31st, 2026 -> Transitions to 2026-2027
      const aug31 = new Date(2026, 7, 31);
      expect(getSchoolYearForDate(aug31)).toBe('תשפ"ז (2026-2027)');

      // September 1st, 2026
      const sep1 = new Date(2026, 8, 1);
      expect(getSchoolYearForDate(sep1)).toBe('תשפ"ז (2026-2027)');

      // Mid-year of 2026-2027: February 10, 2027
      const feb10 = new Date(2027, 1, 10);
      expect(getSchoolYearForDate(feb10)).toBe('תשפ"ז (2026-2027)');

      // August 30th, 2027 -> Still 2026-2027
      const aug30Next = new Date(2027, 7, 30);
      expect(getSchoolYearForDate(aug30Next)).toBe('תשפ"ז (2026-2027)');
    });

    it('transitions to 2027-2028 on August 31st, 2027 and onward', () => {
      // August 31st, 2027 -> Transitions to 2027-2028
      const aug31Next = new Date(2027, 7, 31);
      expect(getSchoolYearForDate(aug31Next)).toBe('תשפ"ח (2027-2028)');

      // September 1st, 2027
      const sep1Next = new Date(2027, 8, 1);
      expect(getSchoolYearForDate(sep1Next)).toBe('תשפ"ח (2027-2028)');
    });
  });

  describe('associateStudentToWorkingYear (Under the hood migration without manual rollover)', () => {
    it('associates student from 2025-2026 to 2026-2027 preserving existing reports and content', () => {
      const student: any = {
        id: 'st_123',
        name: 'דניאל כהן',
        schoolYear: 'תשפ"ו (2025-2026)',
        teacherFreeText: 'טקסט חופשי',
        reportsByYear: {
          'תשפ"ו (2025-2026)': { teacherFreeText: 'טקסט שנת תשפ"ו', goals: [{ id: 'g1' }] }
        },
        reportsByPlanType: {
          'תשפ"ו (2025-2026)__tala': { teacherFreeText: 'תל"א תשפ"ו' },
          'תשפ"ו (2025-2026)__tachi': { teacherFreeText: 'תח"י תשפ"ו' }
        }
      };

      const migrated = associateStudentToWorkingYear(student, 'תשפ"ז (2026-2027)');
      expect(migrated.schoolYear).toBe('תשפ"ז (2026-2027)');

      // reportsByYear migrated key
      expect(migrated.reportsByYear['תשפ"ז (2026-2027)']).toBeDefined();
      expect(migrated.reportsByYear['תשפ"ז (2026-2027)'].teacherFreeText).toBe('טקסט שנת תשפ"ו');
      expect(migrated.reportsByYear['תשפ"ו (2025-2026)']).toBeUndefined();

      // reportsByPlanType migrated keys
      expect(migrated.reportsByPlanType['תשפ"ז (2026-2027)__tala']).toBeDefined();
      expect(migrated.reportsByPlanType['תשפ"ז (2026-2027)__tala'].teacherFreeText).toBe('תל"א תשפ"ו');
      expect(migrated.reportsByPlanType['תשפ"ז (2026-2027)__tachi']).toBeDefined();
      expect(migrated.reportsByPlanType['תשפ"ז (2026-2027)__tachi'].teacherFreeText).toBe('תח"י תשפ"ו');
      expect(migrated.reportsByPlanType['תשפ"ו (2025-2026)__tala']).toBeUndefined();
      expect(migrated.reportsByPlanType['תשפ"ו (2025-2026)__tachi']).toBeUndefined();
    });

    it('leaves students who are already on target year unchanged', () => {
      const student: any = {
        id: 'st_already_target',
        schoolYear: 'תשפ"ז (2026-2027)'
      };
      const result = associateStudentToWorkingYear(student, 'תשפ"ז (2026-2027)');
      expect(result).toBe(student);
    });

    it('seamlessly auto-associates legacy 2025-2026 student on normalizeStudentForForm', () => {
      const legacyStudent = {
        id: 'st_legacy',
        name: 'נועה',
        schoolYear: 'תשפ"ו (2025-2026)',
        teacherFreeText: 'מטרות שילוב',
        reportsByYear: {
          'תשפ"ו (2025-2026)': { teacherFreeText: 'מטרות שילוב' }
        }
      };

      const normalized = normalizeStudentForForm(legacyStudent);
      expect(normalized.schoolYear).toBe('תשפ"ז (2026-2027)');
      expect(normalized.reportsByYear['תשפ"ז (2026-2027)']).toBeDefined();
    });
  });

  describe('Rollover and Sequential Calculations', () => {
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
});
