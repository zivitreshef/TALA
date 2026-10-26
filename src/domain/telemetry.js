/**
 * Telemetry, Cost & Security Calculation Domain
 * Pure, deterministic functions for computing AI & email usage, cloud storage footprint,
 * cost estimations, and security anomaly threat levels.
 */

export const DAILY_AI_QUOTA_LIMIT = 1500;
export const DAILY_EMAIL_QUOTA_LIMIT = 100;
export const FREE_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB Firebase Storage free tier
export const FREE_FIRESTORE_DAILY_READS = 50000;
export const FREE_FIRESTORE_DAILY_WRITES = 20000;
export const FREE_CLOUD_FUNCTIONS_INVOCATIONS_MONTHLY = 2000000;

// Average token cost estimation for Gemini 2.5/2.0 Flash (~$0.075 per 1M input, ~$0.30 per 1M output)
// Typical pedagogical query: ~1,500 input tokens + ~800 output tokens =~ $0.00035 USD per query
export const ESTIMATED_USD_PER_AI_QUERY = 0.00035;
export const USD_TO_ILS_ESTIMATE = 3.75;

/**
 * Format a Date to 'YYYY-MM-DD' in local time.
 */
export function getLocalDayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date to 'YYYY-MM' (calendar month).
 */
export function getLocalMonthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Converts a Firestore timestamp or date string/number to milliseconds.
 */
export function toTimestampMs(timeVal) {
  if (!timeVal) return 0;
  if (typeof timeVal === 'number') return timeVal;
  if (typeof timeVal.toMillis === 'function') return timeVal.toMillis();
  if (timeVal.seconds) return timeVal.seconds * 1000 + Math.floor((timeVal.nanoseconds || 0) / 1000000);
  const parsed = new Date(timeVal).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Computes storage metrics across all student diagnostic dossiers.
 * Also extracts top 5 largest files to identify storage hogs.
 */
export function calculateStorageFootprint(students = []) {
  if (!Array.isArray(students)) {
    return { totalFiles: 0, totalBytes: 0, formattedMb: '0.0 MB', usagePercent: 0, largestFiles: [] };
  }

  let totalFiles = 0;
  let totalBytes = 0;
  const allFiles = [];

  students.forEach((student) => {
    const studentName = student?.name || 'תלמיד/ה ללא שם';
    const studentId = student?.id || '';
    const docs = student?.diagnosticDossier?.documents;
    if (Array.isArray(docs)) {
      docs.forEach((doc) => {
        if (doc && (doc.storagePath || doc.storageUrl)) {
          const fileSize = Number(doc.fileSize) || 0;
          totalFiles += 1;
          totalBytes += fileSize;
          allFiles.push({
            id: doc.id || doc.storagePath,
            fileName: doc.fileName || doc.name || 'קובץ ללא שם',
            fileSize,
            formattedSize: fileSize > 1024 * 1024
              ? (fileSize / (1024 * 1024)).toFixed(1) + ' MB'
              : Math.round(fileSize / 1024) + ' KB',
            studentName,
            studentId,
            uploadedAt: doc.uploadedAt || doc.createdAt || ''
          });
        }
      });
    }
  });

  const totalMb = totalBytes / (1024 * 1024);
  const formattedMb = totalMb < 100 ? totalMb.toFixed(1) + ' MB' : Math.round(totalMb) + ' MB';
  const usagePercent = Math.min(100, (totalBytes / FREE_STORAGE_LIMIT_BYTES) * 100);

  const largestFiles = allFiles
    .sort((a, b) => b.fileSize - a.fileSize)
    .slice(0, 5);

  return {
    totalFiles,
    totalBytes,
    formattedMb,
    usagePercent: Number(usagePercent.toFixed(2)),
    largestFiles
  };
}

/**
 * Proactive Anomaly & Soft Quota Warning Detector.
 * Identifies:
 * 1. AI or Email consumption >= 80% of daily quota.
 * 2. Cloud Storage footprint >= 80% of free tier (4,096 MB).
 * 3. Runaway user anomaly (single user >= 40% of daily AI queries when total >= 20).
 * 4. Volume spike anomaly (today's AI usage >= 2.5x the 7-day daily average when daily average >= 10).
 */
export function detectAbnormalSpikes({
  aiTodayCount = 0,
  emailTodayCount = 0,
  storage = {},
  topActiveTeachers = [],
  last7Days = []
} = {}) {
  const anomalies = [];

  // 1. Soft Quota Warnings (>= 80%)
  if (aiTodayCount >= DAILY_AI_QUOTA_LIMIT * 0.8) {
    anomalies.push({
      id: 'warn_ai_soft_quota',
      type: 'soft_quota',
      title: 'התראת סף מקדימה: צריכת ה-AI הגיעה ל-80% מהמכסה היומית',
      detail: `בוצעו ${aiTodayCount} שאילתות מתוך ${DAILY_AI_QUOTA_LIMIT} המותרות להיום. לקראת ניצול מלא המערכת תציע מעבר למפתח מנהל ישיר.`,
      severity: aiTodayCount >= DAILY_AI_QUOTA_LIMIT ? 'critical' : 'warning'
    });
  }

  if (emailTodayCount >= DAILY_EMAIL_QUOTA_LIMIT * 0.8) {
    anomalies.push({
      id: 'warn_email_soft_quota',
      type: 'soft_quota',
      title: 'התראת סף מקדימה: משלוח מיילים הגיע ל-80% ממכסת Apps Script',
      detail: `נשלחו ${emailTodayCount} מתוך ${DAILY_EMAIL_QUOTA_LIMIT} מיילים יומיים. נותרו ${Math.max(0, DAILY_EMAIL_QUOTA_LIMIT - emailTodayCount)} מיילים עד לאיפוס מחר בבוקר.`,
      severity: emailTodayCount >= DAILY_EMAIL_QUOTA_LIMIT ? 'critical' : 'warning'
    });
  }

  if ((storage?.usagePercent || 0) >= 80) {
    anomalies.push({
      id: 'warn_storage_soft_quota',
      type: 'soft_quota',
      title: 'התראת סף מקדימה: נפח תיקי האבחון ב-Storage עבר 80% (4,096 MB)',
      detail: `נפח האחסון הנוכחי עומד על ${storage.formattedMb} מתוך 5,120 MB ב-Free Tier. מומלץ לבדוק את טבלת הקבצים הכבדים.`,
      severity: (storage?.usagePercent || 0) >= 95 ? 'critical' : 'warning'
    });
  }

  // 2. Runaway Teacher Anomaly
  if (aiTodayCount >= 20 && Array.isArray(topActiveTeachers) && topActiveTeachers.length > 0) {
    const topTeacher = topActiveTeachers[0];
    if (topTeacher && topTeacher.aiCount >= aiTodayCount * 0.4) {
      anomalies.push({
        id: `anomaly_teacher_${topTeacher.email}`,
        type: 'user_spike',
        title: `זיהוי ריכוז צריכה חריג: מורה יחידה צורכת ${Math.round((topTeacher.aiCount / aiTodayCount) * 100)}% מכלל ה-AI היומי`,
        detail: `המשתמשת ${topTeacher.email} ביצעה ${topTeacher.aiCount} שאילתות היום. כדאי לוודא שלא מדובר בלולאה תקועה בדפדפן.`,
        severity: 'warning'
      });
    }
  }

  // 3. Spike vs 7-day average
  if (Array.isArray(last7Days) && last7Days.length >= 2) {
    const pastDays = last7Days.slice(0, last7Days.length - 1);
    const sumPast = pastDays.reduce((acc, d) => acc + (d.aiCount || 0), 0);
    const avgPast = sumPast / pastDays.length;

    if (avgPast >= 10 && aiTodayCount >= avgPast * 2.5) {
      anomalies.push({
        id: 'anomaly_volume_spike',
        type: 'volume_spike',
        title: `זינוק חד בפעילות AI היומית (פי ${(aiTodayCount / avgPast).toFixed(1)} מהממוצע השבועי)`,
        detail: `היום נרשמו ${aiTodayCount} שאילתות לעומת ממוצע שבועי של ${Math.round(avgPast)} שאילתות ליום.`,
        severity: 'warning'
      });
    }
  }

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies
  };
}

/**
 * Aggregates AI audit logs, email logs, storage and security events.
 */
export function aggregateTelemetryData({
  aiLogs = [],
  emailLogs = [],
  students = [],
  settings = {},
  now = new Date()
} = {}) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const currentDayKey = getLocalDayKey(now);
  const currentMonthKey = getLocalMonthKey(now);
  const oneDayAgoMs = nowMs - 24 * 60 * 60 * 1000;

  let aiTodayCount = 0;
  let aiMonthCount = 0;
  let emailTodayCount = 0;
  let emailMonthCount = 0;

  const blockedInjections = [];
  const rateLimitEvents = [];
  const geminiErrors = [];
  const userActivityMap = new Map();

  // 1. Process AI Logs
  (Array.isArray(aiLogs) ? aiLogs : []).forEach((log) => {
    if (!log) return;
    const logMs = toTimestampMs(log.createdAt || log.timestamp || log.createdAtMs);
    const logDate = new Date(logMs);
    const dayKey = getLocalDayKey(logDate);
    const monthKey = getLocalMonthKey(logDate);

    if (dayKey === currentDayKey) {
      aiTodayCount += 1;
    }
    if (monthKey === currentMonthKey) {
      aiMonthCount += 1;
    }

    const email = (log.email || '').toLowerCase().trim();
    if (email) {
      const existing = userActivityMap.get(email) || { email, aiCount: 0, emailCount: 0, lastActiveMs: 0 };
      existing.aiCount += 1;
      if (logMs > existing.lastActiveMs) existing.lastActiveMs = logMs;
      userActivityMap.set(email, existing);
    }

    if (log.status === 'blocked_injection') {
      blockedInjections.push({
        id: log.id || `inj_${logMs}`,
        email: log.email || 'unknown',
        operation: log.operation || 'rawPrompt',
        createdAtMs: logMs,
        model: log.model
      });
    } else if (log.status === 'rate_limit_exceeded') {
      rateLimitEvents.push({
        id: log.id || `rl_${logMs}`,
        email: log.email || 'unknown',
        operation: log.operation || 'rawPrompt',
        limitedWindow: log.limitedWindow || 'minute',
        createdAtMs: logMs
      });
    } else if (log.status === 'gemini_error') {
      geminiErrors.push({
        id: log.id || `err_${logMs}`,
        email: log.email || 'unknown',
        error: log.error || 'Gemini call failed',
        createdAtMs: logMs
      });
    }
  });

  // 2. Process Email Logs
  (Array.isArray(emailLogs) ? emailLogs : []).forEach((log) => {
    if (!log) return;
    const logMs = toTimestampMs(log.createdAtMs || log.createdAt || log.timestamp);
    const logDate = new Date(logMs);
    const dayKey = getLocalDayKey(logDate);
    const monthKey = getLocalMonthKey(logDate);

    if (dayKey === currentDayKey) {
      emailTodayCount += 1;
    }
    if (monthKey === currentMonthKey) {
      emailMonthCount += 1;
    }

    const email = (log.userEmail || log.email || '').toLowerCase().trim();
    if (email) {
      const existing = userActivityMap.get(email) || { email, aiCount: 0, emailCount: 0, lastActiveMs: 0 };
      existing.emailCount += 1;
      if (logMs > existing.lastActiveMs) existing.lastActiveMs = logMs;
      userActivityMap.set(email, existing);
    }
  });

  // 3. 7-Day Sparkline / Timeline (Last 7 days including today)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(nowMs - i * 24 * 60 * 60 * 1000);
    const key = getLocalDayKey(d);
    const dayName = d.toLocaleDateString('he-IL', { weekday: 'narrow' });
    last7Days.push({
      key,
      dayName,
      dateShort: `${d.getDate()}/${d.getMonth() + 1}`,
      aiCount: 0,
      emailCount: 0
    });
  }

  const dayMap = new Map(last7Days.map((item) => [item.key, item]));
  (Array.isArray(aiLogs) ? aiLogs : []).forEach((log) => {
    const logMs = toTimestampMs(log.createdAt || log.timestamp || log.createdAtMs);
    const key = getLocalDayKey(new Date(logMs));
    if (dayMap.has(key)) {
      dayMap.get(key).aiCount += 1;
    }
  });
  (Array.isArray(emailLogs) ? emailLogs : []).forEach((log) => {
    const logMs = toTimestampMs(log.createdAtMs || log.createdAt || log.timestamp);
    const key = getLocalDayKey(new Date(logMs));
    if (dayMap.has(key)) {
      dayMap.get(key).emailCount += 1;
    }
  });

  // 4. Top Active Teachers Ranking
  const topActiveTeachers = Array.from(userActivityMap.values())
    .sort((a, b) => b.aiCount + b.emailCount - (a.aiCount + a.emailCount))
    .slice(0, 10);

  // 5. Storage Footprint
  const storage = calculateStorageFootprint(students);

  // 6. Cost Estimation
  const estimatedAiCostUsd = aiMonthCount * ESTIMATED_USD_PER_AI_QUERY;
  const estimatedAiCostIls = estimatedAiCostUsd * USD_TO_ILS_ESTIMATE;

  // 7. Security Anomaly & Threat Level
  const recentInjections = blockedInjections.filter((inj) => inj.createdAtMs >= oneDayAgoMs);
  const recentRateLimits = rateLimitEvents.filter((rl) => rl.createdAtMs >= oneDayAgoMs);

  let threatLevel = 'safe'; // 'safe' | 'warning' | 'critical'
  if (recentInjections.length >= 3 || recentRateLimits.length >= 5) {
    threatLevel = 'critical';
  } else if (recentInjections.length > 0 || recentRateLimits.length > 0) {
    threatLevel = 'warning';
  }

  // 8. Blaze Services Breakdown
  const blazeBreakdown = [
    {
      service: 'Google AI Studio / Gemini API',
      freeTier: '1,500 שאילתות / יום (חינם לחלוטין)',
      currentUsage: `${aiTodayCount} היום | ${aiMonthCount} החודש`,
      status: aiTodayCount <= DAILY_AI_QUOTA_LIMIT ? 'free' : 'billed',
      estimatedCostIls: aiTodayCount <= DAILY_AI_QUOTA_LIMIT ? '0.00 ₪ (במסגרת המכסה)' : `${estimatedAiCostIls} ₪`
    },
    {
      service: 'Firebase Cloud Functions v2',
      freeTier: '2,000,000 קריאות / חודש',
      currentUsage: `${aiMonthCount} קריאות`,
      status: 'free',
      estimatedCostIls: '0.00 ₪ (במסגרת המכסה)'
    },
    {
      service: 'Firebase Cloud Storage (תיקי אבחון)',
      freeTier: '5,120 MB (5 GB חינם)',
      currentUsage: `${storage.formattedMb} (${storage.totalFiles} קבצים)`,
      status: storage.usagePercent < 90 ? 'free' : 'warning',
      estimatedCostIls: storage.usagePercent < 100 ? '0.00 ₪ (במסגרת המכסה)' : 'חריגה אפשרית'
    },
    {
      service: 'Google Apps Script (מנוע מיילים ישיר)',
      freeTier: '100 מיילים / יום לכתובת Gmail',
      currentUsage: `${emailTodayCount} היום | ${emailMonthCount} החודש`,
      status: emailTodayCount <= DAILY_EMAIL_QUOTA_LIMIT ? 'free' : 'warning',
      estimatedCostIls: '0.00 ₪ (ללא תשלום)'
    },
    {
      service: 'Cloud Firestore (מסד נתונים)',
      freeTier: '50,000 קריאות / 20,000 כתיבות ביום',
      currentUsage: 'תעבורה פדגוגית שוטפת',
      status: 'free',
      estimatedCostIls: '0.00 ₪ (במסגרת המכסה)'
    }
  ];

  // 9. Proactive Anomaly & Spike Detection
  const anomalyReport = detectAbnormalSpikes({
    aiTodayCount,
    emailTodayCount,
    storage,
    topActiveTeachers,
    last7Days
  });

  return {
    nowMs,
    aiTodayCount,
    aiMonthCount,
    aiQuotaLimit: DAILY_AI_QUOTA_LIMIT,
    aiRemainingToday: Math.max(0, DAILY_AI_QUOTA_LIMIT - aiTodayCount),
    aiUsageRatio: Math.min(1, aiTodayCount / DAILY_AI_QUOTA_LIMIT),

    emailTodayCount,
    emailMonthCount,
    emailQuotaLimit: DAILY_EMAIL_QUOTA_LIMIT,
    emailRemainingToday: Math.max(0, DAILY_EMAIL_QUOTA_LIMIT - emailTodayCount),
    emailUsageRatio: Math.min(1, emailTodayCount / DAILY_EMAIL_QUOTA_LIMIT),

    storage,
    estimatedAiCostUsd: Number(estimatedAiCostUsd.toFixed(4)),
    estimatedAiCostIls: Number(estimatedAiCostIls.toFixed(2)),

    threatLevel,
    blockedInjections,
    recentInjectionsCount: recentInjections.length,
    rateLimitEvents,
    recentRateLimitsCount: recentRateLimits.length,
    geminiErrors,

    anomalyReport,

    last7Days,
    topActiveTeachers,
    blazeBreakdown,
    isAiFrozen: Boolean(settings?.aiFreeze)
  };
}

/**
 * Generates a clean CSV string of recent telemetry events for admin export.
 */
export function generateTelemetryCsv({ aiLogs = [], emailLogs = [] } = {}) {
  const rows = [['Type', 'Timestamp', 'UserEmail', 'Operation', 'Status', 'Details']];

  (Array.isArray(aiLogs) ? aiLogs : []).forEach((log) => {
    const ms = toTimestampMs(log.createdAt || log.timestamp || log.createdAtMs);
    const dateStr = ms ? new Date(ms).toISOString() : '';
    rows.push([
      'AI_QUERY',
      dateStr,
      log.email || '',
      log.operation || '',
      log.status || '',
      log.model || ''
    ]);
  });

  (Array.isArray(emailLogs) ? emailLogs : []).forEach((log) => {
    const ms = toTimestampMs(log.createdAtMs || log.createdAt || log.timestamp);
    const dateStr = ms ? new Date(ms).toISOString() : '';
    rows.push([
      'EMAIL_SENT',
      dateStr,
      log.userEmail || '',
      'send_email',
      'ok',
      log.recipientMasked || ''
    ]);
  });

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
}
