/**
 * Domain module for Teacher Personal Preferences & Defaults in TALA.
 * Manages per-teacher report settings, private goal bank, notifications,
 * professional profile, Besad header, and signature.
 */

import { safeGetStorageItem, safeSetStorageItem } from '../services/storage.js';

export const DEFAULT_USER_PREFERENCES = {
  // 1. ברירות מחדל לדוחות
  defaultReportType: 'tala', // 'tala' | 'tachi'
  reportDateFormat: 'both', // 'both' | 'gregorian' | 'hebrew'
  defaultPrivacyMode: 'full_name', // 'full_name' | 'acronym'
  defaultEducationalFramework: '',
  aiWritingTone: 'formal', // 'formal' | 'empathetic'

  // 2. בנק מטרות אישי (שלי בלבד)
  privateGoals: [],

  // 3. התראות ותקשורת
  notifyOnTeamMessage: true,
  notifyOnSharedReport: true,
  notificationFrequency: 'instant', // 'instant' | 'daily_digest' | 'in_app_only'
  dailyDigestTime: '14:00', // Preferred daily digest hour (e.g. '13:00', '14:00')
  monthlyPedagogicalReminder: false,

  // 4. פרופיל מקצועי, בס"ד וחתימה
  fullName: '',
  professionalTitle: '',
  institutionalAffiliation: '',
  showBesad: false,
  besadText: 'בס"ד', // 'בס"ד' | 'ב"ה'
  signatureImage: null
};

export function normalizeEmailKey(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

export function getUserPreferencesStorageKey(email) {
  const norm = (email || '').trim().toLowerCase();
  return `tala_user_pref_v1_${norm}`;
}

export function normalizeUserPreferences(raw = {}) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  const result = {
    ...DEFAULT_USER_PREFERENCES,
    ...raw
  };

  // Enforce types & allowed values
  result.defaultReportType = raw.defaultReportType === 'tachi' ? 'tachi' : 'tala';

  const validDateFormats = ['both', 'gregorian', 'hebrew'];
  result.reportDateFormat = validDateFormats.includes(raw.reportDateFormat)
    ? raw.reportDateFormat
    : 'both';

  result.defaultPrivacyMode = raw.defaultPrivacyMode === 'acronym' ? 'acronym' : 'full_name';
  result.defaultEducationalFramework = String(raw.defaultEducationalFramework || '').trim();
  result.aiWritingTone = raw.aiWritingTone === 'empathetic' ? 'empathetic' : 'formal';

  result.privateGoals = Array.isArray(raw.privateGoals)
    ? raw.privateGoals
        .filter((g) => g && typeof g === 'object' && (g.text || '').trim())
        .map((g) => ({
          id: g.id || `p_goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          text: String(g.text || '').trim(),
          domain: String(g.domain || 'כללי').trim(),
          environment: String(g.environment || 'כללי').trim(),
          createdAt: g.createdAt || new Date().toISOString()
        }))
    : [];

  result.notifyOnTeamMessage = raw.notifyOnTeamMessage !== false;
  result.notifyOnSharedReport = raw.notifyOnSharedReport !== false;

  const validFreqs = ['instant', 'daily_digest', 'in_app_only'];
  result.notificationFrequency = validFreqs.includes(raw.notificationFrequency)
    ? raw.notificationFrequency
    : 'instant';

  result.dailyDigestTime = typeof raw.dailyDigestTime === 'string' && raw.dailyDigestTime.trim()
    ? raw.dailyDigestTime.trim()
    : '14:00';
  result.monthlyPedagogicalReminder = Boolean(raw.monthlyPedagogicalReminder);

  result.fullName = String(raw.fullName || '').trim();
  result.professionalTitle = String(raw.professionalTitle || '').trim();
  result.institutionalAffiliation = String(raw.institutionalAffiliation || '').trim();

  result.showBesad = Boolean(raw.showBesad);
  result.besadText = raw.besadText === 'ב"ה' ? 'ב"ה' : 'בס"ד';

  result.signatureImage = typeof raw.signatureImage === 'string' && raw.signatureImage.startsWith('data:image/')
    ? raw.signatureImage
    : (raw.signatureImage || null);

  return result;
}

export function loadLocalUserPreferences(email) {
  if (!email) return { ...DEFAULT_USER_PREFERENCES };
  const key = getUserPreferencesStorageKey(email);
  const raw = safeGetStorageItem(key, null);
  if (!raw) return { ...DEFAULT_USER_PREFERENCES };
  try {
    const parsed = JSON.parse(raw);
    return normalizeUserPreferences(parsed);
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function saveLocalUserPreferences(email, prefs) {
  if (!email) return false;
  const key = getUserPreferencesStorageKey(email);
  const normalized = normalizeUserPreferences(prefs);
  return safeSetStorageItem(key, JSON.stringify(normalized));
}

export function addPrivateGoal(prefs, goalData) {
  const current = normalizeUserPreferences(prefs);
  if (!goalData || !String(goalData.text || '').trim()) return current;

  const newGoal = {
    id: goalData.id || `p_goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: String(goalData.text || '').trim(),
    domain: String(goalData.domain || 'כללי').trim(),
    environment: String(goalData.environment || 'כללי').trim(),
    createdAt: new Date().toISOString()
  };

  return {
    ...current,
    privateGoals: [newGoal, ...current.privateGoals]
  };
}

export function removePrivateGoal(prefs, goalId) {
  const current = normalizeUserPreferences(prefs);
  if (!goalId) return current;

  return {
    ...current,
    privateGoals: current.privateGoals.filter((g) => g.id !== goalId)
  };
}

export function updatePrivateGoal(prefs, goalId, patch = {}) {
  const current = normalizeUserPreferences(prefs);
  if (!goalId) return current;

  return {
    ...current,
    privateGoals: current.privateGoals.map((g) => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        text: patch.text !== undefined ? String(patch.text).trim() : g.text,
        domain: patch.domain !== undefined ? String(patch.domain).trim() : g.domain,
        environment: patch.environment !== undefined ? String(patch.environment).trim() : g.environment
      };
    })
  };
}

/**
 * Applies default preferences (report type, educational framework) when initializing a new student.
 */
export function applyPreferencesToNewStudent(studentData = {}, prefs = {}) {
  const normalizedPrefs = normalizeUserPreferences(prefs);
  const result = { ...studentData };

  // Set default report type if not already explicitly chosen
  if (!result.planType) {
    result.planType = normalizedPrefs.defaultReportType === 'tachi' ? 'תח"י' : 'תל"א';
  }

  // Set default educational framework if student has none
  if (!result.educationalFramework && normalizedPrefs.defaultEducationalFramework) {
    result.educationalFramework = normalizedPrefs.defaultEducationalFramework;
  }

  return result;
}

/**
 * Returns Besad HTML markup for document headers if enabled.
 */
export function getBesadHeaderHtml(prefs = {}) {
  const normalized = normalizeUserPreferences(prefs);
  if (!normalized.showBesad) return '';
  const text = normalized.besadText || 'בס"ד';
  return `<div class="doc-besad-header" style="text-align: left; font-size: 11pt; font-weight: bold; color: #475569; margin-bottom: 4px; font-family: 'Assistant', Arial, sans-serif;">${text}</div>`;
}


export function toHebrewGematria(num) {
  const letters = [
    [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
    [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'],
    [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']
  ];
  if (num === 15) return 'ט״ו';
  if (num === 16) return 'ט״ז';
  let res = '';
  let n = num;
  for (const [val, char] of letters) {
    while (n >= val) {
      res += char;
      n -= val;
    }
  }
  if (res.length === 1) return res + '׳';
  return res.slice(0, -1) + '״' + res.slice(-1);
}

export function formatHebrewCalendarDate(dateObj) {
  try {
    const parts = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).formatToParts(dateObj);

    const d = parts.find((p) => p.type === 'day')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const y = parts.find((p) => p.type === 'year')?.value;

    const dNum = parseInt(d, 10);
    const dHeb = !isNaN(dNum) ? toHebrewGematria(dNum) : (d || '');

    const yNum = parseInt(y, 10);
    let yHeb = y || '';
    if (!isNaN(yNum)) {
      const rem = yNum % 1000;
      if (rem >= 700 && rem < 800) {
        yHeb = 'תש' + toHebrewGematria(rem - 700);
      } else if (rem >= 800 && rem < 900) {
        yHeb = 'תת' + toHebrewGematria(rem - 800);
      }
    }

    return `${dHeb} ב${m} ${yHeb}`.replace('בב', 'ב');
  } catch {
    return dateObj.toLocaleDateString('he-IL');
  }
}

export function parseFlexibleDate(str) {
  if (!str) return new Date();
  const trimmed = String(str).trim();
  const parts = trimmed.split(/[./-]/).map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    if (parts[0] > 1000) return new Date(parts[0], parts[1] - 1, parts[2]); // YYYY-MM-DD
    return new Date(parts[2], parts[1] - 1, parts[0]); // DD.MM.YYYY
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatDateWithPreferences(dateStr, formatPref = 'both') {
  if (!dateStr) return '';
  const d = parseFlexibleDate(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const greg = `${day}.${month}.${year}`;

  if (formatPref === 'gregorian') return greg;
  const heb = formatHebrewCalendarDate(d);
  if (formatPref === 'hebrew') return heb;
  return `${heb} | ${greg}`;
}
