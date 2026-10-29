import { describe, it, expect } from 'vitest';
import {
  adaptTextToKindergartenStage,
  adaptPartnersToStage,
  getDefaultPartnersForStage,
  enforceGoalStage,
  buildStageRulesBlock
} from '../domain/stageGuard.js';
import {
  maskKnownStudentDetails,
  maskPromptForAi,
  toHebrewAcronym
} from '../domain/privacyAndAcronyms.js';
import { shouldSendPedagogicalDigest } from '../domain/dailyPedagogicalTracking.js';
import { buildPedagogicalReminderEmailHtml } from '../emailService.js';

describe('AI Kindergarten & Privacy Defaults (Issue Fixes)', () => {
  describe('1. Kindergarten Staff & Terminology Adaptation', () => {
    it('adapts school staff words to kindergarten equivalents', () => {
      expect(adaptTextToKindergartenStage('המחנכת תעקוב אחרי הילד')).toBe('הגננת תעקוב אחרי הילד');
      expect(adaptTextToKindergartenStage('מורת שילוב תסייע')).toBe('גננת שילוב תסייע');
      expect(adaptTextToKindergartenStage('מורת השילוב תחזק')).toBe('גננת השילוב תחזק');
      expect(adaptTextToKindergartenStage('פעילות במרחב הכיתה')).toBe('משחק במרחב הגן');
      expect(adaptTextToKindergartenStage('תלמידי הכיתה ישתתפו')).toBe('ילדי הגן ישתתפו');
      expect(adaptTextToKindergartenStage('צוות בית הספר')).toBe('צוות הגן');
    });

    it('adapts partners to kindergarten stage, eliminating מחנכת and מורת שילוב', () => {
      const schoolPartners = 'מחנכת, מורת שילוב, מטפלת באומנויות';
      expect(adaptPartnersToStage(schoolPartners, 'kindergarten', true)).toBe(
        'גננת, גננת שילוב, מטפלת באומנויות'
      );
      expect(adaptPartnersToStage('מחנכת, מורת שילוב, הורים', 'kindergarten', false)).toBe(
        'גננת, גננת שילוב, הורים'
      );
    });

    it('returns correct default partners for stage and plan type', () => {
      expect(getDefaultPartnersForStage('kindergarten', false)).toBe('גננת, גננת שילוב, הורים');
      expect(getDefaultPartnersForStage('kindergarten', true)).toBe('גננת, גננת שילוב, מטפלת באומנויות');
      expect(getDefaultPartnersForStage('school', false)).toBe('מחנכת, מורת שילוב, הורים');
      expect(getDefaultPartnersForStage('school', true)).toBe('מחנכת, מורת שילוב, מטפלת באומנויות');
    });

    it('enforces kindergarten stage on generated goal, transforming school staff in partners and text', () => {
      const generatedGoal = {
        title: 'עתי ישפר את יכולת ההבעה',
        environment: 'משחק במרחב הגן',
        opportunities: 'המחנכת תציג שאלות מכוונות',
        opportunitiesIntegration: 'מורת שילוב תתרגל בקבוצה',
        partners: 'מחנכת, מורת שילוב, הורים'
      };

      const result = enforceGoalStage(generatedGoal, 'kindergarten', { isTalaMode: false });
      expect(result.corrected).toBe(true);
      expect(result.goal.partners).toBe('גננת, גננת שילוב, הורים');
      expect(result.goal.opportunities).toContain('הגננת');
      expect(result.goal.opportunitiesIntegration).toContain('גננת שילוב');
    });

    it('ensures buildStageRulesBlock for kindergarten strictly forbids school staff and mandates גננת', () => {
      const rules = buildStageRulesBlock('kindergarten');
      expect(rules).toContain('גננת');
      expect(rules).toContain('גננת שילוב');
      expect(rules).toContain('אסור בהחלט לכלול מונחים של בית ספר');
      expect(rules).toContain('Never output school staff like "מחנכת" or "מורת שילוב"');
    });
  });

  describe('2. Student Name Masking for AI (Full Name vs Acronym / Kindergarten vs School)', () => {
    const atiKindergartenBoy = {
      name: 'עתי שתיים',
      gender: 'boy',
      stage: 'kindergarten',
      educationalFramework: 'גן רקפת'
    };

    const danielSchoolBoy = {
      name: 'דניאל כהן',
      gender: 'boy',
      stage: 'school',
      educationalFramework: 'בי״ס אלונים'
    };

    const mayaSchoolGirl = {
      name: 'מאיה לוי',
      gender: 'girl',
      stage: 'school',
      educationalFramework: 'בי״ס אלונים'
    };

    const noaKindergartenGirl = {
      name: 'נועה בר',
      gender: 'girl',
      stage: 'kindergarten',
      educationalFramework: 'גן סביון'
    };

    it('masks kindergarten boy as הילד in full_name mode', () => {
      const prompt = 'עתי שתיים התקשה בזיהוי מכשירי חשמל. עתי ידע לומר מקרר.';
      const masked = maskKnownStudentDetails(prompt, atiKindergartenBoy, 'full_name');
      expect(masked).not.toContain('עתי');
      expect(masked).not.toContain('שתיים');
      expect(masked).toContain('הילד');
    });

    it('masks kindergarten girl as הילדה in full_name mode', () => {
      const prompt = 'נועה בר זיהתה את כל הצבעים.';
      const masked = maskKnownStudentDetails(prompt, noaKindergartenGirl, 'full_name');
      expect(masked).not.toContain('נועה');
      expect(masked).not.toContain('בר');
      expect(masked).toContain('הילדה');
    });

    it('masks school boy as התלמיד in full_name mode', () => {
      const prompt = 'דניאל כהן קרא את הטקסט בעצמו.';
      const masked = maskKnownStudentDetails(prompt, danielSchoolBoy, 'full_name');
      expect(masked).not.toContain('דניאל');
      expect(masked).not.toContain('כהן');
      expect(masked).toContain('התלמיד');
    });

    it('masks school girl as התלמידה in full_name mode', () => {
      const prompt = 'מאיה לוי פתרה את התרגילים במחברת.';
      const masked = maskKnownStudentDetails(prompt, mayaSchoolGirl, 'full_name');
      expect(masked).not.toContain('מאיה');
      expect(masked).not.toContain('לוי');
      expect(masked).toContain('התלמידה');
    });

    it('masks student to acronym (initials) in acronym mode', () => {
      const prompt = 'עתי שתיים ידע לומר מקרר אך הגה מקאה.';
      const masked = maskKnownStudentDetails(prompt, atiKindergartenBoy, 'acronym');
      const expectedAcronym = toHebrewAcronym('עתי שתיים'); // ע.ש.
      expect(expectedAcronym).toBe('ע.ש.');
      expect(masked).not.toContain('עתי');
      expect(masked).not.toContain('שתיים');
      expect(masked).toContain('ע.ש.');
    });

    it('maskPromptForAi respects student.privacyMode if passed', () => {
      const prompt = 'דניאל כהן גיל הילד/ה: 8 שנים (ת.ל: 14/05/2018)';
      const maskedAcronym = maskPromptForAi(prompt, danielSchoolBoy, 'acronym');
      expect(maskedAcronym).toContain('ד.כ.');
      expect(maskedAcronym).not.toContain('דניאל');
      expect(maskedAcronym).not.toContain('(ת.ל:');

      const maskedFullName = maskPromptForAi(prompt, danielSchoolBoy, 'full_name');
      expect(maskedFullName).toContain('התלמיד');
      expect(maskedFullName).not.toContain('דניאל');
      expect(maskedFullName).not.toContain('(ת.ל:');
    });
  });

  describe('3. Automated Pedagogical Digest Scheduler & Privacy Formatting', () => {
    it('shouldSendPedagogicalDigest returns false when disabled', () => {
      const prefs = { pedagogicalReminderEnabled: false, monthlyPedagogicalReminder: false };
      expect(shouldSendPedagogicalDigest(prefs, null, new Date('2026-10-25T10:00:00'))).toBe(false);
    });

    it('shouldSendPedagogicalDigest returns false when before scheduled time', () => {
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'weekly',
        pedagogicalReminderWeeklyDay: 'sunday',
        pedagogicalReminderTime: '14:00'
      };
      // Sunday at 10:00
      const now = new Date('2026-10-25T10:00:00'); // 2026-10-25 is a Sunday
      expect(shouldSendPedagogicalDigest(prefs, null, now)).toBe(false);
    });

    it('shouldSendPedagogicalDigest returns true on scheduled weekly day and time if not yet sent', () => {
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'weekly',
        pedagogicalReminderWeeklyDay: 'sunday',
        pedagogicalReminderTime: '09:00'
      };
      // Sunday at 09:15
      const now = new Date('2026-10-25T09:15:00');
      expect(shouldSendPedagogicalDigest(prefs, null, now)).toBe(true);
    });

    it('shouldSendPedagogicalDigest returns false if already sent today', () => {
      const prefs = {
        pedagogicalReminderEnabled: true,
        pedagogicalReminderFrequency: 'weekly',
        pedagogicalReminderWeeklyDay: 'sunday',
        pedagogicalReminderTime: '09:00'
      };
      const now = new Date('2026-10-25T10:30:00');
      const lastSentSameDay = new Date('2026-10-25T09:05:00').toISOString();
      expect(shouldSendPedagogicalDigest(prefs, lastSentSameDay, now)).toBe(false);
    });

    it('buildPedagogicalReminderEmailHtml redacts student name in observations and goals when privacyMode is acronym', () => {
      const htmlAcronym = buildPedagogicalReminderEmailHtml({
        teacherName: 'זיוית',
        totalStudents: 1,
        privacyMode: 'acronym',
        accomplishments: {
          recentObservations: [
            {
              studentName: 'עתי שתיים',
              framework: 'גן רקפת',
              goalTitle: 'עתי שתיים יזהה כלי אוכל',
              note: 'עתי הצליח לזהות מחבת אך התקשה בסיר.',
              timestamp: new Date().toISOString()
            }
          ],
          advancedGoals: [
            {
              studentName: 'עתי שתיים',
              goalTitle: 'עתי שתיים ישפר שיום פריטים',
              environment: 'משחק במרחב הגן',
              currentProgress: 80
            }
          ]
        },
        gaps: [
          {
            studentName: 'עתי שתיים',
            framework: 'גן רקפת',
            goalTitle: 'עתי שתיים יזהה צורות',
            environment: 'משחק במרחב הגן',
            daysSinceObservation: 48,
            currentProgress: 20
          }
        ]
      });

      // Acronym "ע.ש." must be present
      expect(htmlAcronym).toContain('ע.ש.');
      // Full name "עתי" or "עתי שתיים" must be redacted from tables and notes
      expect(htmlAcronym).not.toContain('עתי שתיים');
    });

    it('buildPedagogicalReminderEmailHtml retains student full name when privacyMode is full_name', () => {
      const htmlFull = buildPedagogicalReminderEmailHtml({
        teacherName: 'זיוית',
        totalStudents: 1,
        privacyMode: 'full_name',
        accomplishments: {
          recentObservations: [
            {
              studentName: 'עתי שתיים',
              framework: 'גן רקפת',
              goalTitle: 'זיהוי כלי אוכל',
              note: 'הצלחה רבה',
              timestamp: new Date().toISOString()
            }
          ],
          advancedGoals: []
        },
        gaps: []
      });

      expect(htmlFull).toContain('עתי שתיים');
    });
  });
});
