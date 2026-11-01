import {
  buildDefaultTalaProfileRows,
  adaptGoalToGender
} from '../goalBankData';
import {
  DEFAULT_SCHOOL_YEAR,
  DEFAULT_PLAN_TYPE,
  getPlanTypeStorageKey,
  extractYearReportFromFormData,
  hasContentInYearReport,
  buildFreshReportForPlanType
} from './yearReport';

export interface StudentFormDataForReport {
  planType?: string;
  schoolYear?: string;
  gender?: string;
  stage?: string;
  date?: string;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  schoolName?: string;
  gradeClass?: string;
  homeroomTeacher?: string;
  integrationTeacher?: string;
  additionalPartners?: string;
  learningSupportAssistant?: string;
  counselorName?: string;
  psychologistName?: string;
  matyaCoordinator?: string;
  emotionalTherapist?: string;
  paraMedicalTeam?: string;
  educationalFramework?: string;
  teacherFreeText?: string;
  goals?: Array<Record<string, unknown>>;
  reportsByPlanType?: Record<string, Record<string, unknown>>;
  reportsByYear?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export const switchPlanType = <T extends StudentFormDataForReport>(prev: T, newPlanType: string): T => {
  const currentPlanType = prev?.planType || DEFAULT_PLAN_TYPE;
  if (newPlanType === currentPlanType) return prev;

  const currentYear = prev?.schoolYear || DEFAULT_SCHOOL_YEAR;
  const prevStorageKey = getPlanTypeStorageKey(currentYear, currentPlanType);
  const nextStorageKey = getPlanTypeStorageKey(currentYear, newPlanType);

  const currentReportSnapshot = extractYearReportFromFormData(prev);
  const updatedReportsByPlanType = {
    ...(prev?.reportsByPlanType || {}),
    [prevStorageKey]: currentReportSnapshot
  };

  const existingTargetPlanReport = updatedReportsByPlanType[nextStorageKey];
  const genderToUse = prev?.gender || 'boy';

  const targetReportToLoad =
    existingTargetPlanReport && hasContentInYearReport(existingTargetPlanReport)
      ? {
          ...existingTargetPlanReport,
          planType: newPlanType,
          talaProfileRows: buildDefaultTalaProfileRows(existingTargetPlanReport.talaProfileRows as Array<Record<string, unknown>> | undefined),
          talaFocusDomains: Array.isArray(existingTargetPlanReport.talaFocusDomains)
            ? existingTargetPlanReport.talaFocusDomains
            : [],
          goals: ((existingTargetPlanReport.goals as Array<Record<string, unknown>>) || []).map((g) =>
            adaptGoalToGender(g, genderToUse)
          )
        }
      : buildFreshReportForPlanType(newPlanType, prev?.stage);

  return {
    ...prev,
    ...targetReportToLoad,
    planType: newPlanType,
    reportsByPlanType: {
      ...updatedReportsByPlanType,
      [nextStorageKey]: targetReportToLoad
    },
    reportsByYear: {
      ...(prev?.reportsByYear || {}),
      [currentYear]: targetReportToLoad
    }
  };
};

export const switchSchoolYear = <T extends StudentFormDataForReport>(prev: T, newYear: string): T => {
  const currentYear = prev?.schoolYear || DEFAULT_SCHOOL_YEAR;
  if (newYear === currentYear) return prev;

  const currentSnapshot = extractYearReportFromFormData(prev);
  const updatedReportsByYear = {
    ...(prev?.reportsByYear || {}),
    [currentYear]: currentSnapshot
  };
  const updatedReportsByPlanType = {
    ...(prev?.reportsByPlanType || {}),
    [getPlanTypeStorageKey(currentYear, prev?.planType)]: currentSnapshot
  };

  const existingTargetReport = updatedReportsByYear[newYear];
  const genderToUse = prev?.gender || 'boy';

  if (existingTargetReport) {
    const rawTarget = existingTargetReport as Record<string, unknown>;
    const resolvedPlanType =
      String(rawTarget.planType || prev?.planType || DEFAULT_PLAN_TYPE);
    return {
      ...prev,
      schoolYear: newYear,
      date: String(rawTarget.date || new Date().toLocaleDateString('he-IL')),
      planType: resolvedPlanType,
      isLocked: Boolean(rawTarget.isLocked),
      lockedAt: String(rawTarget.lockedAt || ''),
      lockedBy: String(rawTarget.lockedBy || ''),
      schoolName: rawTarget.schoolName ?? prev?.schoolName ?? '',
      gradeClass: rawTarget.gradeClass ?? prev?.gradeClass ?? '',
      homeroomTeacher: rawTarget.homeroomTeacher ?? prev?.homeroomTeacher ?? '',
      integrationTeacher: rawTarget.integrationTeacher ?? prev?.integrationTeacher ?? '',
      additionalPartners: rawTarget.additionalPartners ?? prev?.additionalPartners ?? '',
      learningSupportAssistant:
        rawTarget.learningSupportAssistant ?? prev?.learningSupportAssistant ?? '',
      counselorName: rawTarget.counselorName ?? prev?.counselorName ?? '',
      psychologistName: rawTarget.psychologistName ?? prev?.psychologistName ?? '',
      matyaCoordinator: rawTarget.matyaCoordinator ?? prev?.matyaCoordinator ?? '',
      emotionalTherapist:
        rawTarget.emotionalTherapist ?? prev?.emotionalTherapist ?? '',
      paraMedicalTeam: rawTarget.paraMedicalTeam ?? prev?.paraMedicalTeam ?? '',
      educationalFramework:
        rawTarget.educationalFramework ?? prev?.educationalFramework ?? '',
      teacherFreeText: rawTarget.teacherFreeText ?? prev?.teacherFreeText ?? '',
      goals: ((rawTarget.goals as Array<Record<string, unknown>>) || []).map((g) =>
        adaptGoalToGender(g, genderToUse)
      ),
      talaProfileRows: buildDefaultTalaProfileRows(rawTarget.talaProfileRows as Array<Record<string, unknown>> | undefined),
      talaFocusDomains: Array.isArray(rawTarget.talaFocusDomains)
        ? rawTarget.talaFocusDomains
        : [],
      evalReportFreeText: rawTarget.evalReportFreeText || '',
      evalReportSummary: rawTarget.evalReportSummary || '',
      statusReportSections: rawTarget.statusReportSections || null,
      reportsByYear: {
        ...updatedReportsByYear,
        [newYear]: existingTargetReport
      },
      reportsByPlanType: {
        ...updatedReportsByPlanType,
        [getPlanTypeStorageKey(newYear, resolvedPlanType)]: existingTargetReport
      }
    };
  }

  const freshYearReport = buildFreshReportForPlanType(
    prev?.planType || DEFAULT_PLAN_TYPE,
    prev?.stage
  );

  return {
    ...prev,
    ...freshYearReport,
    schoolYear: newYear,
    date: new Date().toLocaleDateString('he-IL'),
    isLocked: false,
    lockedAt: '',
    lockedBy: '',
    reportsByYear: {
      ...updatedReportsByYear,
      [newYear]: freshYearReport
    },
    reportsByPlanType: {
      ...updatedReportsByPlanType,
      [getPlanTypeStorageKey(newYear, prev?.planType || DEFAULT_PLAN_TYPE)]: freshYearReport
    }
  };
};
