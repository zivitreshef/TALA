import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';
import {
  getFullDocTitle,
  getSafeReportFilename,
  getDisplayStudentName,
  getDisplayMaskedField,
  getDisplayReportDate
} from '../export/wordAndPrintBuilders';
import AllowlistAuthGate, { AdminAllowlistModal } from '../AllowlistAuthGate';

describe('TypeScript Migration Step 2 Suite (v2.5.23)', () => {
  it('synchronizes to target application version 2.6.40', () => {
    expect(CURRENT_APP_VERSION).toBe('2.6.42');
  });

  describe('wordAndPrintBuilders module', () => {
    it('formats document title and date correctly', () => {
      const title = getFullDocTitle({ name: 'יונתן כהן', educationalFramework: 'גן אלון' });
      expect(title).toContain('תוכנית עבודה');

      const dateStr = getDisplayReportDate({ date: '2026-03-01' });
      expect(dateStr).toContain('01.03.2026');
    });

    it('safeguards student identity with privacy masking and redaction', () => {
      const student = { name: 'דניאל לוי', idNumber: '123456789' };

      // Normal mode (full details)
      const normalName = getDisplayStudentName(student, false);
      expect(normalName).toBe('דניאל לוי');
      const normalId = getDisplayMaskedField(student.idNumber, false);
      expect(normalId).toBe('123456789');

      // Privacy / Anonymous mode
      const redactedName = getDisplayStudentName(student, true);
      expect(redactedName).toBe('ד.ל.');
      const maskedId = getDisplayMaskedField(student.idNumber, true);
      expect(maskedId).toBe('█████████');
    });

    it('generates safe, compliant filenames for Word exports', () => {
      const student = { name: 'נועה ברק', schoolYear: 'תשפ"ו' };
      const filename = getSafeReportFilename(student, false, 'doc', 'tala');
      expect(filename).toContain('.doc');
      expect(filename).toContain('נועה_ברק');

      const privacyFilename = getSafeReportFilename(student, true, 'doc', 'tala');
      expect(privacyFilename).toContain('נ_ב');
    });
  });

  describe('AllowlistAuthGate & AdminAllowlistModal re-export', () => {
    it('re-exports AdminAllowlistModal seamlessly', () => {
      expect(AdminAllowlistModal).toBeDefined();
      expect(typeof AdminAllowlistModal).toBe('function');
    });

    it('renders AllowlistAuthGate login screen properly', () => {
      const html = renderToStaticMarkup(
        <AllowlistAuthGate
          allowedUsers={[]}
          onLoginSuccess={() => {}}
        />
      );

      expect(html).toContain('כניסה למערכת');
      expect(html).toContain('כתובת דואר אלקטרוני');
    });
  });
});
