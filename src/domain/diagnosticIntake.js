import { adaptTextToGender } from './goalSizingAndMerge';

/**
 * Extracts plain text from an uploaded File (.txt or basic .pdf).
 */
export async function extractTextFromFile(file) {
  if (!file) return '';
  const fileName = (file.name || '').toLowerCase();

  // 1. Text files (.txt, .csv, markdown)
  if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
    return await file.text();
  }

  // 2. PDF text extraction via browser native streams
  if (fileName.endsWith('.pdf')) {
    try {
      const buffer = await file.arrayBuffer();
      const textDecoder = new TextDecoder('latin1');
      const rawStr = textDecoder.decode(buffer);

      // Extract text within BT ... ET blocks
      const btMatches = rawStr.match(/BT[\s\S]*?ET/g) || [];
      const extractedChunks = [];

      for (const block of btMatches) {
        // Match literal strings: (some text) Tj or TJ
        const strMatches = block.match(/\(([^)]+)\)\s*(?:Tj|'|")/g) || [];
        for (const m of strMatches) {
          const inner = m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '');
          if (inner && inner.trim().length > 1) {
            extractedChunks.push(inner.trim());
          }
        }
      }

      if (extractedChunks.length > 5) {
        return extractedChunks.join(' ');
      }
    } catch (e) {
      console.warn('PDF stream extraction fallback:', e);
    }
  }

  return '';
}

/**
 * Builds the structured pedagogical prompt for analyzing psychological/developmental evaluations.
 */
export function buildDiagnosticPrompt({
  diagnosticText = '',
  gender = 'boy',
  studentName = '',
  planType = 'תל"א'
}) {
  const isGirl = gender === 'girl';
  const genderInstruction = isGirl
    ? 'נסח הכל בלשון נקבה בלבד (התלמידה, מזהה, מתמידה, מתקשה).'
    : 'נסח הכל בלשון זכר בלבד (התלמיד, מזהה, מתמיד, מתקשה).';

  return `אתה מומחה בכיר לאבחון פדגוגי ופסיכודידקטי בחינוך המיוחד בישראל.
לפניך קטעים מתוך דו"ח אבחון פסיכודידקטי / התפתחותי / סיכום ועדת זכאות ואפיון של ${isGirl ? 'תלמידה' : 'תלמיד'}.
שם: ${studentName || (isGirl ? 'התלמידה' : 'התלמיד')}.
סוג תוכנית: ${planType}.
הנחיית מגדר: ${genderInstruction}

טקסט האבחון:
"""
${diagnosticText.slice(0, 10000)}
"""

עליך לנתח את האבחון ולחלץ ממנו סיכום מקצועי ומטרות אופרטיביות לתוכנית העבודה.
החזר אך ורק אובייקט JSON תקין במבנה הבא (ללא טקסט מקדים וללא תגי markdown):
{
  "studentGeneralBackground": "רקע משפחתי, התפתחותי וקליני תמציתי ומכבד (2-4 משפטים)",
  "studentSupportReceived": "מענים, טיפולים ותמיכות שהומלצו או ניתנו (כגון שילוב, קלינאית תקשורת, ריפוי בעיסוק, טיפול רגשי)",
  "studentMainGoal": "מטרה מרכזית כוללת של התלמיד/ה לשנה זו מתוך האבחון",
  "strengthsExisting": "מוקדי כוח, יכולות בולטות, תחומי עניין וגורמים מסייעים",
  "strengthsToEmpower": "מוקדים לחיזוק, חסמים ואתגרים עיקריים",
  "recommendations": "המלצות יישומיות לצוות החינוכי ולהתאמות דרכי הוראה והיבחנות",
  "suggestedGoals": [
    {
      "environment": "סביבה מתוך: כיתה ולימודים / חצר והפסקות / ארוחה ומפגש / שפה ואוריינות / מרחב חברתי",
      "title": "ניסוח מטרה עליונה בהירה (מה אנחנו רוצים שיקרה)",
      "objectives": "• יעד אופרטיבי ראשון\\n• יעד אופרטיבי שני",
      "opportunities": "אמצעים ודרכי פעולה של הצוות להשגת המטרה",
      "duration": "3 חודשים",
      "evaluationCriteria": "אמות מידה ומדד להצלחה",
      "leadProfessional": "אחד מתוך: מחנכת הכיתה / מורת שילוב / קלינאית תקשורת / ריפוי בעיסוק / טיפול רגשי / אמנויות / צוות משותף"
    }
  ]
}`;
}

/**
 * Sanitizes and normalizes the parsed diagnostic intake response.
 */
export function sanitizeDiagnosticIntakeResult(rawResult = {}, gender = 'boy') {
  const g = (txt) => adaptTextToGender(String(txt || '').trim(), gender);

  const rawGoals = Array.isArray(rawResult.suggestedGoals) ? rawResult.suggestedGoals : [];
  const suggestedGoals = rawGoals.map((gObj, idx) => ({
    id: `intake_g_${Date.now()}_${idx}`,
    environment: g(gObj.environment) || 'כיתה ולימודים',
    title: g(gObj.title) || '',
    objectives: g(gObj.objectives) || '',
    opportunities: g(gObj.opportunities) || '',
    duration: g(gObj.duration) || '3 חודשים',
    evaluationCriteria: g(gObj.evaluationCriteria) || '',
    leadProfessional: gObj.leadProfessional || 'צוות משותף',
    isTeacherAdded: true
  }));

  return {
    studentGeneralBackground: g(rawResult.studentGeneralBackground),
    studentSupportReceived: g(rawResult.studentSupportReceived),
    studentMainGoal: g(rawResult.studentMainGoal),
    strengthsExisting: g(rawResult.strengthsExisting),
    strengthsToEmpower: g(rawResult.strengthsToEmpower),
    recommendations: g(rawResult.recommendations),
    suggestedGoals
  };
}

/**
 * Merges the approved diagnostic intake data into the existing student formData.
 */
export function applyDiagnosticIntakeToStudent(
  formData = {},
  intake = {},
  selectedGoalIds = []
) {
  const approvedGoals = (intake.suggestedGoals || []).filter((g) =>
    selectedGoalIds.includes(g.id)
  );

  const nextGoals = [...(formData.goals || []), ...approvedGoals];

  const mergeText = (cur, add) => {
    const c = String(cur || '').trim();
    const a = String(add || '').trim();
    if (!a) return c;
    if (!c) return a;
    if (c.includes(a)) return c;
    return `${c}\n\n${a}`;
  };

  return {
    ...formData,
    studentGeneralBackground: mergeText(
      formData.studentGeneralBackground,
      intake.studentGeneralBackground
    ),
    studentSupportReceived: mergeText(
      formData.studentSupportReceived,
      intake.studentSupportReceived
    ),
    studentMainGoal: formData.studentMainGoal || intake.studentMainGoal || '',
    strengthsExisting: mergeText(formData.strengthsExisting, intake.strengthsExisting),
    strengthsToEmpower: mergeText(formData.strengthsToEmpower, intake.strengthsToEmpower),
    recommendations: mergeText(formData.recommendations, intake.recommendations),
    goals: nextGoals,
    lastSavedAt: new Date().toISOString()
  };
}
