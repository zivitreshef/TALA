import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SCHOOL_YEAR,
  DEFAULT_PLAN_TYPE,
  TACHI_PLAN_TYPE,
  getPlanTypeStorageKey,
  extractYearReportFromFormData,
  syncActiveReportSnapshot,
  hasContentInYearReport,
  isRawFreeTextAlreadyAnalyzed,
  normalizeStudentForForm
} from '../domain/yearReport';

const Y2 = 'תשפ"ז (2026-2027)';

describe('yearReport', () => {
  it('builds storage keys per plan type with a default year', () => {
    expect(getPlanTypeStorageKey(Y2, TACHI_PLAN_TYPE)).toBe(`${Y2}__tachi`);
    expect(getPlanTypeStorageKey(undefined, DEFAULT_PLAN_TYPE)).toBe(`${DEFAULT_SCHOOL_YEAR}__tala`);
  });

  it('syncActiveReportSnapshot writes the same snapshot to both maps and keeps other years', () => {
    const data = {
      schoolYear: Y2,
      planType: DEFAULT_PLAN_TYPE,
      teacherFreeText: 'טקסט',
      reportsByYear: { old: { teacherFreeText: 'ישן' } },
      reportsByPlanType: {}
    };
    const out = syncActiveReportSnapshot(data);
    const snap = extractYearReportFromFormData(data);
    expect(out.reportsByYear[Y2]).toEqual(snap);
    expect(out.reportsByPlanType[`${Y2}__tala`]).toEqual(snap);
    expect(out.reportsByYear.old.teacherFreeText).toBe('ישן');
    expect(data.reportsByYear[Y2]).toBeUndefined(); // input not mutated
  });

  it('hasContentInYearReport ignores whitespace-only goals', () => {
    expect(hasContentInYearReport(null)).toBe(false);
    expect(hasContentInYearReport({ goals: [{ title: '  ' }] })).toBe(false);
    expect(hasContentInYearReport({ statusReportSections: [{}] })).toBe(true);
  });

  it('isRawFreeTextAlreadyAnalyzed needs free text plus some derived content', () => {
    expect(isRawFreeTextAlreadyAnalyzed({ teacherFreeText: 'x' })).toBe(false);
    expect(isRawFreeTextAlreadyAnalyzed({ teacherFreeText: 'x', strengthsExisting: 'y' })).toBe(true);
  });

  it('normalizeStudentForForm migrates legacy תח"י-only strengths out of a תל"א report', () => {
    const out = normalizeStudentForForm({
      id: 's1',
      schoolYear: Y2,
      planType: DEFAULT_PLAN_TYPE,
      strengthsExisting: 'כוח'
    });
    expect(out.strengthsExisting).toBe('');
    expect(out.reportsByPlanType[`${Y2}__tachi`].strengthsExisting).toBe('כוח');
    expect(out.reportsByPlanType[`${Y2}__tachi`].planType).toBe(TACHI_PLAN_TYPE);
  });
});
