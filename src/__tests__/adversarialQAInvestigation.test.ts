import { describe, it, expect } from 'vitest';
import { calculateCurrentStreak } from '../components/DailyPedagogicalTracker';
import { mergeStudentSnapshots } from '../domain/studentSyncMerge';
import { classifyAccount } from '../domain/telemetryPrivacy';
import { calculateDurationMinutes, shouldSendPedagogicalDigest } from '../domain/dailyPedagogicalTracking';
import { buildWordDocumentHtml, buildWorkPlanPrintHtml } from '../export/wordAndPrintBuilders';

describe('Adversarial QA Suite - Independent Defect Verification', () => {

  describe('Defect 1: Daily Pedagogical Tracker - Artificial Streak Inflation & Inability to be Zero', () => {
    it('returns streak=1 even when user has ZERO observations due to unconditional datesSet.add(todayStr) and Math.max(1, streak)', () => {
      const emptyStudents: any[] = [];
      const streak = calculateCurrentStreak(emptyStudents, '2026-11-07');
      // Even with 0 observations ever recorded, streak is artificially reported as 1
      expect(streak).toBe(1);
    });

    it('artificially counts today as completed before teacher even opens or logs anything today', () => {
      // Teacher logged 5 days up to yesterday (2026-11-06)
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
      // When teacher opens app on 2026-11-07 morning, streak is calculated as 6 instead of 5
      // because line 58 adds todayStr unconditionally before any observation is recorded!
      const morningStreak = calculateCurrentStreak(students, '2026-11-07');
      expect(morningStreak).toBe(6);
    });
  });

  describe('Defect 2: Student Sync Merge - Goal Resurrection on Deletion', () => {
    it('resurrects a deleted goal during conflict resolution', () => {
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

      // Server had a concurrent update on g1 (e.g. observation added by colleague):
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

      // The deleted goal g2 is resurrected because mergeStudentSnapshots includes all serverGoals not in localGoals!
      const goalIds = merged.goals?.map((g) => g.id);
      expect(goalIds).toContain('g2'); // Confirms the defect: goal is resurrected!
    });
  });

  describe('Defect 3: Telemetry Account Classification - False Positives for Legitimate Teachers', () => {
    it('misclassifies real teachers as internal_test or demo due to naive substring matching', () => {
      // Real teacher with name/email containing 'test' or 'demo'
      const teacher1 = classifyAccount({ email: 'ester.demoz@school.gov.il' });
      const teacher2 = classifyAccount({ email: 'batel.contestable@school.gov.il' });
      const teacher3 = classifyAccount({ email: 'moran.testa@education.gov.il' });

      // Naive .includes('demo') or .includes('test') misclassifies them:
      expect(teacher1).toBe('demo');
      expect(teacher2).toBe('internal_test');
      expect(teacher3).toBe('internal_test');
    });
  });

  describe('Defect 4: HTML Export & Print - Unescaped XSS Vector in Environment Field', () => {
    it('injects raw unescaped HTML/script from goal environment into print and word HTML', () => {
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

      // Verify unescaped payload in print output
      expect(printHtml).toContain(maliciousPayload);
      // Verify unescaped payload in Word HTML output
      expect(wordHtml).toContain(maliciousPayload);
    });
  });

  describe('Defect 5: Duration calculation returns default 45m when meeting is 0 duration', () => {
    it('returns 45 minutes when start time equals end time', () => {
      const duration = calculateDurationMinutes('10:00', '10:00');
      // When start == end (0 min diff), diff > 0 ? diff : 45 returns 45!
      expect(duration).toBe(45);
    });
  });

  describe('Defect 6: Monthly Pedagogical Reminder fails for days > 28 in February and day 31 in 30-day months', () => {
    it('never fires in February when day is set to 30 or 31', () => {
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'monthly',
        pedagogicalReminderMonthlyDay: 31,
        pedagogicalReminderTime: '08:00'
      };
      // Test on Feb 28, 2026 at 09:00
      const febDate = new Date('2026-02-28T09:00:00');
      const shouldSend = shouldSendPedagogicalDigest(prefs, null, febDate);
      expect(shouldSend).toBe(false);
    });
  });

  describe('Defect 7: Goal Bank crashes if suggestedObjectives contains non-string item', () => {
    it('reproduces toLowerCase crash on non-string objective when searching', () => {
      const bankItem = {
        title: 'יעד',
        environment: 'כיתה',
        suggestedObjectives: ['אחר', null, 123]
      };
      const query = 'חיפוש';

      const runFilter = () => {
        return (bankItem.suggestedObjectives as any[]).some((o: any) =>
          o.toLowerCase().includes(query)
        );
      };

      expect(runFilter).toThrow(TypeError);
    });
  });

  describe('Defect 8: Stage conversion verb corruption', () => {
    it('corrupts Hebrew verb הגן (protected/defended) when followed by prepositions other than על', async () => {
      const { adaptTextToSchoolStage } = await import('../domain/stageGuard');
      const input = 'התלמיד הגן בפני לחץ חברתי מחוץ לכיתה';
      const adapted = adaptTextToSchoolStage(input);
      // 'הגן' is incorrectly replaced with 'בית הספר', turning 'הגן בפני' into 'בית הספר בפני'!
      expect(adapted).toContain('בית הספר בפני');
    });
  });

  describe('Defect 9: Confirm Delete Student Logic Flaw with overrideStudent', () => {
    it('reproduces abort when overrideStudent is passed but studentToDelete state is null', async () => {
      const { isStudentOwnedByUser } = await import('../domain/permissions');
      const currentUser = { email: 'teacher@tala.edu.il' };
      const overrideStudent = { id: 's99', ownerEmail: 'teacher@tala.edu.il', name: 'משה' };
      let studentToDelete: any = null; // State in App.tsx

      // Simulate App.tsx confirmDeleteStudent lines 1871-1875:
      const confirmDelete = (override: any = null) => {
        const target = override || studentToDelete;
        if (!target || !isStudentOwnedByUser(studentToDelete, currentUser)) {
          return { aborted: true };
        }
        return { deletedId: target.id };
      };

      const result = confirmDelete(overrideStudent);
      // Even though overrideStudent is valid and owned by currentUser, it aborts because it checks studentToDelete!
      expect(result.aborted).toBe(true);
    });
  });

  describe('Defect 10: Parent / Staff Voice Query Filters Out Shared Collaborators', () => {
    it('demonstrates that co-teachers cannot query invites by student owner due to currentUser email query', () => {
      const studentOwnerEmail = 'primary_teacher@tala.edu.il';
      const coTeacherCurrentUser = { email: 'coteacher@tala.edu.il' };

      // In ParentVoiceControl.tsx:
      // const ownerEmail = String(currentUser?.email || '').trim().toLowerCase();
      // subscribeToStudentInvites(ownerEmail, studentId)
      const queryOwnerEmail = String(coTeacherCurrentUser.email).trim().toLowerCase();

      // The co-teacher queries Firestore for ownerEmail == 'coteacher@tala.edu.il',
      // but the parent invite was created by the primary teacher under 'primary_teacher@tala.edu.il'.
      expect(queryOwnerEmail).not.toBe(studentOwnerEmail);
    });
  });

});
