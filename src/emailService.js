import html2pdf from 'html2pdf.js';

export const EMAIL_ENGINE_STORAGE_KEY = 'tala_email_engine_config_v1';

// Default template for Google Apps Script Direct Email Dispatcher (100% Free, Unlimited Attachments up to 25MB)
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var fileBlob = Utilities.newBlob(
      Utilities.base64Decode(data.attachmentBase64),
      data.mimeType || 'application/octet-stream',
      data.filename || 'TALA_Report.doc'
    );
    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      htmlBody: data.htmlBody,
      name: data.senderName || 'מערכת TALA - תוכנית עבודה אקולוגית',
      attachments: [fileBlob]
    });
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function loadEmailEngineConfig() {
  try {
    const raw = localStorage.getItem(EMAIL_ENGINE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: parsed.provider || 'apps_script', // 'apps_script' | 'emailjs'
        appsScriptUrl: parsed.appsScriptUrl || '',
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
    appsScriptUrl: '',
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    senderName: 'מערכת TALA – תוכנית עבודה אקולוגית'
  };
}

export function saveEmailEngineConfig(configObj) {
  const normalized = {
    provider: configObj?.provider || 'apps_script',
    appsScriptUrl: (configObj?.appsScriptUrl || '').trim(),
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
  const base64Data = await blobToBase64(attachmentBlob);

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
          filename,
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
      filename,
      mimeType,
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
