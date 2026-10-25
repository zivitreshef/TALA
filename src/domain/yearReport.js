import {
  ENVIRONMENTS_LIST,
  buildDefaultTalaProfileRows,
  isTalaPlanType,
  adaptGoalToGender
} from '../goalBankData';
import { hasPopulatedTalaProfile } from '../export/wordAndPrintBuilders';
import { detectStudentStage } from '../studentStage.js';
import {
  getDefaultEnvironmentForStage,
  getDefaultPartnersForStage
} from './stageGuard.js';

export const DEFAULT_SCHOOL_YEAR = 'תשפ"ו (2025-2026)';
export const DEFAULT_PLAN_TYPE = 'תל"א (תוכנית לימודים אישית)';
export const TACHI_PLAN_TYPE = 'תח"י (תוכנית חינוכית יחידנית)';

export const getPlanTypeStorageKey = (schoolYear, planType) => {
  const yr = schoolYear || DEFAULT_SCHOOL_YEAR;
  const typeKey = isTalaPlanType(planType) ? 'tala' : 'tachi';
  return `${yr}__${typeKey}`;
};

export const buildFreshReportForPlanType = (planType, stage) => {
  const resolvedPlanType = planType || DEFAULT_PLAN_TYPE;
  const isTala = isTalaPlanType(resolvedPlanType);
  const isSchoolStage = stage === 'school';

  return {
    date: new Date().toLocaleDateString('he-IL'),
    planType: resolvedPlanType,
    isLocked: false,
    lockedAt: '',
    lockedBy: '',
    schoolName: '',
    gradeClass: '',
    homeroomTeacher: '',
    integrationTeacher: '',
    additionalPartners: '',
    learningSupportAssistant: '',
    counselorName: '',
    psychologistName: '',
    matyaCoordinator: '',
    emotionalTherapist: '',
    paraMedicalTeam: '',
    teacherFreeText: '',
    freeTextAnalyzed: false,
    removedAiGoals: [],
    strengthsExisting: '',
    strengthsToEmpower: '',
    studentGeneralBackground: '',
    studentSupportReceived: '',
    studentMainGoal: '',
    talaProfileRows: buildDefaultTalaProfileRows(),
    talaFocusDomains: [],
    recommendations: '',
    evalReportFreeText: '',
    evalReportSummary: '',
    statusReportSections: [],
    statusReportUpdatedAt: '',
    lastSavedAt: '',
    goals: []
  };
};

export const extractYearReportFromFormData = (data) => ({
  date: data?.date || new Date().toLocaleDateString('he-IL'),
  planType: data?.planType || DEFAULT_PLAN_TYPE,
  isLocked: Boolean(data?.isLocked),
  lockedAt: data?.lockedAt || '',
  lockedBy: data?.lockedBy || '',
  schoolName: data?.schoolName || '',
  gradeClass: data?.gradeClass || '',
  homeroomTeacher: data?.homeroomTeacher || '',
  integrationTeacher: data?.integrationTeacher || '',
  additionalPartners: data?.additionalPartners || '',
  learningSupportAssistant: data?.learningSupportAssistant || '',
  counselorName: data?.counselorName || '',
  psychologistName: data?.psychologistName || '',
  matyaCoordinator: data?.matyaCoordinator || '',
  emotionalTherapist: data?.emotionalTherapist || '',
  paraMedicalTeam: data?.paraMedicalTeam || '',
  teacherFreeText: data?.teacherFreeText || '',
  freeTextAnalyzed: Boolean(data?.freeTextAnalyzed),
  removedAiGoals: Array.isArray(data?.removedAiGoals) ? data.removedAiGoals : [],
  strengthsExisting: data?.strengthsExisting || '',
  strengthsToEmpower: data?.strengthsToEmpower || '',
  studentGeneralBackground: data?.studentGeneralBackground || '',
  studentSupportReceived: data?.studentSupportReceived || '',
  studentMainGoal: data?.studentMainGoal || '',
  talaProfileRows: buildDefaultTalaProfileRows(data?.talaProfileRows),
  talaFocusDomains: Array.isArray(data?.talaFocusDomains) ? data.talaFocusDomains : [],
  recommendations: data?.recommendations || '',
  evalReportFreeText: data?.evalReportFreeText || '',
  evalReportSummary: data?.evalReportSummary || '',
  statusReportSections: Array.isArray(data?.statusReportSections) ? data.statusReportSections : [],
  statusReportUpdatedAt: data?.statusReportUpdatedAt || '',
  lastSavedAt: data?.lastSavedAt || '',
  goals: (data?.goals || []).map((g) => adaptGoalToGender(g, data?.gender || 'boy'))
});

export const isRawFreeTextAlreadyAnalyzed = (data) =>
  Boolean(
    data?.freeTextAnalyzed ||
      ((data?.teacherFreeText || '').trim() &&
        ((data?.strengthsExisting || '').trim() ||
          (data?.strengthsToEmpower || '').trim() ||
          (data?.studentGeneralBackground || '').trim() ||
          (data?.studentSupportReceived || '').trim() ||
          (data?.studentMainGoal || '').trim() ||
          hasPopulatedTalaProfile(data) ||
          (data?.goals || []).some((g) => (g?.title || '').trim())))
  );

export const hasContentInYearReport = (rep) => {
  if (!rep) return false;
  return Boolean(
    (rep.teacherFreeText && rep.teacherFreeText.trim()) ||
      (rep.strengthsExisting && rep.strengthsExisting.trim()) ||
      (rep.strengthsToEmpower && rep.strengthsToEmpower.trim()) ||
      (rep.studentGeneralBackground && rep.studentGeneralBackground.trim()) ||
      (rep.studentSupportReceived && rep.studentSupportReceived.trim()) ||
      (rep.studentMainGoal && rep.studentMainGoal.trim()) ||
      hasPopulatedTalaProfile(rep) ||
      (rep.recommendations && rep.recommendations.trim()) ||
      (rep.evalReportFreeText && rep.evalReportFreeText.trim()) ||
      (rep.evalReportSummary && rep.evalReportSummary.trim()) ||
      (Array.isArray(rep.statusReportSections) && rep.statusReportSections.length > 0) ||
      (rep.goals || []).some(
        (g) => (g.title && g.title.trim()) || (g.objectives && g.objectives.trim())
      )
  );
};

export const normalizeStudentForForm = (st) => {
  const initialGender = st?.gender || 'boy';
  const currentYear = st?.schoolYear || DEFAULT_SCHOOL_YEAR;
  const currentPlanType = st?.planType || DEFAULT_PLAN_TYPE;
  const normalizedGoals = (st?.goals || []).map((g) =>
    adaptGoalToGender(g, initialGender)
  );
  const normalizedTalaProfileRows = buildDefaultTalaProfileRows(st?.talaProfileRows);
  const normalizedTalaFocusDomains = Array.isArray(st?.talaFocusDomains)
    ? st.talaFocusDomains
    : [];
  const existingReports = { ...(st?.reportsByYear || {}) };
  const existingReportsByPlanType = { ...(st?.reportsByPlanType || {}) };
  const initialRemovedAiGoals = Array.isArray(st?.removedAiGoals) ? st.removedAiGoals : [];
  const initialStatusReportSections = Array.isArray(st?.statusReportSections)
    ? st.statusReportSections
    : [];
  const initialLocked = Boolean(st?.isLocked);

  // Detect if a תח"י report was previously switched to תל"א before per-planType separation existed
  const hasTachiStrengthsOnly =
    !st?.reportsByPlanType &&
    Boolean((st?.strengthsExisting || '').trim() || (st?.strengthsToEmpower || '').trim()) &&
    !(st?.studentGeneralBackground || '').trim() &&
    !(st?.studentSupportReceived || '').trim() &&
    !(st?.studentMainGoal || '').trim() &&
    !hasPopulatedTalaProfile(st);

  const baseSnapshot = {
    date: st?.date || new Date().toLocaleDateString('he-IL'),
    planType: currentPlanType,
    isLocked: initialLocked,
    lockedAt: st?.lockedAt || '',
    lockedBy: st?.lockedBy || '',
    schoolName: st?.schoolName || '',
    gradeClass: st?.gradeClass || '',
    homeroomTeacher: st?.homeroomTeacher || '',
    integrationTeacher: st?.integrationTeacher || '',
    additionalPartners: st?.additionalPartners || '',
    learningSupportAssistant: st?.learningSupportAssistant || '',
    counselorName: st?.counselorName || '',
    psychologistName: st?.psychologistName || '',
    matyaCoordinator: st?.matyaCoordinator || '',
    emotionalTherapist: st?.emotionalTherapist || '',
    paraMedicalTeam: st?.paraMedicalTeam || '',
    teacherFreeText: st?.teacherFreeText || '',
    freeTextAnalyzed: Boolean(st?.freeTextAnalyzed),
    removedAiGoals: initialRemovedAiGoals,
    strengthsExisting: st?.strengthsExisting || '',
    strengthsToEmpower: st?.strengthsToEmpower || '',
    studentGeneralBackground: st?.studentGeneralBackground || '',
    studentSupportReceived: st?.studentSupportReceived || '',
    studentMainGoal: st?.studentMainGoal || '',
    talaProfileRows: normalizedTalaProfileRows,
    talaFocusDomains: normalizedTalaFocusDomains,
    recommendations: st?.recommendations || '',
    evalReportFreeText: st?.evalReportFreeText || '',
    evalReportSummary: st?.evalReportSummary || '',
    statusReportSections: initialStatusReportSections,
    statusReportUpdatedAt: st?.statusReportUpdatedAt || '',
    lastSavedAt: st?.lastSavedAt || '',
    goals: normalizedGoals,
    diagnosticDocuments: Array.isArray(st?.diagnosticDocuments) ? st.diagnosticDocuments : []
  };

  const stageInfo = detectStudentStage(
    {
      educationalFramework: st?.educationalFramework,
      teacherFreeText: st?.teacherFreeText,
      birthDate: st?.birthDate
    },
    baseSnapshot.date || st?.date
  );
  const resolvedStage = (st?.stage === 'kindergarten' || st?.stage === 'school')
    ? st.stage
    : (stageInfo.stage === 'kindergarten' ? 'kindergarten' : 'school');
  const resolvedStageSource = st?.stageSource || (st?.stage ? 'user_explicit' : (stageInfo.stageSource || 'user_explicit'));
  const resolvedStageReason = st?.stageReason || (st?.stage ? 'בחירת משתמש' : stageInfo.stageReason);
  const resolvedStageUpdatedAt = st?.stageUpdatedAt || stageInfo.stageUpdatedAt;

  if (hasTachiStrengthsOnly && isTalaPlanType(currentPlanType)) {
    const tachiKey = getPlanTypeStorageKey(currentYear, TACHI_PLAN_TYPE);
    const talaKey = getPlanTypeStorageKey(currentYear, DEFAULT_PLAN_TYPE);
    existingReportsByPlanType[tachiKey] = {
      ...baseSnapshot,
      planType: TACHI_PLAN_TYPE
    };
    const emptyTalaReport =
      existingReportsByPlanType[talaKey] ||
      buildFreshReportForPlanType(DEFAULT_PLAN_TYPE, resolvedStage);
    existingReportsByPlanType[talaKey] = emptyTalaReport;
    existingReports[currentYear] = emptyTalaReport;

    return {
      ...st,
      ...emptyTalaReport,
      schoolYear: currentYear,
      gender: initialGender,
      stage: resolvedStage,
      stageSource: resolvedStageSource,
      stageReason: resolvedStageReason,
      stageUpdatedAt: resolvedStageUpdatedAt,
      sharedWith: Array.isArray(st?.sharedWith) ? st.sharedWith : [],
      reportsByYear: existingReports,
      reportsByPlanType: existingReportsByPlanType
    };
  }

  const activePlanKey = getPlanTypeStorageKey(currentYear, currentPlanType);
  existingReportsByPlanType[activePlanKey] = baseSnapshot;
  existingReports[currentYear] = baseSnapshot;

  return {
    ...st,
    ...baseSnapshot,
    schoolYear: currentYear,
    gender: initialGender,
    sharedWith: Array.isArray(st?.sharedWith) ? st.sharedWith : [],
    reportsByYear: existingReports,
    reportsByPlanType: existingReportsByPlanType,
    stage: resolvedStage,
    stageSource: resolvedStageSource,
    stageReason: resolvedStageReason,
    stageUpdatedAt: resolvedStageUpdatedAt
  };
};

export const syncActiveReportSnapshot = (data) => {
  const yr = data.schoolYear || DEFAULT_SCHOOL_YEAR;
  const snap = extractYearReportFromFormData(data);
  const key = getPlanTypeStorageKey(yr, data.planType);
  return {
    ...data,
    reportsByYear: {
      ...(data.reportsByYear || {}),
      [yr]: snap
    },
    reportsByPlanType: {
      ...(data.reportsByPlanType || {}),
      [key]: snap
    }
  };
};
