/**
 * Domain module for Annual Student Reports and Multi-Year Snapshots.
 * Manages year-over-year report versioning, separation between TALA and TACHI plans,
 * and forms normalization for historical tracking.
 */

import {
  buildDefaultTalaProfileRows,
  isTalaPlanType,
  adaptGoalToGender
} from '../goalBankData';
import { hasPopulatedTalaProfile } from '../export/wordAndPrintBuilders';
import { detectStudentStage } from '../studentStage.js';
import type { EducationalStage, StageSource } from './types';

export const DEFAULT_SCHOOL_YEAR = 'תשפ"ו (2025-2026)';
export const DEFAULT_PLAN_TYPE = 'תוכנית לתלמיד ביה"ס';
export const TACHI_PLAN_TYPE = 'תוכנית אקולוגית לילדי הגן';

export interface RemovedAiGoalSnapshot {
  id: string;
  environment?: string;
  title?: string;
  activityParticipation?: string;
  aiSnapshot?: Record<string, unknown> | null;
}

export interface YearReportStatusSection {
  id?: string;
  sectionNumber: number;
  title?: string;
  content: string;
}

export interface YearReportGoal {
  id?: string;
  environment?: string;
  activityParticipation?: string;
  title?: string;
  objectives?: string;
  opportunities?: string;
  opportunitiesIntegration?: string;
  opportunitiesTherapist?: string;
  learningAccommodations?: string;
  partners?: string;
  duration?: string;
  evaluationCriteria?: string;
  achievementStatus?: string;
  midYearEvaluation?: string;
  endYearEvaluation?: string;
  isTeacherAdded?: boolean;
  isTeacherModified?: boolean;
  aiSnapshot?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface YearReportProfileRow {
  id?: string;
  domain?: string;
  subDomain?: string;
  strengths?: string;
  strengthsAndFacilitators?: string;
  toStrengthen?: string;
  areasToStrengthenAndBarriers?: string;
  [key: string]: unknown;
}

export interface YearReportSnapshot {
  date: string;
  planType: string;
  isLocked: boolean;
  lockedAt: string;
  lockedBy: string;
  schoolName: string;
  gradeClass: string;
  homeroomTeacher: string;
  integrationTeacher: string;
  additionalPartners: string;
  learningSupportAssistant: string;
  counselorName: string;
  psychologistName: string;
  matyaCoordinator: string;
  emotionalTherapist: string;
  paraMedicalTeam: string;
  teacherFreeText: string;
  freeTextAnalyzed: boolean;
  removedAiGoals: RemovedAiGoalSnapshot[];
  strengthsExisting: string;
  strengthsToEmpower: string;
  studentGeneralBackground: string;
  studentSupportReceived: string;
  studentMainGoal: string;
  talaProfileRows: YearReportProfileRow[];
  talaFocusDomains: string[];
  recommendations: string;
  evalReportFreeText: string;
  evalReportSummary: string;
  statusReportSections: YearReportStatusSection[];
  statusReportUpdatedAt: string;
  lastSavedAt: string;
  goals: YearReportGoal[];
  schoolYear?: string;
  reportsByYear?: Record<string, YearReportSnapshot | Record<string, unknown>>;
  reportsByPlanType?: Record<string, YearReportSnapshot | Record<string, unknown>>;
  stage?: EducationalStage | string;
  stageSource?: StageSource | string;
  stageReason?: string;
  stageUpdatedAt?: string;
}

export interface NormalizedStudentResult extends YearReportSnapshot {
  schoolYear: string;
  gender: string;
  stage: EducationalStage;
  stageSource: StageSource;
  stageReason: string;
  stageUpdatedAt: string;
  sharedWith: string[];
  teamMessages: unknown[];
  reportsByYear: Record<string, YearReportSnapshot>;
  reportsByPlanType: Record<string, YearReportSnapshot>;
}

export interface FormStudentInput {
  date?: string;
  planType?: string;
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
  teacherFreeText?: string;
  freeTextAnalyzed?: boolean;
  removedAiGoals?: RemovedAiGoalSnapshot[];
  strengthsExisting?: string;
  strengthsToEmpower?: string;
  studentGeneralBackground?: string;
  studentSupportReceived?: string;
  studentMainGoal?: string;
  talaProfileRows?: YearReportProfileRow[];
  talaFocusDomains?: string[];
  recommendations?: string;
  evalReportFreeText?: string;
  evalReportSummary?: string;
  statusReportSections?: YearReportStatusSection[];
  statusReportUpdatedAt?: string;
  lastSavedAt?: string;
  goals?: YearReportGoal[];
  gender?: 'boy' | 'girl' | string;
  schoolYear?: string;
  educationalFramework?: string;
  birthDate?: string;
  stage?: EducationalStage | string;
  stageSource?: StageSource | string;
  stageReason?: string;
  stageUpdatedAt?: string;
  diagnosticDocuments?: unknown[];
  teamMessages?: unknown[];
  sharedWith?: string[];
  reportsByYear?: Record<string, YearReportSnapshot | Record<string, unknown>>;
  reportsByPlanType?: Record<string, YearReportSnapshot | Record<string, unknown>>;
  [key: string]: unknown;
}

export const getPlanTypeStorageKey = (schoolYear?: string, planType?: string): string => {
  const yr = schoolYear || DEFAULT_SCHOOL_YEAR;
  const typeKey = isTalaPlanType(planType) ? 'tala' : 'tachi';
  return `${yr}__${typeKey}`;
};

export const buildFreshReportForPlanType = (
  planType?: string,
  _stage?: EducationalStage | string
): YearReportSnapshot => {
  const resolvedPlanType = planType || DEFAULT_PLAN_TYPE;

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
    talaProfileRows: buildDefaultTalaProfileRows() as YearReportProfileRow[],
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

export const extractYearReportFromFormData = (data?: FormStudentInput | null): YearReportSnapshot => ({
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
  talaProfileRows: buildDefaultTalaProfileRows(data?.talaProfileRows) as YearReportProfileRow[],
  talaFocusDomains: Array.isArray(data?.talaFocusDomains) ? data.talaFocusDomains : [],
  recommendations: data?.recommendations || '',
  evalReportFreeText: data?.evalReportFreeText || '',
  evalReportSummary: data?.evalReportSummary || '',
  statusReportSections: Array.isArray(data?.statusReportSections) ? data.statusReportSections : [],
  statusReportUpdatedAt: data?.statusReportUpdatedAt || '',
  lastSavedAt: data?.lastSavedAt || '',
  goals: ((data?.goals || []) as YearReportGoal[]).map((g) =>
    adaptGoalToGender(g, (data?.gender as 'boy' | 'girl') || 'boy')
  ) as YearReportGoal[]
});

export const isRawFreeTextAlreadyAnalyzed = (data?: FormStudentInput | null): boolean =>
  Boolean(
    data?.freeTextAnalyzed ||
      ((data?.teacherFreeText || '').trim() &&
        ((data?.strengthsExisting || '').trim() ||
          (data?.strengthsToEmpower || '').trim() ||
          (data?.studentGeneralBackground || '').trim() ||
          (data?.studentSupportReceived || '').trim() ||
          (data?.studentMainGoal || '').trim() ||
          hasPopulatedTalaProfile(data || {}) ||
          (data?.goals || []).some((g) => (g?.title || '').trim())))
  );

export const hasContentInYearReport = (rep?: FormStudentInput | YearReportSnapshot | null): boolean => {
  if (!rep) return false;
  return Boolean(
    (rep.teacherFreeText && rep.teacherFreeText.trim()) ||
      (rep.strengthsExisting && rep.strengthsExisting.trim()) ||
      (rep.strengthsToEmpower && rep.strengthsToEmpower.trim()) ||
      (rep.studentGeneralBackground && rep.studentGeneralBackground.trim()) ||
      (rep.studentSupportReceived && rep.studentSupportReceived.trim()) ||
      (rep.studentMainGoal && rep.studentMainGoal.trim()) ||
      hasPopulatedTalaProfile(rep || {}) ||
      (rep.recommendations && rep.recommendations.trim()) ||
      (rep.evalReportFreeText && rep.evalReportFreeText.trim()) ||
      (rep.evalReportSummary && rep.evalReportSummary.trim()) ||
      (Array.isArray(rep.statusReportSections) && rep.statusReportSections.length > 0) ||
      (rep.goals || []).some(
        (g) => (g.title && g.title.trim()) || (g.objectives && g.objectives.trim())
      )
  );
};

export const normalizeStudentForForm = <T extends FormStudentInput>(st: T): T & NormalizedStudentResult => {
  const initialGender = st?.gender || 'boy';
  const currentYear = st?.schoolYear || DEFAULT_SCHOOL_YEAR;
  const currentPlanType = st?.planType || DEFAULT_PLAN_TYPE;
  const normalizedGoals = ((st?.goals || []) as YearReportGoal[]).map((g) =>
    adaptGoalToGender(g, initialGender as 'boy' | 'girl')
  ) as YearReportGoal[];
  const normalizedTalaProfileRows = buildDefaultTalaProfileRows(st?.talaProfileRows) as YearReportProfileRow[];
  const normalizedTalaFocusDomains = Array.isArray(st?.talaFocusDomains)
    ? st.talaFocusDomains
    : [];
  const existingReports = { ...(st?.reportsByYear || {}) } as Record<string, YearReportSnapshot>;
  const existingReportsByPlanType = { ...(st?.reportsByPlanType || {}) } as Record<string, YearReportSnapshot>;
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

  const baseSnapshot: YearReportSnapshot = {
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
    goals: normalizedGoals
  };

  const stageInfo = detectStudentStage(
    {
      educationalFramework: st?.educationalFramework,
      teacherFreeText: st?.teacherFreeText,
      birthDate: st?.birthDate
    },
    baseSnapshot.date || st?.date
  );
  const resolvedStage: EducationalStage = (st?.stage === 'kindergarten' || st?.stage === 'school')
    ? (st.stage as EducationalStage)
    : (stageInfo.stage === 'kindergarten' ? 'kindergarten' : 'school');
  const resolvedStageSource: StageSource = (st?.stageSource as StageSource) || (st?.stage ? 'user_explicit' : (stageInfo.stageSource || 'user_explicit'));
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
      teamMessages: Array.isArray(st?.teamMessages) ? st.teamMessages : [],
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
    teamMessages: Array.isArray(st?.teamMessages) ? st.teamMessages : [],
    reportsByYear: existingReports,
    reportsByPlanType: existingReportsByPlanType,
    stage: resolvedStage,
    stageSource: resolvedStageSource,
    stageReason: resolvedStageReason,
    stageUpdatedAt: resolvedStageUpdatedAt
  };
};

export const syncActiveReportSnapshot = <T extends FormStudentInput>(
  data: T
): T & {
  reportsByYear: Record<string, YearReportSnapshot>;
  reportsByPlanType: Record<string, YearReportSnapshot>;
} => {
  const yr = data.schoolYear || DEFAULT_SCHOOL_YEAR;
  const snap = extractYearReportFromFormData(data);
  const key = getPlanTypeStorageKey(yr, data.planType);
  const existingByYear = { ...(data.reportsByYear || {}) } as Record<string, YearReportSnapshot>;
  const existingByPlanType = { ...(data.reportsByPlanType || {}) } as Record<string, YearReportSnapshot>;
  return {
    ...data,
    reportsByYear: {
      ...existingByYear,
      [yr]: snap
    },
    reportsByPlanType: {
      ...existingByPlanType,
      [key]: snap
    }
  };
};
