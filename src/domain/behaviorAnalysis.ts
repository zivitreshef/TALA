import {
  BaselineDataPoint,
  BehaviorAssessmentReport,
  BehaviorFunction,
  BehaviorInterventionPlan,
  BehaviorMeasurementType,
  OngoingTrackingPoint
} from './types';

/**
 * Calculates baseline statistical indicators from collected observation data points.
 */
export function calculateBaselineStats(baselineData?: BaselineDataPoint[] | null): {
  count: number;
  average: number;
  min: number;
  max: number;
} {
  if (!baselineData || baselineData.length === 0) {
    return { count: 0, average: 0, min: 0, max: 0 };
  }

  const values = baselineData
    .map((point) => Number(point.value))
    .filter((val) => !isNaN(val) && val >= 0);

  if (values.length === 0) {
    return { count: 0, average: 0, min: 0, max: 0 };
  }

  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sum / values.length).toFixed(1));
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    count: values.length,
    average,
    min,
    max
  };
}

/**
 * Calculates progress and outcome statistics for ongoing intervention tracking.
 */
export function calculateTrackingStats(
  trackingData?: OngoingTrackingPoint[] | null,
  baselineAverage?: number
): {
  totalOccurrences: number;
  averageOccurrences: number;
  replacementSuccessRate: number;
  reductionPercentage: number;
} {
  if (!trackingData || trackingData.length === 0) {
    return {
      totalOccurrences: 0,
      averageOccurrences: 0,
      replacementSuccessRate: 0,
      reductionPercentage: 0
    };
  }

  let totalOccurrences = 0;
  let replacementUsedCount = 0;

  for (const point of trackingData) {
    const occ = Number(point.targetBehaviorOccurrences) || 0;
    totalOccurrences += occ;
    if (point.replacementBehaviorUsed === true || Number(point.replacementBehaviorUsed) > 0) {
      replacementUsedCount += 1;
    }
  }

  const count = trackingData.length;
  const averageOccurrences = Number((totalOccurrences / count).toFixed(1));
  const replacementSuccessRate = Math.round((replacementUsedCount / count) * 100);

  let reductionPercentage = 0;
  if (typeof baselineAverage === 'number' && baselineAverage > 0) {
    const rawDiff = ((baselineAverage - averageOccurrences) / baselineAverage) * 100;
    reductionPercentage = Number(Math.max(-100, Math.min(100, rawDiff)).toFixed(1));
  }

  return {
    totalOccurrences,
    averageOccurrences,
    replacementSuccessRate,
    reductionPercentage
  };
}

/**
 * Returns clean, professional Hebrew labels for behavioral functions.
 * Adheres strictly to the Hebrew-Only Titles Rule (Zero English in Parentheses).
 */
export function getBehaviorFunctionLabelHebrew(fn?: BehaviorFunction | string | null): string {
  switch (fn) {
    case 'escape':
      return 'הימנעות או בריחה ממטלה';
    case 'attention':
      return 'השגת תשומת לב';
    case 'tangible':
      return 'השגת חפץ או פעילות';
    case 'sensory':
      return 'ויסות או גירוי חושי';
    case 'other':
    default:
      return 'אחר או משולב';
  }
}

/**
 * Returns clean Hebrew labels for measurement types.
 */
export function getMeasurementTypeLabelHebrew(m?: BehaviorMeasurementType | string | null): string {
  switch (m) {
    case 'duration':
      return 'משך זמן בדקות';
    case 'interval':
      return 'דגימת זמנים';
    case 'frequency':
    default:
      return 'תדירות מופעים';
  }
}

/**
 * Creates a clean, empty behavior assessment report template.
 */
export function createEmptyBehaviorAssessment(): BehaviorAssessmentReport {
  return {
    targetBehaviors: [],
    baselineData: [],
    antecedentAnalysis: '',
    mainHypothesizedFunction: 'escape',
    functionalHypothesisNarrative: '',
    initialRecommendations: '',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Creates a clean, empty behavior intervention plan template.
 */
export function createEmptyBehaviorPlan(): BehaviorInterventionPlan {
  return {
    targetBehaviors: [],
    replacementBehaviors: [],
    antecedentStrategies: '',
    reinforcementSystem: {
      preferredReinforcers: '',
      scheduleOfReinforcement: ''
    },
    reactiveProtocol: {
      staffResponse: '',
      crisisSafetyPlan: ''
    },
    ongoingTracking: [],
    updatedAt: new Date().toISOString()
  };
}

export type BehaviorReadinessFilterKey =
  | 'all'
  | 'missing_baseline'
  | 'missing_hypothesis'
  | 'missing_replacement'
  | 'missing_tracking'
  | 'ready'
  | 'partial'
  | 'missing';

export interface StudentBehaviorReadinessInfo {
  targetBehaviorsCount: number;
  hasTargetBehaviors: boolean;
  baselineDataCount: number;
  hasBaselineData: boolean;
  hasFunctionalHypothesis: boolean;
  hypothesizedFunctionLabel?: string;
  replacementBehaviorsCount: number;
  hasReplacementBehaviors: boolean;
  hasInterventionStrategies: boolean;
  trackingPointsCount: number;
  hasOngoingTracking: boolean;
  isLocked: boolean;
  status: 'ready' | 'partial' | 'missing';
  missingTags: string[];
}

export interface BehaviorReadinessSummary {
  total: number;
  readyCount: number;
  partialCount: number;
  missingCount: number;
  missingBaselineCount: number;
  missingHypothesisCount: number;
  missingReplacementCount: number;
  missingTrackingCount: number;
  readyPct: number;
  partialPct: number;
  missingPct: number;
}

/**
 * Computes behavioral readiness for team meetings and case conferences.
 * Evaluates core behavioral pillars: target behaviors, baseline measurement,
 * functional hypothesis, replacement skills/intervention, and ongoing tracking.
 */
export function computeBehaviorStudentReadiness(
  student?: any | null
): StudentBehaviorReadinessInfo {
  if (!student) {
    return {
      targetBehaviorsCount: 0,
      hasTargetBehaviors: false,
      baselineDataCount: 0,
      hasBaselineData: false,
      hasFunctionalHypothesis: false,
      replacementBehaviorsCount: 0,
      hasReplacementBehaviors: false,
      hasInterventionStrategies: false,
      trackingPointsCount: 0,
      hasOngoingTracking: false,
      isLocked: false,
      status: 'missing',
      missingTags: [
        'חסרות התנהגויות יעד',
        'חסר בייסליין',
        'חסרה השערה תפקודית',
        'חסרה התנהגות חלופית'
      ]
    };
  }

  const assessment = student.behaviorAssessment || {};
  const plan = student.behaviorPlan || {};
  const observations = Array.isArray(student.behaviorObservations)
    ? student.behaviorObservations
    : [];

  // 1. Target behaviors
  const rawTargets =
    Array.isArray(assessment.targetBehaviors) && assessment.targetBehaviors.length > 0
      ? assessment.targetBehaviors
      : Array.isArray(plan.targetBehaviors) && plan.targetBehaviors.length > 0
      ? plan.targetBehaviors
      : Array.isArray(student.targetBehaviors)
      ? student.targetBehaviors
      : [];

  const validTargets = rawTargets.filter((t: any) =>
    Boolean(
      String(
        t?.name || t?.description || t?.behaviorDescription || t?.operationalDefinition || ''
      ).trim()
    )
  );
  const targetBehaviorsCount = validTargets.length;
  const hasTargetBehaviors = targetBehaviorsCount > 0;

  // 2. Baseline data
  const rawBaseline =
    Array.isArray(assessment.baselineData) && assessment.baselineData.length > 0
      ? assessment.baselineData
      : Array.isArray(student.baselineData)
      ? student.baselineData
      : [];

  const validBaseline = rawBaseline.filter(
    (b: any) =>
      b != null &&
      (typeof b.value === 'number' ||
        Boolean(String(b?.value || '').trim()) ||
        Boolean(String(b?.date || '').trim()))
  );
  const baselineDataCount = validBaseline.length;
  const hasBaselineData = baselineDataCount > 0;

  // 3. Functional hypothesis
  const hypothesisNarrative = String(
    assessment.functionalHypothesisNarrative || assessment.antecedentAnalysis || ''
  ).trim();
  const hypoFunction = assessment.mainHypothesizedFunction;
  const hasFunctionalHypothesis = Boolean(
    hypothesisNarrative.length > 0 || (hypoFunction && hypoFunction !== 'other')
  );
  const hypothesizedFunctionLabel = hypoFunction
    ? getBehaviorFunctionLabelHebrew(hypoFunction)
    : undefined;

  // 4. Replacement behaviors
  const rawReplacements = Array.isArray(plan.replacementBehaviors)
    ? plan.replacementBehaviors
    : [];
  const validReplacements = rawReplacements.filter((r: any) =>
    Boolean(String(r?.replacementSkill || r?.teachingStrategies || '').trim())
  );
  const replacementBehaviorsCount = validReplacements.length;
  const hasReplacementBehaviors = replacementBehaviorsCount > 0;

  // 5. Intervention strategies
  const hasInterventionStrategies = Boolean(
    String(plan.antecedentStrategies || '').trim() ||
      String(plan.reinforcementSystem?.preferredReinforcers || '').trim() ||
      String(plan.reactiveProtocol?.staffResponse || '').trim()
  );

  // 6. Ongoing tracking data
  const rawTracking = Array.isArray(plan.ongoingTracking) ? plan.ongoingTracking : [];
  const trackingPointsCount = rawTracking.length + observations.length;
  const hasOngoingTracking = trackingPointsCount > 0;

  // 7. Lock state
  const isLocked = Boolean(plan.isLocked || assessment.isLocked || student.isLocked);

  // Overall readiness status
  const hasCoreReadiness =
    hasTargetBehaviors &&
    hasBaselineData &&
    hasFunctionalHypothesis &&
    hasReplacementBehaviors &&
    (hasOngoingTracking || isLocked);

  let status: 'ready' | 'partial' | 'missing' = 'partial';
  if (hasCoreReadiness) {
    status = 'ready';
  } else if (
    !hasTargetBehaviors &&
    !hasBaselineData &&
    !hasFunctionalHypothesis &&
    !hasReplacementBehaviors &&
    !hasOngoingTracking
  ) {
    status = 'missing';
  }

  const missingTags: string[] = [];
  if (!hasTargetBehaviors) missingTags.push('חסרות התנהגויות יעד');
  if (!hasBaselineData) missingTags.push('חסר בייסליין');
  if (!hasFunctionalHypothesis) missingTags.push('חסרה השערה תפקודית');
  if (!hasReplacementBehaviors) missingTags.push('חסרה התנהגות חלופית');
  if (!hasOngoingTracking && !isLocked) missingTags.push('ללא מעקב שוטף');

  return {
    targetBehaviorsCount,
    hasTargetBehaviors,
    baselineDataCount,
    hasBaselineData,
    hasFunctionalHypothesis,
    hypothesizedFunctionLabel,
    replacementBehaviorsCount,
    hasReplacementBehaviors,
    hasInterventionStrategies,
    trackingPointsCount,
    hasOngoingTracking,
    isLocked,
    status,
    missingTags
  };
}

/**
 * Computes cohort behavioral readiness summary for behavior analysts.
 */
export function computeBehaviorReadinessSummary(
  students?: any[] | null
): BehaviorReadinessSummary {
  const list = Array.isArray(students) ? students : [];
  const total = list.length;
  let readyCount = 0;
  let partialCount = 0;
  let missingCount = 0;
  let missingBaselineCount = 0;
  let missingHypothesisCount = 0;
  let missingReplacementCount = 0;
  let missingTrackingCount = 0;

  for (const st of list) {
    const info = computeBehaviorStudentReadiness(st);
    if (info.status === 'ready') readyCount += 1;
    else if (info.status === 'partial') partialCount += 1;
    else missingCount += 1;

    if (!info.hasBaselineData) missingBaselineCount += 1;
    if (!info.hasFunctionalHypothesis) missingHypothesisCount += 1;
    if (!info.hasReplacementBehaviors) missingReplacementCount += 1;
    if (!info.hasOngoingTracking && !info.isLocked) missingTrackingCount += 1;
  }

  const readyPct = total > 0 ? Math.round((readyCount / total) * 1000) / 10 : 0;
  const partialPct = total > 0 ? Math.round((partialCount / total) * 1000) / 10 : 0;
  const missingPct = total > 0 ? Math.round((missingCount / total) * 1000) / 10 : 0;

  return {
    total,
    readyCount,
    partialCount,
    missingCount,
    missingBaselineCount,
    missingHypothesisCount,
    missingReplacementCount,
    missingTrackingCount,
    readyPct,
    partialPct,
    missingPct
  };
}

/**
 * Filters a student cohort by behavioral readiness criteria.
 */
export function filterStudentsByBehaviorReadiness<T>(
  students?: T[] | null,
  filterKey: BehaviorReadinessFilterKey = 'all'
): T[] {
  const list = Array.isArray(students) ? [...students] : [];
  if (!filterKey || filterKey === 'all') return list;

  return list.filter((st) => {
    const info = computeBehaviorStudentReadiness(st);
    switch (filterKey) {
      case 'missing_baseline':
        return !info.hasBaselineData;
      case 'missing_hypothesis':
        return !info.hasFunctionalHypothesis;
      case 'missing_replacement':
        return !info.hasReplacementBehaviors;
      case 'missing_tracking':
        return !info.hasOngoingTracking && !info.isLocked;
      case 'ready':
        return info.status === 'ready';
      case 'partial':
        return info.status === 'partial';
      case 'missing':
        return info.status === 'missing';
      default:
        return true;
    }
  });
}

