import { toHebrewAcronym, redactStudentNameInText } from './privacyAndAcronyms';
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import type {
  ExecutiveAiPedagogicalDigest,
  StudentExecutiveDigestCard
} from './types';

export interface GenerateExecutiveDigestParams {
  students?: any[];
  accomplishments?: any;
  gaps?: any[];
  privacyMode?: 'full_name' | 'acronym';
}

function sanitizeForPrivacy(
  text: string,
  studentName: string,
  privacyMode: 'full_name' | 'acronym'
): string {
  if (privacyMode === 'acronym') {
    return redactStudentNameInText(text, studentName, true);
  }
  return text;
}

function getDisplayStudentName(
  rawName: string,
  privacyMode: 'full_name' | 'acronym'
): string {
  if (privacyMode === 'acronym') {
    return toHebrewAcronym(rawName || '') || 'תלמיד/ה';
  }
  return rawName || 'תלמיד/ה';
}

/**
 * Robust local fallback synthesizer for executive pedagogical digest.
 * Analyzes positive growth, challenges/difficulties noted in observations,
 * and derives actionable goal refinements.
 */
export function synthesizeLocalExecutiveDigest({
  students = [],
  accomplishments,
  gaps = [],
  privacyMode = 'full_name'
}: GenerateExecutiveDigestParams): ExecutiveAiPedagogicalDigest {
  const recentObs = Array.isArray(accomplishments?.recentObservations)
    ? accomplishments.recentObservations
    : [];
  const completedTasks = Array.isArray(accomplishments?.completedTasks)
    ? accomplishments.completedTasks
    : [];
  const advancedGoals = Array.isArray(accomplishments?.advancedGoals)
    ? accomplishments.advancedGoals
    : [];

  const studentCards: StudentExecutiveDigestCard[] = [];
  const inactiveStudents: Array<{ studentName: string; framework?: string; note: string }> = [];

  // Keywords that identify teacher-noted difficulties / challenges
  const challengeRegex = /(מתקשה|קושי|קשיי|פער|תסכול|התפרצות|חוסר|סירוב|רגרסיה|מורכבות|אי שקט|התנתק)/i;

  const effectiveStudents = students.length > 0
    ? students
    : Array.from(
        new Set([
          ...recentObs.map((o: any) => o.studentName),
          ...advancedGoals.map((g: any) => g.studentName),
          ...completedTasks.map((t: any) => t.studentName)
        ].filter(Boolean))
      ).map((name) => {
        const foundObs = recentObs.find((o: any) => o.studentName === name);
        const foundGoal = advancedGoals.find((g: any) => g.studentName === name);
        return {
          id: `derived_${name}`,
          name,
          educationalFramework: foundObs?.framework || foundGoal?.framework || ''
        };
      });

  for (const st of effectiveStudents) {
    const rawName = st.name || '';
    const displayName = getDisplayStudentName(rawName, privacyMode);
    const framework = st.educationalFramework || '';

    // Find student specific observations, tasks, and advanced goals
    const stObs = recentObs.filter(
      (o: any) => (o.studentId && o.studentId === st.id) || o.studentName === rawName
    );
    const stTasks = completedTasks.filter(
      (t: any) => (t.studentId && t.studentId === st.id) || t.studentName === rawName
    );
    const stAdvGoals = advancedGoals.filter(
      (g: any) => (g.studentId && g.studentId === st.id) || g.studentName === rawName
    );

    const hasActivity = stObs.length > 0 || stTasks.length > 0 || stAdvGoals.length > 0;

    if (!hasActivity) {
      inactiveStudents.push({
        studentName: displayName,
        framework,
        note: 'טרם תועדה התקדמות בתקופה זו – מומלץ לתאם תצפית שטח ראשונית.'
      });
      continue;
    }

    // 1. Accomplishments & Momentum
    const accomplishmentsParts: string[] = [];
    if (stAdvGoals.length > 0) {
      const titles = stAdvGoals.map((g: any) => `"${sanitizeForPrivacy(g.goalTitle, rawName, privacyMode)}" (${g.currentProgress}%)`).join(', ');
      accomplishmentsParts.push(`הושגה התקדמות משמעותית ביעדים: ${titles}.`);
    }
    if (stTasks.length > 0) {
      const taskTexts = stTasks.slice(0, 3).map((t: any) => `"${sanitizeForPrivacy(t.text, rawName, privacyMode)}"`).join(', ');
      accomplishmentsParts.push(`בוצעו בהצלחה משימות ממוקדות: ${taskTexts}.`);
    }
    const positiveObs = stObs.filter((o: any) => !challengeRegex.test(o.note || ''));
    if (positiveObs.length > 0) {
      const bestObs = positiveObs[0];
      const support = bestObs.supportLevel ? ` (רמת תיווך: ${bestObs.supportLevel})` : '';
      accomplishmentsParts.push(`תצפית חיובית בסביבת ${bestObs.environment || 'הגן'}${support}: "${sanitizeForPrivacy(bestObs.note, rawName, privacyMode)}".`);
    }

    if (accomplishmentsParts.length === 0) {
      accomplishmentsParts.push('תועדה מעורבות פעילה במפגשים ובעבודה הפרטנית לאורך התקופה.');
    }

    // 2. Challenges & Emerging Difficulties
    const challengeObs = stObs.filter((o: any) => challengeRegex.test(o.note || ''));
    let challengesAndDifficulties: string | undefined = undefined;
    let recommendedGoalRefinements: string | undefined = undefined;

    if (challengeObs.length > 0) {
      const challengeSummaries = challengeObs.map((o: any) => {
        const supportInfo = o.supportLevel ? ` [רמת תיווך: ${o.supportLevel}]` : '';
        return `בסביבת ${o.environment || 'הפעילות'}${supportInfo}: "${sanitizeForPrivacy(o.note, rawName, privacyMode)}"`;
      });
      challengesAndDifficulties = `אותרו מוקדי קושי הדורשים תשומת לב: ${challengeSummaries.join('; ')}.`;

      // Formulate actionable goal refinements based on observed challenges
      const goalTitles = Array.from(new Set(challengeObs.map((o: any) => o.goalTitle).filter(Boolean)));
      if (goalTitles.length > 0) {
        recommendedGoalRefinements = `לאור הממצאים שעלו ביעד "${sanitizeForPrivacy(String(goalTitles[0]), rawName, privacyMode)}", מומלץ לחדד את המדדים: לבחון פירוק היעד לשלבי ביניים הדרגתיים, להתאים את רמת התיווך (הדגמה וליווי מוחשי), ולתאם תצפית משותפת עם הצוות הפרא-רפואי.`;
      } else {
        recommendedGoalRefinements = 'מומלץ להתאים את רמת התיווך ולבחון התאמת דרכי ההטרמה והתמיכה בישיבת הצוות הקרובה.';
      }
    } else if (stObs.some((o: any) => o.supportLevel === 'הדגמה וליווי מלא')) {
      challengesAndDifficulties = 'התלמיד/ה נדרש/ת עדיין לתיווך אינטנסיבי ולהדגמה צמודה בסביבות הפעילות שנצפו.';
      recommendedGoalRefinements = 'מומלץ לשמר את רמת התיווך הנוכחית ולבנות כרטיסיית ניווט חזותית להגברת העצמאות ההדרגתית.';
    }

    studentCards.push({
      studentId: st.id,
      studentName: displayName,
      framework,
      accomplishments: accomplishmentsParts.join(' '),
      challengesAndDifficulties,
      recommendedGoalRefinements,
      hasActivity: true
    });
  }

  // Strategic priorities for team meetings
  const strategicPriorities: string[] = [];
  if (studentCards.some((c) => c.challengesAndDifficulties)) {
    strategicPriorities.push('ישיבת צוות וחידוד יעדים: תיאום עם הצוות הפרא-רפואי לגבי המוקדים והקשיים שאותרו בתצפיות השבוע.');
  }
  if (advancedGoals.length > 0) {
    strategicPriorities.push('שימור תנופה: שיתוף ההורים בהישגים ביעדים שהגיעו לשליטה גבוהה (70%+).');
  }
  if (inactiveStudents.length > 0) {
    strategicPriorities.push(`סגירת פערים ברציפות: תזמון תצפית מעקב פרטנית עבור ${inactiveStudents.length} תלמידים שטרם עודכנו.`);
  }
  if (Array.isArray(gaps) && gaps.length > 0) {
    strategicPriorities.push(`רציפות פדגוגית: תיאום תצפית מעקב על ${gaps.length} יעדים שממתינים לעדכון מעל 45 יום.`);
  }
  if (strategicPriorities.length === 0) {
    strategicPriorities.push('המשך מעקב סדיר ואיסוף תצפיות ממוקדות לקראת ישיבת המעקב התקופתית.');
  }

  const activeCount = studentCards.length;
  const executiveOverview = activeCount > 0
    ? `בתקופה זו נרשמה עשייה פדגוגית פורייה וממוקדת: תועדה התקדמות פעילה עבור ${activeCount} תלמידים, נרשמו ${recentObs.length} תצפיות אותנטיות מהשטח והושלמו ${completedTasks.length} משימות ממוקדות. המידע שלהלן מרכז את הישגי התנופה, לצד קשיים שעלו מהשטח והמלצות קונקרטיות לחידוד היעדים בישיבות הצוות.`
    : `בתקופה זו כלל תלמידי המעקב ממתינים לתיעוד ראשוני. מומלץ לתזמן תצפיות קצרות במעקב היומי כדי להניע את רציפות התיעוד הפדגוגי לקראת ישיבות הצוות.`;

  return {
    executiveOverview,
    studentCards,
    strategicPriorities,
    inactiveStudents
  };
}

/**
 * Generates an Executive AI Pedagogical Digest.
 * Leverages Gemini AI Proxy when available, and falls back seamlessly to
 * the high-fidelity local pedagogical synthesizer if unavailable or in tests.
 */
export async function generateExecutivePedagogicalDigest({
  students = [],
  accomplishments,
  gaps = [],
  privacyMode = 'full_name'
}: GenerateExecutiveDigestParams): Promise<ExecutiveAiPedagogicalDigest> {
  const localFallback = synthesizeLocalExecutiveDigest({
    students,
    accomplishments,
    gaps,
    privacyMode
  });

  // If no students or no active activity, local fallback is already optimal
  if (students.length === 0) {
    return localFallback;
  }

  try {
    const studentContexts = localFallback.studentCards.map((sc) => {
      return `תלמיד/ה: ${sc.studentName} (${sc.framework || 'מסגרת'})
- עשייה והישגים שנרשמו: ${sc.accomplishments}
- אתגרים וקשיים שנצפו: ${sc.challengesAndDifficulties || 'לא צוינו קשיים חריגים'}
- המלצה ראשונית: ${sc.recommendedGoalRefinements || 'שימור מעקב'}`;
    }).join('\n\n');

    const prompt = `אתה מומחה פדגוגי בכיר ומדריך ארצי לחינוך מיוחד בגישה האקולוגית (מערכת TALA).
עליך לייצר "סיכום מנהלים פדגוגי שבועי/חודשי" מושלם עבור מורה, המוכן להצגה בישיבת צוות ושיח הורים.

להלן נתוני השטח והתצפיות של תלמידי המורה בתקופה זו:
${studentContexts}

הנחיות קריטיות לניסוח:
1. "executiveOverview": פסקת פתיחה מנהלית ומעצימה (2-3 משפטים) המדגישה בגישה חיובית את העשייה והתנופה הפדגוגית של המורה.
2. "studentCards": עבור כל תלמיד ברשימה, הפק אובייקט עם:
   - "studentName": שם התלמיד/ה בדיוק כפי שמופיע בקלט (שמירה קפדנית על פרטיות).
   - "accomplishments": ניסוח פדגוגי מלוטש, מכבד וחיובי של מה שהושג, דרכי תיווך שהוכיחו את עצמן, והתקדמות ביעדים.
   - "challengesAndDifficulties": באם נצפו קשיים/אתגרים (כגון קשיי קשב, שפה, הצפה חושית או התנהגות) – נסח אותם באופן מקצועי ומדויק. אם לא צוינו קשיים, החזר מחרוזת ריקה.
   - "recommendedGoalRefinements": המלצות מעשיות לצוות לחידוד מטרות, פירוק יעדים לשלבים או התאמת רמת התיווך בעקבות הקשיים שעלו.
3. "strategicPriorities": 2-3 נקודות מיקוד אסטרטגיות וקצרות לישיבת הצוות הקרובה.

החזר JSON תקין בלבד במבנה הבא:
{
  "executiveOverview": "...",
  "studentCards": [
    {
      "studentName": "...",
      "accomplishments": "...",
      "challengesAndDifficulties": "...",
      "recommendedGoalRefinements": "..."
    }
  ],
  "strategicPriorities": ["...", "..."]
}`;

    const rawResponse = await callAiProxyEndpoint({
      operation: 'rawPrompt',
      payload: { prompt },
      hints: { model: 'gemini-2.5-flash' }
    });

    if (rawResponse && typeof rawResponse === 'object') {
      const parsed = typeof (rawResponse as any).raw === 'string'
        ? JSON.parse((rawResponse as any).raw)
        : rawResponse;

      if (parsed && parsed.executiveOverview && Array.isArray(parsed.studentCards)) {
        const aiCardMap = new Map<string, any>();
        parsed.studentCards.forEach((c: any) => {
          if (c && c.studentName) aiCardMap.set(c.studentName, c);
        });

        const mergedCards: StudentExecutiveDigestCard[] = localFallback.studentCards.map((localCard) => {
          const aiCard = aiCardMap.get(localCard.studentName);
          if (!aiCard) return localCard;
          return {
            ...localCard,
            accomplishments: aiCard.accomplishments || localCard.accomplishments,
            challengesAndDifficulties: aiCard.challengesAndDifficulties || localCard.challengesAndDifficulties,
            recommendedGoalRefinements: aiCard.recommendedGoalRefinements || localCard.recommendedGoalRefinements
          };
        });

        return {
          executiveOverview: parsed.executiveOverview,
          studentCards: mergedCards,
          strategicPriorities: Array.isArray(parsed.strategicPriorities) && parsed.strategicPriorities.length > 0
            ? parsed.strategicPriorities
            : localFallback.strategicPriorities,
          inactiveStudents: localFallback.inactiveStudents
        };
      }
    }
  } catch (err) {
    console.warn('[generateExecutivePedagogicalDigest] AI synthesis error, using local fallback:', err);
  }

  return localFallback;
}
