import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_TELEMETRY_SALT,
  PROHIBITED_KEYS,
  isProhibitedKey,
  scrubPiiFromString,
  sanitizeProperties,
  generateUuidV4,
  getSessionId,
  resetSessionId,
  generateCorrelationId,
  getAnonUserId,
  classifyAccount,
  isInternalAccount,
  sanitizeTelemetryPayload
} from '../domain/telemetryPrivacy.js';
import { TELEMETRY_EVENTS, TELEMETRY_CATEGORIES } from '../domain/telemetryTaxonomy.js';

describe('Zero-Trust Privacy Guard & Pseudonymization Engine (F3, F4, F6)', () => {
  describe('Tier 1: Prohibited Key Denylist & Verification', () => {
    it('contains all mandatory sensitive and PII property keys', () => {
      const keys = Array.from(PROHIBITED_KEYS);
      expect(keys).toContain('name');
      expect(keys).toContain('studentid');
      expect(keys).toContain('studentname');
      expect(keys).toContain('idnumber');
      expect(keys).toContain('teudatzehut');
      expect(keys).toContain('email');
      expect(keys).toContain('phone');
      expect(keys).toContain('parentname');
      expect(keys).toContain('parentphone');
      expect(keys).toContain('parentemail');
      expect(keys).toContain('teachername');
      expect(keys).toContain('notes');
      expect(keys).toContain('diagnosis');
      expect(keys).toContain('assessment');
      expect(keys).toContain('prompt');
      expect(keys).toContain('aiprompt');
      expect(keys).toContain('content');
      expect(keys).toContain('message');
      expect(keys).toContain('chatmessage');
      expect(keys).toContain('password');
      expect(keys).toContain('token');
      expect(keys).toContain('credential');
      expect(keys).toContain('birthdate');
    });

    it('identifies direct prohibited keys regardless of casing', () => {
      expect(isProhibitedKey('studentId')).toBe(true);
      expect(isProhibitedKey('STUDENTID')).toBe(true);
      expect(isProhibitedKey('TeudatZehut')).toBe(true);
      expect(isProhibitedKey('EMAIL')).toBe(true);
      expect(isProhibitedKey('ParentPhone')).toBe(true);
      expect(isProhibitedKey('notes')).toBe(true);
      expect(isProhibitedKey('AI_PROMPT')).toBe(true);
      expect(isProhibitedKey('password')).toBe(true);
      expect(isProhibitedKey('Token')).toBe(true);
    });

    it('identifies prohibited keys containing dashes, underscores, and dots', () => {
      expect(isProhibitedKey('student_id')).toBe(true);
      expect(isProhibitedKey('student-name')).toBe(true);
      expect(isProhibitedKey('parent.email')).toBe(true);
      expect(isProhibitedKey('id_number')).toBe(true);
      expect(isProhibitedKey('chat_message')).toBe(true);
    });

    it('identifies prohibited keys ending with sensitive suffixes', () => {
      expect(isProhibitedKey('customStudentId')).toBe(true);
      expect(isProhibitedKey('targetStudentName')).toBe(true);
      expect(isProhibitedKey('motherTeudatZehut')).toBe(true);
      expect(isProhibitedKey('emergencyParentPhone')).toBe(true);
      expect(isProhibitedKey('secondaryParentEmail')).toBe(true);
    });

    it('permits authorized, non-sensitive telemetry property keys', () => {
      expect(isProhibitedKey('mode')).toBe(false);
      expect(isProhibitedKey('durationSec')).toBe(false);
      expect(isProhibitedKey('isEdit')).toBe(false);
      expect(isProhibitedKey('streakDays')).toBe(false);
      expect(isProhibitedKey('format')).toBe(false);
      expect(isProhibitedKey('channel')).toBe(false);
      expect(isProhibitedKey('summaryType')).toBe(false);
      expect(isProhibitedKey('studentCountBand')).toBe(false);
      expect(isProhibitedKey('itemsCompletedCount')).toBe(false);
      expect(isProhibitedKey('isFullyReady')).toBe(false);
      expect(isProhibitedKey('toolType')).toBe(false);
      expect(isProhibitedKey('screen')).toBe(false);
      expect(isProhibitedKey('stepIndex')).toBe(false);
      expect(isProhibitedKey('errorType')).toBe(false);
      expect(isProhibitedKey('loadTimeMs')).toBe(false);
    });

    it('treats empty or invalid key types as prohibited for safety', () => {
      expect(isProhibitedKey('')).toBe(true);
      expect(isProhibitedKey(null)).toBe(true);
      expect(isProhibitedKey(undefined)).toBe(true);
      expect(isProhibitedKey(123)).toBe(true);
    });
  });

  describe('Tier 2: Multi-Pattern Regex Scrubber & String Sanitization', () => {
    it('scrubs 9-digit Israeli ID numbers from strings', () => {
      const raw = 'The record for ID 123456789 was updated';
      const scrubbed = scrubPiiFromString(raw);
      expect(scrubbed).toBe('The record for ID [REDACTED_ID] was updated');
      expect(scrubbed).not.toContain('123456789');
    });

    it('scrubs email addresses from strings', () => {
      const raw = 'Sent notification to teacher.sarah@school.k12.il successfully';
      const scrubbed = scrubPiiFromString(raw);
      expect(scrubbed).toBe('Sent notification to [REDACTED_EMAIL] successfully');
      expect(scrubbed).not.toContain('teacher.sarah@school.k12.il');
    });

    it('scrubs Israeli mobile phone numbers in multiple formats', () => {
      expect(scrubPiiFromString('Contact at 050-1234567')).toBe('Contact at [REDACTED_PHONE]');
      expect(scrubPiiFromString('Contact at 0527654321')).toBe('Contact at [REDACTED_PHONE]');
      expect(scrubPiiFromString('Contact at +972-54-1234567')).toBe('Contact at [REDACTED_PHONE]');
      expect(scrubPiiFromString('Landline: 03-1234567')).toBe('Landline: [REDACTED_PHONE]');
    });

    it('scrubs compound strings containing both email, phone, and ID', () => {
      const raw = 'Teacher test@tala.org called 050-1234567 about student 987654321';
      const scrubbed = scrubPiiFromString(raw);
      expect(scrubbed).toContain('[REDACTED_EMAIL]');
      expect(scrubbed).toContain('[REDACTED_PHONE]');
      expect(scrubbed).toContain('[REDACTED_ID]');
      expect(scrubbed).not.toContain('test@tala.org');
      expect(scrubbed).not.toContain('050-1234567');
      expect(scrubbed).not.toContain('987654321');
    });

    it('preserves clean Hebrew, English, and numeric text without PII', () => {
      const safe = 'מעקב יומי בוצע בהצלחה (משך: 120 שניות)';
      expect(scrubPiiFromString(safe)).toBe(safe);

      const safeEng = 'Step 3 of onboarding finished successfully in 45s';
      expect(scrubPiiFromString(safeEng)).toBe(safeEng);
    });

    it('returns empty string when non-string values are passed to scrubber', () => {
      expect(scrubPiiFromString(null)).toBe('');
      expect(scrubPiiFromString(undefined)).toBe('');
      expect(scrubPiiFromString(42)).toBe('');
      expect(scrubPiiFromString({})).toBe('');
    });
  });

  describe('Tier 2: Property Sanitization & Value Clamping', () => {
    it('drops prohibited keys unconditionally', () => {
      const raw = {
        mode: 'text',
        studentName: 'יוסי כהן',
        notes: 'הערה אישית על התלמיד',
        idNumber: '123456789',
        isEdit: true
      };
      const clean = sanitizeProperties(raw);
      expect(clean).toEqual({
        mode: 'text',
        isEdit: true
      });
      expect(clean.studentName).toBeUndefined();
      expect(clean.notes).toBeUndefined();
      expect(clean.idNumber).toBeUndefined();
    });

    it('drops nested objects, arrays, functions, and symbols', () => {
      const raw = {
        mode: 'voice',
        nestedObject: { studentId: 's123', secret: 'abc' },
        recordsArray: [1, 2, 3],
        callbackFn: () => 'leak',
        symbolProp: Symbol('secret')
      };
      const clean = sanitizeProperties(raw);
      expect(clean).toEqual({ mode: 'voice' });
      expect(clean.nestedObject).toBeUndefined();
      expect(clean.recordsArray).toBeUndefined();
      expect(clean.callbackFn).toBeUndefined();
      expect(clean.symbolProp).toBeUndefined();
    });

    it('clamps strings to a maximum of 100 characters', () => {
      const longString = 'A'.repeat(250);
      const raw = { feature: longString };
      const clean = sanitizeProperties(raw);
      expect(clean.feature.length).toBe(100);
      expect(clean.feature).toBe('A'.repeat(100));
    });

    it('scrubs PII before clamping strings', () => {
      const raw = {
        context: 'User email is sensitive_user_account_name_very_long@domain.co.il'
      };
      const clean = sanitizeProperties(raw);
      expect(clean.context).toContain('[REDACTED_EMAIL]');
      expect(clean.context.length).toBeLessThanOrEqual(100);
    });

    it('preserves finite numbers and drops NaN or Infinity', () => {
      const raw = {
        durationSec: 45,
        ratio: 0.75,
        badNan: NaN,
        badInf: Infinity,
        badNegInf: -Infinity
      };
      const clean = sanitizeProperties(raw);
      expect(clean.durationSec).toBe(45);
      expect(clean.ratio).toBe(0.75);
      expect(clean.badNan).toBeUndefined();
      expect(clean.badInf).toBeUndefined();
      expect(clean.badNegInf).toBeUndefined();
    });

    it('preserves boolean properties intact', () => {
      const raw = { isEdit: true, isFullyReady: false };
      const clean = sanitizeProperties(raw);
      expect(clean.isEdit).toBe(true);
      expect(clean.isFullyReady).toBe(false);
    });

    it('drops null and undefined values', () => {
      const raw = { valid: 'ok', missing: undefined, empty: null };
      const clean = sanitizeProperties(raw);
      expect(clean).toEqual({ valid: 'ok' });
    });

    it('returns empty object when non-object is passed', () => {
      expect(sanitizeProperties(null)).toEqual({});
      expect(sanitizeProperties(undefined)).toEqual({});
      expect(sanitizeProperties('string')).toEqual({});
      expect(sanitizeProperties([1, 2])).toEqual({});
      expect(sanitizeProperties(123)).toEqual({});
    });
  });

  describe('Tier 1 & Tier 2: Pseudonymization Engine (F4)', () => {
    it('generates valid RFC4122 v4 UUIDs', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const uuid1 = generateUuidV4();
      const uuid2 = generateUuidV4();

      expect(uuid1).toMatch(uuidRegex);
      expect(uuid2).toMatch(uuidRegex);
      expect(uuid1).not.toBe(uuid2);
    });

    it('provides a persistent session ID and supports explicit reset', () => {
      const session1 = getSessionId();
      expect(session1).toBeDefined();
      expect(getSessionId()).toBe(session1);

      const session2 = resetSessionId();
      expect(session2).not.toBe(session1);
      expect(getSessionId()).toBe(session2);
    });

    it('generates unique workflow correlation IDs on demand', () => {
      const corr1 = generateCorrelationId();
      const corr2 = generateCorrelationId();
      expect(corr1).not.toBe(corr2);
      expect(corr1).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('generates deterministic 64-char lowercase hex anonUserId', () => {
      const email = 'teacher.dan@school.k12.il';
      const hash1 = getAnonUserId(email);
      const hash2 = getAnonUserId(email);

      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toContain('dan');
      expect(hash1).not.toContain('school');
    });

    it('generates different hashes for different user identifiers', () => {
      const hashA = getAnonUserId('teacherA@school.k12.il');
      const hashB = getAnonUserId('teacherB@school.k12.il');
      expect(hashA).not.toBe(hashB);
    });

    it('generates different hashes when a custom salt is used', () => {
      const email = 'teacher@school.org';
      const hashDefault = getAnonUserId(email, DEFAULT_TELEMETRY_SALT);
      const hashCustom = getAnonUserId(email, 'custom_school_district_salt_2026');
      expect(hashDefault).not.toBe(hashCustom);
    });

    it('handles empty or null user identifiers by hashing fallback "anonymous"', () => {
      const hashNull = getAnonUserId(null);
      const hashEmpty = getAnonUserId('');
      const hashUndefined = getAnonUserId(undefined);

      expect(hashNull).toMatch(/^[0-9a-f]{64}$/);
      expect(hashNull).toBe(hashEmpty);
      expect(hashNull).toBe(hashUndefined);
    });
  });

  describe('Tier 1 & Tier 2: Account Classification & Test Segregation (F6)', () => {
    it('classifies regular school teachers as "teacher"', () => {
      expect(classifyAccount({ email: 'sarah.levi@school.k12.il' })).toBe('teacher');
      expect(classifyAccount({ email: 'teacher@gmail.com', role: 'teacher' })).toBe('teacher');
      expect(classifyAccount('teacher@school.org')).toBe('teacher');
      expect(classifyAccount(null)).toBe('teacher');
    });

    it('classifies administrative accounts as "admin"', () => {
      expect(classifyAccount({ email: 'admin@tala.education' })).toBe('admin');
      expect(classifyAccount({ role: 'admin' })).toBe('admin');
      expect(classifyAccount({ isAdmin: true, email: 'coordinator@school.org' })).toBe('admin');
    });

    it('classifies internal test accounts and test runners as "internal_test"', () => {
      expect(classifyAccount({ email: 'automated_test@tala.org' })).toBe('internal_test');
      expect(classifyAccount({ email: 'challenger_suite@tala.org' })).toBe('internal_test');
      expect(classifyAccount({ email: 'qa_agent@test.local' })).toBe('internal_test');
      expect(classifyAccount({ email: 'mock_user@example.com' })).toBe('internal_test');
      expect(classifyAccount({ isTest: true })).toBe('internal_test');
      expect(classifyAccount({ isInternalTest: true })).toBe('internal_test');
    });

    it('classifies demo accounts as "demo"', () => {
      expect(classifyAccount({ isDemo: true })).toBe('demo');
      expect(classifyAccount({ email: 'demo@tala.education' })).toBe('demo');
      expect(classifyAccount({ email: 'demo_user@school.org' })).toBe('demo');
    });

    it('correctly identifies internal accounts via isInternalAccount', () => {
      expect(isInternalAccount('admin')).toBe(true);
      expect(isInternalAccount('internal_test')).toBe(true);
      expect(isInternalAccount('demo')).toBe(true);
      expect(isInternalAccount('teacher')).toBe(false);
      expect(isInternalAccount('unknown')).toBe(false);
    });
  });

  describe('Tier 3 & Tier 4: End-to-End 5-Tier Sanitization Pipeline & Adversarial Assault', () => {
    it('returns null if the event name is not in the taxonomy (Tier 1 rejection)', () => {
      const payload = sanitizeTelemetryPayload('malicious_or_unknown_event', { mode: 'text' });
      expect(payload).toBeNull();
    });

    it('constructs a complete, valid sanitized envelope for valid events', () => {
      const userContext = { email: 'teacher@school.k12.il' };
      const rawProps = {
        mode: 'voice',
        durationSec: 65,
        isEdit: false,
        streakDays: 4
      };

      const result = sanitizeTelemetryPayload(
        TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
        rawProps,
        userContext
      );

      expect(result).not.toBeNull();
      expect(result.eventName).toBe('daily_tracking_entry_completed');
      expect(result.category).toBe(TELEMETRY_CATEGORIES.DAILY_TRACKING);
      expect(result.eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.anonUserId).toMatch(/^[0-9a-f]{64}$/);
      expect(result.accountType).toBe('teacher');
      expect(result.properties).toEqual({
        mode: 'voice',
        durationSec: 65,
        isEdit: false,
        streakDays: 4
      });
      expect(result.timestampMs).toBeGreaterThan(0);
    });

    it('Scenario S6: Aggressive PII Ingestion Assault (Zero-PII guarantee)', () => {
      const toxicPayload = {
        // Forbidden direct keys
        name: 'דניאל כהן',
        studentName: 'דניאל כהן',
        studentId: 'st_998877',
        idNumber: '032145678',
        teudatZehut: '032145678',
        notes: 'התלמיד מאובחן עם הפרעת קשב וריכוז ADHD ונוטל תרופות',
        diagnosis: 'ADHD',
        assessment: 'רמה נמוכה בהבנת הנקרא',
        prompt: 'Generate an IEP report for Daniel who has ADHD and struggles with reading',
        chatMessage: 'שלום, איך לנסח יעד לתלמיד דניאל כהן?',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        parentName: 'רחל כהן',
        parentPhone: '054-9876543',
        parentEmail: 'rachel.cohen@gmail.com',

        // Safe metadata with embedded PII
        triggerSource: 'floating_dock',
        summaryType: 'staff_meeting',
        dirtyExitNote: 'Teacher contact is teacher.dan@school.gov.il, phone 052-1112233, id 112233445',

        // Complex nested structures
        studentDossier: {
          medicalNotes: 'רגישות לחלב',
          fileAttachment: 'c:/docs/student_eval.pdf'
        },
        actions: ['call_parent', 'schedule_meeting']
      };

      const userContext = { email: 'special_ed_teacher@school.k12.il', role: 'teacher' };

      const sanitized = sanitizeTelemetryPayload(
        TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED,
        toxicPayload,
        userContext
      );

      expect(sanitized).not.toBeNull();

      // 1. Check prohibited keys are dropped
      expect(sanitized.properties.name).toBeUndefined();
      expect(sanitized.properties.studentName).toBeUndefined();
      expect(sanitized.properties.studentId).toBeUndefined();
      expect(sanitized.properties.idNumber).toBeUndefined();
      expect(sanitized.properties.teudatZehut).toBeUndefined();
      expect(sanitized.properties.notes).toBeUndefined();
      expect(sanitized.properties.diagnosis).toBeUndefined();
      expect(sanitized.properties.assessment).toBeUndefined();
      expect(sanitized.properties.prompt).toBeUndefined();
      expect(sanitized.properties.chatMessage).toBeUndefined();
      expect(sanitized.properties.password).toBeUndefined();
      expect(sanitized.properties.token).toBeUndefined();
      expect(sanitized.properties.parentName).toBeUndefined();
      expect(sanitized.properties.parentPhone).toBeUndefined();
      expect(sanitized.properties.parentEmail).toBeUndefined();
      expect(sanitized.properties.studentDossier).toBeUndefined();
      expect(sanitized.properties.actions).toBeUndefined();

      // 2. Check embedded PII in dirtyExitNote was scrubbed
      expect(sanitized.properties.dirtyExitNote).not.toContain('teacher.dan@school.gov.il');
      expect(sanitized.properties.dirtyExitNote).not.toContain('052-1112233');
      expect(sanitized.properties.dirtyExitNote).not.toContain('112233445');
      expect(sanitized.properties.dirtyExitNote).toContain('[REDACTED_EMAIL]');
      expect(sanitized.properties.dirtyExitNote).toContain('[REDACTED_PHONE]');
      expect(sanitized.properties.dirtyExitNote).toContain('[REDACTED_ID]');

      // 3. Check allowed metadata was preserved
      expect(sanitized.properties.triggerSource).toBe('floating_dock');
      expect(sanitized.properties.summaryType).toBe('staff_meeting');

      // 4. Check user context was pseudonymized
      expect(sanitized.anonUserId).not.toContain('special_ed_teacher');
      expect(sanitized.anonUserId).not.toContain('school.k12.il');
      expect(sanitized.anonUserId).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
