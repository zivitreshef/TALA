import {
  BaselineDataPoint,
  BehaviorAssessmentReport,
  BehaviorFunction,
  BehaviorInterventionPlan,
  BehaviorMeasurementType,
  BehaviorObservation,
  BehaviorProgressPeriod,
  BehaviorProgressReport,
  DifferentialReinforcementProcedure,
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
    const occ = Math.max(0, Number(point.targetBehaviorOccurrences) || 0);
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
    antecedentStructured: {
      prepAndWarmup: '',
      visualSupports: '',
      taskAdjustments: '',
      environmentOrg: '',
      rolesAndActivities: ''
    },
    smartGoalsNarrative: {
      reductionGoal: '',
      acquisitionGoal: '',
      timeFrameWeeks: 8
    },
    replacementAcquisition: {
      targetSkill: '',
      modelingSteps: '',
      promptingHierarchy: '',
      inSituPractice: '',
      fadingPlan: '',
      reinforcementDetails: '',
      generalizationPlan: ''
    },
    differentialReinforcement: {
      procedureType: 'DRA',
      rationale: '',
      scheduleDetails: '',
      praiseExamples: []
    },
    stagedReactiveProtocol: {
      phaseAInitial: '',
      phaseBDeescalation: '',
      phaseCContinuation: '',
      phaseDCrisis: ''
    },
    classroomCheatSheet: {
      beforeTransition: '',
      duringTransition: '',
      onCooperation: '',
      onRefusal: '',
      onCrisis: ''
    },
    reinforcementSystem: {
      preferredReinforcers: '',
      scheduleOfReinforcement: ''
    },
    reactiveProtocol: {
      staffResponse: '',
      crisisSafetyPlan: ''
    },
    ongoingTracking: [],
    qualityChecklist: {},
    updatedAt: new Date().toISOString()
  };
}

/**
 * Returns clean, professional Hebrew labels for differential reinforcement procedures.
 * Strictly adheres to Hebrew-Only Titles Rule (Zero English in Parentheses).
 */
export function getDifferentialProcedureLabelHebrew(
  proc?: DifferentialReinforcementProcedure | string | null
): string {
  switch (proc) {
    case 'DRA':
      return 'חיזוק דיפרנציאלי של התנהגות חלופית';
    case 'DRI':
      return 'חיזוק דיפרנציאלי של התנהגות בלתי תואמת';
    case 'DRO':
      return 'חיזוק דיפרנציאלי של התנהגות אחרת';
    case 'FCT':
      return 'אימון לתקשורת תפקודית מותאמת';
    default:
      return 'חיזוק דיפרנציאלי מותאם';
  }
}

export interface PlanQualityCheckItem {
  id: string;
  label: string;
  isMet: boolean;
  hint: string;
}

export interface PlanQualityValidationResult {
  score: number;
  total: number;
  percentage: number;
  isReady: boolean;
  items: PlanQualityCheckItem[];
}

/**
 * Evaluates the clinical ABA quality of a Behavioral Intervention Plan against professional standards.
 */
export function validateBehaviorPlanQuality(
  plan?: BehaviorInterventionPlan | null,
  _assessment?: BehaviorAssessmentReport | null
): PlanQualityValidationResult {
  if (!plan) {
    return { score: 0, total: 6, percentage: 0, isReady: false, items: [] };
  }

  const hasOperationalTarget =
    Array.isArray(plan.targetBehaviors) &&
    plan.targetBehaviors.length > 0 &&
    plan.targetBehaviors.some((t) => Boolean(t.name?.trim() && t.operationalDefinition?.trim()));

  const hasMeasurableGoal = Boolean(
    plan.smartGoalsNarrative?.reductionGoal?.trim() ||
      plan.smartGoalsNarrative?.acquisitionGoal?.trim() ||
      plan.targetBehaviors.some((t) => typeof t.targetGoal === 'number' && t.targetGoal >= 0)
  );

  const hasReplacementSkill =
    (Array.isArray(plan.replacementBehaviors) &&
      plan.replacementBehaviors.length > 0 &&
      plan.replacementBehaviors.some((r) => Boolean(r.replacementSkill?.trim()))) ||
    Boolean(plan.replacementAcquisition?.targetSkill?.trim());

  const hasProactiveStrategies = Boolean(
    plan.antecedentStrategies?.trim() ||
      plan.antecedentStructured?.prepAndWarmup?.trim() ||
      plan.antecedentStructured?.visualSupports?.trim() ||
      plan.antecedentStructured?.taskAdjustments?.trim()
  );

  const hasReinforcementSystem = Boolean(
    plan.reinforcementSystem?.preferredReinforcers?.trim() ||
      plan.reinforcementSystem?.scheduleOfReinforcement?.trim() ||
      plan.differentialReinforcement?.rationale?.trim()
  );

  const hasReactiveProtocol = Boolean(
    plan.reactiveProtocol?.staffResponse?.trim() ||
      plan.stagedReactiveProtocol?.phaseAInitial?.trim() ||
      plan.stagedReactiveProtocol?.phaseBDeescalation?.trim()
  );

  const items: PlanQualityCheckItem[] = [
    {
      id: 'target',
      label: 'הגדרת התנהגות יעד אופרציונלית',
      isMet: hasOperationalTarget,
      hint: 'הגדרת התנהגות ברורה וניתנת לצפייה ומדידה'
    },
    {
      id: 'goals',
      label: 'מטרות התערבות מדידות ומותאמות',
      isMet: hasMeasurableGoal,
      hint: 'מטרת הפחתה ומטרת רכישה מוגדרות בזמן ובקריטריון'
    },
    {
      id: 'replacement',
      label: 'התנהגות חלופית תואמת תפקוד',
      isMet: hasReplacementSkill,
      hint: 'הקניית מיומנות המשרתת את אותה תוצאה בדרך מותאמת'
    },
    {
      id: 'antecedent',
      label: 'התערבות מניעתית והתאמות סביבתיות',
      isMet: hasProactiveStrategies,
      hint: 'הטרמה, אמצעים חזותיים והתאמת דרישות למניעה מראש'
    },
    {
      id: 'reinforcement',
      label: 'מערך חיזוקים מובנה וחיזוק דיפרנציאלי',
      isMet: hasReinforcementSystem,
      hint: 'זיהוי מחזקים מניעים, לוח זמנים והליך חיזוק מנומק'
    },
    {
      id: 'reactive',
      label: 'פרוטוקול תגובה מדורג ובטיחות',
      isMet: hasReactiveProtocol,
      hint: 'הנחיות פעולה ברורות לצוות לכל שלב התרחשות או הסלמה'
    }
  ];

  const score = items.filter((i) => i.isMet).length;
  const total = items.length;
  const percentage = Math.round((score / total) * 100);
  const isReady = score >= 4;

  return {
    score,
    total,
    percentage,
    isReady,
    items
  };
}

/**
 * Creates a clean, empty behavior progress report template for mid-year, end-year or periodic reviews.
 */
export function createEmptyBehaviorProgressReport(
  period: BehaviorProgressPeriod = 'mid_year'
): BehaviorProgressReport {
  const isMid = period === 'mid_year';
  const isEnd = period === 'end_year';
  const defaultLabel = isMid
    ? 'מחצית ראשונה (ספטמבר - ינואר)'
    : isEnd
    ? 'סיכום שנתי מלא (ספטמבר - יוני)'
    : 'דוח מעקב תקופתי';

  return {
    period,
    reportDate: new Date().toISOString().slice(0, 10),
    reviewPeriodLabel: defaultLabel,
    executiveSummary: '',
    targetBehaviorsProgress: [],
    replacementBehaviorsAcquisition: [],
    environmentalAdjustments: '',
    staffFidelityObservations: '',
    recommendations: '',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Returns clean Hebrew labels for progress report review periods.
 * Strictly adheres to Hebrew-Only Titles Rule (Zero English in Parentheses).
 */
export function getBehaviorProgressPeriodLabelHebrew(period?: BehaviorProgressPeriod | string | null): string {
  switch (period) {
    case 'mid_year':
      return 'סיכום אמצע שנה';
    case 'end_year':
      return 'סיכום סוף שנה';
    case 'periodic':
    default:
      return 'דוח התקדמות תקופתי';
  }
}

export interface HeatmapCell {
  dayIndex: number;
  dayName: string;
  periodIndex: number;
  periodName: string;
  occurrences: number;
  incidentCount: number;
}

export interface HeatmapMatrixResult {
  hasData: boolean;
  totalOccurrences: number;
  maxCellOccurrences: number;
  days: string[];
  periods: string[];
  cells: HeatmapCell[];
  peakDay?: string;
  peakPeriod?: string;
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const SCHOOL_PERIODS = ['שיעור 1', 'שיעור 2', 'שיעור 3', 'שיעור 4', 'שיעור 5', 'שיעור 6'];

function extractPeriodIndex(rawPeriod?: string | null): number {
  if (!rawPeriod) return 0;
  const match = rawPeriod.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 6) return num - 1;
  }
  return 0;
}

function extractDayIndexFromIso(dateStr?: string | null): number {
  if (!dateStr) return 0;
  try {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      const day = dt.getDay(); // 0 is Sunday, 5 is Friday
      if (day >= 0 && day <= 5) return day;
    }
  } catch {}
  return 0;
}

/**
 * 1. מפת פיזור שעתית לאורך ימות השבוע
 * Aggregates behavioral occurrences across days of week (ראשון עד שישי) and school periods (שיעור 1 עד 6).
 */
export function computeHourlyHeatmapMatrix(
  trackingData?: OngoingTrackingPoint[] | null,
  observations?: BehaviorObservation[] | null
): HeatmapMatrixResult {
  const points = Array.isArray(trackingData) ? trackingData : [];
  const obs = Array.isArray(observations) ? observations : [];

  const matrix: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
  const countMatrix: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));

  let totalOccurrences = 0;
  let pointsCount = 0;

  for (const pt of points) {
    const dayIdx = extractDayIndexFromIso(pt.date);
    const periodIdx = extractPeriodIndex(pt.period || pt.sessionOrPeriod);
    const occ = Number(pt.targetBehaviorOccurrences ?? pt.targetBehaviorCount) || 0;
    matrix[dayIdx][periodIdx] += occ;
    countMatrix[dayIdx][periodIdx] += 1;
    totalOccurrences += occ;
    pointsCount += 1;
  }

  // Also factor in qualitative observations if any
  for (const o of obs) {
    const dateStr = o.dateTime ? o.dateTime.slice(0, 10) : '';
    const dayIdx = extractDayIndexFromIso(dateStr);
    const periodIdx = extractPeriodIndex(o.activity);
    countMatrix[dayIdx][periodIdx] += 1;
    if (matrix[dayIdx][periodIdx] === 0) {
      matrix[dayIdx][periodIdx] += 1;
      totalOccurrences += 1;
    }
    pointsCount += 1;
  }

  let maxCellOccurrences = 0;
  let peakDay = HEBREW_DAYS[0];
  let peakPeriod = SCHOOL_PERIODS[0];

  const cells: HeatmapCell[] = [];
  for (let d = 0; d < 6; d++) {
    for (let p = 0; p < 6; p++) {
      const occurrences = matrix[d][p];
      const incidentCount = countMatrix[d][p];
      if (occurrences > maxCellOccurrences) {
        maxCellOccurrences = occurrences;
        peakDay = HEBREW_DAYS[d];
        peakPeriod = SCHOOL_PERIODS[p];
      }
      cells.push({
        dayIndex: d,
        dayName: HEBREW_DAYS[d],
        periodIndex: p,
        periodName: SCHOOL_PERIODS[p],
        occurrences,
        incidentCount
      });
    }
  }

  return {
    hasData: pointsCount > 0 && totalOccurrences > 0,
    totalOccurrences,
    maxCellOccurrences,
    days: HEBREW_DAYS,
    periods: SCHOOL_PERIODS,
    cells,
    peakDay: totalOccurrences > 0 ? peakDay : undefined,
    peakPeriod: totalOccurrences > 0 ? peakPeriod : undefined
  };
}

export interface AbcSequenceRow {
  antecedent: string;
  consequence: string;
  perceivedFunctionLabel: string;
  count: number;
  percentage: number;
}

export interface AbcSequenceResult {
  hasData: boolean;
  totalIncidents: number;
  rows: AbcSequenceRow[];
  dominantAntecedent?: string;
  dominantConsequence?: string;
}

/**
 * 2. טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית
 * Cross-tabulates antecedents vs consequences and perceived functions.
 */
export function computeAbcSequenceSummary(
  observations?: BehaviorObservation[] | null
): AbcSequenceResult {
  const obs = Array.isArray(observations) ? observations : [];
  const validObs = obs.filter((o) => (o.antecedent && o.antecedent.trim()) || (o.consequence && o.consequence.trim()));

  if (validObs.length === 0) {
    return {
      hasData: false,
      totalIncidents: 0,
      rows: []
    };
  }

  const map = new Map<string, { antecedent: string; consequence: string; fn: string; count: number }>();
  const antecedentCounts = new Map<string, number>();
  const consequenceCounts = new Map<string, number>();

  for (const item of validObs) {
    const ant = (item.antecedent || 'לא צוין תנאי מקדים').trim();
    const cons = (item.consequence || 'לא צוינה תגובה סביבתית').trim();
    const fnLabel = getBehaviorFunctionLabelHebrew(item.perceivedFunction);

    const key = `${ant}___${cons}___${fnLabel}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { antecedent: ant, consequence: cons, fn: fnLabel, count: 1 });
    }

    antecedentCounts.set(ant, (antecedentCounts.get(ant) || 0) + 1);
    consequenceCounts.set(cons, (consequenceCounts.get(cons) || 0) + 1);
  }

  const totalIncidents = validObs.length;
  const rows: AbcSequenceRow[] = Array.from(map.values())
    .map((entry) => ({
      antecedent: entry.antecedent,
      consequence: entry.consequence,
      perceivedFunctionLabel: entry.fn,
      count: entry.count,
      percentage: Math.round((entry.count / totalIncidents) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  let dominantAntecedent: string | undefined;
  let maxAntCount = 0;
  for (const [ant, count] of antecedentCounts.entries()) {
    if (count > maxAntCount) {
      maxAntCount = count;
      dominantAntecedent = ant;
    }
  }

  let dominantConsequence: string | undefined;
  let maxConsCount = 0;
  for (const [cons, count] of consequenceCounts.entries()) {
    if (count > maxConsCount) {
      maxConsCount = count;
      dominantConsequence = cons;
    }
  }

  return {
    hasData: rows.length > 0,
    totalIncidents,
    rows,
    dominantAntecedent,
    dominantConsequence
  };
}

export interface DurationIntensityPoint {
  id: string;
  date: string;
  period: string;
  durationMinutes: number;
  intensity: 'mild' | 'moderate' | 'severe' | string;
  intensityScore: number;
  intensityLabel: string;
  notes?: string;
}

export interface DurationIntensityResult {
  hasData: boolean;
  points: DurationIntensityPoint[];
  averageDurationMinutes: number;
  maxDurationMinutes: number;
  totalDurationMinutes: number;
}

export function getIntensityLabelHebrew(intensity?: string | null): string {
  switch (intensity) {
    case 'mild':
      return 'קלה';
    case 'severe':
      return 'גבוהה';
    case 'moderate':
    default:
      return 'בינונית';
  }
}

/**
 * 3. גרף משך זמן ועוצמת אירוע
 * Extracts points with measured duration in minutes and intensity levels.
 */
export function computeDurationAndIntensityData(
  trackingData?: OngoingTrackingPoint[] | null,
  observations?: BehaviorObservation[] | null
): DurationIntensityResult {
  const points: DurationIntensityPoint[] = [];

  const rawTracking = Array.isArray(trackingData) ? trackingData : [];
  for (const t of rawTracking) {
    if (typeof t.durationMinutes === 'number' && t.durationMinutes > 0) {
      points.push({
        id: t.id || 'trk_' + Math.random(),
        date: t.date,
        period: t.period || t.sessionOrPeriod || 'שיעור',
        durationMinutes: t.durationMinutes,
        intensity: 'moderate',
        intensityScore: 2,
        intensityLabel: getIntensityLabelHebrew('moderate'),
        notes: t.notes
      });
    }
  }

  const rawObs = Array.isArray(observations) ? observations : [];
  for (const o of rawObs) {
    const dur = typeof o.durationMinutes === 'number' && o.durationMinutes > 0 ? o.durationMinutes : 0;
    const intensity = o.intensity || 'moderate';
    const score = intensity === 'severe' ? 3 : intensity === 'mild' ? 1 : 2;

    if (dur > 0 || o.intensity) {
      points.push({
        id: o.id || 'obs_' + Math.random(),
        date: o.dateTime ? o.dateTime.slice(0, 10) : 'היום',
        period: o.activity || 'שיעור',
        durationMinutes: dur,
        intensity,
        intensityScore: score,
        intensityLabel: getIntensityLabelHebrew(intensity),
        notes: o.behavior || o.notes
      });
    }
  }

  // Sort chronologically
  points.sort((a, b) => a.date.localeCompare(b.date));

  const totalDuration = points.reduce((acc, p) => acc + p.durationMinutes, 0);
  const durPoints = points.filter((p) => p.durationMinutes > 0);
  const avgDuration = durPoints.length > 0 ? Math.round((totalDuration / durPoints.length) * 10) / 10 : 0;
  const maxDuration = points.reduce((max, p) => Math.max(max, p.durationMinutes), 0);

  return {
    hasData: points.length > 0 && (totalDuration > 0 || points.some((p) => p.intensityScore > 1)),
    points,
    averageDurationMinutes: avgDuration,
    maxDurationMinutes: maxDuration,
    totalDurationMinutes: totalDuration
  };
}

export interface ReplacementCurvePoint {
  date: string;
  period: string;
  sessionIndex: number;
  cumulativeCount: number;
  usedInSession: boolean;
  notes?: string;
}

export interface ReplacementCurveResult {
  hasData: boolean;
  totalReplacementDemonstrations: number;
  points: ReplacementCurvePoint[];
  acquisitionRatePercentage: number;
}

/**
 * 4. עקומת למידה מצטברת של מיומנות חלופית
 * Visualizes cumulative acquisition curve of replacement behavior uses.
 */
export function computeReplacementSkillCurve(
  trackingData?: OngoingTrackingPoint[] | null
): ReplacementCurveResult {
  const raw = Array.isArray(trackingData) ? [...trackingData] : [];
  if (raw.length === 0) {
    return {
      hasData: false,
      totalReplacementDemonstrations: 0,
      points: [],
      acquisitionRatePercentage: 0
    };
  }

  // Sort chronologically
  raw.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  let cumulativeCount = 0;
  const points: ReplacementCurvePoint[] = [];

  raw.forEach((pt, idx) => {
    const used = pt.replacementBehaviorUsed === true || Number(pt.replacementBehaviorUsed) > 0;
    if (used) {
      cumulativeCount += 1;
    }
    points.push({
      date: pt.date,
      period: pt.period || pt.sessionOrPeriod || `מפגש ${idx + 1}`,
      sessionIndex: idx + 1,
      cumulativeCount,
      usedInSession: used,
      notes: pt.notes
    });
  });

  const acquisitionRate = raw.length > 0 ? Math.round((cumulativeCount / raw.length) * 100) : 0;

  return {
    hasData: cumulativeCount > 0,
    totalReplacementDemonstrations: cumulativeCount,
    points,
    acquisitionRatePercentage: acquisitionRate
  };
}

export interface StaffFidelityBreakdown {
  period: string;
  totalSessions: number;
  reinforcedSessions: number;
  fidelityPercentage: number;
}

export interface StaffFidelityResult {
  hasData: boolean;
  totalTrackedSessions: number;
  reinforcedSessions: number;
  overallFidelityPercentage: number;
  ratingLabel: string;
  periodBreakdowns: StaffFidelityBreakdown[];
}

/**
 * 5. טבלת נאמנות יישום של צוות בית הספר
 * Evaluates consistent reinforcement protocol delivery across sessions.
 */
export function computeStaffFidelityMetrics(
  trackingData?: OngoingTrackingPoint[] | null
): StaffFidelityResult {
  const raw = Array.isArray(trackingData) ? trackingData : [];
  if (raw.length === 0) {
    return {
      hasData: false,
      totalTrackedSessions: 0,
      reinforcedSessions: 0,
      overallFidelityPercentage: 0,
      ratingLabel: 'אין נתונים',
      periodBreakdowns: []
    };
  }

  let reinforcedCount = 0;
  const periodMap = new Map<string, { total: number; reinforced: number }>();

  for (const pt of raw) {
    const period = pt.period || pt.sessionOrPeriod || 'שיעור כללי';
    const isReinforced = pt.reinforcementDelivered === true;
    if (isReinforced) reinforcedCount += 1;

    const curr = periodMap.get(period) || { total: 0, reinforced: 0 };
    curr.total += 1;
    if (isReinforced) curr.reinforced += 1;
    periodMap.set(period, curr);
  }

  const totalSessions = raw.length;
  const overallPct = Math.round((reinforcedCount / totalSessions) * 100);

  let ratingLabel = 'דרוש חידוד נהלים';
  if (overallPct >= 80) {
    ratingLabel = 'נאמנות גבוהה ועקבית';
  } else if (overallPct >= 50) {
    ratingLabel = 'נאמנות בינונית במגמת שיפור';
  }

  const periodBreakdowns: StaffFidelityBreakdown[] = Array.from(periodMap.entries()).map(([p, data]) => ({
    period: p,
    totalSessions: data.total,
    reinforcedSessions: data.reinforced,
    fidelityPercentage: Math.round((data.reinforced / data.total) * 100)
  }));

  return {
    hasData: totalSessions > 0,
    totalTrackedSessions: totalSessions,
    reinforcedSessions: reinforcedCount,
    overallFidelityPercentage: overallPct,
    ratingLabel,
    periodBreakdowns
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

