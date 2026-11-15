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
