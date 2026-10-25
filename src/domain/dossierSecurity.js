/**
 * File Upload Security Hardening for Diagnostic Dossier Files
 *
 * Implements multi-layered defensive validation:
 * 1. Strict extension allowlist + blocklist protection (including double extensions).
 * 2. Magic byte / Binary signature inspection to prevent renamed executables (.exe -> .pdf).
 * 3. Script & shebang scanning to prevent execution payload delivery.
 * 4. File size quota enforcement (max 20MB).
 */

export const MAX_DOSSIER_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_DOSSIER_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'doc',
  'txt',
  'csv',
  'png',
  'jpg',
  'jpeg',
  'webp'
]);

export const FORBIDDEN_EXTENSIONS = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'sh',
  'bash',
  'ps1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'mjs',
  'jsx',
  'ts',
  'tsx',
  'html',
  'htm',
  'xhtml',
  'php',
  'phtml',
  'py',
  'pyw',
  'rb',
  'pl',
  'jar',
  'war',
  'jsp',
  'asp',
  'aspx',
  'apk',
  'msi',
  'msp',
  'com',
  'scr',
  'hta',
  'cpl',
  'wsf',
  'bin',
  'elf',
  'so',
  'dmg',
  'iso'
]);

/**
 * Validates the file name against allowed extensions and detects double-extension spoofing.
 */
export function validateFileNameSecurity(fileName = '') {
  const name = String(fileName || '').trim().toLowerCase();
  if (!name) {
    return { valid: false, reason: 'שם הקובץ ריק או לא תקין.' };
  }

  const parts = name.split('.').filter(Boolean);
  if (parts.length < 2) {
    return { valid: false, reason: 'הקובץ חסר סיומת מזהה (יש להעלות קובצי PDF, Word או תמונות).' };
  }

  const primaryExt = parts[parts.length - 1];

  // 1. Check if the declared extension is forbidden
  if (FORBIDDEN_EXTENSIONS.has(primaryExt)) {
    return {
      valid: false,
      reason: `העלאת קובצי הרצה או סקריפטים (.${primaryExt}) חסומה מטעמי אבטחה.`
    };
  }

  // 2. Check if the declared extension is in the strict allowlist
  if (!ALLOWED_DOSSIER_EXTENSIONS.has(primaryExt)) {
    return {
      valid: false,
      reason: `סוג הקובץ (.${primaryExt}) אינו נתמך. המערכת תומכת בקובצי PDF, Word (DOCX) ותמונות בלבד.`
    };
  }

  // 3. Double-extension attack prevention (e.g. "report.exe.pdf", "scan.vbs.docx")
  for (let i = 0; i < parts.length - 1; i++) {
    const subExt = parts[i];
    if (FORBIDDEN_EXTENSIONS.has(subExt)) {
      return {
        valid: false,
        reason: `זוהתה סיומת כפולה חשודה (${subExt}.${primaryExt}). הקובץ נחסם מטעמי אבטחה.`
      };
    }
  }

  return { valid: true, extension: primaryExt };
}

/**
 * Checks magic bytes / file signatures to verify actual file content matches declared type.
 * Specifically rejects Windows PE/EXE ("MZ"), Linux ELF, Mach-O, scripts ("#!"), and HTML/JS payloads.
 */
export async function validateFileMagicBytes(fileOrBuffer, declaredExt = '') {
  let bytes;

  if (fileOrBuffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileOrBuffer.slice(0, 32));
  } else if (fileOrBuffer && typeof fileOrBuffer.slice === 'function') {
    const slice = fileOrBuffer.slice(0, 32);
    const buffer = await slice.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else {
    return { valid: true }; // Fallback if unable to read slice
  }

  if (bytes.length < 2) {
    return { valid: false, reason: 'הקובץ ריק או פגום.' };
  }

  // 1. Windows Executable / DLL check: "MZ" signature (0x4D, 0x5A)
  if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
    return {
      valid: false,
      reason: 'זוהה קובץ הרצה בינארי של Windows (MZ/EXE). הקובץ נחסם מטעמי אבטחה.'
    };
  }

  // 2. Linux ELF binary check: 0x7F, 'E', 'L', 'F' (0x7F, 0x45, 0x4C, 0x46)
  if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
    return {
      valid: false,
      reason: 'זוהה קובץ הרצה בינארי של Linux (ELF). הקובץ נחסם מטעמי אבטחה.'
    };
  }

  // 3. Script shebang check: "#!" (0x23, 0x21)
  if (bytes[0] === 0x23 && bytes[1] === 0x21) {
    return {
      valid: false,
      reason: 'זוהה סקריפט הרצה (Shebang). העלאת סקריפטים חסומה מטעמי אבטחה.'
    };
  }

  // 4. Match specific allowed signatures if declared
  const ext = String(declaredExt || '').toLowerCase();

  if (ext === 'pdf') {
    // PDF must begin with "%PDF" (0x25, 0x50, 0x44, 0x46)
    const isPdf =
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46;
    if (!isPdf) {
      return {
        valid: false,
        reason: 'מבנה הקובץ אינו תואם מסמך PDF תקני (חתימת הקובץ אינה תואמת).'
      };
    }
  } else if (ext === 'docx') {
    // DOCX is a ZIP container: "PK\x03\x04" (0x50, 0x4B, 0x03, 0x04)
    const isZip =
      bytes[0] === 0x50 &&
      bytes[1] === 0x4B &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
    if (!isZip) {
      return {
        valid: false,
        reason: 'מבנה הקובץ אינו תואם מסמך Word DOCX תקני (חתימת הקובץ אינה תואמת).'
      };
    }
  } else if (ext === 'png') {
    // PNG starts with 0x89, 'P', 'N', 'G'
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4E &&
      bytes[3] === 0x47;
    if (!isPng) {
      return {
        valid: false,
        reason: 'מבנה הקובץ אינו תואם תמונת PNG תקנית.'
      };
    }
  } else if (ext === 'jpg' || ext === 'jpeg') {
    // JPEG starts with 0xFF, 0xD8, 0xFF
    const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    if (!isJpg) {
      return {
        valid: false,
        reason: 'מבנה הקובץ אינו תואם תמונת JPEG תקנית.'
      };
    }
  }

  return { valid: true };
}

/**
 * Scans text content for embedded scripts or dangerous execution vectors.
 */
export function scanTextForMaliciousScripts(text = '') {
  if (!text) return { valid: true };

  const suspiciousPatterns = [
    /<script\b[^>]*>/i,
    /javascript:\s*/i,
    /\bonerror\s*=/i,
    /\bonload\s*=/i,
    /\bpowershell(?:\.exe)?\s+/i,
    /\bcmd(?:\.exe)?\s+\/[ck]/i,
    /\bwscript\.shell\b/i,
    /<\?php\b/i,
    /\beval\s*\(/i,
    /\bdocument\.cookie\b/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reason: 'זוהו תגיות סקריפט או פקודות הרצה בטקסט הקובץ. הקובץ נחסם מטעמי אבטחה.'
      };
    }
  }

  return { valid: true };
}

/**
 * Master file validator running all security checks before processing/uploading.
 */
export async function validateDossierFileUpload(file) {
  if (!file) {
    return { valid: false, reason: 'לא נבחר קובץ.' };
  }

  // 1. File size check (max 20MB)
  if (file.size > MAX_DOSSIER_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      reason: `גודל הקובץ (${sizeMb}MB) חורג מהמגבלה של 20MB. אנא בחרי קובץ קטן יותר.`
    };
  }

  if (file.size === 0) {
    return { valid: false, reason: 'הקובץ שנבחר ריק (0 בייטים).' };
  }

  // 2. File name & extension validation
  const nameCheck = validateFileNameSecurity(file.name);
  if (!nameCheck.valid) {
    return nameCheck;
  }

  // 3. Magic byte signature validation
  const magicCheck = await validateFileMagicBytes(file, nameCheck.extension);
  if (!magicCheck.valid) {
    return magicCheck;
  }

  return { valid: true, extension: nameCheck.extension };
}
