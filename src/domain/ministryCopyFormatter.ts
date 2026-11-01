/**
 * Domain module for formatting plain-text blocks for Ministry of Education portals
 * (מנב"ס / משו"ב / ועדת זכאות ואפיון).
 * Produces clean, table-free text blocks ready for single-click copy/paste.
 */

import {
  getDisplayStudentName,
  getDisplayMaskedField,
  getRedactedText,
  getAdditionalMetadataItems,
  getEffectiveStudentProfileForTala,
  getEffectiveTalaProfileRows
} from '../export/wordAndPrintBuilders';

export interface MinistryCopyBlock {
  id: string;
  title: string;
  content: string;
}

export interface MinistryCopyGoal {
  title?: string;
  objectives?: string;
  activityParticipation?: string;
  opportunities?: string;
  opportunitiesIntegration?: string;
  opportunitiesTherapist?: string;
  evaluationCriteria?: string;
  learningAccommodations?: string;
  partners?: string;
  duration?: string;
  environment?: string;
  leadProfessional?: string;
  achievementStatus?: string;
  midYearEvaluation?: string;
  endYearEvaluation?: string;
  [key: string]: unknown;
}

export interface MinistryCopyFormData {
  idNumber?: string;
  educationalFramework?: string;
  schoolYear?: string;
  planType?: string;
  strengthsExisting?: string;
  strengthsToEmpower?: string;
  teacherFreeText?: string;
  evalReportSummary?: string;
  recommendations?: string;
  goals?: MinistryCopyGoal[];
  [key: string]: unknown;
}

function cleanLine(text: unknown, formData: MinistryCopyFormData, hideDetails: boolean): string {
  return getRedactedText(String(text || ''), formData as Record<string, unknown>, hideDetails).trim();
}

/**
 * Builds table-free, plain-text blocks ready for 1-click copy/paste into
 * Ministry of Education portals (מנב"ס / משו"ב / ועדת זכאות ואפיון).
 */
export function buildMinistryCopyBlocks(
  formData: MinistryCopyFormData = {},
  hideDetails = false
): MinistryCopyBlock[] {
  const blocks: MinistryCopyBlock[] = [];
  const name = getDisplayStudentName(formData as Record<string, unknown>, hideDetails);
  const idNum = getDisplayMaskedField(formData.idNumber, hideDetails);
  const framework = getDisplayMaskedField(formData.educationalFramework, hideDetails);
  const year = formData.schoolYear || '2026';
  const planType = formData.planType || 'תל"א / תח"י';

  const bgLines: string[] = [
    `שם התלמיד/ה: ${name} | ת.ז: ${idNum}`,
    `מסגרת חינוכית: ${framework} | שנת לימודים: ${year} | סוג תוכנית: ${planType}`
  ];

  const metaItems = getAdditionalMetadataItems(formData as Record<string, unknown>, hideDetails);
  if (metaItems.length > 0) {
    bgLines.push(metaItems.map((m) => `${m.label}: ${m.value}`).join(' | '));
  }

  const talaProfile = getEffectiveStudentProfileForTala(formData as Record<string, unknown>, hideDetails);
  if (talaProfile.generalBackground) {
    bgLines.push(`\nרקע כללי:\n${talaProfile.generalBackground}`);
  }
  if (talaProfile.supportReceived) {
    bgLines.push(`\nמענים ותמיכות:\n${talaProfile.supportReceived}`);
  }
  if (talaProfile.studentMainGoal) {
    bgLines.push(`\nמטרות התלמיד/ה (שיח אישי):\n${talaProfile.studentMainGoal}`);
  }

  const profileRows = (getEffectiveTalaProfileRows(formData as Record<string, unknown>) as Array<{
    subDomain?: string;
    strengthsAndFacilitators?: string;
    areasToStrengthenAndBarriers?: string;
  }>).filter(
    (r) =>
      String(r?.strengthsAndFacilitators || '').trim() ||
      String(r?.areasToStrengthenAndBarriers || '').trim()
  );
  if (profileRows.length > 0) {
    bgLines.push('\nפרופיל תפקודי:');
    for (const row of profileRows) {
      const s = cleanLine(row.strengthsAndFacilitators, formData, hideDetails);
      const b = cleanLine(row.areasToStrengthenAndBarriers, formData, hideDetails);
      const parts = [
        s ? `מוקדי כוח: ${s}` : '',
        b ? `מוקדים לחיזוק: ${b}` : ''
      ].filter(Boolean);
      bgLines.push(`• ${row.subDomain} — ${parts.join(' | ')}`);
    }
  }

  const strengthsExisting = cleanLine(formData.strengthsExisting, formData, hideDetails);
  const strengthsToEmpower = cleanLine(formData.strengthsToEmpower, formData, hideDetails);
  if (strengthsExisting) {
    bgLines.push(`\nמוקדי כוח (כוחות קיימים):\n${strengthsExisting}`);
  }
  if (strengthsToEmpower) {
    bgLines.push(`\nכוחות להעצמה וחיזוק:\n${strengthsToEmpower}`);
  }

  if (
    !talaProfile.generalBackground &&
    profileRows.length === 0 &&
    !strengthsExisting &&
    !strengthsToEmpower
  ) {
    const freeText = cleanLine(formData.teacherFreeText, formData, hideDetails);
    if (freeText) {
      bgLines.push(`\nתיאור תפקוד:\n${freeText}`);
    }
  }

  blocks.push({
    id: 'background',
    title: 'רקע, תפקוד ומוקדי כוח',
    content: bgLines.join('\n').trim()
  });

  const activeGoals = (formData.goals || []).filter((g) =>
    [
      g?.title,
      g?.objectives,
      g?.activityParticipation,
      g?.opportunities,
      g?.opportunitiesIntegration,
      g?.opportunitiesTherapist,
      g?.evaluationCriteria
    ].some((v) => String(v || '').trim().length > 0)
  );

  activeGoals.forEach((g, idx) => {
    const env = String(g.environment || 'כללי').trim();
    const title = cleanLine(g.title, formData, hideDetails);
    const activity = cleanLine(g.activityParticipation, formData, hideDetails);
    const objectives = cleanLine(g.objectives, formData, hideDetails);
    const duration = cleanLine(g.duration, formData, hideDetails);
    const oppMain = cleanLine(g.opportunities, formData, hideDetails);
    const oppInt = cleanLine(g.opportunitiesIntegration, formData, hideDetails);
    const oppTher = cleanLine(g.opportunitiesTherapist, formData, hideDetails);
    const partners = cleanLine(g.partners, formData, hideDetails);
    const evalCrit = cleanLine(g.evaluationCriteria, formData, hideDetails);
    const accomm = cleanLine(g.learningAccommodations, formData, hideDetails);

    const lines: string[] = [`תחום / סביבה: ${env}`];
    if (g.leadProfessional && g.leadProfessional !== 'צוות משותף') {
      lines.push(`מוביל/ת המטרה: ${g.leadProfessional}`);
    }
    if (activity) lines.push(`תיאור תפקוד ופעילות: ${activity}`);
    if (title) lines.push(`מטרה: ${title}`);
    if (objectives) lines.push(`יעדים אופרטיביים:\n${objectives}`);
    if (duration) lines.push(`לוח זמנים: ${duration}`);

    const actionParts = [
      oppMain ? (oppInt || oppTher ? `מחנכת/כללי: ${oppMain}` : oppMain) : '',
      oppInt ? `מורת שילוב: ${oppInt}` : '',
      oppTher ? `טיפול: ${oppTher}` : ''
    ].filter(Boolean);
    if (actionParts.length > 0) {
      lines.push(`אמצעים ודרכי פעולה:\n${actionParts.join('\n')}`);
    }
    if (partners) lines.push(`שותפים: ${partners}`);
    if (evalCrit) lines.push(`אמות מידה להערכה: ${evalCrit}`);
    if (accomm) lines.push(`התאמות בלמידה ובהיבחנות: ${accomm}`);

    blocks.push({
      id: `goal-${idx + 1}`,
      title: `מטרה ${idx + 1}: ${env}${title ? ` — ${title.slice(0, 42)}${title.length > 42 ? '…' : ''}` : ''}`,
      content: lines.join('\n').trim()
    });
  });

  const evalSummary = cleanLine(formData.evalReportSummary, formData, hideDetails);
  const recommendations = cleanLine(formData.recommendations, formData, hideDetails);
  const goalsWithEval = activeGoals.filter(
    (g) => String(g.midYearEvaluation || '').trim() || String(g.endYearEvaluation || '').trim()
  );

  if (evalSummary || recommendations || goalsWithEval.length > 0) {
    const evalLines: string[] = [];
    goalsWithEval.forEach((g, idx) => {
      const gTitle = cleanLine(g.title, formData, hideDetails) || g.environment || `מטרה ${idx + 1}`;
      const status = g.achievementStatus || 'בתהליך';
      const mid = cleanLine(g.midYearEvaluation, formData, hideDetails);
      const end = cleanLine(g.endYearEvaluation, formData, hideDetails);
      evalLines.push(
        `• ${gTitle} (${status}):`,
        ...(mid ? [`  - הערכת מחצית: ${mid}`] : []),
        ...(end ? [`  - הערכת סוף שנה: ${end}`] : [])
      );
    });
    if (evalSummary) evalLines.push(`\nסיכום הערכה:\n${evalSummary}`);
    if (recommendations) evalLines.push(`\nהמלצות להמשך:\n${recommendations}`);

    blocks.push({
      id: 'evaluation',
      title: 'הערכת מחצית / סוף שנה והמלצות',
      content: evalLines.join('\n').trim()
    });
  }

  return blocks;
}

export function formatAllMinistryBlocks(blocks: MinistryCopyBlock[] = []): string {
  return blocks
    .map((b) => `=== ${b.title} ===\n${b.content}`)
    .join('\n\n────────────────────────\n\n');
}
