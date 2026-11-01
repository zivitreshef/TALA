import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  toHebrewAcronym,
  maskSensitiveValue,
  redactStudentNameInText,
  maskPromptForAi,
  type StudentFormDataForPrivacy
} from '../domain/privacyAndAcronyms';
import {
  filterStudentsBySearch,
  sortStudentsByName,
  sortStudentsByFramework,
  groupStudentsByFramework,
  resolveBankTargetStudent,
  type StudentListItem
} from '../domain/studentListView';
import {
  buildSummaryTablePrompt,
  applyAiSummary,
  applyLocalSummary
} from '../domain/summaryTable';
import {
  isSurveyEligible,
  advanceUsageEntry,
  shouldPromptSurvey,
  patchUserByEmail,
  buildSurveySummaryNotes
} from '../domain/userEngagement';

describe('TypeScript Phase 2 Batch 4: Privacy, Lists, Summaries & Engagement', () => {
  describe('privacyAndAcronyms.ts', () => {
    it('escapes unsafe HTML characters to prevent XSS', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml(null)).toBe('');
    });

    it('generates Hebrew acronyms and masks sensitive values', () => {
      expect(toHebrewAcronym('דוד כהן')).toBe('ד.כ.');
      expect(toHebrewAcronym('יוסי')).toBe('י.');
      expect(toHebrewAcronym('')).toBe('א.א.');
      expect(maskSensitiveValue('123456789')).toBe('█████████');
    });

    it('redacts student names in text and masks known details before AI prompt dispatch', () => {
      const text = 'התלמיד דוד כהן מציג שיפור משמעותי';
      const redacted = redactStudentNameInText(text, 'דוד כהן');
      expect(redacted).toContain('ד.כ.');

      const formData: StudentFormDataForPrivacy = {
        name: 'דוד כהן',
        gender: 'boy',
        educationalFramework: 'בית ספר אלון',
        homeroomTeacher: 'רחל מורה'
      };
      const maskedPrompt = maskPromptForAi('דוד כהן לומד בבית ספר אלון עם רחל מורה (ת.ל: 01/01/2015)', formData);
      expect(maskedPrompt).not.toContain('דוד כהן');
      expect(maskedPrompt).not.toContain('01/01/2015');
      expect(maskedPrompt).toContain('המסגרת');
    });
  });

  describe('studentListView.ts', () => {
    const students: StudentListItem[] = [
      { id: 's2', name: 'בנימין', educationalFramework: 'גן שושן' },
      { id: 's1', name: 'אברהם', educationalFramework: 'בית ספר ארז' },
      { id: 's3', name: 'גדעון', educationalFramework: 'בית ספר ארז' }
    ];

    it('filters students by search query across name and framework', () => {
      const matchName = filterStudentsBySearch(students, 'אברהם');
      expect(matchName).toHaveLength(1);
      expect(matchName[0].id).toBe('s1');

      const matchFw = filterStudentsBySearch(students, 'ארז');
      expect(matchFw).toHaveLength(2);
    });

    it('sorts students by name and framework and groups them cleanly', () => {
      const sortedName = sortStudentsByName(students);
      expect(sortedName[0].name).toBe('אברהם');
      expect(sortedName[1].name).toBe('בנימין');

      const sortedFw = sortStudentsByFramework(students);
      expect(sortedFw[0].educationalFramework).toBe('בית ספר ארז');

      const grouped = groupStudentsByFramework(students);
      expect(grouped.length).toBeGreaterThanOrEqual(2);
    });

    it('resolves bank target student correctly with fallback hierarchy', () => {
      expect(resolveBankTargetStudent(students, 's2')?.name).toBe('בנימין');
      expect(resolveBankTargetStudent(students, null, 's3')?.name).toBe('גדעון');
      expect(resolveBankTargetStudent(students, null, null)?.id).toBe('s2');
      expect(resolveBankTargetStudent([], null, null)).toBeNull();
    });
  });

  describe('summaryTable.ts', () => {
    it('constructs AI summary prompt and applies AI and local summary payloads', () => {
      const prompt = buildSummaryTablePrompt({
        freeText: 'טקסט פדגוגי',
        goals: [{ title: 'מטרה 1', environment: 'כיתה' }],
        isKindergarten: false
      });
      expect(prompt).toContain('מומחה פדגוגי');
      expect(prompt).toContain('מטרה 1');

      const initialData = { strengthsExisting: 'קיים', studentMainGoal: '' };
      const applied = applyAiSummary(initialData, { studentMainGoal: 'מטרה ראשית חדשה' }, '12:00');
      expect(applied.studentMainGoal).toBe('מטרה ראשית חדשה');
      expect(applied.lastSavedAt).toBe('12:00');

      const localApplied = applyLocalSummary(initialData, { studentGeneralBackground: 'רקע' });
      expect(localApplied.studentGeneralBackground).toBe('רקע');
    });
  });

  describe('userEngagement.ts', () => {
    it('evaluates survey eligibility and session usage ticks', () => {
      expect(isSurveyEligible({ email: 'teacher@matya.org' })).toBe(true);
      expect(isSurveyEligible({ role: 'admin' })).toBe(false);
      expect(isSurveyEligible({ mustChangePassword: true })).toBe(false);

      const advanced = advanceUsageEntry({ activeSeconds: 60 });
      expect(advanced.activeSeconds).toBe(90);

      expect(shouldPromptSurvey(480, 0)).toBe(true);
      expect(shouldPromptSurvey(180, 1)).toBe(true);
      expect(shouldPromptSurvey(100, 0)).toBe(false);
    });

    it('patches user objects and builds survey summary notes', () => {
      const users = [{ email: 'user@test.com', active: true }];
      const patched = patchUserByEmail(users, 'user@test.com', { active: false });
      expect(patched[0].active).toBe(false);

      const notes = buildSurveySummaryNotes({
        ratings: { easeOfWebsite: 5, generateGoals: 4 },
        overallFeedback: 'מערכת מעולה'
      });
      expect(notes).toContain('קלות שימוש: 5/5');
      expect(notes).toContain('מטרות ו-AI: 4/5');
      expect(notes).toContain('משוב: מערכת מעולה');
    });
  });
});
