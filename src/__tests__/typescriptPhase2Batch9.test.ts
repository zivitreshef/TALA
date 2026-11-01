import { describe, it, expect } from 'vitest';
import {
  ALERT_CHANNELS,
  DEFAULT_ADMIN_ALERTS,
  normalizeAdminAlerts,
  validateAlertChannel,
  formatAdminAlertMessage,
  buildAdminAlertEmailHtml
} from '../domain/adminAlerts';
import {
  INVITE_COLLECTION,
  INVITE_TTL_DAYS,
  generateInviteToken,
  isValidInviteToken,
  parseInviteTokenFromHash,
  buildInviteUrl,
  buildWhatsAppShareUrl,
  sanitizeCustomQuestions,
  getDefaultQuestions,
  getInviteQuestions,
  buildInviteDoc,
  sanitizeResponses,
  hasAnyAnswer,
  toMillis,
  getInviteState,
  summarizeInvites,
  buildVoiceMergeText,
  appendToFreeText
} from '../domain/parentInvite';
import {
  buildMinistryCopyBlocks,
  formatAllMinistryBlocks
} from '../domain/ministryCopyFormatter';
import {
  MAX_DOSSIER_FILE_SIZE,
  ALLOWED_DOSSIER_EXTENSIONS,
  FORBIDDEN_EXTENSIONS,
  validateFileNameSecurity,
  validateFileMagicBytes,
  scanTextForMaliciousScripts,
  validateDossierFileUpload
} from '../domain/dossierSecurity';

describe('TypeScript Migration Phase 2 Batch 9 Gate', () => {
  describe('adminAlerts.ts', () => {
    it('normalizes admin alerts preferences with fallback email and exposes defaults', () => {
      expect(DEFAULT_ADMIN_ALERTS.notifyOnHealth).toBe(true);
      expect(DEFAULT_ADMIN_ALERTS.email.enabled).toBe(false);

      const empty = normalizeAdminAlerts(null, 'admin@tala.org');
      expect(empty.email.address).toBe('admin@tala.org');
      expect(empty.notifyOnHealth).toBe(true);
      expect(empty.whatsapp.enabled).toBe(false);

      const partial = normalizeAdminAlerts(
        {
          whatsapp: { enabled: true, phone: '+972-50-1234567', apiKey: 'abc1234' },
          notifyOnChat: false
        },
        'admin@tala.org'
      );
      expect(partial.whatsapp.phone).toBe('+972501234567');
      expect(partial.notifyOnChat).toBe(false);
    });

    it('validates each alert channel configuration strictly', () => {
      expect(validateAlertChannel(ALERT_CHANNELS.EMAIL, { address: 'valid@tala.org' }).valid).toBe(true);
      expect(validateAlertChannel(ALERT_CHANNELS.EMAIL, { address: 'bad-email' }).valid).toBe(false);

      expect(validateAlertChannel(ALERT_CHANNELS.WHATSAPP, { phone: '972501234567', apiKey: 'key1' }).valid).toBe(true);
      expect(validateAlertChannel(ALERT_CHANNELS.WHATSAPP, { phone: '123' }).valid).toBe(false);

      expect(validateAlertChannel(ALERT_CHANNELS.TELEGRAM, { chatId: '12345678' }).valid).toBe(true);
      expect(validateAlertChannel(ALERT_CHANNELS.TELEGRAM, {}).valid).toBe(false);

      expect(validateAlertChannel('unknown', {}).valid).toBe(false);
    });

    it('formats plain text alert message and email HTML body', () => {
      const event = {
        kind: 'ai_proxy_error',
        category: 'ai_pipeline',
        operation: 'generate_work_plan',
        userEmail: 'teacher@edu.gov.il',
        message: 'Timeout connecting to proxy',
        status: 504
      };
      const textMsg = formatAdminAlertMessage(event, 'זיוית');
      expect(textMsg).toContain('🚨 *התרעת מערכת TALA בזמן אמת* 🚨');
      expect(textMsg).toContain('שלום זיוית');
      expect(textMsg).toContain('teacher@edu.gov.il');

      const htmlMsg = buildAdminAlertEmailHtml(event, 'זיוית');
      expect(htmlMsg).toContain('<!DOCTYPE html>');
      expect(htmlMsg).toContain('שלום זיוית,');
      expect(htmlMsg).toContain('Timeout connecting to proxy');
    });
  });

  describe('parentInvite.ts', () => {
    it('exposes collections and TTL constants', () => {
      expect(INVITE_COLLECTION).toBe('tala_invites');
      expect(INVITE_TTL_DAYS).toBe(7);
    });

    it('generates, validates, and parses 128-bit capability invite tokens', () => {
      const token = generateInviteToken();
      expect(token).toHaveLength(22);
      expect(isValidInviteToken(token)).toBe(true);
      expect(isValidInviteToken('invalid-token!')).toBe(false);

      const parsed = parseInviteTokenFromHash(`#/share-input/${token}`);
      expect(parsed).toBe(token);
      expect(parseInviteTokenFromHash('#/dashboard')).toBeNull();
    });

    it('builds invite URL and WhatsApp share link correctly', () => {
      const url = buildInviteUrl('https://app.tala.org', 'abc1234567890123456789');
      expect(url).toBe('https://app.tala.org#/share-input/abc1234567890123456789');

      const waUrl = buildWhatsAppShareUrl(url, { childFirstName: 'דניאל' });
      expect(waUrl).toContain('https://wa.me/?text=');
      expect(decodeURIComponent(waUrl)).toContain('דניאל');
    });

    it('sanitizes custom questions and builds questions list', () => {
      const rawQuestions = ['<b>שאלה 1</b>', 'שאלה 2', ''];
      const sanitized = sanitizeCustomQuestions(rawQuestions);
      expect(sanitized).toEqual(['שאלה 1', 'שאלה 2']);

      const defaultQs = getDefaultQuestions({ childName: 'יוסי', gender: 'boy' });
      expect(defaultQs).toHaveLength(3);

      const inviteQs = getInviteQuestions({ childName: 'רות', gender: 'girl', customQuestions: sanitized });
      expect(inviteQs.length).toBe(5);
    });

    it('builds invite doc and calculates invite state & TTL', () => {
      const doc = buildInviteDoc({
        ownerEmail: 'teacher@tala.org',
        studentId: 'st_123',
        childFirstName: 'נועה כהן',
        gender: 'girl',
        customQuestions: ['שאלה מותאמת']
      });
      expect(doc.childFirstName).toBe('נועה');
      expect(doc.gender).toBe('girl');
      expect(doc.status).toBe('pending');
      expect(doc.expiresAt.getTime()).toBeGreaterThan(doc.createdAt.getTime());

      expect(toMillis(doc.createdAt)).toBeGreaterThan(0);
      expect(getInviteState(doc, doc.createdAt.getTime())).toBe('pending');
      expect(getInviteState(doc, doc.expiresAt.getTime() + 1000)).toBe('expired');
      expect(getInviteState({ status: 'submitted' })).toBe('submitted');
      expect(getInviteState(null)).toBe('missing');
    });

    it('summarizes invites, sanitizes responses and formats voice merge block', () => {
      const responses = { strengths: 'אוהב לצייר', goal: 'שיפור קריאה' };
      const cleaned = sanitizeResponses(responses);
      expect(cleaned.strengths).toBe('אוהב לצייר');
      expect(hasAnyAnswer(responses)).toBe(true);
      expect(hasAnyAnswer({})).toBe(false);

      const invite = {
        status: 'submitted',
        responses,
        createdAt: new Date(Date.now() - 1000)
      };
      const summary = summarizeInvites([invite]);
      expect(summary.status).toBe('received');
      expect(summary.unreviewed).toHaveLength(1);

      const mergeText = buildVoiceMergeText(invite);
      expect(mergeText).toContain('קול ההורים');
      expect(mergeText).toContain('אוהב לצייר');

      const mergedWithFreeText = appendToFreeText('טקסט קיים', mergeText);
      expect(mergedWithFreeText).toContain('טקסט קיים\n\n— קול ההורים');
    });
  });

  describe('ministryCopyFormatter.ts', () => {
    it('builds structured plain-text copy blocks for Ministry portals', () => {
      const formData = {
        name: 'ישראל ישראלי',
        educationalFramework: 'בית ספר יסודי אלונים',
        schoolYear: 'תשפ"ו',
        planType: 'תל"א',
        strengthsExisting: 'סקרן, חברותי',
        goals: [
          {
            environment: 'כיתה',
            title: 'שיפור מיומנות הקריאה',
            objectives: 'קריאת פסקה ברצף',
            duration: '3 חודשים'
          }
        ],
        evalReportSummary: 'התקדמות מצוינת בכל המדדים'
      };

      const blocks = buildMinistryCopyBlocks(formData, false);
      expect(blocks.length).toBeGreaterThanOrEqual(2);

      const bgBlock = blocks.find((b) => b.id === 'background');
      expect(bgBlock?.content).toContain('בית ספר יסודי אלונים');
      expect(bgBlock?.content).toContain('סקרן, חברותי');

      const goalBlock = blocks.find((b) => b.id === 'goal-1');
      expect(goalBlock?.content).toContain('שיפור מיומנות הקריאה');
      expect(goalBlock?.content).toContain('קריאת פסקה ברצף');

      const formatted = formatAllMinistryBlocks(blocks);
      expect(formatted).toContain('=== רקע, תפקוד ומוקדי כוח ===');
      expect(formatted).toContain('────────────────────────');
    });
  });

  describe('dossierSecurity.ts', () => {
    it('validates file extensions and prevents double extension attacks', () => {
      expect(ALLOWED_DOSSIER_EXTENSIONS.has('pdf')).toBe(true);
      expect(FORBIDDEN_EXTENSIONS.has('exe')).toBe(true);

      expect(validateFileNameSecurity('assessment.pdf').valid).toBe(true);
      expect(validateFileNameSecurity('scan.docx').valid).toBe(true);
      expect(validateFileNameSecurity('photo.jpg').valid).toBe(true);

      // Blocked extensions
      expect(validateFileNameSecurity('malware.exe').valid).toBe(false);
      expect(validateFileNameSecurity('payload.sh').valid).toBe(false);

      // Double extension spoofing
      expect(validateFileNameSecurity('document.exe.pdf').valid).toBe(false);
      expect(validateFileNameSecurity('report.vbs.docx').valid).toBe(false);
    });

    it('inspects magic bytes to detect disguised binaries and scripts', async () => {
      // Windows PE EXE (0x4D, 0x5A -> "MZ")
      const mzBuffer = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]).buffer;
      const exeCheck = await validateFileMagicBytes(mzBuffer, 'pdf');
      expect(exeCheck.valid).toBe(false);
      expect(exeCheck.reason).toContain('Windows (MZ/EXE)');

      // Linux ELF (0x7F, 0x45, 0x4C, 0x46)
      const elfBuffer = new Uint8Array([0x7F, 0x45, 0x4C, 0x46]).buffer;
      const elfCheck = await validateFileMagicBytes(elfBuffer, 'pdf');
      expect(elfCheck.valid).toBe(false);
      expect(elfCheck.reason).toContain('Linux (ELF)');

      // Shebang script (0x23, 0x21 -> "#!")
      const shebangBuffer = new Uint8Array([0x23, 0x21, 0x2F, 0x62]).buffer;
      const shebangCheck = await validateFileMagicBytes(shebangBuffer, 'txt');
      expect(shebangCheck.valid).toBe(false);
      expect(shebangCheck.reason).toContain('Shebang');

      // Valid PDF (0x25, 0x50, 0x44, 0x46 -> "%PDF")
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31]).buffer;
      const pdfCheck = await validateFileMagicBytes(pdfBuffer, 'pdf');
      expect(pdfCheck.valid).toBe(true);
    });

    it('scans text content for malicious scripts and execution commands', () => {
      expect(scanTextForMaliciousScripts('אבחון דידקטי תקין').valid).toBe(true);
      expect(scanTextForMaliciousScripts('<script>alert("hack")</script>').valid).toBe(false);
      expect(scanTextForMaliciousScripts('powershell -ExecutionPolicy Bypass').valid).toBe(false);
      expect(scanTextForMaliciousScripts('javascript:void(0)').valid).toBe(false);
    });

    it('enforces file size quota limits and full dossier upload pipeline', async () => {
      const emptyFile = { name: 'empty.pdf', size: 0, slice: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }) };
      const emptyRes = await validateDossierFileUpload(emptyFile);
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.reason).toContain('ריק');

      const hugeFile = {
        name: 'huge.pdf',
        size: MAX_DOSSIER_FILE_SIZE + 100,
        slice: () => ({ arrayBuffer: async () => new ArrayBuffer(0) })
      };
      const hugeRes = await validateDossierFileUpload(hugeFile);
      expect(hugeRes.valid).toBe(false);
      expect(hugeRes.reason).toContain('חורג מהמגבלה');
    });
  });
});
