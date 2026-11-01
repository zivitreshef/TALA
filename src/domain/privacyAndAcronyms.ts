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

export function toHebrewAcronym(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return 'א.א.';
  const parts = fullName
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
  text?: string | null,
  studentFullName?: string | null,
  hideDetails: boolean = true
): string {
  if (!text) return '';
  if (!hideDetails || !studentFullName || !studentFullName.trim()) return text;

  const acronym = toHebrewAcronym(studentFullName);
  const parts = studentFullName.trim().split(/\s+/).filter((p) => p.length >= 2);
  let result = text;

  const fullTrimmed = studentFullName.trim();
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

  const studentName = (formData.name || '').trim();
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

  // 1. Student Name (full name first, then individual parts of length >= 2)
  if (studentName && studentName !== 'תלמיד/ה חדש/ה' && studentName.length >= 2) {
    replacements.push({ original: studentName, replacement: studentReplacement });
    const nameParts = studentName.split(/\s+/).filter((p) => p.length >= 2);
    nameParts.forEach((part) => {
      replacements.push({ original: part, replacement: studentReplacement });
    });
  }

  // 2. Sensitive Personal Identifiers (length >= 2)
  if (formData.idNumber && formData.idNumber.trim().length >= 2) replacements.push({ original: formData.idNumber.trim(), replacement: '████' });
  if (formData.birthDate && formData.birthDate.trim().length >= 2) replacements.push({ original: formData.birthDate.trim(), replacement: '████' });
  if (formData.address && formData.address.trim().length >= 2) replacements.push({ original: formData.address.trim(), replacement: '████' });
  if (formData.phone && formData.phone.trim().length >= 2) replacements.push({ original: formData.phone.trim(), replacement: '████' });

  // 3. Educational Framework and Staff Names (length >= 2)
  if (formData.educationalFramework && formData.educationalFramework.trim().length >= 2) replacements.push({ original: formData.educationalFramework.trim(), replacement: 'המסגרת' });
  if (formData.schoolName && formData.schoolName.trim().length >= 2) replacements.push({ original: formData.schoolName.trim(), replacement: 'המסגרת' });
  if (formData.gradeClass && formData.gradeClass.trim().length >= 2) replacements.push({ original: formData.gradeClass.trim(), replacement: 'המסגרת' });

  // Staff Names
  if (formData.homeroomTeacher && formData.homeroomTeacher.trim().length >= 2) replacements.push({ original: formData.homeroomTeacher.trim(), replacement: 'איש צוות' });
  if (formData.integrationTeacher && formData.integrationTeacher.trim().length >= 2) replacements.push({ original: formData.integrationTeacher.trim(), replacement: 'איש צוות' });
  if (formData.learningSupportAssistant && formData.learningSupportAssistant.trim().length >= 2) replacements.push({ original: formData.learningSupportAssistant.trim(), replacement: 'איש צוות' });
  if (formData.counselorName && formData.counselorName.trim().length >= 2) replacements.push({ original: formData.counselorName.trim(), replacement: 'איש צוות' });
  if (formData.psychologistName && formData.psychologistName.trim().length >= 2) replacements.push({ original: formData.psychologistName.trim(), replacement: 'איש צוות' });
  if (formData.matyaCoordinator && formData.matyaCoordinator.trim().length >= 2) replacements.push({ original: formData.matyaCoordinator.trim(), replacement: 'איש צוות' });
  if (formData.emotionalTherapist && formData.emotionalTherapist.trim().length >= 2) replacements.push({ original: formData.emotionalTherapist.trim(), replacement: 'איש צוות' });
  if (formData.paraMedicalTeam && formData.paraMedicalTeam.trim().length >= 2) replacements.push({ original: formData.paraMedicalTeam.trim(), replacement: 'איש צוות' });
  if (formData.additionalPartners && formData.additionalPartners.trim().length >= 2) replacements.push({ original: formData.additionalPartners.trim(), replacement: 'איש צוות' });

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
