import { describe, it, expect } from 'vitest';
import {
  validateFileNameSecurity,
  validateFileMagicBytes,
  scanTextForMaliciousScripts,
  validateDossierFileUpload,
  MAX_DOSSIER_FILE_SIZE
} from '../domain/dossierSecurity';

describe('dossierSecurity', () => {
  describe('validateFileNameSecurity', () => {
    it('allows valid document and image extensions', () => {
      expect(validateFileNameSecurity('assessment.pdf').valid).toBe(true);
      expect(validateFileNameSecurity('summary.docx').valid).toBe(true);
      expect(validateFileNameSecurity('notes.txt').valid).toBe(true);
      expect(validateFileNameSecurity('scan.png').valid).toBe(true);
      expect(validateFileNameSecurity('photo.jpeg').valid).toBe(true);
    });

    it('rejects executable and script extensions', () => {
      expect(validateFileNameSecurity('malware.exe').valid).toBe(false);
      expect(validateFileNameSecurity('script.bat').valid).toBe(false);
      expect(validateFileNameSecurity('payload.sh').valid).toBe(false);
      expect(validateFileNameSecurity('dropper.vbs').valid).toBe(false);
      expect(validateFileNameSecurity('code.js').valid).toBe(false);
      expect(validateFileNameSecurity('exploit.py').valid).toBe(false);
      expect(validateFileNameSecurity('app.apk').valid).toBe(false);
    });

    it('rejects double-extension masquerade attacks', () => {
      const check1 = validateFileNameSecurity('assessment.exe.pdf');
      expect(check1.valid).toBe(false);
      expect(check1.reason).toContain('סיומת כפולה');

      const check2 = validateFileNameSecurity('summary.vbs.docx');
      expect(check2.valid).toBe(false);

      const check3 = validateFileNameSecurity('test.bat.png');
      expect(check3.valid).toBe(false);
    });

    it('rejects files without extensions', () => {
      expect(validateFileNameSecurity('no_extension_file').valid).toBe(false);
    });
  });

  describe('validateFileMagicBytes', () => {
    it('detects Windows executable MZ header regardless of extension', async () => {
      const mzBuffer = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]).buffer;
      const res = await validateFileMagicBytes(mzBuffer, 'pdf');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Windows (MZ/EXE)');
    });

    it('detects Linux ELF binary header regardless of extension', async () => {
      const elfBuffer = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01]).buffer;
      const res = await validateFileMagicBytes(elfBuffer, 'pdf');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Linux (ELF)');
    });

    it('detects script shebang header regardless of extension', async () => {
      const shebangBuffer = new Uint8Array([0x23, 0x21, 0x2F, 0x62, 0x69, 0x6E]).buffer; // #!/bin
      const res = await validateFileMagicBytes(shebangBuffer, 'docx');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Shebang');
    });

    it('verifies valid PDF magic bytes (%PDF)', async () => {
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31]).buffer; // %PDF-1
      const res = await validateFileMagicBytes(pdfBuffer, 'pdf');
      expect(res.valid).toBe(true);

      const fakePdf = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
      const fakeRes = await validateFileMagicBytes(fakePdf, 'pdf');
      expect(fakeRes.valid).toBe(false);
      expect(fakeRes.reason).toContain('חתימת הקובץ אינה תואמת');
    });

    it('verifies valid DOCX ZIP magic bytes (PK)', async () => {
      const docxBuffer = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]).buffer; // PK\x03\x04
      const res = await validateFileMagicBytes(docxBuffer, 'docx');
      expect(res.valid).toBe(true);

      const fakeDocx = new Uint8Array([0x11, 0x22, 0x33, 0x44]).buffer;
      const fakeRes = await validateFileMagicBytes(fakeDocx, 'docx');
      expect(fakeRes.valid).toBe(false);
    });

    it('verifies valid PNG magic bytes', async () => {
      const pngBuffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]).buffer; // \x89PNG
      const res = await validateFileMagicBytes(pngBuffer, 'png');
      expect(res.valid).toBe(true);
    });
  });

  describe('scanTextForMaliciousScripts', () => {
    it('passes normal diagnostic text', () => {
      const text = 'התלמיד מתקדם יפה בקריאה ובכתיבה. מומלץ להמשיך בתמיכה פרטנית.';
      expect(scanTextForMaliciousScripts(text).valid).toBe(true);
    });

    it('blocks dangerous HTML script tags', () => {
      const text = 'דו״ח אבחון <script>alert("hacked")</script> סיכום';
      const res = scanTextForMaliciousScripts(text);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('תגיות סקריפט');
    });

    it('blocks command-line execution strings', () => {
      const text = 'powershell.exe -ExecutionPolicy Bypass -Command Write-Host';
      const res = scanTextForMaliciousScripts(text);
      expect(res.valid).toBe(false);

      const textCmd = 'cmd.exe /c calc.exe';
      expect(scanTextForMaliciousScripts(textCmd).valid).toBe(false);
    });

    it('blocks PHP injection strings', () => {
      const text = '<?php echo shell_exec($_GET["cmd"]); ?>';
      expect(scanTextForMaliciousScripts(text).valid).toBe(false);
    });
  });

  describe('validateDossierFileUpload', () => {
    it('rejects files larger than 20MB', async () => {
      const bigFile = {
        name: 'huge_assessment.pdf',
        size: MAX_DOSSIER_FILE_SIZE + 1024,
        slice: () => ({ arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer })
      };
      const res = await validateDossierFileUpload(bigFile);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('חורג מהמגבלה של 20MB');
    });

    it('rejects 0-byte files', async () => {
      const emptyFile = {
        name: 'empty.pdf',
        size: 0
      };
      const res = await validateDossierFileUpload(emptyFile);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('ריק');
    });

    it('accepts valid PDF file within limits', async () => {
      const validFile = {
        name: 'valid_report.pdf',
        size: 1024 * 500, // 500KB
        slice: () => ({
          arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31]).buffer
        })
      };
      const res = await validateDossierFileUpload(validFile);
      expect(res.valid).toBe(true);
      expect(res.extension).toBe('pdf');
    });
  });
});
