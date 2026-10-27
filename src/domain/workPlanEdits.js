import {
  buildDefaultTalaProfileRows,
  isGoalEmpty,
  attachAiBaselineToGoal,
  isGoalProtectedFromAiOverwrite,
  STATUS_REPORT_SECTIONS_SCHEMA
} from '../goalBankData';
import { detectStudentStage } from '../studentStage.js';
import {
  getDefaultEnvironmentForStage,
  getDefaultPartnersForStage
} from './stageGuard.js';
import { syncActiveReportSnapshot } from './yearReport';
import { canShareWithColleague } from './permissions';

export const LOCKED_EDITABLE_FIELDS = new Set([
  'evalReportFreeText',
  'evalReportSummary',
  'statusReportSections',
  'statusReportUpdatedAt'
]);

export const EVAL_GOAL_FIELDS = new Set([
  'achievementStatus',
  'midYearEvaluation',
  'endYearEvaluation'
]);

export const applyFieldChange = (prev, field, value, now = new Date()) => {
  const next = { ...prev, [field]: value };
  if (field === 'stage') {
    next.stage = value;
    next.stageSource = 'user_explicit';
    next.stageReason = value === 'kindergarten' ? 'בחירת משתמש: גן ילדים' : 'בחירת משתמש: בית ספר';
    next.stageUpdatedAt = now.toISOString();
  } else if (field === 'educationalFramework' || field === 'teacherFreeText' || field === 'birthDate') {
    if (next.stageSource !== 'user_explicit') {
      const stageInfo = detectStudentStage(
        {
          educationalFramework: next.educationalFramework,
          teacherFreeText: next.teacherFreeText,
          birthDate: next.birthDate
        },
        next.date
      );
      next.stage = stageInfo.stage === 'kindergarten' ? 'kindergarten' : 'school';
      next.stageSource = stageInfo.stageSource;
      next.stageReason = stageInfo.stageReason;
      next.stageUpdatedAt = stageInfo.stageUpdatedAt;
    }
  }
  return next;
};

export const updateTalaProfileRow = (prev, rowIdOrDomain, field, value) => {
  const currentRows = buildDefaultTalaProfileRows(prev?.talaProfileRows);
  const isStrengthField = field === 'strengths' || field === 'strengthsAndFacilitators';
  return {
    ...prev,
    talaProfileRows: currentRows.map((r) =>
      r.id === rowIdOrDomain || r.domain === rowIdOrDomain || r.subDomain === rowIdOrDomain
        ? isStrengthField
          ? { ...r, strengths: value, strengthsAndFacilitators: value }
          : { ...r, toStrengthen: value, areasToStrengthenAndBarriers: value }
        : r
    )
  };
};

export const toggleFocusDomain = (prev, domain) => {
  const current = Array.isArray(prev?.talaFocusDomains) ? prev.talaFocusDomains : [];
  const next = current.includes(domain)
    ? current.filter((d) => d !== domain)
    : [...current, domain];
  return {
    ...prev,
    talaFocusDomains: next
  };
};

export const applyGoalChange = (prev, goalId, field, value) => {
  const isEvalField = EVAL_GOAL_FIELDS.has(field);
  return {
    ...prev,
    goals: (prev?.goals || []).map((g) =>
      g.id === goalId
        ? isEvalField
          ? { ...g, [field]: value }
          : { ...g, [field]: value, isTeacherModified: true }
        : g
    )
  };
};

export const toggleGoalAiLock = (prev, goalId) => {
  return {
    ...prev,
    goals: (prev?.goals || []).map((g) => {
      if (g.id !== goalId) return g;
      const currentlyLocked = isGoalProtectedFromAiOverwrite(g);
      if (currentlyLocked) {
        return attachAiBaselineToGoal(g);
      }
      return { ...g, isTeacherModified: true };
    })
  };
};

export const removeGoalRow = (prev, goalId) => {
  const targetGoal = (prev?.goals || []).find((g) => g.id === goalId);
  const nextRemoved = [...(prev?.removedAiGoals || [])];
  if (targetGoal && !isGoalEmpty(targetGoal)) {
    nextRemoved.push({
      id: targetGoal.id,
      environment: (targetGoal.environment || '').trim(),
      title: (targetGoal.title || '').trim(),
      activityParticipation: (targetGoal.activityParticipation || '').trim(),
      aiSnapshot: targetGoal.aiSnapshot || null
    });
  }
  return {
    ...prev,
    removedAiGoals: nextRemoved,
    goals: (prev?.goals || []).filter((g) => g.id !== goalId)
  };
};

export const buildNewGoalRow = ({ id, stage, isTalaMode, isKindergarten, plus3Months }) => {
  return {
    id,
    environment: getDefaultEnvironmentForStage(stage),
    activityParticipation: '',
    title: '',
    objectives: '',
    opportunities: '',
    opportunitiesIntegration: '',
    opportunitiesTherapist: '',
    learningAccommodations: '',
    partners: isTalaMode
      ? 'מחנכת, מורת שילוב, מטפלת באומנויות'
      : isKindergarten
      ? 'צוות הגן, סייעת אישית'
      : getDefaultPartnersForStage('school'),
    duration: `3 חודשים (עד ${plus3Months})`,
    evaluationCriteria: '',
    isTeacherAdded: true,
    isTeacherModified: true
  };
};

export const applyShareToggle = (
  data,
  colleagueEmail,
  actor = {},
  nowStamp = '',
  options = {}
) => {
  const cleanEmail = String(colleagueEmail || '').trim().toLowerCase();
  if (!cleanEmail) return null;
  const currentShared = Array.isArray(data?.sharedWith) ? data.sharedWith : [];
  const exists = currentShared.some((em) => String(em || '').toLowerCase() === cleanEmail);

  // Tenant Boundary Check: when adding a new share, if allowedUsers is provided
  if (!exists && options.allowedUsers) {
    if (!canShareWithColleague(actor, cleanEmail, options.allowedUsers)) {
      return null;
    }
  }

  const nextShared = exists
    ? currentShared.filter((em) => String(em || '').toLowerCase() !== cleanEmail)
    : [...currentShared, cleanEmail];

  const currentReadBy = Array.isArray(data?.sharedReadBy) ? data.sharedReadBy : [];
  const nextReadBy = currentReadBy.filter(
    (em) => String(em || '').trim().toLowerCase() !== cleanEmail
  );
  const nextSharedAtByEmail = {
    ...(data?.sharedAtByEmail || {}),
    ...(!exists ? { [cleanEmail]: nowStamp } : {})
  };

  let nextTeamMessages = Array.isArray(data?.teamMessages) ? [...data.teamMessages] : [];
  if (!exists && (options.handoffNote || options.messageText)) {
    const noteText = options.handoffNote || options.messageText;
    const handoffMsg = createTeamMessage({
      authorEmail: actor?.email || data?.ownerEmail || '',
      authorName: actor?.name || actor?.email || 'מחבר/ת התוכנית',
      authorRole: actor?.title || actor?.role || 'צוות חינוכי',
      text: noteText,
      type: 'share_handoff',
      recipientEmail: cleanEmail,
      recipientName: options.recipientName || '',
      schoolYear: data?.schoolYear || ''
    });
    if (handoffMsg) {
      nextTeamMessages.push(handoffMsg);
    }
  }

  const next = {
    ...syncActiveReportSnapshot(data),
    sharedWith: nextShared,
    sharedReadBy: nextReadBy,
    sharedByName: actor?.name || actor?.email || data?.sharedByName || '',
    sharedAtByEmail: nextSharedAtByEmail,
    teamMessages: nextTeamMessages
  };

  return {
    next,
    cleanEmail,
    isNewlyShared: !exists
  };
};

export const updateStatusSection = (prev, sectionNumber, content) => {
  return {
    ...prev,
    statusReportSections: (prev?.statusReportSections || []).map((sec) =>
      sec.sectionNumber === sectionNumber ? { ...sec, content } : sec
    )
  };
};

export const removeStatusSection = (prev, sectionNumber) => {
  return {
    ...prev,
    statusReportSections: (prev?.statusReportSections || []).filter(
      (sec) => sec.sectionNumber !== sectionNumber
    )
  };
};

export const createTeamMessage = ({
  authorEmail,
  authorName = '',
  authorRole = '',
  text = '',
  type = 'comment',
  recipientEmail = '',
  recipientName = '',
  schoolYear = ''
} = {}) => {
  const cleanAuthorEmail = String(authorEmail || '').trim().toLowerCase();
  if (!cleanAuthorEmail) return null;

  // Sanitize: strip script/style tags and contents, strip other HTML tags, trim, and cap to 800 chars
  const rawText = String(text || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
  if (!rawText) return null;
  const cleanText = rawText.slice(0, 800);

  const cleanRecipientEmail = String(recipientEmail || '').trim().toLowerCase();
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    authorEmail: cleanAuthorEmail,
    authorName: String(authorName || '').trim() || cleanAuthorEmail,
    authorRole: String(authorRole || '').trim(),
    text: cleanText,
    type: type === 'share_handoff' ? 'share_handoff' : 'comment',
    ...(cleanRecipientEmail ? { recipientEmail: cleanRecipientEmail } : {}),
    ...(recipientName ? { recipientName: String(recipientName).trim() } : {}),
    ...(schoolYear ? { schoolYear: String(schoolYear).trim() } : {}),
    createdAt: new Date().toISOString()
  };
};

export const appendTeamMessage = (data, messageObj) => {
  if (!data || !messageObj || !messageObj.id) return data;
  const currentMessages = Array.isArray(data.teamMessages) ? data.teamMessages : [];
  return {
    ...syncActiveReportSnapshot(data),
    teamMessages: [...currentMessages, messageObj]
  };
};

export const retractTeamMessage = (data, messageId, userEmail) => {
  if (!data || !messageId || !userEmail) return data;
  const cleanUserEmail = String(userEmail).trim().toLowerCase();
  const currentMessages = Array.isArray(data.teamMessages) ? data.teamMessages : [];
  const target = currentMessages.find((m) => m.id === messageId);
  if (!target) return data;

  // Author-only check
  if (String(target.authorEmail || '').trim().toLowerCase() !== cleanUserEmail) {
    return data;
  }

  const updatedMessages = currentMessages.map((m) => {
    if (m.id === messageId) {
      return {
        ...m,
        isDeleted: true,
        text: 'הודעה זו נמחקה על ידי המחבר/ת',
        deletedAt: new Date().toISOString()
      };
    }
    return m;
  });

  return {
    ...syncActiveReportSnapshot(data),
    teamMessages: updatedMessages
  };
};

export const addManualStatusSection = (prev, sectionNumber) => {
  const num = Number(sectionNumber);
  if (!num) return prev;
  const schemaItem = STATUS_REPORT_SECTIONS_SCHEMA.find((s) => s.sectionNumber === num);
  if (!schemaItem) return prev;
  const current = prev?.statusReportSections || [];
  if (current.some((s) => s.sectionNumber === num)) return prev;
  const next = [
    ...current,
    {
      id: `status_sec_${num}`,
      sectionNumber: num,
      title: schemaItem.title,
      content: ''
    }
  ].sort((a, b) => a.sectionNumber - b.sectionNumber);
  return {
    ...prev,
    statusReportSections: next
  };
};
