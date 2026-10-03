import {
  adaptTextToGender,
  resolveStudentAgeAndDateInfo,
  isGoalEmpty
} from './goalSizingAndMerge';

// === מבנה קבוע של 15 סעיפי דו"ח מצב תפקודי-חינוכי ===
export const STATUS_REPORT_SECTIONS_SCHEMA = [
  { sectionNumber: 1, title: 'פרטים מזהים ורקע כללי' },
  { sectionNumber: 2, title: 'רקע התפתחותי ואבחוני רלוונטי' },
  { sectionNumber: 3, title: 'תיאור תפקוד כללי במסגרת' },
  { sectionNumber: 4, title: 'תחום לימודי / קוגניטיבי' },
  { sectionNumber: 5, title: 'תחום שפתי ותקשורתי' },
  { sectionNumber: 6, title: 'תחום חברתי' },
  { sectionNumber: 7, title: 'תחום רגשי והתנהגותי' },
  { sectionNumber: 8, title: 'תפקודי עצמאות והתארגנות' },
  { sectionNumber: 9, title: 'חוזקות ותחומי עניין' },
  { sectionNumber: 10, title: 'מענים והתערבויות שניתנו' },
  { sectionNumber: 11, title: 'התקדמות בעקבות ההתערבות' },
  { sectionNumber: 12, title: 'רמת התמיכה הנדרשת כיום' },
  { sectionNumber: 13, title: 'השפעת הקשיים על ההשתתפות והתפקוד' },
  { sectionNumber: 14, title: 'מטרות להמשך' },
  { sectionNumber: 15, title: 'סיכום והמלצות מקצועיות' }
];

const FORBIDDEN_MISSING_INFO_REGEX =
  /^(לא ידוע|לא קיים מידע|לא נמסר|אין מידע|לא צוין מידע|לא דווח)\.?$/;

export function sanitizeStatusReportSections(rawSections = [], gender = 'boy') {
  if (!Array.isArray(rawSections)) return [];
  const validByNum = new Map(
    STATUS_REPORT_SECTIONS_SCHEMA.map((s) => [s.sectionNumber, s.title])
  );

  const cleaned = [];
  rawSections.forEach((sec, idx) => {
    if (!sec) return;
    const num = Number(sec.sectionNumber) || idx + 1;
    const canonicalTitle = validByNum.get(num) || (sec.title || '').replace(/^\d+\.\s*/, '').trim();
    if (!canonicalTitle) return;

    // הסרת משפטים של "לא ידוע" / "לא קיים מידע" / "לא נמסר" אם נפלטו בטעות
    const lines = String(sec.content || '')
      .split('\n')
      .map((l) =>
        l
          .replace(/(?:לא ידוע|לא קיים מידע|לא נמסר מידע|לא נמסר|אין מידע על כך)[^.\n]*\.?/g, '')
          .trim()
      )
      .filter((l) => l && !FORBIDDEN_MISSING_INFO_REGEX.test(l));

    const content = adaptTextToGender(lines.join('\n').trim(), gender);
    if (!content || content.length < 6) return;

    cleaned.push({
      id: sec.id || `status_sec_${num}`,
      sectionNumber: num,
      title: canonicalTitle,
      content
    });
  });

  return cleaned.sort((a, b) => a.sectionNumber - b.sectionNumber);
}

// === מחולל דו"ח מצב עדכני ומקצועי המבוסס אך ורק על המידע הקיים בכרטיס התלמיד, במטרות ובהערכת מחצית/סוף שנה ===
export function generateStatusReportLocally(formData) {
  if (!formData) return [];

  const gender = formData.gender || 'boy';
  const isGirl = gender === 'girl';
  const studentName =
    formData.name && formData.name !== 'תלמיד/ה חדש/ה'
      ? formData.name.trim()
      : isGirl
      ? 'התלמידה'
      : 'התלמיד';

  const freeText = (formData.teacherFreeText || '').trim();
  const strengthsExisting = (formData.strengthsExisting || '').trim();
  const strengthsToEmpower = (formData.strengthsToEmpower || '').trim();
  const recommendations = (formData.recommendations || '').trim();
  const evalFreeText = (formData.evalReportFreeText || '').trim();
  const evalSummary = (formData.evalReportSummary || '').trim();
  const validGoals = (formData.goals || []).filter((g) => !isGoalEmpty(g));

  const hasEvalData = Boolean(
    evalFreeText ||
      evalSummary ||
      validGoals.some(
        (g) =>
          (g.achievementStatus && g.achievementStatus.trim()) ||
          (g.midYearEvaluation && g.midYearEvaluation.trim()) ||
          (g.endYearEvaluation && g.endYearEvaluation.trim())
      )
  );

  const dateInfo = resolveStudentAgeAndDateInfo(formData, freeText);

  const extractMatchingSentences = (regex) => {
    const sentences = [
      ...freeText.split(/(?:[\.\!\?\n]+|\s+-\s+)/),
      ...evalFreeText.split(/(?:[\.\!\?\n]+|\s+-\s+)/),
      ...evalSummary.split(/(?:[\.\!\?\n]+|\s+-\s+)/),
      ...validGoals.map((g) => g.activityParticipation || ''),
      ...validGoals.map((g) => g.endYearEvaluation || g.midYearEvaluation || '')
    ]
      .map((s) => s.replace(/^[•\-\*\s]+/, '').trim())
      .filter((s) => s.length >= 6 && regex.test(s));

    const unique = [];
    sentences.forEach((s) => {
      if (!unique.some((u) => u.includes(s) || s.includes(u))) {
        unique.push(s.replace(/\.$/, ''));
      }
    });
    return unique;
  };

  const sections = [];

  // 1. פרטים מזהים ורקע כללי
  const idParts = [];
  if (formData.name && formData.name !== 'תלמיד/ה חדש/ה') {
    idParts.push(`${studentName}`);
  }
  if (formData.birthDate || dateInfo.ageYears !== null) {
    const ageLabel =
      dateInfo.ageYears !== null
        ? isGirl
          ? `בת כ-${dateInfo.ageYears}`
          : `בן כ-${dateInfo.ageYears}`
        : '';
    const birthLabel = formData.birthDate ? `תאריך לידה: ${formData.birthDate}` : '';
    idParts.push([ageLabel, birthLabel].filter(Boolean).join(' (') + (birthLabel && ageLabel ? ')' : ''));
  }
  if (formData.educationalFramework) {
    idParts.push(
      isGirl
        ? `לומדת במסגרת "${formData.educationalFramework}"`
        : `לומד במסגרת "${formData.educationalFramework}"`
    );
  }
  if (formData.schoolYear) {
    idParts.push(`בשנת הלימודים ${formData.schoolYear}`);
  }
  if (formData.planType) {
    idParts.push(`ומלווה במסגרת ${formData.planType}`);
  }
  if (idParts.length > 0) {
    sections.push({
      sectionNumber: 1,
      title: 'פרטים מזהים ורקע כללי',
      content: `${idParts.join(', ')}.`
    });
  }

  // 2. רקע התפתחותי ואבחוני רלוונטי (רק אם מופיע במפורש בטקסט הקיים)
  const diagSentences = extractMatchingSentences(
    /(אבחון|אובחן|אובחנה|טיפול|ריפוי בעיסוק|קלינאי|קלינאית תקשורת|פיזיותרפ|רגשי|רפואי|שמיעה|ראייה|מוטורי|תחושתי|וויסות חושי)/
  );
  const therapyPartners = validGoals
    .map((g) => g.partners || '')
    .join(' ')
    .match(/(מרפאה בעיסוק|קלינאית תקשורת|מטפל[^\s,]*|פסיכולוג[^\s,]*|פיזיותרפ[^\s,]*)/g);
  if (diagSentences.length > 0 || (therapyPartners && therapyPartners.length > 0)) {
    const uniquePartners = therapyPartners ? [...new Set(therapyPartners)] : [];
    const parts = [];
    if (diagSentences.length > 0) {
      parts.push(`${diagSentences.slice(0, 3).join('. ')}.`);
    }
    if (uniquePartners.length > 0) {
      parts.push(
        `במסגרת התוכנית מתקיים שיתוף פעולה מקצועי עם גורמי הטיפול והמקצוע המעורבים: ${uniquePartners.join(', ')}.`
      );
    }
    sections.push({
      sectionNumber: 2,
      title: 'רקע התפתחותי ואבחוני רלוונטי',
      content: parts.join(' ')
    });
  }

  // 3. תיאור תפקוד כללי במסגרת
  const generalSentences = [];
  if (evalSummary) {
    generalSentences.push(evalSummary.replace(/\.$/, '') + '.');
  }
  const routineActivities = validGoals
    .filter((g) => (g.activityParticipation || '').trim())
    .map((g) => `בסביבת "${g.environment}": ${(g.activityParticipation || '').trim().replace(/\.$/, '')}`);
  if (routineActivities.length > 0) {
    generalSentences.push(routineActivities.slice(0, 3).join('. ') + '.');
  } else if (freeText) {
    generalSentences.push(freeText.replace(/\.$/, '') + '.');
  }
  if (generalSentences.length > 0) {
    sections.push({
      sectionNumber: 3,
      title: 'תיאור תפקוד כללי במסגרת',
      content: generalSentences.join('\n')
    });
  }

  // 4. תחום לימודי / קוגניטיבי
  const cognitiveSentences = extractMatchingSentences(
    /(קוגניטיב|למידה|לימוד|קשב|ריכוז|התמדה|הוראות|זיכרון|קריאה|כתיבה|חשבון|מספרים|אותיות|פאזל|הרכבה|משחקי שולחן|משחקי קופסא|סקרן|סקרנית|תפיסה)/
  );
  const cognitiveGoals = validGoals.filter((g) =>
    /(מפגש|שולחן|בנייה|הרכבה|דיגיטלי|סדנא|יצירה|קוגניטיב|למידה)/.test(
      `${g.environment || ''} ${g.title || ''}`
    )
  );
  if (cognitiveSentences.length > 0 || cognitiveGoals.length > 0) {
    const parts = [];
    if (cognitiveSentences.length > 0) {
      parts.push(`${cognitiveSentences.slice(0, 3).join('. ')}.`);
    }
    cognitiveGoals.forEach((g) => {
      const latestEval = (g.endYearEvaluation || g.midYearEvaluation || '').trim();
      const act = (g.activityParticipation || '').trim();
      if (latestEval) {
        parts.push(`בסביבת "${g.environment}" – ${latestEval.replace(/\.$/, '')}.`);
      } else if (act && !parts.some((p) => p.includes(act))) {
        parts.push(`בסביבת "${g.environment}" – ${act.replace(/\.$/, '')}.`);
      }
    });
    if (parts.length > 0) {
      sections.push({
        sectionNumber: 4,
        title: 'תחום לימודי / קוגניטיבי',
        content: parts.join(' ')
      });
    }
  }

  // 5. תחום שפתי ותקשורתי
  const langSentences = extractMatchingSentences(
    /(שפה|שפתי|תקשורת|שיח|וורבלי|ורבלי|דיבור|אוצר מילים|הבעה|הבנה|משפט|מילים|לשתף במפגש|שיחה|בקשת עזרה)/
  );
  if (langSentences.length > 0) {
    sections.push({
      sectionNumber: 5,
      title: 'תחום שפתי ותקשורתי',
      content: `${langSentences.slice(0, 3).join('. ')}.`
    });
  }

  // 6. תחום חברתי
  const socialSentences = extractMatchingSentences(
    /(חבר|חברת|משחק משותף|אינטראקציה|קבוצה|תור|המתנה לתור|שיתוף פעולה|קונפליקט|יוזמה חברתית|מעגל חברתי|חצר)/
  );
  const socialGoals = validGoals.filter((g) =>
    /(חבר|משחק משותף|חצר|קבוצ)/.test(`${g.environment || ''} ${g.title || ''} ${g.objectives || ''}`)
  );
  if (socialSentences.length > 0 || socialGoals.length > 0) {
    const parts = [];
    if (socialSentences.length > 0) {
      parts.push(`${socialSentences.slice(0, 3).join('. ')}.`);
    }
    socialGoals.forEach((g) => {
      const latestEval = (g.endYearEvaluation || g.midYearEvaluation || '').trim();
      if (latestEval && !parts.some((p) => p.includes(latestEval))) {
        parts.push(latestEval.replace(/\.$/, '') + '.');
      }
    });
    if (parts.length > 0) {
      sections.push({
        sectionNumber: 6,
        title: 'תחום חברתי',
        content: parts.join(' ')
      });
    }
  }

  // 7. תחום רגשי והתנהגותי
  const emotionalSentences = extractMatchingSentences(
    /(רגש|וויסות|ויסות|תסכול|גמישות|שינוי|מעבר|התנהגות|אימפולסיב|התפרצ|בכי|כעס|ביטחון עצמי|דימוי עצמי|הרגעה)/
  );
  if (emotionalSentences.length > 0) {
    sections.push({
      sectionNumber: 7,
      title: 'תחום רגשי והתנהגותי',
      content: `${emotionalSentences.slice(0, 3).join('. ')}.`
    });
  }

  // 8. תפקודי עצמאות והתארגנות
  const independenceSentences = extractMatchingSentences(
    /(עצמא|התארגנ|מעברים|ארוחה|אכילה|אוכל|שירותים|גמילה|ניקיון|היגיינה|ציוד|חפצים|סדר יום|שגרה)/
  );
  if (independenceSentences.length > 0) {
    sections.push({
      sectionNumber: 8,
      title: 'תפקודי עצמאות והתארגנות',
      content: `${independenceSentences.slice(0, 3).join('. ')}.`
    });
  }

  // 9. חוזקות ותחומי עניין
  const strengthsParts = [];
  if (strengthsExisting) {
    const cleanedExisting = strengthsExisting
      .split('\n')
      .map((l) => l.replace(/^[•\-\*\s]+/, '').trim())
      .filter(Boolean)
      .join('; ');
    if (cleanedExisting) {
      strengthsParts.push(`מוקדי כוח ויכולות בולטות: ${cleanedExisting}.`);
    }
  }
  if (strengthsToEmpower) {
    const cleanedEmpower = strengthsToEmpower
      .split('\n')
      .map((l) => l.replace(/^[•\-\*\s]+/, '').trim())
      .filter(Boolean)
      .join('; ');
    if (cleanedEmpower) {
      strengthsParts.push(`תחומי עניין וכוחות להעצמה: ${cleanedEmpower}.`);
    }
  }
  if (strengthsParts.length > 0) {
    sections.push({
      sectionNumber: 9,
      title: 'חוזקות ותחומי עניין',
      content: strengthsParts.join('\n')
    });
  }

  // 10. מענים והתערבויות שניתנו
  const interventions = validGoals
    .filter((g) => (g.opportunities || '').trim())
    .map((g) => {
      const oppClean = (g.opportunities || '')
        .split('\n')
        .map((l) => l.replace(/^[•\-\*\s]+/, '').trim())
        .filter(Boolean)
        .join(', ');
      const partnersInfo = (g.partners || '').trim() ? ` (בשיתוף: ${g.partners.trim()})` : '';
      const durationInfo = (g.duration || '').trim() ? ` [טווח/משך: ${g.duration.trim()}]` : '';
      return `בסביבת "${g.environment}": ${oppClean}${partnersInfo}${durationInfo}`;
    });
  if (interventions.length > 0) {
    sections.push({
      sectionNumber: 10,
      title: 'מענים והתערבויות שניתנו',
      content: interventions.join('.\n') + '.'
    });
  }

  // 11. התקדמות בעקבות ההתערבות (אך ורק כאשר קיים מידע בהערכת מחצית / סוף שנה או תיעוד התקדמות)
  if (hasEvalData) {
    const progressLines = [];
    if (evalSummary) {
      progressLines.push(evalSummary.replace(/\.$/, '') + '.');
    } else if (evalFreeText) {
      progressLines.push(evalFreeText.replace(/\.$/, '') + '.');
    }
    validGoals.forEach((g) => {
      const status = (g.achievementStatus || '').trim();
      const mid = (g.midYearEvaluation || '').trim();
      const end = (g.endYearEvaluation || '').trim();
      const baseline = (g.activityParticipation || '').trim();
      if (status || mid || end) {
        const parts = [`בסביבת "${g.environment}" (מטרה: "${(g.title || '').replace(/\.$/, '')}")`];
        if (baseline) parts.push(`נקודת המוצא: ${baseline.replace(/\.$/, '')}`);
        if (mid) parts.push(`הערכת מחצית: ${mid.replace(/\.$/, '')}`);
        if (end) parts.push(`הערכת סוף שנה: ${end.replace(/\.$/, '')}`);
        if (status) parts.push(`סטטוס נוכחי: ${status}`);
        progressLines.push(parts.join(' – ') + '.');
      }
    });
    if (progressLines.length > 0) {
      sections.push({
        sectionNumber: 11,
        title: 'התקדמות בעקבות ההתערבות',
        content: progressLines.join('\n')
      });
    }
  }

  // 12. רמת התמיכה הנדרשת כיום
  const supportSentences = extractMatchingSentences(
    /(תיווך|סיוע|עזרה|תזכורת|רמז|ליווי|הטרמה|עצמאי|עצמאית|באופן עצמאי|זקוק לתיווך|זקוקה לתיווך)/
  );
  if (supportSentences.length > 0) {
    sections.push({
      sectionNumber: 12,
      title: 'רמת התמיכה הנדרשת כיום',
      content: `${supportSentences.slice(0, 4).join('. ')}.`
    });
  }

  // 13. השפעת הקשיים על ההשתתפות והתפקוד
  const impactGoals = validGoals.filter(
    (g) =>
      (g.activityParticipation || '').trim() &&
      /(מתקשה|קושי|מגביל|נמנע|נמנעת|זקוק|זקוקה|לא ניגש|לא ניגשת|לעיתים)/.test(
        g.activityParticipation
      )
  );
  if (impactGoals.length > 0) {
    const impactLines = impactGoals.map(
      (g) => `בסביבת "${g.environment}": ${(g.activityParticipation || '').trim().replace(/\.$/, '')}.`
    );
    sections.push({
      sectionNumber: 13,
      title: 'השפעת הקשיים על ההשתתפות והתפקוד',
      content: impactLines.join('\n')
    });
  }

  // 14. מטרות להמשך (מבוסס אך ורק על המטרות שהוגדרו ועל הערכת מחצית/סוף שנה, ללא המצאת מטרות או מדדים)
  if (validGoals.length > 0) {
    const goalsLines = validGoals.map((g, idx) => {
      const objClean = (g.objectives || '')
        .split('\n')
        .map((l) => l.replace(/^[•\-\*\s]+/, '').trim())
        .filter(Boolean)
        .join('; ');
      const evalCrit = (g.evaluationCriteria || '').trim();
      const status = (g.achievementStatus || '').trim();
      const dur = (g.duration || '').trim();

      const segments = [
        `${idx + 1}. סביבת "${g.environment || ''}": ${(g.title || '').replace(/\.$/, '')}`
      ];
      if (status) segments.push(`(סטטוס: ${status})`);
      if (dur) segments.push(`[טווח יעד: ${dur}]`);
      if (objClean) segments.push(`יעדים אופרטיביים: ${objClean}`);
      if (evalCrit) segments.push(`מדדי הצלחה להערכה: ${evalCrit.replace(/\.$/, '')}`);
      return segments.join(' | ') + '.';
    });

    sections.push({
      sectionNumber: 14,
      title: 'מטרות להמשך',
      content: goalsLines.join('\n')
    });
  }

  // 15. סיכום והמלצות מקצועיות
  const summaryParts = [];
  if (recommendations) {
    const cleanRecs = recommendations
      .split('\n')
      .map((l) => l.replace(/^[•\-\*\s]+/, '').trim())
      .filter(Boolean)
      .join(' ');
    if (cleanRecs) {
      summaryParts.push(cleanRecs);
    }
  } else if (validGoals.length > 0 || strengthsExisting) {
    const envNames = [...new Set(validGoals.map((g) => g.environment).filter(Boolean))];
    if (envNames.length > 0) {
      summaryParts.push(
        `מומלץ להמשיך בליווי העקבי ובמתן המענים המותאמים שהוגדרו בתוכנית העבודה בסביבות הפעילות (${envNames.join(', ')}), תוך הסתמכות על מוקדי הכוח של ${studentName}.`
      );
    }
  }
  if (summaryParts.length > 0) {
    sections.push({
      sectionNumber: 15,
      title: 'סיכום והמלצות מקצועיות',
      content: summaryParts.join('\n')
    });
  }

  return sanitizeStatusReportSections(sections, gender);
}
