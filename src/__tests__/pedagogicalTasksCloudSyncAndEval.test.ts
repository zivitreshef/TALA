import { describe, it, expect } from 'vitest';
import {
  getPedagogicalAccomplishmentsSummary,
  getObservationGaps
} from '../domain/dailyPedagogicalTracking';
import { synthesizeLocalExecutiveDigest } from '../domain/pedagogicalDigestAi';
import { buildPedagogicalReminderEmailHtml } from '../emailService';
import {
  buildEvalWordDocumentHtml,
  buildEvalReportPrintHtml
} from '../export/wordAndPrintBuilders';
import fs from 'fs';
import path from 'path';

describe('Pedagogical Tasks Cloud Sync, Digest & Mid-Year Evaluation (Bugs 1-4)', () => {
  const sampleStudentWithTasks = {
    id: 'st_123',
    name: 'איתי לוי',
    educationalFramework: 'גן אלונים',
    goals: [
      {
        id: 'g_1',
        title: 'משחק סוציו-דרמטי משותף',
        environment: 'חצר',
        currentProgress: 75,
        targetProgress: 80,
        observations: [
          {
            id: 'obs_1',
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().slice(0, 10),
            note: 'איתי שיתף פעולה עם חבר בבנייה בחול',
            supportLevel: 'תיווך חלקי',
            progress: 75
          }
        ]
      }
    ],
    pedagogicalTasks: [
      {
        id: 'task_1',
        text: 'תרגול פנייה יזומה לחבר בחצר המשחקים',
        date: new Date().toISOString().slice(0, 10),
        completed: true,
        completedAt: new Date().toISOString(),
        isAiGenerated: true
      },
      {
        id: 'task_2',
        text: 'שיחה מקדימה לקראת פעילות בקבוצה',
        date: new Date().toISOString().slice(0, 10),
        completed: false,
        isAiGenerated: false
      }
    ]
  };

  it('1. App.tsx passes students={userStudents} to UserSelfPasswordModal (Bug 1)', () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
    expect(appSource).toMatch(/<UserSelfPasswordModal[\s\S]*?students=\{userStudents\}/);
  });

  it('2. getPedagogicalAccomplishmentsSummary extracts completed and pending tasks into summary', () => {
    const summary = getPedagogicalAccomplishmentsSummary([sampleStudentWithTasks], 30, new Date());
    expect(summary.totalStudents).toBe(1);
    expect(summary.completedTasks).toBeDefined();
    expect(summary.completedTasks?.length).toBe(1);
    expect(summary.completedTasks?.[0].text).toContain('תרגול פנייה יזומה');
    expect(summary.completedTasks?.[0].isAiGenerated).toBe(true);

    expect(summary.pendingTasks).toBeDefined();
    expect(summary.pendingTasks?.length).toBe(1);
    expect(summary.pendingTasks?.[0].text).toContain('שיחה מקדימה');
  });

  it('3. getObservationGaps recognizes completed pedagogical tasks as active pedagogical continuity', () => {
    const studentWithTaskOnly = {
      id: 'st_task_only',
      name: 'רוני כהן',
      educationalFramework: 'גן שקמה',
      goals: [
        {
          id: 'g_2',
          title: 'השתתפות במפגש בוקר',
          environment: 'מליאה',
          currentProgress: 60,
          targetProgress: 80,
          observations: [] // No direct observations
        }
      ],
      pedagogicalTasks: [
        {
          id: 'task_recent',
          goalId: 'g_2',
          text: 'ליווי במפגש בוקר עם כרטיסיית ניווט',
          date: new Date().toISOString().slice(0, 10),
          completed: true,
          completedAt: new Date().toISOString()
        }
      ]
    };

    const gaps = getObservationGaps([studentWithTaskOnly], 21, new Date());
    // Since task was completed today, it shouldn't be flagged as a gap older than 21 days
    expect(gaps.length).toBe(0);
  });

  it('4. buildPedagogicalReminderEmailHtml renders KPI badge and completed tasks section in email', () => {
    const accomplishments = getPedagogicalAccomplishmentsSummary([sampleStudentWithTasks], 30, new Date());
    const emailHtml = buildPedagogicalReminderEmailHtml({
      teacherName: 'זיוית רשף',
      gaps: [],
      accomplishments,
      totalStudents: 1,
      privacyMode: 'full_name'
    });

    expect(emailHtml).toContain('משימות שבוצעו');
    expect(emailHtml).toContain('תרגול פנייה יזומה לחבר');
    expect(emailHtml).toContain('מיקוד AI');
    expect(emailHtml).toContain('איתי לוי');
  });

  it('5. buildEvalWordDocumentHtml and buildEvalReportPrintHtml include evidence section of tasks and observations', () => {
    const wordHtml = buildEvalWordDocumentHtml(sampleStudentWithTasks, false);
    expect(wordHtml).toContain('ראיות מעקב שוטף – משימות ממוקדות ותצפיות');
    expect(wordHtml).toContain('תרגול פנייה יזומה לחבר');
    expect(wordHtml).toContain('איתי שיתף פעולה עם חבר בבנייה בחול');

    const printHtml = buildEvalReportPrintHtml(sampleStudentWithTasks, false);
    expect(printHtml).toContain('ראיות מעקב שוטף – משימות ממוקדות ותצפיות');
    expect(printHtml).toContain('תרגול פנייה יזומה לחבר');
    expect(printHtml).toContain('איתי שיתף פעולה עם חבר בבנייה בחול');
  });
  it('6. Executive Digest captures emerging challenges and formulates actionable goal adjustments', () => {
    const studentWithChallenge = {
      id: 'st_challenge',
      name: 'ארבל חנה',
      educationalFramework: 'גן דקלים',
      goals: [
        {
          id: 'g_lang',
          title: 'הרחבת אוצר המילים והבעה שפתית',
          environment: 'מפגש גן',
          currentProgress: 40,
          targetProgress: 80,
          observations: [
            {
              id: 'obs_c1',
              timestamp: new Date().toISOString(),
              date: new Date().toISOString().slice(0, 10),
              note: 'הילדה מתקשה במושגי סדר ורצף, שליפת מילים וארגון משפט גם עם תמיכה',
              supportLevel: 'ליווי והדגמה מלאה',
              progress: 40
            }
          ]
        }
      ]
    };

    const accomplishments = getPedagogicalAccomplishmentsSummary([studentWithChallenge], 30, new Date());
    const digest = synthesizeLocalExecutiveDigest({
      students: [studentWithChallenge],
      accomplishments,
      gaps: [],
      privacyMode: 'full_name'
    });

    expect(digest.studentCards.length).toBe(1);
    const card = digest.studentCards[0];
    expect(card.studentName).toBe('ארבל חנה');
    expect(card.challengesAndDifficulties).toBeDefined();
    expect(card.challengesAndDifficulties).toContain('מתקשה');
    expect(card.recommendedGoalRefinements).toBeDefined();
    expect(card.recommendedGoalRefinements).toContain('לחדד את המדדים');
    expect(digest.executiveOverview).toContain('1 תלמידים');
  });

  it('7. Executive Digest identifies inactive students and outputs concise no-progress notes', () => {
    const activeStudent = {
      id: 'st_active',
      name: 'איתי לוי',
      goals: [],
      pedagogicalTasks: [
        { id: 't_act', text: 'משימה פעילה', completed: true, date: new Date().toISOString().slice(0, 10) }
      ]
    };
    const inactiveStudent = {
      id: 'st_inactive',
      name: 'עידן אבוהב',
      educationalFramework: 'גן יובלים',
      goals: []
    };

    const accomplishments = getPedagogicalAccomplishmentsSummary([activeStudent, inactiveStudent], 30, new Date());
    const digest = synthesizeLocalExecutiveDigest({
      students: [activeStudent, inactiveStudent],
      accomplishments,
      gaps: [],
      privacyMode: 'full_name'
    });

    expect(digest.studentCards.some((c) => c.studentName === 'איתי לוי')).toBe(true);
    expect(digest.inactiveStudents.some((s) => s.studentName === 'עידן אבוהב')).toBe(true);
    expect(digest.inactiveStudents[0].note).toContain('טרם תועדה התקדמות בתקופה זו');
  });

  it('8. Executive Digest strictly enforces acronym privacy mode', () => {
    const student = {
      id: 'st_priv',
      name: 'עתי שתיים',
      educationalFramework: 'גן רקפת',
      goals: [
        {
          id: 'g_p',
          title: 'עתי שתיים ישפר שיום פריטים',
          environment: 'חצר',
          observations: [
            {
              id: 'obs_p',
              note: 'עתי שתיים מתקשה בשיום',
              timestamp: new Date().toISOString()
            }
          ]
        }
      ]
    };

    const accomplishments = getPedagogicalAccomplishmentsSummary([student], 30, new Date());
    const digest = synthesizeLocalExecutiveDigest({
      students: [student],
      accomplishments,
      gaps: [],
      privacyMode: 'acronym'
    });

    expect(digest.studentCards[0].studentName).toBe('ע.ש.');
    expect(digest.studentCards[0].accomplishments).not.toContain('עתי שתיים');
    expect(digest.studentCards[0].challengesAndDifficulties).not.toContain('עתי שתיים');
  });

  it('9. EcologicalWorkPlanForm JSX interpolation does not output literal dollar signs', () => {
    const formSource = fs.readFileSync(path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx'), 'utf8');
    expect(formSource).toContain('נצברו {obsCount} תצפיות שטח ו-{tasksCount} משימות ממוקדות');
    expect(formSource).not.toContain('נצברו ' + String.fromCharCode(36) + '{obsCount}');
  });
});
