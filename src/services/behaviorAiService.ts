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
  replacementSkill?: string;
  teachingStrategies?: string;
  antecedentStrategies?: string;
  preferredReinforcers?: string;
  scheduleOfReinforcement?: string;
  staffResponse?: string;
  crisisSafetyPlan?: string;
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
 * Suggests intervention strategies (replacement skill, accommodations, reinforcement, reactive plan).
 */
export async function suggestInterventionStrategies(
  targetBehaviorName: string,
  functionLabel: string,
  student: StudentBehaviorAiContext = {}
): Promise<GeneratedInterventionStrategies | null> {
  const prompt = `
אתה מנתח התנהגות מוסמך בחינוך המיוחד.
על בסיס התנהגות היעד והתפקיד שלה:
התנהגות להפחתה: ${targetBehaviorName || 'עזיבת מקום או הימנעות'}
תפקיד ההתנהגות: ${functionLabel || 'הימנעות ממטלה'}

הצע תוכנית התערבות מעשית בעברית מקצועית. החזר אך ורק אובייקט JSON תקני במבנה הבא (ללא אנגלית בסוגריים):
{
  "replacementSkill": "התנהגות חלופית תואמת תפקפוד להוראה (למשל: שימוש בכרטיסיית הפסקה או פנייה מילולית)",
  "teachingStrategies": "שיטות ושלבים להוראת ההתנהגות החלופית ותרגולה",
  "antecedentStrategies": "התאמות סביבתיות ופדגוגיות למניעת הטריגר מראש",
  "preferredReinforcers": "הצעות לחיזוקים חיוביים בעלי ערך מניע",
  "scheduleOfReinforcement": "לוח זמנים מומלץ למתן החיזוק",
  "staffResponse": "פרוטוקול תגובה אחיד לצוות בעת התרחשות התנהגות היעד כדי לא לחזק אותה",
  "crisisSafetyPlan": "הנחיות בטיחות והרגעה במידת הצורך"
}
`;

  try {
    const result = await callAiJson(prompt, student as StudentAiContext);
    if (result && typeof result === 'object') {
      const d = result as Record<string, unknown>;
      return {
        replacementSkill: typeof d.replacementSkill === 'string' ? d.replacementSkill : '',
        teachingStrategies: typeof d.teachingStrategies === 'string' ? d.teachingStrategies : '',
        antecedentStrategies: typeof d.antecedentStrategies === 'string' ? d.antecedentStrategies : '',
        preferredReinforcers: typeof d.preferredReinforcers === 'string' ? d.preferredReinforcers : '',
        scheduleOfReinforcement:
          typeof d.scheduleOfReinforcement === 'string' ? d.scheduleOfReinforcement : '',
        staffResponse: typeof d.staffResponse === 'string' ? d.staffResponse : '',
        crisisSafetyPlan: typeof d.crisisSafetyPlan === 'string' ? d.crisisSafetyPlan : ''
      };
    }
  } catch (err) {
    console.error('[behaviorAiService] suggestInterventionStrategies error:', err);
  }
  return null;
}

