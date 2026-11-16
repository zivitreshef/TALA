import {
  toHebrewAcronym,
  maskSensitiveValue,
  redactStudentNameInText,
  escapeHtml,
  decodeHtmlEntities
} from '../domain/privacyAndAcronyms';
import { generateStatusReportLocally } from '../domain/statusReportGenerator';
import {
  isTalaPlanType,
  TALA_FOCUS_DOMAINS,
  buildDefaultTalaProfileRows
} from '../goalBankData';
import { formatDateWithPreferences } from '../domain/userPreferences';
import {
  generateBaselineBarChartSvg,
  generateFunctionDistributionSvg,
  generateProgressMonitoringDualLineSvg,
  generateDurationIntensitySvg,
  generateReplacementLearningCurveSvg,
  BEHAVIOR_FUNCTION_HEBREW_LABELS
} from './behaviorChartsSvg';
import {
  computeHourlyHeatmapMatrix,
  computeAbcSequenceSummary,
  computeDurationAndIntensityData,
  computeReplacementSkillCurve,
  computeStaffFidelityMetrics
} from '../domain/behaviorAnalysis';

export function getDisplayReportDate(formData: any = {}) {
  if (!formData.date) return '__________';
  return formatDateWithPreferences(formData.date, formData.reportDateFormat || 'both') || formData.date;
}

export function getTeacherMetaBadge(formData: any = {}) {
  if (!formData.teacherName) return '';
  const parts = [
    formData.teacherName,
    formData.teacherTitle ? `(${formData.teacherTitle})` : '',
    formData.institutionalAffiliation ? `• ${formData.institutionalAffiliation}` : ''
  ].filter(Boolean);
  return `<div><strong>עורך/ת התוכנית:</strong> ${parts.join(' ')}</div>`;
}

export function getTeacherMetaWordText(formData: any = {}) {
  if (!formData.teacherName) return '';
  const parts = [
    formData.teacherName,
    formData.teacherTitle ? `(${formData.teacherTitle})` : '',
    formData.institutionalAffiliation ? `• ${formData.institutionalAffiliation}` : ''
  ].filter(Boolean);
  return ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>עורך/ת התוכנית:</strong> ${parts.join(' ')}`;
}

export function getTeacherSignaturePrintBlock(formData: any = {}, defaultRole = 'צוות חינוכי') {
  const role = formData.teacherTitle || defaultRole;
  const name = formData.teacherName || '';
  const aff = formData.institutionalAffiliation || '';
  const meta = [name, aff].filter(Boolean).join(' • ');

  if (formData.signatureImage) {
    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
        <div>חתימת ${role}:</div>
        <img src="${formData.signatureImage}" alt="חתימה" style="max-height: 42px; max-width: 120px; object-fit: contain; mix-blend-mode: multiply; background-color: transparent;" />
        ${name ? `<div style="font-size: 11px; font-weight: 700; color: #1e3a5f;">${name}</div>` : ''}
        ${aff ? `<div style="font-size: 9.5px; color: #64748b;">${aff}</div>` : ''}
      </div>
    `;
  }

  if (name) {
    return `<div>חתימת ${role} (${meta}): _________________________</div>`;
  }

  return `<div>חתימת ${role}: _________________________</div>`;
}

export function getTeacherSignatureWordCell(formData: any = {}, defaultRole = 'צוות חינוכי') {
  const role = formData.teacherTitle || defaultRole;
  const name = formData.teacherName || '';
  const aff = formData.institutionalAffiliation || '';
  const meta = [name, aff].filter(Boolean).join(' • ');

  if (name) {
    return `חתימת ${role} (${meta}): ______________`;
  }
  return `חתימת ${role}: ______________`;
}

export function getAdditionalMetadataItems(formData: any = {}, hideDetails = false) {
  const isKindergarten = formData.stage === 'kindergarten';
  const rawItems = [
    { label: isKindergarten ? 'גן' : 'בית הספר', value: formData.schoolName, sensitive: true },
    { label: isKindergarten ? 'שלב גן' : 'כיתה', value: formData.gradeClass, sensitive: false },
    { label: isKindergarten ? 'גננת' : 'מחנכת', value: formData.homeroomTeacher, sensitive: false },
    { label: isKindergarten ? 'גננת שילוב' : 'מורת שילוב', value: formData.integrationTeacher, sensitive: false },
    { label: 'שותפים נוספים לכתיבת התוכנית', value: formData.additionalPartners, sensitive: false },
    { label: 'תומכת למידה', value: formData.learningSupportAssistant, sensitive: false },
    { label: 'יועצת', value: formData.counselorName, sensitive: false },
    { label: 'פסיכולוגית', value: formData.psychologistName, sensitive: false },
    { label: 'מתכללת מטעם המתי"א', value: formData.matyaCoordinator, sensitive: false },
    { label: 'מטפלת רגשית', value: formData.emotionalTherapist, sensitive: false },
    { label: 'צוות פרא-רפואי', value: formData.paraMedicalTeam, sensitive: false }
  ];
  return rawItems
    .filter((item) => String(item.value || '').trim().length > 0)
    .map((item) => ({
      label: item.label,
      value: item.sensitive && hideDetails ? maskSensitiveValue(item.value) : escapeHtml(String(item.value).trim())
    }));
}

export function getEffectiveStudentProfileForTala(formData: any = {}, hideDetails = false) {
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

export function getEffectiveTalaProfileRows(formData: any = {}) {
  return buildDefaultTalaProfileRows(formData.talaProfileRows);
}

export function hasPopulatedTalaProfile(formData: any = {}) {
  const rows = getEffectiveTalaProfileRows(formData);
  return rows.some(
    (r) =>
      String(r?.strengthsAndFacilitators || '').trim().length > 0 ||
      String(r?.areasToStrengthenAndBarriers || '').trim().length > 0
  );
}

export function getFullDocTitle(formData: any = {}) {
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

export function getBehaviorAssessmentTitle() {
  return 'דוח הערכת תפקוד התנהגותי';
}

export function getBehaviorPlanTitle() {
  return 'תוכנית התערבות התנהגותית';
}

export function getBehaviorProgressReportTitle(period?: string) {
  if (period === 'mid_year') {
    return 'דוח סיכום והערכת התקדמות התנהגותית - אמצע שנה';
  }
  if (period === 'end_year') {
    return 'דוח סיכום והערכת התקדמות התנהגותית - סוף שנה';
  }
  return 'דוח סיכום והערכת התקדמות התנהגותית תקופתי';
}

export function getDisplayStudentName(formData: any = {}, hideDetails = false) {
  if (hideDetails) {
    return toHebrewAcronym(formData.name);
  }
  return escapeHtml(formData.name || '__________');
}

export function getDisplayMaskedField(val: any, hideDetails = false) {
  if (hideDetails) {
    return maskSensitiveValue(val);
  }
  return val || '__________';
}

export function getRedactedText(
  text: any,
  formData: any = {},
  hideDetails = false,
  shouldEscape = true
) {
  const safeText = typeof text === 'string'
    ? text
    : (Array.isArray(text)
        ? text.map((item) => (typeof item === 'string' ? item : (item?.text || item?.title || String(item ?? '')))).join('\n')
        : (text !== null && text !== undefined ? String(text) : ''));
  const decoded = decodeHtmlEntities(safeText);
  const redacted = redactStudentNameInText(decoded, formData?.name, hideDetails);
  return shouldEscape ? escapeHtml(redacted) : redacted;
}

export function getSafeReportFilename(formData: any = {}, hideDetails = false, ext = 'doc', mode = 'tala') {
  const displayName = getDisplayStudentName(formData, hideDetails).replace(/[^a-zA-Z0-9א-ת_-]/g, '_');
  const yearStr = (formData.schoolYear || '2026').replace(/[^a-zA-Z0-9א-ת_-]/g, '_');
  const prefix =
    mode === 'status'
      ? 'דוח_מצב'
      : mode === 'eval'
      ? 'דוח_הערכת_מחצית_וסוף_שנה'
      : mode === 'behavior_assessment'
      ? 'דוח_הערכת_תפקוד_התנהגותי'
      : mode === 'behavior_plan'
      ? 'תוכנית_התערבות_התנהגותית'
      : 'תוכנית_עבודה';
  return `${prefix}_${displayName}_${yearStr}.${ext}`;
}

export function getActiveStatusReportSections(formData: any = {}) {
  const existing = Array.isArray(formData.statusReportSections)
    ? formData.statusReportSections.filter((s: any) => s && (s.content || '').trim())
    : [];
  if (existing.length > 0) return existing;
  return generateStatusReportLocally(formData);
}

export function openHtmlPrintWindow(htmlString: string) {
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

export function buildWorkPlanPrintHtml(formData: any = {}, hideDetails = false, logoUrl = '') {
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
            .map((g: any) => {
              const envText = g.environment ? `תחום: ${escapeHtml(g.environment)}\n` : '';
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
        .map((g: any) => {
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
                    <div><strong>סביבה:</strong> ${escapeHtml(g.environment || '__________')}</div>
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
        ${getTeacherSignaturePrintBlock(formData, 'מחנכת/מורת שילוב')}
        <div>חתימת מנהלת בית הספר: __________________</div>
        <div>חתימת ההורים: __________________</div>
        <div>חתימת התלמיד/ה: __________________</div>
      </div>
    `
    : `
      <div class="signatures-row">
        ${getTeacherSignaturePrintBlock(formData, 'צוות חינוכי')}
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
        ${formData.showBesad ? `
          <div class="print-besad-header" style="text-align: left; font-size: 11pt; font-weight: bold; color: #475569; padding-left: 6px; margin-bottom: 2px; font-family: 'Rubik', Arial, sans-serif;">
            ${formData.besadText || 'בס"ד'}
          </div>
        ` : ''}
        <div class="stained-glass-strip"></div>
        <div class="print-banner">
          <div class="doc-meta-side"><strong>תאריך:</strong> ${getDisplayReportDate(formData)}</div>
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
          ${getTeacherMetaBadge(formData)}
          ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
          ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
        </div>
        ${additionalMetadataBarHtml}
        ${(() => {
          const docs = Array.isArray(formData.diagnosticDocuments) ? formData.diagnosticDocuments : [];
          if (docs.length === 0) return '';
          return `
            <div class="student-details-bar" style="background: #f0fdf4; border: 1px solid #86efac; border-right: 4px solid #16a34a; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; font-size: 12px;">
              <div style="font-weight: 700; color: #166534; margin-bottom: 3px;">מסמכי אבחון ונספחים שמורים בתיק (${docs.length}):</div>
              <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                ${docs.map((d: any) => `<span>📄 <strong>${d.fileName || 'מסמך'}</strong> (${d.fileType || 'קובץ'}${d.fileSizeFormatted ? ' • ' + d.fileSizeFormatted : ''})</span>`).join('')}
              </div>
            </div>
          `;
        })()}

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

export function buildWordDocumentHtml(formData: any = {}, hideDetails = false) {
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
          .map((g: any) => {
            const envPrefix = g.environment ? `<div style="font-size:9pt; color:#1e3a5f; margin-bottom:2pt;">תחום: ${escapeHtml(g.environment)}</div>` : '';
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
        .map((g: any) => {
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
                  <div><strong>סביבה:</strong> ${escapeHtml(g.environment || '__________')}</div>
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
          <td style="width:25%; text-align:right;">${getTeacherSignatureWordCell(formData, 'מחנכת הכיתה')}</td>
          <td style="width:25%; text-align:right;">חתימת ההורים: ______________</td>
          <td style="width:25%; text-align:right;">חתימת התלמיד/ה: ______________</td>
        </tr>
      </table>
    `
    : `
      <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
        <tr>
          <td style="width:50%; text-align:right;">${getTeacherSignatureWordCell(formData, 'צוות חינוכי')}</td>
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
            <strong>תאריך:</strong> ${getDisplayReportDate(formData)} &nbsp;|&nbsp;
            <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
          </div>
        </div>

        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
          <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          ${getTeacherMetaWordText(formData)}
          ${formData.address ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
          ${formData.phone ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
        </div>
        ${additionalWordBarHtml}
        ${(() => {
          const docs = Array.isArray(formData.diagnosticDocuments) ? formData.diagnosticDocuments : [];
          if (docs.length === 0) return '';
          return `
            <div style="background-color:#f0fdf4; border:1px solid #86efac; padding:6pt 12pt; margin-bottom:12pt; font-size:10pt;">
              <strong style="color:#166534;">מסמכי אבחון ונספחים שמורים בתיק (${docs.length}):</strong><br/>
              ${docs.map((d: any) => `📄 <strong>${d.fileName || 'מסמך'}</strong> (${d.fileType || 'קובץ'}${d.fileSizeFormatted ? ' • ' + d.fileSizeFormatted : ''})`).join(' &nbsp;|&nbsp; ')}
            </div>
          `;
        })()}

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

export function buildEvalWordDocumentHtml(formData: any = {}, hideDetails = false) {
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
    .map((g: any, idx: number) => {
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
            <strong>תאריך:</strong> ${getDisplayReportDate(formData)} &nbsp;|&nbsp;
            <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
          </div>
        </div>

        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
          <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          ${getTeacherMetaWordText(formData)}
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

        ${(() => {
          const completedTasks = (Array.isArray(formData.pedagogicalTasks)
            ? formData.pedagogicalTasks
            : (Array.isArray(formData.dailyTasks) ? formData.dailyTasks : []))
            .filter((t: any) => t && t.completed);

          const allObservations: any[] = [];
          (formData.goals || []).forEach((g: any) => {
            (g.observations || []).forEach((obs: any) => {
              if (obs && (obs.note || obs.timestamp || obs.date)) {
                allObservations.push({
                  ...obs,
                  goalTitle: g.title,
                  environment: g.environment
                });
              }
            });
          });

          if (completedTasks.length === 0 && allObservations.length === 0) return '';

          return `
            <div style="background-color:#f0fdfa; border:1px solid #99f6e4; padding:8pt 12pt; margin-top:12pt; margin-bottom:12pt; font-size:10pt; text-align:right;">
              <strong style="color:#0f766e;">📌 ראיות מעקב שוטף – משימות ממוקדות ותצפיות שבוצעו לאורך התקופה:</strong>
              ${completedTasks.length > 0 ? `
                <div style="margin-top:4pt; font-weight:bold; color:#134e4a;">משימות פדגוגיות שהושלמו (${completedTasks.length}):</div>
                <ul style="margin:4pt 0 6pt 16pt; padding:0; color:#334155;">
                  ${completedTasks.slice(0, 10).map((t: any) => `<li style="margin-bottom:2pt;">${getRedactedText(t.text, formData, hideDetails)} <span style="color:#64748b; font-size:9pt;">(${t.date || ''}${t.isAiGenerated ? ' • מיקוד AI' : ''})</span></li>`).join('')}
                </ul>
              ` : ''}
              ${allObservations.length > 0 ? `
                <div style="margin-top:4pt; font-weight:bold; color:#134e4a;">תצפיות שטח ומשובי ליווי (${allObservations.length}):</div>
                <ul style="margin:4pt 0 6pt 16pt; padding:0; color:#334155;">
                  ${allObservations.slice(0, 8).map((o: any) => `<li style="margin-bottom:2pt;">[${o.environment || 'כללי'}] ${o.note ? `"${getRedactedText(o.note, formData, hideDetails)}"` : 'תצפית שטח'} <span style="color:#64748b; font-size:9pt;">(${o.date || o.timestamp ? new Date(o.date || o.timestamp).toLocaleDateString('he-IL') : ''}${o.supportLevel ? ` - ${o.supportLevel}` : ''})</span></li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        })()}

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
            <td style="width:50%; text-align:right;">${getTeacherSignatureWordCell(formData, 'צוות חינוכי')}</td>
            <td style="width:50%; text-align:left;">חתימת הורים: _________________________</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

export function buildEvalReportPrintHtml(formData: any = {}, hideDetails = false, logoUrl = '') {
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
    .map((g: any, idx: number) => {
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
          <div class="doc-meta-side"><strong>תאריך:</strong> ${getDisplayReportDate(formData)}</div>
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
          ${getTeacherMetaBadge(formData)}
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

        ${(() => {
          const completedTasks = (Array.isArray(formData.pedagogicalTasks)
            ? formData.pedagogicalTasks
            : (Array.isArray(formData.dailyTasks) ? formData.dailyTasks : []))
            .filter((t: any) => t && t.completed);

          const allObservations: any[] = [];
          (formData.goals || []).forEach((g: any) => {
            (g.observations || []).forEach((obs: any) => {
              if (obs && (obs.note || obs.timestamp || obs.date)) {
                allObservations.push({
                  ...obs,
                  goalTitle: g.title,
                  environment: g.environment
                });
              }
            });
          });

          if (completedTasks.length === 0 && allObservations.length === 0) return '';

          return `
            <div style="background-color:#f0fdfa; border:1px solid #99f6e4; border-radius:8px; padding:10px 14px; margin-top:14px; margin-bottom:14px; font-size:12.5px; text-align:right;">
              <strong style="color:#0f766e; font-size:13px;">📌 ראיות מעקב שוטף – משימות ממוקדות ותצפיות שבוצעו לאורך התקופה:</strong>
              ${completedTasks.length > 0 ? `
                <div style="margin-top:6px; font-weight:bold; color:#134e4a;">משימות פדגוגיות שהושלמו (${completedTasks.length}):</div>
                <ul style="margin:4px 0 6px 18px; padding:0; color:#334155;">
                  ${completedTasks.slice(0, 10).map((t: any) => `<li style="margin-bottom:2px;">${getRedactedText(t.text, formData, hideDetails)} <span style="color:#64748b; font-size:11px;">(${t.date || ''}${t.isAiGenerated ? ' • מיקוד AI' : ''})</span></li>`).join('')}
                </ul>
              ` : ''}
              ${allObservations.length > 0 ? `
                <div style="margin-top:6px; font-weight:bold; color:#134e4a;">תצפיות שטח ומשובי ליווי (${allObservations.length}):</div>
                <ul style="margin:4px 0 6px 18px; padding:0; color:#334155;">
                  ${allObservations.slice(0, 8).map((o: any) => `<li style="margin-bottom:2px;">[${o.environment || 'כללי'}] ${o.note ? `"${getRedactedText(o.note, formData, hideDetails)}"` : 'תצפית שטח'} <span style="color:#64748b; font-size:11px;">(${o.date || o.timestamp ? new Date(o.date || o.timestamp).toLocaleDateString('he-IL') : ''}${o.supportLevel ? ` - ${o.supportLevel}` : ''})</span></li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        })()}

        <div class="recommendations-box">
          <strong>המלצות להמשך:</strong><br/>
          ${getRedactedText(formData.recommendations, formData, hideDetails)}
        </div>
        <div class="signatures-row">
          ${getTeacherSignaturePrintBlock(formData, 'צוות חינוכי')}
          <div>חתימת הורים: _________________________</div>
        </div>
      </body>
    </html>
  `;
}

export function buildStatusReportWordDocumentHtml(formData: any = {}, hideDetails = false) {
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

  const formatBulletLinesForExport = (rawText: any) =>
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
    .map((sec: any) => {
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
            <strong>תאריך:</strong> ${getDisplayReportDate(formData)} &nbsp;|&nbsp;
            <strong>שנת לימודים:</strong> ${formData.schoolYear || '__________'}
          </div>
        </div>

        <div style="background-color:#eef3fb; border:1px solid #5b9bd5; padding:8pt 12pt; margin-bottom:12pt; font-size:11pt;">
          <strong>שם הילד/ה:</strong> ${displayName} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>ת.ל:</strong> ${displayBirthDate} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          ${getTeacherMetaWordText(formData)}
          ${formData.address ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
          ${formData.phone ? ` &nbsp;&nbsp;|&nbsp;&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
        </div>

        ${sectionsHtml}

        <table dir="rtl" border="0" style="width:100%; margin-top:18pt; font-weight:bold; color:#2b4c73; font-size:11pt;">
          <tr>
            <td style="width:50%; text-align:right;">${getTeacherSignatureWordCell(formData, 'צוות חינוכי')}</td>
            <td style="width:50%; text-align:left;">חתימת הורים / גורם מקצועי: _________________________</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

export function buildStatusReportPrintHtml(formData: any = {}, hideDetails = false, logoUrl = '') {
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
    .map((sec: any) => {
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
          <div class="doc-meta-side"><strong>תאריך:</strong> ${getDisplayReportDate(formData)}</div>
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
          ${getTeacherMetaBadge(formData)}
          ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
          ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
        </div>

        ${sectionsHtml}

        <div class="signatures-row">
          ${getTeacherSignaturePrintBlock(formData, 'צוות חינוכי')}
          <div>חתימת הורים / גורם מקצועי: _________________________</div>
        </div>
      </body>
    </html>
  `;
}

// ============================================================================
// Behavior Assessment & Behavior Intervention Plan (Stage 4 Export Builders)
// ============================================================================

export function buildBehaviorAssessmentWordDocumentHtml(formData: any = {}, hideDetails = false) {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const docTitle = getBehaviorAssessmentTitle();

  const report = formData.behaviorAssessment || formData || {};
  const assessorName = report.assessorName || formData.teacherName || 'מנתחת התנהגות מוסמכת';
  const assessmentDate = report.assessmentDate || formData.reportDate || formData.date || '__________';

  const backgroundText = getRedactedText(report.backgroundInfo || formData.studentGeneralBackground || '—', formData, hideDetails);
  const antecedentText = getRedactedText(report.antecedentAnalysis || '—', formData, hideDetails);
  const hypothesisNarrative = getRedactedText(report.functionalHypothesisNarrative || '—', formData, hideDetails);
  const recommendationsText = getRedactedText(report.initialRecommendations || '—', formData, hideDetails);

  const targetBehaviors: any[] = Array.isArray(report.targetBehaviors) ? report.targetBehaviors : [];
  const baselineData: any[] = Array.isArray(report.baselineData) ? report.baselineData : [];

  const measurementLabels: Record<string, string> = {
    frequency: 'תדירות',
    duration: 'משך זמן',
    interval: 'מרווחי זמן'
  };

  const targetsHtml = targetBehaviors.length > 0
    ? targetBehaviors.map((t, idx) => `
        <tr>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e3a5f; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e293b;">${escapeHtml(t.name || '—')}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt;">${getRedactedText(t.operationalDefinition || '—', formData, hideDetails)}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center;">${measurementLabels[t.measurementType] || 'תדירות'}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center;">${t.baselineAverage ?? '—'}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center; font-weight:bold; color:#2563eb;">${t.targetGoal ?? '—'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#64748b;">טרם הוגדרו התנהגויות יעד</td></tr>`;

  // Baseline statistics
  const baselineValues = baselineData.map((b) => Number(b.value) || 0);
  const baselineSum = baselineValues.reduce((a, b) => a + b, 0);
  const baselineAvg = baselineValues.length > 0 ? Math.round((baselineSum / baselineValues.length) * 10) / 10 : 0;
  const baselineMin = baselineValues.length > 0 ? Math.min(...baselineValues) : 0;
  const baselineMax = baselineValues.length > 0 ? Math.max(...baselineValues) : 0;

  const baselineRowsHtml = baselineData.length > 0
    ? baselineData.map((b, idx) => `
        <tr>
          <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center;">${escapeHtml(b.date || '—')}</td>
          <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center;">${escapeHtml(b.sessionOrPeriod || '—')}</td>
          <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center; font-weight:bold; color:#1e40af;">${b.value ?? 0}</td>
          <td style="border:1px solid #cbd5e1; padding:5pt;">${getRedactedText(b.notes || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#64748b;">טרם נרשמו נתוני תצפית לקו בסיס</td></tr>`;

  const mainFunctionLabel = BEHAVIOR_FUNCTION_HEBREW_LABELS[report.mainHypothesizedFunction || 'escape'] || 'הימנעות ממטלה';
  const baselineChartSvg = generateBaselineBarChartSvg(baselineData, { isPrint: true });

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40"
          lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle} - ${displayName}</title>
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
        <div style="background-color:#1e3a5f; color:#ffffff; padding:12pt 16pt; margin-bottom:10pt; text-align:center;">
          <h1 style="margin:0; font-size:16pt;">${docTitle}</h1>
          <div style="font-size:10.5pt; margin-top:4pt;">משרד החינוך • השירות הפסיכולוגי החינוכי ומתי"א • הערכת תפקוד התנהגותי</div>
        </div>

        <div style="background-color:#f8fafc; border:1px solid #3b82f6; border-right:4px solid #1d4ed8; padding:8pt 12pt; margin-bottom:12pt; font-size:10.5pt;">
          <strong>שם התלמיד/ה:</strong> ${displayName} &nbsp;|&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;|&nbsp;
          <strong>תאריך לידה:</strong> ${displayBirthDate} &nbsp;|&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          ${formData.gradeClass ? ` &nbsp;|&nbsp; <strong>כיתה:</strong> ${escapeHtml(formData.gradeClass)}` : ''}
          <br/>
          <strong>תאריך הערכה:</strong> ${assessmentDate} &nbsp;|&nbsp;
          <strong>מנתחת התנהגות:</strong> ${escapeHtml(assessorName)}
          ${formData.address ? ` &nbsp;|&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
          ${formData.phone ? ` &nbsp;|&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
        </div>

        <!-- 1. Background & Diagnostics -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          1. רקע פדגוגי, מסמכים נלווים ומאפייני התלמיד
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:12pt; font-size:10.5pt; line-height:1.55;">
          ${backgroundText.replace(/\n/g, '<br/>')}
        </div>

        <!-- 2. Target Behaviors -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          2. התנהגויות מטרה והגדרות אופרציונליות
        </div>
        <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; margin-bottom:12pt; font-size:10pt;">
          <tr style="background-color:#eff6ff; color:#1e40af; font-weight:bold; text-align:center;">
            <th style="width:5%;">#</th>
            <th style="width:22%;">התנהגות יעד</th>
            <th style="width:43%;">הגדרה אופרציונלית מדידה ונצפית</th>
            <th style="width:12%;">שיטת מדידה</th>
            <th style="width:9%;">ממוצע בסיס</th>
            <th style="width:9%;">יעד מבוקש</th>
          </tr>
          ${targetsHtml}
        </table>

        <!-- 3. Baseline Data & Statistics -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          3. נתוני קו בסיס וניתוח כמותי
        </div>
        ${baselineChartSvg}
        <table dir="rtl" border="1" cellspacing="0" cellpadding="5" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; margin-bottom:6pt; font-size:9.5pt;">
          <tr style="background-color:#eff6ff; color:#1e40af; font-weight:bold; text-align:center;">
            <th style="width:6%;">#</th>
            <th style="width:18%;">תאריך</th>
            <th style="width:26%;">שיעור / פעילות</th>
            <th style="width:16%;">מופעים</th>
            <th style="width:34%;">הערות והקשר</th>
          </tr>
          ${baselineRowsHtml}
        </table>
        ${baselineData.length > 0 ? `
          <div style="background-color:#f1f5f9; border:1px solid #cbd5e1; padding:6pt 10pt; margin-bottom:12pt; font-size:10pt;">
            <strong>סיכום סטטיסטי לקו הבסיס:</strong>
            סה"כ מפגשי תצפית: <strong>${baselineData.length}</strong> |
            ממוצע אירועים: <strong>${baselineAvg}</strong> |
            טווח מופעים: <strong>${baselineMin} עד ${baselineMax}</strong>
          </div>
        ` : ''}

        <!-- 4. Antecedents & Hypothesized Function -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          4. ניתוח תנאים מקדימים והשערת תפקוד ההתנהגות
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:8pt; font-size:10.5pt; line-height:1.55;">
          <div style="font-weight:bold; color:#1e40af; margin-bottom:3pt;">תנאים מקדימים וטריגרים סביבתיים:</div>
          ${antecedentText.replace(/\n/g, '<br/>')}
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:8pt; font-size:10.5pt; line-height:1.55;">
          <div style="font-weight:bold; color:#1e40af; margin-bottom:3pt;">תפקוד מרכזי משוער:</div>
          <strong>${mainFunctionLabel}</strong>
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:12pt; font-size:10.5pt; line-height:1.55;">
          <div style="font-weight:bold; color:#1e40af; margin-bottom:3pt;">נרטיב השערה תפקודית:</div>
          ${hypothesisNarrative.replace(/\n/g, '<br/>')}
        </div>

        <!-- 5. Recommendations -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          5. המלצות ראשוניות להתערבות
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:16pt; font-size:10.5pt; line-height:1.55;">
          ${recommendationsText.replace(/\n/g, '<br/>')}
        </div>

        <!-- Signatures -->
        <table dir="rtl" border="0" style="width:100%; margin-top:16pt; font-weight:bold; color:#1e3a5f; font-size:10.5pt;">
          <tr>
            <td style="width:25%; text-align:right;">חתימת מנתחת התנהגות: ______________</td>
            <td style="width:25%; text-align:right;">חתימת מחנכת הכיתה: ______________</td>
            <td style="width:25%; text-align:right;">חתימת שפ"ח / מתי"א: ______________</td>
            <td style="width:25%; text-align:right;">חתימת הורים: ______________</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

export function buildBehaviorAssessmentPrintHtml(formData: any = {}, hideDetails = false, logoUrl = '') {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const docTitle = getBehaviorAssessmentTitle();

  const report = formData.behaviorAssessment || formData || {};
  const assessorName = report.assessorName || formData.teacherName || 'מנתחת התנהגות מוסמכת';
  const assessmentDate = report.assessmentDate || formData.reportDate || formData.date || '__________';

  const backgroundText = getRedactedText(report.backgroundInfo || formData.studentGeneralBackground || '—', formData, hideDetails);
  const antecedentText = getRedactedText(report.antecedentAnalysis || '—', formData, hideDetails);
  const hypothesisNarrative = getRedactedText(report.functionalHypothesisNarrative || '—', formData, hideDetails);
  const recommendationsText = getRedactedText(report.initialRecommendations || '—', formData, hideDetails);

  const targetBehaviors: any[] = Array.isArray(report.targetBehaviors) ? report.targetBehaviors : [];
  const baselineData: any[] = Array.isArray(report.baselineData) ? report.baselineData : [];

  const measurementLabels: Record<string, string> = {
    frequency: 'תדירות',
    duration: 'משך זמן',
    interval: 'מרווחי זמן'
  };

  const targetsHtml = targetBehaviors.length > 0
    ? targetBehaviors.map((t, idx) => `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700; color:#1e293b;">${escapeHtml(t.name || '—')}</td>
          <td>${getRedactedText(t.operationalDefinition || '—', formData, hideDetails)}</td>
          <td style="text-align:center;">${measurementLabels[t.measurementType] || 'תדירות'}</td>
          <td style="text-align:center;">${t.baselineAverage ?? '—'}</td>
          <td style="text-align:center; font-weight:700; color:#2563eb;">${t.targetGoal ?? '—'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="text-align:center; color:#64748b;">טרם הוגדרו התנהגויות יעד</td></tr>`;

  // Baseline statistics
  const baselineValues = baselineData.map((b) => Number(b.value) || 0);
  const baselineSum = baselineValues.reduce((a, b) => a + b, 0);
  const baselineAvg = baselineValues.length > 0 ? Math.round((baselineSum / baselineValues.length) * 10) / 10 : 0;
  const baselineMin = baselineValues.length > 0 ? Math.min(...baselineValues) : 0;
  const baselineMax = baselineValues.length > 0 ? Math.max(...baselineValues) : 0;

  const baselineRowsHtml = baselineData.length > 0
    ? baselineData.map((b, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="text-align:center;">${escapeHtml(b.date || '—')}</td>
          <td style="text-align:center;">${escapeHtml(b.sessionOrPeriod || '—')}</td>
          <td style="text-align:center; font-weight:700; color:#1e40af;">${b.value ?? 0}</td>
          <td>${getRedactedText(b.notes || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="text-align:center; color:#64748b;">טרם נרשמו נתוני תצפית לקו בסיס</td></tr>`;

  const mainFunctionLabel = BEHAVIOR_FUNCTION_HEBREW_LABELS[report.mainHypothesizedFunction || 'escape'] || 'הימנעות ממטלה';

  // Crisp Vector SVG Charts
  const baselineChartSvg = generateBaselineBarChartSvg(baselineData, { isPrint: true });
  const functionDistributionSvg = generateFunctionDistributionSvg(
    undefined,
    report.mainHypothesizedFunction || 'escape',
    baselineSum || 38,
    { isPrint: true }
  );

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${docTitle.replace(/\s+/g, '_')}_${displayName.replace(/\s+/g, '_')}</title>
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
            background: linear-gradient(135deg, #1e3a5f 0%, #2b4c73 55%, #1e40af 100%);
            color: #ffffff;
            padding: 14px 20px;
            border-bottom: 4px solid #93c5fd;
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
            border: 2px solid #93c5fd;
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
            color: #eff6ff;
          }
          .student-details-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            padding: 10px 14px;
            border: 1.5px solid #3b82f6;
            border-right: 5px solid #1d4ed8;
            background: #eff6ff;
            border-radius: 8px;
            margin-bottom: 14px;
            font-size: 12.5px;
          }
          .behavior-section-box {
            border: 1px solid #cbd5e1;
            border-right: 4px solid #2563eb;
            background: #fbfdff;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .behavior-section-title {
            font-weight: 700;
            font-size: 14px;
            color: #1e3a5f;
            margin-bottom: 6px;
          }
          .behavior-section-body {
            white-space: pre-line;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.55;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 12px;
          }
          .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: right;
          }
          .data-table th {
            background-color: #eff6ff;
            color: #1e40af;
            font-weight: 700;
          }
          .signatures-row {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            font-weight: 600;
            color: #1e3a5f;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="stained-glass-strip"></div>
        <div class="print-banner">
          <div class="doc-meta-side"><strong>תאריך:</strong> ${assessmentDate}</div>
          <div class="print-banner-center">
            ${logoUrl ? `<img src="${logoUrl}" alt="TALA Logo" class="print-logo" />` : ''}
            <h1 class="doc-main-title">${docTitle}</h1>
          </div>
          <div class="doc-meta-side"><strong>מנתחת התנהגות:</strong> ${escapeHtml(assessorName)}</div>
        </div>

        <div class="student-details-bar">
          <div><strong>שם התלמיד/ה:</strong> ${displayName}</div>
          <div><strong>ת.ז:</strong> ${displayId}</div>
          <div><strong>ת.ל:</strong> ${displayBirthDate}</div>
          <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
          ${formData.gradeClass ? `<div><strong>כיתה:</strong> ${escapeHtml(formData.gradeClass)}</div>` : ''}
          ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
          ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
        </div>

        <!-- 1. Background -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">1. רקע פדגוגי, מסמכים נלווים ומאפייני התלמיד</div>
          <div class="behavior-section-body">${backgroundText}</div>
        </div>

        <!-- 2. Target Behaviors -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">2. התנהגויות מטרה והגדרות אופרציונליות</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:5%;">#</th>
                <th style="width:22%;">התנהגות יעד</th>
                <th style="width:43%;">הגדרה אופרציונלית מדידה ונצפית</th>
                <th style="width:12%;">שיטת מדידה</th>
                <th style="width:9%;">ממוצע בסיס</th>
                <th style="width:9%;">יעד מבוקש</th>
              </tr>
            </thead>
            <tbody>
              ${targetsHtml}
            </tbody>
          </table>
        </div>

        <!-- 3. Baseline Data & Chart -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">3. נתוני קו בסיס וניתוח כמותי</div>
          ${baselineChartSvg}
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:6%;">#</th>
                <th style="width:18%;">תאריך</th>
                <th style="width:26%;">שיעור / פעילות</th>
                <th style="width:16%;">מופעים</th>
                <th style="width:34%;">הערות והקשר</th>
              </tr>
            </thead>
            <tbody>
              ${baselineRowsHtml}
            </tbody>
          </table>
          ${baselineData.length > 0 ? `
            <div style="background:#f1f5f9; border-radius:6px; padding:6px 10px; margin-top:6px; font-size:12px;">
              <strong>סיכום נתונים:</strong> סה"כ תצפיות: <strong>${baselineData.length}</strong> | ממוצע: <strong>${baselineAvg}</strong> | טווח: <strong>${baselineMin} עד ${baselineMax}</strong>
            </div>
          ` : ''}
        </div>

        <!-- 4. Antecedents & Function -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">4. ניתוח תנאים מקדימים והשערת תפקוד ההתנהגות</div>
          <div style="margin-bottom:8px;">
            <strong>תנאים מקדימים וטריגרים סביבתיים:</strong>
            <div class="behavior-section-body">${antecedentText}</div>
          </div>
          <div style="margin-bottom:8px;">
            <strong>תפקוד מרכזי משוער:</strong> ${mainFunctionLabel}
          </div>
          ${functionDistributionSvg}
          <div style="margin-top:8px;">
            <strong>נרטיב השערה תפקודית:</strong>
            <div class="behavior-section-body">${hypothesisNarrative}</div>
          </div>
        </div>

        <!-- 5. Recommendations -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">5. המלצות ראשוניות להתערבות</div>
          <div class="behavior-section-body">${recommendationsText}</div>
        </div>

        <!-- Signatures -->
        <div class="signatures-row">
          <div>חתימת מנתחת התנהגות: _________________________</div>
          <div>חתימת מחנכת הכיתה: _________________________</div>
          <div>חתימת הורים: _________________________</div>
        </div>
      </body>
    </html>
  `;
}

export function buildBehaviorPlanWordDocumentHtml(formData: any = {}, hideDetails = false) {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const docTitle = getBehaviorPlanTitle();

  const plan = formData.behaviorPlan || formData || {};
  const analystName = plan.analystName || formData.teacherName || 'מנתחת התנהגות מוסמכת';
  const effectiveDate = plan.effectiveDate || formData.reportDate || formData.date || '__________';
  const reviewDate = plan.reviewDate || '__________';

  const antecedentStrategies = getRedactedText(plan.antecedentStrategies || '—', formData, hideDetails);
  const preferredReinforcers = getRedactedText(plan.reinforcementSystem?.preferredReinforcers || '—', formData, hideDetails);
  const scheduleOfReinforcement = getRedactedText(plan.reinforcementSystem?.scheduleOfReinforcement || '—', formData, hideDetails);
  const staffResponse = getRedactedText(plan.reactiveProtocol?.staffResponse || '—', formData, hideDetails);
  const crisisSafetyPlan = getRedactedText(plan.reactiveProtocol?.crisisSafetyPlan || '—', formData, hideDetails);

  const targetBehaviors: any[] = Array.isArray(plan.targetBehaviors) ? plan.targetBehaviors : [];
  const replacementBehaviors: any[] = Array.isArray(plan.replacementBehaviors) ? plan.replacementBehaviors : [];
  const ongoingTracking: any[] = Array.isArray(plan.ongoingTracking) ? plan.ongoingTracking : [];

  const targetsHtml = targetBehaviors.length > 0
    ? targetBehaviors.map((t, idx) => `
        <tr>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e3a5f; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e293b;">${escapeHtml(t.name || '—')}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt;">${getRedactedText(t.operationalDefinition || '—', formData, hideDetails)}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center;">${t.baselineAverage ?? '—'}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center; font-weight:bold; color:#2563eb;">${t.targetGoal ?? '—'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#64748b;">טרם הוגדרו התנהגויות יעד</td></tr>`;

  const replacementsHtml = replacementBehaviors.length > 0
    ? replacementBehaviors.map((r, idx) => `
        <tr>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e3a5f; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e40af;">${getRedactedText(r.replacementSkill || '—', formData, hideDetails)}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt;">${getRedactedText(r.teachingStrategies || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#64748b;">טרם הוגדרו התנהגויות חלופיות</td></tr>`;

  const trackingRowsHtml = ongoingTracking.length > 0
    ? ongoingTracking.map((p, idx) => {
        const challenging = Number(p.targetBehaviorOccurrences ?? p.targetBehaviorCount) || 0;
        const replacement = typeof p.replacementBehaviorUsed === 'number'
          ? p.replacementBehaviorUsed
          : (p.replacementBehaviorCount ?? (p.replacementBehaviorUsed ? 'כן' : 'לא'));
        const reinforcement = p.reinforcementDelivered ? 'כן' : 'לא';

        return `
          <tr>
            <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center;">${idx + 1}</td>
            <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center;">${escapeHtml(p.date || '—')}</td>
            <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center;">${escapeHtml(p.period || p.sessionOrPeriod || '—')}</td>
            <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center; font-weight:bold; color:#ea580c;">${challenging}</td>
            <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center; font-weight:bold; color:#2563eb;">${replacement}</td>
            <td style="border:1px solid #cbd5e1; padding:5pt; text-align:center;">${reinforcement}</td>
            <td style="border:1px solid #cbd5e1; padding:5pt;">${getRedactedText(p.notes || '—', formData, hideDetails)}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="7" style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#64748b;">טרם נרשמו נקודות מעקב שוטף</td></tr>`;

  const baselineData = formData.baselineData || formData.behaviorAssessment?.baselineData || [];
  const progressChartSvg = generateProgressMonitoringDualLineSvg(baselineData, ongoingTracking, { isPrint: true });

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40"
          lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${docTitle} - ${displayName}</title>
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
        <div style="background-color:#1e3a5f; color:#ffffff; padding:12pt 16pt; margin-bottom:10pt; text-align:center;">
          <h1 style="margin:0; font-size:16pt;">${docTitle}</h1>
          <div style="font-size:10.5pt; margin-top:4pt;">משרד החינוך • מתי"א ושפ"ח • פרוטוקול התערבות והוראת התנהגויות חלופיות</div>
        </div>

        <div style="background-color:#f8fafc; border:1px solid #3b82f6; border-right:4px solid #1d4ed8; padding:8pt 12pt; margin-bottom:12pt; font-size:10.5pt;">
          <strong>שם התלמיד/ה:</strong> ${displayName} &nbsp;|&nbsp;
          <strong>ת.ז:</strong> ${displayId} &nbsp;|&nbsp;
          <strong>תאריך לידה:</strong> ${displayBirthDate} &nbsp;|&nbsp;
          <strong>מסגרת חינוכית:</strong> ${displayFramework}
          <br/>
          <strong>תאריך תחילה:</strong> ${effectiveDate} &nbsp;|&nbsp;
          <strong>מועד הערכה מחודשת:</strong> ${reviewDate} &nbsp;|&nbsp;
          <strong>מנתחת התנהגות:</strong> ${escapeHtml(analystName)}
          ${formData.address ? ` &nbsp;|&nbsp; <strong>כתובת:</strong> ${displayAddress}` : ''}
          ${formData.phone ? ` &nbsp;|&nbsp; <strong>טלפון:</strong> ${displayPhone}` : ''}
        </div>

        <!-- 1. Target Behaviors -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          1. התנהגויות יעד והגדרות אופרציונליות
        </div>
        <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; margin-bottom:12pt; font-size:10pt;">
          <tr style="background-color:#eff6ff; color:#1e40af; font-weight:bold; text-align:center;">
            <th style="width:5%;">#</th>
            <th style="width:25%;">התנהגות יעד</th>
            <th style="width:50%;">הגדרה אופרציונלית מדידה ונצפית</th>
            <th style="width:10%;">ממוצע בסיס</th>
            <th style="width:10%;">יעד מבוקש</th>
          </tr>
          ${targetsHtml}
        </table>

        <!-- 2. Replacement Behaviors -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          2. תוכנית התנהגויות חלופיות ומיומנויות להוראה
        </div>
        <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; margin-bottom:12pt; font-size:10pt;">
          <tr style="background-color:#eff6ff; color:#1e40af; font-weight:bold; text-align:center;">
            <th style="width:6%;">#</th>
            <th style="width:34%;">התנהגות חלופית רצויה</th>
            <th style="width:60%;">אסטרטגיות הוראה ותרגול יזום</th>
          </tr>
          ${replacementsHtml}
        </table>

        <!-- 3. Antecedent Strategies -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          3. אסטרטגיות מניעה והתאמות סביבתיות לתנאים מקדימים
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:12pt; font-size:10.5pt; line-height:1.55;">
          ${antecedentStrategies.replace(/\n/g, '<br/>')}
        </div>

        <!-- 4. Reinforcement System -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          4. מערך חיזוקים ועידוד
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:6pt; font-size:10.5pt; line-height:1.55;">
          <div style="font-weight:bold; color:#1e40af; margin-bottom:3pt;">מחזקים מועדפים:</div>
          ${preferredReinforcers.replace(/\n/g, '<br/>')}
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:12pt; font-size:10.5pt; line-height:1.55;">
          <div style="font-weight:bold; color:#1e40af; margin-bottom:3pt;">לוח זמנים ותדירות חיזוק:</div>
          ${scheduleOfReinforcement.replace(/\n/g, '<br/>')}
        </div>

        <!-- 5. Reactive & Safety Protocol -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          5. פרוטוקול תגובה במצבי משבר ובטיחות
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:6pt; font-size:10.5pt; line-height:1.55;">
          <div style="font-weight:bold; color:#1e40af; margin-bottom:3pt;">תגובת הצוות בעת התרחשות ההתנהגות:</div>
          ${staffResponse.replace(/\n/g, '<br/>')}
        </div>
        <div style="border:1px solid #cbd5e1; background-color:#ffffff; padding:8pt 10pt; margin-bottom:12pt; font-size:10.5pt; line-height:1.55;">
          <div style="font-weight:bold; color:#1e40af; margin-bottom:3pt;">תוכנית בטיחות והתמודדות במשבר:</div>
          ${crisisSafetyPlan.replace(/\n/g, '<br/>')}
        </div>

        <!-- 6. Ongoing Tracking -->
        <div style="font-weight:bold; font-size:12pt; color:#1e3a5f; margin-bottom:4pt; border-bottom:1.5px solid #2563eb; padding-bottom:2pt;">
          6. טבלת מעקב שוטף ולוח התקדמות
        </div>
        ${progressChartSvg}
        <table dir="rtl" border="1" cellspacing="0" cellpadding="5" style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; margin-bottom:16pt; font-size:9.5pt;">
          <tr style="background-color:#eff6ff; color:#1e40af; font-weight:bold; text-align:center;">
            <th style="width:5%;">#</th>
            <th style="width:14%;">תאריך</th>
            <th style="width:20%;">שיעור / פעילות</th>
            <th style="width:13%;">אירועים מאתגרים</th>
            <th style="width:14%;">התנהגות חלופית</th>
            <th style="width:10%;">חיזוק ניתן</th>
            <th style="width:24%;">הערות</th>
          </tr>
          ${trackingRowsHtml}
        </table>

        <!-- Signatures -->
        <table dir="rtl" border="0" style="width:100%; margin-top:16pt; font-weight:bold; color:#1e3a5f; font-size:10.5pt;">
          <tr>
            <td style="width:25%; text-align:right;">חתימת מנתחת התנהגות: ______________</td>
            <td style="width:25%; text-align:right;">חתימת מנהלת / מתי"א: ______________</td>
            <td style="width:25%; text-align:right;">חתימת מחנכת הכיתה: ______________</td>
            <td style="width:25%; text-align:right;">חתימת הורים: ______________</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}

export function buildBehaviorPlanPrintHtml(formData: any = {}, hideDetails = false, logoUrl = '') {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';
  const displayAddress = getDisplayMaskedField(formData.address, hideDetails);
  const displayPhone = getDisplayMaskedField(formData.phone, hideDetails);
  const docTitle = getBehaviorPlanTitle();

  const plan = formData.behaviorPlan || formData || {};
  const analystName = plan.analystName || formData.teacherName || 'מנתחת התנהגות מוסמכת';
  const effectiveDate = plan.effectiveDate || formData.reportDate || formData.date || '__________';
  const reviewDate = plan.reviewDate || '__________';

  const antecedentStrategies = getRedactedText(plan.antecedentStrategies || '—', formData, hideDetails);
  const preferredReinforcers = getRedactedText(plan.reinforcementSystem?.preferredReinforcers || '—', formData, hideDetails);
  const scheduleOfReinforcement = getRedactedText(plan.reinforcementSystem?.scheduleOfReinforcement || '—', formData, hideDetails);
  const staffResponse = getRedactedText(plan.reactiveProtocol?.staffResponse || '—', formData, hideDetails);
  const crisisSafetyPlan = getRedactedText(plan.reactiveProtocol?.crisisSafetyPlan || '—', formData, hideDetails);

  const targetBehaviors: any[] = Array.isArray(plan.targetBehaviors) ? plan.targetBehaviors : [];
  const replacementBehaviors: any[] = Array.isArray(plan.replacementBehaviors) ? plan.replacementBehaviors : [];
  const ongoingTracking: any[] = Array.isArray(plan.ongoingTracking) ? plan.ongoingTracking : [];

  const targetsHtml = targetBehaviors.length > 0
    ? targetBehaviors.map((t, idx) => `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700; color:#1e293b;">${escapeHtml(t.name || '—')}</td>
          <td>${getRedactedText(t.operationalDefinition || '—', formData, hideDetails)}</td>
          <td style="text-align:center;">${t.baselineAverage ?? '—'}</td>
          <td style="text-align:center; font-weight:700; color:#2563eb;">${t.targetGoal ?? '—'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="text-align:center; color:#64748b;">טרם הוגדרו התנהגויות יעד</td></tr>`;

  const replacementsHtml = replacementBehaviors.length > 0
    ? replacementBehaviors.map((r, idx) => `
        <tr>
          <td style="text-align:center; font-weight:700;">${idx + 1}</td>
          <td style="font-weight:700; color:#1e40af;">${getRedactedText(r.replacementSkill || '—', formData, hideDetails)}</td>
          <td>${getRedactedText(r.teachingStrategies || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="text-align:center; color:#64748b;">טרם הוגדרו התנהגויות חלופיות</td></tr>`;

  const trackingRowsHtml = ongoingTracking.length > 0
    ? ongoingTracking.map((p, idx) => {
        const challenging = Number(p.targetBehaviorOccurrences ?? p.targetBehaviorCount) || 0;
        const replacement = typeof p.replacementBehaviorUsed === 'number'
          ? p.replacementBehaviorUsed
          : (p.replacementBehaviorCount ?? (p.replacementBehaviorUsed ? 'כן' : 'לא'));
        const reinforcement = p.reinforcementDelivered ? 'כן' : 'לא';

        return `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td style="text-align:center;">${escapeHtml(p.date || '—')}</td>
            <td style="text-align:center;">${escapeHtml(p.period || p.sessionOrPeriod || '—')}</td>
            <td style="text-align:center; font-weight:700; color:#ea580c;">${challenging}</td>
            <td style="text-align:center; font-weight:700; color:#2563eb;">${replacement}</td>
            <td style="text-align:center;">${reinforcement}</td>
            <td>${getRedactedText(p.notes || '—', formData, hideDetails)}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="7" style="text-align:center; color:#64748b;">טרם נרשמו נקודות מעקב שוטף</td></tr>`;

  // Dual Line SVG Chart comparing Baseline vs. Intervention
  const baselineData = formData.behaviorAssessment?.baselineData || [];
  const progressChartSvg = generateProgressMonitoringDualLineSvg(baselineData, ongoingTracking, { isPrint: true });

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${docTitle.replace(/\s+/g, '_')}_${displayName.replace(/\s+/g, '_')}</title>
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
            background: linear-gradient(135deg, #1e3a5f 0%, #2b4c73 55%, #1e40af 100%);
            color: #ffffff;
            padding: 14px 20px;
            border-bottom: 4px solid #93c5fd;
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
            border: 2px solid #93c5fd;
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
            color: #eff6ff;
          }
          .student-details-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            padding: 10px 14px;
            border: 1.5px solid #3b82f6;
            border-right: 5px solid #1d4ed8;
            background: #eff6ff;
            border-radius: 8px;
            margin-bottom: 14px;
            font-size: 12.5px;
          }
          .behavior-section-box {
            border: 1px solid #cbd5e1;
            border-right: 4px solid #2563eb;
            background: #fbfdff;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .behavior-section-title {
            font-weight: 700;
            font-size: 14px;
            color: #1e3a5f;
            margin-bottom: 6px;
          }
          .behavior-section-body {
            white-space: pre-line;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.55;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 12px;
          }
          .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: right;
          }
          .data-table th {
            background-color: #eff6ff;
            color: #1e40af;
            font-weight: 700;
          }
          .signatures-row {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            font-weight: 600;
            color: #1e3a5f;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="stained-glass-strip"></div>
        <div class="print-banner">
          <div class="doc-meta-side"><strong>תאריך תחילה:</strong> ${effectiveDate}</div>
          <div class="print-banner-center">
            ${logoUrl ? `<img src="${logoUrl}" alt="TALA Logo" class="print-logo" />` : ''}
            <h1 class="doc-main-title">${docTitle}</h1>
          </div>
          <div class="doc-meta-side"><strong>מנתחת התנהגות:</strong> ${escapeHtml(analystName)}</div>
        </div>

        <div class="student-details-bar">
          <div><strong>שם התלמיד/ה:</strong> ${displayName}</div>
          <div><strong>ת.ז:</strong> ${displayId}</div>
          <div><strong>ת.ל:</strong> ${displayBirthDate}</div>
          <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
          <div><strong>מועד הערכה מחודשת:</strong> ${reviewDate}</div>
          ${formData.address ? `<div><strong>כתובת:</strong> ${displayAddress}</div>` : ''}
          ${formData.phone ? `<div><strong>טלפון:</strong> ${displayPhone}</div>` : ''}
        </div>

        <!-- 1. Targets -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">1. התנהגויות יעד והגדרות אופרציונליות</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:5%;">#</th>
                <th style="width:25%;">התנהגות יעד</th>
                <th style="width:50%;">הגדרה אופרציונלית מדידה ונצפית</th>
                <th style="width:10%;">ממוצע בסיס</th>
                <th style="width:10%;">יעד מבוקש</th>
              </tr>
            </thead>
            <tbody>
              ${targetsHtml}
            </tbody>
          </table>
        </div>

        <!-- 2. Replacement Behaviors -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">2. תוכנית התנהגויות חלופיות ומיומנויות להוראה</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:6%;">#</th>
                <th style="width:34%;">התנהגות חלופית רצויה</th>
                <th style="width:60%;">אסטרטגיות הוראה ותרגול יזום</th>
              </tr>
            </thead>
            <tbody>
              ${replacementsHtml}
            </tbody>
          </table>
        </div>

        <!-- 3. Antecedents -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">3. אסטרטגיות מניעה והתאמות סביבתיות לתנאים מקדימים</div>
          <div class="behavior-section-body">${antecedentStrategies}</div>
        </div>

        <!-- 4. Reinforcement -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">4. מערך חיזוקים ועידוד</div>
          <div style="margin-bottom:8px;">
            <strong>מחזקים מועדפים:</strong>
            <div class="behavior-section-body">${preferredReinforcers}</div>
          </div>
          <div>
            <strong>לוח זמנים ותדירות חיזוק:</strong>
            <div class="behavior-section-body">${scheduleOfReinforcement}</div>
          </div>
        </div>

        <!-- 5. Reactive Protocol -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">5. פרוטוקול תגובה במצבי משבר ובטיחות</div>
          <div style="margin-bottom:8px;">
            <strong>תגובת הצוות בעת התרחשות ההתנהגות:</strong>
            <div class="behavior-section-body">${staffResponse}</div>
          </div>
          <div>
            <strong>תוכנית בטיחות והתמודדות במשבר:</strong>
            <div class="behavior-section-body">${crisisSafetyPlan}</div>
          </div>
        </div>

        <!-- 6. Progress Monitoring Chart & Log -->
        <div class="behavior-section-box">
          <div class="behavior-section-title">6. טבלת מעקב שוטף ולוח התקדמות מול קו הבסיס</div>
          ${progressChartSvg}
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:5%;">#</th>
                <th style="width:14%;">תאריך</th>
                <th style="width:20%;">שיעור / פעילות</th>
                <th style="width:13%;">אירועים מאתגרים</th>
                <th style="width:14%;">התנהגות חלופית</th>
                <th style="width:10%;">חיזוק ניתן</th>
                <th style="width:24%;">הערות</th>
              </tr>
            </thead>
            <tbody>
              ${trackingRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Signatures -->
        <div class="signatures-row">
          <div>חתימת מנתחת התנהגות: _________________________</div>
          <div>חתימת מחנכת הכיתה: _________________________</div>
          <div>חתימת מנהלת / מתי"א: _________________________</div>
          <div>חתימת הורים: _________________________</div>
        </div>
      </body>
    </html>
  `;
}

export function buildBehaviorProgressVisualAnalyticsHtml(formData: any = {}, hideDetails = false, isPrint = false): string {
  const ongoingTracking: any[] = formData.ongoingTracking || formData.behaviorPlan?.ongoingTracking || [];
  const behaviorObservations: any[] = formData.behaviorObservations || [];
  const baselineData: any[] = formData.baselineData || formData.behaviorAssessment?.baselineData || [];

  const heatmapResult = computeHourlyHeatmapMatrix(ongoingTracking, behaviorObservations);
  const abcResult = computeAbcSequenceSummary(behaviorObservations);
  const durationResult = computeDurationAndIntensityData(ongoingTracking, behaviorObservations);
  const curveResult = computeReplacementSkillCurve(ongoingTracking);
  const fidelityResult = computeStaffFidelityMetrics(ongoingTracking);
  const hasDualLine = ongoingTracking.length > 0 || baselineData.length >= 3;

  const hasAnyData = heatmapResult.hasData || abcResult.hasData || durationResult.hasData || curveResult.hasData || fidelityResult.hasData || hasDualLine;

  if (!hasAnyData) {
    return `
      <div style="background-color: #f8fafc; border: 1pt dashed #cbd5e1; padding: 12pt; border-radius: 6px; text-align: center; color: #64748b; font-size: 9.5pt; margin: 8pt 0;">
        טרם נצברו מספיק נתוני מעקב או תצפיות לצורך הפקת ניתוחים חזותיים מתקדמים (דרושים נתוני מעקב שוטף או תצפיות התנהגותיות).
      </div>
    `;
  }

  const sections: string[] = [];

  // 1. Hourly Heatmap Matrix
  if (heatmapResult.hasData) {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
    const periods = ['שיעור 1', 'שיעור 2', 'שיעור 3', 'שיעור 4', 'שיעור 5', 'שיעור 6'];

    const getCellColor = (val: number) => {
      if (val === 0) return { bg: '#f8fafc', color: '#94a3b8' };
      const max = heatmapResult.maxCellOccurrences || 1;
      const ratio = val / max;
      if (ratio < 0.25) return { bg: '#ffedd5', color: '#431407' };
      if (ratio < 0.5) return { bg: '#fdba74', color: '#431407' };
      if (ratio < 0.75) return { bg: '#fb923c', color: '#ffffff' };
      return { bg: '#ea580c', color: '#ffffff' };
    };

    const rowsHtml = periods.map((periodName, pIdx) => {
      const cellsHtml = days.map((_, dIdx) => {
        const cell = heatmapResult.cells.find((c) => c.dayIndex === dIdx && c.periodIndex === pIdx);
        const val = cell ? cell.occurrences : 0;
        const style = getCellColor(val);
        return `<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; background-color: ${style.bg}; color: ${style.color}; font-weight: ${val > 0 ? 'bold' : 'normal'}; font-size: 9pt;">${val > 0 ? val : '—'}</td>`;
      }).join('');

      return `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold; background-color: #f1f5f9; color: #1e3a5f; text-align: right; font-size: 9pt;">${periodName}</td>
          ${cellsHtml}
        </tr>
      `;
    }).join('');

    sections.push(`
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #1e3a5f; font-size: 10.5pt;">מפת פיזור שעתית לאורך ימות השבוע</strong>
          ${heatmapResult.peakDay && heatmapResult.peakPeriod ? `
            <span style="background-color: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; padding: 2px 8px; border-radius: 4px; font-size: 8.5pt; font-weight: bold;">
              מוקד שיא: יום ${heatmapResult.peakDay}, ${heatmapResult.peakPeriod} (${heatmapResult.maxCellOccurrences} אירועים)
            </span>
          ` : ''}
        </div>
        <p style="margin: 0 0 6px 0; font-size: 8.5pt; color: #64748b;">הצלבת שעות המערכת וימי השבוע לזיהוי דפוסי זמנים ומעברים</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-size: 9pt; width: 14%;">שעה / יום</th>
              ${days.map(d => `<th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 9pt;">יום ${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `);
  }

  // 2. ABC Sequence Summary Table
  if (abcResult.hasData) {
    const rowsHtml = abcResult.rows.map((row) => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 600; color: #1e293b; font-size: 9pt;">${getRedactedText(row.antecedent, formData, hideDetails)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; color: #334155; font-size: 9pt;">${getRedactedText(row.consequence, formData, hideDetails)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: 600; color: #0369a1; font-size: 9pt;">${escapeHtml(row.perceivedFunctionLabel)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: #0f172a; font-size: 9pt;">${row.count}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: #2563eb; font-size: 9pt;">
          ${row.percentage}%
          <div style="background-color: #e2e8f0; height: 5px; border-radius: 3px; overflow: hidden; margin-top: 3px;">
            <div style="width: ${row.percentage}%; background-color: #2563eb; height: 100%;"></div>
          </div>
        </td>
      </tr>
    `).join('');

    sections.push(`
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #1e3a5f; font-size: 10.5pt;">טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית</strong>
          <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 8.5pt;">
            סך אירועים מנותחים: <strong>${abcResult.totalIncidents}</strong>
          </span>
        </div>
        <p style="margin: 0 0 6px 0; font-size: 8.5pt; color: #64748b;">הצלבה כמותית של הגורמים המעוררים מול התגובות הסביבתיות שנצפו</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-size: 9pt; width: 28%;">תנאי מקדים</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-size: 9pt; width: 30%;">תגובה סביבתית או תוצאה</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-size: 9pt; width: 18%;">תפקוד משוער</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 9pt; width: 10%;">מופעים</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 9pt; width: 14%;">שכיחות יחסית</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `);
  }

  // 3. Duration & Intensity Chart
  if (durationResult.hasData && durationResult.points.length > 0) {
    const durationSvg = generateDurationIntensitySvg(durationResult.points, { isPrint, width: 680, height: 210 });
    sections.push(`
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div>
            <strong style="color: #1e3a5f; font-size: 10.5pt;">גרף משך זמן ועוצמת אירוע</strong>
            <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #64748b;">מדידת דקות רצופות ועוצמה לאיתור התקפי זעם או הסתגרות</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <span style="background-color: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 8.5pt;">
              משך ממוצע: <strong>${durationResult.averageDurationMinutes} דק׳</strong>
            </span>
            <span style="background-color: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-size: 8.5pt;">
              משך שיא: <strong>${durationResult.maxDurationMinutes} דק׳</strong>
            </span>
          </div>
        </div>
        ${durationSvg}
      </div>
    `);
  }

  // 4. Replacement Skill Cumulative Learning Curve
  if (curveResult.hasData && curveResult.points.length > 0) {
    const curveSvg = generateReplacementLearningCurveSvg(curveResult.points, { isPrint, width: 680, height: 210 });
    sections.push(`
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div>
            <strong style="color: #1e3a5f; font-size: 10.5pt;">עקומת למידה מצטברת של מיומנות חלופית</strong>
            <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #64748b;">מעקב עצמאות ורכישה מתמדת של המיומנות הרצויה לאורך זמן</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <span style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 2px 8px; border-radius: 4px; font-size: 8.5pt;">
              סך שימושים חלופיים: <strong>${curveResult.totalReplacementDemonstrations}</strong>
            </span>
            <span style="background-color: #f8fafc; border: 1px solid #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 8.5pt;">
              קצב רכישה: <strong>${curveResult.acquisitionRatePercentage}%</strong>
            </span>
          </div>
        </div>
        ${curveSvg}
      </div>
    `);
  }

  // 5. Staff Fidelity Meter
  if (fidelityResult.hasData && fidelityResult.totalTrackedSessions > 0) {
    const barColor = fidelityResult.overallFidelityPercentage >= 80 ? '#10b981' : fidelityResult.overallFidelityPercentage >= 50 ? '#f59e0b' : '#ef4444';
    const badgeBg = fidelityResult.overallFidelityPercentage >= 80 ? '#f0fdf4' : fidelityResult.overallFidelityPercentage >= 50 ? '#fefce8' : '#fef2f2';
    const badgeBorder = fidelityResult.overallFidelityPercentage >= 80 ? '#bbf7d0' : fidelityResult.overallFidelityPercentage >= 50 ? '#fef08a' : '#fecaca';

    sections.push(`
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div>
            <strong style="color: #1e3a5f; font-size: 10.5pt;">טבלת נאמנות יישום של צוות בית הספר</strong>
            <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #64748b;">בדיקת אחוז העקביות של צוות ההוראה ביישום פרוטוקול ההתערבות</p>
          </div>
          <span style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${barColor}; padding: 3px 10px; border-radius: 999px; font-size: 8.5pt; font-weight: bold;">
            ${escapeHtml(fidelityResult.ratingLabel)} (${fidelityResult.overallFidelityPercentage}%)
          </span>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 6px;">
          <div style="display: flex; justify-content: space-between; font-size: 9pt; font-weight: 600; margin-bottom: 4px; color: #334155;">
            <span>עקביות כוללת במתן מענה וחיזוק:</span>
            <span style="color: ${barColor}; font-weight: 800; font-size: 11pt;">${fidelityResult.overallFidelityPercentage}%</span>
          </div>
          <div style="background-color: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 4px;">
            <div style="width: ${fidelityResult.overallFidelityPercentage}%; background-color: ${barColor}; height: 100%; border-radius: 5px;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8pt; color: #64748b;">
            <span>${fidelityResult.reinforcedSessions} מתוך ${fidelityResult.totalTrackedSessions} מפגשים יושמו בהתאם לתוכנית</span>
            <span>יעד מומלץ: מעל 80%</span>
          </div>
        </div>
      </div>
    `);
  }

  // 6. Dual-Line Progress Monitoring (Baseline vs Intervention)
  if (hasDualLine) {
    const dualLineSvg = generateProgressMonitoringDualLineSvg(baselineData, ongoingTracking, { isPrint, width: 680, height: 260 });
    sections.push(`
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
        <strong style="color: #1e3a5f; font-size: 10.5pt; display: block; margin-bottom: 4px;">גרף ניטור התקדמות: קו בסיס מול שלב התערבות</strong>
        <p style="margin: 0 0 6px 0; font-size: 8.5pt; color: #64748b;">השוואת תדירות ההתנהגות המאתגרת אל מול רכישת ההתנהגות החלופית לאורך זמן</p>
        ${dualLineSvg}
      </div>
    `);
  }

  return sections.join('\n');
}

export function buildBehaviorProgressReportWordDocumentHtml(formData: any = {}, hideDetails = false) {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';

  const report = formData.behaviorProgressReport || formData || {};
  const analystName = report.assessorName || formData.teacherName || 'מנתחת התנהגות מוסמכת';
  const reportDate = report.reportDate || formData.date || '__________';
  const periodLabel = report.reviewPeriodLabel || (report.period === 'mid_year' ? 'מחצית ראשונה' : report.period === 'end_year' ? 'סיכום שנתי מלא' : 'דוח תקופתי');
  const docTitle = getBehaviorProgressReportTitle(report.period);

  const executiveSummary = getRedactedText(report.executiveSummary || 'טרם הוזן סיכום מנהלים', formData, hideDetails);
  const environmentalAdjustments = getRedactedText(report.environmentalAdjustments || '—', formData, hideDetails);
  const staffFidelityObservations = getRedactedText(report.staffFidelityObservations || '—', formData, hideDetails);
  const recommendations = getRedactedText(report.recommendations || '—', formData, hideDetails);

  const targetProgress: any[] = Array.isArray(report.targetBehaviorsProgress) ? report.targetBehaviorsProgress : [];
  const replacementProgress: any[] = Array.isArray(report.replacementBehaviorsAcquisition) ? report.replacementBehaviorsAcquisition : [];

  const targetsHtml = targetProgress.length > 0
    ? targetProgress.map((t, idx) => `
        <tr>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e3a5f; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e293b;">${escapeHtml(t.behaviorName || '—')}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center;">${t.baselineAverage ?? '—'}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center; font-weight:bold; color:#2563eb;">${t.currentAverage ?? '—'}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center; font-weight:bold; color:${(t.reductionPercent || 0) > 0 ? '#16a34a' : '#dc2626'};">${t.reductionPercent != null ? `${t.reductionPercent}%` : '—'}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt;">${getRedactedText(t.statusNotes || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#64748b;">טרם הוגדרו נתוני התקדמות</td></tr>`;

  const replacementsHtml = replacementProgress.length > 0
    ? replacementProgress.map((r, idx) => `
        <tr>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e3a5f; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; font-weight:bold; color:#1e40af;">${getRedactedText(r.skillName || '—', formData, hideDetails)}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt; text-align:center; font-weight:bold; color:#059669;">${escapeHtml(r.masteryLevel || 'בתהליך למידה')}</td>
          <td style="border:1px solid #cbd5e1; padding:6pt;">${getRedactedText(r.acquisitionNotes || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#64748b;">טרם הוגדרו נתוני מיומנויות חלופיות</td></tr>`;

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${docTitle}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; color: #1e293b; line-height: 1.5; font-size: 11pt; padding: 24pt; }
          h1 { color: #1e3a5f; font-size: 19pt; text-align: center; border-bottom: 2pt solid #2563eb; padding-bottom: 8pt; margin-bottom: 14pt; }
          h2 { color: #1e40af; font-size: 13.5pt; border-bottom: 1pt solid #cbd5e1; padding-bottom: 4pt; margin-top: 18pt; margin-bottom: 8pt; }
          .header-box { background-color: #f8fafc; border: 1pt solid #e2e8f0; padding: 12pt; margin-bottom: 16pt; }
          .summary-box { background-color: #eff6ff; border: 1pt solid #bfdbfe; padding: 10pt 14pt; margin: 10pt 0; border-radius: 4pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 14pt; }
          th { background-color: #f1f5f9; color: #1e3a5f; border: 1pt solid #cbd5e1; padding: 7pt; font-weight: bold; font-size: 10.5pt; text-align: right; }
          td { border: 1pt solid #cbd5e1; padding: 7pt; font-size: 10.5pt; }
          .signatures-box { margin-top: 30pt; padding-top: 12pt; border-top: 1pt solid #cbd5e1; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <h1>${docTitle}</h1>
        <div class="header-box">
          <p><strong>שם התלמיד/ה:</strong> ${displayName} &nbsp;|&nbsp; <strong>ת.ז:</strong> ${displayId} &nbsp;|&nbsp; <strong>תאריך לידה:</strong> ${displayBirthDate}</p>
          <p><strong>מסגרת חינוכית:</strong> ${displayFramework} &nbsp;|&nbsp; <strong>מנתחת התנהגות:</strong> ${escapeHtml(analystName)}</p>
          <p><strong>תקופת הדוח:</strong> ${escapeHtml(periodLabel)} &nbsp;|&nbsp; <strong>תאריך הפקה:</strong> ${escapeHtml(reportDate)}</p>
        </div>

        <h2>1. תמצית מנהלים והערכת התקדמות כללית</h2>
        <div class="summary-box">
          <p>${executiveSummary}</p>
        </div>

        <h2>2. מעקב והתקדמות בהתנהגויות המטרה</h2>
        <table>
          <thead>
            <tr>
              <th style="width:5%; text-align:center;">#</th>
              <th style="width:25%;">התנהגות מטרה</th>
              <th style="width:12%; text-align:center;">ממוצע קו בסיס</th>
              <th style="width:12%; text-align:center;">ממוצע נוכחי</th>
              <th style="width:14%; text-align:center;">אחוז הפחתה</th>
              <th style="width:32%;">הערות והערכת מגמה</th>
            </tr>
          </thead>
          <tbody>
            ${targetsHtml}
          </tbody>
        </table>

        <h2>3. רכישת מיומנויות והתנהגויות חלופיות</h2>
        <table>
          <thead>
            <tr>
              <th style="width:5%; text-align:center;">#</th>
              <th style="width:35%;">מיומנות חלופית שנלמדה</th>
              <th style="width:20%; text-align:center;">רמת שליטה ועצמאות</th>
              <th style="width:40%;">הערות התקדמות ודוגמאות</th>
            </tr>
          </thead>
          <tbody>
            ${replacementsHtml}
          </tbody>
        </table>

        <h2>4. ניתוחים חזותיים ומדדי מעקב מתקדמים</h2>
        ${buildBehaviorProgressVisualAnalyticsHtml(formData, hideDetails, false)}

        <h2>5. התאמות סביבתיות ונהלי צוות</h2>
        <div style="background-color: #fafafa; border: 1pt solid #e2e8f0; padding: 10pt; border-radius: 4pt;">
          <p>${environmentalAdjustments}</p>
        </div>

        <h2>6. נאמנות יישום ועקביות הצוות</h2>
        <div style="background-color: #fafafa; border: 1pt solid #e2e8f0; padding: 10pt; border-radius: 4pt;">
          <p>${staffFidelityObservations}</p>
        </div>

        <h2>7. המלצות להמשך תוכנית ההתערבות וישיבות רב-מקצועיות</h2>
        <div style="background-color: #fafafa; border: 1pt solid #e2e8f0; padding: 10pt; border-radius: 4pt;">
          <p>${recommendations}</p>
        </div>

        <div class="signatures-box">
          <p>חתימת מנתחת התנהגות: _________________________ &nbsp;&nbsp;&nbsp;&nbsp; חתימת מחנכת: _________________________</p>
          <p style="margin-top:12pt;">חתימת מנהלת / מתי"א: _________________________ &nbsp;&nbsp;&nbsp;&nbsp; חתימת הורים: _________________________</p>
        </div>
      </body>
    </html>
  `;
}

export function buildBehaviorProgressReportPrintHtml(formData: any = {}, hideDetails = false, logoUrl = '') {
  const displayName = getDisplayStudentName(formData, hideDetails);
  const displayId = getDisplayMaskedField(formData.idNumber, hideDetails);
  const displayBirthDate = getDisplayMaskedField(formData.birthDate, hideDetails);
  const displayFramework = hideDetails
    ? maskSensitiveValue(formData.educationalFramework)
    : formData.educationalFramework || '__________';

  const report = formData.behaviorProgressReport || formData || {};
  const analystName = report.assessorName || formData.teacherName || 'מנתחת התנהגות מוסמכת';
  const reportDate = report.reportDate || formData.date || '__________';
  const periodLabel = report.reviewPeriodLabel || (report.period === 'mid_year' ? 'מחצית ראשונה' : report.period === 'end_year' ? 'סיכום שנתי מלא' : 'דוח תקופתי');
  const docTitle = getBehaviorProgressReportTitle(report.period);

  const executiveSummary = getRedactedText(report.executiveSummary || 'טרם הוזן סיכום מנהלים', formData, hideDetails);
  const environmentalAdjustments = getRedactedText(report.environmentalAdjustments || '—', formData, hideDetails);
  const staffFidelityObservations = getRedactedText(report.staffFidelityObservations || '—', formData, hideDetails);
  const recommendations = getRedactedText(report.recommendations || '—', formData, hideDetails);

  const targetProgress: any[] = Array.isArray(report.targetBehaviorsProgress) ? report.targetBehaviorsProgress : [];
  const replacementProgress: any[] = Array.isArray(report.replacementBehaviorsAcquisition) ? report.replacementBehaviorsAcquisition : [];

  const targetsHtml = targetProgress.length > 0
    ? targetProgress.map((t, idx) => `
        <tr>
          <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
          <td style="font-weight:bold;">${escapeHtml(t.behaviorName || '—')}</td>
          <td style="text-align:center;">${t.baselineAverage ?? '—'}</td>
          <td style="text-align:center; font-weight:bold; color:#1d4ed8;">${t.currentAverage ?? '—'}</td>
          <td style="text-align:center; font-weight:bold; color:${(t.reductionPercent || 0) > 0 ? '#15803d' : '#b91c1c'};">${t.reductionPercent != null ? `${t.reductionPercent}%` : '—'}</td>
          <td>${getRedactedText(t.statusNotes || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:10px;">טרם הוגדרו נתוני התקדמות</td></tr>`;

  const replacementsHtml = replacementProgress.length > 0
    ? replacementProgress.map((r, idx) => `
        <tr>
          <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
          <td style="font-weight:bold; color:#1d4ed8;">${getRedactedText(r.skillName || '—', formData, hideDetails)}</td>
          <td style="text-align:center; font-weight:bold; color:#15803d;">${escapeHtml(r.masteryLevel || 'בתהליך למידה')}</td>
          <td>${getRedactedText(r.acquisitionNotes || '—', formData, hideDetails)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="text-align:center; color:#64748b; padding:10px;">טרם הוגדרו נתוני מיומנויות חלופיות</td></tr>`;

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <title>${docTitle} - ${displayName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; color: #0f172a; margin: 0; padding: 0; font-size: 10pt; line-height: 1.45; }
          .report-header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
          .report-title { font-size: 16pt; font-weight: 800; color: #1e3a5f; margin: 0 0 6px 0; }
          .report-subtitle { font-size: 10.5pt; color: #475569; margin: 0; }
          .student-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 9.5pt; }
          .section-block { margin-bottom: 14px; page-break-inside: avoid; }
          .section-title { font-size: 11.5pt; font-weight: 700; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 0 0 8px 0; }
          .summary-card { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 12px; border-radius: 6px; font-size: 9.5pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt; }
          th { background: #f1f5f9; color: #1e3a5f; border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 700; text-align: right; }
          td { border: 1px solid #cbd5e1; padding: 6px 8px; }
          .signatures-row { margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="report-header">
          ${logoUrl ? `<img src="${logoUrl}" alt="לוגו" style="max-height:48px; margin-bottom:6px;">` : ''}
          <h1 class="report-title">${docTitle}</h1>
          <p class="report-subtitle">${displayName} &bull; תקופת הדוח: ${periodLabel}</p>
        </div>

        <div class="student-meta-grid">
          <div><strong>שם התלמיד/ה:</strong> ${displayName}</div>
          <div><strong>ת.ז:</strong> ${displayId}</div>
          <div><strong>תאריך לידה:</strong> ${displayBirthDate}</div>
          <div><strong>מסגרת חינוכית:</strong> ${displayFramework}</div>
          <div><strong>מנתחת התנהגות:</strong> ${escapeHtml(analystName)}</div>
          <div><strong>תאריך הפקה:</strong> ${escapeHtml(reportDate)}</div>
        </div>

        <div class="section-block">
          <div class="section-title">1. תמצית מנהלים והערכת התקדמות כללית</div>
          <div class="summary-card">
            <p style="margin:0;">${executiveSummary}</p>
          </div>
        </div>

        <div class="section-block">
          <div class="section-title">2. מעקב והתקדמות בהתנהגויות המטרה</div>
          <table>
            <thead>
              <tr>
                <th style="width:5%; text-align:center;">#</th>
                <th style="width:25%;">התנהגות מטרה</th>
                <th style="width:12%; text-align:center;">קו בסיס</th>
                <th style="width:12%; text-align:center;">ממוצע נוכחי</th>
                <th style="width:14%; text-align:center;">אחוז הפחתה</th>
                <th style="width:32%;">הערות והערכת מגמה</th>
              </tr>
            </thead>
            <tbody>
              ${targetsHtml}
            </tbody>
          </table>
        </div>

        <div class="section-block">
          <div class="section-title">3. רכישת מיומנויות והתנהגויות חלופיות</div>
          <table>
            <thead>
              <tr>
                <th style="width:5%; text-align:center;">#</th>
                <th style="width:35%;">מיומנות חלופית</th>
                <th style="width:20%; text-align:center;">רמת שליטה ועצמאות</th>
                <th style="width:40%;">הערות התקדמות</th>
              </tr>
            </thead>
            <tbody>
              ${replacementsHtml}
            </tbody>
          </table>
        </div>

        <div class="section-block">
          <div class="section-title">4. ניתוחים חזותיים ומדדי מעקב מתקדמים</div>
          ${buildBehaviorProgressVisualAnalyticsHtml(formData, hideDetails, true)}
        </div>

        <div class="section-block">
          <div class="section-title">5. התאמות סביבתיות ונהלי צוות</div>
          <div style="background:#fafafa; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px; font-size:9.5pt;">
            <p style="margin:0;">${environmentalAdjustments}</p>
          </div>
        </div>

        <div class="section-block">
          <div class="section-title">6. נאמנות יישום ועקביות הצוות</div>
          <div style="background:#fafafa; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px; font-size:9.5pt;">
            <p style="margin:0;">${staffFidelityObservations}</p>
          </div>
        </div>

        <div class="section-block">
          <div class="section-title">7. המלצות להמשך תוכנית ההתערבות וישיבות רב-מקצועיות</div>
          <div style="background:#fafafa; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px; font-size:9.5pt;">
            <p style="margin:0;">${recommendations}</p>
          </div>
        </div>

        <div class="signatures-row">
          <div>חתימת מנתחת התנהגות: _________________________</div>
          <div>חתימת מחנכת הכיתה: _________________________</div>
          <div>חתימת מנהלת / מתי"א: _________________________</div>
          <div>חתימת הורים: _________________________</div>
        </div>
      </body>
    </html>
  `;
}


