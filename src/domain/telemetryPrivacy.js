/**
 * TALA Zero-Trust Privacy Guard & Pseudonymization Engine
 * Enforces a strict 5-tier sanitization pipeline eliminating all student/teacher
 * PII, clinical diagnoses, teacher notes, and AI prompts before telemetry persistence.
 */

import { isValidEventName, getEventCategory } from './telemetryTaxonomy.js';
import { sha256Hex } from '../allowedUsers.js';

export const DEFAULT_TELEMETRY_SALT = 'tala_telemetry_salt_2026_v1';

/**
 * Exact prohibited property keys (case-insensitive normalized).
 * Any property matching these keys will be unconditionally dropped.
 */
export const PROHIBITED_KEYS = Object.freeze(new Set([
  'name',
  'idnumber',
  'notes',
  'prompt',
  'studentid',
  'email',
  'phone',
  'phonenumber',
  'address',
  'assessment',
  'diagnosis',
  'studentname',
  'teachername',
  'parentname',
  'childname',
  'fullname',
  'firstname',
  'lastname',
  'parentphone',
  'parentemail',
  'teacheremail',
  'teacherphone',
  'tz',
  'teudatzehut',
  'israeliid',
  'personalid',
  'note',
  'content',
  'message',
  'query',
  'comment',
  'response',
  'password',
  'token',
  'secret',
  'credential',
  'credentials',
  'medical',
  'clinical',
  'evaluation',
  'chatmessage',
  'chatcontent',
  'rawtext',
  'studenttext',
  'freeprompt',
  'userprompt',
  'aiprompt',
  'birthdate'
]));

/**
 * Checks whether a property key is prohibited.
 */
export function isProhibitedKey(key) {
  if (typeof key !== 'string' || !key) return true;

  // Non-ASCII check: telemetry property keys are strictly standard ASCII identifiers.
  // Prohibit Hebrew and any non-ASCII keys (Zero-Trust guarantee)
  if (/[^\x00-\x7F]/.test(key)) {
    const hebrewSensitive = ['שם', 'זהות', 'אבחון', 'הערה', 'הערות', 'מייל', 'טלפון', 'רפואי', 'קליני', 'ציון', 'תלמיד', 'הורה', 'דוח'];
    const cleanHebrew = key.replace(/[_\s-]/g, '');
    if (hebrewSensitive.some((term) => key.includes(term) || cleanHebrew.includes(term)) || /[^\x00-\x7F]/.test(key)) {
      return true;
    }
  }

  const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (PROHIBITED_KEYS.has(clean)) return true;

  // Compound keyword checks (clinical, medical, diagnosis, profile, assessment, evaluation, note, prompt)
  // Exception: 'dirtyexitnote' is an allowed UX friction telemetry property whose string content is scrubbed
  if (
    clean.includes('prompt') ||
    clean.includes('medical') ||
    clean.includes('clinical') ||
    clean.includes('diagnosis') ||
    clean.includes('profile') ||
    clean.includes('assessment') ||
    clean.includes('evaluation') ||
    (clean.includes('note') && clean !== 'dirtyexitnote')
  ) {
    return true;
  }

  // Suffix checks for compound keys
  if (
    clean === 'id' ||
    clean === 'userid' ||
    clean.endsWith('studentid') ||
    clean.endsWith('studentname') ||
    clean.endsWith('teachername') ||
    clean.endsWith('parentname') ||
    clean.endsWith('childname') ||
    clean.endsWith('fullname') ||
    clean.endsWith('idnumber') ||
    clean.endsWith('teudatzehut') ||
    clean.endsWith('parentphone') ||
    clean.endsWith('parentemail')
  ) {
    return true;
  }
  return false;
}

/**
 * Multi-pattern regex scrubber.
 * Sanitizes strings against Israeli IDs (9 digits), emails, and phone numbers.
 */
export function scrubPiiFromString(str) {
  if (typeof str !== 'string') return '';
  let result = str;

  // 1. Email addresses
  result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

  // 2. Israeli phone numbers (e.g. 050-1234567, +972-50-1234567, 03-1234567, 0541234567)
  result = result.replace(/(?:\+972[- ]?|0)(?:5[0-9]|[23489])[- ]?\d{3}[- ]?\d{4}\b/g, '[REDACTED_PHONE]');
  result = result.replace(/\b05\d[- ]?\d{7}\b/g, '[REDACTED_PHONE]');

  // 3. Israeli ID (9 consecutive digits, or separated formats: 8+1 or 3-3-3 with hyphens or spaces)
  result = result.replace(/(?<!\d)(?:\d{9}|\d{8}[- ]\d|\d{3}[- ]\d{3}[- ]\d{3})(?!\d)/g, '[REDACTED_ID]');

  return result;
}

/**
 * Tier 4 Sanitizer: Clamps and types properties.
 * - Drops prohibited keys
 * - Drops nested objects and arrays
 * - Clamps strings to max 100 characters after scrubbing PII
 * - Clamps numbers to finite values
 * - Retains booleans
 */
export function sanitizeProperties(rawProperties = {}) {
  if (!rawProperties || typeof rawProperties !== 'object' || Array.isArray(rawProperties)) {
    return {};
  }

  const sanitized = {};

  for (const [key, val] of Object.entries(rawProperties)) {
    if (!Object.prototype.hasOwnProperty.call(rawProperties, key)) continue;
    if (isProhibitedKey(key)) continue;
    if (val === undefined || val === null) continue;

    const valType = typeof val;

    // Drop functions, symbols, and objects (no nested structures)
    if (valType === 'function' || valType === 'symbol' || valType === 'object') {
      continue;
    }

    if (valType === 'boolean') {
      sanitized[key] = val;
    } else if (valType === 'number') {
      if (Number.isFinite(val)) {
        sanitized[key] = val;
      }
    } else if (valType === 'string') {
      const scrubbed = scrubPiiFromString(val);
      // Clamp to 100 characters max
      sanitized[key] = scrubbed.slice(0, 100);
    }
  }

  return sanitized;
}

/**
 * RFC4122-compliant UUID v4 generator with cryptographic fallback.
 */
export function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version 4 (0100) and variant (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Ephemeral session identifier cache (per browser tab lifetime).
 */
let currentSessionId = null;

export function getSessionId() {
  if (!currentSessionId) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = window.sessionStorage.getItem('tala_telemetry_session_id');
        if (stored) {
          currentSessionId = stored;
          return currentSessionId;
        }
      } catch {
        // Ignore storage access restrictions
      }
    }
    currentSessionId = generateUuidV4();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem('tala_telemetry_session_id', currentSessionId);
      } catch {
        // Ignore
      }
    }
  }
  return currentSessionId;
}

export function resetSessionId() {
  currentSessionId = generateUuidV4();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem('tala_telemetry_session_id', currentSessionId);
    } catch {
      // Ignore
    }
  }
  return currentSessionId;
}

/**
 * Generates an ephemeral workflow correlation ID.
 */
export function generateCorrelationId() {
  return generateUuidV4();
}

/**
 * Generates a deterministic salted SHA-256 hash for user pseudonymization.
 * Formula: TALA_ANON_USER_V1:${salt}:${userEmail || userId}
 */
export function getAnonUserId(userIdentifier, salt = DEFAULT_TELEMETRY_SALT) {
  const cleanId = (userIdentifier ? String(userIdentifier).trim().toLowerCase() : 'anonymous');
  const message = `TALA_ANON_USER_V1:${salt}:${cleanId}`;
  return sha256Hex(message);
}

/**
 * Classifies the user account into:
 * 'teacher' | 'admin' | 'internal_test' | 'demo'
 */
export function classifyAccount(userContext = {}) {
  if (!userContext) return 'teacher';

  const ctx = typeof userContext === 'string' ? { email: userContext } : userContext;

  if (ctx.accountType && ['teacher', 'admin', 'internal_test', 'demo'].includes(ctx.accountType)) {
    return ctx.accountType;
  }

  const role = (ctx.role || '').toLowerCase();
  const email = (ctx.email || '').toLowerCase().trim();

  // Demo account check
  if (ctx.isDemo || role === 'demo' || email.includes('demo') || email.startsWith('demo@')) {
    return 'demo';
  }

  // Admin account check
  if (
    role === 'admin' ||
    role === 'superadmin' ||
    ctx.isAdmin ||
    email.startsWith('admin@') ||
    email === 'admin@tala.education'
  ) {
    return 'admin';
  }

  // Internal test / automated runner check
  if (
    ctx.isTest ||
    ctx.isInternalTest ||
    role === 'test' ||
    email.includes('test') ||
    email.includes('challenger') ||
    email.endsWith('@test.local') ||
    email.endsWith('@example.com')
  ) {
    return 'internal_test';
  }

  return 'teacher';
}

/**
 * Checks whether the given accountType is an internal/non-standard user.
 */
export function isInternalAccount(accountType) {
  return accountType === 'admin' || accountType === 'internal_test' || accountType === 'demo';
}

/**
 * Sanitizes an incoming telemetry event payload through the 5-tier Zero-Trust pipeline.
 * Rejects invalid event names by returning null.
 */
export function sanitizeTelemetryPayload(eventName, rawProperties = {}, userContext = {}, customSalt) {
  // Tier 1: Taxonomy whitelist
  if (!isValidEventName(eventName)) {
    return null;
  }

  const category = getEventCategory(eventName);
  const ctx = typeof userContext === 'string' ? { email: userContext } : (userContext || {});
  const userIdentifier = ctx.email || ctx.userId || ctx.uid || '';
  const salt = customSalt || ctx.salt || DEFAULT_TELEMETRY_SALT;
  const anonUserId = getAnonUserId(userIdentifier, salt);
  const accountType = classifyAccount(ctx);

  // Tiers 2, 3, 4: Key denylist, regex scrubber, value clamping
  const sanitizedProps = sanitizeProperties(rawProperties);

  // Tier 5: Pseudonymized event envelope
  return {
    eventId: generateUuidV4(),
    eventName,
    category,
    anonUserId,
    sessionId: getSessionId(),
    accountType,
    appVersion: '2.4.20',
    properties: sanitizedProps,
    timestampMs: Date.now()
  };
}
