/**
 * Pure domain logic for TALA Bi-directional Support Chat & Live Inquiries.
 * Fully decoupled from React, Firestore SDK, and DOM for 100% testability.
 */

export const SENDER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

export const THREAD_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved'
};

export const MAX_THREAD_MESSAGES = 100;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_IMAGE_RAW_SIZE_BYTES = 10 * 1024 * 1024; // 10MB raw max

export const ALLOWED_CHAT_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const ALLOWED_CHAT_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp']);

/**
 * Validates image metadata for chat attachments according to Security-First principles.
 */
export function validateChatImageSecurity(fileOrMeta = {}) {
  if (!fileOrMeta || typeof fileOrMeta !== 'object') {
    return { valid: false, reason: 'קובץ לא תקין.' };
  }

  const size = Number(fileOrMeta.size) || 0;
  if (size <= 0) {
    return { valid: false, reason: 'הקובץ ריק או לא נקרא כראוי.' };
  }
  if (size > MAX_IMAGE_RAW_SIZE_BYTES) {
    return { valid: false, reason: 'גודל הקובץ חורג מהמגבלה (עד 10MB).' };
  }

  const name = String(fileOrMeta.name || '').trim().toLowerCase();
  const parts = name.split('.').filter(Boolean);
  if (parts.length < 2) {
    return { valid: false, reason: 'הקובץ חסר סיומת תמונה תקנית (PNG, JPG, WebP).' };
  }

  const ext = parts[parts.length - 1];
  if (!ALLOWED_CHAT_IMAGE_EXTS.has(ext)) {
    return { valid: false, reason: `סוג הקובץ (.${ext}) אינו נתמך. ניתן לצרף צילומי מסך ותמונות בלבד (PNG, JPG, WebP).` };
  }

  // Detect executable/dangerous double extensions (e.g. evil.exe.png)
  const FORBIDDEN_SUB_EXTS = new Set(['exe', 'dll', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'html', 'htm', 'php', 'py', 'jar', 'apk']);
  for (let i = 0; i < parts.length - 1; i++) {
    if (FORBIDDEN_SUB_EXTS.has(parts[i])) {
      return { valid: false, reason: `זוהתה סיומת כפולה חשודה (${parts[i]}.${ext}). הקובץ נחסם מטעמי אבטחה.` };
    }
  }

  const type = String(fileOrMeta.type || '').trim().toLowerCase();
  if (type && !ALLOWED_CHAT_IMAGE_TYPES.has(type)) {
    return { valid: false, reason: 'סוג התוכן הבינארי אינו תואם תמונה נתמכת.' };
  }

  return { valid: true, extension: ext };
}

/**
 * Escapes HTML characters to prevent XSS.
 */
export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes an email into a safe Firestore document key.
 * Converts to lowercase, strips illegal characters.
 */
export function sanitizeThreadKey(email) {
  if (!email || typeof email !== 'string') return 'guest_thread';
  const clean = email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  return clean || 'guest_thread';
}

/**
 * Creates an immutable chat message object.
 */
export function createChatMessage({
  senderRole = SENDER_ROLES.USER,
  senderEmail = '',
  senderName = '',
  text = '',
  attachment = null,
  timestamp = null
}) {
  const cleanRole = senderRole === SENDER_ROLES.ADMIN ? SENDER_ROLES.ADMIN : SENDER_ROLES.USER;
  let cleanText = String(text || '').slice(0, MAX_MESSAGE_LENGTH).trim();
  const cleanEmail = String(senderEmail || '').trim().toLowerCase();
  const cleanName = String(senderName || '').trim() || (cleanRole === SENDER_ROLES.ADMIN ? 'מנהלת המערכת' : 'מורה');
  const now = typeof timestamp === 'number' && !Number.isNaN(timestamp) ? timestamp : Date.now();

  let cleanAttachment = null;
  if (attachment && typeof attachment === 'object') {
    const rawUrl = String(attachment.url || attachment.dataUrl || '');
    if (rawUrl.startsWith('data:image/') || rawUrl.startsWith('https://') || rawUrl.startsWith('http://')) {
      cleanAttachment = {
        id: String(attachment.id || `att_${now}_${Math.random().toString(36).slice(2, 6)}`),
        name: String(attachment.name || 'screenshot.jpg').slice(0, 100).replace(/[<>"']/g, ''),
        url: rawUrl,
        type: String(attachment.type || 'image/jpeg'),
        sizeKb: Number(attachment.sizeKb) || Math.round((rawUrl.length * 3 / 4) / 1024) || 0
      };
    }
  }

  if (!cleanText && cleanAttachment) {
    cleanText = '📷 [צילום מסך מצורף]';
  }

  const createdAt = new Date(now).toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const msg = {
    id: `msg_${now}_${Math.random().toString(36).slice(2, 8)}`,
    senderRole: cleanRole,
    senderEmail: cleanEmail,
    senderName: cleanName,
    text: cleanText,
    createdAt,
    timestamp: now
  };

  if (cleanAttachment) {
    msg.attachment = cleanAttachment;
  }

  return msg;
}

/**
 * Appends a new message to a thread and updates metadata, maintaining bounds.
 */
export function appendMessageToThread(thread, newMessage) {
  if (!newMessage || typeof newMessage !== 'object' || (!newMessage.text && !newMessage.attachment)) {
    return thread || {};
  }

  const validThread = thread && typeof thread === 'object' ? thread : {};
  const existingMessages = Array.isArray(validThread.messages) ? validThread.messages : [];
  const updatedMessages = [...existingMessages, newMessage].slice(-MAX_THREAD_MESSAGES);

  const isFromAdmin = newMessage.senderRole === SENDER_ROLES.ADMIN;
  const lastText = newMessage.attachment
    ? (newMessage.text && newMessage.text !== '📷 [צילום מסך מצורף]' ? `📷 ${newMessage.text}` : '📷 צילום מסך מצורף')
    : newMessage.text;

  return {
    ...validThread,
    id: validThread.id || sanitizeThreadKey(newMessage.senderEmail),
    userEmail: validThread.userEmail || (isFromAdmin ? '' : newMessage.senderEmail),
    userName: validThread.userName || (isFromAdmin ? '' : newMessage.senderName),
    topic: validThread.topic || 'פנייה לתמיכה',
    status: validThread.status || THREAD_STATUS.ACTIVE,
    lastMessageText: lastText,
    lastMessageSender: newMessage.senderRole,
    lastMessageAt: new Date(newMessage.timestamp).toISOString(),
    updatedAt: new Date(newMessage.timestamp).toISOString(),
    messages: updatedMessages,
    unreadByAdmin: isFromAdmin ? false : true,
    unreadByUser: isFromAdmin ? true : false
  };
}

/**
 * Counts unread messages in a thread for a specific viewer role.
 */
export function countUnreadMessages(thread, viewerRole = SENDER_ROLES.USER) {
  if (!thread || !Array.isArray(thread.messages)) return 0;
  if (viewerRole === SENDER_ROLES.ADMIN) {
    return thread.unreadByAdmin ? 1 : 0;
  }
  return thread.unreadByUser ? 1 : 0;
}

/**
 * Marks a thread as read for a specific role.
 */
export function markThreadAsRead(thread, viewerRole = SENDER_ROLES.USER) {
  if (!thread || typeof thread !== 'object') return thread || {};
  if (viewerRole === SENDER_ROLES.ADMIN) {
    return { ...thread, unreadByAdmin: false };
  }
  return { ...thread, unreadByUser: false };
}

export const DEFAULT_TALA_SITE_URL = 'https://zivitreshef.github.io/TALA/';

/**
 * Builds a direct deep-link URL for an admin to view and reply to a specific teacher's chat thread.
 */
export function buildAdminChatDeepLink(teacherEmail = '', baseUrl = '') {
  let base = baseUrl;
  if (!base && typeof window !== 'undefined' && window.location?.origin) {
    base = `${window.location.origin}${window.location.pathname}`;
  }
  if (!base) {
    base = DEFAULT_TALA_SITE_URL;
  }
  const cleanBase = base.split('#')[0].split('?')[0].replace(/\/+$/, '/');
  const emailParam = encodeURIComponent(String(teacherEmail || '').trim().toLowerCase());
  return `${cleanBase}?openAdminChat=${emailParam}`;
}

/**
 * Formats a real-time alert text for WhatsApp & Telegram when a teacher initiates or chats.
 */
export function formatAdminChatNotificationMessage({
  teacherName = 'מורה',
  teacherEmail = '',
  topic = 'פנייה לתמיכה',
  messageText = '',
  hasAttachment = false,
  siteUrl = ''
} = {}) {
  const timeStr = new Date().toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const chatUrl = buildAdminChatDeepLink(teacherEmail, siteUrl);

  const lines = [
    `💬 *הודעת צ'אט חדשה ממורה במערכת TALA*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `👤 *מאת:* ${teacherName} (${teacherEmail || 'ללא מייל'})`,
    `📌 *נושא:* ${topic}`,
    `⏰ *מועד:* ${timeStr}`
  ];

  if (hasAttachment) {
    lines.push(`📎 *צילום מסך:* מצורף צילום מסך בצ'אט המערכת`);
  }

  lines.push(
    `💬 *הודעה:*`,
    `"${messageText}"`,
    `━━━━━━━━━━━━━━━━━━━`,
    `👉 *מענה ישיר למורה:*`,
    `${chatUrl}`
  );

  return lines.join('\n');
}

/**
 * Builds an accessible HTML email alert for new chat messages with a direct reply CTA button.
 */
export function buildAdminChatNotificationEmailHtml({
  teacherName = 'מורה',
  teacherEmail = '',
  topic = 'פנייה לתמיכה',
  messageText = '',
  hasAttachment = false,
  siteUrl = ''
} = {}) {
  const safeName = escapeHtml(teacherName || 'מורה');
  const safeEmail = escapeHtml(teacherEmail || '');
  const safeTopic = escapeHtml(topic || 'פנייה לתמיכה');
  const safeMessage = escapeHtml(messageText || '');
  const chatUrl = buildAdminChatDeepLink(teacherEmail, siteUrl);

  const timeStr = new Date().toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  return `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">💬 הודעת צ'אט חדשה – TALA Support</h2>
      </div>
      
      <p style="font-size: 15px; color: #1e293b; margin-bottom: 16px;">
        התקבלה הודעת צ'אט חדשה ממורה במערכת TALA הדורשת את מענה מנהלת המערכת:
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
        <p style="margin: 6px 0; font-size: 14px;"><strong>מאת:</strong> ${safeName} (${safeEmail})</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>נושא:</strong> ${safeTopic}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>זמן:</strong> ${timeStr}</p>
      </div>

      <div style="background: #f0fdf4; border-right: 4px solid #16a34a; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
        <strong style="color: #166534; font-size: 14px;">תוכן ההודעה:</strong>
        <p style="margin: 8px 0 0 0; color: #1e293b; font-size: 14.5px; white-space: pre-wrap;">${safeMessage}</p>
        ${hasAttachment ? `<div style="margin-top: 10px; padding: 6px 10px; background: #ede9fe; color: #5b21b6; border-radius: 6px; font-size: 13px; font-weight: bold;">📎 המורה צירפה צילום מסך בצ'אט המערכת.</div>` : ""}
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${chatUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14.5px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          💬 מענה ישיר למורה ב-TALA
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; direction: ltr;">
        <a href="${chatUrl}" style="color: #64748b; text-decoration: underline;">${chatUrl}</a>
      </p>
    </div>
  `;
}
