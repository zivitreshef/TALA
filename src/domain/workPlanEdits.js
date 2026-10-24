import {
  buildDefaultTalaProfileRows,
  isGoalEmpty,
  attachAiBaselineToGoal,
  isGoalProtectedFromAiOverwrite
} from '../goalBankData';
import { detectStudentStage } from '../studentStage.js';
import {
  getDefaultEnvironmentForStage,
  getDefaultPartnersForStage
} from './stageGuard.js';

export const LOCKED_EDITABLE_FIELDS = new Set([
  'evalReportFreeText',
  'evalReportSummary',
  'statusReportSections',
  'statusReportUpdatedAt'
]);

export const EVAL_GOAL_FIELDS = new Set([
  'achievementStatus',
  'midYearEvaluation',
  'endYearEvaluation'
]);

export const applyFieldChange = (prev, field, value, now = new Date()) => {
  const next = { ...prev, [field]: value };
  if (field === 'stage') {
    next.stage = value;
    next.stageSource = 'user_explicit';
    next.stageReason = value === 'kindergarten' ? 'בחירת משתמש: גן ילדים' : 'בחירת משתמש: בית ספר';
    next.stageUpdatedAt = now.toISOString();
  } else if (field === 'educationalFramework' || field === 'teacherFreeText' || field === 'birthDate') {
    if (next.stageSource !== 'user_explicit') {
      const stageInfo = detectStudentStage(
        {
          educationalFramework: next.educationalFramework,
          teacherFreeText: next.teacherFreeText,
          birthDate: next.birthDate
        },
        next.date
      );
      next.stage = stageInfo.stage === 'kindergarten' ? 'kindergarten' : 'school';
      next.stageSource = stageInfo.stageSource;
      next.stageReason = stageInfo.stageReason;
      next.stageUpdatedAt = stageInfo.stageUpdatedAt;
    }
  }
  return next;
};

export const updateTalaProfileRow = (prev, rowIdOrDomain, field, value) => {
  const currentRows = buildDefaultTalaProfileRows(prev?.talaProfileRows);
  const isStrengthField = field === 'strengths' || field === 'strengthsAndFacilitators';
  return {
    ...prev,
    talaProfileRows: currentRows.map((r) =>
      r.id === rowIdOrDomain || r.domain === rowIdOrDomain || r.subDomain === rowIdOrDomain
        ? isStrengthField
          ? { ...r, strengths: value, strengthsAndFacilitators: value }
          : { ...r, toStrengthen: value, areasToStrengthenAndBarriers: value }
        : r
    )
  };
};

export const toggleFocusDomain = (prev, domain) => {
  const current = Array.isArray(prev?.talaFocusDomains) ? prev.talaFocusDomains : [];
  const next = current.includes(domain)
    ? current.filter((d) => d !== domain)
    : [...current, domain];
  return {
    ...prev,
    talaFocusDomains: next
  };
};

export const applyGoalChange = (prev, goalId, field, value) => {
  const isEvalField = EVAL_GOAL_FIELDS.has(field);
  return {
    ...prev,
    goals: (prev?.goals || []).map((g) =>
      g.id === goalId
        ? isEvalField
          ? { ...g, [field]: value }
          : { ...g, [field]: value, isTeacherModified: true }
        : g
    )
  };
};

export const toggleGoalAiLock = (prev, goalId) => {
  return {
    ...prev,
    goals: (prev?.goals || []).map((g) => {
      if (g.id !== goalId) return g;
      const currentlyLocked = isGoalProtectedFromAiOverwrite(g);
      if (currentlyLocked) {
        return attachAiBaselineToGoal(g);
      }
      return { ...g, isTeacherModified: true };
    })
  };
};

export const removeGoalRow = (prev, goalId) => {
  const targetGoal = (prev?.goals || []).find((g) => g.id === goalId);
  const nextRemoved = [...(prev?.removedAiGoals || [])];
  if (targetGoal && !isGoalEmpty(targetGoal)) {
    nextRemoved.push({
      id: targetGoal.id,
      environment: (targetGoal.environment || '').trim(),
      title: (targetGoal.title || '').trim(),
      activityParticipation: (targetGoal.activityParticipation || '').trim(),
      aiSnapshot: targetGoal.aiSnapshot || null
    });
  }
  return {
    ...prev,
    removedAiGoals: nextRemoved,
    goals: (prev?.goals || []).filter((g) => g.id !== goalId)
  };
};

export const buildNewGoalRow = ({ id, stage, isTalaMode, isKindergarten, plus3Months }) => {
  return {
    id,
    environment: getDefaultEnvironmentForStage(stage),
    activityParticipation: '',
    title: '',
    objectives: '',
    opportunities: '',
    opportunitiesIntegration: '',
    opportunitiesTherapist: '',
    learningAccommodations: '',
    partners: isTalaMode
      ? 'מחנכת, מורת שילוב, מטפלת באומנויות'
      : isKindergarten
      ? 'צוות הגן, סייעת אישית'
      : getDefaultPartnersForStage('school'),
    duration: `3 חודשים (עד ${plus3Months})`,
    evaluationCriteria: '',
    isTeacherAdded: true,
    isTeacherModified: true
  };
};
