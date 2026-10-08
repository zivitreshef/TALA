// === פונקציות עזר להסתרת פרטים מזהים בהדפסה (ראשי תיבות והשחרה) ===

export function toHebrewAcronym(fullName) {
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

export function maskSensitiveValue(val) {
  if (!val || !String(val).trim()) {
    return '████████';
  }
  const len = Math.max(5, Math.min(14, String(val).trim().length));
  return '█'.repeat(len);
}

export function redactStudentNameInText(text, studentFullName, hideDetails = true) {
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

// === פונקציות עזר להסתרת פרטים מזהים לפני שליחה ל-AI ===

// מחליף את כל המופעים של מילים רגישות בטקסט במחרוזות חלופיות
export function maskKnownStudentDetails(text, formData) {
  if (!text || typeof text !== 'string') return '';
  if (!formData) return text;

  let maskedText = text;
  const replacements = [];

  const studentName = (formData.name || '').trim();
  const studentGender = formData.gender || 'boy';
  const genderedName = studentGender === 'girl' ? 'הילדה' : 'הילד';

  // 1. Student Name (full name first, then individual parts of length >= 2)
  if (studentName && studentName !== 'תלמיד/ה חדש/ה' && studentName.length >= 2) {
    replacements.push({ original: studentName, replacement: genderedName });
    const nameParts = studentName.split(/\s+/).filter((p) => p.length >= 2);
    nameParts.forEach((part) => {
      replacements.push({ original: part, replacement: genderedName });
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
  const seen = new Set();
  const uniqueReplacements = [];
  for (const r of replacements) {
    if (!seen.has(r.original)) {
      seen.add(r.original);
      uniqueReplacements.push(r);
    }
  }

  uniqueReplacements.forEach(({ original, replacement }) => {
    if (original && original.trim()) {
      // Escape special regex characters in the original string
      const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace all occurrences (case-sensitive, no word boundaries for Hebrew compatibility)
      const regex = new RegExp(escapedOriginal, 'g');
      maskedText = maskedText.replace(regex, replacement);
    }
  });

  // Clean up any double spaces that might result from replacements (preserve newlines)
  maskedText = maskedText.replace(/ {2,}/g, ' ').trim();

  return maskedText;
}

// Function to mask the prompt before sending to AI
export function maskPromptForAi(promptText, formData) {
  let masked = maskKnownStudentDetails(promptText, formData);

  // Strip (ת.ל: DD/MM/YYYY) from ageDescription if present
  masked = masked.replace(/\(ת\.ל:[^)]*\)/g, '').trim();

  return masked;
}

