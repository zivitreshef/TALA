export const SURVEY_TICK_SECONDS = 30;
export const SURVEY_THRESHOLD_SECONDS = 480;
export const SURVEY_THRESHOLD_WITH_STUDENT_SECONDS = 180;

export const isSurveyEligible = (currentUser, surveySnoozedInSession) => {
  if (!currentUser || currentUser.role === 'admin') return false;
  if (currentUser.mustChangePassword) return false;
  if (currentUser.isTrialUser && (currentUser.mustSignNda || !currentUser.ndaSigned)) {
    return false;
  }
  if (currentUser.surveyCompleted || currentUser.surveyDismissed || surveySnoozedInSession) {
    return false;
  }
  return true;
};

export const advanceUsageEntry = (entry, nowMs = Date.now()) => {
  const prevEntry = entry || {
    firstSeenAt: nowMs,
    activeSeconds: 0
  };
  const nextSeconds = (Number(prevEntry.activeSeconds) || 0) + SURVEY_TICK_SECONDS;
  return {
    ...prevEntry,
    activeSeconds: nextSeconds
  };
};

export const shouldPromptSurvey = (activeSeconds, ownedStudentCount = 0) => {
  return (
    activeSeconds >= SURVEY_THRESHOLD_SECONDS ||
    (ownedStudentCount >= 1 && activeSeconds >= SURVEY_THRESHOLD_WITH_STUDENT_SECONDS)
  );
};

export const patchUserByEmail = (users = [], email = '', patch = {}) => {
  const cleanEmail = email.trim().toLowerCase();
  return (users || []).map((u) =>
    u.email?.toLowerCase() === cleanEmail ? { ...u, ...patch } : u
  );
};

export const buildSurveySummaryNotes = (surveyPayload = {}) => {
  const r = surveyPayload?.ratings || {};
  return [
    `קלות שימוש: ${r.easeOfWebsite || 5}/5`,
    `יצירת תלמיד: ${r.createStudent || 5}/5`,
    `מטרות ו-AI: ${r.generateGoals || 5}/5`,
    `הפקת דוחות: ${r.createReport || 5}/5`,
    `שיתוף עם קולגות: ${r.collaborateWithColleagues || 5}/5`,
    `המלצה לרכישה: ${surveyPayload?.recommendToColleaguesAndManager || '—'}`,
    surveyPayload?.overallFeedback ? `משוב: ${surveyPayload.overallFeedback}` : '',
    surveyPayload?.improvementSuggestions ? `הצעות שיפור: ${surveyPayload.improvementSuggestions}` : ''
  ]
    .filter(Boolean)
    .join(' | ');
};
