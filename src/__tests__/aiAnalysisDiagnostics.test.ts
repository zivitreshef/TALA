import { describe, it, expect, vi } from 'vitest';
import {
  isInputTooShortForPedagogicalDerivation,
  diagnoseAiAnalysisError,
  OFFLINE_AI_ERROR_MESSAGE
} from '../domain/aiAnalysisDiagnostics';
import { HEALTH_CATEGORY_LABELS_HE } from '../domain/healthEvents';
import { callAiJson } from '../services/aiJsonClient';
import * as aiProxyClient from '../services/aiProxyClient';

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

    it('diagnoses generic network/server errors with zero PII in static RCA code', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        error: { status: 500, message: 'Internal Server Error (Student: Dan)' }
      });
      expect(diag.category).toBe('server_error');
      expect(diag.rcaReason).toBe('ai_network_error');
      expect(diag.rcaReason).not.toContain('Dan');
      expect(diag.teacherMessage).toContain('חלה בעיית תקשורת');
    });

    it('diagnoses short input text with static RCA code avoiding any text leak', () => {
      const shortText = 'דניאל מפריע';
      const diag = diagnoseAiAnalysisError({
        rawText: shortText,
        aiResult: { raw: 'לא ניתן לנסח מטרות' }
      });
      expect(diag.category).toBe('input_too_short');
      expect(diag.rcaReason).toBe('ai_input_too_short');
      expect(diag.teacherMessage).toContain('התיאור שהוזן קצר מדי');
      expect(diag.teacherMessage).toContain('1–2 משפטים');
    });

    it('diagnoses conversational model responses with static code avoiding any student PII leak', () => {
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: {
          raw: 'שלום, לגבי דניאל כהן לא ניתן לגזור תוכנית עבודה מלאה מכיוון שחסר מידע.'
        }
      });
      expect(diag.category).toBe('conversational_response');
      // Strictly static - zero leak of student name or raw snippet
      expect(diag.rcaReason).toBe('ai_conversational_reply');
      expect(diag.rcaReason).not.toContain('דניאל');
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
      expect(diag.rcaReason).toBe('ai_output_truncated');
      expect(diag.teacherMessage).toContain('נקטעה באמצע עקב עומס או מגבלת אורך');
    });

    it('correctly handles markdown fences around complete JSON without falsely classifying as truncated', () => {
      const fencedComplete = '```json\n{"goals": [{"title": "מטרה ראשונה"}], "recommendations": "המלצה"}\n```';
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: {
          raw: fencedComplete
        }
      });
      // Complete JSON wrapped in markdown fences should NOT be output_truncated
      expect(diag.category).not.toBe('output_truncated');
    });

    it('correctly classifies markdown fenced incomplete JSON as output_truncated', () => {
      const fencedIncomplete = '```json\n{"goals": [{"title": "מטרה ראשונה"';
      const diag = diagnoseAiAnalysisError({
        rawText: validRawText,
        aiResult: {
          raw: fencedIncomplete
        }
      });
      expect(diag.category).toBe('output_truncated');
      expect(diag.rcaReason).toBe('ai_output_truncated');
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

    it('returns consistent OFFLINE_AI_ERROR_MESSAGE when offline', () => {
      const originalOnLine = navigator.onLine;
      try {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const diag = diagnoseAiAnalysisError({
          rawText: validRawText,
          error: new Error('Failed to fetch')
        });
        expect(diag.category).toBe('network');
        expect(diag.rcaReason).toBe('offline_no_internet');
        expect(diag.teacherMessage).toBe(OFFLINE_AI_ERROR_MESSAGE);
      } finally {
        Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
      }
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

  describe('callAiJson throwOnError option', () => {
    it('returns null on failure by default for backward compatibility', async () => {
      const spy = vi.spyOn(aiProxyClient, 'callAiProxyEndpoint').mockRejectedValueOnce(new Error('timeout'));
      const result = await callAiJson('prompt', {});
      expect(result).toBeNull();
      spy.mockRestore();
    });

    it('rethrows error when throwOnError is true to enable granular RCA', async () => {
      const timeoutError = new Error('AI request timed out');
      const spy = vi.spyOn(aiProxyClient, 'callAiProxyEndpoint').mockRejectedValueOnce(timeoutError);
      await expect(callAiJson('prompt', {}, { throwOnError: true })).rejects.toThrow('AI request timed out');
      spy.mockRestore();
    });
  });

  describe('Admin RCA Console Integration', () => {
    it('renders granular rcaReason in SystemHealthPanel table', async () => {
      const { default: SystemHealthPanel } = await import('../components/modals/SystemHealthPanel');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const React = await import('react');

      const mockEvent = {
        kind: 'ai_client_processing_error',
        operation: 'reverseEngineerFullReport',
        category: 'conversational_response',
        status: 0,
        message: 'No JSON returned',
        userEmail: 'teacher@test.com',
        createdAtMs: Date.now() - 500,
        createdAtIso: new Date().toISOString(),
        reason: 'ai_conversational_reply'
      };

      const html = renderToStaticMarkup(
        React.createElement(SystemHealthPanel, {
          healthEvents: [mockEvent as any],
          healthReviewedMs: 0,
          cloudSyncState: { connected: true, status: 'synced' },
          onMarkHealthReviewed: vi.fn(),
          onClearHealthEvents: vi.fn()
        })
      );

      expect(html).toContain('ai_conversational_reply');
      expect(html).toContain('תשובה שיחתית ללא מטרות');
      expect(html).toContain('system-health-rca-reason');
    });
  });
});
