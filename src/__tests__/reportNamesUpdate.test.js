import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLAN_TYPE,
  TACHI_PLAN_TYPE,
  DEFAULT_SCHOOL_YEAR,
  getPlanTypeStorageKey,
  buildFreshReportForPlanType,
  normalizeStudentForForm
} from '../domain/yearReport';
import { isTalaPlanType } from '../goalBankData';
import { switchPlanType } from '../domain/reportSwitching';
import { applyPreferencesToNewStudent } from '../domain/userPreferences';
import { getFullDocTitle } from '../export/wordAndPrintBuilders';

describe('Report Names Update: תוכנית לתלמיד ביה"ס & תוכנית אקולוגית לילדי הגן', () => {
  it('exports the newly specified canonical report names', () => {
    expect(DEFAULT_PLAN_TYPE).toBe('תוכנית לתלמיד ביה"ס');
    expect(TACHI_PLAN_TYPE).toBe('תוכנית אקולוגית לילדי הגן');
  });

  it('correctly classifies new report names in isTalaPlanType', () => {
    expect(isTalaPlanType(DEFAULT_PLAN_TYPE)).toBe(true);
    expect(isTalaPlanType('תוכנית לתלמיד ביה"ס')).toBe(true);
    expect(isTalaPlanType(TACHI_PLAN_TYPE)).toBe(false);
    expect(isTalaPlanType('תוכנית אקולוגית לילדי הגן')).toBe(false);
  });

  it('preserves full backwards compatibility for legacy planType strings in isTalaPlanType', () => {
    expect(isTalaPlanType('תל"א (תוכנית לימודים אישית)')).toBe(true);
    expect(isTalaPlanType('תל"א')).toBe(true);
    expect(isTalaPlanType('תח"י (תוכנית חינוכית יחידנית)')).toBe(false);
    expect(isTalaPlanType('תח"י')).toBe(false);
    expect(isTalaPlanType('')).toBe(true);
    expect(isTalaPlanType(null)).toBe(true);
    expect(isTalaPlanType(undefined)).toBe(true);
  });

  it('generates consistent storage keys for both new and legacy report names', () => {
    const yr = 'תשפ"ו (2025-2026)';
    expect(getPlanTypeStorageKey(yr, DEFAULT_PLAN_TYPE)).toBe(`${yr}__tala`);
    expect(getPlanTypeStorageKey(yr, 'תל"א (תוכנית לימודים אישית)')).toBe(`${yr}__tala`);

    expect(getPlanTypeStorageKey(yr, TACHI_PLAN_TYPE)).toBe(`${yr}__tachi`);
    expect(getPlanTypeStorageKey(yr, 'תח"י (תוכנית חינוכית יחידנית)')).toBe(`${yr}__tachi`);
  });

  it('switches smoothly between the new report types without data corruption', () => {
    const initialStudent = {
      id: 'st_test_1',
      schoolYear: DEFAULT_SCHOOL_YEAR,
      planType: DEFAULT_PLAN_TYPE,
      gender: 'boy',
      stage: 'school',
      teacherFreeText: 'טקסט חופשי לתלמיד בי"ס',
      goals: [{ id: 'g1', title: 'יעד ביה"ס' }],
      reportsByYear: {},
      reportsByPlanType: {}
    };

    // Switch to kindergarten report
    const kindergartenReport = switchPlanType(initialStudent, TACHI_PLAN_TYPE);
    expect(kindergartenReport.planType).toBe(TACHI_PLAN_TYPE);
    expect(kindergartenReport.teacherFreeText).toBe('');
    expect(kindergartenReport.goals).toEqual([]);
    expect(kindergartenReport.reportsByPlanType[`${DEFAULT_SCHOOL_YEAR}__tala`].teacherFreeText).toBe('טקסט חופשי לתלמיד בי"ס');

    // Switch back to school report
    const restoredSchoolReport = switchPlanType(kindergartenReport, DEFAULT_PLAN_TYPE);
    expect(restoredSchoolReport.planType).toBe(DEFAULT_PLAN_TYPE);
    expect(restoredSchoolReport.teacherFreeText).toBe('טקסט חופשי לתלמיד בי"ס');
    expect(restoredSchoolReport.goals).toHaveLength(1);
    expect(restoredSchoolReport.goals[0].title).toBe('יעד ביה"ס');
  });

  it('applies the new report names when creating a new student from preferences', () => {
    const student1 = applyPreferencesToNewStudent({ name: 'איתי' }, { defaultReportType: 'tala' });
    expect(student1.planType).toBe('תוכנית לתלמיד ביה"ס');

    const student2 = applyPreferencesToNewStudent({ name: 'נועה' }, { defaultReportType: 'tachi' });
    expect(student2.planType).toBe('תוכנית אקולוגית לילדי הגן');
  });

  it('builds official document titles containing the new report names', () => {
    expect(getFullDocTitle({ planType: DEFAULT_PLAN_TYPE })).toBe('תוכנית עבודה שנתית – תוכנית לתלמיד ביה"ס');
    expect(getFullDocTitle({ planType: TACHI_PLAN_TYPE })).toBe('תוכנית עבודה שנתית – תוכנית אקולוגית לילדי הגן');
  });

  it('initializes fresh reports with the appropriate default planType', () => {
    const schoolFresh = buildFreshReportForPlanType(DEFAULT_PLAN_TYPE);
    expect(schoolFresh.planType).toBe('תוכנית לתלמיד ביה"ס');

    const kinderFresh = buildFreshReportForPlanType(TACHI_PLAN_TYPE);
    expect(kinderFresh.planType).toBe('תוכנית אקולוגית לילדי הגן');
  });
});
