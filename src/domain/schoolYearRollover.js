export const SCHOOL_YEARS_LIST = [
  'תשפ"ד (2023-2024)',
  'תשפ"ה (2024-2025)',
  'תשפ"ו (2025-2026)',
  'תשפ"ז (2026-2027)',
  'תשפ"ח (2027-2028)',
  'תשפ"ט (2028-2029)',
  'תש"צ (2029-2030)'
];

const DEFAULT_ENVIRONMENT = 'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה';

export function getNextSchoolYear(currentYear) {
  const idx = SCHOOL_YEARS_LIST.indexOf(currentYear);
  if (idx !== -1 && idx + 1 < SCHOOL_YEARS_LIST.length) {
    return SCHOOL_YEARS_LIST[idx + 1];
  }
  return 'תשפ"ז (2026-2027)';
}

export function buildRolloverStudentForNextYear(studentObj, sourceYear, targetYearOverride = null) {
  if (!studentObj) return null;
  const fromYear = sourceYear || studentObj.schoolYear || 'תשפ"ו (2025-2026)';
  const nextYear = targetYearOverride || getNextSchoolYear(fromYear);
  const sourceReport = studentObj.reportsByYear?.[fromYear] || studentObj;
  const todayStr = new Date().toLocaleDateString('he-IL');
  const nowTime = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const rolledGoals = (sourceReport.goals || []).map((g, idx) => {
    const evalNotes = [
      g.achievementStatus ? `סטטוס שנה קודמת (${fromYear}): ${g.achievementStatus}` : '',
      g.endYearEvaluation ? `סיכום שנה קודמת: ${g.endYearEvaluation}` : g.midYearEvaluation ? `הערכת מחצית קודמת: ${g.midYearEvaluation}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    const baseActivity = (g.activityParticipation || '').trim();
    const nextActivity = evalNotes
      ? `${baseActivity ? baseActivity + '\n' : ''}[רצף מתכנית ${fromYear} – ${evalNotes}]`
      : baseActivity;

    const isFullyAchieved = g.achievementStatus === 'הושג במלואו';

    return {
      id: `g_roll_${Date.now()}_${idx}`,
      environment: g.environment || DEFAULT_ENVIRONMENT,
      activityParticipation: nextActivity,
      title: isFullyAchieved ? '' : g.title || '',
      objectives: isFullyAchieved ? '' : g.objectives || '',
      opportunities: g.opportunities || '',
      partners: g.partners || 'צוות הגן, הורים',
      duration: 'עד סוף השנה',
      evaluationCriteria: isFullyAchieved ? '' : g.evaluationCriteria || '',
      achievementStatus: '',
      midYearEvaluation: '',
      endYearEvaluation: ''
    };
  });

  const newYearReport = {
    date: todayStr,
    planType: sourceReport.planType || studentObj.planType || 'תל"א (תוכנית לימודים אישית)',
    isLocked: false,
    lockedAt: '',
    lockedBy: '',
    teacherFreeText: sourceReport.teacherFreeText || studentObj.teacherFreeText || '',
    strengthsExisting: sourceReport.strengthsExisting || studentObj.strengthsExisting || '',
    strengthsToEmpower: sourceReport.strengthsToEmpower || studentObj.strengthsToEmpower || '',
    recommendations: sourceReport.recommendations || studentObj.recommendations || '',
    lastSavedAt: nowTime,
    goals:
      rolledGoals.length > 0
        ? rolledGoals
        : [
            {
              id: 'g_init_' + Date.now(),
              environment: DEFAULT_ENVIRONMENT,
              activityParticipation: '',
              title: '',
              objectives: '',
              opportunities: '',
              partners: 'צוות הגן, סייעת אישית',
              duration: 'עד סוף השנה',
              evaluationCriteria: '',
              achievementStatus: '',
              midYearEvaluation: '',
              endYearEvaluation: ''
            }
          ]
  };

  return {
    ...studentObj,
    archived: false,
    status: 'בטיוטה',
    schoolYear: nextYear,
    ...newYearReport,
    reportsByYear: {
      ...(studentObj.reportsByYear || {}),
      [fromYear]: {
        date: sourceReport.date || studentObj.date || todayStr,
        planType: sourceReport.planType || studentObj.planType || 'תל"א (תוכנית לימודים אישית)',
        isLocked: Boolean(sourceReport.isLocked),
        lockedAt: sourceReport.lockedAt || '',
        lockedBy: sourceReport.lockedBy || '',
        teacherFreeText: sourceReport.teacherFreeText || '',
        strengthsExisting: sourceReport.strengthsExisting || '',
        strengthsToEmpower: sourceReport.strengthsToEmpower || '',
        recommendations: sourceReport.recommendations || '',
        lastSavedAt: sourceReport.lastSavedAt || '',
        goals: sourceReport.goals || []
      },
      [nextYear]: newYearReport
    }
  };
}
