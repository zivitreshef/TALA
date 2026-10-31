/**
 * TALA Telemetry Event Taxonomy & Validation Domain
 * Defines centralized categories, event dictionaries, and property schemas
 * across engagement, pedagogical workflows, daily tracking, sharing/chat,
 * onboarding, friction, and technical health.
 */

export const CURRENT_APP_VERSION = '2.4.20';

export const TELEMETRY_CATEGORIES = Object.freeze({
  ENGAGEMENT: 'engagement',
  WORKFLOW: 'workflow',
  DAILY_TRACKING: 'daily_tracking',
  PEDAGOGICAL_SUMMARY: 'pedagogical_summary',
  SHARING_AND_CHAT: 'sharing_and_chat',
  ONBOARDING: 'onboarding',
  FRICTION: 'friction',
  TECHNICAL_HEALTH: 'technical_health'
});

export const TELEMETRY_EVENTS = Object.freeze({
  // Engagement
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  NAVIGATE_SCREEN: 'navigate_screen',
  FEATURE_VIEW: 'feature_view',

  // Workflows
  STUDENT_CREATED: 'student_created',
  STUDENT_ARCHIVED: 'student_archived',
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  REPORT_GENERATED: 'report_generated',
  PARENT_VOICE_LINK_CREATED: 'parent_voice_link_created',

  // Daily Pedagogical Tracking (Detailed)
  DAILY_TRACKING_ENTRY_STARTED: 'daily_tracking_entry_started',
  DAILY_TRACKING_ENTRY_COMPLETED: 'daily_tracking_entry_completed',
  DAILY_TRACKING_ENTRY_ABANDONED: 'daily_tracking_entry_abandoned',
  DAILY_TRACKING_STREAK_RECORDED: 'daily_tracking_streak_recorded',

  // Pedagogical Summary & Staff Meeting Readiness
  PEDAGOGICAL_SUMMARY_GENERATED: 'pedagogical_summary_generated',
  STAFF_MEETING_READINESS_CHECKED: 'staff_meeting_readiness_checked',

  // Document Sharing & Pedagogical Chat
  DOCUMENT_SHARED: 'document_shared',
  PEDAGOGICAL_CHAT_SESSION_STARTED: 'pedagogical_chat_session_started',
  PEDAGOGICAL_CHAT_TOOL_DISCOVERED: 'pedagogical_chat_tool_discovered',
  PEDAGOGICAL_CHAT_SESSION_ENDED: 'pedagogical_chat_session_ended',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_PAUSED: 'onboarding_paused',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_DISMISSED: 'onboarding_dismissed',

  // UX Friction
  FORM_DIRTY_ABANDONED: 'form_dirty_abandoned',
  ACTION_FAILED_REPEATEDLY: 'action_failed_repeatedly',
  OBSERVATION_GAP_DETECTED: 'observation_gap_detected',
  SEARCH_ZERO_RESULTS: 'search_zero_results',

  // Technical Health
  CLIENT_JS_ERROR: 'client_js_error',
  API_OPERATION_FAILED: 'api_operation_failed',
  AI_LATENCY_RECORDED: 'ai_latency_recorded',
  PAGE_LOAD_RECORDED: 'page_load_recorded'
});

export const EVENT_CATEGORY_MAP = Object.freeze({
  // Engagement
  [TELEMETRY_EVENTS.SESSION_START]: TELEMETRY_CATEGORIES.ENGAGEMENT,
  [TELEMETRY_EVENTS.SESSION_END]: TELEMETRY_CATEGORIES.ENGAGEMENT,
  [TELEMETRY_EVENTS.NAVIGATE_SCREEN]: TELEMETRY_CATEGORIES.ENGAGEMENT,
  [TELEMETRY_EVENTS.FEATURE_VIEW]: TELEMETRY_CATEGORIES.ENGAGEMENT,

  // Workflows
  [TELEMETRY_EVENTS.STUDENT_CREATED]: TELEMETRY_CATEGORIES.WORKFLOW,
  [TELEMETRY_EVENTS.STUDENT_ARCHIVED]: TELEMETRY_CATEGORIES.WORKFLOW,
  [TELEMETRY_EVENTS.GOAL_CREATED]: TELEMETRY_CATEGORIES.WORKFLOW,
  [TELEMETRY_EVENTS.GOAL_UPDATED]: TELEMETRY_CATEGORIES.WORKFLOW,
  [TELEMETRY_EVENTS.REPORT_GENERATED]: TELEMETRY_CATEGORIES.WORKFLOW,
  [TELEMETRY_EVENTS.PARENT_VOICE_LINK_CREATED]: TELEMETRY_CATEGORIES.WORKFLOW,

  // Daily Tracking
  [TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED]: TELEMETRY_CATEGORIES.DAILY_TRACKING,
  [TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED]: TELEMETRY_CATEGORIES.DAILY_TRACKING,
  [TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED]: TELEMETRY_CATEGORIES.DAILY_TRACKING,
  [TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED]: TELEMETRY_CATEGORIES.DAILY_TRACKING,

  // Pedagogical Summary & Staff Readiness
  [TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED]: TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY,
  [TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED]: TELEMETRY_CATEGORIES.PEDAGOGICAL_SUMMARY,

  // Sharing & Chat
  [TELEMETRY_EVENTS.DOCUMENT_SHARED]: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
  [TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED]: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
  [TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED]: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,
  [TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED]: TELEMETRY_CATEGORIES.SHARING_AND_CHAT,

  // Onboarding
  [TELEMETRY_EVENTS.ONBOARDING_STARTED]: TELEMETRY_CATEGORIES.ONBOARDING,
  [TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED]: TELEMETRY_CATEGORIES.ONBOARDING,
  [TELEMETRY_EVENTS.ONBOARDING_PAUSED]: TELEMETRY_CATEGORIES.ONBOARDING,
  [TELEMETRY_EVENTS.ONBOARDING_COMPLETED]: TELEMETRY_CATEGORIES.ONBOARDING,
  [TELEMETRY_EVENTS.ONBOARDING_DISMISSED]: TELEMETRY_CATEGORIES.ONBOARDING,

  // Friction
  [TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED]: TELEMETRY_CATEGORIES.FRICTION,
  [TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY]: TELEMETRY_CATEGORIES.FRICTION,
  [TELEMETRY_EVENTS.OBSERVATION_GAP_DETECTED]: TELEMETRY_CATEGORIES.FRICTION,
  [TELEMETRY_EVENTS.SEARCH_ZERO_RESULTS]: TELEMETRY_CATEGORIES.FRICTION,

  // Technical Health
  [TELEMETRY_EVENTS.CLIENT_JS_ERROR]: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH,
  [TELEMETRY_EVENTS.API_OPERATION_FAILED]: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH,
  [TELEMETRY_EVENTS.AI_LATENCY_RECORDED]: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH,
  [TELEMETRY_EVENTS.PAGE_LOAD_RECORDED]: TELEMETRY_CATEGORIES.TECHNICAL_HEALTH
});

/**
 * Property schemas defining expected types and constraints for key events.
 */
export const EVENT_SCHEMAS = Object.freeze({
  [TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED]: {
    mode: { type: 'string', enum: ['text', 'voice'] },
    isEdit: { type: 'boolean' }
  },
  [TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED]: {
    mode: { type: 'string', enum: ['text', 'voice'] },
    durationSec: { type: 'number', min: 0 },
    isEdit: { type: 'boolean' },
    streakDays: { type: 'number', min: 0 }
  },
  [TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED]: {
    mode: { type: 'string', enum: ['text', 'voice'] },
    timeSpentSec: { type: 'number', min: 0 }
  },
  [TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED]: {
    currentStreakDays: { type: 'number', min: 0 }
  },
  [TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED]: {
    summaryType: { type: 'string', enum: ['staff_meeting', 'periodic_review'] },
    studentCountBand: { type: 'string', enum: ['1-5', '6-15', '16+'] }
  },
  [TELEMETRY_EVENTS.STAFF_MEETING_READINESS_CHECKED]: {
    itemsCompletedCount: { type: 'number', min: 0 },
    isFullyReady: { type: 'boolean' }
  },
  [TELEMETRY_EVENTS.DOCUMENT_SHARED]: {
    format: { type: 'string', enum: ['pdf', 'docx', 'print'] },
    channel: { type: 'string', enum: ['download', 'whatsapp_link', 'email_link'] }
  },
  [TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED]: {
    triggerSource: { type: 'string', enum: ['floating_dock', 'student_form'] }
  },
  [TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_TOOL_DISCOVERED]: {
    toolType: { type: 'string', enum: ['goal_suggester', 'acronym_explainer', 'observation_assistant'] }
  },
  [TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_ENDED]: {
    durationSec: { type: 'number', min: 0 },
    turnsCount: { type: 'number', min: 0 }
  },
  [TELEMETRY_EVENTS.NAVIGATE_SCREEN]: {
    screen: { type: 'string' }
  },
  [TELEMETRY_EVENTS.FEATURE_VIEW]: {
    feature: { type: 'string' }
  },
  [TELEMETRY_EVENTS.ONBOARDING_STEP_COMPLETED]: {
    stepIndex: { type: 'number', min: 0 }
  },
  [TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED]: {
    formId: { type: 'string' }
  },
  [TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY]: {
    action: { type: 'string' },
    attemptCount: { type: 'number', min: 1 }
  },
  [TELEMETRY_EVENTS.CLIENT_JS_ERROR]: {
    errorType: { type: 'string' }
  },
  [TELEMETRY_EVENTS.API_OPERATION_FAILED]: {
    endpoint: { type: 'string' }
  },
  [TELEMETRY_EVENTS.AI_LATENCY_RECORDED]: {
    durationMs: { type: 'number', min: 0 }
  },
  [TELEMETRY_EVENTS.PAGE_LOAD_RECORDED]: {
    loadTimeMs: { type: 'number', min: 0 }
  }
});

/**
 * Check whether an event name belongs to the standardized taxonomy.
 */
export function isValidEventName(eventName) {
  if (typeof eventName !== 'string' || !eventName) return false;
  return Object.prototype.hasOwnProperty.call(EVENT_CATEGORY_MAP, eventName);
}

/**
 * Retrieve the category name for an event.
 */
export function getEventCategory(eventName) {
  if (!isValidEventName(eventName)) return null;
  return EVENT_CATEGORY_MAP[eventName] || null;
}

/**
 * Retrieve all event names mapped to a specific category.
 */
export function getEventsByCategory(category) {
  if (!category || typeof category !== 'string') return [];
  return Object.keys(EVENT_CATEGORY_MAP).filter((evt) => EVENT_CATEGORY_MAP[evt] === category);
}

/**
 * List all available telemetry categories.
 */
export function getAllCategories() {
  return Object.values(TELEMETRY_CATEGORIES);
}

/**
 * List all available telemetry event names.
 */
export function getAllEvents() {
  return Object.values(TELEMETRY_EVENTS);
}

/**
 * Validates properties against the event's defined schema (if any).
 * Returns { valid: boolean, errors: string[] }.
 */
export function validateEventProperties(eventName, properties = {}) {
  const errors = [];

  if (!isValidEventName(eventName)) {
    return {
      valid: false,
      errors: [`Unknown telemetry event name: "${eventName}"`]
    };
  }

  if (properties !== null && typeof properties !== 'object') {
    return {
      valid: false,
      errors: ['Event properties must be a valid plain object or omitted']
    };
  }

  if (Array.isArray(properties)) {
    return {
      valid: false,
      errors: ['Event properties cannot be an array']
    };
  }

  const schema = EVENT_SCHEMAS[eventName];
  if (!schema) {
    // No specific constraints for this event
    return { valid: true, errors: [] };
  }

  for (const [propKey, rules] of Object.entries(schema)) {
    if (Object.prototype.hasOwnProperty.call(properties, propKey)) {
      const val = properties[propKey];
      if (val === undefined || val === null) continue;

      if (rules.type && typeof val !== rules.type) {
        errors.push(`Property "${propKey}" expected type ${rules.type}, received ${typeof val}`);
        continue;
      }

      if (rules.enum && !rules.enum.includes(val)) {
        errors.push(`Property "${propKey}" value "${val}" is not in allowed list [${rules.enum.join(', ')}]`);
      }

      if (rules.type === 'number') {
        if (!Number.isFinite(val)) {
          errors.push(`Property "${propKey}" must be a finite number`);
        } else if (rules.min !== undefined && val < rules.min) {
          errors.push(`Property "${propKey}" must be >= ${rules.min}, received ${val}`);
        } else if (rules.max !== undefined && val > rules.max) {
          errors.push(`Property "${propKey}" must be <= ${rules.max}, received ${val}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
