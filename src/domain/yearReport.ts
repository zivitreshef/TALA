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

export const HEBREW_YEAR_LOOKUP: Record<number, string> = {
  2023: 'תשפ"ד',
  2024: 'תשפ"ה',
  2025: 'תשפ"ו',
  2026: 'תשפ"ז',
  2027: 'תשפ"ח',
  2028: 'תשפ"ט',
  2029: 'תש"צ',
  2030: 'תשצ"א',
  2031: 'תשצ"ב',
  2032: 'תשצ"ג',
  2033: 'תשצ"ד',
  2034: 'תשצ"ה',
  2035: 'תשצ"ו'
};

/**
 * Calculates the canonical school year for a given calendar date.
 * Per pedagogical requirement: On the last day of August (August 31st),
 * the system automatically transitions the default working year to the upcoming school year.
 */
export function getSchoolYearForDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 7 = Aug, 8 = Sep
  const day = date.getDate();

  // On or after the last day of August (Aug 31st), we are in the new school year
  const isNewSchoolYear = month > 7 || (month === 7 && day >= 31);
  const startYear = isNewSchoolYear ? year : year - 1;
  const endYear = startYear + 1;

  const hebrewPrefix = HEBREW_YEAR_LOOKUP[startYear];
  if (hebrewPrefix) {
    return `${hebrewPrefix} (${startYear}-${endYear})`;
  }
  return `${startYear}-${endYear}`;
}

export function getCurrentSchoolYear(): string {
  return getSchoolYearForDate();
}

export const DEFAULT_SCHOOL_YEAR = getSchoolYearForDate();
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

/**
 * Seamlessly associates a student and their year-specific reports to a target working year.
 * Used during automatic migration so teachers do not have to manually clone or duplicate students.
 */
export function associateStudentToWorkingYear<T extends Record<string, any>>(
  student: T,
  targetYear: string = DEFAULT_SCHOOL_YEAR,
  sourceYear: string = 'תשפ"ו (2025-2026)'
): T {
  if (!student) return student;
  if (student.schoolYear !== sourceYear) return student;

  const updated: any = { ...student, schoolYear: targetYear };

  if (student.reportsByYear && typeof student.reportsByYear === 'object') {
    const reportsByYear: Record<string, any> = { ...student.reportsByYear };
    if (reportsByYear[sourceYear]) {
      if (!reportsByYear[targetYear]) {
        reportsByYear[targetYear] = reportsByYear[sourceYear];
      }
      delete reportsByYear[sourceYear];
      updated.reportsByYear = reportsByYear;
    }
  }

  if (student.reportsByPlanType && typeof student.reportsByPlanType === 'object') {
    const reportsByPlanType: Record<string, any> = { ...student.reportsByPlanType };
    let modified = false;
    for (const [k, v] of Object.entries(reportsByPlanType)) {
      if (k.startsWith(`${sourceYear}__`)) {
        const suffix = k.slice(sourceYear.length);
        const newKey = `${targetYear}${suffix}`;
        if (!reportsByPlanType[newKey]) {
          reportsByPlanType[newKey] = v;
        }
        delete reportsByPlanType[k];
        modified = true;
      }
    }
    if (modified) {
      updated.reportsByPlanType = reportsByPlanType;
    }
  }

  return updated as T;
}

export const normalizeStudentForForm = <T extends FormStudentInput>(st: T): T & NormalizedStudentResult => {
  const preparedStudent = (st?.schoolYear === 'תשפ"ו (2025-2026)')
    ? associateStudentToWorkingYear(st as any, DEFAULT_SCHOOL_YEAR)
    : st;
  const initialGender = preparedStudent?.gender || 'boy';
  const currentYear = preparedStudent?.schoolYear || DEFAULT_SCHOOL_YEAR;
  const currentPlanType = preparedStudent?.planType || DEFAULT_PLAN_TYPE;
  const normalizedGoals = ((preparedStudent?.goals || []) as YearReportGoal[]).map((g) =>
    adaptGoalToGender(g, initialGender as 'boy' | 'girl')
  ) as YearReportGoal[];
  const normalizedTalaProfileRows = buildDefaultTalaProfileRows(preparedStudent?.talaProfileRows) as YearReportProfileRow[];
  const normalizedTalaFocusDomains = Array.isArray(preparedStudent?.talaFocusDomains)
    ? preparedStudent.talaFocusDomains
    : [];
  const existingReports = { ...(preparedStudent?.reportsByYear || {}) } as Record<string, YearReportSnapshot>;
  const existingReportsByPlanType = { ...(preparedStudent?.reportsByPlanType || {}) } as Record<string, YearReportSnapshot>;
  const initialRemovedAiGoals = Array.isArray(preparedStudent?.removedAiGoals) ? preparedStudent.removedAiGoals : [];
  const initialStatusReportSections = Array.isArray(preparedStudent?.statusReportSections)
    ? preparedStudent.statusReportSections
    : [];
  const initialLocked = Boolean(preparedStudent?.isLocked);

  // Detect if a תח"י report was previously switched to תל"א before per-planType separation existed
  const hasTachiStrengthsOnly =
    !preparedStudent?.reportsByPlanType &&
    Boolean((preparedStudent?.strengthsExisting || '').trim() || (preparedStudent?.strengthsToEmpower || '').trim()) &&
    !(preparedStudent?.studentGeneralBackground || '').trim() &&
    !(preparedStudent?.studentSupportReceived || '').trim() &&
    !(preparedStudent?.studentMainGoal || '').trim() &&
    !hasPopulatedTalaProfile(preparedStudent);

  const baseSnapshot: YearReportSnapshot = {
    date: preparedStudent?.date || new Date().toLocaleDateString('he-IL'),
    planType: currentPlanType,
    isLocked: initialLocked,
    lockedAt: preparedStudent?.lockedAt || '',
    lockedBy: preparedStudent?.lockedBy || '',
    schoolName: preparedStudent?.schoolName || '',
    gradeClass: preparedStudent?.gradeClass || '',
    homeroomTeacher: preparedStudent?.homeroomTeacher || '',
    integrationTeacher: preparedStudent?.integrationTeacher || '',
    additionalPartners: preparedStudent?.additionalPartners || '',
    learningSupportAssistant: preparedStudent?.learningSupportAssistant || '',
    counselorName: preparedStudent?.counselorName || '',
    psychologistName: preparedStudent?.psychologistName || '',
    matyaCoordinator: preparedStudent?.matyaCoordinator || '',
    emotionalTherapist: preparedStudent?.emotionalTherapist || '',
    paraMedicalTeam: preparedStudent?.paraMedicalTeam || '',
    teacherFreeText: preparedStudent?.teacherFreeText || '',
    freeTextAnalyzed: Boolean(preparedStudent?.freeTextAnalyzed),
    removedAiGoals: initialRemovedAiGoals,
    strengthsExisting: preparedStudent?.strengthsExisting || '',
    strengthsToEmpower: preparedStudent?.strengthsToEmpower || '',
    studentGeneralBackground: preparedStudent?.studentGeneralBackground || '',
    studentSupportReceived: preparedStudent?.studentSupportReceived || '',
    studentMainGoal: preparedStudent?.studentMainGoal || '',
    talaProfileRows: normalizedTalaProfileRows,
    talaFocusDomains: normalizedTalaFocusDomains,
    recommendations: preparedStudent?.recommendations || '',
    evalReportFreeText: preparedStudent?.evalReportFreeText || '',
    evalReportSummary: preparedStudent?.evalReportSummary || '',
    statusReportSections: initialStatusReportSections,
    statusReportUpdatedAt: preparedStudent?.statusReportUpdatedAt || '',
    lastSavedAt: preparedStudent?.lastSavedAt || '',
    goals: normalizedGoals
  };

  const stageInfo = detectStudentStage(
    {
      educationalFramework: preparedStudent?.educationalFramework,
      teacherFreeText: preparedStudent?.teacherFreeText,
      birthDate: preparedStudent?.birthDate
    },
    baseSnapshot.date || preparedStudent?.date
  );
  const resolvedStage: EducationalStage = (preparedStudent?.stage === 'kindergarten' || preparedStudent?.stage === 'school')
    ? (preparedStudent.stage as EducationalStage)
    : (stageInfo.stage === 'kindergarten' ? 'kindergarten' : 'school');
  const resolvedStageSource: StageSource = (preparedStudent?.stageSource as StageSource) || (preparedStudent?.stage ? 'user_explicit' : (stageInfo.stageSource || 'user_explicit'));
  const resolvedStageReason = preparedStudent?.stageReason || (preparedStudent?.stage ? 'בחירת משתמש' : stageInfo.stageReason) || '';
  const resolvedStageUpdatedAt = preparedStudent?.stageUpdatedAt || stageInfo.stageUpdatedAt || new Date().toISOString();

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
      ...preparedStudent,
      ...emptyTalaReport,
      schoolYear: currentYear,
      gender: initialGender,
      stage: resolvedStage,
      stageSource: resolvedStageSource,
      stageReason: resolvedStageReason,
      stageUpdatedAt: resolvedStageUpdatedAt,
      sharedWith: Array.isArray(preparedStudent?.sharedWith) ? preparedStudent.sharedWith : [],
      teamMessages: Array.isArray(preparedStudent?.teamMessages) ? preparedStudent.teamMessages : [],
      reportsByYear: existingReports,
      reportsByPlanType: existingReportsByPlanType
    };
  }

  const activePlanKey = getPlanTypeStorageKey(currentYear, currentPlanType);
  existingReportsByPlanType[activePlanKey] = baseSnapshot;
  existingReports[currentYear] = baseSnapshot;

  return {
    ...preparedStudent,
    ...baseSnapshot,
    schoolYear: currentYear,
    gender: initialGender,
    sharedWith: Array.isArray(preparedStudent?.sharedWith) ? preparedStudent.sharedWith : [],
    teamMessages: Array.isArray(preparedStudent?.teamMessages) ? preparedStudent.teamMessages : [],
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
