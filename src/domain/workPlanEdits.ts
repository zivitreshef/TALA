/**
 * Domain module for Ecological Work Plan Mutations & Editing Operations.
 * Handles field changes, goal row manipulations, sharing boundaries,
 * collaborative handoffs, and status report sections.
 */

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
} from './stageGuard';
import { syncActiveReportSnapshot, type FormStudentInput, type YearReportGoal, type YearReportProfileRow, type YearReportStatusSection, type RemovedAiGoalSnapshot } from './yearReport';
import { canShareWithColleague } from './permissions';
import type { EducationalStage, StageSource } from './types';

export const LOCKED_EDITABLE_FIELDS: Set<string> = new Set([
  'evalReportFreeText',
  'evalReportSummary',
  'statusReportSections',
  'statusReportUpdatedAt'
]);

export const EVAL_GOAL_FIELDS: Set<string> = new Set([
  'achievementStatus',
  'midYearEvaluation',
  'endYearEvaluation'
]);

export interface TeamMessage {
  id: string;
  authorEmail: string;
  authorName: string;
  authorRole: string;
  text: string;
  type: 'share_handoff' | 'comment';
  recipientEmail?: string;
  recipientName?: string;
  schoolYear?: string;
  readBy: string[];
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface ColleagueActor {
  email?: string;
  name?: string;
  title?: string;
  role?: string;
  group?: string;
  [key: string]: unknown;
}

export interface ShareOptions {
  allowedUsers?: Array<{ email?: string; name?: string; group?: string; [key: string]: unknown }>;
  handoffNote?: string;
  messageText?: string;
  recipientName?: string;
}

export interface ShareToggleResult<T = FormStudentInput> {
  next: T;
  cleanEmail: string;
  isNewlyShared: boolean;
}

export interface ShareSettingsParams {
  selectedEmails?: string[];
  handoffNote?: string;
  actor?: ColleagueActor;
  nowStamp?: string;
  allowedUsers?: Array<{ email?: string; name?: string; group?: string; [key: string]: unknown }>;
}

export interface ShareSettingsResult<T = FormStudentInput> {
  next: T;
  newlyAdded: string[];
  removed: string[];
  messageCreated: boolean;
  notifiedEmails: string[];
}

export interface WorkPlanEditResult extends FormStudentInput {
  stage?: EducationalStage | string;
  stageSource?: StageSource | string;
  stageReason?: string;
  stageUpdatedAt?: string;
  talaProfileRows?: YearReportProfileRow[];
  talaFocusDomains?: string[];
  goals?: YearReportGoal[];
  removedAiGoals?: RemovedAiGoalSnapshot[];
  sharedWith?: string[];
  sharedReadBy?: string[];
  sharedByName?: string;
  sharedAtByEmail?: Record<string, string>;
  teamMessages?: TeamMessage[];
  statusReportSections?: YearReportStatusSection[];
  [key: string]: unknown;
}

export interface BuildNewGoalParams {
  id: string;
  stage?: EducationalStage | string;
  isTalaMode?: boolean;
  isKindergarten?: boolean;
  plus3Months?: string;
}

export const applyFieldChange = <T extends FormStudentInput>(
  prev: T,
  field: string,
  value: unknown,
  now: Date = new Date()
): T & WorkPlanEditResult => {
  const next = { ...prev, [field]: value } as T & WorkPlanEditResult;
  if (field === 'stage') {
    next.stage = value as EducationalStage;
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

export const updateTalaProfileRow = <T extends FormStudentInput>(
  prev: T,
  rowIdOrDomain: string,
  field: string,
  value: string
): T & { talaProfileRows: YearReportProfileRow[] } => {
  const currentRows = buildDefaultTalaProfileRows(prev?.talaProfileRows) as YearReportProfileRow[];
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

export const toggleFocusDomain = <T extends FormStudentInput>(
  prev: T,
  domain: string
): T & { talaFocusDomains: string[] } => {
  const current = Array.isArray(prev?.talaFocusDomains) ? prev.talaFocusDomains : [];
  const next = current.includes(domain)
    ? current.filter((d) => d !== domain)
    : [...current, domain];
  return {
    ...prev,
    talaFocusDomains: next
  };
};

export const applyGoalChange = <T extends FormStudentInput>(
  prev: T,
  goalId: string,
  field: string,
  value: unknown
): T & { goals: YearReportGoal[] } => {
  const isEvalField = EVAL_GOAL_FIELDS.has(field);
  return {
    ...prev,
    goals: ((prev?.goals || []) as YearReportGoal[]).map((g) =>
      g.id === goalId
        ? isEvalField
          ? { ...g, [field]: value }
          : { ...g, [field]: value, isTeacherModified: true }
        : g
    )
  };
};

export const toggleGoalAiLock = <T extends FormStudentInput>(
  prev: T,
  goalId: string
): T & { goals: YearReportGoal[] } => {
  return {
    ...prev,
    goals: ((prev?.goals || []) as YearReportGoal[]).map((g) => {
      if (g.id !== goalId) return g;
      const currentlyLocked = isGoalProtectedFromAiOverwrite(g);
      if (currentlyLocked) {
        return attachAiBaselineToGoal(g);
      }
      return { ...g, isTeacherModified: true };
    })
  };
};

export const removeGoalRow = <T extends FormStudentInput>(
  prev: T,
  goalId: string
): T & { goals: YearReportGoal[]; removedAiGoals: RemovedAiGoalSnapshot[] } => {
  const targetGoal = ((prev?.goals || []) as YearReportGoal[]).find((g) => g.id === goalId);
  const nextRemoved: RemovedAiGoalSnapshot[] = [...((prev?.removedAiGoals || []) as RemovedAiGoalSnapshot[])];
  if (targetGoal && !isGoalEmpty(targetGoal)) {
    nextRemoved.push({
      id: targetGoal.id || '',
      environment: (targetGoal.environment || '').trim(),
      title: (targetGoal.title || '').trim(),
      activityParticipation: (targetGoal.activityParticipation || '').trim(),
      aiSnapshot: targetGoal.aiSnapshot || null
    });
  }
  return {
    ...prev,
    removedAiGoals: nextRemoved,
    goals: ((prev?.goals || []) as YearReportGoal[]).filter((g) => g.id !== goalId)
  };
};

export const buildNewGoalRow = ({
  id,
  stage = 'school',
  isTalaMode = true,
  plus3Months = ''
}: BuildNewGoalParams): YearReportGoal => {
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
    partners: getDefaultPartnersForStage(stage, isTalaMode),
    duration: `3 חודשים (עד ${plus3Months})`,
    evaluationCriteria: '',
    isTeacherAdded: true,
    isTeacherModified: true
  };
};

export const applyShareToggle = <T extends FormStudentInput>(
  data: T,
  colleagueEmail?: string | null,
  actor: ColleagueActor = {},
  nowStamp = '',
  options: ShareOptions = {}
): ShareToggleResult<T> | null => {
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

  const currentReadBy = Array.isArray(data?.sharedReadBy) ? (data.sharedReadBy as string[]) : [];
  const nextReadBy = currentReadBy.filter(
    (em) => String(em || '').trim().toLowerCase() !== cleanEmail
  );
  const nextSharedAtByEmail: Record<string, string> = {
    ...((data?.sharedAtByEmail as Record<string, string>) || {}),
    ...(!exists ? { [cleanEmail]: nowStamp } : {})
  };

  const nextTeamMessages: TeamMessage[] = Array.isArray(data?.teamMessages) ? [...(data.teamMessages as TeamMessage[])] : [];
  if (!exists && (options.handoffNote || options.messageText)) {
    const noteText = options.handoffNote || options.messageText;
    const handoffMsg = createTeamMessage({
      authorEmail: actor?.email || (data?.ownerEmail as string) || '',
      authorName: actor?.name || actor?.email || 'מחבר/ת התוכנית',
      authorRole: actor?.title || actor?.role || 'צוות חינוכי',
      text: noteText,
      type: 'share_handoff',
      recipientEmail: cleanEmail,
      recipientName: options.recipientName || '',
      schoolYear: (data?.schoolYear as string) || ''
    });
    if (handoffMsg) {
      nextTeamMessages.push(handoffMsg);
    }
  }

  const next = {
    ...syncActiveReportSnapshot(data),
    sharedWith: nextShared,
    sharedReadBy: nextReadBy,
    sharedByName: actor?.name || actor?.email || (data?.sharedByName as string) || '',
    sharedAtByEmail: nextSharedAtByEmail,
    teamMessages: nextTeamMessages
  } as unknown as T;

  return {
    next,
    cleanEmail,
    isNewlyShared: !exists
  };
};

export const applyShareSettings = <T extends FormStudentInput>(
  data: T,
  {
    selectedEmails = [],
    handoffNote = '',
    actor = {},
    nowStamp = '',
    allowedUsers = []
  }: ShareSettingsParams = {}
): ShareSettingsResult<T> | null => {
  if (!data) return null;

  const currentShared = (Array.isArray(data.sharedWith) ? data.sharedWith : []).map((e) =>
    String(e || '').trim().toLowerCase()
  );

  const cleanSelected = Array.from(
    new Set((selectedEmails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))
  );

  // Security Tenant Boundary Check: verify any newly added colleague belongs to actor's group
  const newlyAdded: string[] = [];
  for (const email of cleanSelected) {
    if (!currentShared.includes(email)) {
      if (allowedUsers && allowedUsers.length > 0) {
        if (!canShareWithColleague(actor, email, allowedUsers)) {
          return null;
        }
      }
      newlyAdded.push(email);
    }
  }

  const removed = currentShared.filter((e) => !cleanSelected.includes(e));

  // Next sharedWith array
  const nextShared = cleanSelected;

  // Next sharedReadBy: keep only those still in sharedWith, and remove newlyAdded so they get an unread alert
  const currentReadBy = (Array.isArray(data.sharedReadBy) ? (data.sharedReadBy as string[]) : []).map((e) =>
    String(e || '').trim().toLowerCase()
  );
  const nextReadBy = currentReadBy.filter(
    (em) => nextShared.includes(em) && !newlyAdded.includes(em)
  );

  // Next sharedAtByEmail
  const nextSharedAtByEmail: Record<string, string> = { ...((data.sharedAtByEmail as Record<string, string>) || {}) };
  newlyAdded.forEach((em) => {
    nextSharedAtByEmail[em] = nowStamp || new Date().toISOString();
  });
  removed.forEach((em) => {
    delete nextSharedAtByEmail[em];
  });

  // Handoff message creation
  const nextTeamMessages: TeamMessage[] = Array.isArray(data.teamMessages) ? [...(data.teamMessages as TeamMessage[])] : [];
  const cleanNote = String(handoffNote || '').trim();
  let messageCreated = false;

  if (cleanNote) {
    // If colleagues were newly added in this action, target the newly added colleagues.
    // If no colleagues were newly added (e.g. colleagues were already shared), target all cleanSelected.
    const recipients = newlyAdded.length > 0 ? newlyAdded : cleanSelected;

    recipients.forEach((recEmail) => {
      const recUser = (allowedUsers || []).find(
        (u) => (u.email || '').trim().toLowerCase() === recEmail
      );
      const handoffMsg = createTeamMessage({
        authorEmail: actor?.email || (data?.ownerEmail as string) || '',
        authorName: actor?.name || actor?.email || 'מחבר/ת התוכנית',
        authorRole: actor?.title || actor?.role || 'צוות חינוכי',
        text: cleanNote,
        type: 'share_handoff',
        recipientEmail: recEmail,
        recipientName: recUser?.name || '',
        schoolYear: (data?.schoolYear as string) || ''
      });
      if (handoffMsg) {
        nextTeamMessages.push(handoffMsg);
        messageCreated = true;
      }
    });
  }

  const next = {
    ...syncActiveReportSnapshot(data),
    sharedWith: nextShared,
    sharedReadBy: nextReadBy,
    sharedByName: actor?.name || actor?.email || (data?.sharedByName as string) || '',
    sharedAtByEmail: nextSharedAtByEmail,
    teamMessages: nextTeamMessages
  } as unknown as T;

  return {
    next,
    newlyAdded,
    removed,
    messageCreated,
    notifiedEmails: cleanNote && newlyAdded.length === 0 ? cleanSelected : newlyAdded
  };
};

export const updateStatusSection = <T extends FormStudentInput>(
  prev: T,
  sectionNumber: number,
  content: string
): T & { statusReportSections: YearReportStatusSection[] } => {
  return {
    ...prev,
    statusReportSections: ((prev?.statusReportSections || []) as YearReportStatusSection[]).map((sec) =>
      sec.sectionNumber === sectionNumber ? { ...sec, content } : sec
    )
  };
};

export const removeStatusSection = <T extends FormStudentInput>(
  prev: T,
  sectionNumber: number
): T & { statusReportSections: YearReportStatusSection[] } => {
  return {
    ...prev,
    statusReportSections: ((prev?.statusReportSections || []) as YearReportStatusSection[]).filter(
      (sec) => sec.sectionNumber !== sectionNumber
    )
  };
};

export interface CreateTeamMessageParams {
  authorEmail?: string;
  authorName?: string;
  authorRole?: string;
  text?: string;
  type?: 'share_handoff' | 'comment' | string;
  recipientEmail?: string;
  recipientName?: string;
  schoolYear?: string;
}

export function createTeamMessage({
  authorEmail,
  authorName = '',
  authorRole = '',
  text = '',
  type = 'comment',
  recipientEmail = '',
  recipientName = '',
  schoolYear = ''
}: CreateTeamMessageParams = {}): TeamMessage | null {
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
    readBy: [cleanAuthorEmail],
    createdAt: new Date().toISOString()
  };
}

export const appendTeamMessage = <T extends FormStudentInput>(
  data: T,
  messageObj?: TeamMessage | null
): T & { teamMessages: TeamMessage[]; lastTeamMessageAt?: string; lastTeamMessageBy?: string; sharedReadBy?: string[] } => {
  if (!data || !messageObj || !messageObj.id) return data as T & { teamMessages: TeamMessage[]; lastTeamMessageAt?: string; lastTeamMessageBy?: string; sharedReadBy?: string[] };
  const currentMessages = Array.isArray(data.teamMessages) ? (data.teamMessages as TeamMessage[]) : [];
  const authorEmail = String(messageObj.authorEmail || '').trim().toLowerCase();
  return {
    ...syncActiveReportSnapshot(data),
    teamMessages: [...currentMessages, messageObj],
    lastTeamMessageAt: messageObj.createdAt,
    lastTeamMessageBy: authorEmail,
    // Reset sharedReadBy so other colleagues receive unread notification
    sharedReadBy: [authorEmail]
  } as unknown as T & { teamMessages: TeamMessage[]; lastTeamMessageAt?: string; lastTeamMessageBy?: string; sharedReadBy?: string[] };
};

export const retractTeamMessage = <T extends FormStudentInput>(
  data: T,
  messageId: string,
  userEmail: string
): T & { teamMessages: TeamMessage[] } => {
  if (!data || !messageId || !userEmail) return data as T & { teamMessages: TeamMessage[] };
  const cleanUserEmail = String(userEmail).trim().toLowerCase();
  const currentMessages = Array.isArray(data.teamMessages) ? (data.teamMessages as TeamMessage[]) : [];
  const target = currentMessages.find((m) => m.id === messageId);
  if (!target) return data as T & { teamMessages: TeamMessage[] };

  // Author-only check
  if (String(target.authorEmail || '').trim().toLowerCase() !== cleanUserEmail) {
    return data as T & { teamMessages: TeamMessage[] };
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
  } as unknown as T & { teamMessages: TeamMessage[] };
};

export const addManualStatusSection = <T extends FormStudentInput>(
  prev: T,
  sectionNumber: number | string
): T & { statusReportSections: YearReportStatusSection[] } => {
  const num = Number(sectionNumber);
  if (!num) return prev as T & { statusReportSections: YearReportStatusSection[] };
  const schemaItem = STATUS_REPORT_SECTIONS_SCHEMA.find((s) => s.sectionNumber === num);
  if (!schemaItem) return prev as T & { statusReportSections: YearReportStatusSection[] };
  const current = (prev?.statusReportSections || []) as YearReportStatusSection[];
  if (current.some((s) => s.sectionNumber === num)) return prev as T & { statusReportSections: YearReportStatusSection[] };
  const next: YearReportStatusSection[] = [
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
