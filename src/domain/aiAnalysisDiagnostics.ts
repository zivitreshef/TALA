/**
 * Pedagogical AI Analysis Diagnostics & RCA.
 * Pure deterministic functions to classify AI generation failures, provide
 * tailored Hebrew guidance to teachers, and granular RCA reasons to admins.
 */

export interface AiDiagnosticParams {
  rawText?: string | null;
  aiResult?: any;
  error?: any;
  stage?: string;
}

export interface AiDiagnosticResult {
  rcaReason: string;
  teacherMessage: string;
  category: string;
}

const MIN_INPUT_CHARS = 35;
const MIN_INPUT_WORDS = 6;

/**
 * Evaluates whether the raw text input was too short to reasonably derive goals.
 */
export function isInputTooShortForPedagogicalDerivation(rawText?: string | null): boolean {
  if (!rawText) return true;
  const clean = rawText.trim();
  if (clean.length < MIN_INPUT_CHARS) return true;
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length < MIN_INPUT_WORDS;
}

/**
 * Extracts a concise snippet for RCA logging without exposing sensitive full PII.
 */
function sanitizeSnippet(text?: unknown, maxLen = 60): string {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/\s+/g, ' ').slice(0, maxLen);
}

/**
 * Diagnoses an AI reverse-engineering or goal generation error.
 */
export function diagnoseAiAnalysisError(params: AiDiagnosticParams): AiDiagnosticResult {
  const { rawText, aiResult, error } = params;

  // 1. Caught runtime or network exceptions
  if (error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        category: 'network',
        rcaReason: 'offline_no_internet',
        teacherMessage:
          'אין חיבור לאינטרנט. הפקת יעדים ומטרות באמצעות בינה מלאכותית דורשת חיבור פעיל לרשת. כל הנתונים, התצפיות והטיוטות שרשמת שמורים בבטחה במכשירך ויסונכרנו לענן עם חזרת הרשת.'
      };
    }

    const errStatus = Number(error?.status) || 0;
    const errMsg = String(error?.message || '');
    const isTimeout = Boolean(
      error?.isTimeout ||
      errStatus === 504 ||
      errMsg.toLowerCase().includes('timeout') ||
      errMsg.toLowerCase().includes('aborted')
    );

    if (isTimeout) {
      return {
        category: 'server_error',
        rcaReason: 'ai_timeout',
        teacherMessage:
          'חיבור הבינה המלאכותית התעכב עקב עומס רגעי ברשת. כל הטקסט והתצפיות שרשמת שמורים במכשירך – אנא לחצי על "נסי שוב" בעוד מספר רגעים.'
      };
    }

    if (errStatus === 429 || /rate limit|quota|resource_exhausted/i.test(errMsg)) {
      return {
        category: 'rate_limit',
        rcaReason: 'ai_rate_limit_exceeded',
        teacherMessage:
          'התקבל עומס בקשות רגעי במערכת הבינה המלאכותית. המידע שלך שמור במלואו, אנא נסי שוב בעוד דקה.'
      };
    }

    return {
      category: errStatus >= 500 ? 'server_error' : 'network',
      rcaReason: `ai_network_error: ${sanitizeSnippet(errMsg || 'unknown', 50)}`,
      teacherMessage:
        'חלה בעיית תקשורת בעת העיבוד בבינה המלאכותית (שיבוש זמני ברשת או עומס רגעי). הטקסט והתצפיות שרשמת שמורים במלואם במכשירך ויסונכרנו לענן. אנא נסי שוב בעוד מספר רגעים.'
    };
  }

  // 2. Input too short check
  if (isInputTooShortForPedagogicalDerivation(rawText)) {
    const chars = rawText ? rawText.trim().length : 0;
    return {
      category: 'input_too_short',
      rcaReason: `ai_input_too_short (chars=${chars})`,
      teacherMessage:
        'התיאור שהוזן קצר מדי מכדי לגזור ממנו מטרות פדגוגיות. אנא הוסיפי עוד 1–2 משפטים המתארים תפקוד, קשיים או חוזקות של התלמיד/ה, ולחצי שוב.'
    };
  }

  // 3. Inspect raw text response from the model
  if (aiResult && typeof aiResult.raw === 'string') {
    const rawOutput = aiResult.raw.trim();

    // Check if the output has no JSON open bracket at all -> conversational reply / refusal
    if (!rawOutput.includes('{')) {
      const snippet = sanitizeSnippet(rawOutput, 60);
      return {
        category: 'conversational_response',
        rcaReason: snippet ? `ai_conversational_reply: ${snippet}` : 'ai_conversational_reply',
        teacherMessage:
          'הבינה המלאכותית זקוקה למידע תפקודי ממוקד יותר על מנת לנסח יעדים. כדאי להוסיף דוגמה לפעילות, קושי ספציפי או תצפית מהשטח, וללחוץ שוב.'
      };
    }

    // Check if output begins with JSON open bracket or contains one, but is truncated before closing
    const hasOpenBrace = rawOutput.includes('{');
    const endsWithClose = /(\}|\])\s*$/.test(rawOutput);
    const openCount = (rawOutput.match(/\{/g) || []).length;
    const closeCount = (rawOutput.match(/\}/g) || []).length;

    if (hasOpenBrace && (!endsWithClose || openCount > closeCount)) {
      return {
        category: 'output_truncated',
        rcaReason: `ai_output_truncated (rawLength=${rawOutput.length})`,
        teacherMessage:
          'התשובה מהבינה המלאכותית נקטעה באמצע עקב עומס או מגבלת אורך. כל הנתונים שמורים – לחצי על "נסי שוב" כדי להפיק מחדש את הדוח.'
      };
    }

    // The output had braces and seemed complete, but JSON parsing failed
    return {
      category: 'malformed_json',
      rcaReason: 'ai_malformed_json_syntax',
      teacherMessage:
        'חלה שגיאה במבנה התשובה שהתקבלה מהבינה המלאכותית. המידע שלך שמור במלואו – לחצי על "נסי שוב" להפקה מחודשת.'
    };
  }

  // 4. Valid JSON structure returned, but missing goals or empty goals array
  if (aiResult && typeof aiResult === 'object') {
    if (!Array.isArray(aiResult.goals) || aiResult.goals.length === 0) {
      return {
        category: 'missing_goals',
        rcaReason: 'ai_missing_goals_field',
        teacherMessage:
          'התשובה התקבלה ללא מטרות מוגדרות. מומלץ לוודא שהטקסט כולל תיאור מפורט של תחומי תפקוד, וללחוץ על "נסי שוב".'
      };
    }
  }

  // 5. Fallback for empty or unknown response
  return {
    category: 'empty_response',
    rcaReason: 'ai_empty_response',
    teacherMessage:
      'התקבלה תשובה ריקה מהבינה המלאכותית. אנא נסי שוב בעוד מספר רגעים.'
  };
}
