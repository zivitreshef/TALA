/**
 * Core domain types and interfaces for the TALA application.
 * Part of the progressive TypeScript migration (Phase 2).
 */

export type EducationalStage = 'kindergarten' | 'school' | 'unknown' | 'all';

export type StageSource = 'user_explicit' | 'educational_framework' | 'teacher_text' | 'birth_date' | 'teacher_text_age' | 'conflict' | 'no_data' | 'auto_framework' | 'auto_age' | 'default';

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
  idNumber?: string;
  birthDate?: string;
  schoolYear?: string;
  reportDate?: string;
  educationalFramework?: string;
  address?: string;
  phone?: string;
  schoolName?: string;
  gradeClass?: string;
  educatorName?: string;
  assistantName?: string;
  educationalCounselor?: string;
  supportTeacher?: string;
  psychologistName?: string;
  otherStaff?: string;
  teacherFreeText?: string;
  pedagogicalSnippets?: PedagogicalSnippet[];
  stage?: EducationalStage;
  stageSource?: StageSource;
  stageReason?: string;
  stageUpdatedAt?: string;
  goals?: EcologicalGoal[];
  behaviorAssessment?: BehaviorAssessmentReport;
  behaviorPlan?: BehaviorInterventionPlan;
  behaviorObservations?: BehaviorObservation[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
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

export interface PedagogicalSnippet {
  id: string;
  sourceType: 'document' | 'teacher_note';
  sourceTitle: string;
  documentId?: string;
  content: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
  hasAudio?: boolean;
  audioStorageUrl?: string;
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

export interface CompletedTaskSummary {
  id?: string;
  studentId?: string;
  studentName: string;
  framework?: string;
  text: string;
  date: string;
  time?: string;
  completedAt?: string;
  isAiGenerated?: boolean;
}

export interface PendingTaskSummary {
  id?: string;
  studentId?: string;
  studentName: string;
  framework?: string;
  text: string;
  date: string;
  time?: string;
  isAiGenerated?: boolean;
}

export interface StudentExecutiveDigestCard {
  studentId?: string;
  studentName: string;
  framework?: string;
  accomplishments: string;
  challengesAndDifficulties?: string;
  recommendedGoalRefinements?: string;
  hasActivity: boolean;
  noUpdateNote?: string;
}

export interface ExecutiveAiPedagogicalDigest {
  executiveOverview: string;
  studentCards: StudentExecutiveDigestCard[];
  strategicPriorities: string[];
  inactiveStudents: Array<{ studentName: string; framework?: string; note: string }>;
}

export interface PedagogicalAccomplishmentsSummary {
  executiveDigest?: ExecutiveAiPedagogicalDigest;
  completedTasks?: CompletedTaskSummary[];
  pendingTasks?: PendingTaskSummary[];
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

export interface AiGoalMultiMatchResponse {
  matches: AiGoalMatchResult[];
  noMatchReason?: string | null;
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

// ============================================================================
// Behavior Analysis Domain Types (ABA / Special Education)
// ============================================================================

export type BehaviorMeasurementType = 'frequency' | 'duration' | 'interval';

export type BehaviorFunction = 'escape' | 'attention' | 'tangible' | 'sensory' | 'other';

export type BehaviorIntensity = 'mild' | 'moderate' | 'severe';

export interface BehaviorTarget {
  id: string;
  name: string;
  operationalDefinition: string;
  measurementType: BehaviorMeasurementType;
  baselineAverage?: number;
  targetGoal?: number;
}

export interface BaselineDataPoint {
  id: string;
  date: string;
  sessionOrPeriod: string;
  value: number;
  notes?: string;
}

export interface BehaviorObservation {
  id: string;
  timestamp: number;
  dateTime: string;
  location: string;
  activity: string;
  antecedent: string;
  behavior: string;
  intensity: BehaviorIntensity;
  durationMinutes?: number;
  consequence: string;
  perceivedFunction: BehaviorFunction;
  notes?: string;
}

export interface BehaviorAssessmentReport {
  id?: string;
  assessorName?: string;
  assessmentDate?: string;
  backgroundInfo?: string;
  targetBehaviors: BehaviorTarget[];
  baselineData: BaselineDataPoint[];
  antecedentAnalysis?: string;
  mainHypothesizedFunction?: BehaviorFunction;
  functionalHypothesisNarrative?: string;
  initialRecommendations?: string;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  updatedAt?: string;
}

export interface ReplacementBehaviorPlan {
  targetBehaviorId?: string;
  replacementSkill: string;
  teachingStrategies: string;
}

export interface OngoingTrackingPoint {
  id: string;
  date: string;
  period: string;
  targetBehaviorOccurrences: number;
  replacementBehaviorUsed: boolean | number;
  reinforcementDelivered: boolean;
  sessionOrPeriod?: string;
  targetBehaviorCount?: number;
  replacementBehaviorCount?: number;
  notes?: string;
}

export interface BehaviorInterventionPlan {
  id?: string;
  analystName?: string;
  effectiveDate?: string;
  reviewDate?: string;
  targetBehaviors: BehaviorTarget[];
  replacementBehaviors: ReplacementBehaviorPlan[];
  antecedentStrategies: string;
  reinforcementSystem: {
    preferredReinforcers: string;
    scheduleOfReinforcement: string;
  };
  reactiveProtocol: {
    staffResponse: string;
    crisisSafetyPlan?: string;
  };
  ongoingTracking: OngoingTrackingPoint[];
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  updatedAt?: string;
}

