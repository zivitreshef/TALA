import html2pdf from 'html2pdf.js';

export const EMAIL_ENGINE_STORAGE_KEY = 'tala_email_engine_config_v1';

// Default template for Google Apps Script Direct Email Dispatcher (100% Free, Unlimited Attachments up to 25MB)
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var mailOptions = {
      to: data.to,
      subject: data.subject,
      htmlBody: data.htmlBody,
      name: data.senderName || 'מערכת TALA - תוכנית עבודה אקולוגית'
    };
    if (data.attachmentBase64 && data.filename) {
      var fileBlob = Utilities.newBlob(
        Utilities.base64Decode(data.attachmentBase64),
        data.mimeType || 'application/octet-stream',
        data.filename
      );
      mailOptions.attachments = [fileBlob];
    }
    MailApp.sendEmail(mailOptions);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwp3HLCO9kErrN-vS2odXYcco1B5KMlbTw7qeJWrSSKg5nqZocfrsvyUOIO-LurJJtg/exec';

export function loadEmailEngineConfig() {
  try {
    const raw = localStorage.getItem(EMAIL_ENGINE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'apps_script', // 'apps_script' | 'emailjs'
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

export function saveEmailEngineConfig(configObj) {
  const normalized = {
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

export function isDirectEmailEngineConfigured(configObj) {
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
export function blobToBase64(blob) {
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
export async function generatePdfBlobFromHtml(htmlString, filename = 'report.pdf') {
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

    const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob');
    return pdfBlob;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
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
  mimeType
}) {
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
    const payload = {
      to: toEmail,
      subject,
      htmlBody,
      textBody,
      senderName: cfg.senderName || 'מערכת TALA – תוכנית עבודה אקולוגית',
      filename: filename || 'TALA_Info.html',
      mimeType: mimeType || 'text/html',
      attachmentBase64: base64Data
    };

    // Google Apps Script Web Apps use text/plain to avoid CORS preflight blocks while still receiving JSON in e.postData.contents
    const response = await fetch(cfg.appsScriptUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    let resultJson = null;
    try {
      resultJson = await response.json();
    } catch (_) {
      // If opaque or non-JSON response on redirect, check response.ok
    }

    if (resultJson && resultJson.ok === false) {
      throw new Error(resultJson.error || 'שגיאה בשליחת המייל דרך Google Apps Script.');
    }

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
}) {
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
              <strong>סיסמה זמנית ראשונית:</strong> <span dir="ltr" style="font-family:monospace; font-size:15px; font-weight:bold; color:#4c1d95; background:#ffffff; padding:4px 10px; border-radius:6px; border:1px solid #a78bfa;">${tempPassword}</span>
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
 * Note: Because the deployed Google Apps Script expects attachmentBase64 to be non-empty if it calls Utilities.newBlob unconditionally,
 * we attach a compact "TALA_QuickStart_Card.html" welcome card so the existing deployed Apps Script works 100% seamlessly without needing re-deployment!
 */
export async function sendUserInvitationEmailInBackground({
  config,
  userName,
  userEmail,
  userTitle,
  tempPassword,
  siteUrl
}) {
  const htmlBody = buildOnboardingInvitationHtml({
    userName,
    userEmail,
    userTitle,
    tempPassword,
    siteUrl
  });

  const subject = `ברוכים הבאים למערכת TALA – פרטי כניסה וסיסמה זמנית עבור ${userName}`;
  const textBody = [
    `שלום ${userName},`,
    '',
    `ברוכים הבאים למערכת TALA – תוכנית עבודה שנתית (תל"א / תח"י) ברוח הגישה האקולוגית.`,
    `אימייל לכניסה: ${userEmail}`,
    `סיסמה זמנית: ${tempPassword}`,
    `בכניסתך הראשונה תתבקש/י להחליף את הסיסמה הזמנית לסיסמה אישית חדשה.`,
    `קישור למערכת: ${siteUrl || 'https://zivitreshef.github.io/TALA/'}`
  ].join('\r\n');

  // Attach a clean HTML quick-access card so the currently deployed Apps Script (which decodes attachmentBase64) succeeds without any re-deploy
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

