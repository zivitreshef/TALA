import { detectStudentStage } from '../studentStage.js';

export interface StudentFormDataForPrivacy {
  name?: string;
  gender?: string;
  stage?: string;
  privacyMode?: string;
  defaultPrivacyMode?: string;
  idNumber?: string;
  birthDate?: string;
  address?: string;
  phone?: string;
  educationalFramework?: string;
  schoolName?: string;
  gradeClass?: string;
  homeroomTeacher?: string;
  integrationTeacher?: string;
  learningSupportAssistant?: string;
  counselorName?: string;
  psychologistName?: string;
  matyaCoordinator?: string;
  emotionalTherapist?: string;
  paraMedicalTeam?: string;
  additionalPartners?: string;
  [key: string]: unknown;
}

/**
 * Escapes unsafe HTML characters to prevent XSS injection.
 */
export function escapeHtml(str?: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Decodes HTML entities (such as &quot;, &#39;, &amp;) back to normal characters for clean UI rendering.
 */
export function decodeHtmlEntities(str?: unknown): string {
  if (str == null) return '';
  let res = String(str);
  res = res
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;lt;/g, '<')
    .replace(/&amp;gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  return res;
}

export function toHebrewAcronym(fullName?: unknown): string {
  const safeName = typeof fullName === 'string' ? fullName : String(fullName || '');
  if (!safeName.trim()) return 'א.א.';
  const parts = safeName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) {
    return `${parts[0].charAt(0)}.`;
  }
  return parts.map((p) => p.charAt(0)).join('.') + '.';
}

export function maskSensitiveValue(val?: unknown): string {
  if (!val || !String(val).trim()) {
    return '████████';
  }
  const len = Math.max(5, Math.min(14, String(val).trim().length));
  return '█'.repeat(len);
}

export function redactStudentNameInText(
  text?: unknown,
  studentFullName?: unknown,
  hideDetails: boolean = true
): string {
  if (text === null || text === undefined) return '';

  const safeText = typeof text === 'string'
    ? text
    : (Array.isArray(text)
        ? text.map((item) => (typeof item === 'string' ? item : (item?.text || item?.title || String(item ?? '')))).join('\n')
        : (typeof text === 'object' && text !== null ? (text as any).text || (text as any).title || String(text) : String(text)));

  if (!safeText) return '';
  if (!hideDetails) return safeText;

  const safeFullName = typeof studentFullName === 'string' ? studentFullName : String(studentFullName || '');
  if (!safeFullName.trim()) return safeText;

  const acronym = toHebrewAcronym(safeFullName);
  const parts = safeFullName.trim().split(/\s+/).filter((p) => p.length >= 2);
  let result = safeText;

  const fullTrimmed = safeFullName.trim();
  if (fullTrimmed.length >= 2) {
    result = result.split(fullTrimmed).join(acronym);
  }

  parts.forEach((part) => {
    if (part.length >= 2) {
      result = result.split(part).join(acronym);
    }
  });

  return result;
}

export function maskKnownStudentDetails(
  text?: string | null,
  formData?: StudentFormDataForPrivacy | null,
  privacyMode?: string | null
): string {
  if (!text || typeof text !== 'string') return '';
  if (!formData) return text;

  let maskedText = text;
  const replacements: Array<{ original: string; replacement: string }> = [];

  const studentName = String(formData.name || '').trim();
  const studentGender = formData.gender || 'boy';
  const resolvedStage =
    formData.stage === 'kindergarten' || formData.stage === 'school'
      ? formData.stage
      : (typeof detectStudentStage === 'function' ? detectStudentStage(formData)?.stage : 'kindergarten');
  const isKindergarten = resolvedStage === 'kindergarten';

  const mode = privacyMode || formData.privacyMode || formData.defaultPrivacyMode || 'full_name';

  let studentReplacement: string;
  if (mode === 'acronym') {
    studentReplacement = toHebrewAcronym(studentName);
  } else {
    if (isKindergarten) {
      studentReplacement = studentGender === 'girl' ? 'הילדה' : 'הילד';
    } else {
      studentReplacement = studentGender === 'girl' ? 'התלמידה' : 'התלמיד';
    }
  }

  // Helper to add safe replacement string
  const addSafeReplacement = (rawVal: unknown, replacement: string) => {
    const val = String(rawVal || '').trim();
    if (val.length >= 2) {
      replacements.push({ original: val, replacement });
    }
  };

  // 1. Student Name (full name first, then individual parts of length >= 2)
  if (studentName && studentName !== 'תלמיד/ה חדש/ה' && studentName.length >= 2) {
    replacements.push({ original: studentName, replacement: studentReplacement });
    const nameParts = studentName.split(/\s+/).filter((p) => p.length >= 2);
    nameParts.forEach((part) => {
      replacements.push({ original: part, replacement: studentReplacement });
    });
  }

  // 2. Sensitive Personal Identifiers (length >= 2)
  addSafeReplacement(formData.idNumber, '████');
  addSafeReplacement(formData.birthDate, '████');
  addSafeReplacement(formData.address, '████');
  addSafeReplacement(formData.phone, '████');

  // 3. Educational Framework and Staff Names (length >= 2)
  addSafeReplacement(formData.educationalFramework, 'המסגרת');
  addSafeReplacement(formData.schoolName, 'המסגרת');
  addSafeReplacement(formData.gradeClass, 'המסגרת');

  // Staff Names
  addSafeReplacement(formData.homeroomTeacher, 'איש צוות');
  addSafeReplacement(formData.integrationTeacher, 'איש צוות');
  addSafeReplacement(formData.learningSupportAssistant, 'איש צוות');
  addSafeReplacement(formData.counselorName, 'איש צוות');
  addSafeReplacement(formData.psychologistName, 'איש צוות');
  addSafeReplacement(formData.matyaCoordinator, 'איש צוות');
  addSafeReplacement(formData.emotionalTherapist, 'איש צוות');
  addSafeReplacement(formData.paraMedicalTeam, 'איש צוות');
  addSafeReplacement(formData.additionalPartners, 'איש צוות');

  // Sort replacements by longest original string first to prevent partial matches
  replacements.sort((a, b) => b.original.length - a.original.length);

  // Dedupe by original
  const seen = new Set<string>();
  const uniqueReplacements: Array<{ original: string; replacement: string }> = [];
  for (const r of replacements) {
    if (!seen.has(r.original)) {
      seen.add(r.original);
      uniqueReplacements.push(r);
    }
  }

  uniqueReplacements.forEach(({ original, replacement }) => {
    if (original && original.trim()) {
      const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedOriginal, 'g');
      maskedText = maskedText.replace(regex, replacement);
    }
  });

  maskedText = maskedText.replace(/ {2,}/g, ' ').trim();
  return maskedText;
}

export function maskPromptForAi(
  promptText?: string | null,
  formData?: StudentFormDataForPrivacy | null,
  privacyMode?: string | null
): string {
  let masked = maskKnownStudentDetails(promptText, formData, privacyMode);
  masked = masked.replace(/\(ת\.ל:[^)]*\)/g, '').trim();
  return masked;
}
