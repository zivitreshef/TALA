/**
 * TALA Telemetry Aggregator & Analytics Computation Engine
 * Pure analytics calculation routines for DAU/WAU/MAU, cohort retention,
 * deep Daily Tracking metrics, Staff Meeting Readiness, Document Sharing & Chat,
 * Feature Adoption, Onboarding Funnels, UX Friction, and Technical Health.
 */

import {
  TELEMETRY_CATEGORIES,
  TELEMETRY_EVENTS
} from './telemetryTaxonomy.js';

/**
 * Calculates percentile value from an array of numbers.
 *
 * @param {Array<number>} numbers - Raw numbers
 * @param {number} percentile - 0 to 100
 * @returns {number}
 */
export function calculatePercentile(numbers, percentile) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sorted = [...numbers].filter((n) => typeof n === 'number' && Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return Math.round(sorted[lower]);
  return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
}

/**
 * Computes active user metrics (DAU, WAU, MAU, stickiness ratio, trends).
 */
export function computeActiveUsers(events = [], nowMs = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const t24h = nowMs - dayMs;
  const t7d = nowMs - 7 * dayMs;
  const t30d = nowMs - 30 * dayMs;
  const t60d = nowMs - 60 * dayMs;

  const dauUsers = new Set();
  const wauUsers = new Set();
  const mauUsers = new Set();
  const prevMauUsers = new Set();

  let eventsIn30d = 0;

  for (const ev of events) {
    if (!ev || !ev.anonUserId) continue;
    const ts = ev.timestampMs || 0;

    if (ts >= t24h && ts <= nowMs) {
      dauUsers.add(ev.anonUserId);
    }
    if (ts >= t7d && ts <= nowMs) {
      wauUsers.add(ev.anonUserId);
    }
    if (ts >= t30d && ts <= nowMs) {
      mauUsers.add(ev.anonUserId);
      eventsIn30d++;
    } else if (ts >= t60d && ts < t30d) {
      prevMauUsers.add(ev.anonUserId);
    }
  }

  const dau = dauUsers.size;
  const wau = wauUsers.size;
  const mau = mauUsers.size;
  const prevMau = prevMauUsers.size;

  const dauMauRatio = mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0;
  const mauTrendPct = prevMau > 0 ? Math.round(((mau - prevMau) / prevMau) * 1000) / 10 : 0;
  const avgEventsPerActiveUser = mau > 0 ? Math.round((eventsIn30d / mau) * 10) / 10 : 0;

  return {
    dau,
    wau,
    mau,
    prevMau,
    dauMauRatio,
    mauTrendPct,
    eventsIn30d,
    avgEventsPerActiveUser
  };
}

/**
 * Computes weekly cohort retention matrix over the past 4 weeks.
 */
export function computeCohortRetention(events = [], nowMs = Date.now()) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const userFirstSeen = new Map();
  const userActivityByWeek = new Map();

  // Find first event timestamp for each user
  for (const ev of events) {
    if (!ev || !ev.anonUserId) continue;
    const ts = ev.timestampMs || 0;
    const currentFirst = userFirstSeen.get(ev.anonUserId);
    if (!currentFirst || ts < currentFirst) {
      userFirstSeen.set(ev.anonUserId, ts);
    }

    if (!userActivityByWeek.has(ev.anonUserId)) {
      userActivityByWeek.set(ev.anonUserId, new Set());
    }
    // Calculate week offset relative to now
    const weekIndex = Math.floor((nowMs - ts) / weekMs);
    if (weekIndex >= 0 && weekIndex <= 4) {
      userActivityByWeek.get(ev.anonUserId).add(weekIndex);
    }
  }

  // Build 4 weekly cohorts
  const cohorts = [];
  for (let w = 3; w >= 0; w--) {
    const cohortStart = nowMs - (w + 1) * weekMs;
    const cohortEnd = nowMs - w * weekMs;

    const cohortUsers = [];
    for (const [userId, firstSeen] of userFirstSeen.entries()) {
      if (firstSeen >= cohortStart && firstSeen < cohortEnd) {
        cohortUsers.push(userId);
      }
    }

    const size = cohortUsers.length;
    const cohortLabel = `מחזור שבוע ${4 - w}`;

    if (size === 0) {
      cohorts.push({
        cohort: cohortLabel,
        size: 0,
        week1: 100,
        week2: 0,
        week3: 0,
        week4: 0
      });
      continue;
    }

    // Measure retention for subsequent weeks
    const retW1 = 100;
    let retainedW2 = 0;
    let retainedW3 = 0;
    let retainedW4 = 0;

    for (const userId of cohortUsers) {
      const activeWeeks = userActivityByWeek.get(userId) || new Set();
      if (activeWeeks.has(w - 1)) retainedW2++;
      if (activeWeeks.has(w - 2)) retainedW3++;
      if (activeWeeks.has(w - 3)) retainedW4++;
    }

    cohorts.push({
      cohort: cohortLabel,
      size,
      week1: retW1,
      week2: Math.round((retainedW2 / size) * 100),
      week3: Math.round((retainedW3 / size) * 100),
      week4: Math.round((retainedW4 / size) * 100)
    });
  }

  return cohorts;
}

/**
 * Computes deep Daily Tracking metrics (streaks, voice vs text, edits vs creations, abandonment).
 */
export function computeDailyTrackingMetrics(events = []) {
  let started = 0;
  let completed = 0;
  let abandoned = 0;

  let voiceCount = 0;
  let textCount = 0;

  let creationCount = 0;
  let editCount = 0;

  const durations = [];
  const abandonTimes = [];
  const streaks = [];

  for (const ev of events) {
    if (!ev) continue;
    const name = ev.eventName;
    const props = ev.properties || {};

    if (name === TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED) {
      started++;
      if (props.mode === 'voice') voiceCount++;
      if (props.mode === 'text') textCount++;
      if (props.isEdit === true) editCount++;
      if (props.isEdit === false) creationCount++;
    } else if (name === TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED) {
      completed++;
      if (typeof props.durationSec === 'number' && props.durationSec > 0) {
        durations.push(props.durationSec);
      }
      if (typeof props.streakDays === 'number' && props.streakDays > 0) {
        streaks.push(props.streakDays);
      }
      if (props.mode === 'voice') voiceCount++;
      if (props.mode === 'text') textCount++;
      if (props.isEdit === true) editCount++;
      if (props.isEdit === false) creationCount++;
    } else if (name === TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED) {
      abandoned++;
      if (typeof props.timeSpentSec === 'number' && props.timeSpentSec > 0) {
        abandonTimes.push(props.timeSpentSec);
      }
    } else if (name === TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED) {
      if (typeof props.currentStreakDays === 'number' && props.currentStreakDays > 0) {
        streaks.push(props.currentStreakDays);
      }
    }
  }

  const effectiveStarts = Math.max(started, completed + abandoned);
  const completionRate = effectiveStarts > 0 ? Math.round((completed / effectiveStarts) * 1000) / 10 : 0;
  const abandonmentRate = effectiveStarts > 0 ? Math.round((abandoned / effectiveStarts) * 1000) / 10 : 0;

  const totalModes = voiceCount + textCount;
  const voicePct = totalModes > 0 ? Math.round((voiceCount / totalModes) * 1000) / 10 : 0;
  const textPct = totalModes > 0 ? Math.round((textCount / totalModes) * 1000) / 10 : 0;

  const totalTypes = creationCount + editCount;
  const creationPct = totalTypes > 0 ? Math.round((creationCount / totalTypes) * 1000) / 10 : 0;
  const editPct = totalTypes > 0 ? Math.round((editCount / totalTypes) * 1000) / 10 : 0;

  // Streak distribution
  let streak1To2 = 0;
  let streak3To5 = 0;
  let streak6To10 = 0;
  let streak10Plus = 0;

  for (const s of streaks) {
    if (s <= 2) streak1To2++;
    else if (s <= 5) streak3To5++;
    else if (s <= 10) streak6To10++;
    else streak10Plus++;
  }

  const streakTotal = streaks.length || 1;
  const streakDistribution = [
    { range: '1-2 ימים (מתחילים)', count: streak1To2, pct: Math.round((streak1To2 / streakTotal) * 100) },
    { range: '3-5 ימים (רצף שבועי)', count: streak3To5, pct: Math.round((streak3To5 / streakTotal) * 100) },
    { range: '6-10 ימים (עקביות גבוהה)', count: streak6To10, pct: Math.round((streak6To10 / streakTotal) * 100) },
    { range: '10+ ימים (אלופות מעקב)', count: streak10Plus, pct: Math.round((streak10Plus / streakTotal) * 100) }
  ];

  const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;
  const avgStreak = streaks.length > 0 ? Math.round((streaks.reduce((a, b) => a + b, 0) / streaks.length) * 10) / 10 : 0;

  const avgDurationSec = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const avgAbandonTimeSec = abandonTimes.length > 0 ? Math.round(abandonTimes.reduce((a, b) => a + b, 0) / abandonTimes.length) : 0;

  return {
    started: effectiveStarts,
    completed,
    abandoned,
    completionRate,
    abandonmentRate,
    voiceCount,
    textCount,
    voicePct,
    textPct,
    creationCount,
    editCount,
    creationPct,
    editPct,
    maxStreak,
    avgStreak,
    streakDistribution,
    avgDurationSec,
    avgAbandonTimeSec
  };
}

/**
 * Computes Pedagogical Summary & Staff Meeting Readiness metrics.
 */
export function computeStaffReadinessMetrics(events = [], totalActiveTeachers = 1) {
  let summariesGenerated = 0;
  let staffMeetingSummaries = 0;
  let periodicReviewSummaries = 0;

  let band1To5 = 0;
  let band6To15 = 0;
  let band16Plus = 0;

  const summaryUsers = new Set();

  let readinessChecksCount = 0;
  let fullyReadyCount = 0;
  const itemsCompletedList = [];

  for (const ev of events) {
    if (!ev) continue;
    const name = ev.eventName;
    const props = ev.properties || {};

    if (name === TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED) {
      summariesGenerated++;
      if (ev.anonUserId) summaryUsers.add(ev.anonUserId);

      if (props.summaryType === 'staff_meeting') staffMeetingSummaries++;
      else if (props.summaryType === 'periodic_review') periodicReviewSummaries++;

      if (props.studentCountBand === '1-5') band1To5++;
      else if (props.studentCountBand === '6-15') band6To15++;
      else if (props.studentCountBand === '16+') band16Plus++;
    } else if (name === TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED) {
      readinessChecksCount++;
      if (props.isFullyReady === true) fullyReadyCount++;
      if (typeof props.itemsCompletedCount === 'number') {
        itemsCompletedList.push(props.itemsCompletedCount);
      }
    }
  }

  const teacherAdoptionCount = summaryUsers.size;
  const teacherAdoptionRate = totalActiveTeachers > 0
    ? Math.round((teacherAdoptionCount / totalActiveTeachers) * 1000) / 10
    : 0;

  const fullyReadyRate = readinessChecksCount > 0
    ? Math.round((fullyReadyCount / readinessChecksCount) * 1000) / 10
    : 0;

  const avgItemsCompleted = itemsCompletedList.length > 0
    ? Math.round((itemsCompletedList.reduce((a, b) => a + b, 0) / itemsCompletedList.length) * 10) / 10
    : 0;

  return {
    summariesGenerated,
    staffMeetingSummaries,
    periodicReviewSummaries,
    band1To5,
    band6To15,
    band16Plus,
    teacherAdoptionCount,
    teacherAdoptionRate,
    readinessChecksCount,
    fullyReadyCount,
    fullyReadyRate,
    avgItemsCompleted
  };
}

/**
 * Computes Document Sharing & Pedagogical Chat metrics.
 */
export function computeSharingAndChatMetrics(events = []) {
  let totalDocsShared = 0;
  const formats = { pdf: 0, docx: 0, print: 0 };
  const channels = { download: 0, whatsapp_link: 0, email_link: 0 };

  let chatSessionsStarted = 0;
  let chatSessionsEnded = 0;
  const triggerSources = { floating_dock: 0, student_form: 0 };
  const sessionDurations = [];
  const sessionTurns = [];

  const toolDiscoveryCounts = {};

  for (const ev of events) {
    if (!ev) continue;
    const name = ev.eventName;
    const props = ev.properties || {};

    if (name === TELEMETRY_EVENTS.DOCUMENT_SHARED) {
      totalDocsShared++;
      if (props.format && formats[props.format] !== undefined) {
        formats[props.format]++;
      }
      if (props.channel && channels[props.channel] !== undefined) {
        channels[props.channel]++;
      }
    } else if (name === TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED) {
      chatSessionsStarted++;
      if (props.triggerSource && triggerSources[props.triggerSource] !== undefined) {
        triggerSources[props.triggerSource]++;
      }
    } else if (name === TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED) {
      chatSessionsEnded++;
      if (typeof props.durationSec === 'number' && props.durationSec > 0) {
        sessionDurations.push(props.durationSec);
      }
      if (typeof props.turnsCount === 'number' && props.turnsCount > 0) {
        sessionTurns.push(props.turnsCount);
      }
    } else if (name === TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED) {
      const tool = props.toolType || 'general_helper';
      toolDiscoveryCounts[tool] = (toolDiscoveryCounts[tool] || 0) + 1;
    }
  }

  const avgChatDurationSec = sessionDurations.length > 0
    ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
    : 0;

  const avgTurnsPerSession = sessionTurns.length > 0
    ? Math.round((sessionTurns.reduce((a, b) => a + b, 0) / sessionTurns.length) * 10) / 10
    : 0;

  return {
    totalDocsShared,
    formats,
    channels,
    chatSessionsStarted,
    chatSessionsEnded,
    triggerSources,
    avgChatDurationSec,
    avgTurnsPerSession,
    toolDiscoveryCounts
  };
}

/**
 * Computes feature adoption breakdown across all core modules.
 */
export function computeFeatureAdoption(events = []) {
  const moduleCounts = {
    'מעקב פדגוגי יומי': 0,
    'ניהול תלמידים ותוכניות': 0,
    'בנק יעדים ומטרות': 0,
    'הפקת דוחות ותעודות': 0,
    'קול ההורים והתלמיד': 0,
    'סיכומים ומוכנות לצוות': 0,
    'שיתוף מסמכים': 0,
    'צ׳אט פדגוגי': 0
  };

  for (const ev of events) {
    if (!ev) continue;
    const name = typeof ev.eventName === 'string' ? ev.eventName : '';
    if (!name) continue;

    if (name.startsWith('daily_tracking_')) {
      moduleCounts['מעקב פדגוגי יומי']++;
    } else if (name === TELEMETRY_EVENTS.STUDENT_CREATED || name === TELEMETRY_EVENTS.STUDENT_ARCHIVED) {
      moduleCounts['ניהול תלמידים ותוכניות']++;
    } else if (name === TELEMETRY_EVENTS.GOAL_CREATED || name === TELEMETRY_EVENTS.GOAL_UPDATED) {
      moduleCounts['בנק יעדים ומטרות']++;
    } else if (name === TELEMETRY_EVENTS.REPORT_GENERATED) {
      moduleCounts['הפקת דוחות ותעודות']++;
    } else if (name === TELEMETRY_EVENTS.PARENT_VOICE_LINK_CREATED) {
      moduleCounts['קול ההורים והתלמיד']++;
    } else if (name === TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED || name === TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED) {
      moduleCounts['סיכומים ומוכנות לצוות']++;
    } else if (name === TELEMETRY_EVENTS.DOCUMENT_SHARED) {
      moduleCounts['שיתוף מסמכים']++;
    } else if (name.startsWith('pedagogical_chat_')) {
      moduleCounts['צ׳אט פדגוגי']++;
    }
  }

  const total = Object.values(moduleCounts).reduce((a, b) => a + b, 0) || 1;
  const list = Object.entries(moduleCounts).map(([moduleName, count]) => ({
    name: moduleName,
    count,
    pct: Math.round((count / total) * 100)
  })).sort((a, b) => b.count - a.count);

  return {
    totalEvents: total,
    modules: list
  };
}

/**
 * Computes 10-step Onboarding Journey funnel and drop-off rates.
 */
export function computeOnboardingFunnel(events = []) {
  let started = 0;
  let completed = 0;
  let paused = 0;
  let dismissed = 0;

  const stepCounts = new Array(11).fill(0); // index 1 to 10

  for (const ev of events) {
    if (!ev) continue;
    const name = ev.eventName;
    const props = ev.properties || {};

    if (name === TELEMETRY_EVENTS.ONBOARDING_STARTED) started++;
    else if (name === TELEMETRY_EVENTS.ONBOARDING_COMPLETED) completed++;
    else if (name === TELEMETRY_EVENTS.ONBOARDING_PAUSED) paused++;
    else if (name === TELEMETRY_EVENTS.ONBOARDING_DISMISSED) dismissed++;
    else if (name === TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED) {
      const step = Number(props.stepNumber ?? props.step ?? props.stepIndex);
      if (step >= 1 && step <= 10) {
        stepCounts[step]++;
      }
    }
  }

  const baseCount = Math.max(started, stepCounts[1] || 0, completed);
  const completionRate = baseCount > 0 ? Math.round((completed / baseCount) * 1000) / 10 : 0;

  const stepNames = [
    '',
    'ברוכים הבאים והיכרות עם הממשק',
    'יצירת כרטיס תלמיד ראשון',
    'הגדרת רקע לימודי וסביבתי',
    'הזנת תחומי חוזק ואתגר',
    'בחירת מטרות מתוך בנק היעדים',
    'הוספת מדדי הצלחה אישיים',
    'התנסות במעקב פדגוגי יומי',
    'שילוב קול ההורים בשאלון',
    'הפקת תצוגה מקדימה לתל"א',
    'סיום והורדת מסמך רשמי'
  ];

  const steps = [];
  let prevCount = baseCount;

  for (let i = 1; i <= 10; i++) {
    const count = stepCounts[i] || (i === 10 ? completed : 0);
    const dropOffPct = prevCount > 0 ? Math.max(0, Math.round(((prevCount - count) / prevCount) * 100)) : 0;
    const conversionPct = baseCount > 0 ? Math.round((count / baseCount) * 100) : 0;

    steps.push({
      stepNumber: i,
      name: stepNames[i] || `שלב ${i}`,
      count,
      conversionPct,
      dropOffPct
    });

    prevCount = count;
  }

  return {
    started: baseCount,
    completed,
    paused,
    dismissed,
    completionRate,
    steps
  };
}

/**
 * Computes UX Friction Intelligence (dirty form exits, AI latency percentiles, error spikes).
 */
export function computeUxFrictionMetrics(events = []) {
  let dirtyExits = 0;
  let repeatedFailures = 0;
  let observationGaps = 0;
  let zeroResults = 0;

  const aiLatencies = [];

  for (const ev of events) {
    if (!ev) continue;
    const name = ev.eventName;
    const props = ev.properties || {};

    if (name === TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED) dirtyExits++;
    else if (name === TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY) repeatedFailures++;
    else if (name === TELEMETRY_EVENTS.OBSERVATION_GAP_DETECTED) observationGaps++;
    else if (name === TELEMETRY_EVENTS.SEARCH_ZERO_RESULTS) zeroResults++;
    else if (name === TELEMETRY_EVENTS.AI_LATENCY_RECORDED) {
      const lat = props.latencyMs ?? props.durationMs;
      if (typeof lat === 'number' && Number.isFinite(lat) && lat > 0) {
        aiLatencies.push(lat);
      }
    }
  }

  const p50 = calculatePercentile(aiLatencies, 50);
  const p90 = calculatePercentile(aiLatencies, 90);
  const p95 = calculatePercentile(aiLatencies, 95);
  const avgLatency = aiLatencies.length > 0
    ? Math.round(aiLatencies.reduce((a, b) => a + b, 0) / aiLatencies.length)
    : 0;

  let fastCount = 0; // < 1000ms
  let mediumCount = 0; // 1000ms - 3000ms
  let slowCount = 0; // > 3000ms

  for (const lat of aiLatencies) {
    if (lat < 1000) fastCount++;
    else if (lat <= 3000) mediumCount++;
    else slowCount++;
  }

  const totalLatencies = aiLatencies.length || 1;

  return {
    dirtyExits,
    repeatedFailures,
    observationGaps,
    zeroResults,
    aiLatenciesCount: aiLatencies.length,
    p50,
    p90,
    p95,
    avgLatency,
    fastPct: Math.round((fastCount / totalLatencies) * 100),
    mediumPct: Math.round((mediumCount / totalLatencies) * 100),
    slowPct: Math.round((slowCount / totalLatencies) * 100)
  };
}

/**
 * Computes Technical Health & Client exceptions.
 */
export function computeTechnicalHealthMetrics(events = []) {
  let jsErrorsCount = 0;
  let apiFailuresCount = 0;
  const loadTimes = [];

  const errorMessages = {};
  const devices = { desktop: 0, mobile: 0, tablet: 0 };
  const browsers = {};

  for (const ev of events) {
    if (!ev) continue;
    const name = ev.eventName;
    const props = ev.properties || {};

    if (name === TELEMETRY_EVENTS.CLIENT_JS_ERROR) {
      jsErrorsCount++;
      const msg = props.errorMessage || props.message || 'שגיאת ממשק לא מזוהה';
      errorMessages[msg] = (errorMessages[msg] || 0) + 1;
    } else if (name === TELEMETRY_EVENTS.API_OPERATION_FAILED) {
      apiFailuresCount++;
    } else if (name === TELEMETRY_EVENTS.PAGE_LOAD_RECORDED) {
      if (typeof props.loadTimeMs === 'number' && props.loadTimeMs > 0) {
        loadTimes.push(props.loadTimeMs);
      }
    }

    if (props.deviceCategory && devices[props.deviceCategory] !== undefined) {
      devices[props.deviceCategory]++;
    }
    if (props.browser) {
      browsers[props.browser] = (browsers[props.browser] || 0) + 1;
    }
  }

  const avgPageLoadMs = loadTimes.length > 0
    ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
    : 0;

  const topErrors = Object.entries(errorMessages)
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    jsErrorsCount,
    apiFailuresCount,
    avgPageLoadMs,
    topErrors,
    devices,
    browsers
  };
}

/**
 * Master aggregate function returning full analytics payload.
 *
 * @param {Array<object>} events - Raw telemetry events array
 * @param {object} [options]
 * @param {number} [options.nowMs] - Evaluation timestamp
 * @param {string} [options.timeRange] - Filter range ('24h' | '7d' | '30d' | '90d' | 'custom')
 * @returns {object} Comprehensive analytics summary
 */
export function computeTelemetryAnalytics(events = [], options = {}) {
  const nowMs = options.nowMs || Date.now();
  const timeRange = options.timeRange || '30d';

  const safeEvents = Array.isArray(events) ? events : [];

  const overview = computeActiveUsers(safeEvents, nowMs);
  const cohorts = computeCohortRetention(safeEvents, nowMs);
  const dailyTracking = computeDailyTrackingMetrics(safeEvents);
  const staffReadiness = computeStaffReadinessMetrics(safeEvents, overview.mau || 1);
  const sharingAndChat = computeSharingAndChatMetrics(safeEvents);
  const featureAdoption = computeFeatureAdoption(safeEvents);
  const userJourneys = computeOnboardingFunnel(safeEvents);
  const uxFriction = computeUxFrictionMetrics(safeEvents);
  const technicalHealth = computeTechnicalHealthMetrics(safeEvents);

  return {
    timeRange,
    totalEvents: safeEvents.length,
    generatedAt: new Date(nowMs).toISOString(),
    overview,
    cohorts,
    dailyTracking,
    staffReadiness,
    sharingAndChat,
    featureAdoption,
    userJourneys,
    uxFriction,
    technicalHealth
  };
}
