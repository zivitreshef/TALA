import { callAiJson, StudentAiContext } from './aiJsonClient';
import { callAiProxyEndpoint } from './aiProxyClient';
import { maskPromptForAi } from '../goalBankData';
import { BehaviorFunction, BehaviorMeasurementType, StudentProfile } from '../domain/types';
import { aggregateSnippetsForAiPrompt } from '../domain/pedagogicalFeed';

export type StudentBehaviorAiContext = StudentProfile | StudentAiContext | Record<string, unknown>;

export interface GeneratedAssessmentDraft {
  backgroundSummary?: string;
  targetBehaviors?: Array<{
    name: string;
    operationalDefinition: string;
    measurementType: BehaviorMeasurementType;
    suggestedTargetGoal?: number;
  }>;
  antecedentAnalysis?: string;
  mainHypothesizedFunction?: BehaviorFunction;
  functionalHypothesisNarrative?: string;
  initialRecommendations?: string;
}

export interface GeneratedInterventionStrategies {
  // Flat backward-compatible fields:
  replacementSkill?: string;
  teachingStrategies?: string;
  antecedentStrategies?: string;
  preferredReinforcers?: string;
  scheduleOfReinforcement?: string;
  staffResponse?: string;
  crisisSafetyPlan?: string;

  // Rich clinical ABA fields:
  smartGoalsNarrative?: {
    reductionGoal: string;
    acquisitionGoal: string;
    timeFrameWeeks: number;
  };
  antecedentStructured?: {
    prepAndWarmup: string;
    visualSupports: string;
    taskAdjustments: string;
    environmentOrg: string;
    rolesAndActivities: string;
  };
  replacementAcquisition?: {
    targetSkill: string;
    modelingSteps: string;
    promptingHierarchy: string;
    inSituPractice: string;
    fadingPlan: string;
    reinforcementDetails: string;
    generalizationPlan: string;
  };
  differentialReinforcement?: {
    procedureType: 'DRA' | 'DRI' | 'DRO' | 'FCT';
    rationale: string;
    scheduleDetails: string;
    praiseExamples: string[];
  };
  stagedReactiveProtocol?: {
    phaseAInitial: string;
    phaseBDeescalation: string;
    phaseCContinuation: string;
    phaseDCrisis: string;
  };
  classroomCheatSheet?: {
    beforeTransition: string;
    duringTransition: string;
    onCooperation: string;
    onRefusal: string;
    onCrisis: string;
  };
}

export interface InterventionGenerationContext {
  targetBehaviorName?: string;
  operationalDefinition?: string;
  baselineAverage?: number;
  targetGoal?: number;
  antecedentAnalysis?: string;
  functionalHypothesis?: string;
  backgroundSummary?: string;
}

/**
 * Generates a full structured behavior assessment draft from teacher/analyst free text observations.
 */
export async function generateBehaviorAssessmentDraft(
  rawNotes: string,
  student: StudentBehaviorAiContext = {}
): Promise<GeneratedAssessmentDraft | null> {
  const snippetsContext =
    Array.isArray((student as any).pedagogicalSnippets) && (student as any).pedagogicalSnippets.length > 0
      ? `\n\nמידע נוסף, תובנות שנאספו בציר, הקלטות קול וקול ההורה:\n"""\n${aggregateSnippetsForAiPrompt((student as any).pedagogicalSnippets)}\n"""`
      : '';

  const prompt = `
אתה מנתח התנהגות מוסמך ומומחה בניתוח התנהגות יישומי (ABA) במסגרות החינוך המיוחד בישראל.
על סמך התיאור החופשי הבא של התנהגות התלמיד, נתח ובנה טיוטה מקיפה ומקצועית לדוח הערכת תפקוד התנהגותי.

הנחיות חובה:
1. כתוב בעברית תקנית, מקצועית ונקייה בלבד. ללא אנגלית בסוגריים כלל.
2. הגדרת התנהגויות היעד חייבת להיות אופרציונלית, אובייקטיבית וברת-מדידה.
3. זהה את תפקיד ההתנהגות המרכזי מתוך 4 התפקידים: escape (הימנעות/בריחה), attention (תשומת לב), tangible (השגת מוחשי/חפץ), sensory (ויסות/צורך חושי), או other (אחר/משולב).
4. החזר אך ורק אובייקט JSON תקני במבנה הבא:
{
  "backgroundSummary": "סיכום רקע תמציתי",
  "targetBehaviors": [
    {
      "name": "שם ההתנהגות",
      "operationalDefinition": "הגדרה אופרציונלית מפורטת ומדידה של מה שהתלמיד עושה",
      "measurementType": "frequency", // אחד מ: frequency, duration, interval
      "suggestedTargetGoal": 1
    }
  ],
  "antecedentAnalysis": "ניתוח נסיבות מקדימות, זמנים מועדים וטריגרים מפעילים",
  "mainHypothesizedFunction": "escape", // escape | attention | tangible | sensory | other
  "functionalHypothesisNarrative": "ניסוח מנומק: כאשר מתרחש [טריגר], התלמיד מגיב ב-[התנהגות] כדי להשיג/להימנע מ-[תפקיד]",
  "initialRecommendations": "עוגנים והמלצות סביבתיות ופדגוגיות ראשוניות לבניית תוכנית ההתערבות"
}

תיאור התצפיות והמקרה:
"""
${rawNotes || 'תצפיות והערכת תפקוד התנהגותי'}${snippetsContext}
"""
`;

  try {
    const result = await callAiJson(prompt, student as StudentAiContext);
    if (result && typeof result === 'object') {
      const data = result as Record<string, unknown>;
      return {
        backgroundSummary: typeof data.backgroundSummary === 'string' ? data.backgroundSummary : '',
        targetBehaviors: Array.isArray(data.targetBehaviors)
          ? (data.targetBehaviors as GeneratedAssessmentDraft['targetBehaviors'])
          : [],
        antecedentAnalysis: typeof data.antecedentAnalysis === 'string' ? data.antecedentAnalysis : '',
        mainHypothesizedFunction: (['escape', 'attention', 'tangible', 'sensory', 'other'].includes(
          String(data.mainHypothesizedFunction)
        )
          ? data.mainHypothesizedFunction
          : 'escape') as BehaviorFunction,
        functionalHypothesisNarrative:
          typeof data.functionalHypothesisNarrative === 'string'
            ? data.functionalHypothesisNarrative
            : '',
        initialRecommendations:
          typeof data.initialRecommendations === 'string' ? data.initialRecommendations : ''
      };
    }
  } catch (err) {
    console.error('[behaviorAiService] generateBehaviorAssessmentDraft error:', err);
  }
  return null;
}

/**
 * Refines an informal description into an objective, operational behavioral definition.
 */
export async function refineOperationalDefinition(
  informalText: string,
  student: StudentBehaviorAiContext = {}
): Promise<string> {
  if (!informalText.trim()) return '';

  const prompt = `
אתה מנתח התנהגות מוסמך.
נסח מחדש את התיאור היומיומי הבא להגדרה אופרציונלית, אובייקטיבית וברת-מדידה של התנהגות התלמיד.
כתוב בעברית מקצועית ונקייה בלבד. ללא אנגלית בסוגריים כלל.
אל תוסיף הקדמות או סיכומים, החזר רק את פסקת ההגדרה האופרציונלית.

תיאור מקורי:
"""
${informalText}
"""
`;

  try {
    const studentContext = student as StudentAiContext;
    const masked = maskPromptForAi(
      prompt,
      studentContext,
      studentContext?.privacyMode || studentContext?.defaultPrivacyMode
    );
    const response = (await callAiProxyEndpoint({
      operation: 'refineOperationalDefinition',
      payload: { prompt: masked }
    })) as Record<string, unknown>;
    const textOutput = typeof response?.text === 'string' ? response.text : typeof response?.raw === 'string' ? response.raw : '';
    return textOutput.trim() || informalText;
  } catch (err) {
    console.error('[behaviorAiService] refineOperationalDefinition error:', err);
    return informalText;
  }
}

/**
 * Formulates a rigorous functional hypothesis narrative based on ABA methodology.
 */
export async function formulateHypothesisNarrative(
  antecedent: string,
  behavior: string,
  functionLabel: string,
  student: StudentBehaviorAiContext = {}
): Promise<string> {
  const prompt = `
אתה מנתח התנהגות מוסמך.
נסח משפט השערת תפקוד מנומק ומקצועי על פי עקרונות הניתוח היישומי (ABA).
אירוע מקדים: ${antecedent || 'דרישה לימודית או מעבר פעילות'}
התנהגות: ${behavior || 'התנהגות מאתגרת'}
תפקיד משוער: ${functionLabel || 'הימנעות ממטלה'}

הנחיות:
1. כתוב בעברית מקצועית וקולחת בלבד. ללא אנגלית בסוגריים כלל.
2. החזר אך ורק את משפט ההשערה המנומק, ללא מילות פתיחה או סיום.
`;

  try {
    const studentContext = student as StudentAiContext;
    const masked = maskPromptForAi(
      prompt,
      studentContext,
      studentContext?.privacyMode || studentContext?.defaultPrivacyMode
    );
    const response = (await callAiProxyEndpoint({
      operation: 'formulateHypothesisNarrative',
      payload: { prompt: masked }
    })) as Record<string, unknown>;
    const textOutput = typeof response?.text === 'string' ? response.text : typeof response?.raw === 'string' ? response.raw : '';
    return textOutput.trim() || '';
  } catch (err) {
    console.error('[behaviorAiService] formulateHypothesisNarrative error:', err);
    return '';
  }
}

/**
 * Suggests comprehensive intervention strategies adhering strictly to clinical ABA standards,
 * multi-tier antecedent strategies, replacement skill acquisition hierarchy, differential reinforcement,
 * 4-phase staged reactive protocol, and practical classroom implementation.
 */
export async function suggestInterventionStrategies(
  targetBehaviorName: string,
  functionLabel: string,
  student: StudentBehaviorAiContext = {},
  context: InterventionGenerationContext = {}
): Promise<GeneratedInterventionStrategies | null> {
  const snippetsContext =
    Array.isArray((student as any).pedagogicalSnippets) && (student as any).pedagogicalSnippets.length > 0
      ? `\nמידע נוסף ותובנות מהצוות החינוכי:\n"""\n${aggregateSnippetsForAiPrompt((student as any).pedagogicalSnippets)}\n"""\n`
      : '';

  const baselineInfo = context.baselineAverage
    ? `ממוצע נתוני בסיס: ${context.baselineAverage} אירועים/דקות. יעד הפחתה רצוי: ${context.targetGoal ?? 1}.`
    : '';

  const opDefInfo = context.operationalDefinition
    ? `הגדרה אופרציונלית של ההתנהגות: "${context.operationalDefinition}".`
    : '';

  const hypothesisInfo = context.functionalHypothesis
    ? `השערת תפקוד מנומקת: "${context.functionalHypothesis}".`
    : '';

  const prompt = `
אתה מנתח התנהגות מוסמך (BCBA / מנתח התנהגות יישומי) ומומחה בהתערבות התנהגותית במסגרות החינוך המיוחד בישראל.
עליך לבנות תוכנית התערבות התנהגותית מקיפה, קלינית ומעשית עבור תלמיד, על בסיס הניתוח התפקודי הבא:

פרטי המקרה:
- התנהגות יעד להפחתה: ${targetBehaviorName || context.targetBehaviorName || 'התנהגות מאתגרת'}
- תפקיד ההתנהגות המשוער: ${functionLabel || 'הימנעות ממטלה'}
${opDefInfo}
${hypothesisInfo}
${baselineInfo}
${context.backgroundSummary ? `רקע כללי: ${context.backgroundSummary}` : ''}
${snippetsContext}

הנחיות פדגוגיות וקליניות מחייבות:
1. שפה וסגנון: עברית תקנית, מקצועית ומדויקת בלבד. ללא אותיות או מילים באנגלית בסוגריים כלל.
2. מניעת המלצות גנריות: איסור מוחלט על סיסמאות כגון "יש לחזק התנהגות חיובית", "יש להציב גבולות", "יש לשמור על עקביות", "יש לייצר סדר יום" ללא פירוט ביצועי מלא.
3. בטיחות ואחריות: אין להמליץ בשום אופן על מגע פיזי, כפייה, חסימה פיזית, ריסון או בידוד. אין להציע הכחדה אוטומטית (כגון התעלמות) במקרה של פונקציית בריחה ללא FCT.
4. שלב 1 - מטרות SMART: נסח שתי מטרות משלימות - מטרת הפחתה מדידה לפי נתוני הבסיס, ומטרת רכישה ושליטה של ההתנהגות החלופית (כולל מסגרת זמן בשבועות וקריטריון הצלחה בארבע מתוך חמש הזדמנויות).
5. שלב 2 - התערבות מניעתית: 5 קטגוריות (הטרמה, אמצעים חזותיים, התאמת דרישות, ארגון סביבה, תפקידים). כל המלצה חייבת לכלול: מה המבוגר עושה, מתי, כיצד, באיזה אמצעי, מה הילד אמור להבין, והקשר לפונקציה.
6. שלב 3 - הקניית התנהגות חלופית: פירוט הליך ההקניה (מידול, רמזים, תרגול בזמן אמת, דעיכת רמזים, חיזוק והכללה).
7. שלב 4 - מערך חיזוקים: בחירת הליך חיזוק דיפרנציאלי מנומק (DRA, DRI, DRO או FCT), פירוט לוח זמנים, ודוגמאות למשפטי שבח תיאורי ספציפיים שהצוות יאמר.
8. שלב 5 - תגובת הסביבה ב-4 מצבים: מצב א' (הופעה ראשונית), מצב ב' (ירידה בעוצמה), מצב ג' (המשכיות), מצב ד' (הסלמה ובטיחות).
9. שלב 6 - כרטיסיית פעולה מעשית לכיתה ולסייעת: תמצית אופרטיבית (לפני מעבר, בזמן מעבר, בשיתוף פעולה, בסירוב, בהסלמה).

החזר אך ורק אובייקט JSON תקני במבנה המדויק הבא:
{
  "smartGoalsNarrative": {
    "reductionGoal": "הפחתת אירועי [התנהגות] במהלך פעילות לימודית מעד X מופעים לעד Y מופעים ביום",
    "acquisitionGoal": "בתוך 8 שבועות, הילד ילמד [התנהגות חלופית] וישתמש בה בארבע מתוך חמש הזדמנויות שבהן מוצגת מטלה מאתגרת",
    "timeFrameWeeks": 8
  },
  "antecedentStructured": {
    "prepAndWarmup": "הטרמה והכנה מראש (מה המבוגר עושה, מתי, כיצד, והקשר לפונקציה)",
    "visualSupports": "אמצעים חזותיים (טיימר חזותי, כרטיסיית הפסקה/עזרה, לוח סדר יום)",
    "taskAdjustments": "התאמת דרישות (פירוק מטלה, קיצור משך, מתן בחירה מובנית, קצב)",
    "environmentOrg": "ארגון הסביבה (צמצום מסיחים, מיקום ישיבה, הכנת חומרים מראש)",
    "rolesAndActivities": "תפקידים ופעילות חלופית (תפקיד תפעולי, שילוב תנועה, פעילות בעלת ערך מחזק)"
  },
  "replacementAcquisition": {
    "targetSkill": "הגדרת המיומנות הנלמדת",
    "modelingSteps": "כיצד המבוגר מדגים וממדל את ההתנהגות",
    "promptingHierarchy": "איזה רמז ניתן (חזותי, מילולי קצר, מחוותי)",
    "inSituPractice": "כיצד מלמדים ומתרגלים בזמן אמת בסביבה הטבעית",
    "fadingPlan": "כיצד מפחיתים בהדרגה את התלות ברמזים",
    "reinforcementDetails": "כיצד מחזקים את השימוש במיומנות החדשה",
    "generalizationPlan": "כיצד מעבירים את המיומנות לסביבות, שיעורים ואנשים נוספים"
  },
  "differentialReinforcement": {
    "procedureType": "DRA", // DRA | DRI | DRO | FCT
    "rationale": "הסבר מקצועי מדוע הליך זה מתאים לממצאי הניתוח",
    "scheduleDetails": "פירוט לוח החיזוקים: מתי ניתן, מידת המיידיות, תדירות ודילול הדרגתי",
    "praiseExamples": [
      "משפט שבח תיאורי ספציפי 1",
      "משפט שבח תיאורי ספציפי 2"
    ]
  },
  "stagedReactiveProtocol": {
    "phaseAInitial": "מצב א' - הופעה ראשונית: תגובה ניטרלית, מניעת תשומת לב עודפת, רמז חזותי קצר",
    "phaseBDeescalation": "מצב ב' - הפסקה או ירידה בעוצמה: זיהוי ההזדמנות, מתן חיזוק וחזרה מדורגת לפעילות",
    "phaseCContinuation": "מצב ג' - המשכיות: שינוי סביבתי, התאמת דרישה, מניעת מאבקי כוח",
    "phaseDCrisis": "מצב ד' - הסלמה ובטיחות: שמירה על בטיחות, הפחתת גירויים, עצירת הדרישה, וניהול האירוע"
  },
  "classroomCheatSheet": {
    "beforeTransition": "הנחיית פעולה לצוות לפני מעבר או משימה",
    "duringTransition": "הנחיית פעולה בזמן המעבר או ההוראה",
    "onCooperation": "תגובת הצוות בעת שיתוף פעולה והיענות",
    "onRefusal": "תגובת הצוות בעת סירוב או תחילת קושי",
    "onCrisis": "תגובת הצוות בעת הסלמה"
  },
  "preferredReinforcers": "מחזקים מועדפים שנבחנו (חברתיים, פעילויות, תפקידים, חפצים)",
  "scheduleOfReinforcement": "לוח זמנים מומלץ למתן חיזוקים",
  "crisisSafetyPlan": "הנחיות בטיחות והרגעה מותאמות למסגרת"
}
`;

  try {
    const studentContext = student as StudentAiContext;
    const result = await callAiJson(prompt, studentContext);
    if (result && typeof result === 'object') {
      const d = result as Record<string, any>;

      // Extract structured proactive strategies
      const antStruct = d.antecedentStructured || {};
      const prep = antStruct.prepAndWarmup || '';
      const visual = antStruct.visualSupports || '';
      const task = antStruct.taskAdjustments || '';
      const env = antStruct.environmentOrg || '';
      const roles = antStruct.rolesAndActivities || '';

      // Build consolidated antecedent narrative
      const combinedAntecedents = [
        prep ? `• הטרמה והכנה מראש: ${prep}` : '',
        visual ? `• אמצעים חזותיים: ${visual}` : '',
        task ? `• התאמת דרישות ומטלות: ${task}` : '',
        env ? `• ארגון הסביבה: ${env}` : '',
        roles ? `• תפקידים ופעילות חלופית: ${roles}` : ''
      ]
        .filter(Boolean)
        .join('\n\n');

      // Extract structured reactive protocol
      const stagedReact = d.stagedReactiveProtocol || {};
      const phaseA = stagedReact.phaseAInitial || '';
      const phaseB = stagedReact.phaseBDeescalation || '';
      const phaseC = stagedReact.phaseCContinuation || '';
      const phaseD = stagedReact.phaseDCrisis || '';

      const combinedStaffResponse = [
        phaseA ? `מצב א' (הופעה ראשונית): ${phaseA}` : '',
        phaseB ? `מצב ב' (הפסקה/ירידה בעוצמה): ${phaseB}` : '',
        phaseC ? `מצב ג' (המשכיות): ${phaseC}` : ''
      ]
        .filter(Boolean)
        .join('\n\n');

      // Extract replacement acquisition
      const repAcq = d.replacementAcquisition || {};
      const repSkill = repAcq.targetSkill || d.replacementSkill || '';
      const combinedTeaching = [
        repAcq.modelingSteps ? `• הדגמה ומידול: ${repAcq.modelingSteps}` : '',
        repAcq.promptingHierarchy ? `• רמזים וסיוע: ${repAcq.promptingHierarchy}` : '',
        repAcq.inSituPractice ? `• תרגול בזמן אמת: ${repAcq.inSituPractice}` : '',
        repAcq.fadingPlan ? `• דעיכת רמזים: ${repAcq.fadingPlan}` : '',
        repAcq.generalizationPlan ? `• הכללה: ${repAcq.generalizationPlan}` : ''
      ]
        .filter(Boolean)
        .join('\n');

      // Extract differential reinforcement
      const diffReinf = d.differentialReinforcement || {};
      const praiseList = Array.isArray(diffReinf.praiseExamples)
        ? diffReinf.praiseExamples.filter((p: unknown) => typeof p === 'string')
        : [];

      return {
        // Flat backwards-compatible fields
        replacementSkill: repSkill || (typeof d.replacementSkill === 'string' ? d.replacementSkill : ''),
        teachingStrategies: combinedTeaching || (typeof d.teachingStrategies === 'string' ? d.teachingStrategies : ''),
        antecedentStrategies: combinedAntecedents || (typeof d.antecedentStrategies === 'string' ? d.antecedentStrategies : ''),
        preferredReinforcers: typeof d.preferredReinforcers === 'string' ? d.preferredReinforcers : '',
        scheduleOfReinforcement:
          typeof d.scheduleOfReinforcement === 'string'
            ? d.scheduleOfReinforcement
            : diffReinf.scheduleDetails || '',
        staffResponse: combinedStaffResponse || (typeof d.staffResponse === 'string' ? d.staffResponse : ''),
        crisisSafetyPlan: phaseD || (typeof d.crisisSafetyPlan === 'string' ? d.crisisSafetyPlan : ''),

        // Rich clinical ABA fields
        smartGoalsNarrative: d.smartGoalsNarrative
          ? {
              reductionGoal: String(d.smartGoalsNarrative.reductionGoal || ''),
              acquisitionGoal: String(d.smartGoalsNarrative.acquisitionGoal || ''),
              timeFrameWeeks: Number(d.smartGoalsNarrative.timeFrameWeeks) || 8
            }
          : undefined,

        antecedentStructured: {
          prepAndWarmup: String(prep),
          visualSupports: String(visual),
          taskAdjustments: String(task),
          environmentOrg: String(env),
          rolesAndActivities: String(roles)
        },

        replacementAcquisition: {
          targetSkill: String(repSkill),
          modelingSteps: String(repAcq.modelingSteps || ''),
          promptingHierarchy: String(repAcq.promptingHierarchy || ''),
          inSituPractice: String(repAcq.inSituPractice || ''),
          fadingPlan: String(repAcq.fadingPlan || ''),
          reinforcementDetails: String(repAcq.reinforcementDetails || ''),
          generalizationPlan: String(repAcq.generalizationPlan || '')
        },

        differentialReinforcement: {
          procedureType: ['DRA', 'DRI', 'DRO', 'FCT'].includes(String(diffReinf.procedureType))
            ? diffReinf.procedureType
            : 'DRA',
          rationale: String(diffReinf.rationale || ''),
          scheduleDetails: String(diffReinf.scheduleDetails || d.scheduleOfReinforcement || ''),
          praiseExamples: praiseList
        },

        stagedReactiveProtocol: {
          phaseAInitial: String(phaseA),
          phaseBDeescalation: String(phaseB),
          phaseCContinuation: String(phaseC),
          phaseDCrisis: String(phaseD)
        },

        classroomCheatSheet: d.classroomCheatSheet
          ? {
              beforeTransition: String(d.classroomCheatSheet.beforeTransition || ''),
              duringTransition: String(d.classroomCheatSheet.duringTransition || ''),
              onCooperation: String(d.classroomCheatSheet.onCooperation || ''),
              onRefusal: String(d.classroomCheatSheet.onRefusal || ''),
              onCrisis: String(d.classroomCheatSheet.onCrisis || '')
            }
          : undefined
      };
    }
  } catch (err) {
    console.error('[behaviorAiService] suggestInterventionStrategies error:', err);
  }
  return null;
}

