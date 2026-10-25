import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EMAIL_ENGINE_STORAGE_KEY,
  DEFAULT_APPS_SCRIPT_URL,
  loadEmailEngineConfig,
  saveEmailEngineConfig,
  isDirectEmailEngineConfigured,
  sendReportEmailInBackground,
  sendUserInvitationEmailInBackground,
  sendSignedNdaEmailToAdmin,
  sendUserSurveyEmailToAdmin
} from '../emailService';

// Mock FileReader for Node environment to convert Blobs to Base64
class MockFileReader {
  readAsDataURL(blob) {
    if (!blob) {
      this.result = '';
      if (this.onloadend) this.onloadend();
      return;
    }
    if (typeof blob.text === 'function') {
      blob.text()
        .then((text) => {
          const base64 = Buffer.from(text).toString('base64');
          const mime = blob.type || 'application/octet-stream';
          this.result = `data:${mime};base64,${base64}`;
          if (this.onloadend) this.onloadend();
        })
        .catch((err) => {
          if (this.onerror) this.onerror(err);
        });
    } else {
      this.result = 'data:application/octet-stream;base64,ZHVtbXk=';
      if (this.onloadend) this.onloadend();
    }
  }
}

describe('Email Service Configuration & Background Dispatch Engine', () => {
  let memoryStorage = {};
  const mockLocalStorage = {
    getItem: vi.fn((key) => (key in memoryStorage ? memoryStorage[key] : null)),
    setItem: vi.fn((key, val) => {
      memoryStorage[key] = String(val);
    }),
    removeItem: vi.fn((key) => {
      delete memoryStorage[key];
    }),
    clear: vi.fn(() => {
      memoryStorage = {};
    })
  };

  let warnSpy;

  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('FileReader', MockFileReader);
    mockLocalStorage.clear();
    globalThis.fetch = vi.fn();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('persists and loads email engine configuration with defaults and fallbacks', () => {
    // 1. Storage empty -> returns defaults
    const defaultConfig = loadEmailEngineConfig();
    expect(defaultConfig.provider).toBe('apps_script');
    expect(defaultConfig.appsScriptUrl).toBe(DEFAULT_APPS_SCRIPT_URL);
    expect(defaultConfig.senderName).toContain('TALA');
    expect(defaultConfig.emailjsServiceId).toBe('');

    // 2. Corrupted JSON in localStorage -> logs warning and returns defaults gracefully
    mockLocalStorage.setItem(EMAIL_ENGINE_STORAGE_KEY, '{invalid_json}');
    const fallbackConfig = loadEmailEngineConfig();
    expect(fallbackConfig.provider).toBe('apps_script');
    expect(fallbackConfig.appsScriptUrl).toBe(DEFAULT_APPS_SCRIPT_URL);
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to load email engine config:',
      expect.any(Error)
    );

    // 3. Saving normalized config
    const toSave = {
      provider: 'apps_script',
      appsScriptUrl: '  https://script.google.com/macros/s/custom_relay/exec  ',
      emailjsServiceId: ' service_123 ',
      emailjsTemplateId: ' template_abc ',
      emailjsPublicKey: ' pk_xyz ',
      senderName: ' צוות ניסוי '
    };
    const saved = saveEmailEngineConfig(toSave);
    expect(saved.appsScriptUrl).toBe('https://script.google.com/macros/s/custom_relay/exec');
    expect(saved.senderName).toBe('צוות ניסוי');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      EMAIL_ENGINE_STORAGE_KEY,
      JSON.stringify(saved)
    );

    // 4. Loading back the saved configuration
    const reloaded = loadEmailEngineConfig();
    expect(reloaded.appsScriptUrl).toBe('https://script.google.com/macros/s/custom_relay/exec');
    expect(reloaded.emailjsServiceId).toBe('service_123');
    expect(reloaded.senderName).toBe('צוות ניסוי');
  });

  it('validates direct email engine configuration for Apps Script and EmailJS', () => {
    // Apps Script valid URL
    expect(
      isDirectEmailEngineConfigured({
        provider: 'apps_script',
        appsScriptUrl: 'https://script.google.com/macros/s/test/exec'
      })
    ).toBe(true);

    // Apps Script invalid prefix / empty
    expect(
      isDirectEmailEngineConfigured({
        provider: 'apps_script',
        appsScriptUrl: ''
      })
    ).toBe(false);

    expect(
      isDirectEmailEngineConfigured({
        provider: 'apps_script',
        appsScriptUrl: 'https://unauthorized-proxy.example.com/exec'
      })
    ).toBe(false);

    // EmailJS - only valid when all three keys are populated
    expect(
      isDirectEmailEngineConfigured({
        provider: 'emailjs',
        emailjsServiceId: 'svc_1',
        emailjsTemplateId: 'tmpl_1',
        emailjsPublicKey: 'pk_1'
      })
    ).toBe(true);

    // EmailJS missing public key
    expect(
      isDirectEmailEngineConfigured({
        provider: 'emailjs',
        emailjsServiceId: 'svc_1',
        emailjsTemplateId: 'tmpl_1',
        emailjsPublicKey: '   '
      })
    ).toBe(false);
  });

  it('dispatches report email payload via Apps Script proxy with encoded attachment and increments quota', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true })
    });

    const customConfig = {
      provider: 'apps_script',
      appsScriptUrl: 'https://script.google.com/macros/s/custom_test/exec',
      senderName: 'מערכת בדיקות TALA'
    };

    const attachmentBlob = new Blob(['<h1>דוח תל"א רשמי</h1>'], {
      type: 'text/html'
    });

    const result = await sendReportEmailInBackground({
      config: customConfig,
      toEmail: 'teacher@school.edu',
      subject: 'תוכנית עבודה לשנת תשפ״ז',
      htmlBody: '<p>מצורף דוח התלמיד</p>',
      textBody: 'מצורף דוח התלמיד',
      attachmentBlob,
      filename: 'TALA_Report_Noam.html',
      mimeType: 'text/html'
    });

    expect(result).toEqual({ ok: true, provider: 'apps_script' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [calledUrl, fetchOptions] = globalThis.fetch.mock.calls[0];
    expect(calledUrl).toBe('https://script.google.com/macros/s/custom_test/exec');
    expect(fetchOptions.method).toBe('POST');
    expect(fetchOptions.headers['Content-Type']).toBe('text/plain;charset=utf-8');

    const parsedPayload = JSON.parse(fetchOptions.body);
    expect(parsedPayload.to).toBe('teacher@school.edu');
    expect(parsedPayload.subject).toBe('תוכנית עבודה לשנת תשפ״ז');
    expect(parsedPayload.htmlBody).toBe('<p>מצורף דוח התלמיד</p>');
    expect(parsedPayload.senderName).toBe('מערכת בדיקות TALA');
    expect(parsedPayload.filename).toBe('TALA_Report_Noam.html');
    expect(parsedPayload.mimeType).toBe('text/html');

    // Verify Base64 encoding of attachment content
    const expectedBase64 = Buffer.from('<h1>דוח תל"א רשמי</h1>').toString('base64');
    expect(parsedPayload.attachmentBase64).toBe(expectedBase64);

    // Verify daily quota incremented in storage
    const quotaKeys = Object.keys(memoryStorage).filter((k) =>
      k.startsWith('tala_quota_email_')
    );
    expect(quotaKeys.length).toBe(1);
    expect(memoryStorage[quotaKeys[0]]).toBe('1');
  });

  it('routes email dispatch through EmailJS when configured', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'OK'
    });

    const emailjsConfig = {
      provider: 'emailjs',
      emailjsServiceId: 'service_abc',
      emailjsTemplateId: 'template_xyz',
      emailjsPublicKey: 'pub_user_123'
    };

    const attachmentBlob = new Blob(['Raw Content'], { type: 'text/plain' });

    const result = await sendReportEmailInBackground({
      config: emailjsConfig,
      toEmail: 'director@edu.gov.il',
      subject: 'הודעת מערכת',
      htmlBody: '<b>תוכן בדיקה</b>',
      textBody: 'תוכן בדיקה',
      attachmentBlob,
      filename: 'info.txt',
      mimeType: 'text/plain'
    });

    expect(result).toEqual({ ok: true, provider: 'emailjs' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [calledUrl, fetchOptions] = globalThis.fetch.mock.calls[0];
    expect(calledUrl).toBe('https://api.emailjs.com/api/v1.0/email/send');
    expect(fetchOptions.method).toBe('POST');
    expect(fetchOptions.headers['Content-Type']).toBe('application/json');

    const parsedBody = JSON.parse(fetchOptions.body);
    expect(parsedBody.service_id).toBe('service_abc');
    expect(parsedBody.template_id).toBe('template_xyz');
    expect(parsedBody.user_id).toBe('pub_user_123');
    expect(parsedBody.template_params.to_email).toBe('director@edu.gov.il');
    expect(parsedBody.template_params.subject).toBe('הודעת מערכת');
    expect(parsedBody.template_params.message).toBe('תוכן בדיקה');
    expect(parsedBody.template_params.html_report).toBe('<b>תוכן בדיקה</b>');
    expect(parsedBody.template_params.filename).toBe('info.txt');
    expect(parsedBody.template_params.content).toBe(Buffer.from('Raw Content').toString('base64'));
  });

  it('dispatches onboarding invitations, signed NDA agreements, and user surveys with correct payloads', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });

    const config = {
      provider: 'apps_script',
      appsScriptUrl: 'https://script.google.com/macros/s/tala_engine/exec'
    };

    // 1. User Invitation Email
    const inviteRes = await sendUserInvitationEmailInBackground({
      config,
      userName: 'רחל כהן',
      userEmail: 'rachel@school.org',
      userTitle: 'מחנכת כיתה',
      tempPassword: 'TempPassword#2026',
      siteUrl: 'https://zivitreshef.github.io/TALA/'
    });
    expect(inviteRes.ok).toBe(true);

    const invitePayload = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(invitePayload.to).toBe('rachel@school.org');
    expect(invitePayload.subject).toContain('רחל כהן');
    expect(invitePayload.htmlBody).toContain('TempPassword#2026');
    expect(invitePayload.htmlBody).toContain('מחנכת כיתה');
    expect(invitePayload.filename).toBe('TALA_Welcome_Credentials.html');
    expect(invitePayload.attachmentBase64).toBeTruthy();

    // 2. Signed NDA Email to Admin (with PDF fallback to .doc in non-browser Node environment)
    const ndaRes = await sendSignedNdaEmailToAdmin({
      config,
      adminEmail: 'zivit.reshef@gmail.com',
      signerName: 'ישראל ישראלי',
      signerEmail: 'israel@school.org',
      signerIdNumber: '012345678',
      signerDate: '25/10/2026',
      signatureText: 'ישראל ישראלי',
      trialDays: 14
    });
    expect(ndaRes.ok).toBe(true);

    const ndaPayload = JSON.parse(globalThis.fetch.mock.calls[1][1].body);
    expect(ndaPayload.to).toBe('zivit.reshef@gmail.com');
    expect(ndaPayload.subject).toContain('ישראל ישראלי');
    expect(ndaPayload.subject).toContain('012345678');
    expect(ndaPayload.htmlBody).toContain('הסכם שמירת סודיות');
    expect(ndaPayload.filename).toContain('TALA_Signed_NDA');
    expect(ndaPayload.attachmentBase64).toBeTruthy();

    // 3. User Experience Survey Email
    const surveyRes = await sendUserSurveyEmailToAdmin({
      config,
      adminEmail: 'zivit.reshef@gmail.com',
      userName: 'דנה לוי',
      userEmail: 'dana@school.org',
      userTitle: 'מורת שילוב',
      userGroup: 'מתי״א תל אביב',
      ratings: {
        easeOfWebsite: 5,
        createStudent: 5,
        generateGoals: 4,
        createReport: 5,
        collaborateWithColleagues: 4
      },
      recommendToColleaguesAndManager: 'כן, בהחלט!',
      overallFeedback: 'מערכת מצוינת החוסכת שעות רבות של עבודה',
      improvementSuggestions: 'להוסיף תבניות מוכנות נוספות'
    });
    expect(surveyRes.ok).toBe(true);

    const surveyPayload = JSON.parse(globalThis.fetch.mock.calls[2][1].body);
    expect(surveyPayload.to).toBe('zivit.reshef@gmail.com');
    expect(surveyPayload.subject).toContain('דנה לוי');
    expect(surveyPayload.htmlBody).toContain('כן, בהחלט!');
    expect(surveyPayload.htmlBody).toContain('מערכת מצוינת החוסכת שעות רבות של עבודה');
    expect(surveyPayload.textBody).toContain('1. קלות ונוחות השימוש באתר: 5/5');
    expect(surveyPayload.filename).toBe('TALA_User_Survey_דנה_לוי.doc');
  });

  it('handles network failures, unconfigured engine, and proxy rejections gracefully', async () => {
    // 1. Unconfigured engine throws descriptive error
    await expect(
      sendReportEmailInBackground({
        config: { provider: 'apps_script', appsScriptUrl: '' },
        toEmail: 'user@test.com',
        subject: 'Test'
      })
    ).rejects.toThrow('מנוע שליחת המייל הישיר טרם הוגדר.');

    // 2. Apps Script returns { ok: false, error: '...' }
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: false,
        error: 'MailApp quota exceeded for current user'
      })
    });

    await expect(
      sendReportEmailInBackground({
        config: {
          provider: 'apps_script',
          appsScriptUrl: 'https://script.google.com/macros/s/quota_limit/exec'
        },
        toEmail: 'user@test.com',
        subject: 'Quota test'
      })
    ).rejects.toThrow('MailApp quota exceeded for current user');

    // 3. Network fetch rejection is thrown cleanly without unhandled rejections
    globalThis.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch (offline)'));

    await expect(
      sendReportEmailInBackground({
        config: {
          provider: 'apps_script',
          appsScriptUrl: 'https://script.google.com/macros/s/network_err/exec'
        },
        toEmail: 'user@test.com',
        subject: 'Network test'
      })
    ).rejects.toThrow('Failed to fetch (offline)');

    // 4. EmailJS error response with HTTP non-ok status
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Account suspended'
    });

    await expect(
      sendReportEmailInBackground({
        config: {
          provider: 'emailjs',
          emailjsServiceId: 'service_fail',
          emailjsTemplateId: 'template_fail',
          emailjsPublicKey: 'pk_fail'
        },
        toEmail: 'user@test.com',
        subject: 'EmailJS error test'
      })
    ).rejects.toThrow('EmailJS Error (403): Account suspended');
  });
});
