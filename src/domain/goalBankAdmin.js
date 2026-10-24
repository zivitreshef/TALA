import { canonicalizeEnvironment, KINDERGARTEN_ENVIRONMENTS } from '../goalBankData';

export const buildAdminBankGoalPayload = (editingBankGoal) => {
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
