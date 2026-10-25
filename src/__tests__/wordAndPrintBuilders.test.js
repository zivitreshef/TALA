import { describe, it, expect } from 'vitest';
import {
  buildWorkPlanPrintHtml,
  buildEvalReportPrintHtml,
  buildStatusReportPrintHtml,
  buildWordDocumentHtml,
  buildEvalWordDocumentHtml,
  buildStatusReportWordDocumentHtml,
  getDisplayStudentName,
  getDisplayMaskedField,
  getRedactedText,
  getSafeReportFilename
} from '../export/wordAndPrintBuilders';

describe('Word and Print Builders (Export & PII Protection)', () => {
  const sampleStudent = {
    id: 'st_123',
    name: 'נועם אברהמי',
    idNumber: '312456789',
    phone: '0501234567',
    educationalFramework: 'בית ספר ארזים',
    goals: [
      { id: 'g_1', title: 'שיפור קריאה', environment: 'כיתה' }
    ]
  };

  it('masks student name, id, and phone in print HTML when hideDetails is true', () => {
    const student = {
      ...sampleStudent,
      studentGeneralBackground: 'נועם הוא תלמיד אהוב ומסור',
      studentSupportReceived: 'סיוע לימודי לנועם',
      studentMainGoal: 'נועם ילמד לקרוא שוטף',
      recommendations: 'להמשיך לחזק את נועם אברהמי',
      address: 'רחוב הרקפת 12',
      schoolName: 'בית ספר ארזים'
    };
    const html = buildWorkPlanPrintHtml(student, true, 'https://example.com/logo.png');
    expect(html).not.toContain('נועם אברהמי');
    expect(html).not.toContain('312456789');
    expect(html).not.toContain('0501234567');
    expect(html).not.toContain('רחוב הרקפת 12');
    expect(html).toContain('████');
    expect(html).toContain('נ.א.');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('https://example.com/logo.png');
  });

  it('preserves full student details in print HTML when hideDetails is false', () => {
    const html = buildWorkPlanPrintHtml(sampleStudent, false);
    expect(html).toContain('נועם אברהמי');
    expect(html).toContain('312456789');
    expect(html).toContain('0501234567');
    expect(html).toContain('בית ספר ארזים');
    expect(html).not.toContain('████');
  });

  it('renders evaluation report print HTML with RTL direction and redacted goals', () => {
    const evalStudent = {
      ...sampleStudent,
      evalReportSummary: 'התקדמות מצוינת של נועם',
      goals: [
        {
          id: 'g_1',
          environment: 'כיתה',
          title: 'הבנת הנקרא עבור נועם',
          objectives: 'קריאת טקסט קצר',
          achievementStatus: 'הושג',
          midYearEvaluation: 'נועם מתקדם יפה',
          endYearEvaluation: 'היעד הושג בהצלחה'
        }
      ]
    };
    const htmlRedacted = buildEvalReportPrintHtml(evalStudent, true);
    expect(htmlRedacted).toContain('דוח הערכת מחצית / סוף שנה');
    expect(htmlRedacted).toContain('dir="rtl"');
    expect(htmlRedacted).not.toContain('נועם אברהמי');
    expect(htmlRedacted).not.toContain('312456789');
    expect(htmlRedacted).toContain('הושג');
    expect(htmlRedacted).toContain('נ.א. מתקדם יפה');

    const htmlFull = buildEvalReportPrintHtml(evalStudent, false);
    expect(htmlFull).toContain('נועם אברהמי');
    expect(htmlFull).toContain('נועם מתקדם יפה');
  });

  it('renders status report print HTML with formatted bullet points and privacy masking', () => {
    const statusStudent = {
      ...sampleStudent,
      statusReportSections: [
        {
          title: '1. תפקוד לימודי',
          content: 'נועם קורא באופן עצמאי\nמגלה עניין בשיעורים'
        }
      ]
    };
    const html = buildStatusReportPrintHtml(statusStudent, true);
    expect(html).toContain('דו"ח מצב חינוכי-תפקודי עדכני');
    expect(html).toContain('dir="rtl"');
    expect(html).not.toContain('נועם אברהמי');
    expect(html).not.toContain('312456789');
    expect(html).toContain('• נ.א. קורא באופן עצמאי');
    expect(html).toContain('• מגלה עניין בשיעורים');

    // Also test fallback generation when statusReportSections is omitted
    const htmlFallback = buildStatusReportPrintHtml(sampleStudent, false);
    expect(htmlFallback).toContain('דו"ח מצב חינוכי-תפקודי עדכני');
    expect(htmlFallback).toContain('נועם אברהמי');
  });

  it('generates Word documents with Office XML headers, proper orientation, and PII masking', () => {
    const wordWorkPlan = buildWordDocumentHtml(sampleStudent, true);
    expect(wordWorkPlan).toContain('xmlns:o="urn:schemas-microsoft-com:office:office"');
    expect(wordWorkPlan).toContain('mso-page-orientation: landscape');
    expect(wordWorkPlan).not.toContain('נועם אברהמי');
    expect(wordWorkPlan).toContain('████');

    const wordEval = buildEvalWordDocumentHtml(sampleStudent, true);
    expect(wordEval).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
    expect(wordEval).toContain('דוח הערכת מחצית / סוף שנה');
    expect(wordEval).not.toContain('נועם אברהמי');

    const wordStatus = buildStatusReportWordDocumentHtml(sampleStudent, true);
    expect(wordStatus).toContain('mso-page-orientation: portrait');
    expect(wordStatus).toContain('דו"ח מצב חינוכי-תפקודי עדכני');
    expect(wordStatus).not.toContain('נועם אברהמי');
  });

  it('sanitizes filenames safely across operating systems without leaking PII', () => {
    const unsafeData = {
      name: 'נועם/אברהמי*בדיקה:שם?<>|',
      schoolYear: '2025/2026'
    };
    // Unmasked: removes illegal chars
    const fnUnmasked = getSafeReportFilename(unsafeData, false, 'doc', 'tala');
    expect(fnUnmasked).not.toMatch(/[\\/:*?"<>|]/);
    expect(fnUnmasked).toContain('תוכנית_עבודה_');
    expect(fnUnmasked).toContain('.doc');

    // Masked: must use acronym, never leak student full name
    const fnMasked = getSafeReportFilename(unsafeData, true, 'html', 'eval');
    expect(fnMasked).not.toMatch(/[\\/:*?"<>|]/);
    expect(fnMasked).not.toContain('נועם');
    expect(fnMasked).not.toContain('אברהמי');
    expect(fnMasked).toContain('דוח_הערכת_מחצית_וסוף_שנה_');
    expect(fnMasked).toContain('.html');

    // Status report mode
    const fnStatus = getSafeReportFilename(sampleStudent, false, 'docx', 'status');
    expect(fnStatus).toContain('דוח_מצב_');
    expect(fnStatus).toContain('.docx');
  });

  it('helper functions getDisplayStudentName, getDisplayMaskedField, and getRedactedText behave correctly', () => {
    // getDisplayStudentName
    expect(getDisplayStudentName({ name: 'נועם אברהמי' }, false)).toBe('נועם אברהמי');
    expect(getDisplayStudentName({ name: 'נועם אברהמי' }, true)).toBe('נ.א.');
    expect(getDisplayStudentName({}, false)).toBe('__________');
    expect(getDisplayStudentName({}, true)).toBe('א.א.');

    // getDisplayMaskedField
    expect(getDisplayMaskedField('312456789', false)).toBe('312456789');
    expect(getDisplayMaskedField('312456789', true)).toBe('█████████');
    expect(getDisplayMaskedField(null, false)).toBe('__________');
    expect(getDisplayMaskedField('', true)).toBe('████████');

    // getRedactedText
    const sampleText = 'נועם ביצע את המשימה בהצלחה, כל הכבוד לנועם אברהמי';
    const redacted = getRedactedText(sampleText, { name: 'נועם אברהמי' }, true);
    expect(redacted).not.toContain('נועם');
    expect(redacted).not.toContain('אברהמי');
    expect(redacted).toContain('נ.א.');

    const notRedacted = getRedactedText(sampleText, { name: 'נועם אברהמי' }, false);
    expect(notRedacted).toBe(sampleText);
  });

  it('prevents XSS injection and gracefully handles empty or undefined formData', () => {
    const maliciousData = {
      name: '<script>alert("xss")</script>',
      recommendations: '<img src=x onerror=alert(1)>',
      goals: [
        {
          id: 'g_x',
          title: '<b onmouseover=evil()>יעד</b>',
          objectives: '<iframe src="javascript:evil()"></iframe>'
        }
      ]
    };

    const printHtml = buildWorkPlanPrintHtml(maliciousData, false);
    expect(printHtml).not.toContain('<script>alert("xss")</script>');
    expect(printHtml).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(printHtml).not.toContain('<img src=x onerror=alert(1)>');
    expect(printHtml).toContain('&lt;img src=x onerror=alert(1)&gt;');

    // Empty/default fallbacks
    expect(() => buildWorkPlanPrintHtml()).not.toThrow();
    expect(() => buildEvalReportPrintHtml()).not.toThrow();
    expect(() => buildStatusReportPrintHtml()).not.toThrow();
    expect(() => buildWordDocumentHtml()).not.toThrow();
    expect(() => buildEvalWordDocumentHtml()).not.toThrow();
    expect(() => buildStatusReportWordDocumentHtml()).not.toThrow();
    expect(() => getSafeReportFilename()).not.toThrow();
  });
});
