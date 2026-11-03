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

// Keywords that identify teacher-noted difficulties / challenges
const challengeRegex = /(מתקשה|קושי|קשיי|פער|תסכול|התפרצות|חוסר|סירוב|רגרסיה|מורכבות|אי שקט|התנתק|שליפת מילים|ארגון משפט)/i;

/**
 * Synthesizes and summarizes root challenges observed during tracking.
 */
function synthesizeChallengesFromObs(
  challengeObs: any[]
): string {
  if (!challengeObs || challengeObs.length === 0) return '';

  const notesText = challengeObs.map((o) => o.note || '').join(' ');
  const environments = Array.from(new Set(challengeObs.map((o) => o.environment).filter(Boolean)));
  const supportLevels = Array.from(new Set(challengeObs.map((o) => o.supportLevel).filter(Boolean)));

  const domains: string[] = [];
  if (/(שליפ|משפט|שפה|מילים|תחביר|אוצר מילים|שיום)/i.test(notesText)) {
    domains.push('שליפת מילים, ארגון מבנה המשפט והבעה מילולית רציפה');
  }
  if (/(קשב|התנתק|ריכוז|מוסחות|אי שקט)/i.test(notesText)) {
    domains.push('שימור קשב והתנתקויות במהלך פעילויות ממושכות');
  }
  if (/(תסכול|סירוב|התפרצות|גבול|איפוק|התנגדות)/i.test(notesText)) {
    domains.push('וויסות רגשי וסף תסכול בעת התמודדות עם אתגר או מעברים');
  }
  if (/(מוטורי|אחיז|גזיר|כתיב|מרחב)/i.test(notesText)) {
    domains.push('התארגנות מוטורית / גרפו-מוטורית ועבודה במרחב השולחן');
  }
  if (/(חבר|משחק משותף|תור|שיתוף)/i.test(notesText)) {
    domains.push('השתלבות במשחק הדדי ושמירה על חוקי משחק והמתנה לתור');
  }

  const domainSummary = domains.length > 0
    ? domains.join(', לצד ')
    : 'מוקדי קושי ממוקדים שנרשמו בתצפיות';

  const envStr = environments.length > 0 ? ` (נצפה בסביבת ${environments.join(', ')})` : '';
  const supStr = supportLevels.length > 0 ? ` [רמת תיווך: ${supportLevels.join(', ')}]` : '';

  return `תכלול מוקדי האתגר והקושי: ${domainSummary}${envStr}${supStr}.`;
}

/**
 * Generates concrete, creative, applied, field-focused goal refinements.
 * Strictly avoids vague clichés (e.g. "המורה תתווך", "המורה תציב גבולות").
 */
function buildActionableGoalRefinement(
  challengeObs: any[],
  rawName: string,
  privacyMode: 'full_name' | 'acronym'
): string {
  const notesText = challengeObs.map((o) => o.note || '').join(' ');
  const goalTitles = Array.from(new Set(challengeObs.map((o) => o.goalTitle).filter(Boolean)));
  const primaryGoal = goalTitles.length > 0
    ? `ליעד "${sanitizeForPrivacy(String(goalTitles[0]), rawName, privacyMode)}"`
    : 'ליעד הנצפה';

  if (/(שליפ|משפט|שפה|מילים|תחביר|אוצר מילים|שיום)/i.test(notesText)) {
    return `המלצה יישומית וממוקדת שטח ${primaryGoal}:
1. שילוב משחקי 'שליפה מהירה' ולוטו קטגוריות בליווי רמזים פונולוגיים (צליל פותח) ורמזים סמנטיים כחימום מקדים למפגש.
2. שימוש ב'כרטיסיית עוגן חזותית' עם סמלים ברורים (מי? מה עושה? איפה?) להבניית משפט מורכב.
3. הטמעת שגרת 'מילת השבוע' דרך משחק תפקידים והמחשה מוחשית במשחקי שולחן.`;
  }

  if (/(קשב|התנתק|ריכוז|מוסחות|אי שקט)/i.test(notesText)) {
    return `המלצה יישומית וממוקדת שטח ${primaryGoal}:
1. המחשת משך הפעילות באמצעות שעון חול או טיימר ויזואלי לצמצום עמימות וחרדת ביצוע.
2. פירוק המשימה ל-2 מקטעים קצרים (עד 7 דקות) בליווי 'כרטיסיית שלבים' לסימון V מוחשי.
3. שילוב הפוגה תנועתית מובנית (מתיחות או עמדת כדור פיזיו) לפני מעבר לפעילות שפתית מאתגרת.`;
  }

  if (/(תסכול|סירוב|התפרצות|גבול|איפוק|התנגדות)/i.test(notesText)) {
    return `המלצה יישומית וממוקדת שטח ${primaryGoal}:
1. הצבת 'מד-חום רגשות' חזותי בעמדת הלמידה לזיהוי מוקדם של הצפה, תוך מתן בחירה מוגדרת בין 2 חלופות מובנות.
2. הגדרת שגרת 'פינת רוגע' עם כרית כובד ואוזניות מפחיתות רעש כהטרמה לפני מעברים מורכבים.
3. תרגול נשימות מונחה בעזרת המחשת 'נשיפת בועות סבון' או 'הדלקת נר' להרגעה עצמית.`;
  }

  if (/(מוטורי|אחיז|גזיר|כתיב|מרחב)/i.test(notesText)) {
    return `המלצה יישומית וממוקדת שטח ${primaryGoal}:
1. עבודה על משטח אנכי (לוח מחיק/קיר) לחיזוק חגורת הכתפיים וייצוב שורש כף היד לפני פעילות שולחן.
2. שימוש במעבי עפרונות ארגונומיים ומספריים קפיציות, תוך גזירה מונחית של פסי בצק טיפולי.
3. שגרת חימום של 3 דקות בעזרת מלקחיים קטנות לשליית חרוזים לפני כתיבה.`;
  }

  return `המלצה יישומית וממוקדת שטח ${primaryGoal}:
1. בניית כרטיסיית רצף חזותית בת 3 שלבים עם אייקונים ברורים להסרת עמימות.
2. הדגמה מוחשית מקדימה (Modeling) ומשחק תפקידים משותף לפני דרישת ביצוע עצמאי.
3. שימוש בלוח צבירת כוכבים להמחשת ההתקדמות בסיום כל מקטע פעילות.`;
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

  const effectiveStudents = students.length > 0
    ? students
    : Array.from(
        new Set([
          ...recentObs.map((o: any) => o.studentName),
          ...advancedGoals.map((g: any) => g.studentName),
          ...completedTasks.map((t: any) => t.studentName),
          ...gaps.map((g: any) => g.studentName)
        ].filter(Boolean))
      ).map((name) => {
        const foundObs = recentObs.find((o: any) => o.studentName === name);
        const foundGoal = advancedGoals.find((g: any) => g.studentName === name);
        const foundGap = gaps.find((g: any) => g.studentName === name);
        return {
          id: `derived_${name}`,
          name,
          educationalFramework: foundObs?.framework || foundGoal?.framework || foundGap?.framework || ''
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
        note: 'טרם תועדה התקדמות בתקופה זו (לא נרשמו תצפיות שטח או משימות).'
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
      const taskTexts = stTasks.slice(0, 3).map((t: any) => `"${sanitizeForPrivacy(t.text, rawName, privacyMode)}"${t.isAiGenerated ? ' (מיקוד AI)' : ''}`).join(', ');
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

    // 2. Challenges & Emerging Difficulties (Focused, Synthesized, and Summarized)
    const challengeObs = stObs.filter((o: any) => challengeRegex.test(o.note || ''));
    let challengesAndDifficulties: string | undefined = undefined;
    let recommendedGoalRefinements: string | undefined = undefined;

    if (challengeObs.length > 0) {
      challengesAndDifficulties = synthesizeChallengesFromObs(challengeObs);
      recommendedGoalRefinements = buildActionableGoalRefinement(challengeObs, rawName, privacyMode);
    } else if (stObs.some((o: any) => o.supportLevel === 'הדגמה וליווי מלא')) {
      const fullSupportObs = stObs.filter((o: any) => o.supportLevel === 'הדגמה וליווי מלא');
      challengesAndDifficulties = 'התלמיד/ה נדרש/ת עדיין לתיווך אינטנסיבי ולהדגמה צמודה בסביבות הפעילות שנצפו.';
      recommendedGoalRefinements = buildActionableGoalRefinement(fullSupportObs, rawName, privacyMode);
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

  // Strategic priorities for team meetings / parent updates (CONDITIONAL ONLY)
  const strategicPriorities: string[] = [];
  const cardsWithChallenges = studentCards.filter((c) => Boolean(c.challengesAndDifficulties));
  const hasHighMomentum = advancedGoals.some((g: any) => (g.currentProgress ?? 0) >= 70);

  if (cardsWithChallenges.length > 0) {
    const studentNames = cardsWithChallenges.slice(0, 2).map((c) => c.studentName).join(', ');
    strategicPriorities.push(`ישיבת צוות רב-מקצועית: הצגת מוקדי האתגר שעלו בתצפיות (${studentNames}) ותיאום דרכי התערבות ומשחקי תיווך מותאמים עם הצוות הפרא-רפואי.`);
  }
  if (hasHighMomentum) {
    strategicPriorities.push('שיתוף הורים וחיזוק תנופה: שיתוף ההורים בהישגים המשמעותיים וביסוס היעדים שחצו 70% שליטה.');
  }

  const activeCount = studentCards.length;
  const executiveOverview = activeCount > 0
    ? `בתקופה זו נרשמה עשייה פדגוגית פורייה וממוקדת: תועדה התקדמות פעילה עבור ${activeCount} תלמידים, נרשמו ${recentObs.length} תצפיות אותנטיות מהשטח והושלמו ${completedTasks.length} משימות ממוקדות. המידע שלהלן מרכז את הישגי התנופה, לצד תכלול קשיים שעלו מהשטח והמלצות קונקרטיות ויישומיות לחידוד היעדים בישיבות הצוות.`
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
  if (localFallback.studentCards.length === 0) {
    return localFallback;
  }

  try {
    const studentContexts = localFallback.studentCards.map((sc) => {
      return `תלמיד/ה: ${sc.studentName} (${sc.framework || 'מסגרת'})
- עשייה והישגים שנרשמו: ${sc.accomplishments}
- אתגרים וקשיים שנצפו: ${sc.challengesAndDifficulties || 'לא צוינו קשיים חריגים'}
- המלצה יישומית ראשונית: ${sc.recommendedGoalRefinements || 'שימור מעקב'}`;
    }).join('\n\n');

    const prompt = `אתה מומחה פדגוגי בכיר ומדריך ארצי לחינוך מיוחד בגישה האקולוגית (מערכת TALA).
עליך לייצר "סיכום פדגוגי שבועי/חודשי" מושלם עבור מורה, המוכן להצגה בישיבת צוות ושיח הורים.

להלן נתוני השטח והתצפיות של תלמידי המורה בתקופה זו:
${studentContexts}

הנחיות קריטיות לניסוח:
1. "executiveOverview": פסקת פתיחה פדגוגית ומעצימה (2-3 משפטים) המדגישה בגישה חיובית את העשייה והתנופה הפדגוגית של המורה. ללא כותרות באנגלית.
2. "studentCards": עבור כל תלמיד ברשימה שבוצעה לגביו פעילות:
   - "studentName": שם התלמיד/ה בדיוק כפי שמופיע בקלט (שמירה קפדנית על פרטיות).
   - "accomplishments": ניסוח פדגוגי מלוטש, מכבד וחיובי של מה שהושג, דרכי תיווך שהוכיחו את עצמן, והתקדמות ביעדים.
   - "challengesAndDifficulties": תכלל, מקד וסכם את האתגרים, הקשיים וההתנהגויות שעלו מהתצפיות (ולא רק ציטוט טכני). הגדר את שורש הקושי הפדגוגי/התפתחותי (שפתי, קשבי, רגשי, מוטורי וכו'). אם לא נצפו קשיים, החזר מחרוזת ריקה "".
   - "recommendedGoalRefinements": המלצות יישומיות, מקצועיות, יצירתיות וממוקדות שטח בלבד!
     איסור מוחלט על שימוש בניסוחים כלליים וקלישאות כגון: "המורה תציב גבולות", "המורה תתווך", "המורה תחזק התנהגות חיובית", "יינתן מענה רגשי", או "יתקיים תרגול"!
     פרט כיצד איש החינוך יפעל בפועל כדי לקדם את היעד: תאר פעולות קונקרטיות, טכניקות הוראה, אסטרטגיות התערבות, משחקים מוגדרים, אביזרים (לוח תקשורת, שעון חול, כרטיסיות רצף, חפצי מעבר), המחשות חזותיות, תרגילים או שגרות עבודה שניתן ליישם עם הילד.
3. "strategicPriorities": נקודות מפתח להצגה בישיבת צוות / שיתוף הורים - הוסף חלק זה אך ורק אם נמצא רלוונטי בהתאם להתקדמות ולנושאים שעלו בהקשר התלמידים (למשל תיאום עם צוות פרא-רפואי בעקבות קושי שעלה, או שיתוף הורים בהצלחה יוצאת דופן). אם אין נושאים מיוחדים המחייבים דיון, החזר מערך ריק [].

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
  "strategicPriorities": ["..."]
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
          strategicPriorities: Array.isArray(parsed.strategicPriorities)
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
