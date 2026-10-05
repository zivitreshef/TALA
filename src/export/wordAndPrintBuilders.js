import {
  toHebrewAcronym,
  maskSensitiveValue,
  redactStudentNameInText
} from '../domain/privacyAndAcronyms';
import { generateStatusReportLocally } from '../domain/statusReportGenerator';
import {
  isTalaPlanType,
  TALA_FOCUS_DOMAINS,
  buildDefaultTalaProfileRows
} from '../goalBankData';

export function getAdditionalMetadataItems(formData = {}, hideDetails = false) {
  const rawItems = [
    { label: 'בית הספר', value: formData.schoolName, sensitive: true },
    { label: 'כיתה', value: formData.gradeClass, sensitive: false },
    { label: 'מחנכת', value: formData.homeroomTeacher, sensitive: false },
    { label: 'מורת שילוב', value: formData.integrationTeacher, sensitive: false },
    { label: 'שותפים נוספים לכתיבת התוכנית', value: formData.additionalPartners, sensitive: false },
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
  const generalBackground = getRedactedText(
    formData.studentGeneralBackground,
    formData,
    hideDetails
  ).trim();
  const supportReceived = getRedactedText(
    formData.studentSupportReceived,
    formData,
    hideDetails
  ).trim();
  const studentMainGoal = getRedactedText(
    formData.studentMainGoal,
    formData,
    hideDetails
  ).trim();

  return { generalBackground, supportReceived, studentMainGoal };
}

export function getEffectiveTalaProfileRows(formData = {}) {
  return buildDefaultTalaProfileRows(formData.talaProfileRows);
}

export function hasPopulatedTalaProfile(formData = {}) {
  const rows = getEffectiveTalaProfileRows(formData);
  return rows.some(
    (r) =>
      String(r?.strengthsAndFacilitators || '').trim().length > 0 ||
      String(r?.areasToStrengthenAndBarriers || '').trim().length > 0
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

  const talaProfile = getEffectiveStudentProfileForTala(formData, hideDetails);
  const profileRows = getEffectiveTalaProfileRows(formData);
  const focusDomains = Array.isArray(formData.talaFocusDomains) ? formData.talaFocusDomains : [];

  const talaProfileTablePrintHtml = isTala
    ? `
      <div style="margin-bottom: 14px;">
        <div style="border: 1.5px solid #7997be; background: #ffffff; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
          <div style="margin-bottom: 8px;">
            <strong>רקע על התלמיד (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי):</strong>
            <div style="white-space: pre-line; margin-top: 2px;">${talaProfile.generalBackground || '—'}</div>
          </div>
          <div style="margin-bottom: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
            <strong>התמיכה שמקבל התלמיד (לימודי, רגשי, חברתי):</strong>
            <div style="white-space: pre-line; margin-top: 2px;">${talaProfile.supportReceived || '—'}</div>
          </div>
          <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px;">
            <strong>מטרות של התלמיד (לאחר שיח אישי):</strong>
            <div style="white-space: pre-line; margin-top: 2px;">${talaProfile.studentMainGoal || '—'}</div>
          </div>
        </div>

        <h3 style="margin: 0 0 6px 0; font-size: 14.5px; color: #1e3a5f;">
          פרופיל - תיאור תפקוד של התלמיד *
        </h3>
        <table class="eco-table" style="margin-bottom: 6px;">
          <thead>
            <tr class="columns-header-row">
              <th colspan="2" style="width: 24%;">תחום</th>
              <th style="width: 38%;">מוקדי כוח וגורמים מסייעים<br/><span class="th-sub">(סביבה לימודית, מאפיינים פיזיים ורגשיים, קשר עם מבוגר/חבר, הנגשה טכנולוגית, רמת תיווך)</span></th>
              <th style="width: 38%;">מוקדים לחיזוק וגורמים מגבילים<br/><span class="th-sub">(סביבה לימודית, מאפיינים פיזיים ורגשיים, קשר עם מבוגר/חבר, הנגשה טכנולוגית, רמת תיווך)</span></th>
            </tr>
          </thead>
          <tbody>
            ${profileRows
              .map((row, idx) => {
                const isFirstBehavioral = idx === 0;
                const isFirstAcademic = idx === 3;
                const categoryCell = isFirstBehavioral
                  ? `<td rowspan="3" style="background: #d9d9d9; font-weight: 700; text-align: center; vertical-align: middle; width: 10%;">התנהגותי - רגשי - חברתי</td>`
                  : isFirstAcademic
                  ? `<td rowspan="5" style="background: #d9d9d9; font-weight: 700; text-align: center; vertical-align: middle; width: 10%;">לימודי</td>`
                  : '';
                return `
                  <tr>
                    ${categoryCell}
                    <td style="background: ${row.bg || '#f8faff'}; font-weight: 700; width: 14%; vertical-align: middle;">${row.subDomain}</td>
                    <td>${getRedactedText(row.strengthsAndFacilitators, formData, hideDetails)}</td>
                    <td>${getRedactedText(row.areasToStrengthenAndBarriers, formData, hideDetails)}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
        <div style="font-size: 11px; color: #475569; margin-bottom: 12px;">
          * תוך התייחסות לסביבות למידה שונות: שיעורים מקצועיים, פעילויות חוץ בית ספריות, טיולים, הפסקות ועוד.
        </div>
      </div>
    `
    : '';

  const topSummarySectionHtml = isTala
    ? talaProfileTablePrintHtml
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

  const focusDomainsPrintHtml = isTala
    ? `
      <div style="margin-bottom: 10px; padding: 8px 12px; background: #eef3fb; border: 1.5px solid #5b9bd5; border-radius: 8px; font-size: 12.5px;">
        <strong>תכנית עבודה — סמן את התחומים הנבחרים בהם מתמקדת התכנית האישית:</strong>
        <div style="display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px;">
          ${TALA_FOCUS_DOMAINS.map((dom) => {
            const checked = focusDomains.includes(dom);
            return `<span style="font-weight: ${checked ? '700' : '400'}; color: ${checked ? '#1e3a5f' : '#475569'};">${checked ? '☑' : '☐'} ${dom}</span>`;
          }).join('')}
        </div>
      </div>
    `
    : '';

  const goalsRowsHtml = isTala
    ? `
      ${focusDomainsPrintHtml}
      <table class="eco-table">
        <thead>
          <tr class="columns-header-row">
            <th rowspan="2" style="width: 16%; vertical-align: middle;">מטרה</th>
            <th rowspan="2" style="width: 20%; vertical-align: middle;">יעדים ולו"ז</th>
            <th colspan="3" style="width: 34%; vertical-align: middle;">האמצעים לביצוע תוכנית הפעולה על-ידי :</th>
            <th rowspan="2" style="width: 15%; vertical-align: middle;">אמות מידה להערכה</th>
            <th rowspan="2" style="width: 15%; vertical-align: middle;">התאמות ללמידה ובדרכי ההיבחנות</th>
          </tr>
          <tr class="columns-header-row">
            <th style="width: 12%;">מחנכת</th>
            <th style="width: 11%;">מורת שילוב</th>
            <th style="width: 11%;">מטפלת באומנויות</th>
          </tr>
        </thead>
        <tbody>
          ${(formData.goals || [])
            .map((g) => {
              const envText = g.environment ? `תחום: ${g.environment}\n` : '';
              const titleText = getRedactedText(g.title, formData, hideDetails);
              const objectivesText = getRedactedText(g.objectives, formData, hideDetails);
              const durationText = getRedactedText(g.duration, formData, hideDetails);
              const objectivesWithSchedule = [
                objectivesText,
                durationText ? `לו"ז: ${durationText}` : ''
              ]
                .filter(Boolean)
                .join('\n\n');
              const homeroomActions = getRedactedText(g.opportunities, formData, hideDetails);
              const integrationActions = getRedactedText(g.opportunitiesIntegration, formData, hideDetails);
              const therapistActions = getRedactedText(g.opportunitiesTherapist, formData, hideDetails);
              const evaluationText = getRedactedText(g.evaluationCriteria, formData, hideDetails);
              const accommodationsText = getRedactedText(g.learningAccommodations, formData, hideDetails);

              return `
                <tr>
                  <td style="font-weight: 700; color: #0d2b56;">${envText}${titleText || ''}</td>
                  <td>${objectivesWithSchedule || ''}</td>
                  <td>${homeroomActions || ''}</td>
                  <td>${integrationActions || ''}</td>
                  <td>${therapistActions || ''}</td>
                  <td>${evaluationText || ''}</td>
                  <td>${accommodationsText || ''}</td>
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

  const signaturesPrintHtml = isTala
    ? `
      <div class="signatures-row" style="flex-wrap: wrap; gap: 16px;">
        <div>חתימת מנהלת בית הספר: __________________</div>
        <div>חתימת מחנכת הכיתה: __________________</div>
        <div>חתימת ההורים: __________________</div>
        <div>חתימת התלמיד/ה: __________________</div>
      </div>
    `
    : `
      <div class="signatures-row">
        <div>חתימת צוות חינוכי: _________________________</div>
        <div>חתימת הורים: _________________________</div>
      </div>
    `;

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
          ${signaturesPrintHtml}
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
  const talaGeneralBgHtml = (talaProfile.generalBackground || '—').replace(/\n/g, '<br/>');
  const talaSupportHtml = (talaProfile.supportReceived || '—').replace(/\n/g, '<br/>');
  const talaMainGoalHtml = (talaProfile.studentMainGoal || '—').replace(/\n/g, '<br/>');
  const profileRows = getEffectiveTalaProfileRows(formData);
  const focusDomains = Array.isArray(formData.talaFocusDomains) ? formData.talaFocusDomains : [];

  const talaWordProfileSectionHtml = isTala
    ? `
      <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:12pt; font-family:Arial, sans-serif; font-size:10.5pt;">
        <tr>
          <td style="border:1px solid #7997be; padding:6pt; text-align:right;">
            <strong>רקע על התלמיד (משפחה, אבחנה, טיפול במידה וישנו, מידע הכרחי):</strong><br/>${talaGeneralBgHtml}
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #7997be; padding:6pt; text-align:right;">
            <strong>התמיכה שמקבל התלמיד (לימודי, רגשי, חברתי):</strong><br/>${talaSupportHtml}
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #7997be; padding:6pt; text-align:right;">
            <strong>מטרות של התלמיד (לאחר שיח אישי):</strong><br/>${talaMainGoalHtml}
          </td>
        </tr>
      </table>

      <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt;">פרופיל - תיאור תפקוד של התלמיד *</div>
      <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:4pt; font-family:Arial, sans-serif; font-size:10pt;">
        <tr style="background-color:#eaf3fc; color:#2b4c73; font-weight:bold; text-align:center;">
          <th colspan="2" style="width:24%; border:1px solid #7997be; padding:6pt;">תחום</th>
          <th style="width:38%; border:1px solid #7997be; padding:6pt;">מוקדי כוח וגורמים מסייעים<br/><span style="font-weight:normal; font-size:8.5pt;">(סביבה לימודית, מאפיינים פיזיים ורגשיים, קשר עם מבוגר/חבר, הנגשה טכנולוגית, רמת תיווך)</span></th>
          <th style="width:38%; border:1px solid #7997be; padding:6pt;">מוקדים לחיזוק וגורמים מגבילים<br/><span style="font-weight:normal; font-size:8.5pt;">(סביבה לימודית, מאפיינים פיזיים ורגשיים, קשר עם מבוגר/חבר, הנגשה טכנולוגית, רמת תיווך)</span></th>
        </tr>
        ${profileRows
          .map((row, idx) => {
            const isFirstBehavioral = idx === 0;
            const isFirstAcademic = idx === 3;
            const categoryCell = isFirstBehavioral
              ? `<td rowspan="3" style="width:10%; border:1px solid #7997be; padding:6pt; background-color:#d9d9d9; font-weight:bold; text-align:center; vertical-align:middle;">התנהגותי - רגשי - חברתי</td>`
              : isFirstAcademic
              ? `<td rowspan="5" style="width:10%; border:1px solid #7997be; padding:6pt; background-color:#d9d9d9; font-weight:bold; text-align:center; vertical-align:middle;">לימודי</td>`
              : '';
            const strengthsHtml = (getRedactedText(row.strengthsAndFacilitators, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const barriersHtml = (getRedactedText(row.areasToStrengthenAndBarriers, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            return `
              <tr>
                ${categoryCell}
                <td style="width:14%; border:1px solid #7997be; padding:6pt; background-color:${row.bg || '#f8faff'}; font-weight:bold; vertical-align:middle; text-align:right;">${row.subDomain}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${strengthsHtml}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${barriersHtml}</td>
              </tr>
            `;
          })
          .join('')}
      </table>
      <div style="font-size:9pt; color:#475569; margin-bottom:12pt;">
        * תוך התייחסות לסביבות למידה שונות: שיעורים מקצועיים, פעילויות חוץ בית ספריות, טיולים, הפסקות ועוד.
      </div>
    `
    : '';

  const focusDomainsWordHtml = isTala
    ? `
      <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:6pt 10pt; margin-bottom:8pt; font-size:10.5pt;">
        <strong>תכנית עבודה — סמן את התחומים הנבחרים בהם מתמקדת התכנית האישית:</strong><br/>
        ${TALA_FOCUS_DOMAINS.map((dom) => {
          const checked = focusDomains.includes(dom);
          return `<span style="margin-left:12pt; font-weight:${checked ? 'bold' : 'normal'};">${checked ? '☑' : '☐'} ${dom}</span>`;
        }).join(' &nbsp; ')}
      </div>
    `
    : '';

  const goalsRowsHtml = isTala
    ? `
      ${focusDomainsWordHtml}
      <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #7997be; margin-bottom:14pt; font-family: Arial, sans-serif; font-size: 10pt;">
        <tr style="background-color:#eaf3fc; color:#2b4c73; font-weight:bold; text-align:center;">
          <th rowspan="2" style="width:16%; border:1px solid #7997be; padding:6pt; vertical-align:middle;">מטרה</th>
          <th rowspan="2" style="width:20%; border:1px solid #7997be; padding:6pt; vertical-align:middle;">יעדים ולו"ז</th>
          <th colspan="3" style="width:34%; border:1px solid #7997be; padding:6pt; vertical-align:middle;">האמצעים לביצוע תוכנית הפעולה על-ידי :</th>
          <th rowspan="2" style="width:15%; border:1px solid #7997be; padding:6pt; vertical-align:middle;">אמות מידה להערכה</th>
          <th rowspan="2" style="width:15%; border:1px solid #7997be; padding:6pt; vertical-align:middle;">התאמות ללמידה ובדרכי ההיבחנות</th>
        </tr>
        <tr style="background-color:#eaf3fc; color:#2b4c73; font-weight:bold; text-align:center;">
          <th style="width:12%; border:1px solid #7997be; padding:6pt;">מחנכת</th>
          <th style="width:11%; border:1px solid #7997be; padding:6pt;">מורת שילוב</th>
          <th style="width:11%; border:1px solid #7997be; padding:6pt;">מטפלת באומנויות</th>
        </tr>
        ${(formData.goals || [])
          .map((g) => {
            const envPrefix = g.environment ? `<div style="font-size:9pt; color:#1e3a5f; margin-bottom:2pt;">תחום: ${g.environment}</div>` : '';
            const titleText = (getRedactedText(g.title, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const objectivesText = (getRedactedText(g.objectives, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const durationText = (getRedactedText(g.duration, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const objectivesWithSchedule = [
              objectivesText,
              durationText ? `<strong>לו"ז:</strong> ${durationText}` : ''
            ]
              .filter(Boolean)
              .join('<br/><br/>');
            const homeroomActions = (getRedactedText(g.opportunities, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const integrationActions = (getRedactedText(g.opportunitiesIntegration, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const therapistActions = (getRedactedText(g.opportunitiesTherapist, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const evaluationText = (getRedactedText(g.evaluationCriteria, formData, hideDetails) || '').replace(/\n/g, '<br/>');
            const accommodationsText = (getRedactedText(g.learningAccommodations, formData, hideDetails) || '').replace(/\n/g, '<br/>');

            return `
              <tr>
                <td style="border:1px solid #7997be; padding:6pt; font-weight:bold; color:#0d2b56; vertical-align:top; text-align:right;">
                  ${envPrefix}${titleText}
                </td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${objectivesWithSchedule}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${homeroomActions}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${integrationActions}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${therapistActions}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${evaluationText}</td>
                <td style="border:1px solid #7997be; padding:6pt; vertical-align:top; text-align:right;">${accommodationsText}</td>
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
    ? talaWordProfileSectionHtml
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

  const signaturesWordHtml = isTala
    ? `
      <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:10.5pt;">
        <tr>
          <td style="width:25%; text-align:right;">חתימת מנהלת ביה"ס: ______________</td>
          <td style="width:25%; text-align:right;">חתימת מחנכת הכיתה: ______________</td>
          <td style="width:25%; text-align:right;">חתימת ההורים: ______________</td>
          <td style="width:25%; text-align:right;">חתימת התלמיד/ה: ______________</td>
        </tr>
      </table>
    `
    : `
      <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
        <tr>
          <td style="width:50%; text-align:right;">חתימת צוות חינוכי: _________________________</td>
          <td style="width:50%; text-align:left;">חתימת הורים: _________________________</td>
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

        ${signaturesWordHtml}
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
