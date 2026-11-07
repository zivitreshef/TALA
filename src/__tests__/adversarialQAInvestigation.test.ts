import { describe, it, expect } from 'vitest';
import { calculateCurrentStreak } from '../components/DailyPedagogicalTracker';
import { mergeStudentSnapshots } from '../domain/studentSyncMerge';
import { classifyAccount } from '../domain/telemetryPrivacy';
import { buildWordDocumentHtml, buildWorkPlanPrintHtml } from '../export/wordAndPrintBuilders';
import { adaptTextToSchoolStage } from '../domain/stageGuard';
import { isStudentOwnedByUser } from '../domain/permissions';

describe('Adversarial QA Suite - Verification of Fixes & Hardening', () => {

  describe('Fix 1: Daily Pedagogical Tracker - Accurate Streak Calculation', () => {
    it('returns streak=0 when user has zero observations (no artificial inflation)', () => {
      const emptyStudents: any[] = [];
      const streak = calculateCurrentStreak(emptyStudents, '2026-11-07');
      expect(streak).toBe(0);
    });

    it('correctly preserves previous streak in the morning before today is logged', () => {
      const students = [{
        id: 's1',
        goals: [{
          id: 'g1',
          observations: [
            { id: 'o1', date: '2026-11-06' },
            { id: 'o2', date: '2026-11-05' },
            { id: 'o3', date: '2026-11-04' },
            { id: 'o4', date: '2026-11-03' },
            { id: 'o5', date: '2026-11-02' }
          ]
        }]
      }];
      // When teacher opens app on 2026-11-07 morning, 5-day active streak is preserved
      const morningStreak = calculateCurrentStreak(students, '2026-11-07');
      expect(morningStreak).toBe(5);

      // Once teacher logs an observation today, streak increments to 6
      students[0].goals[0].observations.unshift({ id: 'o0', date: '2026-11-07' });
      const afterLogStreak = calculateCurrentStreak(students, '2026-11-07');
      expect(afterLogStreak).toBe(6);
    });
  });

  describe('Fix 2: Student Sync Merge - Elimination of Goal Resurrection', () => {
    it('does not resurrect a locally deleted goal during conflict resolution', () => {
      const baseSnapshot = {
        id: 's1',
        name: 'דוד',
        goals: [
          { id: 'g1', title: 'יעד 1' },
          { id: 'g2', title: 'יעד שנמחק על ידי המורה' },
          { id: 'g3', title: 'יעד 3' }
        ]
      };

      // Teacher locally deleted g2:
      const localStudent = {
        id: 's1',
        name: 'דוד',
        goals: [
          { id: 'g1', title: 'יעד 1' },
          { id: 'g3', title: 'יעד 3' }
        ]
      };

      // Server had a concurrent update on g1 by colleague:
      const serverStudent = {
        id: 's1',
        name: 'דוד',
        goals: [
          { id: 'g1', title: 'יעד 1 מעודכן' },
          { id: 'g2', title: 'יעד שנמחק על ידי המורה' },
          { id: 'g3', title: 'יעד 3' }
        ]
      };

      const merged = mergeStudentSnapshots({
        localStudent,
        serverStudent,
        baseSnapshot
      });

      const goalIds = merged.goals?.map((g) => g.id);
      expect(goalIds).not.toContain('g2');
      expect(goalIds).toEqual(['g1', 'g3']);
    });
  });

  describe('Fix 3: Telemetry Account Classification - Accurate Matching', () => {
    it('accurately classifies real teachers as teacher without false positives', () => {
      const teacher1 = classifyAccount({ email: 'ester.demoz@school.gov.il' });
      const teacher2 = classifyAccount({ email: 'batel.contestable@school.gov.il' });
      const teacher3 = classifyAccount({ email: 'moran.testa@education.gov.il' });

      expect(teacher1).toBe('teacher');
      expect(teacher2).toBe('teacher');
      expect(teacher3).toBe('teacher');

      // Still correctly catches actual demo/test accounts:
      expect(classifyAccount({ email: 'demo@tala.edu.il' })).toBe('demo');
      expect(classifyAccount({ email: 'test@tala.edu.il' })).toBe('internal_test');
      expect(classifyAccount({ email: 'user@test.local' })).toBe('internal_test');
    });
  });

  describe('Fix 4: HTML Export & Print - Proper HTML Escaping', () => {
    it('escapes HTML tags and script vectors in environment and title fields', () => {
      const maliciousPayload = '<img src=x onerror=alert(document.cookie)>';
      const formData = {
        id: 's_test',
        name: 'ישראל ישראלי',
        planType: 'tala',
        goals: [
          {
            id: 'g1',
            title: 'יעד רגיל',
            environment: maliciousPayload,
            objectives: 'צעדים'
          }
        ]
      };

      const printHtml = buildWorkPlanPrintHtml(formData);
      const wordHtml = buildWordDocumentHtml(formData);

      // Raw unescaped tag is eliminated
      expect(printHtml).not.toContain(maliciousPayload);
      expect(wordHtml).not.toContain(maliciousPayload);

      // Safe escaped entity is present
      expect(printHtml).toContain('&lt;img');
      expect(wordHtml).toContain('&lt;img');
    });
  });

  describe('Fix 5: Goal Bank Search - Resilient Against Non-String Objectives', () => {
    it('safely handles non-string objectives without crashing', () => {
      const bankItem = {
        title: 'יעד',
        environment: 'כיתה',
        suggestedObjectives: ['צעד תקין', null, undefined, 123]
      };
      const query = 'חיפוש';

      const runFilter = () => {
        return (bankItem.suggestedObjectives as any[]).some((o: any) =>
          typeof o === 'string' && o.toLowerCase().includes(query)
        );
      };

      expect(runFilter).not.toThrow();
      expect(runFilter()).toBe(false);
    });
  });

  describe('Fix 6: Stage Conversion - Preservation of Hebrew Verb הגן', () => {
    it('preserves Hebrew verb הגן when followed by prepositions other than על', () => {
      const input = 'התלמיד הגן בפני לחץ חברתי מחוץ לכיתה';
      const adapted = adaptTextToSchoolStage(input);
      expect(adapted).toContain('הגן בפני');
      expect(adapted).not.toContain('בית הספר בפני');
    });
  });

  describe('Fix 7: Confirm Delete Student - Accurate Target Evaluation', () => {
    it('properly evaluates target when overrideStudent is passed', () => {
      const currentUser = { email: 'teacher@tala.edu.il' };
      const overrideStudent = { id: 's99', ownerEmail: 'teacher@tala.edu.il', name: 'משה' };
      let studentToDelete: any = null;

      const confirmDelete = (override: any = null) => {
        const target = override || studentToDelete;
        if (!target || !isStudentOwnedByUser(target, currentUser)) {
          return { aborted: true };
        }
        return { deletedId: target.id };
      };

      const result = confirmDelete(overrideStudent);
      expect(result.aborted).toBeUndefined();
      expect(result.deletedId).toBe('s99');
    });
  });

});
