import {
  generateExecutivePedagogicalDigest,
  synthesizeLocalExecutiveDigest
} from './domain/pedagogicalDigestAi';
import type { ExecutiveAiPedagogicalDigest } from './domain/types';
import { incrementDailyQuotaCount } from './allowedUsers';
import { recordEmailAuditLogToCloud } from './services/telemetryService';

export const EMAIL_ENGINE_STORAGE_KEY = 'tala_email_engine_config_v1';

export interface EmailEngineConfig {
  provider: 'apps_script' | 'emailjs';
  appsScriptUrl: string;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  senderName?: string;
}

export const GOOGLE_DRIVE_FOLDERS = Object.freeze({
  ROOT_TALA: '19eZf0Fegvany9LPwrEcD3cw1o0MpN6Rw',
  NDAS: '1DZSbsUrwRrz1W8RXR-cKC1xw5khoTsGT',
  TEACHER_SURVEYS: '1UAX8HP6rWRPefcjZshjtANuu8834imOo',
  CUSTOMER_RECEIPTS: '1EDehpLr_UXUdSTXEhXmsz_HexRvWtmoM'
});

export interface SendReportEmailParams {
  config?: EmailEngineConfig;
  toEmail: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  attachmentBlob?: Blob;
  filename?: string;
  mimeType?: string;
  targetFolderId?: string;
  keepAttachment?: boolean;
}

export interface OnboardingInvitationParams {
  userName?: string;
  userEmail: string;
  userTitle?: string;
  tempPassword?: string;
  siteUrl?: string;
}

export interface SendUserInvitationEmailParams extends OnboardingInvitationParams {
  config?: EmailEngineConfig;
}

export interface SignedNdaDocumentParams {
  signerName?: string;
  signerEmail?: string;
  signerIdNumber?: string;
  signerDate?: string;
  signatureText?: string;
  signatureDataUrl?: string;
  signatureTableHtml?: string;
  preferImageSignature?: boolean;
  trialDays?: number;
  signedAtTimestamp?: string;
}

export interface SendSignedNdaEmailParams extends SignedNdaDocumentParams {
  config?: EmailEngineConfig;
  adminEmail?: string;
}

export interface UserSurveyParams {
  userName?: string;
  userEmail?: string;
  userTitle?: string;
  userGroup?: string;
  isTrialUser?: boolean;
  ratings?: Record<string, number | string>;
  recommendToColleaguesAndManager?: string;
  overallFeedback?: string;
  improvementSuggestions?: string;
  submittedAt?: string;
}

export interface SendUserSurveyEmailParams extends UserSurveyParams {
  config?: EmailEngineConfig;
  adminEmail?: string;
}

export interface PedagogicalGap {
  studentName?: string;
  goalTitle?: string;
  framework?: string;
  environment?: string;
  daysSinceObservation?: number;
  neverObserved?: boolean;
  currentProgress?: number;
}

export interface PedagogicalObservation {
  studentName?: string;
  goalTitle?: string;
  framework?: string;
  environment?: string;
  supportLevel?: string;
  note?: string;
  timestamp?: string;
}

export interface PedagogicalAdvancedGoal {
  studentName?: string;
  goalTitle?: string;
  environment?: string;
  currentProgress?: number;
}

export interface PedagogicalAccomplishments {
  recentObservations?: PedagogicalObservation[];
  advancedGoals?: PedagogicalAdvancedGoal[];
  completedTasks?: Array<{
    id?: string;
    studentId?: string;
    studentName?: string;
    framework?: string;
    text?: string;
    date?: string;
    time?: string;
    completedAt?: string;
    isAiGenerated?: boolean;
    [key: string]: any;
  }>;
  pendingTasks?: any[];
}

export interface PedagogicalReminderEmailParams {
  teacherName?: string;
  gaps?: PedagogicalGap[];
  accomplishments?: PedagogicalAccomplishments | null;
  students?: any[];
  executiveDigest?: ExecutiveAiPedagogicalDigest;
  totalStudents?: number;
  privacyMode?: 'full_name' | 'acronym';
  siteUrl?: string;
}

export interface SendPedagogicalReminderEmailParams extends PedagogicalReminderEmailParams {
  config?: EmailEngineConfig;
  toEmail: string;
}

// Default template for Google Apps Script Direct Email Dispatcher (100% Free, Unlimited Attachments up to 25MB)
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var driveFileUrl = '';
    var fileBlob = null;
    if (data.attachmentBase64 && data.filename) {
      fileBlob = Utilities.newBlob(
        Utilities.base64Decode(data.attachmentBase64),
        data.mimeType || 'application/octet-stream',
        data.filename
      );
    }
    if (fileBlob && data.targetFolderId) {
      try {
        var folder = DriveApp.getFolderById(data.targetFolderId);
        var createdFile = folder.createFile(fileBlob);
        driveFileUrl = createdFile.getUrl();
      } catch (driveErr) {
        // Fallback: If Drive saving fails, keep file as attachment
      }
    }
    var mailHtml = data.htmlBody || '';
    if (driveFileUrl) {
      mailHtml += '<div dir="rtl" style="margin-top:20px; padding:14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; text-align:right; font-family:Arial,sans-serif;">' +
        '📁 <strong>המסמך נשמר ב-Google Drive:</strong><br/>' +
        '<a href="' + driveFileUrl + '" target="_blank" style="color:#1d4ed8; font-weight:bold; word-break:break-all;">צפייה במסמך בתיקיית TALA</a>' +
        '</div>';
    }
    var mailOptions = {
      to: data.to,
      subject: data.subject,
      htmlBody: mailHtml,
      name: data.senderName || 'מערכת TALA - תוכנית עבודה אקולוגית'
    };
    if (fileBlob && (!driveFileUrl || data.keepAttachment)) {
      mailOptions.attachments = [fileBlob];
    }
    MailApp.sendEmail(mailOptions);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, driveUrl: driveFileUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbygVhGQbi4peK7Bzr4A5z1SuFD1uDbgtfSiNblQNtfVrvn5sAZaiVwDC2kaTBJ9m3L5/exec';

export function loadEmailEngineConfig(): EmailEngineConfig {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(EMAIL_ENGINE_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'apps_script',
        appsScriptUrl: (parsed.appsScriptUrl || '').trim() || DEFAULT_APPS_SCRIPT_URL,
        emailjsServiceId: parsed.emailjsServiceId || '',
        emailjsTemplateId: parsed.emailjsTemplateId || '',
        emailjsPublicKey: parsed.emailjsPublicKey || '',
        senderName: parsed.senderName || 'מערכת TALA – תוכנית עבודה אקולוגית'
      };
    }
  } catch (e) {
    console.warn('Failed to load email engine config:', e);
  }
  return {
    provider: 'apps_script',
    appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    senderName: 'מערכת TALA – תוכנית עבודה אקולוגית'
  };
}

export function saveEmailEngineConfig(configObj: Partial<EmailEngineConfig>): EmailEngineConfig {
  const normalized: EmailEngineConfig = {
    provider: configObj?.provider || 'apps_script',
    appsScriptUrl: (configObj?.appsScriptUrl || '').trim() || DEFAULT_APPS_SCRIPT_URL,
    emailjsServiceId: (configObj?.emailjsServiceId || '').trim(),
    emailjsTemplateId: (configObj?.emailjsTemplateId || '').trim(),
    emailjsPublicKey: (configObj?.emailjsPublicKey || '').trim(),
    senderName: (configObj?.senderName || 'מערכת TALA – תוכנית עבודה אקולוגית').trim()
  };
  localStorage.setItem(EMAIL_ENGINE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function isDirectEmailEngineConfigured(configObj?: EmailEngineConfig): boolean {
  const cfg = configObj || loadEmailEngineConfig();
  if (cfg.provider === 'emailjs') {
    return Boolean(
      cfg.emailjsServiceId?.trim() &&
        cfg.emailjsTemplateId?.trim() &&
        cfg.emailjsPublicKey?.trim()
    );
  }
  return Boolean(
    cfg.appsScriptUrl?.trim() &&
      cfg.appsScriptUrl.trim().startsWith('https://script.google.com/')
  );
}

/**
 * Convert a Blob to a pure Base64 string (without the data:...;base64, prefix)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const base64Part = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Part);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate a real landscape PDF Blob in the background using html2pdf.js (no print window needed!)
 */
export async function generatePdfBlobFromHtml(htmlString: string, filename = 'report.pdf'): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '1060px';
  container.style.direction = 'rtl';
  container.style.background = '#ffffff';
  container.style.padding = '16px';
  container.innerHTML = htmlString;
  document.body.appendChild(container);

  try {
    const opt = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'landscape'
      }
    };

    const html2pdfModule: any = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || html2pdfModule;
    const pdfBlob: Blob = await html2pdf().set(opt).from(container).outputPdf('blob');
    return pdfBlob;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Validates email dispatch parameters to prevent CRLF header injection and malformed recipient addresses.
 */
export function validateEmailDispatchParams(toEmail?: string, subject?: string): void {
  const email = String(toEmail || '').trim();
  if (!email || !email.includes('@') || /[\r\n]/.test(email) || email.length > 320) {
    throw new Error('כתובת דוא"ל נמען אינה תקינה או מכילה תווים אסורים');
  }
  const subj = String(subject || '').trim();
  if (/[\r\n]/.test(subj) || subj.length > 500) {
    throw new Error('נושא ההודעה מכיל תווים אסורים או חורג מהאורך המותר');
  }
}

/**
 * Dispatch an email with the attached DOCX or PDF file in the background
 * using either Google Apps Script Relay (recommended) or EmailJS REST API.
 */
export async function sendReportEmailInBackground({
  config,
  toEmail,
  subject,
  htmlBody,
  textBody,
  attachmentBlob,
  filename,
  mimeType,
  targetFolderId,
  keepAttachment
}: SendReportEmailParams): Promise<{ ok: boolean; provider: string }> {
  validateEmailDispatchParams(toEmail, subject);
  const cfg = config || loadEmailEngineConfig();
  const base64Data = attachmentBlob ? await blobToBase64(attachmentBlob) : '';

  if (cfg.provider === 'emailjs' && cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey) {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: cfg.emailjsServiceId.trim(),
        template_id: cfg.emailjsTemplateId.trim(),
        user_id: cfg.emailjsPublicKey.trim(),
        template_params: {
          to_email: toEmail,
          subject,
          message: textBody,
          html_report: htmlBody,
          filename: filename || '',
          content: base64Data
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`EmailJS Error (${response.status}): ${errText}`);
    }
    return { ok: true, provider: 'emailjs' };
  }

  if (cfg.appsScriptUrl && cfg.appsScriptUrl.trim().startsWith('https://script.google.com/')) {
    const payload: any = {
      to: toEmail,
      subject,
      htmlBody,
      textBody,
      senderName: cfg.senderName || 'מערכת TALA – תוכנית עבודה אקולוגית',
      filename: filename || 'TALA_Info.html',
      mimeType: mimeType || 'text/html',
      attachmentBase64: base64Data
    };

    if (targetFolderId) {
      payload.targetFolderId = targetFolderId;
    }
    if (keepAttachment !== undefined) {
      payload.keepAttachment = keepAttachment;
    }

    const response = await fetch(cfg.appsScriptUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    let resultJson: any = null;
    try {
      resultJson = await response.json();
    } catch (_) {
      // If opaque or non-JSON response on redirect, check response.ok
    }

    if (resultJson && resultJson.ok === false) {
      throw new Error(resultJson.error || 'שגיאה בשליחת המייל דרך Google Apps Script.');
    }

    incrementDailyQuotaCount('email');
    recordEmailAuditLogToCloud({ recipientEmail: toEmail }).catch(() => {});
    return { ok: true, provider: 'apps_script' };
  }

  throw new Error('מנוע שליחת המייל הישיר טרם הוגדר.');
}

/**
 * Build an enriched, executive high-level HTML Onboarding Invitation Email (matching the landing page aesthetic)
 */
export function buildOnboardingInvitationHtml({
  userName,
  userEmail,
  userTitle,
  tempPassword,
  siteUrl
}: OnboardingInvitationParams): string {
  const appUrl = siteUrl || 'https://zivitreshef.github.io/TALA/';
  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
    </head>
    <body dir="rtl" style="margin:0; padding:24px 12px; background-color:#f0f4fa; font-family: Arial, Helvetica, sans-serif; color:#1e293b; text-align:right;">
      <div dir="rtl" style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #cbd5e1; box-shadow:0 12px 32px rgba(30, 58, 95, 0.12);">
        
        <!-- Top Stained Glass Strip -->
        <div style="height:6px; background:linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);"></div>

        <!-- Executive Header Banner -->
        <div style="background:linear-gradient(135deg, #1b365d 0%, #3b6ea5 55%, #6b46c1 100%); color:#ffffff; padding:28px 26px; text-align:right;">
          <div style="display:inline-block; background:rgba(255,255,255,0.16); border:1px solid rgba(255,255,255,0.3); border-radius:999px; padding:4px 12px; font-size:12px; font-weight:bold; margin-bottom:12px;">
            ✨ הזמנה רשמית להצטרפות למערכת
          </div>
          <h1 style="margin:0 0 6px 0; font-size:24px; font-weight:800; color:#ffffff;">ברוכים הבאים למערכת TALA</h1>
          <p style="margin:0; font-size:14px; color:#e2e8f0; line-height:1.5;">
            תוכנית עבודה שנתית – תל"א (תוכנית לימודים אישית) / תח"י (תוכנית חינוכית יחידנית) ברוח הגישה האקולוגית
          </p>
        </div>

        <!-- Body Content -->
        <div style="padding:26px; text-align:right;">
          <p style="margin:0 0 12px 0; font-size:16px; font-weight:bold; color:#1e3a5f;">
            שלום ${userName || 'צוות חינוכי יקר'},
          </p>
          <p style="margin:0 0 20px 0; font-size:14px; line-height:1.65; color:#334155;">
            חשבונך הוגדר בהצלחה במערכת <strong>TALA</strong> בתפקיד <strong>${userTitle || 'צוות חינוכי'}</strong>.
            המערכת פותחה כדי להעניק לך סביבת עבודה חכמה, מהירה ומאובטחת לבניית תוכניות עבודה אקולוגיות שנתיות מותאמות אישית.
          </p>

          <!-- High-Level Highlights (Matching Landing Page) -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-right:4px solid #6b46c1; border-radius:12px; padding:16px 18px; margin-bottom:22px;">
            <div style="font-size:14px; font-weight:bold; color:#1e3a5f; margin-bottom:12px;">
              🌟 עיקרי היכולות במערכת TALA:
            </div>
            <table dir="rtl" border="0" cellpadding="0" cellspacing="0" style="width:100%; font-size:13.5px; color:#334155;">
              <tr>
                <td style="padding:6px 0; vertical-align:top; width:26px; font-size:16px;">📈</td>
                <td style="padding:6px 0;">
                  <strong>מאגר מטרות ויעדים אקולוגי חכם:</strong> מותאם לסביבות ההשתתפות בגן ובבית הספר ומדורג אוטומטית לפי שכיחות צוותית.
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0; vertical-align:top; width:26px; font-size:16px;">🪄</td>
                <td style="padding:6px 0;">
                  <strong>בינה מלאכותית (AI) ושאלות מנחות:</strong> הפקת תקציר מנהלים מקצועי וניסוח מטרות מותאם מגדרית מתוך תיאור תפקוד חופשי.
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0; vertical-align:top; width:26px; font-size:16px;">🛡️</td>
                <td style="padding:6px 0;">
                  <strong>הגנת פרטיות, ייצוא ושליחה במייל:</strong> הפקת דוחות רשמיים להדפסה או שליחה ישירה במייל (Word / PDF) עם השחרת פרטים מזהים וראשי תיבות, ושמירה רב-שנתית בענן.
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0; vertical-align:top; width:26px; font-size:16px;">📅</td>
                <td style="padding:6px 0;">
                  <strong>מעקב יומי, משימות ולוח שנה מסונכרן:</strong> יומן פדגוגי עם חגי ישראל וחופשות, סנכרון ל-Outlook 365 ול-Google Calendar, ועדכון יעדים מהיר ב-AI.
                </td>
              </tr>
            </table>
          </div>

          <!-- Credentials Box with Temp Password -->
          <div style="background:#eef3fb; border:1.5px solid #5b9bd5; border-radius:12px; padding:18px 20px; margin-bottom:22px;">
            <div style="font-size:14.5px; font-weight:bold; color:#1b365d; margin-bottom:10px;">
              🔑 פרטי הכניסה הראשוניים שלך:
            </div>
            <div style="font-size:13.5px; color:#1e293b; margin-bottom:8px;">
              <strong>כתובת אימייל לכניסה:</strong> <span dir="ltr" style="font-family:monospace; background:#ffffff; padding:3px 8px; border-radius:6px; border:1px solid #cbd5e1;">${userEmail}</span>
            </div>
            <div style="font-size:13.5px; color:#1e293b; margin-bottom:10px;">
              <strong>סיסמה זמנית ראשונית:</strong> <span dir="ltr" style="font-family:monospace; font-size:15px; font-weight:bold; color:#4c1d95; background:#ffffff; padding:4px 10px; border-radius:6px; border:1px solid #a78bfa;">${tempPassword || ''}</span>
            </div>
            <div style="font-size:12px; color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:8px 10px; border-radius:8px; font-weight:bold;">
              🔒 שים/י לב: מטעמי אבטחת מידע, בכניסתך הראשונה לאתר תתבקש/י לבחור סיסמה אישית חדשה ומיד לאחר מכן תוכל/י להתחיל בעבודה השוטפת.
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center; margin:24px 0 12px 0;">
            <a href="${appUrl}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block; background:linear-gradient(135deg, #2b6cb0 0%, #6b46c1 100%); color:#ffffff; text-decoration:none; font-size:15px; font-weight:bold; padding:12px 28px; border-radius:10px; box-shadow:0 4px 12px rgba(107, 70, 193, 0.3);">
              כניסה למערכת TALA והגדרת סיסמה אישית &larr;
            </a>
          </div>
          <div style="text-align:center; font-size:12px; color:#64748b;">
            קישור ישיר: <a href="${appUrl}" style="color:#2563eb;">${appUrl}</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:14px 24px; text-align:center; font-size:12px; color:#64748b;">
          הודעה זו נשלחה אוטומטית ממערכת <strong>TALA – תוכנית עבודה אקולוגית</strong>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send the onboarding invitation email in the background.
 */
export async function sendUserInvitationEmailInBackground({
  config,
  userName,
  userEmail,
  userTitle,
  tempPassword,
  siteUrl
}: SendUserInvitationEmailParams): Promise<{ ok: boolean; provider: string }> {
  const htmlBody = buildOnboardingInvitationHtml({
    userName,
    userEmail,
    userTitle,
    tempPassword,
    siteUrl
  });

  const subject = `ברוכים הבאים למערכת TALA – פרטי כניסה וסיסמה זמנית עבור ${userName || userEmail}`;
  const textBody = [
    `שלום ${userName || userEmail},`,
    '',
    `ברוכים הבאים למערכת TALA – תוכנית עבודה שנתית (תל"א / תח"י) ברוח הגישה האקולוגית.`,
    `אימייל לכניסה: ${userEmail}`,
    `סיסמה זמנית: ${tempPassword || ''}`,
    `בכניסתך הראשונה תתבקש/י להחליף את הסיסמה הזמנית לסיסמה אישית חדשה.`,
    `קישור למערכת: ${siteUrl || 'https://zivitreshef.github.io/TALA/'}`
  ].join('\r\n');

  const welcomeCardBlob = new Blob(['\ufeff', htmlBody], {
    type: 'text/html;charset=utf-8'
  });

  return sendReportEmailInBackground({
    config,
    toEmail: userEmail,
    subject,
    htmlBody,
    textBody,
    attachmentBlob: welcomeCardBlob,
    filename: 'TALA_Welcome_Credentials.html',
    mimeType: 'text/html'
  });
}

/**
 * Builds the official Hebrew NDA Agreement HTML document signed by a trial user.
 */
export function buildSignedNdaDocumentHtml({
  signerName,
  signerEmail,
  signerIdNumber,
  signerDate,
  signatureText,
  signatureDataUrl,
  signatureTableHtml,
  preferImageSignature = false,
  trialDays = 7,
  signedAtTimestamp
}: SignedNdaDocumentParams): string {
  const cleanName = signerName || 'משתמש/ת ניסיון';
  const cleanEmail = signerEmail || '';
  const cleanId = signerIdNumber || '';
  const cleanDate = signerDate || new Date().toLocaleDateString('he-IL');
  const cleanStamp =
    signedAtTimestamp ||
    new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

  const stampLabel = signatureText || cleanName;
  const digitalSignatureStampHtml = `<div style="margin-top:6px; font-family:'Segoe Script', 'Rubik', cursive, Arial, sans-serif; font-size:18px; font-weight:bold; font-style:italic; color:#1e3a5f; background:#ffffff; border:1px solid #94a3b8; border-bottom:2px solid #1e3a5f; border-radius:6px; display:inline-block; padding:5px 16px;">✍️ ${stampLabel}</div>`;

  let graphicSignatureHtml = '';
  if (preferImageSignature && signatureDataUrl) {
    graphicSignatureHtml = `<div style="margin-top:8px;"><img src="${signatureDataUrl}" alt="חתימת המשתמש" style="display:block; height:72px; width:240px; object-fit:contain; background:#ffffff; border:1.5px solid #64748b; border-bottom:2.5px solid #1e3a5f; border-radius:6px; padding:4px;" /></div>`;
  } else if (signatureTableHtml) {
    graphicSignatureHtml = `<div style="margin-top:8px;">${signatureTableHtml}</div>`;
  } else if (signatureDataUrl) {
    graphicSignatureHtml = `<div style="margin-top:8px;"><img src="${signatureDataUrl}" alt="חתימת המשתמש" style="display:block; max-height:80px; max-width:240px; background:#ffffff; border:1.5px solid #64748b; border-bottom:2.5px solid #1e3a5f; border-radius:6px; padding:4px;" /></div>`;
  }

  const signatureBlockHtml = `${graphicSignatureHtml}${digitalSignatureStampHtml}`;

  return `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>הסכם שמירת סודיות (NDA) – ${cleanName}</title>
    </head>
    <body dir="rtl" style="margin:0; padding:20px; background:#f8fafc; font-family:Arial, Helvetica, sans-serif; color:#1e293b; text-align:right; direction:rtl;">
      <div dir="rtl" style="max-width:700px; margin:0 auto; background:#ffffff; border:2px solid #2b4c7e; border-radius:14px; overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1b365d 0%, #3b6ea5 55%, #6b46c1 100%); color:#ffffff; padding:20px 24px;">
          <div style="font-size:12px; opacity:0.9; margin-bottom:6px;">מסמך משפטי חתום • מערכת TALA (גרסת התנסות סגורה)</div>
          <h1 style="margin:0; font-size:21px; font-weight:800;">כתב התחייבות לשמירת סודיות, קניין רוחני ואי-הפצה (NDA)</h1>
        </div>

        <div style="padding:22px 26px; line-height:1.65; font-size:13.5px;">
          <p style="margin:0 0 12px 0;">
            שנערך ונחתם באופן דיגיטלי בתאריך <strong>${cleanDate}</strong> (${cleanStamp})
          </p>

          <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-right:4px solid #3b6ea5; border-radius:8px; padding:12px 16px; margin-bottom:16px;">
            <div><strong>שם החותם/ת:</strong> ${cleanName}</div>
            <div><strong>מספר תעודת זהות (ת.ז.):</strong> ${cleanId}</div>
            <div><strong>כתובת דוא"ל:</strong> <span dir="ltr">${cleanEmail}</span></div>
            <div><strong>תקופת גישה מוגדרת למשתמש ניסיון:</strong> ${trialDays} ימים</div>
          </div>

          <p style="margin:0 0 8px 0;"><strong>הואיל</strong> ומערכת <strong>TALA – תוכנית עבודה אקולוגית (תל"א / תח"י)</strong> הינה מערכת טכנולוגית-פדגוגית ייחודית המצויה בשלבי פיתוח והרצה מבוקרים וטרם הופצה באופן פומבי או מסחרי;</p>
          <p style="margin:0 0 8px 0;"><strong>והואיל</strong> וכל זכויות היוצרים, הקניין הרוחני, הסודות המסחריים, המתודולוגיה הפדגוגית, מבנה המאגרים, מנגנוני ה-AI, העיצוב וקוד המקור במערכת שייכים באופן בלעדי ליוצרת ובעלת המערכת, <strong>גב' זיוית רשף</strong>;</p>
          <p style="margin:0 0 12px 0;"><strong>והואיל</strong> ולמשתמש/ת ניתנת בזאת הרשאת גישה זמנית ואישית להתנסות במערכת ("משתמש ניסיון") לתקופה קצובה של <strong>${trialDays} ימים</strong> בלבד;</p>

          <h3 style="color:#1e3a5f; font-size:15px; margin:14px 0 8px 0;">לפיכך מצהיר/ה ומתחייב/ת החותם/ת כדלקמן:</h3>
          <ol style="margin:0 0 16px 0; padding-right:20px;">
            <li style="margin-bottom:6px;">
              <strong>שמירת סודיות מוחלטת:</strong> לשמור בסודיות מוחלטת ולא לגלות, להציג, להעביר או לחשוף בפני כל צד שלישי כל מידע הקשור למערכת TALA, לרבות ממשק המשתמש, מבנה הטפסים, מאגר המטרות והיעדים, מנגנוני הבינה המלאכותית, דו"חות המצב וההערכה, או כל חלק מהם.
            </li>
            <li style="margin-bottom:6px;">
              <strong>איסור העתקה, צילום או הפצה:</strong> לא להעתיק, לצלם מסכים, לשכפל, להנדס לאחור (Reverse Engineer), לפתח מוצר מתחרה או לעשות כל שימוש מסחרי או ארגוני ברעיונות, במבנה הפדגוגי או בתוצרי המערכת ללא אישור מראש ובכתב מבעלת המערכת.
            </li>
            <li style="margin-bottom:6px;">
              <strong>שימוש אישי בלבד ושמירה על פרטיות:</strong> הרשאת הכניסה הינה אישית בלבד ואינה ניתנת להעברה. החותם/ת מתחייב/ת שלא להעביר את קוד הגישה לאף אדם אחר ולשמור על חיסיון מלא של כל מידע שיוזן למערכת.
            </li>
            <li style="margin-bottom:6px;">
              <strong>פקיעת הרשאת הניסיון:</strong> ידוע לחותם/ת כי הגישה למערכת מוגבלת לתקופת הניסיון שהוגדרה (${trialDays} ימים, או כפי שיעודכן על ידי מנהלת המערכת), וכי תוקף התחייבות סודיות זו אינו מוגבל בזמן ויעמוד בתוקפו גם לאחר סיום תקופת הניסיון.
            </li>
          </ol>

          <div style="background:#eef3fb; border:1.5px solid #5b9bd5; border-radius:10px; padding:14px 18px; margin-top:16px;">
            <div style="font-weight:bold; color:#1b365d; margin-bottom:6px;">✍️ הצהרה וחתימת משתמש/ת הניסיון:</div>
            <div style="font-size:13px; margin-bottom:10px;">
              אני הח"מ, <strong>${cleanName}</strong>, נושא/ת ת.ז. מס' <strong>${cleanId}</strong>, מאשר/ת כי קראתי בעיון את כתב ההתחייבות לשמירת סודיות וקניין רוחני, הבנתי את תוכנו ואני מתחייב/ת לקיימו במלואו.
            </div>
            <table dir="rtl" border="0" cellpadding="0" cellspacing="0" style="width:100%; margin-top:8px;">
              <tr>
                <td style="vertical-align:bottom; padding-left:16px;">
                  <div style="font-size:12px; font-weight:bold; color:#1e3a5f; margin-bottom:4px;">חתימת המשתמש/ת:</div>
                  ${signatureBlockHtml}
                  <div style="font-size:12.5px; font-weight:bold; color:#1e293b; margin-top:6px;">
                    שם החותם/ת: ${stampLabel} &nbsp;|&nbsp; ת.ז.: ${cleanId}
                  </div>
                </td>
                <td style="vertical-align:bottom; text-align:left; font-size:12.5px; color:#1e3a5f; white-space:nowrap;">
                  <div><strong>תאריך חתימה:</strong> ${cleanDate}</div>
                  <div><strong>חותמת זמן:</strong> ${cleanStamp}</div>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates a Portrait A4 PDF Blob of the signed NDA document (with the drawn signature image baked in).
 */
async function generateSignedNdaPdfBlob(htmlString: string, filename = 'TALA_Signed_NDA.pdf'): Promise<Blob> {
  const container = document.createElement('div');
  container.style.width = '720px';
  container.style.direction = 'rtl';
  container.style.background = '#ffffff';
  container.style.padding = '8px';
  container.style.boxSizing = 'border-box';
  container.innerHTML = htmlString;

  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      if (typeof img.decode === 'function') {
        return img.decode().catch(() => {});
      }
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  const opt = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  const html2pdfModule: any = await import('html2pdf.js');
  const html2pdf = html2pdfModule.default || html2pdfModule;
  const pdfBlob: Blob = await html2pdf().set(opt).from(container).outputPdf('blob');
  if (!pdfBlob || pdfBlob.size < 500) {
    throw new Error('Generated PDF blob was empty');
  }
  return pdfBlob;
}

/**
 * Sends the signed NDA agreement directly to the Admin email address
 */
export async function sendSignedNdaEmailToAdmin({
  config,
  adminEmail = 'zivit.reshef@gmail.com',
  signerName,
  signerEmail,
  signerIdNumber,
  signerDate,
  signatureText,
  signatureDataUrl,
  signatureTableHtml,
  trialDays = 7,
  signedAtTimestamp
}: SendSignedNdaEmailParams): Promise<{ ok: boolean; provider: string }> {
  const emailHtmlBody = buildSignedNdaDocumentHtml({
    signerName,
    signerEmail,
    signerIdNumber,
    signerDate,
    signatureText,
    signatureDataUrl,
    signatureTableHtml,
    preferImageSignature: false,
    trialDays,
    signedAtTimestamp
  });

  const pdfHtmlSource = buildSignedNdaDocumentHtml({
    signerName,
    signerEmail,
    signerIdNumber,
    signerDate,
    signatureText,
    signatureDataUrl,
    signatureTableHtml,
    preferImageSignature: true,
    trialDays,
    signedAtTimestamp
  });

  const subject = `✍️ הסכם סודיות (NDA) חתום – משתמש ניסיון: ${signerName || 'לא צוין'} (ת.ז. ${signerIdNumber || 'לא צוין'})`;
  const textBody = [
    `שלום זיוית,`,
    '',
    `משתמש/ת הניסיון ${signerName || ''} (${signerEmail || ''}) התחבר/ה למערכת TALA, החליף/ה סיסמה וחתם/ה כעת על הסכם שמירת סודיות (NDA).`,
    `מספר ת.ז.: ${signerIdNumber || ''}`,
    `תאריך חתימה: ${signerDate || ''}`,
    `מגבלת ימי ניסיון: ${trialDays} ימים`,
    '',
    `מצורף עותק PDF רשמי של המסמך החתום הכולל את חתימת המשתמש/ת.`
  ].join('\r\n');

  const safeName = String(signerName || 'TrialUser').replace(/[^א-תa-zA-Z0-9_-]/g, '_');

  let attachmentBlob: Blob;
  let filename: string;
  let mimeType: string;

  try {
    filename = `TALA_Signed_NDA_${safeName}_${signerIdNumber || '0'}.pdf`;
    attachmentBlob = await generateSignedNdaPdfBlob(pdfHtmlSource, filename);
    mimeType = 'application/pdf';
  } catch (pdfErr) {
    console.warn('Fallback to .doc attachment for NDA:', pdfErr);
    filename = `TALA_Signed_NDA_${safeName}_${signerIdNumber || '0'}.doc`;
    attachmentBlob = new Blob(['\ufeff', emailHtmlBody], {
      type: 'application/msword;charset=utf-8'
    });
    mimeType = 'application/msword';
  }

  return sendReportEmailInBackground({
    config,
    toEmail: adminEmail,
    subject,
    htmlBody: emailHtmlBody,
    textBody,
    attachmentBlob,
    filename,
    mimeType,
    targetFolderId: GOOGLE_DRIVE_FOLDERS.NDAS
  });
}

/**
 * Builds a formatted Hebrew HTML document for the User Experience & Feedback Survey.
 */
export function buildUserSurveyEmailHtml({
  userName,
  userEmail,
  userTitle,
  userGroup,
  isTrialUser,
  ratings = {},
  recommendToColleaguesAndManager = '',
  overallFeedback = '',
  improvementSuggestions = '',
  submittedAt
}: UserSurveyParams): string {
  const cleanName = userName || 'משתמש/ת מערכת TALA';
  const cleanEmail = userEmail || '';
  const cleanTitle = userTitle || 'צוות חינוכי';
  const cleanGroup = userGroup || '—';
  const stamp =
    submittedAt ||
    new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

  const categories = [
    {
      key: 'easeOfWebsite',
      label: '1. קלות ונוחות השימוש באתר ובממשק המערכת (Ease of Website)'
    },
    {
      key: 'createStudent',
      label: '2. יצירה והקמה של כרטיס תלמיד/ה חדש/ה (Creating New Student)'
    },
    {
      key: 'generateGoals',
      label: '3. ניסוח ובניית מטרות ויעדים – מאגר מטרות ו-AI (Generating Goals)'
    },
    {
      key: 'createReport',
      label: '4. הפקת דוחות – תל"א/תח"י, דו"ח מצב ודוח הערכה (Creating Reports)'
    },
    {
      key: 'collaborateWithColleagues',
      label: '5. שיתוף תלמיד/ה ועבודה משותפת עם קולגות בצוות (Maintaining Student with Colleagues)'
    }
  ];

  const numericScores = categories
    .map((c) => Number(ratings[c.key]) || 0)
    .filter((v) => v > 0);
  const avgScore =
    numericScores.length > 0
      ? (numericScores.reduce((acc, v) => acc + v, 0) / numericScores.length).toFixed(1)
      : '—';

  const renderStars = (score: number | string | undefined) => {
    const n = Math.max(0, Math.min(5, Number(score) || 0));
    if (!n) return '<span style="color:#94a3b8;">לא דורג</span>';
    return (
      '<span style="color:#f59e0b; font-size:16px; letter-spacing:1px;">' +
      '★'.repeat(n) +
      '☆'.repeat(5 - n) +
      `</span> <strong style="color:#1e3a5f;">(${n}/5)</strong>`
    );
  };

  const rowsHtml = categories
    .map(
      (cat) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; font-weight:bold; color:#1e293b;">
          ${cat.label}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:left; white-space:nowrap;">
          ${renderStars(ratings[cat.key])}
        </td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>משוב משתמש מערכת TALA – ${cleanName}</title>
    </head>
    <body dir="rtl" style="margin:0; padding:20px; background:#f0f4fa; font-family:Arial, Helvetica, sans-serif; color:#1e293b; text-align:right; direction:rtl;">
      <div dir="rtl" style="max-width:680px; margin:0 auto; background:#ffffff; border:2px solid #3b6ea5; border-radius:16px; overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1b365d 0%, #3b6ea5 55%, #6b46c1 100%); color:#ffffff; padding:22px 26px;">
          <div style="font-size:12px; opacity:0.9; margin-bottom:6px;">⭐ שאלון חוויית משתמש ומשוב תקופתי • מערכת TALA</div>
          <h1 style="margin:0; font-size:22px; font-weight:800;">משוב משתמש/ת על העבודה במערכת TALA</h1>
        </div>

        <div style="padding:22px 26px; line-height:1.65; font-size:13.5px;">
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-right:4px solid #6b46c1; border-radius:10px; padding:12px 16px; margin-bottom:18px;">
            <div><strong>שם המשתמש/ת:</strong> ${cleanName} ${isTrialUser ? '(משתמש/ת ניסיון)' : ''}</div>
            <div><strong>דוא"ל:</strong> <span dir="ltr">${cleanEmail}</span></div>
            <div><strong>תפקיד:</strong> ${cleanTitle} &nbsp;|&nbsp; <strong>מסגרת/מתי"א:</strong> ${cleanGroup}</div>
            <div><strong>תאריך שליחת המשוב:</strong> ${stamp} &nbsp;|&nbsp; <strong>ציון משוקלל ממוצע:</strong> <strong style="color:#4c1d95;">${avgScore} / 5</strong></div>
          </div>

          <h3 style="color:#1e3a5f; font-size:15px; margin:0 0 10px 0;">📊 דירוג חוויית השימוש לפי תחומים (1–5 כוכבים):</h3>
          <table dir="rtl" border="0" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; margin-bottom:18px; font-size:13px;">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div style="background:#eef3fb; border:1.5px solid #5b9bd5; border-radius:10px; padding:12px 16px; margin-bottom:16px;">
            <div style="font-weight:bold; color:#1b365d; margin-bottom:4px;">
              💡 האם תמליץ/י לקולגות ולמנהל/ת המסגרת לרכוש גישה להמשך שימוש במערכת?
            </div>
            <div style="font-size:14px; font-weight:bold; color:#4c1d95;">
              ${recommendToColleaguesAndManager || 'לא צוין'}
            </div>
          </div>

          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px 16px; margin-bottom:14px;">
            <div style="font-weight:bold; color:#1e3a5f; margin-bottom:6px;">💬 משוב כללי במילים חופשיות (Overall Feedback):</div>
            <div style="white-space:pre-wrap; color:#334155;">${overallFeedback ? overallFeedback : 'לא הוזן פירוט נוסף.'}</div>
          </div>

          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px;">
            <div style="font-weight:bold; color:#92400e; margin-bottom:6px;">🚀 הצעות לשיפור וייעול (Suggestions for Improvement):</div>
            <div style="white-space:pre-wrap; color:#78350f;">${improvementSuggestions ? improvementSuggestions : 'לא הוזנו הצעות לשיפור.'}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends the completed User Experience Survey directly to the Admin email.
 */
export async function sendUserSurveyEmailToAdmin({
  config,
  adminEmail = 'zivit.reshef@gmail.com',
  userName,
  userEmail,
  userTitle,
  userGroup,
  isTrialUser,
  ratings = {},
  recommendToColleaguesAndManager = '',
  overallFeedback = '',
  improvementSuggestions = '',
  submittedAt
}: SendUserSurveyEmailParams): Promise<{ ok: boolean; provider: string }> {
  const htmlBody = buildUserSurveyEmailHtml({
    userName,
    userEmail,
    userTitle,
    userGroup,
    isTrialUser,
    ratings,
    recommendToColleaguesAndManager,
    overallFeedback,
    improvementSuggestions,
    submittedAt
  });

  const subject = `⭐ משוב משתמש חדש במערכת TALA – מאת ${userName || userEmail || 'משתמש'}`;
  const textBody = [
    `שלום זיוית,`,
    '',
    `התקבל משוב חוויית משתמש חדש במערכת TALA מאת ${userName || ''} (${userEmail || ''}).`,
    `1. קלות ונוחות השימוש באתר: ${ratings.easeOfWebsite || '—'}/5`,
    `2. יצירת כרטיס תלמיד/ה חדש/ה: ${ratings.createStudent || '—'}/5`,
    `3. ניסוח ובניית מטרות ויעדים: ${ratings.generateGoals || '—'}/5`,
    `4. הפקת דוחות: ${ratings.createReport || '—'}/5`,
    `5. עבודה משותפת ושיתוף תלמיד/ה עם קולגות: ${ratings.collaborateWithColleagues || '—'}/5`,
    `המלצה לקולגות ולמנהל/ת לרכישת גישה: ${recommendToColleaguesAndManager || '—'}`,
    `משוב כללי: ${overallFeedback || '—'}`,
    `הצעות לשיפור: ${improvementSuggestions || '—'}`
  ].join('\r\n');

  const safeName = String(userName || 'User').replace(/[^א-תa-zA-Z0-9_-]/g, '_');
  const docBlob = new Blob(['\ufeff', htmlBody], {
    type: 'application/msword;charset=utf-8'
  });

  return sendReportEmailInBackground({
    config,
    toEmail: adminEmail,
    subject,
    htmlBody,
    textBody,
    attachmentBlob: docBlob,
    filename: `TALA_User_Survey_${safeName}.doc`,
    mimeType: 'application/msword',
    targetFolderId: GOOGLE_DRIVE_FOLDERS.TEACHER_SURVEYS
  });
}

/**
 * Build rich HTML email for Pedagogical Summary & Team Meeting Preparation
 */
export function buildPedagogicalReminderEmailHtml({
  teacherName = 'צוות חינוכי',
  gaps = [],
  accomplishments = null,
  students = [],
  executiveDigest: providedDigest,
  totalStudents = 0,
  privacyMode = 'full_name',
  siteUrl = 'https://zivitreshef.github.io/TALA/'
}: PedagogicalReminderEmailParams): string {
  const digest = providedDigest || synthesizeLocalExecutiveDigest({
    students,
    accomplishments,
    gaps,
    privacyMode
  });
  const appUrl = siteUrl || 'https://zivitreshef.github.io/TALA/';

  const recentObs = Array.isArray(accomplishments?.recentObservations)
    ? accomplishments.recentObservations
    : [];
  const advancedGoals = Array.isArray(accomplishments?.advancedGoals)
    ? accomplishments.advancedGoals
    : [];

  const completedTasks = Array.isArray(accomplishments?.completedTasks)
    ? accomplishments.completedTasks
    : [];

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
    </head>
    <body dir="rtl" style="margin:0; padding:24px 12px; background-color:#f0f4fa; font-family: Arial, Helvetica, sans-serif; color:#1e293b; text-align:right;">
      <div dir="rtl" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #cbd5e1; box-shadow:0 12px 32px rgba(30, 58, 95, 0.12);">
        
        <!-- Top Stained Glass Strip -->
        <div style="height:6px; background:linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);"></div>

        <!-- Header Banner -->
        <div style="background:linear-gradient(135deg, #1b365d 0%, #3b6ea5 55%, #6b46c1 100%); color:#ffffff; padding:26px 24px; text-align:right;">
          <div style="display:inline-block; background:rgba(255,255,255,0.16); border:1px solid rgba(255,255,255,0.3); border-radius:999px; padding:3px 12px; font-size:12px; font-weight:bold; margin-bottom:10px;">
            🌟 סיכום פדגוגי שבועי • מוכנות לישיבות צוות
          </div>
          <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:800; color:#ffffff;">הישגים, תצפיות מהעבודה הפרטנית ורציפות יעדים</h1>
          <p style="margin:0; font-size:13.5px; color:#e2e8f0; line-height:1.5;">
            מערכת TALA – תוכנית עבודה שנתית בגישה האקולוגית
          </p>
        </div>

        <!-- Body Content -->
        <div style="padding:24px; text-align:right;">
          <p style="margin:0 0 10px 0; font-size:16px; font-weight:bold; color:#1e3a5f;">
            שלום ${teacherName},
          </p>
          <p style="margin:0 0 18px 0; font-size:13.5px; line-height:1.65; color:#334155;">
            סיכום זה מרכז את עשייתך הפדגוגית: מה שהושג בפועל, תובנות שנרשמו בעבודה הפרטנית, ומוקדים לתשומת לב – מוכן ומאורגן לקראת ישיבות צוות ושיח עם עמיתים והורים.
          </p>

                    <!-- Responsive Positive KPI Badges (Bug 1 Fix - Never truncates) -->
          <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-bottom:22px;">
            <div style="flex:1 1 95px; min-width:95px; max-width:110px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:8px 6px; text-align:center; box-sizing:border-box;">
              <div style="font-size:11px; color:#1e40af; font-weight:700;">תלמידים במעקב</div>
              <div style="font-size:18px; font-weight:800; color:#1d4ed8; margin-top:2px;">${totalStudents}</div>
            </div>
            <div style="flex:1 1 95px; min-width:95px; max-width:110px; background:#f0fdfa; border:1px solid #99f6e4; border-radius:10px; padding:8px 6px; text-align:center; box-sizing:border-box;">
              <div style="font-size:11px; color:#0f766e; font-weight:700;">משימות שבוצעו</div>
              <div style="font-size:18px; font-weight:800; color:#0d9488; margin-top:2px;">${completedTasks.length}</div>
            </div>
            <div style="flex:1 1 95px; min-width:95px; max-width:110px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:8px 6px; text-align:center; box-sizing:border-box;">
              <div style="font-size:11px; color:#166534; font-weight:700;">תצפיות שתועדו</div>
              <div style="font-size:18px; font-weight:800; color:#15803d; margin-top:2px;">${recentObs.length}</div>
            </div>
            <div style="flex:1 1 95px; min-width:95px; max-width:110px; background:#faf5ff; border:1px solid #e9d5ff; border-radius:10px; padding:8px 6px; text-align:center; box-sizing:border-box;">
              <div style="font-size:11px; color:#6b21a8; font-weight:700;">יעדים בתנופה</div>
              <div style="font-size:18px; font-weight:800; color:#7e22ce; margin-top:2px;">${advancedGoals.length}</div>
            </div>
            <div style="flex:1 1 95px; min-width:95px; max-width:110px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:8px 6px; text-align:center; box-sizing:border-box;">
              <div style="font-size:11px; color:#92400e; font-weight:700;">לרציפות (45+)</div>
              <div style="font-size:18px; font-weight:800; color:#d97706; margin-top:2px;">${gaps.length}</div>
            </div>
          </div>

          <!-- Section 1: Executive Overview (AI-Synthesized) -->
          <div style="background:linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border:1px solid #bfdbfe; border-right:4px solid #2563eb; border-radius:10px; padding:14px 16px; margin-bottom:22px; font-size:13.5px; line-height:1.65; color:#1e293b;">
            <div style="font-weight:bold; color:#1d4ed8; margin-bottom:6px; font-size:14px; display:flex; align-items:center; gap:6px;">
              <span>📋</span>
              <span>תמונת מצב פדגוגית מרוכזת:</span>
            </div>
            ${digest.executiveOverview}
          </div>

          <!-- Section 2: Student Highlights, Emerging Challenges & Goal Refinements (Bug 2 & Requirement Fix) -->
          ${
            digest.studentCards.length > 0
              ? `
              <div style="margin-bottom:22px;">
                <div style="font-size:14.5px; font-weight:bold; color:#1e3a5f; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                  <span>🌟</span>
                  <span>הישגים והתקדמות לפי התוכנית (תובנות ודגשים מהעבודה הפרטנית בזמן אמת):</span>
                </div>
                ${digest.studentCards.map((sc) => `
                  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px; margin-bottom:12px; box-shadow:0 2px 5px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:8px; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
                      <div>
                        <strong style="color:#1e3a5f; font-size:15px;">${sc.studentName}</strong>
                        ${sc.framework ? `<span style="color:#64748b; font-size:12px; margin-right:6px;">(${sc.framework})</span>` : ''}
                      </div>
                      <span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px;">פעיל ומקודם</span>
                    </div>

                    <!-- Growth & What Worked -->
                    <div style="font-size:13px; color:#1e293b; margin-bottom:8px; line-height:1.55;">
                      <strong style="color:#15803d;">✨ מה הושג ותנופה:</strong> ${sc.accomplishments}
                    </div>

                    <!-- Emerging Challenges Noted During Observations -->
                    ${sc.challengesAndDifficulties ? `
                      <div style="font-size:12.5px; color:#9a3412; margin-bottom:8px; line-height:1.55; background:#fff7ed; border:1px solid #fed7aa; border-radius:6px; padding:8px 10px;">
                        <strong>⚠️ אתגרים וקשיים שצצו בתצפיות:</strong> ${sc.challengesAndDifficulties}
                      </div>
                    ` : ''}

                    <!-- Pedagogical Goal Adjustments / Actionable Refinements -->
                    ${sc.recommendedGoalRefinements ? `
                      <div style="font-size:12.5px; color:#1e40af; line-height:1.55; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:8px 10px; white-space:pre-line;">
                        <strong>🎯 המלצה לחידוד או התאמת יעדים:</strong> ${sc.recommendedGoalRefinements}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
              `
              : ''
          }

          <!-- Section 3: Inactive Students with No Updates in Period (User Requirement) -->
          ${
            digest.inactiveStudents && digest.inactiveStudents.length > 0
              ? `
              <div style="background:#fff7ed; border:1px solid #fed7aa; border-right:4px solid #f97316; border-radius:10px; padding:14px 16px; margin-bottom:22px;">
                <div style="font-size:13.5px; font-weight:bold; color:#9a3412; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <span>⏳</span>
                  <span>רשימת תלמידים שלא חלה לגביהם התקדמות בתקופה זו (${digest.inactiveStudents.length}):</span>
                </div>
                <p style="margin:0 0 8px 0; font-size:12.5px; color:#7c2d12; line-height:1.5;">
                  עבור התלמידים הבאים לא נרשמו תצפיות שטח, משימות או התקדמות ביעדים:
                </p>
                <ul style="margin:0; padding-right:20px; font-size:12.5px; color:#475569; line-height:1.6;">
                  ${digest.inactiveStudents.map((s) => `
                    <li><strong>${s.studentName}</strong>${s.framework ? ` (${s.framework})` : ''} – ${s.note}</li>
                  `).join('')}
                </ul>
              </div>
              `
              : ''
          }

          <!-- Section 4: Strategic Meeting Priorities (Conditional) -->
          ${
            digest.strategicPriorities && digest.strategicPriorities.length > 0
              ? `
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 18px; margin-bottom:24px;">
                <div style="font-size:14px; font-weight:bold; color:#1e3a5f; margin-bottom:8px;">
                  🤝 נקודות מפתח להצגה בישיבת צוות / שיתוף הורים:
                </div>
                <ul style="margin:0; padding-right:20px; font-size:13px; color:#334155; line-height:1.65;">
                  ${digest.strategicPriorities.map((p) => `<li>${p}</li>`).join('')}
                </ul>
              </div>
              `
              : ''
          }

          <!-- 1-Click Action Button -->
          <div style="text-align:center; margin:24px 0 16px 0;">
            <a href="${appUrl}" style="display:inline-block; background:linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color:#ffffff; font-weight:bold; font-size:14.5px; text-decoration:none; padding:12px 32px; border-radius:10px; box-shadow:0 4px 14px rgba(37, 99, 235, 0.35);">
              🚀 כניסה למעקב יעדים באפליקציה
            </a>
          </div>

          <div style="border-top:1px solid #e2e8f0; margin-top:24px; padding-top:14px; font-size:11.5px; color:#64748b; text-align:center; line-height:1.6;">
            סיכום זה הופק ונשלח בהתאם להגדרות האישיות שלך במערכת TALA.<br/>
            ניתן להתאים את מועד קבלת הסיכום (שבועי/חודשי) בכל עת במסך "העדפות מורה".
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send Pedagogical Reminder Email in background
 */
export async function sendPedagogicalReminderEmailInBackground({
  config,
  toEmail,
  teacherName = 'צוות חינוכי',
  gaps = [],
  accomplishments = null,
  students = [],
  executiveDigest: providedDigest,
  totalStudents = 0,
  privacyMode = 'full_name',
  siteUrl = 'https://zivitreshef.github.io/TALA/'
}: SendPedagogicalReminderEmailParams): Promise<{ ok: boolean; provider: string }> {
  // Generate or use executive pedagogical digest
  const executiveDigest = providedDigest || await generateExecutivePedagogicalDigest({
    students,
    accomplishments,
    gaps,
    privacyMode
  });

  const htmlBody = buildPedagogicalReminderEmailHtml({
    teacherName,
    gaps,
    accomplishments,
    students,
    executiveDigest,
    totalStudents: totalStudents || (students ? students.length : 0),
    privacyMode,
    siteUrl
  });

  const recentObsCount = Array.isArray(accomplishments?.recentObservations)
    ? accomplishments.recentObservations.length
    : 0;
  const advancedCount = Array.isArray(accomplishments?.advancedGoals)
    ? accomplishments.advancedGoals.length
    : 0;
  const completedCount = Array.isArray(accomplishments?.completedTasks)
    ? accomplishments.completedTasks.length
    : 0;

  const textBody = [
    `שלום ${teacherName},`,
    '',
    `סיכום פדגוגי שבועי ומוכנות לישיבות צוות ממערכת TALA.`,
    `סה"כ תלמידים במעקב: ${totalStudents}`,
    `תצפיות שתועדו לאחרונה: ${recentObsCount}`,
    `יעדים בהתקדמות מרשימה: ${advancedCount}`,
    `יעדים לתשומת לב (45+ יום): ${gaps.length}`,
    '',
    `לכניסה למערכת: ${siteUrl || 'https://zivitreshef.github.io/TALA/'}`
  ].join('\r\n');

  return sendReportEmailInBackground({
    config,
    toEmail,
    subject: `🌟 סיכום פדגוגי שבועי ומוכנות לישיבות צוות (${advancedCount} יעדים בתנופה, ${recentObsCount} תצפיות, ${completedCount} משימות שבוצעו)`,
    htmlBody,
    textBody,
    filename: 'PedagogicalSummary.html',
    mimeType: 'text/html'
  });
}

export interface CustomerReceiptParams {
  customerName?: string;
  customerEmail?: string;
  receiptNumber?: string;
  amount?: number | string;
  planName?: string;
  billingPeriod?: string;
  paymentMethod?: string;
  invoiceDate?: string;
  receiptHtml?: string;
  receiptBlob?: Blob;
}

export interface SendCustomerReceiptEmailParams extends CustomerReceiptParams {
  config?: EmailEngineConfig;
  adminEmail?: string;
}

/**
 * Builds standard Hebrew HTML for paying customer receipt notification.
 */
export function buildCustomerReceiptEmailHtml({
  customerName = 'לקוח/ה משלמ/ת',
  customerEmail = '',
  receiptNumber = '',
  amount = '',
  planName = 'מנוי מלא למערכת TALA',
  billingPeriod = 'שנתי',
  paymentMethod = 'כרטיס אשראי',
  invoiceDate
}: CustomerReceiptParams): string {
  const dateStr = invoiceDate || new Date().toLocaleDateString('he-IL');
  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>קבלה ותשלום – מערכת TALA</title>
    </head>
    <body dir="rtl" style="margin:0; padding:20px; background:#f0f4fa; font-family:Arial,Helvetica,sans-serif; color:#1e293b; text-align:right;">
      <div dir="rtl" style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden;">
        <div style="background:linear-gradient(135deg, #1b365d 0%, #166534 100%); color:#ffffff; padding:22px 24px;">
          <h1 style="margin:0; font-size:20px; font-weight:800;">🧾 אישור תשלום וקבלה – מנוי משלם</h1>
          <div style="font-size:13px; opacity:0.9; margin-top:4px;">מערכת TALA • תוכנית עבודה שנתית בגישה האקולוגית</div>
        </div>
        <div style="padding:22px 24px; line-height:1.6; font-size:14px;">
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px; margin-bottom:16px;">
            <div><strong>שם הלקוח/ה:</strong> ${customerName}</div>
            <div><strong>דוא"ל:</strong> <span dir="ltr">${customerEmail}</span></div>
            <div><strong>מספר קבלה:</strong> ${receiptNumber || '—'}</div>
            <div><strong>תאריך:</strong> ${dateStr}</div>
            <div><strong>מסלול:</strong> ${planName} (${billingPeriod})</div>
            <div><strong>סכום ששולם:</strong> ₪${amount}</div>
            <div><strong>אמצעי תשלום:</strong> ${paymentMethod}</div>
          </div>
          <p style="color:#475569; font-size:13px; margin:0;">
            המסמך נשמר ישירות בתיקיית הקבלות ב-Google Drive של מערכת TALA.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatches customer receipt notification to admin with automatic saving into Google Drive Receipts folder.
 */
export async function sendCustomerReceiptEmailToAdmin({
  config,
  adminEmail = 'zivit.reshef@gmail.com',
  customerName,
  customerEmail,
  receiptNumber,
  amount,
  planName,
  billingPeriod,
  paymentMethod,
  invoiceDate,
  receiptHtml,
  receiptBlob
}: SendCustomerReceiptEmailParams): Promise<{ ok: boolean; provider: string }> {
  const htmlBody = receiptHtml || buildCustomerReceiptEmailHtml({
    customerName,
    customerEmail,
    receiptNumber,
    amount,
    planName,
    billingPeriod,
    paymentMethod,
    invoiceDate
  });

  const subject = `🧾 קבלה על תשלום חדש – ${customerName || 'לקוח'} (מס' ${receiptNumber || '0'})`;
  const textBody = [
    `שלום זיוית,`,
    '',
    `התקבל תשלום חדש במערכת TALA מאת ${customerName || ''} (${customerEmail || ''}).`,
    `סכום: ₪${amount || '0'} | מסלול: ${planName || ''}`,
    `הקבלה נשמרת אוטומטית בתיקיית TALA / Customer Receipts ב-Google Drive.`
  ].join('\r\n');

  const safeCustomer = String(customerName || 'Customer').replace(/[^א-תa-zA-Z0-9_-]/g, '_');
  const blob = receiptBlob || new Blob(['\ufeff', htmlBody], {
    type: 'application/msword;charset=utf-8'
  });

  return sendReportEmailInBackground({
    config,
    toEmail: adminEmail,
    subject,
    htmlBody,
    textBody,
    attachmentBlob: blob,
    filename: `TALA_Receipt_${receiptNumber || safeCustomer}.doc`,
    mimeType: receiptBlob ? 'application/pdf' : 'application/msword',
    targetFolderId: GOOGLE_DRIVE_FOLDERS.CUSTOMER_RECEIPTS
  });
}

export interface AdminOutreachEmailParams {
  teacherName?: string;
  teacherEmail: string;
  remainingDays?: number | null;
  group?: string;
  subject: string;
  messageContent: string;
  siteUrl?: string;
}

export interface SendAdminOutreachEmailParams extends AdminOutreachEmailParams {
  config?: EmailEngineConfig;
}

/**
 * Builds standard executive HTML for proactive Keep-in-Touch / Trial assistance outreach emails to teachers.
 */
export function buildAdminOutreachEmailHtml({
  teacherName,
  teacherEmail: _teacherEmail,
  remainingDays,
  group: _group,
  subject: _subject,
  messageContent,
  siteUrl
}: AdminOutreachEmailParams): string {
  const appUrl = siteUrl || 'https://zivitreshef.github.io/TALA/';
  const logoUrl = 'https://zivitreshef.github.io/TALA/tala-logo.png';
  const cleanName = teacherName || 'צוות חינוכי יקר';

  // Format multi-line message into styled HTML paragraphs
  const paragraphs = (messageContent || '')
    .split(/\r?\n\r?\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((para) => `<p style="margin:0 0 14px 0; font-size:14.5px; line-height:1.7; color:#334155;">${para.replace(/\r?\n/g, '<br/>')}</p>`)
    .join('');

  // Check whether the message already starts with a greeting like "שלום ..." to avoid duplicate greetings
  const startsWithGreeting = /^\s*שלום\s+/i.test(messageContent || '');
  const greetingHtml = startsWithGreeting
    ? ''
    : `<div style="font-size:16px; font-weight:bold; color:#1e3a5f; margin-bottom:14px;">
            שלום ${cleanName},
          </div>`;

  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
    </head>
    <body dir="rtl" style="margin:0; padding:24px 12px; background-color:#f0f4fa; font-family: Arial, Helvetica, sans-serif; color:#1e293b; text-align:right;">
      <div dir="rtl" style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #cbd5e1; box-shadow:0 12px 32px rgba(30, 58, 95, 0.12);">
        
        <!-- Top Stained Glass Strip -->
        <div style="height:6px; background:linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%);"></div>

        <!-- Executive Header Banner with Logo -->
        <div style="background:linear-gradient(135deg, #1b365d 0%, #3b6ea5 55%, #6b46c1 100%); color:#ffffff; padding:24px 26px; text-align:right;">
          <table dir="rtl" border="0" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              <td style="vertical-align:middle;">
                <div style="display:inline-block; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); border-radius:999px; padding:3px 12px; font-size:11.5px; font-weight:bold; margin-bottom:8px;">
                  💬 פנייה אישית מהנהלת המערכת
                </div>
                <h1 style="margin:0 0 4px 0; font-size:22px; font-weight:800; color:#ffffff;">מערכת TALA – תוכנית עבודה אקולוגית</h1>
                <p style="margin:0; font-size:13px; color:#e2e8f0; line-height:1.4;">
                  ליווי, סיוע ומענה מקצועי לצוות החינוכי
                </p>
              </td>
              <td style="width:68px; text-align:left; vertical-align:middle;">
                <img src="${logoUrl}" alt="TALA" style="width:58px; height:58px; border-radius:50%; background:#ffffff; padding:2px; box-shadow:0 4px 10px rgba(0,0,0,0.2); object-fit:cover;" />
              </td>
            </tr>
          </table>
        </div>

        <!-- Body Content -->
        <div style="padding:26px; text-align:right;">
          ${greetingHtml}

          <div style="background:#ffffff;">
            ${paragraphs || '<p style="margin:0 0 14px 0; font-size:14.5px; line-height:1.7; color:#334155;">פנייה זו נשלחה אליך ממערכת TALA.</p>'}
          </div>

          <!-- Highlight Box (Conditional for trial expiration remaining days) -->
          ${
            remainingDays !== undefined && remainingDays !== null && remainingDays >= 0
              ? `
              <div style="background:#eff6ff; border:1px solid #bfdbfe; border-right:4px solid #2563eb; border-radius:10px; padding:12px 16px; margin:18px 0;">
                <div style="font-size:13px; font-weight:bold; color:#1e40af;">
                  ⏳ תזכורת ידידותית לגבי תקופת ההתנסות:
                </div>
                <div style="font-size:12.5px; color:#334155; margin-top:4px;">
                  יתרת ימי הניסיון בחשבונך עומדת כעת על <strong>${remainingDays} ימים</strong>. נשמח לסייע בכל שאלה או צורך לפני תום התקופה.
                </div>
              </div>
              `
              : ''
          }

          <!-- Direct CTA Button -->
          <div style="text-align:center; margin:28px 0 14px 0;">
            <a href="${appUrl}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block; background:linear-gradient(135deg, #2b6cb0 0%, #6b46c1 100%); color:#ffffff; text-decoration:none; font-size:14.5px; font-weight:bold; padding:12px 28px; border-radius:10px; box-shadow:0 4px 12px rgba(107, 70, 193, 0.3);">
              כניסה ישירה למערכת TALA &larr;
            </a>
          </div>
          <div style="text-align:center; font-size:11.5px; color:#64748b;">
            קישור למערכת: <a href="${appUrl}" style="color:#2563eb;">${appUrl}</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:14px 24px; text-align:center; font-size:12px; color:#64748b;">
          הודעה זו נשלחה באופן אישי על ידי מנהלת <strong>מערכת TALA – תוכנית עבודה אקולוגית</strong>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends a proactive outreach email in the background.
 */
export async function sendAdminOutreachEmailInBackground({
  config,
  teacherName,
  teacherEmail,
  remainingDays,
  group,
  subject,
  messageContent,
  siteUrl
}: SendAdminOutreachEmailParams): Promise<{ ok: boolean; provider: string }> {
  validateEmailDispatchParams(teacherEmail, subject);

  const htmlBody = buildAdminOutreachEmailHtml({
    teacherName,
    teacherEmail,
    remainingDays,
    group,
    subject,
    messageContent,
    siteUrl
  });

  const startsWithGreeting = /^\s*שלום\s+/i.test(messageContent || '');
  const textPrefix = startsWithGreeting ? '' : `שלום ${teacherName || 'צוות חינוכי'},\r\n\r\n`;
  const textBody = [
    textPrefix + messageContent,
    '',
    `קישור למערכת TALA: ${siteUrl || 'https://zivitreshef.github.io/TALA/'}`
  ].filter((line) => line !== '').join('\r\n');

  return sendReportEmailInBackground({
    config,
    toEmail: teacherEmail,
    subject,
    htmlBody,
    textBody
  });
}
