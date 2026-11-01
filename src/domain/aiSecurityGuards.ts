/**
 * Security & Prompt Injection Guardrails for TALA AI
 *
 * Implements bilingual (Hebrew & English) detection of prompt injection and meta-instruction
 * override attacks. Specifically tuned for Israeli Special Education contexts so that legitimate
 * teacher behavioral observations (e.g. "הילד מתעלם מהוראות הצוות") are NEVER falsely flagged.
 */

export const INJECTION_PATTERNS: readonly RegExp[] = [
  // English meta-instruction overrides
  /ignore\s+(?:(?:all|previous|system)\s+)*instructions/i,
  /disregard\s+(?:(?:all|previous)\s+)*instructions/i,
  /you\s+are\s+now\s+(?:a|an)?/i,
  /forget\s+(?:(?:all|your|previous)\s+)*instructions/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  /jailbreak/i,
  /role\s*=\s*(?:system|assistant|user)/i,
  /reveal\s+(?:system\s+prompt|api\s+key|secret|hidden)/i,
  /print\s+(?:the\s+)?system\s+prompt/i,
  /output\s+raw\s+prompt/i,
  /<\s*script/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,

  // Hebrew meta-instruction overrides (strict context to avoid classroom behavioral notes)
  /התעלם\s+מ(?:כל\s+)?ההוראות\s+(?:הקודמות|הבסיסיות|של\s+המערכת)/i,
  /(?:מחק|שכח)\s+את\s+(?:כל\s+)?(?:ההנחיות|ההוראות|הפרומפט)/i,
  /(?:אתה\s+מעכשיו|פעל\s+כעת\s+בתור|הגדר\s+את\s+עצמך\s+כ)/i,
  /(?:חשוף|הדפס|הצג)\s+את\s+(?:פרומפט\s+המערכת|הוראות\s+המערכת|מפתח\s+ה-?API)/i,
  /עקוף\s+את\s+(?:ההגבלות|כללי\s+הבטיחות)/i
];

/**
 * Checks whether an input text contains prompt injection or adversarial override attempts.
 * @param text - Untrusted text to evaluate
 * @returns True if malicious injection is detected
 */
export function containsInjection(text?: unknown): boolean {
  if (!text || typeof text !== 'string') return false;
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

/**
 * Wraps untrusted user/teacher observation text in strict structural boundary tags
 * accompanied by clear passive data instructions for LLMs.
 * @param text - Untrusted user input
 * @returns Enclosed prompt segment
 */
export function wrapUntrustedInput(text?: string | null): string {
  const safe = (text || '').trim();
  return `<untrusted_student_data>\n${safe}\n</untrusted_student_data>`;
}
