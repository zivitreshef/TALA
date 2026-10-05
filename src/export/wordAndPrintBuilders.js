import {
  toHebrewAcronym,
  maskSensitiveValue,
  redactStudentNameInText
} from '../domain/privacyAndAcronyms';
import { generateStatusReportLocally } from '../domain/statusReportGenerator';
import { isTalaPlanType, TALA_GOAL_COLOR_STATUSES } from '../goalBankData';

export function getGoalStatusMeta(statusVal = '') {
  const clean = String(statusVal || '').trim();
  const exact = TALA_GOAL_COLOR_STATUSES.find((s) => s.value === clean || s.label === clean);
  if (exact) return exact;
  if (clean === 'הושגה במלואה') return TALA_GOAL_COLOR_STATUSES[0];
  if (clean === 'הושגה חלקית') return TALA_GOAL_COLOR_STATUSES[1];
  if (clean === 'טרם הושגה' || clean === 'לא הושגה') return TALA_GOAL_COLOR_STATUSES[2];
  return TALA_GOAL_COLOR_STATUSES[3]; // default: מטרה חדשה
}

export function getAdditionalMetadataItems(formData = {}, hideDetails = false) {
  const rawItems = [
    { label: 'בית הספר', value: formData.schoolName, sensitive: true },
    { label: 'כיתה', value: formData.gradeClass, sensitive: false },
    { label: 'מחנכת', value: formData.homeroomTeacher, sensitive: false },
    { label: 'תומכת למידה', value: formData.learningSupportAssistant, sensitive: false },
    { label: 'יועצת', value: formData.counselorName, sensitive: false },
    { label: 'פסיכולוגית', value: formData.psychologistName, sensitive: false },
    { label: 'מתכללת מתי"א', value: formData.matyaCoordinator, sensitive: false },
    { label: 'מטפלת רגשית', value: formData.emotionalTherapist, sensitive: false },
    { label: 'צוות פרא-רפואי', value: formData.paraMedicalTeam, sensitive: false }
  ];
  return rawItems
    .filter((item) => String(item.value || '').trim().length > 0)
    .map((item) => ({
      label: item.label,
      value: item.sensitive && hideDetails ? maskSensitiveValue(item.value) : String(item.value).trim()
    }));
}

export function getEffectiveStudentProfileForTala(formData = {}, hideDetails = false) {
  const explicitBg = getRedactedText(formData.studentGeneralBackground, formData, hideDetails).trim();
  const explicitGoal = getRedactedText(formData.studentMainGoal, formData, hideDetails).trim();
  const fallbackExisting = getRedactedText(formData.strengthsExisting, formData, hideDetails).trim();
  const fallbackEmpower = getRedactedText(formData.strengthsToEmpower, formData, hideDetails).trim();

  const generalBackground =
    explicitBg ||
    [
      fallbackExisting ? `מוקדי כוח ותפקוד קיים:\n${fallbackExisting}` : '',
      fallbackEmpower ? `מוקדים להעצמה וחיזוק:\n${fallbackEmpower}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

  const firstGoalTitle =
    Array.isArray(formData.goals) && formData.goals[0]?.title
      ? getRedactedText(formData.goals[0].title, formData, hideDetails).trim()
      : '';

  const studentMainGoal =
    explicitGoal ||
    fallbackEmpower ||
    firstGoalTitle ||
    'קידום תפקודי, לימודי, חברתי ורגשי מותאם ליכולות התלמיד/ה בשיתוף הצוות הרב-מקצועי.';

  return { generalBackground, studentMainGoal };
}

export function hasPopulatedClassSection(formData = {}) {
  if (String(formData.classBackground || '').trim().length > 0) return true;
  if (!Array.isArray(formData.classGoals)) return false;
  return formData.classGoals.some(
    (cg) =>
      String(cg?.currentFunctioning || '').trim() ||
      String(cg?.goalsAndObjectives || '').trim() ||
      String(cg?.actionsAndPartners || '').trim() ||
      String(cg?.successCriteria || '').trim()
  );
}

export function getFullDocTitle(formData = {}) {
  return formData.planType
    ? `תוכנית עבודה שנתית – ${formData.planType}`
    : 'תוכנית עבודה שנתית';
}

export function getEvalReportTitle() {
  return 'דוח הערכת מחצית / סוף שנה';
}

export function getStatusReportTitle() {
  return 'דו"ח מצב חינוכי-תפקודי עדכני';
}

export function getDisplayStudentName(formData = {}, hideDetails = false) {
  if (hideDetails) {
    return toHebrewAcronym(formData.name);
  }
  return formData.name || '__________';
}

export function getDisplayMaskedField(val, hideDetails = false) {
  if (hideDetails) {
    return maskSensitiveValue(val);
  }
  return val || '__________';
}

export function getRedactedText(text, formData = {}, hideDetails = false) {
  return redactStudentNameInText(text || '', formData.name, hideDetails);
}

export function getSafeReportFilename(formData = {}, hideDetails = false, ext = 'doc', mode = 'tala') {
  const displayName = getDisplayStudentName(formData, hideDetails).replace(/[^a-zA-Z0-9א-ת_-]/g, '_');
  const yearStr = (formData.schoolYear || '2026').replace(/[^a-zA-Z0-9א-ת_-]/g, '_');
  const prefix =
    mode === 'status'
      ? 'דוח_מצב'
      : mode === 'eval'
      ? 'דוח_הערכת_מחצית_וסוף_שנה'
      : 'תוכנית_עבודה';
  return `${prefix}_${displayName}_${yearStr}.${ext}`;
}

export function getActiveStatusReportSections(formData = {}) {
  const existing = Array.isArray(formData.statusReportSections)
    ? formData.statusReportSections.filter((s) => s && (s.content || '').trim())
    : [];
  if (existing.length > 0) return existing;
  return generateStatusReportLocally(formData);
}

export function openHtmlPrintWindow(htmlString) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(htmlString);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

export function buildWorkPlanPrintHtml(formData = {}, hideDetails = false, logoUrl = '') {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const fullDocTitle = getFullDocTitle(formData);
  const isTala = isTalaPlanType(formData.planType);
  const additionalItems = getAdditionalMetadataItems(formData, hideDetails);

  const additionalMetadataBarHtml =
    additionalItems.length > 0
      ? `
        <div class="student-details-bar" style="background: #f5f3ff; border-color: #8b6fc0; margin-top: -6px;">
          <div style="font-weight: 700; color: #4c1d95;">מידע נוסף ושותפים חינוכיים:</div>
          ${additionalItems.map((it) => `<div><strong>${it.label}:</strong> ${it.value}</div>`).join('')}
        </div>
      `
      : '';

  const talaLegendHtml = `
    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 11.5px;">
      <strong>מקרא סטטוס מטרות:</strong>
      ${TALA_GOAL_COLOR_STATUSES.map(
        (st) =>
          `<span style="display: inline-block; padding: 3px 10px; border-radius: 6px; background: ${st.bg}; border: 1.5px solid ${st.border}; color: ${st.text}; font-weight: 700;">${st.label}</span>`
      ).join('')}
    </div>
  `;

  const talaClassSectionHtml =
    isTala && hasPopulatedClassSection(formData)
      ? `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <h3 style="margin: 0 0 8px 0; font-size: 14.5px; color: #1e3a5f; border-bottom: 2px solid #5b9bd5; padding-bottom: 4px;">
            רקע כללי על הכיתה ומטרות כיתתיות
          </h3>
          ${
            (formData.classBackground || '').trim()
              ? `<div style="background: #eef3fb; border: 1.5px solid #5b9bd5; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; white-space: pre-line;"><strong>רקע כללי על הכיתה:</strong><br/>${getRedactedText(formData.classBackground, formData, hideDetails)}</div>`
              : ''
          }
          ${
            Array.isArray(formData.classGoals) &&
            formData.classGoals.some(
              (cg) =>
                (cg?.currentFunctioning || '').trim() ||
                (cg?.goalsAndObjectives || '').trim() ||
                (cg?.actionsAndPartners || '').trim() ||
                (cg?.successCriteria || '').trim()
            )
              ? `
                <table class="eco-table">
                  <thead>
                    <tr class="columns-header-row">
                      <th style="width: 15%;">תחום המטרות</th>
                      <th style="width: 21%;">תפקוד נוכחי</th>
                      <th style="width: 22%;">יעדים ומטרות</th>
                      <th style="width: 22%;">פעולות להשגת היעדים + שותפים</th>
                      <th style="width: 20%;">אמות מידה להצלחה</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${formData.classGoals
                      .map((cg) => {
                        const stMeta = getGoalStatusMeta(cg.status);
                        return `
                          <tr>
                            <td style="font-weight: 700; color: #1e3a5f; background: #f8faff;">
                              <div>${cg.domain || ''}</div>
                              <div style="margin-top: 4px; display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; background: ${stMeta.bg}; border: 1px solid ${stMeta.border}; color: ${stMeta.text};">${stMeta.label}</div>
                            </td>
                            <td>${getRedactedText(cg.currentFunctioning, formData, hideDetails)}</td>
                            <td>${getRedactedText(cg.goalsAndObjectives, formData, hideDetails)}</td>
                            <td>${getRedactedText(cg.actionsAndPartners, formData, hideDetails)}</td>
                            <td>${getRedactedText(cg.successCriteria, formData, hideDetails)}</td>
                          </tr>
                        `;
                      })
                      .join('')}
                  </tbody>
                </table>
              `
              : ''
          }
        </div>
      `
      : '';

  const talaProfile = getEffectiveStudentProfileForTala(formData, hideDetails);

  const topSummarySectionHtml = isTala
    ? `
      ${talaClassSectionHtml}
      <table class="eco-table summary-table">
        <thead>
          <tr>
            <th class="th-existing" style="width: 55%;">רקע כללי על התלמיד/ה</th>
            <th class="th-empower" style="width: 45%;">מטרת התלמיד/ה</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${talaProfile.generalBackground}</td>
            <td>${talaProfile.studentMainGoal}</td>
          </tr>
        </tbody>
      </table>
      ${talaLegendHtml}
    `
    : `
      <table class="eco-table summary-table">
        <thead>
          <tr>
            <th class="th-existing" style="width: 50%;">מוקדי כוח: כוחות קיימים</th>
            <th class="th-empower" style="width: 50%;">כוחות להעצמה וחיזוק</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${getRedactedText(formData.strengthsExisting, formData, hideDetails)}</td>
            <td>${getRedactedText(formData.strengthsToEmpower, formData, hideDetails)}</td>
          </tr>
        </tbody>
      </table>
    `;

  const goalsRowsHtml = isTala
    ? `
      <table class="eco-table">
        <thead>
          <tr class="columns-header-row">
            <th style="width: 24%;">תפקוד נוכחי<br/><span class="th-sub">תחום/סביבה, סטטוס ותיאור התפקוד</span></th>
            <th style="width: 28%;">מטרות ויעדים<br/><span class="th-sub">מטרה ופירוט צעדים אופרטיביים</span></th>
            <th style="width: 26%;">פעולות ואמצעים להשגת היעדים + שותפים ספציפיים</th>
            <th style="width: 22%;">אמות מידה להערכה</th>
          </tr>
        </thead>
        <tbody>
          ${(formData.goals || [])
            .map((g) => {
              const activityText = getRedactedText(g.activityParticipation, formData, hideDetails);
              const titleText = getRedactedText(g.title, formData, hideDetails);
              const objectivesText = getRedactedText(g.objectives, formData, hideDetails);
              const opportunitiesText = getRedactedText(g.opportunities, formData, hideDetails);
              const partnersText = getRedactedText(g.partners, formData, hideDetails);
              const evaluationText = getRedactedText(g.evaluationCriteria, formData, hideDetails);
              const stMeta = getGoalStatusMeta(g.achievementStatus);
              const combinedActionsPartners = [
                opportunitiesText,
                partnersText ? `שותפים ספציפיים: ${partnersText}` : ''
              ]
                .filter(Boolean)
                .join('\n\n');

              return `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: #1e3a5f; margin-bottom: 4px;">תחום / סביבה: ${g.environment || '__________'}</div>
                    <div style="display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 700; margin-bottom: 6px; background: ${stMeta.bg}; border: 1px solid ${stMeta.border}; color: ${stMeta.text};">
                      ${stMeta.label}
                    </div>
                    <div>${activityText || ''}</div>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: #0d2b56; margin-bottom: 4px;">${titleText || ''}</div>
                    <div>${objectivesText || ''}</div>
                  </td>
                  <td>${combinedActionsPartners || ''}</td>
                  <td>${evaluationText || ''}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `
    : (formData.goals || [])
        .map((g) => {
          const activityText = getRedactedText(g.activityParticipation, formData, hideDetails);
          const titleText = getRedactedText(g.title, formData, hideDetails);
          const objectivesText = getRedactedText(g.objectives, formData, hideDetails);
          const opportunitiesText = getRedactedText(g.opportunities, formData, hideDetails);
          const partnersText = getRedactedText(g.partners, formData, hideDetails);
          const durationText = getRedactedText(g.duration, formData, hideDetails);
          const evaluationText = getRedactedText(g.evaluationCriteria, formData, hideDetails);

          return `
            <table class="eco-table goal-block-table">
              <tbody>
                <tr class="env-header-row">
                  <td colspan="6">
                    <div><strong>סביבה:</strong> ${g.environment || '__________'}</div>
                    <div style="margin-top: 4px;">
                      <strong>פעילות והשתתפות:</strong>
                      <span class="sub-instruction">תיאור תוך התייחסות לפעילות הספציפית ולתחומי התפקוד השונים במהלך הפעילות:</span>
                    </div>
                    <div style="margin-top: 6px; white-space: pre-line;">${activityText || ''}</div>
                  </td>
                </tr>
                <tr class="columns-header-row">
                  <th style="width: 18%;">מטרה<br/><span class="th-sub">מה אנחנו רוצים שיקרה?</span></th>
                  <th style="width: 22%;">יעדים, ציוני דרך<br/><span class="th-sub">פירוט צעדים אופרטיביים</span></th>
                  <th style="width: 24%;">הזדמנויות, אמצעים<br/><span class="th-sub">ואיך נגרום לזה לקרות?</span></th>
                  <th style="width: 13%;">שותפים<br/><span class="th-sub">מי ובאיזה אופן?</span></th>
                  <th style="width: 9%;">משך</th>
                  <th style="width: 14%;">אמות מידה להערכה</th>
                </tr>
                <tr class="columns-content-row">
                  <td style="font-weight: 600; color: #0d2b56;">${titleText || ''}</td>
                  <td>${objectivesText || ''}</td>
                  <td>${opportunitiesText || ''}</td>
                  <td>${partnersText || ''}</td>
                  <td>${durationText || ''}</td>
                  <td>${evaluationText || ''}</td>
                </tr>
              </tbody>
            </table>
          `;
        })
        .join('');

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${fullDocTitle.replace(/\s+/g, '_')}_${displayName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap');
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Rubik', Arial, sans-serif;
            direction: rtl;
            text-align: right;
            color: #243b47;
            background: #f6f5f0;
            margin: 0;
            padding: 0;
            font-size: 12.5px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .stained-glass-strip {
            height: 6px;
            width: 100%;
            background: linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);
            border-radius: 6px 6px 0 0;
          }
          .print-banner {
            background: linear-gradient(135deg, #3b6ea5 0%, #5b9bd5 50%, #8e7cc3 100%);
            color: #ffffff;
            padding: 14px 20px;
            border-bottom: 4px solid #c5aef2;
            border-radius: 0 0 10px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .print-banner-center {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .print-logo {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #d6c6f7;
            background: #f4f7fc;
          }
          .doc-main-title {
            margin: 0;
            font-size: 19px;
            font-weight: 700;
            color: #ffffff;
          }
          .doc-meta-side {
            font-size: 12.5px;
            color: #f5f0ff;
          }
          .student-details-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            padding: 10px 14px;
            border: 1.5px solid #5b9bd5;
            border-right: 5px solid #8b6fc0;
            background: #eef3fb;
            border-radius: 8px;
            margin-bottom: 14px;
            font-size: 13px;
          }
          .eco-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            page-break-inside: avoid;
            background: #ffffff;
          }
          .eco-table th, .eco-table td {
            border: 1.5px solid #7997be;
            padding: 8px 10px;
            vertical-align: top;
            text-align: right;
            white-space: pre-line;
          }
          .summary-table th.th-existing {
            background: #5b9bd5;
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 700;
            text-align: center;
          }
          .summary-table th.th-empower {
            background: #8b6fc0;
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 700;
            text-align: center;
          }
          .env-header-row td {
            background: #eef3fb;
            border-top: 3px solid #5b9bd5;
          }
          .sub-instruction {
            font-size: 11px;
            color: #5c6f8c;
            font-weight: normal;
          }
          .columns-header-row th {
            background: #eaf3fc;
            color: #2b4c73;
            font-weight: 700;
            font-size: 12.5px;
            text-align: center;
          }
          .th-sub {
            font-weight: 400;
            font-size: 10.5px;
            display: block;
            color: #4f6585;
          }
          .doc-footer-section {
            margin-top: 14px;
            page-break-inside: avoid;
          }
          .recommendations-box {
            border: 1.5px solid #5b9bd5;
            background: #eef3fb;
            border-radius: 8px;
            padding: 10px 12px;
            min-height: 46px;
            margin-bottom: 18px;
            white-space: pre-line;
          }
          .signatures-row {
            display: flex;
            justify-content: space-between;
            margin-top: 22px;
            font-weight: 600;
            color: #2b4c73;
          }
        </style>
      </head>
      <body>
        <div class="stained-glass-strip"></div>
        <div class="print-banner">
          <div class="doc-meta-side"><strong>תאריך:</strong> ${formData.date || '__________'}</div>
          <div class="print-banner-center">
            <img src="${logoUrl}" alt="TALA Logo" class="print-logo" />
            <h1 class="doc-main-title">${fullDocTitle}</h1>
          </div>
          <div class="doc-meta-side"><strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}</div>
        </div>

        <div class="student-details-bar">
          <div><strong>שם הילד/ה:</strong> ${displayName}</div>
          <div><strong>ת.ז:</strong> ${displayId}</div>
          <div><strong>ת.ל:</strong> ${displayBirthDate}</div>
          <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
          ${formData.planType ? `<div><strong>סוג תוכנית:</strong> ${formData.planType}</div>` : ''}
          ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
          ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
        </div>
        ${additionalMetadataBarHtml}

        <!-- Top Summary / Profile Section -->
        ${topSummarySectionHtml}

        <!-- Goal Blocks / Table -->
        ${goalsRowsHtml}

        <!-- Footer: Recommendations & Signatures -->
        <div class="doc-footer-section">
          <div class="recommendations-box">
            <strong>המלצות:</strong><br/>
            ${getRedactedText(formData.recommendations, formData, hideDetails)}
          </div>
          <div class="signatures-row">
            <div>חתימת צוות חינוכי: _________________________</div>
            <div>חתימת הורים: _________________________</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function buildWordDocumentHtml(formData = {}, hideDetails = false) {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const fullDocTitle = getFullDocTitle(formData);
  const isTala = isTalaPlanType(formData.planType);
  const additionalItems = getAdditionalMetadataItems(formData, hideDetails);

  const additionalWordBarHtml =
    additionalItems.length > 0
      ? `
        <div style="background-color:#f5f3ff; border:1px solid #8b6fc0; padding:6pt 12pt; margin-bottom:12pt; font-size:10.5pt;">
          <strong>מידע נוסף ושותפים חינוכיים:</strong>
          ${additionalItems.map((it) => `<strong>${it.label}:</strong> ${it.value}`).join(' &nbsp;|&nbsp; ')}
        </div>
      `
      : '';

  const talaProfile = getEffectiveStudentProfileForTala(formData, hideDetails);
  const talaGeneralBgHtml = (talaProfile.generalBackground || '').replace(/\n/g, '<br/>');
  const talaMainGoalHtml = (talaProfile.studentMainGoal || '').replace(/\n/g, '<br/>');

  const talaClassWordSectionHtml =
    isTala && hasPopulatedClassSection(formData)
      ? `
        <div style="margin-bottom:12pt;">
          <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:6pt;">רקע כללי על הכיתה ומטרות כיתתיות</div>
          ${
            (formData.classBackground || '').trim()
              ? `<div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 10pt; margin-bottom:8pt; font-size:10.5pt;"><strong>רקע כללי על הכיתה:</strong><br/>${(getRedactedText(formData.classBackground, formData, hideDetails) || '').replace(/\n/g, '<br/>')}</div>`
              : ''
          }
          ${
            Array.isArray(formData.classGoals) &&
            formData.classGoals.some(
              (cg) =>
                (cg?.currentFunctioning || '').trim() ||
                (cg?.goalsAndObjectives || '').trim() ||
                (cg?.actionsAndPartners || '').trim() ||
                (cg?.successCriteria || '').trim()
            )
              ? `
                <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:12pt; font-family: Arial, sans-serif; font-size: 10pt;">
                  <tr style="background-color:#eaf3fc; color:#2b4c73; font-weight:bold; text-align:center;">
                    <th style="width:15%; border:1px solid #7997be; padding:6pt;">תחום המטרות</th>
                    <th style="width:21%; border:1px solid #7997be; padding:6pt;">תפקוד נוכחי</th>
                    <th style="width:22%; border:1px solid #7997be; padding:6pt;">יעדים ומטרות</th>
                    <th style="width:22%; border:1px solid #7997be; padding:6pt;">פעולות להשגת היעדים + שותפים</th>
                    <th style="width:20%; border:1px solid #7997be; padding:6pt;">אמות מידה להצלחה</th>
                  </tr>
                  ${formData.classGoals
                    .map((cg) => {
                      const stMeta = getGoalStatusMeta(cg.status);
                      return `
                        <tr>
                          <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; background-color:#f8faff; vertical-align:top; text-align:right;">
                            <div>${cg.domain || ''}</div>
                            <div style="margin-top:3pt; font-size:9pt; color:${stMeta.text}; background-color:${stMeta.bg}; padding:2pt 4pt;">${stMeta.label}</div>
                          </td>
                          <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${(getRedactedText(cg.currentFunctioning, formData, hideDetails) || '').replace(/\n/g, '<br/>')}</td>
                          <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${(getRedactedText(cg.goalsAndObjectives, formData, hideDetails) || '').replace(/\n/g, '<br/>')}</td>
                          <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${(getRedactedText(cg.actionsAndPartners, formData, hideDetails) || '').replace(/\n/g, '<br/>')}</td>
                          <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${(getRedactedText(cg.successCriteria, formData, hideDetails) || '').replace(/\n/g, '<br/>')}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </table>
              `
              : ''
          }
        </div>
      `
      : '';

  const goalsRowsHtml = isTala
    ? `
      <div style="margin-bottom:8pt; font-size:10pt;">
        <strong>מקרא סטטוס מטרות:</strong>
        ${TALA_GOAL_COLOR_STATUSES.map(
          (st) =>
            `<span style="background-color:${st.bg}; color:${st.text}; border:1px solid ${st.border}; padding:2pt 6pt; margin-left:6pt; font-weight:bold;">${st.label}</span>`
        ).join(' ')}
      </div>
      <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family: Arial, sans-serif; font-size: 10.5pt;">
        <tr style="background-color:#eaf3fc; color:#2b4c73; font-weight:bold; text-align:center;">
          <th style="width:24%; border:1px solid #7997be; padding:6pt;">תפקוד נוכחי</th>
          <th style="width:28%; border:1px solid #7997be; padding:6pt;">מטרות ויעדים</th>
          <th style="width:26%; border:1px solid #7997be; padding:6pt;">פעולות ואמצעים להשגת היעדים + שותפים ספציפיים</th>
          <th style="width:22%; border:1px solid #7997be; padding:6pt;">אמות מידה להערכה</th>
        </tr>
        ${(formData.goals || [])
          .map((g) => {
            const activityText = (getRedactedText(g.activityParticipation, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const titleText = (getRedactedText(g.title, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const objectivesText = (getRedactedText(g.objectives, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const opportunitiesText = (getRedactedText(g.opportunities, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const partnersText = (getRedactedText(g.partners, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const evaluationText = (getRedactedText(g.evaluationCriteria, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const stMeta = getGoalStatusMeta(g.achievementStatus);
            const combinedActionsPartners = [
              opportunitiesText,
              partnersText ? `<strong>שותפים ספציפיים:</strong> ${partnersText}` : ''
            ]
              .filter(Boolean)
              .join('<br/><br/>');

            return `
              <tr>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
                  <div style="font-weight:bold; color:#1e3a5f; margin-bottom:3pt;">תחום / סביבה: ${g.environment || '__________'}</div>
                  <div style="background-color:${stMeta.bg}; color:${stMeta.text}; border:1px solid ${stMeta.border}; padding:2pt 5pt; font-size:9pt; font-weight:bold; margin-bottom:4pt; display:inline-block;">${stMeta.label}</div>
                  <div>${activityText}</div>
                </td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
                  <div style="font-weight:bold; color:#0d2b56; margin-bottom:4pt;">${titleText}</div>
                  <div>${objectivesText}</div>
                </td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${combinedActionsPartners}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${evaluationText}</td>
              </tr>
            `;
          })
          .join('')}
      </table>
    `
    : (formData.goals || [])
        .map((g) => {
          const activityText = (getRedactedText(g.activityParticipation, formData, hideDetails) || '').replace(/\n/g, '<br/>');
          const titleText = (getRedactedText(g.title, formData, hideDetails) || '').replace(/\n/g, '<br/>');
          const objectivesText = (getRedactedText(g.objectives, formData, hideDetails) || '').replace(/\n/g, '<br/>');
          const opportunitiesText = (getRedactedText(g.opportunities, formData, hideDetails) || '').replace(/\n/g, '<br/>');
          const partnersText = (getRedactedText(g.partners, formData, hideDetails) || '').replace(/\n/g, '<br/>');
          const durationText = (getRedactedText(g.duration, formData, hideDetails) || '').replace(/\n/g, '<br/>');
          const evaluationText = (getRedactedText(g.evaluationCriteria, formData, hideDetails) || '').replace(/\n/g, '<br/>');

          return `
            <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family: Arial, sans-serif; font-size: 10.5pt;">
              <tr style="background-color:#eef3fb;">
                <td colspan="6" style="border:1px solid #7997be; padding:8pt; text-align:right;">
                  <div><strong>סביבה:</strong> ${g.environment || '__________'}</div>
                  <div style="margin-top:4pt;"><strong>פעילות והשתתפות:</strong> ${activityText}</div>
                </td>
              </tr>
              <tr style="background-color:#eaf3fc; color:#2b4c73; font-weight:bold; text-align:center;">
                <th style="width:18%; border:1px solid #7997be; padding:6pt;">מטרה</th>
                <th style="width:22%; border:1px solid #7997be; padding:6pt;">יעדים, ציוני דרך</th>
                <th style="width:24%; border:1px solid #7997be; padding:6pt;">הזדמנויות, אמצעים</th>
                <th style="width:13%; border:1px solid #7997be; padding:6pt;">שותפים</th>
                <th style="width:9%; border:1px solid #7997be; padding:6pt;">משך</th>
                <th style="width:14%; border:1px solid #7997be; padding:6pt;">אמות מידה להערכה</th>
              </tr>
              <tr>
                <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; color:#0d2b56; vertical-align:top; text-align:right;">${titleText}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${objectivesText}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${opportunitiesText}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${partnersText}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${durationText}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${evaluationText}</td>
              </tr>
            </table>
          `;
        })
        .join('');

  const strengthsExistingHtml = (getRedactedText(formData.strengthsExisting, formData, hideDetails) || '').replace(/\n/g, '<br/>');
  const strengthsToEmpowerHtml = (getRedactedText(formData.strengthsToEmpower, formData, hideDetails) || '').replace(/\n/g, '<br/>');
  const recommendationsHtml = (getRedactedText(formData.recommendations, formData, hideDetails) || '').replace(/\n/g, '<br/>');

  const topWordSummaryTableHtml = isTala
    ? `
      ${talaClassWordSectionHtml}
      <table dir="rtl" border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family:Arial, sans-serif; font-size:10.5pt;">
        <tr>
          <th style="width:55%; background-color:#5b9bd5; color:#ffffff; border:1px solid #7997be; padding:6pt; text-align:center;">רקע כללי על התלמיד/ה</th>
          <th style="width:45%; background-color:#8b6fc0; color:#ffffff; border:1px solid #7997be; padding:6pt; text-align:center;">מטרת התלמיד/ה</th>
        </tr>
        <tr>
          <td style="border:1px solid #7997be; padding:8pt; vertical-align:top; text-align:right;">${talaGeneralBgHtml}</td>
          <td style="border:1px solid #7997be; padding:8pt; vertical-align:top; text-align:right;">${talaMainGoalHtml}</td>
        </tr>
      </table>
    `
    : `
      <table dir="rtl" border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family:Arial, sans-serif; font-size:10.5pt;">
        <tr>
          <th style="width:50%; background-color:#5b9bd5; color:#ffffff; border:1px solid #7997be; padding:6pt; text-align:center;">מוקדי כוח: כוחות קיימים</th>
          <th style="width:50%; background-color:#8b6fc0; color:#ffffff; border:1px solid #7997be; padding:6pt; text-align:center;">כוחות להעצמה וחיזוק</th>
        </tr>
        <tr>
          <td style="border:1px solid #7997be; padding:8pt; vertical-align:top; text-align:right;">${strengthsExistingHtml}</td>
          <td style="border:1px solid #7997be; padding:8pt; vertical-align:top; text-align:right;">${strengthsToEmpowerHtml}</td>
        </tr>
      </table>
    `;

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40"
          lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${fullDocTitle} - ${displayName}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 841.9pt 595.3pt;
          mso-page-orientation: landscape;
          margin: 36.0pt 36.0pt 36.0pt 36.0pt;
        }
        div.WordSection1 { page: WordSection1; direction: rtl; text-align: right; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body lang="he" dir="rtl" style="direction:rtl; text-align:right; font-family:Arial, sans-serif; color:#243b47;">
      <div class="WordSection1" dir="rtl">
        <div style="background-color:#3b6ea5; color:#ffffff; padding:12pt 16pt; margin-bottom:10pt; text-align:center;">
          <h1 style="margin:0; font-size:16pt;">${fullDocTitle}</h1>
          <div style="font-size:10.5pt; margin-top:4pt;">
            <strong>תאריך:</strong> ${formData.date || '__________'} &nbsp;|&nbsp;
            <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
          </div>
        </div>

        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
          <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          ${formData.address ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
          ${formData.phone ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
        </div>
        ${additionalWordBarHtml}

        ${topWordSummaryTableHtml}

        ${goalsRowsHtml}

        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-top:12pt; margin-bottom:18pt; font-size:10.5pt;">
          <strong>המלצות:</strong><br/>
          ${recommendationsHtml}
        </div>

        <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
          <tr>
            <td style="width:50%; text-align:right;">חתימת צוות חינוכי: _________________________</td>
            <td style="width:50%; text-align:left;">חתימת הורים: _________________________</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

export function buildEvalWordDocumentHtml(formData = {}, hideDetails = false) {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const evalDocTitle = getEvalReportTitle();
  const evalSummaryHtml = (getRedactedText(formData.evalReportSummary, formData, hideDetails) || '').replace(/\n/g, '<br/>');
  const recommendationsHtml = (getRedactedText(formData.recommendations, formData, hideDetails) || '').replace(/\n/g, '<br/>');

  const evalGoalsRowsHtml = (formData.goals || [])
    .map((g, idx) => {
      const titleText = (getRedactedText(g.title, formData, hideDetails) || '').replace(/\n/g, '<br/>');
      const objectivesText = (getRedactedText(g.objectives, formData, hideDetails) || '').replace(/\n/g, '<br/>');
      const midEvalText = (getRedactedText(g.midYearEvaluation, formData, hideDetails) || '').replace(/\n/g, '<br/>');
      const endEvalText = (getRedactedText(g.endYearEvaluation, formData, hideDetails) || '').replace(/\n/g, '<br/>');
      const statusText = g.achievementStatus || 'בתהליך';

      return `
        <tr>
          <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; background-color:#f8faff; vertical-align:top; text-align:right;">
            ${idx + 1}. ${g.environment || '__________'}
          </td>
          <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
            <div style="font-weight:bold; color:#0d2b56;">${titleText}</div>
            ${objectivesText ? `<div style="margin-top:4pt; font-size:9.5pt; color:#334155;">${objectivesText}</div>` : ''}
          </td>
          <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; color:#4c1d95; vertical-align:top; text-align:center;">
            ${statusText}
          </td>
          <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
            ${midEvalText || '—'}
          </td>
          <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">
            ${endEvalText || '—'}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40"
          lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${evalDocTitle} - ${displayName}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 841.9pt 595.3pt;
          mso-page-orientation: landscape;
          margin: 36.0pt 36.0pt 36.0pt 36.0pt;
        }
        div.WordSection1 { page: WordSection1; direction: rtl; text-align: right; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body lang="he" dir="rtl" style="direction:rtl; text-align:right; font-family:Arial, sans-serif; color:#243b47;">
      <div class="WordSection1" dir="rtl">
        <div style="background-color:#4e4376; color:#ffffff; padding:12pt 16pt; margin-bottom:10pt; text-align:center;">
          <h1 style="margin:0; font-size:16pt;">${evalDocTitle}</h1>
          <div style="font-size:10.5pt; margin-top:4pt;">
            <strong>תאריך:</strong> ${formData.date || '__________'} &nbsp;|&nbsp;
            <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
          </div>
        </div>

        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
          <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          ${formData.address ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
          ${formData.phone ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
        </div>

        ${
          evalSummaryHtml
            ? `
        <div style="background-color:#f5f3ff; border:1px solid #8b6fc0; padding:8pt 12pt; margin-bottom:12pt; font-size:10.5pt;">
          <strong>סיכום תפקוד והתקדמות תקופתית:</strong><br/>
          ${evalSummaryHtml}
        </div>`
            : ''
        }

        <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family: Arial, sans-serif; font-size: 10.5pt;">
          <tr style="background-color:#5b9bd5; color:#ffffff; font-weight:bold; text-align:center;">
            <th style="width:15%; border:1px solid #7997be; padding:6pt;">סביבה / תחום</th>
            <th style="width:25%; border:1px solid #7997be; padding:6pt;">מטרה ויעדים</th>
            <th style="width:12%; border:1px solid #7997be; padding:6pt;">סטטוס השגת המטרה</th>
            <th style="width:24%; border:1px solid #7997be; padding:6pt;">הערכת מחצית</th>
            <th style="width:24%; border:1px solid #7997be; padding:6pt;">הערכת סוף שנה</th>
          </tr>
          ${evalGoalsRowsHtml}
        </table>

        ${
          recommendationsHtml
            ? `
        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-top:12pt; margin-bottom:18pt; font-size:10.5pt;">
          <strong>המלצות להמשך:</strong><br/>
          ${recommendationsHtml}
        </div>`
            : ''
        }

        <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
          <tr>
            <td style="width:50%; text-align:right;">חתימת צוות חינוכי: _________________________</td>
            <td style="width:50%; text-align:left;">חתימת הורים: _________________________</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

export function buildEvalReportPrintHtml(formData = {}, hideDetails = false, logoUrl = '') {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const evalDocTitle = getEvalReportTitle();

  const evalRowsHtml = (formData.goals || [])
    .map((g, idx) => {
      const titleText = getRedactedText(g.title, formData, hideDetails);
      const objectivesText = getRedactedText(g.objectives, formData, hideDetails);
      const midEvalText = getRedactedText(g.midYearEvaluation, formData, hideDetails);
      const endEvalText = getRedactedText(g.endYearEvaluation, formData, hideDetails);
      const statusText = g.achievementStatus || 'בתהליך';

      return `
        <tr>
          <td style="font-weight: 700; background: #f8faff; color: #1e3a5f;">${idx + 1}. ${g.environment || '__________'}</td>
          <td>
            <div style="font-weight: 700; color: #0d2b56;">${titleText || ''}</div>
            ${objectivesText ? `<div style="margin-top: 4px; font-size: 11.5px; color: #334155;">${objectivesText}</div>` : ''}
          </td>
          <td style="font-weight: 700; color: #5b21b6; text-align: center;">${statusText}</td>
          <td>${midEvalText || '—'}</td>
          <td>${endEvalText || '—'}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${evalDocTitle.replace(/\s+/g, '_')}_${displayName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap');
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Rubik', Arial, sans-serif;
            direction: rtl;
            text-align: right;
            color: #243b47;
            background: #f6f5f0;
            margin: 0;
            padding: 0;
            font-size: 12.5px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .stained-glass-strip {
            height: 6px;
            width: 100%;
            background: linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);
            border-radius: 6px 6px 0 0;
          }
          .print-banner {
            background: linear-gradient(135deg, #3b6ea5 0%, #5b9bd5 50%, #8e7cc3 100%);
            color: #ffffff;
            padding: 14px 20px;
            border-bottom: 4px solid #c5aef2;
            border-radius: 0 0 10px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .print-banner-center {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .print-logo {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #d6c6f7;
            background: #f4f7fc;
          }
          .doc-main-title {
            margin: 0;
            font-size: 19px;
            font-weight: 700;
            color: #ffffff;
          }
          .doc-meta-side {
            font-size: 12.5px;
            color: #f5f0ff;
          }
          .student-details-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            padding: 10px 14px;
            border: 1.5px solid #5b9bd5;
            border-right: 5px solid #8b6fc0;
            background: #eef3fb;
            border-radius: 8px;
            margin-bottom: 14px;
            font-size: 13px;
          }
          .summary-box {
            border: 1.5px solid #8b6fc0;
            background: #f5f3ff;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 14px;
            white-space: pre-line;
          }
          .eco-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            background: #ffffff;
          }
          .eco-table th, .eco-table td {
            border: 1.5px solid #7997be;
            padding: 8px 10px;
            vertical-align: top;
            text-align: right;
            white-space: pre-line;
          }
          .eco-table thead th {
            background: linear-gradient(135deg, #3b6ea5 0%, #6b46c1 100%);
            color: #ffffff;
            font-weight: 700;
            font-size: 13px;
            text-align: center;
          }
          .recommendations-box {
            border: 1.5px solid #5b9bd5;
            background: #eef3fb;
            border-radius: 8px;
            padding: 10px 12px;
            min-height: 42px;
            margin-bottom: 18px;
            white-space: pre-line;
          }
          .signatures-row {
            display: flex;
            justify-content: space-between;
            margin-top: 22px;
            font-weight: 600;
            color: #2b4c73;
          }
        </style>
      </head>
      <body>
        <div class="stained-glass-strip"></div>
        <div class="print-banner">
          <div class="doc-meta-side"><strong>תאריך:</strong> ${formData.date || '__________'}</div>
          <div class="print-banner-center">
            <img src="${logoUrl}" alt="TALA Logo" class="print-logo" />
            <h1 class="doc-main-title">${evalDocTitle}</h1>
          </div>
          <div class="doc-meta-side"><strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}</div>
        </div>

        <div class="student-details-bar">
          <div><strong>שם הילד/ה:</strong> ${displayName}</div>
          <div><strong>ת.ז:</strong> ${displayId}</div>
          <div><strong>ת.ל:</strong> ${displayBirthDate}</div>
          <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
          ${formData.planType ? `<div><strong>סוג תוכנית:</strong> ${formData.planType}</div>` : ''}
          ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
          ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
        </div>

        ${
          formData.evalReportSummary
            ? `<div class="summary-box"><strong>סיכום תפקוד והתקדמות תקופתית:</strong><br/>${getRedactedText(formData.evalReportSummary, formData, hideDetails)}</div>`
            : ''
        }

        <table class="eco-table">
          <thead>
            <tr>
              <th style="width: 15%;">סביבה / תחום</th>
              <th style="width: 25%;">מטרה ויעדים</th>
              <th style="width: 12%;">סטטוס השגת המטרה</th>
              <th style="width: 24%;">הערכת מחצית</th>
              <th style="width: 24%;">הערכת סוף שנה</th>
            </tr>
          </thead>
          <tbody>
            ${evalRowsHtml}
          </tbody>
        </table>

        <div class="recommendations-box">
          <strong>המלצות להמשך:</strong><br/>
          ${getRedactedText(formData.recommendations, formData, hideDetails)}
        </div>
        <div class="signatures-row">
          <div>חתימת צוות חינוכי: _________________________</div>
          <div>חתימת הורים: _________________________</div>
        </div>
      </body>
    </html>
  `;
}

export function buildStatusReportWordDocumentHtml(formData = {}, hideDetails = false) {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const statusDocTitle = getStatusReportTitle();
  const sectionsToRender = getActiveStatusReportSections(formData);

  const formatBulletLinesForExport = (rawText) =>
    String(rawText || '')
      .split('\n')
      .map((line) =>
        line
          .replace(/^\s*(?:\d+[\.\)\-]\s*|[•◆▪▫\-*]\s*)/, '')
          .trim()
      )
      .filter(Boolean)
      .map((line) => `• ${line}`);

  const sectionsHtml = sectionsToRender
    .map((sec) => {
      const cleanTitle = String(sec.title || '')
        .replace(/^\s*(?:\d+[\.\)\-]\s*|[•◆▪\-]\s*)/, '')
        .trim();
      const redactedContent = formatBulletLinesForExport(
        getRedactedText(sec.content, formData, hideDetails)
      ).join('<br/>');
      return `
        <div style="border:1px solid #cbd5e1; border-right:4px solid #3b6ea5; background-color:#ffffff; padding:8pt 12pt; margin-bottom:10pt;">
          <div style="font-weight:bold; font-size:11.5pt; color:#1e3a5f; margin-bottom:4pt;">
            <span style="color:#2563eb;">&#9670;</span> ${cleanTitle}
          </div>
          <div style="font-size:10.5pt; color:#243b47; line-height:1.55;">
            ${redactedContent}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40"
          lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${statusDocTitle} - ${displayName}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 595.3pt 841.9pt;
          mso-page-orientation: portrait;
          margin: 36.0pt 36.0pt 36.0pt 36.0pt;
        }
        div.WordSection1 { page: WordSection1; direction: rtl; text-align: right; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body lang="he" dir="rtl" style="direction:rtl; text-align:right; font-family:Arial, sans-serif; color:#243b47;">
      <div class="WordSection1" dir="rtl">
        <div style="background-color:#2b4c73; color:#ffffff; padding:12pt 16pt; margin-bottom:10pt; text-align:center;">
          <h1 style="margin:0; font-size:16pt;">${statusDocTitle}</h1>
          <div style="font-size:10.5pt; margin-top:4pt;">
            <strong>תאריך:</strong> ${formData.date || '__________'} &nbsp;|&nbsp;
            <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
          </div>
        </div>

        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
          <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          ${formData.address ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
          ${formData.phone ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
        </div>

        ${sectionsHtml}

        <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
          <tr>
            <td style="width:50%; text-align:right;">חתימת צוות חינוכי: _________________________</td>
            <td style="width:50%; text-align:left;">חתימת הורים / גורם מקצועי: _________________________</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

export function buildStatusReportPrintHtml(formData = {}, hideDetails = false, logoUrl = '') {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const statusDocTitle = getStatusReportTitle();
  const sectionsToRender = getActiveStatusReportSections(formData);

  const sectionsHtml = sectionsToRender
    .map((sec) => {
      const cleanTitle = String(sec.title || '')
        .replace(/^\s*(?:\d+[\.\)\-]\s*|[•◆▪\-]\s*)/, '')
        .trim();
      const redactedContent = String(getRedactedText(sec.content, formData, hideDetails) || '')
        .split('\n')
        .map((line) =>
          line
            .replace(/^\s*(?:\d+[\.\)\-]\s*|[•◆▪▫\-*]\s*)/, '')
            .trim()
        )
        .filter(Boolean)
        .map((line) => `• ${line}`)
        .join('\n');
      return `
        <div class="status-section-box">
          <div class="status-section-title"><span style="color:#2563eb; margin-left:6px;">◆</span>${cleanTitle}</div>
          <div class="status-section-body">${redactedContent || ''}</div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${statusDocTitle.replace(/\s+/g, '_')}_${displayName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap');
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            font-family: 'Rubik', Arial, sans-serif;
            direction: rtl;
            text-align: right;
            color: #243b47;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.55;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .stained-glass-strip {
            height: 6px;
            width: 100%;
            background: linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);
            border-radius: 6px 6px 0 0;
          }
          .print-banner {
            background: linear-gradient(135deg, #2b4c73 0%, #3b6ea5 55%, #6b46c1 100%);
            color: #ffffff;
            padding: 14px 20px;
            border-bottom: 4px solid #c5aef2;
            border-radius: 0 0 10px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .print-banner-center {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .print-logo {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #d6c6f7;
            background: #f4f7fc;
          }
          .doc-main-title {
            margin: 0;
            font-size: 19px;
            font-weight: 700;
            color: #ffffff;
          }
          .doc-meta-side {
            font-size: 12.5px;
            color: #f5f0ff;
          }
          .student-details-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 18px;
            padding: 10px 14px;
            border: 1.5px solid #5b9bd5;
            border-right: 5px solid #3b6ea5;
            background: #eef3fb;
            border-radius: 8px;
            margin-bottom: 14px;
            font-size: 13px;
          }
          .status-section-box {
            border: 1px solid #cbd5e1;
            border-right: 4px solid #3b6ea5;
            background: #fbfdff;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .status-section-title {
            font-weight: 700;
            font-size: 14px;
            color: #1e3a5f;
            margin-bottom: 4px;
          }
          .status-section-body {
            white-space: pre-line;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.55;
          }
          .signatures-row {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            font-weight: 600;
            color: #2b4c73;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="stained-glass-strip"></div>
        <div class="print-banner">
          <div class="doc-meta-side"><strong>תאריך:</strong> ${formData.date || '__________'}</div>
          <div class="print-banner-center">
            <img src="${logoUrl}" alt="TALA Logo" class="print-logo" />
            <h1 class="doc-main-title">${statusDocTitle}</h1>
          </div>
          <div class="doc-meta-side"><strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}</div>
        </div>

        <div class="student-details-bar">
          <div><strong>שם הילד/ה:</strong> ${displayName}</div>
          <div><strong>ת.ז:</strong> ${displayId}</div>
          <div><strong>ת.ל:</strong> ${displayBirthDate}</div>
          <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
          ${formData.planType ? `<div><strong>סוג תוכנית:</strong> ${formData.planType}</div>` : ''}
          ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
          ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
        </div>

        ${sectionsHtml}

        <div class="signatures-row">
          <div>חתימת צוות חינוכי: _________________________</div>
          <div>חתימת הורים / גורם מקצועי: _________________________</div>
        </div>
      </body>
    </html>
  `;
}
