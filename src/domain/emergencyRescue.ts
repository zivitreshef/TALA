import { CURRENT_APP_VERSION } from './telemetryTaxonomy';

export interface EmergencyBackupPayload {
  system: 'TALA';
  version: string;
  exportedAt: string;
  exportedBy: string;
  students: any[];
  userPreferences?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Checks whether the emergency rescue mode URL parameter is active (?export=true or ?rescue=true)
 */
export function isEmergencyRescueMode(search?: string): boolean {
  try {
    const query = search !== undefined
      ? search
      : (typeof window !== 'undefined' && window.location ? window.location.search : '');
    const params = new URLSearchParams(query);
    return params.get('export') === 'true' || params.get('rescue') === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * Generates the clean emergency rescue link for support/admin
 */
export function getEmergencyRescueUrl(baseUrl = 'https://zivitreshef.github.io/TALA/'): string {
  const cleanUrl = baseUrl.split('?')[0];
  return `${cleanUrl}?export=true`;
}

/**
 * Generates clear, ready-to-copy Hebrew guidance text for sending to a teacher or behavior analyst
 */
export function getEmergencyRescueTeacherGuidanceText(baseUrl = 'https://zivitreshef.github.io/TALA/'): string {
  const rescueUrl = getEmergencyRescueUrl(baseUrl);
  return `שלום, כדי לבצע חילוץ וגיבוי של הנתונים במכשירך:
1. אנא היכנסי למערכת דרך הקישור הייעודי הבא:
   ${rescueUrl}
2. בסרגל החילוץ שיופיע בראש המסך, לחצי על "ייצוא נתונים לקובץ גיבוי".
3. שלחי אלינו את הקובץ שנשמר במחשבך כדי שנוכל לבדוק ולסייע.
תודה על שיתוף הפעולה!`;
}

/**
 * Builds a validated, sanitized emergency backup payload
 */
export function buildEmergencyBackupPayload(params: {
  students: any[];
  userPreferences?: Record<string, any>;
  exportedBy?: string;
}): EmergencyBackupPayload {
  const safeStudents = Array.isArray(params.students)
    ? params.students.map((st) => {
        // Deep copy without modifying originals
        try {
          return JSON.parse(JSON.stringify(st));
        } catch (_) {
          return st;
        }
      })
    : [];

  return {
    system: 'TALA',
    version: CURRENT_APP_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: params.exportedBy || 'unknown',
    students: safeStudents,
    userPreferences: params.userPreferences ? JSON.parse(JSON.stringify(params.userPreferences)) : undefined
  };
}

/**
 * Triggers a client-side download of the emergency backup JSON file
 */
export function downloadEmergencyBackupFile(payload: EmergencyBackupPayload): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `tala-emergency-backup-${dateStr}.json`;
  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and sanitizes imported emergency backup JSON data with zero-trust security checks
 */
export function validateEmergencyBackupData(raw: unknown): {
  valid: boolean;
  error?: string;
  payload?: EmergencyBackupPayload;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'מבנה הקובץ אינו תקין. נדרש קובץ נתונים תקני של מערכת TALA.' };
  }

  const record = raw as Record<string, any>;

  // Prevent prototype pollution on own keys
  const ownKeys = Object.keys(record);
  if (ownKeys.includes('__proto__') || ownKeys.includes('constructor') || ownKeys.includes('prototype')) {
    return { valid: false, error: 'הקובץ נדחה עקב זיהוי שדות אבטחה אסורים.' };
  }

  const studentsList = record.students;
  if (!Array.isArray(studentsList)) {
    return { valid: false, error: 'הקובץ אינו מכיל רשימת תלמידים תקינה.' };
  }

  // Validate student entries
  const validatedStudents: any[] = [];
  for (const st of studentsList) {
    if (!st || typeof st !== 'object' || Array.isArray(st)) continue;
    if (!st.id || typeof st.id !== 'string') continue;
    validatedStudents.push(JSON.parse(JSON.stringify(st)));
  }

  const userPrefs = record.userPreferences && typeof record.userPreferences === 'object' && !Array.isArray(record.userPreferences)
    ? JSON.parse(JSON.stringify(record.userPreferences))
    : undefined;

  return {
    valid: true,
    payload: {
      system: 'TALA',
      version: typeof record.version === 'string' ? record.version : CURRENT_APP_VERSION,
      exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : new Date().toISOString(),
      exportedBy: typeof record.exportedBy === 'string' ? record.exportedBy : 'import',
      students: validatedStudents,
      userPreferences: userPrefs
    }
  };
}
