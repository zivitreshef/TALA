import { canonicalizeEnvironment, KINDERGARTEN_ENVIRONMENTS } from '../goalBankData';

export interface AdminBankGoalInput {
  title?: string;
  stages?: string[];
  environment?: string;
  usageCount?: number;
  defaultActivity?: string;
  suggestedObjectivesText?: string;
  defaultOpportunities?: string;
  defaultPartners?: string;
  defaultDuration?: string;
  defaultEvaluation?: string;
}

export interface AdminBankGoalPayload {
  title: string;
  stages: string[];
  environment: string;
  usageCount?: number;
  defaultActivity?: string;
  suggestedObjectives?: string;
  defaultOpportunities?: string;
  defaultPartners?: string;
  defaultDuration?: string;
  defaultEvaluation?: string;
}

export const buildAdminBankGoalPayload = (
  editingBankGoal?: AdminBankGoalInput | null
): AdminBankGoalPayload => {
  const targetTitle = (editingBankGoal?.title || '').trim();
  const resolvedStages =
    Array.isArray(editingBankGoal?.stages) && editingBankGoal.stages.length > 0
      ? editingBankGoal.stages
      : ['kindergarten'];
  const rawEnv = (editingBankGoal?.environment || '').trim() || KINDERGARTEN_ENVIRONMENTS[0];
  const targetEnv = canonicalizeEnvironment(rawEnv) || KINDERGARTEN_ENVIRONMENTS[0];

  return {
    title: targetTitle,
    stages: resolvedStages,
    environment: targetEnv,
    usageCount: editingBankGoal?.usageCount,
    defaultActivity: editingBankGoal?.defaultActivity,
    suggestedObjectives: editingBankGoal?.suggestedObjectivesText,
    defaultOpportunities: editingBankGoal?.defaultOpportunities,
    defaultPartners: editingBankGoal?.defaultPartners,
    defaultDuration: editingBankGoal?.defaultDuration,
    defaultEvaluation: editingBankGoal?.defaultEvaluation
  };
};
