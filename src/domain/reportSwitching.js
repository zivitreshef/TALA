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

export const switchPlanType = (prev, newPlanType) => {
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
          talaProfileRows: buildDefaultTalaProfileRows(existingTargetPlanReport.talaProfileRows),
          talaFocusDomains: Array.isArray(existingTargetPlanReport.talaFocusDomains)
            ? existingTargetPlanReport.talaFocusDomains
            : [],
          goals: (existingTargetPlanReport.goals || []).map((g) =>
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

export const switchSchoolYear = (prev, newYear) => {
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
    const resolvedPlanType =
      existingTargetReport.planType || prev?.planType || DEFAULT_PLAN_TYPE;
    return {
      ...prev,
      schoolYear: newYear,
      date: existingTargetReport.date || new Date().toLocaleDateString('he-IL'),
      planType: resolvedPlanType,
      isLocked: Boolean(existingTargetReport.isLocked),
      lockedAt: existingTargetReport.lockedAt || '',
      lockedBy: existingTargetReport.lockedBy || '',
      schoolName: existingTargetReport.schoolName ?? prev?.schoolName ?? '',
      gradeClass: existingTargetReport.gradeClass ?? prev?.gradeClass ?? '',
      homeroomTeacher: existingTargetReport.homeroomTeacher ?? prev?.homeroomTeacher ?? '',
      integrationTeacher: existingTargetReport.integrationTeacher ?? prev?.integrationTeacher ?? '',
      additionalPartners: existingTargetReport.additionalPartners ?? prev?.additionalPartners ?? '',
      learningSupportAssistant:
        existingTargetReport.learningSupportAssistant ?? prev?.learningSupportAssistant ?? '',
      counselorName: existingTargetReport.counselorName ?? prev?.counselorName ?? '',
      psychologistName: existingTargetReport.psychologistName ?? prev?.psychologistName ?? '',
      matyaCoordinator: existingTargetReport.matyaCoordinator ?? prev?.matyaCoordinator ?? '',
      emotionalTherapist:
        existingTargetReport.emotionalTherapist ?? prev?.emotionalTherapist ?? '',
      paraMedicalTeam: existingTargetReport.paraMedicalTeam ?? prev?.paraMedicalTeam ?? '',
      teacherFreeText: existingTargetReport.teacherFreeText || '',
      freeTextAnalyzed: Boolean(existingTargetReport.freeTextAnalyzed),
      removedAiGoals: Array.isArray(existingTargetReport.removedAiGoals)
        ? existingTargetReport.removedAiGoals
        : [],
      strengthsExisting: existingTargetReport.strengthsExisting || '',
      strengthsToEmpower: existingTargetReport.strengthsToEmpower || '',
      studentGeneralBackground: existingTargetReport.studentGeneralBackground || '',
      studentSupportReceived: existingTargetReport.studentSupportReceived || '',
      studentMainGoal: existingTargetReport.studentMainGoal || '',
      talaProfileRows: buildDefaultTalaProfileRows(existingTargetReport.talaProfileRows),
      talaFocusDomains: Array.isArray(existingTargetReport.talaFocusDomains)
        ? existingTargetReport.talaFocusDomains
        : [],
      recommendations: existingTargetReport.recommendations || '',
      evalReportFreeText: existingTargetReport.evalReportFreeText || '',
      evalReportSummary: existingTargetReport.evalReportSummary || '',
      statusReportSections: Array.isArray(existingTargetReport.statusReportSections)
        ? existingTargetReport.statusReportSections
        : [],
      statusReportUpdatedAt: existingTargetReport.statusReportUpdatedAt || '',
      lastSavedAt: existingTargetReport.lastSavedAt || '',
      goals: (existingTargetReport.goals || []).map((g) =>
        adaptGoalToGender(g, genderToUse)
      ),
      reportsByYear: updatedReportsByYear,
      reportsByPlanType: updatedReportsByPlanType
    };
  }

  const freshReport = buildFreshReportForPlanType(
    prev?.planType || DEFAULT_PLAN_TYPE,
    prev?.stage
  );

  return {
    ...prev,
    schoolYear: newYear,
    ...freshReport,
    reportsByYear: {
      ...updatedReportsByYear,
      [newYear]: freshReport
    },
    reportsByPlanType: {
      ...updatedReportsByPlanType,
      [getPlanTypeStorageKey(newYear, freshReport.planType)]: freshReport
    }
  };
};
