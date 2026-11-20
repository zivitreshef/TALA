import { describe, it, expect } from 'vitest';
import {
  isInputTooShortForPedagogicalDerivation,
  diagnoseAiAnalysisError
} from '../domain/aiAnalysisDiagnostics';
import { HEALTH_CATEGORY_LABELS_HE } from '../domain/healthEvents';

describe('aiAnalysisDiagnostics', () => {
  describe('isInputTooShortForPedagogicalDerivation', () => {
    it('identifies empty or null input as too short', () => {
      expect(isInputTooShortForPedagogicalDerivation(null)).toBe(true);
      expect(isInputTooShortForPedagogicalDerivation(undefined)).toBe(true);
      expect(isInputTooShortForPedagogicalDerivation('')).toBe(true);
      expect(isInputTooShortForPedagogicalDerivation('   ')).toBe(true);
    });

    it('identifies ultra short text (e.g. single sentence < 35 chars or < 6 words) as too short', () => {
      expect(isInputTooShortForPedagogicalDerivation('דניאל לא מקשיב')).toBe(true);
      expect(isInputTooShortForPedagogicalDerivation('הילד מתקשה במפגש בבוקר')).toBe(true);
    });

    it('recognizes sufficient pedagogical input with observations and context', () => {
      const detailed =
        'דניאל מתקשה לשבת במפגש בוקר, קם לעיתים קרובות ומפריע לחבריו. יחד עם זאת, במשחק בחצר ובבנייה בלגו מגלה יוזמה רבה, שיתוף פעולה וכושר מנהיגות.';
      expect(isInputTooShortForPedagogicalDerivation(detailed)).toBe(false);
    });
  });

  describe('diagnoseAiAnalysisError', () => {
    const validRawText =
      'יונתן מתקשה במעברים בין פעילויות בגן. בפעילות חופשית הוא יוזם ומשתף פעולה יפה, אך במפגש מליאה מתקשה להקשיב ליותר מחמש דקות.';

    it('diagnoses network timeouts properly', () => {
      const diag1 = diagnoseAiAnalysisError({
        rawText: validRawText,
        error: { isTimeout: true, message: 'AI request timed out' }
      });
      expect(diag1.category).toBe('server_error');
      expect(diag1.rcaReason).toBe('ai_timeout');
      expect(diag1.teacherMessage).toContain('עקב עומס רגעי ברשת');

      const diag2 = diagnoseAiAnalysisError({
        rawText: validRawText,
        error: { status: 504, message: 'Gateway Timeout' }
      });
      expect(diag2.category).toBe('server_error');
      expect(diag2.rcaReason).toBe('ai_timeout');
    });

    it('diagnoses rate limits (HTTP 429 / quota exceeded) properly', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        error: { status: 429, message: 'Resource exhausted (quota exceeded)' }
      });
      expect(diag.category).toBe('rate_limit');
      expect(diag.rcaReason).toBe('ai_rate_limit_exceeded');
      expect(diag.teacherMessage).toContain('עומס בקשות רגעי');
    });

    it('diagnoses generic network/server errors with sanitized message', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        error: { status: 500, message: 'Internal Server Error' }
      });
      expect(diag.category).toBe('server_error');
      expect(diag.rcaReason).toContain('ai_network_error: Internal Server Error');
      expect(diag.teacherMessage).toContain('חלה בעיית תקשורת');
    });

    it('diagnoses short input text when no runtime error occurred', () => {
      const shortText = 'דניאל מפריע';
      const diag = diagnoseAiAnalysisError({
        rawText: shortText,
        aiResult: { raw: 'לא ניתן לנסח מטרות' }
      });
      expect(diag.category).toBe('input_too_short');
      expect(diag.rcaReason).toBe('ai_input_too_short (chars=11)');
      expect(diag.teacherMessage).toContain('התיאור שהוזן קצר מדי');
      expect(diag.teacherMessage).toContain('1–2 משפטים');
    });

    it('diagnoses conversational model responses (model returned text without JSON)', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: {
          raw: 'לא ניתן לגזור תוכנית עבודה מלאה מכיוון שחסר מידע על תחום השפה והתקשורת.'
        }
      });
      expect(diag.category).toBe('conversational_response');
      expect(diag.rcaReason).toContain('ai_conversational_reply: לא ניתן לגזור תוכנית עבודה מלאה');
      expect(diag.teacherMessage).toContain('הבינה המלאכותית זקוקה למידע תפקודי ממוקד יותר');
    });

    it('diagnoses truncated output (starts with JSON bracket but unclosed)', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: {
          raw: '{"studentMainGoal": "קידום ויסות", "goals": [{"title": "השתתפות במפגש", "objectives": "יעד 1"'
        }
      });
      expect(diag.category).toBe('output_truncated');
      expect(diag.rcaReason).toContain('ai_output_truncated');
      expect(diag.teacherMessage).toContain('נקטעה באמצע עקב עומס או מגבלת אורך');
    });

    it('diagnoses malformed JSON syntax (has braces but invalid syntax)', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: {
          raw: '{"studentMainGoal": "ויסות", "goals": [ { unquoted_key: invalid } ]}'
        }
      });
      expect(diag.category).toBe('malformed_json');
      expect(diag.rcaReason).toBe('ai_malformed_json_syntax');
      expect(diag.teacherMessage).toContain('שגיאה במבנה התשובה');
    });

    it('diagnoses missing goals array in returned object', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: { studentMainGoal: 'ויסות', recommendations: 'המלצה' }
      });
      expect(diag.category).toBe('missing_goals');
      expect(diag.rcaReason).toBe('ai_missing_goals_field');
      expect(diag.teacherMessage).toContain('ללא מטרות מוגדרות');
    });

    it('diagnoses empty response fallback', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: null
      });
      expect(diag.category).toBe('empty_response');
      expect(diag.rcaReason).toBe('ai_empty_response');
      expect(diag.teacherMessage).toContain('תשובה ריקה');
    });
  });

  describe('HEALTH_CATEGORY_LABELS_HE taxonomy', () => {
    it('maps all granular diagnosis categories to clean Hebrew labels without English parentheses', () => {
      const expectedCategories = [
        'input_too_short',
        'conversational_response',
        'output_truncated',
        'malformed_json',
        'missing_goals',
        'empty_response',
        'server_error',
        'rate_limit',
        'network'
      ];

      expectedCategories.forEach((cat) => {
        const label = HEALTH_CATEGORY_LABELS_HE[cat];
        expect(label).toBeDefined();
        expect(typeof label).toBe('string');
        expect(label.trim().length).toBeGreaterThan(0);
        // Ensure no English in parentheses in newly added labels
        if (['input_too_short', 'conversational_response', 'output_truncated', 'malformed_json', 'missing_goals'].includes(cat)) {
          expect(label).not.toMatch(/\([a-zA-Z\s]+\)/);
        }
      });
    });
  });
});
