import {
  formatAdminChatNotificationMessage,
  buildAdminChatNotificationEmailHtml
} from '../domain/supportChat.js';
/**
 * Dispatcher service for Admin Real-Time Alerts across Email, WhatsApp, and Telegram.
 * Non-blocking, secure, and resilient.
 */

import {
  ALERT_CHANNELS,
  formatAdminAlertMessage,
  buildAdminAlertEmailHtml,
  validateAlertChannel,
  normalizeAdminAlerts
} from '../domain/adminAlerts.js';
import { sendReportEmailInBackground, loadEmailEngineConfig } from '../emailService.js';

export const DEFAULT_TELEGRAM_BOT_TOKEN = '7774912239:AAHOkYkO6xLqQfLd80Zg3aR90pG7yG9mK10'; // Fallback / system notification bot if user doesn't provide custom bot

/**
 * Sends an instant message via Telegram Bot API.
 */
export async function dispatchTelegramAlert({ botToken, chatId, text }) {
  const token = (botToken || '').trim() || DEFAULT_TELEGRAM_BOT_TOKEN;
  const targetChatId = String(chatId || '').trim();

  if (!targetChatId) {
    throw new Error('Telegram Chat ID is missing');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: targetChatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });

  let data = await response.json().catch(() => null);
  if ((!response.ok || !data?.ok) && data?.description && /can't parse entities/i.test(data.description)) {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: text
      })
    });
    data = await response.json().catch(() => null);
  }

  if (!response.ok || !data?.ok) {
    const desc = data?.description || `HTTP ${response.status}`;
    throw new Error(`Telegram error: ${desc}`);
  }

  return { ok: true, channel: ALERT_CHANNELS.TELEGRAM };
}

/**
 * Sends a real-time WhatsApp message via CallMeBot API (Free personal gateway).
 */
export async function dispatchWhatsAppAlert({ phone, apiKey, text }) {
  const cleanPhone = String(phone || '').replace(/[^\d]/g, '');
  const key = String(apiKey || '').trim();

  if (!cleanPhone || !key) {
    throw new Error('WhatsApp phone number or CallMeBot API key is missing');
  }

  const encodedText = encodeURIComponent(text);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedText}&apikey=${key}`;

  const response = await fetch(url, { method: 'GET' });
  const responseText = await response.text().catch(() => '');

  // CallMeBot returns 200 with text indicating status or instructions
  if (!response.ok || (responseText.toLowerCase().includes('error') && !responseText.toLowerCase().includes('success'))) {
    throw new Error(responseText.slice(0, 200) || `CallMeBot HTTP ${response.status}`);
  }

  return { ok: true, channel: ALERT_CHANNELS.WHATSAPP };
}

/**
 * Sends an email alert using TALA's configured Email Engine (Google Apps Script / EmailJS).
 */
export async function dispatchEmailAlert({ toEmail, subject, htmlBody, textBody, config }) {
  const targetEmail = String(toEmail || '').trim().toLowerCase();
  if (!targetEmail) {
    throw new Error('Destination email is missing');
  }

  const cfg = config || loadEmailEngineConfig();
  await sendReportEmailInBackground({
    config: cfg,
    toEmail: targetEmail,
    subject: subject || '🚨 התרעת מערכת TALA בזמן אמת',
    htmlBody,
    textBody
  });

  return { ok: true, channel: ALERT_CHANNELS.EMAIL };
}

/**
 * Sends a test alert to a specific channel to verify configuration.
 */
export async function sendTestAdminAlert({ channel, config, adminName = '', emailConfig = null }) {
  const validation = validateAlertChannel(channel, config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const testEvent = {
    kind: 'ai_proxy_error',
    category: 'rate_limit',
    operation: 'testAlertVerification',
    message: 'זוהי הודעת בדיקה לווידוא תקינות ערוץ ההתראות במערכת TALA. ההגדרות נקלטו בהצלחה!',
    userEmail: config.address || 'admin@tala.edu.il',
    createdAtIso: new Date().toISOString()
  };

  const textMessage = formatAdminAlertMessage(testEvent, adminName);

  switch (channel) {
    case ALERT_CHANNELS.EMAIL: {
      const emailHtml = buildAdminAlertEmailHtml(testEvent, adminName);
      return await dispatchEmailAlert({
        toEmail: config.address,
        subject: '🧪 בדיקת התרעות מערכת TALA – ערוץ אימייל תקין',
        htmlBody: emailHtml,
        textBody: textMessage,
        config: emailConfig
      });
    }

    case ALERT_CHANNELS.WHATSAPP: {
      return await dispatchWhatsAppAlert({
        phone: config.phone,
        apiKey: config.apiKey,
        text: textMessage
      });
    }

    case ALERT_CHANNELS.TELEGRAM: {
      return await dispatchTelegramAlert({
        botToken: config.botToken,
        chatId: config.chatId,
        text: textMessage
      });
    }

    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}

/**
 * Dispatches real-time alerts to all configured admins for a given health event.
 * Never throws (fire-and-forget).
 */
export async function dispatchAlertsToAdmins({ event, admins = [], emailConfig = null }) {
  if (!event || !Array.isArray(admins) || admins.length === 0) return [];

  const textMessage = formatAdminAlertMessage(event);
  const emailHtml = buildAdminAlertEmailHtml(event);
  const cfg = emailConfig || loadEmailEngineConfig();

  const promises = [];

  for (const adminUser of admins) {
    if (!adminUser || adminUser.active === false) continue;
    const isExplicitAdmin = adminUser.role === 'admin';
    if (!isExplicitAdmin) continue;

    const alerts = normalizeAdminAlerts(adminUser.adminAlerts, adminUser.email);
    if (alerts.notifyOnHealth === false) continue;

    // 1. Email channel
    if (alerts.email.enabled && alerts.email.address) {
      promises.push(
        dispatchEmailAlert({
          toEmail: alerts.email.address,
          subject: `🚨 התרעת מערכת TALA: ${event.kind || 'שגיאת מערכת'}`,
          htmlBody: emailHtml,
          textBody: textMessage,
          config: cfg
        }).catch((err) => ({ ok: false, channel: ALERT_CHANNELS.EMAIL, error: err.message }))
      );
    }

    // 2. WhatsApp channel
    if (alerts.whatsapp.enabled && alerts.whatsapp.phone && alerts.whatsapp.apiKey) {
      promises.push(
        dispatchWhatsAppAlert({
          phone: alerts.whatsapp.phone,
          apiKey: alerts.whatsapp.apiKey,
          text: textMessage
        }).catch((err) => ({ ok: false, channel: ALERT_CHANNELS.WHATSAPP, error: err.message }))
      );
    }

    // 3. Telegram channel
    if (alerts.telegram.enabled && alerts.telegram.chatId) {
      promises.push(
        dispatchTelegramAlert({
          botToken: alerts.telegram.botToken,
          chatId: alerts.telegram.chatId,
          text: textMessage
        }).catch((err) => ({ ok: false, channel: ALERT_CHANNELS.TELEGRAM, error: err.message }))
      );
    }
  }

  const results = await Promise.allSettled(promises);
  return results.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason }));
}

/**
 * Dispatches real-time chat notifications to all configured admins across WhatsApp, Telegram, and Email.
 * Never throws (fire-and-forget).
 */
export async function dispatchChatAlertToAdmins({
  teacherName = 'מורה',
  teacherEmail = '',
  topic = 'פנייה לתמיכה',
  messageText = '',
  hasAttachment = false,
  admins = [],
  emailConfig = null,
  siteUrl = ''
}) {
  if (!Array.isArray(admins) || admins.length === 0 || (!messageText && !hasAttachment)) return [];

  const textMessage = formatAdminChatNotificationMessage({
    teacherName,
    teacherEmail,
    topic,
    messageText: messageText || '📷 [צילום מסך מצורף]',
    hasAttachment,
    siteUrl
  });
  const emailHtml = buildAdminChatNotificationEmailHtml({
    teacherName,
    teacherEmail,
    topic,
    messageText: messageText || '📷 [צילום מסך מצורף]',
    hasAttachment,
    siteUrl
  });
  const cfg = emailConfig || loadEmailEngineConfig();

  const promises = [];

  for (const adminUser of admins) {
    if (!adminUser || adminUser.active === false) continue;
    const isExplicitAdmin = adminUser.role === 'admin';
    if (!isExplicitAdmin) continue;

    const alerts = normalizeAdminAlerts(adminUser.adminAlerts, adminUser.email);
    if (alerts.notifyOnChat === false) continue;

    // 1. WhatsApp channel (immediate phone notification)
    if (alerts.whatsapp.enabled && alerts.whatsapp.phone && alerts.whatsapp.apiKey) {
      promises.push(
        dispatchWhatsAppAlert({
          phone: alerts.whatsapp.phone,
          apiKey: alerts.whatsapp.apiKey,
          text: textMessage
        }).catch((err) => ({ ok: false, channel: ALERT_CHANNELS.WHATSAPP, error: err.message }))
      );
    }

    // 2. Telegram channel (immediate push)
    if (alerts.telegram.enabled && alerts.telegram.chatId) {
      promises.push(
        dispatchTelegramAlert({
          botToken: alerts.telegram.botToken,
          chatId: alerts.telegram.chatId,
          text: textMessage
        }).catch((err) => ({ ok: false, channel: ALERT_CHANNELS.TELEGRAM, error: err.message }))
      );
    }

    // 3. Email channel
    if (alerts.email.enabled && alerts.email.address) {
      promises.push(
        dispatchEmailAlert({
          toEmail: alerts.email.address,
          subject: `💬 פניית צ'אט חדשה ממורה ב-TALA: ${teacherName}`,
          htmlBody: emailHtml,
          textBody: textMessage,
          config: cfg
        }).catch((err) => ({ ok: false, channel: ALERT_CHANNELS.EMAIL, error: err.message }))
      );
    }
  }

  const results = await Promise.allSettled(promises);
  return results.map((r) => (r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason }));
}

/**
 * Dispatches real-time inquiry alerts for standalone contact/support requests (e.g. from the login page).
 */
export async function dispatchServerInquiryAlerts({ request = {}, admins = [], emailConfig = null, siteUrl = '' }) {
  if (!request || (!request.email && !request.name)) return [];
  return dispatchChatAlertToAdmins({
    teacherName: request.name || 'משתמש/ת',
    teacherEmail: request.email || '',
    topic: request.topic || 'פנייה מדף הכניסה',
    messageText: request.notes || request.topic || 'פנייה חדשה למנהלת המערכת',
    hasAttachment: false,
    admins,
    emailConfig,
    siteUrl
  });
}
