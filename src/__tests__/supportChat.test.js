import { describe, it, expect } from 'vitest';
import {
  SENDER_ROLES,
  THREAD_STATUS,
  sanitizeThreadKey,
  createChatMessage,
  appendMessageToThread,
  countUnreadMessages,
  markThreadAsRead,
  formatAdminChatNotificationMessage,
  buildAdminChatNotificationEmailHtml,
  validateChatImageSecurity,
  MAX_MESSAGE_LENGTH,
  MAX_THREAD_MESSAGES
} from '../domain/supportChat';

describe('Support Chat Domain Logic (Bi-directional Messaging)', () => {
  describe('sanitizeThreadKey', () => {
    it('normalizes email to lower case and replaces invalid characters with underscores', () => {
      expect(sanitizeThreadKey('Teacher.Name@School-Domain.org.il')).toBe('teacher.name_school-domain.org.il');
      expect(sanitizeThreadKey('  USER+TEST@GMAIL.COM  ')).toBe('user_test_gmail.com');
    });

    it('falls back safely to guest_thread for invalid or non-string inputs', () => {
      expect(sanitizeThreadKey('')).toBe('guest_thread');
      expect(sanitizeThreadKey(null)).toBe('guest_thread');
      expect(sanitizeThreadKey(undefined)).toBe('guest_thread');
      expect(sanitizeThreadKey(12345)).toBe('guest_thread');
    });
  });

  describe('createChatMessage', () => {
    it('creates a well-structured chat message with default values and timestamps', () => {
      const fixedTime = 1730000000000;
      const msg = createChatMessage({
        senderRole: SENDER_ROLES.USER,
        senderEmail: 'teacher@school.org',
        senderName: 'רותי כהן',
        text: 'שאלה לגבי מטרות',
        timestamp: fixedTime
      });

      expect(msg.id).toContain('msg_1730000000000');
      expect(msg.senderRole).toBe(SENDER_ROLES.USER);
      expect(msg.senderEmail).toBe('teacher@school.org');
      expect(msg.senderName).toBe('רותי כהן');
      expect(msg.text).toBe('שאלה לגבי מטרות');
      expect(msg.timestamp).toBe(fixedTime);
      expect(typeof msg.createdAt).toBe('string');
    });

    it('enforces maximum character length bounds on message text', () => {
      const longText = 'א'.repeat(MAX_MESSAGE_LENGTH + 500);
      const msg = createChatMessage({ text: longText });

      expect(msg.text.length).toBe(MAX_MESSAGE_LENGTH);
    });

    it('defaults admin sender name when omitted', () => {
      const msg = createChatMessage({ senderRole: SENDER_ROLES.ADMIN });
      expect(msg.senderRole).toBe(SENDER_ROLES.ADMIN);
      expect(msg.senderName).toBe('מנהלת המערכת');
    });
  });

  describe('appendMessageToThread', () => {
    it('initializes a thread if empty and appends the message', () => {
      const msg = createChatMessage({
        senderRole: SENDER_ROLES.USER,
        senderEmail: 'sara@school.org',
        senderName: 'שרה',
        text: 'שלום, עזרה בהתחברות',
        timestamp: 1730000100000
      });

      const thread = appendMessageToThread(null, msg);

      expect(thread.userEmail).toBe('sara@school.org');
      expect(thread.userName).toBe('שרה');
      expect(thread.status).toBe(THREAD_STATUS.ACTIVE);
      expect(thread.messages).toHaveLength(1);
      expect(thread.lastMessageText).toBe('שלום, עזרה בהתחברות');
      expect(thread.lastMessageSender).toBe(SENDER_ROLES.USER);
      expect(thread.unreadByAdmin).toBe(true);
      expect(thread.unreadByUser).toBe(false);
    });

    it('sets unreadByUser when an admin replies', () => {
      const initialMsg = createChatMessage({
        senderRole: SENDER_ROLES.USER,
        senderEmail: 'sara@school.org',
        senderName: 'שרה',
        text: 'שלום',
        timestamp: 1730000100000
      });

      let thread = appendMessageToThread(null, initialMsg);

      const adminReply = createChatMessage({
        senderRole: SENDER_ROLES.ADMIN,
        senderEmail: 'admin@tala.com',
        text: 'שלום שרה, איך אפשר לסייע?',
        timestamp: 1730000200000
      });

      thread = appendMessageToThread(thread, adminReply);

      expect(thread.messages).toHaveLength(2);
      expect(thread.lastMessageSender).toBe(SENDER_ROLES.ADMIN);
      expect(thread.unreadByAdmin).toBe(false);
      expect(thread.unreadByUser).toBe(true);
    });

    it('caps messages array at MAX_THREAD_MESSAGES to prevent memory bloat', () => {
      let thread = { messages: [] };
      for (let i = 0; i < MAX_THREAD_MESSAGES + 20; i++) {
        thread = appendMessageToThread(
          thread,
          createChatMessage({ text: `Message ${i}`, timestamp: 1730000000000 + i })
        );
      }

      expect(thread.messages).toHaveLength(MAX_THREAD_MESSAGES);
      expect(thread.messages[MAX_THREAD_MESSAGES - 1].text).toBe(`Message ${MAX_THREAD_MESSAGES + 19}`);
    });

    it('returns unmodified thread if message is invalid', () => {
      const thread = { id: 'thread_1', messages: [] };
      expect(appendMessageToThread(thread, null)).toBe(thread);
      expect(appendMessageToThread(thread, { text: '' })).toBe(thread);
    });
  });

  describe('countUnreadMessages and markThreadAsRead', () => {
    it('correctly tracks and clears unread status for user and admin', () => {
      let thread = {
        messages: [{ id: '1' }],
        unreadByAdmin: true,
        unreadByUser: false
      };

      expect(countUnreadMessages(thread, SENDER_ROLES.ADMIN)).toBe(1);
      expect(countUnreadMessages(thread, SENDER_ROLES.USER)).toBe(0);

      thread = markThreadAsRead(thread, SENDER_ROLES.ADMIN);
      expect(countUnreadMessages(thread, SENDER_ROLES.ADMIN)).toBe(0);

      thread.unreadByUser = true;
      expect(countUnreadMessages(thread, SENDER_ROLES.USER)).toBe(1);

      thread = markThreadAsRead(thread, SENDER_ROLES.USER);
      expect(countUnreadMessages(thread, SENDER_ROLES.USER)).toBe(0);
    });
  });

  describe('Alert Notifications Formatting', () => {
    it('formats plain-text notification for messaging apps (WhatsApp/Telegram)', () => {
      const text = formatAdminChatNotificationMessage({
        teacherName: 'יעל כהן',
        teacherEmail: 'yael@school.edu',
        topic: 'הפקת דוח מסכם',
        messageText: 'האם ניתן להוריד כקובץ וורד?'
      });

      expect(text).toContain('הודעת צ\'אט חדשה ממורה במערכת TALA');
      expect(text).toContain('יעל כהן (yael@school.edu)');
      expect(text).toContain('הפקת דוח מסכם');
      expect(text).toContain('האם ניתן להוריד כקובץ וורד?');
    });

    it('builds secure, escaped HTML for email alerts', () => {
      const html = buildAdminChatNotificationEmailHtml({
        teacherName: 'מורה <script>alert("xss")</script>',
        teacherEmail: 'safe@school.edu',
        topic: 'שאלה & תמיכה',
        messageText: 'בדיקה <b>הודעה</b>'
      });

      expect(html).toContain('מורה &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).toContain('שאלה &amp; תמיכה');
      expect(html).toContain('בדיקה &lt;b&gt;הודעה&lt;/b&gt;');
      expect(html).not.toContain('<script>');
    });
  });
  describe('validateChatImageSecurity', () => {
    it('approves legitimate image attachments (PNG, JPG, WebP) under size limit', () => {
      expect(validateChatImageSecurity({ name: 'error_screen.png', type: 'image/png', size: 1024 * 500 }).valid).toBe(true);
      expect(validateChatImageSecurity({ name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 300 }).valid).toBe(true);
      expect(validateChatImageSecurity({ name: 'ui.webp', type: 'image/webp', size: 1024 * 200 }).valid).toBe(true);
    });

    it('rejects files larger than 10MB raw limit', () => {
      const res = validateChatImageSecurity({ name: 'huge.png', type: 'image/png', size: 11 * 1024 * 1024 });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('חורג מהמגבלה');
    });

    it('rejects forbidden non-image extensions', () => {
      expect(validateChatImageSecurity({ name: 'script.exe', type: 'application/octet-stream', size: 1000 }).valid).toBe(false);
      expect(validateChatImageSecurity({ name: 'doc.pdf', type: 'application/pdf', size: 1000 }).valid).toBe(false);
    });

    it('detects and blocks dangerous double-extension spoofing (e.g. malware.exe.png)', () => {
      const res = validateChatImageSecurity({ name: 'virus.exe.png', type: 'image/png', size: 5000 });
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('סיומת כפולה חשודה');
    });
  });

  describe('createChatMessage and appendMessageToThread with image attachments', () => {
    it('attaches image metadata cleanly and provides fallback text if text is omitted', () => {
      const msg = createChatMessage({
        senderRole: SENDER_ROLES.USER,
        text: '',
        attachment: {
          name: 'bug.png',
          url: 'data:image/jpeg;base64,12345',
          sizeKb: 45
        }
      });

      expect(msg.text).toBe('📷 [צילום מסך מצורף]');
      expect(msg.attachment).toBeDefined();
      expect(msg.attachment.name).toBe('bug.png');
      expect(msg.attachment.sizeKb).toBe(45);
    });

    it('updates lastMessageText with camera prefix when message contains attachment', () => {
      const msg = createChatMessage({
        senderRole: SENDER_ROLES.USER,
        text: 'תראי מה מופיע לי',
        attachment: {
          name: 'error.png',
          url: 'data:image/jpeg;base64,12345'
        }
      });

      const thread = appendMessageToThread(null, msg);
      expect(thread.lastMessageText).toBe('📷 תראי מה מופיע לי');
    });
  });

  describe('Alert Notifications with Attachments', () => {
    it('includes screenshot indicator in messaging alerts when hasAttachment is true', () => {
      const text = formatAdminChatNotificationMessage({
        teacherName: 'שירה',
        teacherEmail: 'shira@edu.gov.il',
        topic: 'תקלה בטופס',
        messageText: 'הנה צילום המסך',
        hasAttachment: true
      });

      expect(text).toContain("📎 *צילום מסך:* מצורף צילום מסך בצ'אט המערכת");
    });

    it('renders screenshot badge in email alerts when hasAttachment is true', () => {
      const html = buildAdminChatNotificationEmailHtml({
        teacherName: 'שירה',
        teacherEmail: 'shira@edu.gov.il',
        topic: 'תקלה בטופס',
        messageText: 'הנה צילום המסך',
        hasAttachment: true
      });

      expect(html).toContain('המורה צירפה צילום מסך');
    });
  });
});
