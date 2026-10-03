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
