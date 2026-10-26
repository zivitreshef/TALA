/**
 * Pure domain logic for Admin Real-Time Alerts (Email, WhatsApp, Telegram).
 * Zero UI / Firebase dependencies – completely deterministic and testable.
 */

import { HEALTH_CATEGORY_LABELS_HE, HEALTH_KIND_LABELS_HE } from './healthEvents.js';

export const ALERT_CHANNELS = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram'
};

export const DEFAULT_ADMIN_ALERTS = {
  email: {
    enabled: false,
    address: ''
  },
  whatsapp: {
    enabled: false,
    phone: '',
    apiKey: ''
  },
  telegram: {
    enabled: false,
    chatId: '',
    botToken: ''
  }
};

/**
 * Normalizes and sanitizes admin alert preferences.
 * Fallback email is typically the admin's login email.
 */
export function normalizeAdminAlerts(alerts, fallbackEmail = '') {
  if (!alerts || typeof alerts !== 'object') {
    return {
      email: { enabled: false, address: String(fallbackEmail || '').trim().toLowerCase() },
      whatsapp: { enabled: false, phone: '', apiKey: '' },
      telegram: { enabled: false, chatId: '', botToken: '' }
    };
  }

  const emailObj = alerts.email || {};
  const waObj = alerts.whatsapp || {};
  const tgObj = alerts.telegram || {};

  return {
    email: {
      enabled: Boolean(emailObj.enabled),
      address: String(emailObj.address || fallbackEmail || '').trim().toLowerCase()
    },
    whatsapp: {
      enabled: Boolean(waObj.enabled),
      phone: String(waObj.phone || '').replace(/[^\d+]/g, '').trim(),
      apiKey: String(waObj.apiKey || '').trim()
    },
    telegram: {
      enabled: Boolean(tgObj.enabled),
      chatId: String(tgObj.chatId || '').trim(),
      botToken: String(tgObj.botToken || '').trim()
    }
  };
}

/**
 * Validates whether a channel has the required configuration to send alerts.
 */
export function validateAlertChannel(channel, config) {
  if (!config) return { valid: false, error: 'הגדרות חסרות' };

  switch (channel) {
    case ALERT_CHANNELS.EMAIL: {
      const email = String(config.address || '').trim().toLowerCase();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      return isValid
        ? { valid: true }
        : { valid: false, error: 'כתובת אימייל אינה תקינה' };
    }

    case ALERT_CHANNELS.WHATSAPP: {
      const phone = String(config.phone || '').replace(/[^\d]/g, '');
      const apiKey = String(config.apiKey || '').trim();
      if (!phone || phone.length < 9) {
        return { valid: false, error: 'מספר טלפון חסר או קצר מדי (יש להזין כולל קידומת בינלאומית, למשל 972...)' };
      }
      if (!apiKey) {
        return { valid: false, error: 'מפתח CallMeBot API חסר' };
      }
      return { valid: true };
    }

    case ALERT_CHANNELS.TELEGRAM: {
      const chatId = String(config.chatId || '').trim();
      if (!chatId) {
        return { valid: false, error: 'מזהה צ׳אט (Telegram Chat ID) חסר' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: 'ערוץ לא מוכר' };
  }
}

/**
 * Formats a plain-text alert for messaging channels (Telegram, WhatsApp).
 */
export function formatAdminAlertMessage(event, adminName = '') {
  const kindLabel = HEALTH_KIND_LABELS_HE[event?.kind] || event?.kind || 'תקלת מערכת';
  const categoryLabel = HEALTH_CATEGORY_LABELS_HE[event?.category] || event?.category || 'לא צוין';
  const operation = event?.operation || 'פעולה לא ידועה';
  const userEmail = event?.userEmail || 'לא זוהה';
  const message = event?.message || 'אין פירוט שגיאה נוסף';
  const timestamp = event?.createdAtIso
    ? new Date(event.createdAtIso).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
    : new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

  const greeting = adminName ? `שלום ${adminName},\n` : '';

  return (
    `🚨 *התרעת מערכת TALA בזמן אמת* 🚨\n\n` +
    greeting +
    `• *סוג תקלה:* ${kindLabel}\n` +
    `• *קטגוריה:* ${categoryLabel}\n` +
    `• *פעולה:* ${operation}\n` +
    `• *משתמש/ת מדווח/ת:* ${userEmail}\n` +
    `• *זמן:* ${timestamp}\n` +
    `• *פרטי שגיאה:* ${message}\n\n` +
    `_ההודעה נשלחה אוטומטית ממרכז הבקרה של TALA (Admin Control Center)._`
  );
}

/**
 * Formats an HTML email body for email alerts.
 */
export function buildAdminAlertEmailHtml(event, adminName = '') {
  const kindLabel = HEALTH_KIND_LABELS_HE[event?.kind] || event?.kind || 'תקלת מערכת';
  const categoryLabel = HEALTH_CATEGORY_LABELS_HE[event?.category] || event?.category || 'לא צוין';
  const operation = event?.operation || 'פעולה לא ידועה';
  const userEmail = event?.userEmail || 'לא זוהה';
  const message = event?.message || 'אין פירוט שגיאה נוסף';
  const status = event?.status ? ` (קוד סטטוס: ${event.status})` : '';
  const timestamp = event?.createdAtIso
    ? new Date(event.createdAtIso).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
    : new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

  const safeAdmin = adminName ? `שלום ${adminName},` : 'שלום מנהל/ת מערכת,';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>התרעת מערכת TALA</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; direction: rtl; text-align: right; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fee2e2; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.08); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 18px 24px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
        🚨 התרעת מערכת TALA בזמן אמת
      </h2>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95;">
        זוהתה תקלה או חריגת מערכת הדורשת את תשומת לב מנהל/ת המערכת
      </p>
    </div>
    
    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-top: 0; font-weight: 600; color: #334155;">${safeAdmin}</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">
        במהלך עבודה במערכת TALA נרשמה התקלה הבאה ביומן הבקרה (Admin Control Center):
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13.5px;">
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 700; color: #64748b; width: 140px;">סוג תקלה:</td>
            <td style="padding: 10px 8px; color: #b91c1c; font-weight: 700;">${kindLabel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 700; color: #64748b;">קטגוריה:</td>
            <td style="padding: 10px 8px; color: #1e293b; font-weight: 600;">${categoryLabel}${status}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 700; color: #64748b;">פעולה:</td>
            <td style="padding: 10px 8px; color: #1e293b; font-family: monospace;">${operation}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 700; color: #64748b;">משתמש/ת מדווח/ת:</td>
            <td style="padding: 10px 8px; color: #2563eb;">${userEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 700; color: #64748b;">זמן הדיווח:</td>
            <td style="padding: 10px 8px; color: #475569;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; font-weight: 700; color: #64748b; vertical-align: top;">פרטי שגיאה:</td>
            <td style="padding: 10px 8px; color: #334155; background: #fff1f2; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all;">
              ${message}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
        מערכת TALA – תוכנית עבודה אקולוגית | מרכז בקרת איכות ובריאות מערכת
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
