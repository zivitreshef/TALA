import { getDefaultPartnersForStage, adaptPartnersToStage } from './stageGuard.js';
import {
  ENVIRONMENTS_LIST,
  adaptTextToGender,
  resolveStudentAgeAndDateInfo,
  normalizeAndSizeGoalDuration,
  isGoalEmpty
} from '../goalBankData';
import { syncActiveReportSnapshot } from './yearReport';

export const personalizeBankItem = (bankItem, student) => {
  const genderToUse = student?.gender || 'boy';
  const studentFirstName = (
    student?.name || (genderToUse === 'girl' ? 'הילדה' : 'הילד')
  )
    .trim()
    .split(/\s+/)[0];

  const title = adaptTextToGender(bankItem?.title || '', genderToUse);
  const activity = adaptTextToGender(bankItem?.defaultActivity || '', genderToUse);
  const objectives = (bankItem?.suggestedObjectives || [])
    .map((o) => `• ${adaptTextToGender(o, genderToUse)}`)
    .join('\n');
  const personalizedOpportunities = adaptTextToGender(
    (bankItem?.defaultOpportunities || '').replace(/הילד/g, studentFirstName),
    genderToUse
  );
  const evaluation = adaptTextToGender(bankItem?.defaultEvaluation || '', genderToUse);

  return {
    title,
    activity,
    objectives,
    opportunities: personalizedOpportunities,
    evaluation
  };
};

export const fillGoalRowFromBank = (
  goal,
  bankItem,
  student,
  { fillTemplate = true, isTalaMode = false } = {}
) => {
  const p = personalizeBankItem(bankItem, student);
  if (!fillTemplate) {
    return {
      ...goal,
      title: p.title,
      environment: bankItem?.environment || goal?.environment,
      isTeacherModified: true
    };
  }

  const dateInfo = resolveStudentAgeAndDateInfo(
    student,
    student?.teacherFreeText || ''
  );

  const draftGoal = {
    ...goal,
    title: p.title,
    environment: bankItem?.environment || goal?.environment,
    activityParticipation: goal?.activityParticipation || p.activity || '',
    objectives: goal?.objectives || p.objectives,
    opportunities: goal?.opportunities || p.opportunities || '',
    opportunitiesIntegration: goal?.opportunitiesIntegration || '',
    opportunitiesTherapist: goal?.opportunitiesTherapist || '',
    learningAccommodations: goal?.learningAccommodations || '',
    partners:
      goal?.partners
        ? adaptPartnersToStage(goal.partners, student?.stage || (String(student?.educationalFramework || '').includes('גן') ? 'kindergarten' : 'school'), isTalaMode)
        : bankItem?.defaultPartners
        ? adaptPartnersToStage(bankItem.defaultPartners, student?.stage || (String(student?.educationalFramework || '').includes('גן') ? 'kindergarten' : 'school'), isTalaMode)
        : getDefaultPartnersForStage(student?.stage || (String(student?.educationalFramework || '').includes('גן') ? 'kindergarten' : 'school'), isTalaMode),
    duration: goal?.duration || '',
    evaluationCriteria: goal?.evaluationCriteria || p.evaluation || '',
    isTeacherModified: true
  };

  return {
    ...draftGoal,
    duration:
      goal?.duration && goal?.duration !== 'עד סוף השנה'
        ? goal?.duration
        : normalizeAndSizeGoalDuration(
            draftGoal,
            student?.teacherFreeText || '',
            student,
            dateInfo
          )
  };
};

export const appendBankGoalToStudent = (student, bankItem, now = new Date()) => {
  const p = personalizeBankItem(bankItem, student);
  const existingGoals = Array.isArray(student?.goals) ? student.goals : [];
  const alreadyExists = existingGoals.some(
    (g) =>
      (g.title || '').trim() === p.title.trim() ||
      (g.title || '').trim() === (bankItem?.title || '').trim()
  );

  if (alreadyExists) {
    return {
      student,
      added: false,
      goalTitle: p.title
    };
  }

  const dateInfo = resolveStudentAgeAndDateInfo(
    student,
    student?.teacherFreeText || ''
  );

  const draftGoal = {
    id: 'g_bank_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    environment: bankItem?.environment || ENVIRONMENTS_LIST[0],
    activityParticipation: p.activity || '',
    title: p.title,
    objectives: p.objectives || '',
    opportunities: p.opportunities || '',
    partners: bankItem?.defaultPartners || 'צוות הגן, סייעת אישית',
    duration: '',
    evaluationCriteria: p.evaluation || '',
    isTeacherAdded: true,
    isTeacherModified: true
  };

  const sizedGoal = {
    ...draftGoal,
    duration: normalizeAndSizeGoalDuration(
      draftGoal,
      student?.teacherFreeText || '',
      student,
      dateInfo
    )
  };

  const nextGoals =
    existingGoals.length === 1 && isGoalEmpty(existingGoals[0])
      ? [sizedGoal]
      : [...existingGoals, sizedGoal];

  const nowTime = now.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const updatedStudent = syncActiveReportSnapshot({
    ...student,
    goals: nextGoals,
    lastSavedAt: nowTime
  });

  return {
    student: updatedStudent,
    added: true,
    goalTitle: p.title
  };
};
