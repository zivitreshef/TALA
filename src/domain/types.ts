/**
 * Core domain types and interfaces for the TALA application.
 * Part of the progressive TypeScript migration (Phase 2).
 */

export type EducationalStage = 'kindergarten' | 'school';

export type StageSource = 'user_explicit' | 'auto_framework' | 'auto_age' | 'default';

export interface StudentStageInfo {
  stage: EducationalStage;
  stageSource: StageSource;
  stageReason?: string;
  stageUpdatedAt?: string;
}

export interface EcologicalGoalEvaluation {
  achievementStatus?: 'achieved' | 'partially_achieved' | 'not_achieved' | 'not_evaluated' | string;
  midYearEvaluation?: string;
  endYearEvaluation?: string;
}

export interface EcologicalGoal extends EcologicalGoalEvaluation {
  id: string;
  domain: string;
  environment: string;
  target: string;
  subGoals?: string[];
  strategies?: string[];
  schedule?: string;
  partners?: string[];
  measurementTools?: string[];
  baseline?: string;
  isCustom?: boolean;
  protectedFromAiOverwrite?: boolean;
}

export interface StudentProfile {
  id?: string;
  name?: string;
  gender?: 'male' | 'female' | string;
  birthDate?: string;
  educationalFramework?: string;
  teacherFreeText?: string;
  stage?: EducationalStage;
  stageSource?: StageSource;
  stageReason?: string;
  stageUpdatedAt?: string;
  goals?: EcologicalGoal[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthEventPayload {
  kind: 'ai_proxy_error' | 'ai_local_fallback' | 'ai_empty_response' | 'ai_client_processing_error';
  operation?: string;
  userEmail?: string;
  timestamp: number;
  category?: string;
  status?: number;
  message?: string;
  extra?: Record<string, unknown>;
}

export interface TelemetryEventEnvelope {
  eventType: string;
  userId?: string;
  userEmail?: string;
  matyaGroup?: string;
  clientTimestamp: number;
  payload: Record<string, unknown>;
}

export interface AiProxyPayload {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  studentStage?: EducationalStage;
}

export interface AiGenerationResult<T = unknown> {
  success: boolean;
  data?: T;
  rawText?: string;
  error?: string;
  cached?: boolean;
}

export interface TenantScope {
  groupId: string;
  matyaName: string;
  allowedDomains?: string[];
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName?: string;
  role?: 'teacher' | 'admin' | 'matya_manager';
  group?: string;
  tenant?: TenantScope;
  ndaSignedAt?: string;
}

export interface GoalAiSnapshot {
  environment?: string | unknown;
  activityParticipation?: string | unknown;
  title?: string | unknown;
  objectives?: string | unknown;
  opportunities?: string | unknown;
  partners?: string | unknown;
  duration?: string | unknown;
  evaluationCriteria?: string | unknown;
}

export interface SizedGoal {
  id?: string;
  environment?: unknown;
  activityParticipation?: unknown;
  title?: unknown;
  objectives?: unknown;
  opportunities?: unknown;
  partners?: unknown;
  duration?: unknown;
  evaluationCriteria?: unknown;
  tShirtSize?: string;
  isAiGenerated?: boolean;
  isTeacherModified?: boolean;
  isTeacherAdded?: boolean;
  leadProfessional?: string;
  currentProgress?: number;
  targetProgress?: number;
  observations?: Array<{
    timestamp?: string;
    progress?: number;
    note?: string;
    supportLevel?: string;
  }>;
  midYearEvaluation?: string;
  endYearEvaluation?: string;
  aiSnapshot?: GoalAiSnapshot | Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface DurationTshirtOption {
  size: string;
  label: string;
  value: string;
}

export interface DiagnosticDocumentRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeFormatted: string;
  storageUrl: string;
  storagePath: string;
  uploadedAt: string;
  extractionStatus: 'success' | 'scanned_image';
  textSnippet: string;
  fullText: string;
}

export interface DiagnosticSuggestedGoal {
  id: string;
  environment: string;
  title: string;
  objectives: string;
  opportunities: string;
  duration: string;
  evaluationCriteria: string;
  leadProfessional: string;
  isTeacherAdded: boolean;
}

export interface SanitizedDiagnosticIntake {
  studentGeneralBackground: string;
  studentSupportReceived: string;
  studentMainGoal: string;
  strengthsExisting: string;
  strengthsToEmpower: string;
  recommendations: string;
  suggestedGoals: DiagnosticSuggestedGoal[];
}

export interface IsraeliHolidayInfo {
  name: string;
  shortName: string;
  isVacation: boolean;
  category: 'vacation' | 'observance';
  statusText: 'אין לימודים' | 'יש לימודים';
}

export interface ObservationGap {
  studentId?: string;
  studentName: string;
  framework: string;
  goalId?: string;
  goalTitle: string;
  environment: string;
  currentProgress: number;
  targetProgress: number;
  daysSinceObservation: number | null;
  neverObserved: boolean;
}

export interface RecentObservationSummary {
  studentId?: string;
  studentName: string;
  framework: string;
  goalTitle: string;
  environment: string;
  timestamp: string;
  progress: number;
  note: string;
  supportLevel: string;
}

export interface AdvancedGoalSummary {
  studentId?: string;
  studentName: string;
  framework: string;
  goalTitle: string;
  environment: string;
  currentProgress: number;
  targetProgress: number;
}

export interface PedagogicalAccomplishmentsSummary {
  totalStudents: number;
  totalGoals: number;
  onTrackGoalsCount: number;
  recentObservations: RecentObservationSummary[];
  advancedGoals: AdvancedGoalSummary[];
}

export interface CalendarEventUrlOptions {
  title?: string;
  startIso?: string;
  endIso?: string;
  details?: string;
  location?: string;
}

export interface CalendarEvent {
  startIso: string;
  endIso?: string;
  title?: string;
  details?: string;
  location?: string;
}

export interface AiGoalMatchResult {
  matchedGoalId: string | null;
  matchedGoalTitle: string;
  environment: string;
  observedSupportLevel: string;
  conciseObservationNote: string;
  suggestedProgressDelta: number;
  confidenceScore: number;
  explanation: string;
}

export interface OnboardingStep {
  id: number;
  key: string;
  title: string;
  shortTitle: string;
  stepNumberLabel: string;
  targetView: string;
  targetSection: string | null;
  isImplemented: boolean;
  arrowIcon: string;
  whereToLookHint: string;
  pedagogicalRationale: string;
  contextualGuidance: string;
  fieldExamples: string;
  actionLabel: string;
  tip: string;
}
