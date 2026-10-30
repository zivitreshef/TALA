import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ALERT_CHANNELS,
  DEFAULT_ADMIN_ALERTS,
  normalizeAdminAlerts,
  validateAlertChannel,
  formatAdminAlertMessage,
  buildAdminAlertEmailHtml
} from '../domain/adminAlerts.js';
import {
  dispatchTelegramAlert,
  dispatchWhatsAppAlert,
  dispatchEmailAlert,
  sendTestAdminAlert,
  dispatchAlertsToAdmins,
  dispatchChatAlertToAdmins
} from '../services/alertDispatcher.js';
import * as emailService from '../emailService.js';

describe('Admin Real-Time Alerts Domain & Dispatcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeAdminAlerts', () => {
    it('returns default disabled alerts when input is null or undefined', () => {
      const normalized = normalizeAdminAlerts(null, 'admin@tala.edu.il');
      expect(normalized.email.enabled).toBe(false);
      expect(normalized.email.address).toBe('admin@tala.edu.il');
      expect(normalized.whatsapp.enabled).toBe(false);
      expect(normalized.whatsapp.phone).toBe('');
      expect(normalized.whatsapp.apiKey).toBe('');
      expect(normalized.telegram.enabled).toBe(false);
      expect(normalized.telegram.chatId).toBe('');
    });

    it('sanitizes phone numbers and lowercases email addresses', () => {
      const raw = {
        email: { enabled: true, address: ' ADMIN@EXAMPLE.COM ' },
        whatsapp: { enabled: true, phone: '+972-50-123-4567', apiKey: ' 987654 ' },
        telegram: { enabled: true, chatId: ' 123456789 ', botToken: ' custom_token ' }
      };
      const normalized = normalizeAdminAlerts(raw, 'fallback@tala.edu.il');
      expect(normalized.email.enabled).toBe(true);
      expect(normalized.email.address).toBe('admin@example.com');
      expect(normalized.whatsapp.enabled).toBe(true);
      expect(normalized.whatsapp.phone).toBe('+972501234567');
      expect(normalized.whatsapp.apiKey).toBe('987654');
      expect(normalized.telegram.enabled).toBe(true);
      expect(normalized.telegram.chatId).toBe('123456789');
      expect(normalized.telegram.botToken).toBe('custom_token');
    });
  });

  describe('validateAlertChannel', () => {
    it('validates email addresses correctly', () => {
      expect(validateAlertChannel(ALERT_CHANNELS.EMAIL, { address: 'admin@tala.edu.il' }).valid).toBe(true);
      expect(validateAlertChannel(ALERT_CHANNELS.EMAIL, { address: 'invalid-email' }).valid).toBe(false);
      expect(validateAlertChannel(ALERT_CHANNELS.EMAIL, { address: '' }).valid).toBe(false);
    });

    it('validates WhatsApp configurations correctly', () => {
      expect(validateAlertChannel(ALERT_CHANNELS.WHATSAPP, { phone: '972501234567', apiKey: '123456' }).valid).toBe(true);
      expect(validateAlertChannel(ALERT_CHANNELS.WHATSAPP, { phone: '123', apiKey: '123456' }).valid).toBe(false);
      expect(validateAlertChannel(ALERT_CHANNELS.WHATSAPP, { phone: '972501234567', apiKey: '' }).valid).toBe(false);
    });

    it('validates Telegram configurations correctly', () => {
      expect(validateAlertChannel(ALERT_CHANNELS.TELEGRAM, { chatId: '987654321' }).valid).toBe(true);
      expect(validateAlertChannel(ALERT_CHANNELS.TELEGRAM, { chatId: '' }).valid).toBe(false);
    });

    it('rejects unknown channels', () => {
      expect(validateAlertChannel('pigeon_post', {}).valid).toBe(false);
    });
  });

  describe('formatAdminAlertMessage & buildAdminAlertEmailHtml', () => {
    const sampleEvent = {
      kind: 'ai_proxy_error',
      category: 'rate_limit',
      operation: 'reverseEngineer',
      userEmail: 'teacher@school.edu',
      message: 'Rate limit 429 exceeded on Gemini API',
      status: 429,
      createdAtIso: '2026-10-26T12:00:00.000Z'
    };

    it('formats plain-text message with Hebrew labels and admin greeting', () => {
      const text = formatAdminAlertMessage(sampleEvent, 'זיוית');
      expect(text).toContain('שלום זיוית');
      expect(text).toContain('התרעת מערכת TALA בזמן אמת');
      expect(text).toContain('כשל בקריאת AI');
      expect(text).toContain('חריגת מכסה / עומס (429)');
      expect(text).toContain('reverseEngineer');
      expect(text).toContain('teacher@school.edu');
      expect(text).toContain('Rate limit 429 exceeded');
    });

    it('builds rich HTML email template with security and warning styling', () => {
      const html = buildAdminAlertEmailHtml(sampleEvent, 'זיוית');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('שלום זיוית');
      expect(html).toContain('התרעת מערכת TALA בזמן אמת');
      expect(html).toContain('כשל בקריאת AI');
      expect(html).toContain('חריגת מכסה / עומס (429)');
      expect(html).toContain('reverseEngineer');
      expect(html).toContain('teacher@school.edu');
      expect(html).toContain('429');
    });
  });

  describe('Alert Dispatchers', () => {
    it('dispatchTelegramAlert sends POST request to telegram bot api', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      });
      global.fetch = mockFetch;

      const result = await dispatchTelegramAlert({
        botToken: 'TEST_TOKEN',
        chatId: '12345678',
        text: 'Hello Telegram Alert'
      });

      expect(result.ok).toBe(true);
      expect(result.channel).toBe(ALERT_CHANNELS.TELEGRAM);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.telegram.org/botTEST_TOKEN/sendMessage');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        chat_id: '12345678',
        text: 'Hello Telegram Alert',
        parse_mode: 'Markdown'
      });
    });

    it('dispatchTelegramAlert throws on missing chatId or Telegram API error', async () => {
      await expect(dispatchTelegramAlert({ botToken: 'T', chatId: '', text: 'msg' })).rejects.toThrow(
        'Telegram Chat ID is missing'
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ ok: false, description: 'Chat not found' })
      });

      await expect(
        dispatchTelegramAlert({ botToken: 'T', chatId: 'invalid_chat', text: 'msg' })
      ).rejects.toThrow('Telegram error: Chat not found');
    });

    it('dispatchWhatsAppAlert sends GET request to CallMeBot API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'Message queued / success'
      });
      global.fetch = mockFetch;

      const result = await dispatchWhatsAppAlert({
        phone: '+972-50-111-2222',
        apiKey: 'SECRET_KEY',
        text: 'Test WhatsApp message'
      });

      expect(result.ok).toBe(true);
      expect(result.channel).toBe(ALERT_CHANNELS.WHATSAPP);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('https://api.callmebot.com/whatsapp.php?phone=972501112222');
      expect(url).toContain('apikey=SECRET_KEY');
      expect(url).toContain('text=Test%20WhatsApp%20message');
    });

    it('dispatchWhatsAppAlert throws on invalid phone, missing key, or API error', async () => {
      await expect(dispatchWhatsAppAlert({ phone: '', apiKey: 'K', text: 'msg' })).rejects.toThrow(
        'WhatsApp phone number or CallMeBot API key is missing'
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Error: API key invalid'
      });

      await expect(
        dispatchWhatsAppAlert({ phone: '972501234567', apiKey: 'bad_key', text: 'msg' })
      ).rejects.toThrow('Error: API key invalid');
    });

    it('dispatchEmailAlert sends background email via sendReportEmailInBackground', async () => {
      const spy = vi.spyOn(emailService, 'sendReportEmailInBackground').mockResolvedValue({ ok: true });

      const result = await dispatchEmailAlert({
        toEmail: 'admin@tala.edu.il',
        subject: '🚨 Alert',
        htmlBody: '<p>Error</p>',
        textBody: 'Error text',
        config: { provider: 'apps_script' }
      });

      expect(result.ok).toBe(true);
      expect(result.channel).toBe(ALERT_CHANNELS.EMAIL);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'admin@tala.edu.il',
          subject: '🚨 Alert'
        })
      );
    });

    it('sendTestAdminAlert validates channel configuration and triggers test delivery', async () => {
      // Test invalid validation
      await expect(
        sendTestAdminAlert({ channel: ALERT_CHANNELS.EMAIL, config: { address: 'bad' } })
      ).rejects.toThrow('כתובת אימייל אינה תקינה');

      // Test valid email
      const spy = vi.spyOn(emailService, 'sendReportEmailInBackground').mockResolvedValue({ ok: true });
      const res = await sendTestAdminAlert({
        channel: ALERT_CHANNELS.EMAIL,
        config: { address: 'valid@tala.edu.il' },
        adminName: 'זיוית'
      });
      expect(res.ok).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('dispatchAlertsToAdmins sends to all enabled channels for active admins only', async () => {
      vi.spyOn(emailService, 'sendReportEmailInBackground').mockResolvedValue({ ok: true });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
        text: async () => 'success'
      });

      const admins = [
        {
          id: 'u1',
          email: 'admin1@tala.edu.il',
          role: 'admin',
          active: true,
          adminAlerts: {
            email: { enabled: true, address: 'admin1@tala.edu.il' },
            whatsapp: { enabled: true, phone: '972501111111', apiKey: 'key1' },
            telegram: { enabled: true, chatId: '111111', botToken: '' }
          }
        },
        {
          id: 'u2',
          email: 'teacher@tala.edu.il',
          role: 'teacher', // Not admin -> should be skipped!
          active: true,
          adminAlerts: {
            email: { enabled: true, address: 'teacher@tala.edu.il' }
          }
        },
        {
          id: 'u3',
          email: 'inactive_admin@tala.edu.il',
          role: 'admin',
          active: false, // Inactive -> should be skipped!
          adminAlerts: {
            email: { enabled: true, address: 'inactive_admin@tala.edu.il' }
          }
        }
      ];

      const event = {
        kind: 'ai_proxy_error',
        category: 'auth',
        operation: 'applyAnswers',
        message: 'Invalid auth token',
        userEmail: 'teacher@school.org'
      };

      const results = await dispatchAlertsToAdmins({ event, admins });
      // admin1 has 3 enabled channels: email, whatsapp, telegram
      expect(results.length).toBe(3);
      expect(results.every((r) => r.ok)).toBe(true);
    });

    it('dispatchChatAlertToAdmins dispatches WhatsApp, Telegram, and Email alerts when a teacher chats', async () => {
      const mockAdmins = [
        {
          id: 'admin1',
          name: 'מנהלת ראשית',
          email: 'admin1@tala.edu.il',
          role: 'admin',
          active: true,
          adminAlerts: {
            email: { enabled: true, address: 'admin1@tala.edu.il' },
            whatsapp: { enabled: true, phone: '972501111111', apiKey: 'key1' },
            telegram: { enabled: true, chatId: 'chat123' }
          }
        }
      ];

      const results = await dispatchChatAlertToAdmins({
        teacherName: 'מיכל שרון',
        teacherEmail: 'michal@school.org',
        topic: 'התחברות לאתר',
        messageText: 'שכחתי את הסיסמה הזמנית',
        admins: mockAdmins
      });

      expect(results.length).toBe(3);
      expect(results.every((r) => r.ok)).toBe(true);
    });

    it('dispatchChatAlertToAdmins handles empty admins or message gracefully without throwing', async () => {
      const res1 = await dispatchChatAlertToAdmins({ admins: [] });
      expect(res1).toEqual([]);

      const res2 = await dispatchChatAlertToAdmins({ admins: [{ role: 'admin' }], messageText: '' });
      expect(res2).toEqual([]);
    });

    it('dispatchChatAlertToAdmins skips admins who opted out with notifyOnChat: false', async () => {
      const mockAdmins = [
        {
          id: 'admin_opt_out',
          name: 'מנהלת בדיקה',
          email: 'admin_opt@tala.edu.il',
          role: 'admin',
          active: true,
          adminAlerts: {
            notifyOnChat: false,
            whatsapp: { enabled: true, phone: '972501111111', apiKey: 'key1' }
          }
        }
      ];

      const results = await dispatchChatAlertToAdmins({
        teacherName: 'הדר',
        teacherEmail: 'hadar@school.org',
        messageText: 'הודעה',
        admins: mockAdmins
      });

      expect(results).toEqual([]);
    });

    it('dispatchAlertsToAdmins skips admins who opted out with notifyOnHealth: false', async () => {
      const mockAdmins = [
        {
          id: 'admin_health_opt_out',
          role: 'admin',
          active: true,
          adminAlerts: {
            notifyOnHealth: false,
            email: { enabled: true, address: 'adm@tala.edu' }
          }
        }
      ];

      const results = await dispatchAlertsToAdmins({
        event: { kind: 'ai_error' },
        admins: mockAdmins
      });

      expect(results).toEqual([]);
    });

    it('dispatchTelegramAlert falls back to plain text if Telegram rejects Markdown formatting', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ ok: false, description: "Bad Request: can't parse entities: Can't find end of the entity" })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ok: true })
        });
      global.fetch = mockFetch;

      const res = await dispatchTelegramAlert({
        botToken: 'TEST_TOKEN',
        chatId: '123456',
        text: 'Hello *unclosed_markdown with_underscore@gmail.com'
      });

      expect(res.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondCallBody.parse_mode).toBeUndefined();
    });

    it('dispatchChatAlertToAdmins dispatches alerts to all active admins when an unauthenticated login inquiry arrives via server', async () => {
      const { dispatchServerInquiryAlerts } = await import('../services/alertDispatcher.js');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        text: async () => 'success'
      });
      vi.spyOn(emailService, 'sendReportEmailInBackground').mockResolvedValue({ ok: true });

      const mockAdmins = [
        {
          id: 'admin1',
          email: 'zivit.reshef@gmail.com',
          role: 'admin',
          active: true,
          adminAlerts: {
            notifyOnChat: true,
            email: { enabled: true, address: 'zivit.reshef@gmail.com' },
            telegram: { enabled: true, chatId: '111222' }
          }
        },
        {
          id: 'admin2',
          email: 'moti.reshef@gmail.com',
          role: 'admin',
          active: true,
          adminAlerts: {
            notifyOnChat: true,
            email: { enabled: true, address: 'moti.reshef@gmail.com' },
            telegram: { enabled: true, chatId: '333444' }
          }
        }
      ];

      const results = await dispatchServerInquiryAlerts({
        request: {
          id: 'req_123',
          name: 'שרה אסרף',
          email: 'saribiton98@gmail.com',
          topic: 'שחרור חסימה / איפוס סיסמה',
          notes: 'אני מנסה להיכנס פעם ראשונה אך לא מצליחה'
        },
        admins: mockAdmins
      });

      expect(results.length).toBe(4); // 2 admins * (email + telegram)
      expect(results.every((r) => r.ok)).toBe(true);
    });

  });

  describe('AdminAlertsPanel Component Rendering', () => {
    it('renders cleanly without React style string errors (#62)', async () => {
      const React = await import('react');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const { default: AdminAlertsPanel } = await import('../components/admin/AdminAlertsPanel.jsx');

      const allowedUsers = [
        {
          id: 'u1',
          name: 'זיוית רשף',
          email: 'zivit.reshef@gmail.com',
          role: 'admin',
          active: true,
          adminAlerts: {
            email: { enabled: true, address: 'zivit.reshef@gmail.com' },
            whatsapp: { enabled: true, phone: '972501234567', apiKey: '123' },
            telegram: { enabled: false, chatId: '' }
          }
        }
      ];

      expect(() => {
        const html = renderToStaticMarkup(
          React.createElement(AdminAlertsPanel, {
            allowedUsers,
            onUpdateAllowedUsers: vi.fn(),
            emailEngineConfig: null
          })
        );
        expect(html).toContain('התרעות מנהל בזמן אמת');
        expect(html).toContain('זיוית רשף');
        expect(html).toContain('פניות צ&#x27;אט והודעות ממורות');
        expect(html).toContain('תקלות מערכת, שגיאות AI וחריגת מכסה');
      }).not.toThrow();
    });
  });
});
