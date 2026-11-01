import { describe, it, expect, beforeEach } from 'vitest';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: unknown) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear()
};
globalThis.localStorage = localStorageMock as unknown as Storage;

import {
  DEFAULT_SCHOOL_YEAR,
  DEFAULT_PLAN_TYPE,
  TACHI_PLAN_TYPE,
  getPlanTypeStorageKey,
  buildFreshReportForPlanType,
  extractYearReportFromFormData,
  isRawFreeTextAlreadyAnalyzed,
  hasContentInYearReport,
  normalizeStudentForForm,
  syncActiveReportSnapshot,
  type FormStudentInput
} from '../domain/yearReport';
import {
  DEFAULT_USER_PREFERENCES,
  normalizeEmailKey,
  getUserPreferencesStorageKey,
  normalizeUserPreferences,
  loadLocalUserPreferences,
  saveLocalUserPreferences,
  addPrivateGoal,
  removePrivateGoal,
  updatePrivateGoal,
  applyPreferencesToNewStudent,
  getBesadHeaderHtml,
  toHebrewGematria,
  formatHebrewCalendarDate,
  parseFlexibleDate,
  formatDateWithPreferences,
  makeSignatureBackgroundTransparent
} from '../domain/userPreferences';
import {
  LOCKED_EDITABLE_FIELDS,
  EVAL_GOAL_FIELDS,
  applyFieldChange,
  updateTalaProfileRow,
  toggleFocusDomain,
  applyGoalChange,
  toggleGoalAiLock,
  removeGoalRow,
  buildNewGoalRow,
  applyShareToggle,
  applyShareSettings,
  updateStatusSection,
  removeStatusSection,
  createTeamMessage,
  appendTeamMessage,
  retractTeamMessage,
  addManualStatusSection
} from '../domain/workPlanEdits';

describe('TypeScript Migration Phase 2 Batch 8 Gate', () => {
  describe('yearReport.ts', () => {
    it('generates correct plan type storage keys for tala and tachi', () => {
      expect(getPlanTypeStorageKey('2026', DEFAULT_PLAN_TYPE)).toBe('2026__tala');
      expect(getPlanTypeStorageKey('2026', TACHI_PLAN_TYPE)).toBe('2026__tachi');
      expect(getPlanTypeStorageKey(undefined, DEFAULT_PLAN_TYPE)).toBe(`${DEFAULT_SCHOOL_YEAR}__tala`);
    });

    it('builds a fresh empty report snapshot with default fields', () => {
      const fresh = buildFreshReportForPlanType(DEFAULT_PLAN_TYPE, 'school');
      expect(fresh.planType).toBe(DEFAULT_PLAN_TYPE);
      expect(fresh.isLocked).toBe(false);
      expect(fresh.goals).toEqual([]);
      expect(fresh.talaProfileRows.length).toBeGreaterThan(0);
      expect(fresh.removedAiGoals).toEqual([]);
    });

    it('extracts year report from form data and adapts goal gender', () => {
      const formData = {
        schoolYear: 'תשפ"ו',
        gender: 'girl',
        goals: [{ id: 'g1', title: 'ילמד לקרוא', objectives: 'יקרא' }]
      };
      const extracted = extractYearReportFromFormData(formData);
      expect(extracted.goals[0].title).toBe('תלמד לקרוא');
      expect(extracted.goals[0].objectives).toBe('תקרא');
    });

    it('identifies whether raw free text has already been analyzed', () => {
      expect(isRawFreeTextAlreadyAnalyzed({ freeTextAnalyzed: true })).toBe(true);
      expect(isRawFreeTextAlreadyAnalyzed({ teacherFreeText: 'ילד מתקשה', strengthsExisting: 'חברותי' })).toBe(true);
      expect(isRawFreeTextAlreadyAnalyzed({ teacherFreeText: 'ילד מתקשה' })).toBe(false);
      expect(isRawFreeTextAlreadyAnalyzed(null)).toBe(false);
    });

    it('checks for presence of content in year report', () => {
      expect(hasContentInYearReport(null)).toBe(false);
      expect(hasContentInYearReport({})).toBe(false);
      expect(hasContentInYearReport({ recommendations: 'המלצה' })).toBe(true);
      expect(hasContentInYearReport({ goals: [{ id: 'g1', title: 'מטרה' }] })).toBe(true);
    });

    it('normalizes student form data and syncs multi-year snapshots', () => {
      const rawStudent: FormStudentInput = {
        name: 'ישראל ישראלי',
        gender: 'boy',
        goals: [{ id: 'g1', title: 'מטרה ראשונה' }]
      };
      const normalized = normalizeStudentForForm(rawStudent);
      expect(normalized.schoolYear).toBe(DEFAULT_SCHOOL_YEAR);
      expect(normalized.planType).toBe(DEFAULT_PLAN_TYPE);
      expect(normalized.reportsByYear[DEFAULT_SCHOOL_YEAR]).toBeDefined();

      const synced = syncActiveReportSnapshot({ ...normalized, teacherFreeText: 'עדכון תוכן' });
      expect(synced.reportsByYear[DEFAULT_SCHOOL_YEAR].teacherFreeText).toBe('עדכון תוכן');
    });
  });

  describe('userPreferences.ts', () => {
    beforeEach(() => {
      localStorageMock.clear();
    });

    it('normalizes email keys and storage keys cleanly', () => {
      expect(normalizeEmailKey('Teacher.TALA+test@Edu.gov.il')).toBe('teacher.tala_test_edu.gov.il');
      expect(normalizeEmailKey('')).toBe('');
      expect(getUserPreferencesStorageKey('teacher@example.com')).toBe('tala_user_pref_v1_teacher@example.com');
    });

    it('normalizes user preferences enforcing bounds and valid options', () => {
      const raw = {
        defaultReportType: 'tachi',
        reportDateFormat: 'invalid_format',
        pedagogicalReminderMonthlyDay: 45, // invalid out of bounds
        aiWritingTone: 'empathetic',
        privateGoals: [{ text: '   ' }, { text: 'מטרה פרטית', domain: 'שפה' }]
      };
      const normalized = normalizeUserPreferences(raw);
      expect(normalized.defaultReportType).toBe('tachi');
      expect(normalized.reportDateFormat).toBe('both');
      expect(normalized.pedagogicalReminderMonthlyDay).toBe(1);
      expect(normalized.aiWritingTone).toBe('empathetic');
      expect(normalized.privateGoals).toHaveLength(1);
      expect(normalized.privateGoals[0].text).toBe('מטרה פרטית');
    });

    it('persists and loads local preferences from storage', () => {
      const email = 'teacher@tala.org';
      saveLocalUserPreferences(email, { fullName: 'מיכל כהן', showBesad: true });
      const loaded = loadLocalUserPreferences(email);
      expect(loaded.fullName).toBe('מיכל כהן');
      expect(loaded.showBesad).toBe(true);
      expect(getBesadHeaderHtml(loaded)).toContain('בס"ד');
    });

    it('manages private goals with add, update, and remove functions', () => {
      let prefs = DEFAULT_USER_PREFERENCES;
      prefs = addPrivateGoal(prefs, { text: 'חיזוק קשר עין', domain: 'תקשורת' });
      expect(prefs.privateGoals).toHaveLength(1);
      const goalId = prefs.privateGoals[0].id;

      prefs = updatePrivateGoal(prefs, goalId, { text: 'חיזוק קשר עין במפגש' });
      expect(prefs.privateGoals[0].text).toBe('חיזוק קשר עין במפגש');

      prefs = removePrivateGoal(prefs, goalId);
      expect(prefs.privateGoals).toHaveLength(0);
    });

    it('applies default preferences to newly created student', () => {
      const prefs = {
        defaultReportType: 'tachi' as const,
        defaultEducationalFramework: 'גן שפתי תות',
        fullName: 'שרה לוי'
      };
      const student = applyPreferencesToNewStudent<Record<string, unknown>>({}, prefs);
      expect(student.planType).toBe(TACHI_PLAN_TYPE);
      expect(student.educationalFramework).toBe('גן שפתי תות');
      expect(student.homeroomTeacher).toBe('שרה לוי');
      expect(student.integrationTeacher).toBe('שרה לוי');
    });

    it('formats Hebrew gematria and calendar dates accurately', () => {
      expect(toHebrewGematria(1)).toBe('א׳');
      expect(toHebrewGematria(15)).toBe('ט״ו');
      expect(toHebrewGematria(16)).toBe('ט״ז');
      expect(toHebrewGematria(18)).toBe('י״ח');

      const sampleDate = new Date(2026, 8, 15); // September 15, 2026
      const hebDate = formatHebrewCalendarDate(sampleDate);
      expect(hebDate).toBeDefined();

      const formatted = formatDateWithPreferences(sampleDate, 'gregorian');
      expect(formatted).toBe('15.09.2026');

      const parsed = parseFlexibleDate('2026-09-15');
      expect(parsed.getFullYear()).toBe(2026);
    });

    it('handles transparent signature processing gracefully in test env', () => {
      let resultUrl = '';
      makeSignatureBackgroundTransparent('data:image/png;base64,invalid', (url) => {
        resultUrl = url;
      });
      expect(resultUrl).toBe('data:image/png;base64,invalid');
    });
  });

  describe('workPlanEdits.ts', () => {
    it('exposes locked editable fields and eval goal sets', () => {
      expect(LOCKED_EDITABLE_FIELDS.has('statusReportSections')).toBe(true);
      expect(EVAL_GOAL_FIELDS.has('achievementStatus')).toBe(true);
    });

    it('applies field changes and explicit stage changes correctly', () => {
      const initial: FormStudentInput = { stage: 'school', teacherFreeText: 'ישן' };
      const updated = applyFieldChange(initial, 'stage', 'kindergarten');
      expect(updated.stage).toBe('kindergarten');
      expect(updated.stageSource).toBe('user_explicit');
      expect(updated.stageReason).toContain('גן ילדים');
    });

    it('updates tala profile row and toggles focus domain', () => {
      const initial: FormStudentInput = { talaFocusDomains: ['חברתי'] };
      const toggled1 = toggleFocusDomain(initial, 'שפתי');
      expect(toggled1.talaFocusDomains).toEqual(['חברתי', 'שפתי']);
      const toggled2 = toggleFocusDomain(toggled1, 'חברתי');
      expect(toggled2.talaFocusDomains).toEqual(['שפתי']);

      const withProfile = updateTalaProfileRow({}, 'תחום קוגניטיבי', 'strengths', 'זיכרון מעולה');
      expect(withProfile.talaProfileRows).toBeDefined();
    });

    it('manages goals, locks, and preserves removed goals snapshot', () => {
      const initial: FormStudentInput = {
        goals: [
          { id: 'g1', title: 'מטרה 1', objectives: 'יעד 1', isTeacherModified: false }
        ]
      };
      const modified = applyGoalChange(initial, 'g1', 'title', 'מטרה חדשה');
      expect(modified.goals[0].title).toBe('מטרה חדשה');
      expect(modified.goals[0].isTeacherModified).toBe(true);

      const locked = toggleGoalAiLock(modified, 'g1');
      expect(locked.goals[0].isTeacherModified).toBe(false);

      const removed = removeGoalRow(locked, 'g1');
      expect(removed.goals).toHaveLength(0);
      expect(removed.removedAiGoals).toHaveLength(1);
      expect(removed.removedAiGoals[0].title).toBe('מטרה חדשה');
    });

    it('creates, appends, and retracts team messages with sanitization', () => {
      const rawMsg = createTeamMessage({
        authorEmail: 'teacher@tala.org',
        authorName: 'מורה',
        text: 'שלום <script>alert("xss")</script><b>חברים</b>'
      });
      expect(rawMsg).not.toBeNull();
      expect(rawMsg?.text).toBe('שלום חברים');
      expect(rawMsg?.type).toBe('comment');

      const appended = appendTeamMessage({}, rawMsg);
      expect(appended.teamMessages).toHaveLength(1);

      const retracted = retractTeamMessage(appended, rawMsg!.id, 'teacher@tala.org');
      expect(retracted.teamMessages[0].isDeleted).toBe(true);
      expect(retracted.teamMessages[0].text).toContain('נמחקה');
    });

    it('enforces tenant boundaries when toggling or applying shares', () => {
      const allowedUsers = [
        { email: 'teacher1@matya.org', group: 'group_north' },
        { email: 'teacher2@matya.org', group: 'group_north' },
        { email: 'teacher3@other.org', group: 'group_south' }
      ];
      const actor = { email: 'teacher1@matya.org', group: 'group_north' };

      // Valid share in same group
      const resOk = applyShareToggle({}, 'teacher2@matya.org', actor, '2026-11-01', { allowedUsers });
      expect(resOk).not.toBeNull();
      expect(resOk?.cleanEmail).toBe('teacher2@matya.org');
      expect(resOk?.isNewlyShared).toBe(true);

      // Blocked share across tenant boundary
      const resBlocked = applyShareToggle({}, 'teacher3@other.org', actor, '2026-11-01', { allowedUsers });
      expect(resBlocked).toBeNull();
    });

    it('builds a new goal row and applies bulk share settings', () => {
      const newGoal = buildNewGoalRow({ id: 'g_new_1', stage: 'school', plus3Months: '01.02.2027' });
      expect(newGoal.id).toBe('g_new_1');
      expect(newGoal.duration).toContain('01.02.2027');

      const shareRes = applyShareSettings(
        { sharedWith: [], ownerEmail: 'teacher@school.org' },
        { selectedEmails: ['colleague@school.org'], handoffNote: 'נא לבדוק', actor: { email: 'teacher@school.org' } }
      );
      expect(shareRes).not.toBeNull();
      expect(shareRes?.newlyAdded).toEqual(['colleague@school.org']);
      expect(shareRes?.messageCreated).toBe(true);
    });

    it('updates, removes, and adds manual status report sections', () => {
      const initial: FormStudentInput = { statusReportSections: [] };
      const withSec = addManualStatusSection(initial, 1);
      expect(withSec.statusReportSections).toHaveLength(1);
      expect(withSec.statusReportSections[0].sectionNumber).toBe(1);

      const updated = updateStatusSection(withSec, 1, 'עדכון מצב שפתי');
      expect(updated.statusReportSections[0].content).toBe('עדכון מצב שפתי');

      const removed = removeStatusSection(updated, 1);
      expect(removed.statusReportSections).toHaveLength(0);
    });
  });
});
