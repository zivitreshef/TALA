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
