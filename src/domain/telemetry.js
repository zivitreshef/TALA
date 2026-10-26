/**
 * Telemetry, Cost & Security Calculation Domain
 * Pure, deterministic functions for computing AI & email usage, cloud storage footprint,
 * cost estimations, and security anomaly threat levels.
 */

export const DAILY_AI_QUOTA_LIMIT = 1500;
export const DAILY_EMAIL_QUOTA_LIMIT = 100;
export const FREE_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB Firebase Storage free tier

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
 */
export function calculateStorageFootprint(students = []) {
  if (!Array.isArray(students)) return { totalFiles: 0, totalBytes: 0, formattedMb: '0.0 MB', usagePercent: 0 };

  let totalFiles = 0;
  let totalBytes = 0;

  students.forEach((student) => {
    const docs = student?.diagnosticDossier?.documents;
    if (Array.isArray(docs)) {
      docs.forEach((doc) => {
        if (doc && (doc.storagePath || doc.storageUrl)) {
          totalFiles += 1;
          totalBytes += Number(doc.fileSize) || 0;
        }
      });
    }
  });

  const totalMb = totalBytes / (1024 * 1024);
  const formattedMb = totalMb < 100 ? totalMb.toFixed(1) + ' MB' : Math.round(totalMb) + ' MB';
  const usagePercent = Math.min(100, (totalBytes / FREE_STORAGE_LIMIT_BYTES) * 100);

  return {
    totalFiles,
    totalBytes,
    formattedMb,
    usagePercent: Number(usagePercent.toFixed(2))
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
  let threatLevel = 'safe'; // 'safe' | 'warning' | 'critical'
  if (recentInjections.length >= 3) {
    threatLevel = 'critical';
  } else if (recentInjections.length > 0) {
    threatLevel = 'warning';
  }

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
    geminiErrors,

    last7Days,
    topActiveTeachers,
    isAiFrozen: Boolean(settings?.aiFreeze)
  };
}
