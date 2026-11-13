import { describe, it, expect } from 'vitest';
import { redactStudentNameInText, toHebrewAcronym, maskKnownStudentDetails } from '../domain/privacyAndAcronyms';
import {
  getRedactedText,
  buildWorkPlanPrintHtml,
  buildWordDocumentHtml
} from '../export/wordAndPrintBuilders';
import { generateStatusReportLocally } from '../domain/statusReportGenerator';

describe('Full Document Preview & Export Resilience Gate (v3.0.13)', () => {
  describe('redactStudentNameInText type resilience', () => {
    it('safely handles Array input without throwing split is not a function', () => {
      const arr = ['יעד ראשון עבור דויד כהן', 'יעד שני'];
      const result = redactStudentNameInText(arr as any, 'דויד כהן', true);
      expect(typeof result).toBe('string');
      expect(result).toContain('ד.כ.');
      expect(result).toContain('יעד שני');
    });

    it('safely handles Number input without throwing', () => {
      const result = redactStudentNameInText(12345 as any, 'דויד כהן', true);
      expect(result).toBe('12345');
    });

    it('safely handles Object input with text/title without throwing', () => {
      const obj = { text: 'מוקד כוח של דויד כהן' };
      const result = redactStudentNameInText(obj as any, 'דויד כהן', true);
      expect(result).toContain('ד.כ.');
    });

    it('safely handles non-string studentFullName', () => {
      const result = redactStudentNameInText('טקסט כלשהו', 12345 as any, true);
      expect(result).toBe('טקסט כלשהו');
    });

    it('safely handles toHebrewAcronym with non-string inputs', () => {
      expect(toHebrewAcronym(null as any)).toBe('א.א.');
      expect(toHebrewAcronym(undefined as any)).toBe('א.א.');
      expect(toHebrewAcronym(12345 as any)).toBe('1.');
      expect(toHebrewAcronym('יונתן לוי')).toBe('י.ל.');
    });

    it('safely handles maskKnownStudentDetails when numeric fields are passed in formData', () => {
      const formData: any = {
        name: 'דויד כהן',
        idNumber: 123456789,
        phone: 521234567,
        birthDate: 20180101
      };
      const masked = maskKnownStudentDetails('דויד כהן ת.ז 123456789 טלפון 521234567', formData, 'acronym');
      expect(masked).toContain('ד.כ.');
      expect(masked).toContain('████');
      expect(masked).not.toContain('123456789');
    });
  });

  describe('wordAndPrintBuilders & Full Document HTML generation resilience', () => {
    it('safely calls getRedactedText on non-string fields', () => {
      expect(getRedactedText(['שורה 1', 'שורה 2'], { name: 'דניאל' }, true)).toContain('שורה 1');
      expect(getRedactedText(6, { name: 'דניאל' }, true)).toBe('6');
      expect(getRedactedText(null, { name: 'דניאל' }, true)).toBe('');
    });

    it('successfully generates WorkPlan Print and Word HTML when student has array or numeric goals', () => {
      const messyStudent: any = {
        name: 'דויד כהן',
        schoolYear: 'תשפ"ז',
        planType: 'תוכנית אקולוגית לילדי הגן',
        strengthsExisting: ['כוח 1', 'כוח 2'],
        strengthsToEmpower: 'כוח לחיזוק',
        recommendations: ['המלצה ראשונה', 'המלצה שנייה'],
        goals: [
          {
            id: 'g1',
            title: 'מטרה ראשונה',
            environment: 'גן',
            objectives: ['יעד אופרטיבי 1', 'יעד אופרטיבי 2'],
            duration: 6,
            partners: ['מחנכת', 'הורים'],
            opportunities: ['משחק שולחן', 'פינת בובות']
          }
        ]
      };

      // Both should build without throwing any error
      const printHtml = buildWorkPlanPrintHtml(messyStudent, true, '');
      expect(printHtml).toContain('<!DOCTYPE html>');
      expect(printHtml).toContain('ד.כ.');
      expect(printHtml).toContain('יעד אופרטיבי 1');

      const wordHtml = buildWordDocumentHtml(messyStudent, true);
      expect(wordHtml).toContain('<html');
      expect(wordHtml).toContain('ד.כ.');
    });
  });

  describe('generateStatusReportLocally resilience', () => {
    it('generates status report when fields contain arrays or numbers', () => {
      const messyFormData: any = {
        name: 'שירה לוי',
        teacherFreeText: ['ילדה מקסימה', 'משתתפת יפה'],
        strengthsExisting: ['יכולת מילולית גבוהה'],
        recommendations: 123,
        goals: [
          {
            id: 'g1',
            title: 'יעד חברתי',
            environment: 'חצר',
            objectives: ['משחק בקבוצה'],
            opportunities: 42
          }
        ]
      };

      const result = generateStatusReportLocally(messyFormData);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
