import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StudentProfile } from '../domain/types';
import {
  buildBehaviorAssessmentWordDocumentHtml,
  buildBehaviorAssessmentPrintHtml,
  buildBehaviorPlanWordDocumentHtml,
  buildBehaviorPlanPrintHtml,
  buildBehaviorProgressReportWordDocumentHtml,
  buildBehaviorProgressReportPrintHtml,
  getSafeReportFilename,
  getBehaviorAssessmentTitle,
  getBehaviorPlanTitle,
  getBehaviorProgressReportTitle
} from '../export/wordAndPrintBuilders';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';

vi.mock('../../firebaseBackend', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'analyst@tala.edu' }
  })
}));

vi.mock('../../services/inviteService', () => ({
  createInvite: vi.fn(),
  deleteInvite: vi.fn(),
  ensureTeacherSession: vi.fn(),
  markInviteReviewed: vi.fn(),
  subscribeToStudentInvites: vi.fn(() => () => {})
}));

const sampleBehaviorStudent: StudentProfile = {
  id: 'student_aba_001',
  name: 'יונתן כהן',
  idNumber: '312456789',
  birthDate: '2016-04-12',
  educationalFramework: 'בית ספר יסודי אלונים',
  gradeClass: 'כיתה ד1',
  address: 'רחוב הרצל 15, תל אביב',
  phone: '054-1234567',
  schoolYear: 'תשפ"ו',
  behaviorAssessment: {
    assessorName: 'רונית שמיר',
    assessmentDate: '2026-11-15',
    backgroundInfo: 'התלמיד לומד בכיתה רגילה עם סל שילוב. רקע של קשיי קשב וריכוז.',
    targetBehaviors: [
      {
        id: 'target_1',
        name: 'סירוב לביצוע מטלות לימודיות',
        operationalDefinition: 'אמירת לא רוצה ודחיפת חוברת הלימוד מהשולחן בעת מתן משימת כתיבה עצמאית',
        measurementType: 'frequency',
        baselineAverage: 7.5,
        targetGoal: 2
      }
    ],
    baselineData: [
      { id: 'b1', date: '2026-11-01', sessionOrPeriod: 'שיעור חשבון', value: 8, notes: 'בתחילת שיעור' },
      { id: 'b2', date: '2026-11-02', sessionOrPeriod: 'שיעור שפה', value: 6, notes: 'עבודה בחוברת' },
      { id: 'b3', date: '2026-11-03', sessionOrPeriod: 'שיעור מדעים', value: 9, notes: 'משימה קבוצתית' }
    ],
    antecedentAnalysis: 'דרישה לכתיבה ממושכת ועבודה עצמאית ללא תיווך מוקדם',
    mainHypothesizedFunction: 'escape',
    functionalHypothesisNarrative: 'כאשר נדרש לבצע משימת כתיבה עצמאית, מתעוררת התנהגות סירוב במטרה להימנע מהמטלה הלימודית.',
    initialRecommendations: 'מתן בחירה בין מטלות, פירוק משימות לצעדים קטנים ומתן הפסקות יזומות.'
  },
  behaviorPlan: {
    analystName: 'רונית שמיר',
    effectiveDate: '2026-11-20',
    reviewDate: '2027-01-20',
    targetBehaviors: [
      {
        id: 'target_1',
        name: 'סירוב לביצוע מטלות לימודיות',
        operationalDefinition: 'אמירת לא רוצה ודחיפת חוברת הלימוד מהשולחן',
        measurementType: 'frequency',
        baselineAverage: 7.5,
        targetGoal: 2
      }
    ],
    replacementBehaviors: [
      {
        targetBehaviorId: 'target_1',
        replacementSkill: 'בקשת הפסקה באמצעות כרטיסייה חזותית',
        teachingStrategies: 'הדגמה יזומה (Model), תרגול במצבי רוגע וחיזוק מיידי על שימוש מותאם'
      }
    ],
    antecedentStrategies: 'הצגת לוח זמנים חזותי והפחתת כמות המלל הנדרשת בכל עמוד',
    reinforcementSystem: {
      preferredReinforcers: 'זמן משחק במחשב, מדבקות מועדפות, תפקיד עוזר המורה',
      scheduleOfReinforcement: 'חיזוק דיפרנציאלי של התנהגות חלופית (DRA) ביחס קבוע'
    },
    reactiveProtocol: {
      staffResponse: 'תגובה ניטרלית ללא שיח ממושך, חסימת השלכת חפצים והפניה חזותית לכרטיסיית ההפסקה',
      crisisSafetyPlan: 'במידה ויש סכנה לפגיעה פיזית, הרחקת שאר התלמידים וליווי לחדר שלווה'
    },
    ongoingTracking: [
      {
        id: 't1',
        date: '2026-11-21',
        period: 'שיעור שפה',
        targetBehaviorOccurrences: 5,
        replacementBehaviorUsed: 2,
        reinforcementDelivered: true,
        notes: 'שימוש ראשון בכרטיסייה'
      },
      {
        id: 't2',
        date: '2026-11-22',
        period: 'שיעור חשבון',
        targetBehaviorOccurrences: 3,
        replacementBehaviorUsed: 4,
        reinforcementDelivered: true,
        notes: 'היענות מהירה'
      },
      {
        id: 't3',
        date: '2026-11-23',
        period: 'שיעור תנך',
        targetBehaviorOccurrences: 2,
        replacementBehaviorUsed: 5,
        reinforcementDelivered: true,
        notes: 'התקדמות יפה'
      }
    ]
  }
};

describe('Behavior Export, Word Documents & Print Builders (Stage 4)', () => {
  it('1. verifies report title getters have Hebrew-only titles with zero English in parentheses', () => {
    const assessmentTitle = getBehaviorAssessmentTitle();
    const planTitle = getBehaviorPlanTitle();

    expect(assessmentTitle).toBe('דוח הערכת תפקוד התנהגותי');
    expect(planTitle).toBe('תוכנית התערבות התנהגותית');
    expect(assessmentTitle).not.toMatch(/[a-zA-Z()]/);
    expect(planTitle).not.toMatch(/[a-zA-Z()]/);
  });

  it('2. verifies getSafeReportFilename generates correct filenames for behavior reports', () => {
    const assessmentFile = getSafeReportFilename(sampleBehaviorStudent, false, 'doc', 'behavior_assessment');
    const planFile = getSafeReportFilename(sampleBehaviorStudent, false, 'doc', 'behavior_plan');

    expect(assessmentFile).toContain('דוח_הערכת_תפקוד_התנהגותי');
    expect(assessmentFile).toContain('יונתן_כהן');
    expect(assessmentFile.endsWith('.doc')).toBe(true);

    expect(planFile).toContain('תוכנית_התערבות_התנהגותית');
    expect(planFile).toContain('יונתן_כהן');
    expect(planFile.endsWith('.doc')).toBe(true);

    // Masked filenames
    const maskedFile = getSafeReportFilename(sampleBehaviorStudent, true, 'doc', 'behavior_assessment');
    expect(maskedFile).not.toContain('יונתן_כהן');
  });

  it('3. builds Behavior Assessment Word document HTML with complete ABA sections', () => {
    const wordHtml = buildBehaviorAssessmentWordDocumentHtml(sampleBehaviorStudent, false);

    expect(wordHtml).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
    expect(wordHtml).toContain('דוח הערכת תפקוד התנהגותי');
    expect(wordHtml).toContain('יונתן כהן');
    expect(wordHtml).toContain('312456789');
    expect(wordHtml).toContain('סירוב לביצוע מטלות לימודיות');
    expect(wordHtml).toContain('אמירת לא רוצה ודחיפת חוברת הלימוד');
    expect(wordHtml).toContain('שיעור חשבון');
    expect(wordHtml).toContain('תנאים מקדימים וטריגרים סביבתיים');
    expect(wordHtml).toContain('הימנעות ממטלה');
    expect(wordHtml).toContain('נרטיב השערה תפקודית');
    expect(wordHtml).toContain('המלצות ראשוניות להתערבות');
    expect(wordHtml).toContain('חתימת מנתחת התנהגות');
    expect(wordHtml).toContain('<svg');
    expect(wordHtml).toContain('תדירות התנהגות מטרה בשלב קו הבסיס');
  });

  it('4. masks PII in Behavior Assessment Word document when hideDetails is true', () => {
    const maskedWordHtml = buildBehaviorAssessmentWordDocumentHtml(sampleBehaviorStudent, true);

    expect(maskedWordHtml).not.toContain('יונתן כהן');
    expect(maskedWordHtml).not.toContain('312456789');
    expect(maskedWordHtml).not.toContain('054-1234567');
    expect(maskedWordHtml).not.toContain('רחוב הרצל 15');
    // Acronym should be present
    expect(maskedWordHtml).toContain('י.כ.');
  });

  it('5. builds Behavior Assessment Print HTML with inline vector SVG charts', () => {
    const printHtml = buildBehaviorAssessmentPrintHtml(sampleBehaviorStudent, false, 'https://example.com/logo.png');

    expect(printHtml).toContain('<!DOCTYPE html>');
    expect(printHtml).toContain('דוח_הערכת_תפקוד_התנהגותי_יונתן_כהן');
    expect(printHtml).toContain('<svg');
    expect(printHtml).toContain('תדירות התנהגות מטרה בשלב קו הבסיס');
    expect(printHtml).toContain('התפלגות התפקוד המשוער של ההתנהגות');
    expect(printHtml).toContain('ממוצע קו בסיס: 7.7');
    expect(printHtml).toContain('https://example.com/logo.png');
    expect(printHtml).toContain('חתימת מנתחת התנהגות: _________________________');
  });

  it('6. builds Behavior Intervention Plan Word document HTML with all intervention protocols', () => {
    const wordHtml = buildBehaviorPlanWordDocumentHtml(sampleBehaviorStudent, false);

    expect(wordHtml).toContain('תוכנית התערבות התנהגותית');
    expect(wordHtml).toContain('יונתן כהן');
    expect(wordHtml).toContain('בקשת הפסקה באמצעות כרטיסייה חזותית');
    expect(wordHtml).toContain('אסטרטגיות הוראה ותרגול יזום');
    expect(wordHtml).toContain('התערבות מניעתית והתאמות סביבתיות לתנאים מקדימים');
    expect(wordHtml).toContain('מחזקים מועדפים:');
    expect(wordHtml).toContain('לוח זמנים ותדירות חיזוק:');
    expect(wordHtml).toContain('תגובת הצוות בעת התרחשות ההתנהגות:');
    expect(wordHtml).toContain('תוכנית בטיחות והתמודדות במשבר:');
    expect(wordHtml).toContain('טבלת מעקב שוטף ולוח התקדמות');
    expect(wordHtml).toContain('<svg');
    expect(wordHtml).toContain('מעקב התקדמות: קו בסיס מול שלב ההתערבות');
  });

  it('7. builds Behavior Intervention Plan Print HTML with inline progress monitoring dual-line SVG', () => {
    const printHtml = buildBehaviorPlanPrintHtml(sampleBehaviorStudent, false);

    expect(printHtml).toContain('<!DOCTYPE html>');
    expect(printHtml).toContain('תוכנית_התערבות_התנהגותית_יונתן_כהן');
    expect(printHtml).toContain('<svg');
    expect(printHtml).toContain('מעקב התקדמות: קו בסיס מול שלב ההתערבות');
    expect(printHtml).toContain('התנהגות מאתגרת');
    expect(printHtml).toContain('התנהגות חלופית');
    expect(printHtml).toContain('שלב בסיס');
    expect(printHtml).toContain('שלב התערבות');
  });

  it('8. renders BehaviorAssessmentForm with export actions and privacy toggle', () => {
    const onSave = vi.fn();
    const markup = renderToStaticMarkup(
      <BehaviorAssessmentForm
        student={sampleBehaviorStudent}
        onSaveStudentPlan={onSave}
        allStudents={[sampleBehaviorStudent]}
      />
    );

    expect(markup).toContain('הדפסה וייצוא');
    expect(markup).toContain('שמור התקדמות');
    expect(markup).toContain('btn-export-dropdown');
  });

  it('9. renders BehaviorInterventionPlanForm with export actions and privacy toggle', () => {
    const onSave = vi.fn();
    const markup = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={sampleBehaviorStudent}
        onSaveStudentPlan={onSave}
        allStudents={[sampleBehaviorStudent]}
      />
    );

    expect(markup).toContain('הדפסה וייצוא');
    expect(markup).toContain('שמור התקדמות');
    expect(markup).toContain('btn-export-dropdown');
  });

  it('10. builds Behavior Progress Report Word & Print HTML with core tables and signatures', () => {
    const studentWithProgress: StudentProfile = {
      ...sampleBehaviorStudent,
      behaviorProgressReport: {
        period: 'end_year',
        reportDate: '2026-06-20',
        assessorName: 'רוני מנתחת',
        reviewPeriodLabel: 'סיכום שנתי מלא',
        executiveSummary: 'התקדמות שנתית מרשימה ביותר',
        targetBehaviorsProgress: [
          {
            behaviorName: 'קימה מהמקום ללא אישור',
            baselineAverage: 6,
            currentAverage: 1.2,
            reductionPercent: 80,
            statusNotes: 'הושגה הפחתה משמעותית'
          }
        ],
        replacementBehaviorsAcquisition: [
          {
            skillName: 'שימוש בכרטיס הפוגה',
            masteryLevel: 'עצמאי לחלוטין',
            acquisitionNotes: 'שימוש עקבי'
          }
        ]
      }
    };

    const wordHtml = buildBehaviorProgressReportWordDocumentHtml(studentWithProgress, false);
    expect(wordHtml).toContain('דוח סיכום והערכת התקדמות התנהגותית - סוף שנה');
    expect(wordHtml).toContain('קימה מהמקום ללא אישור');
    expect(wordHtml).toContain('80%');
    expect(wordHtml).toContain('שימוש בכרטיס הפוגה');

    const printHtml = buildBehaviorProgressReportPrintHtml(studentWithProgress, false);
    expect(printHtml).toContain('דוח סיכום והערכת התקדמות התנהגותית - סוף שנה');
    expect(printHtml).toContain('קימה מהמקום ללא אישור');
    expect(printHtml).toContain('חתימת מנתחת התנהגות');

    expect(getBehaviorProgressReportTitle('end_year')).toBe('דוח סיכום והערכת התקדמות התנהגותית - סוף שנה');
  });

  it('11. embeds Section 4 visual analytics (all 6 charts/tables) in Word and Print HTML when data is present', () => {
    const studentWithFullData: StudentProfile = {
      ...sampleBehaviorStudent,
      behaviorObservations: [
        {
          id: 'obs_1',
          timestamp: 1763627400000,
          dateTime: '2026-11-20T08:30:00Z',
          location: 'כיתת אם',
          activity: 'שיעור שפה',
          antecedent: 'דרישת קריאה בקול',
          behavior: 'סירוב ודחיפת ספר',
          intensity: 'moderate',
          durationMinutes: 12,
          consequence: 'הוצאה למסדרון',
          perceivedFunction: 'escape'
        },
        {
          id: 'obs_2',
          timestamp: 1763633700000,
          dateTime: '2026-11-20T10:15:00Z',
          location: 'כיתת אם',
          activity: 'שיעור חשבון',
          antecedent: 'מבחן פתע',
          behavior: 'צעקות בכיתה',
          intensity: 'severe',
          durationMinutes: 18,
          consequence: 'תשומת לב אישית מהמורה',
          perceivedFunction: 'attention'
        }
      ],
      behaviorProgressReport: {
        period: 'mid_year',
        reportDate: '2026-11-25',
        assessorName: 'רונית שמיר',
        reviewPeriodLabel: 'מחצית ראשונה',
        executiveSummary: 'נרשמה התקדמות עקבית.',
        targetBehaviorsProgress: [
          {
            behaviorName: 'סירוב לביצוע מטלות',
            baselineAverage: 7.5,
            currentAverage: 3.3,
            reductionPercent: 56,
            statusNotes: 'הפחתה במחצית'
          }
        ],
        replacementBehaviorsAcquisition: [
          {
            skillName: 'בקשת הפסקה בכרטיסייה',
            masteryLevel: 'עצמאי',
            acquisitionNotes: 'שימוש גובר'
          }
        ]
      }
    };

    const wordHtml = buildBehaviorProgressReportWordDocumentHtml(studentWithFullData, false);
    expect(wordHtml).toContain('4. ניתוחים חזותיים ומדדי מעקב מתקדמים');
    expect(wordHtml).toContain('מפת פיזור שעתית לאורך ימות השבוע');
    expect(wordHtml).toContain('טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית');
    expect(wordHtml).toContain('עקומת למידה מצטברת של מיומנות חלופית');
    expect(wordHtml).toContain('טבלת נאמנות יישום של צוות בית הספר');
    expect(wordHtml).toContain('גרף ניטור התקדמות: קו בסיס מול שלב התערבות');
    expect(wordHtml).toContain('5. התאמות סביבתיות ונהלי צוות');
    expect(wordHtml).toContain('6. נאמנות יישום ועקביות הצוות');
    expect(wordHtml).toContain('7. המלצות להמשך תוכנית ההתערבות וישיבות רב-מקצועיות');

    const printHtml = buildBehaviorProgressReportPrintHtml(studentWithFullData, false);
    expect(printHtml).toContain('4. ניתוחים חזותיים ומדדי מעקב מתקדמים');
    expect(printHtml).toContain('מפת פיזור שעתית לאורך ימות השבוע');
    expect(printHtml).toContain('טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית');
    expect(printHtml).toContain('עקומת למידה מצטברת של מיומנות חלופית');
    expect(printHtml).toContain('טבלת נאמנות יישום של צוות בית הספר');
    expect(printHtml).toContain('גרף ניטור התקדמות: קו בסיס מול שלב התערבות');
  });

  it('12. verifies generatePdfBlobFromHtml configures portrait A4 width, RTL layout, and robust in-flow container styling', async () => {
    const mockOutputPdf = vi.fn().mockResolvedValue(new Blob(['fake-pdf-content-for-testing-purposes-only-1234567890'.repeat(20)], { type: 'application/pdf' }));
    const mockFrom = vi.fn().mockReturnValue({ outputPdf: mockOutputPdf });
    const mockSet = vi.fn().mockImplementation((opt: any) => {
      expect(opt.jsPDF.orientation).toBe('portrait');
      expect(opt.html2canvas.windowWidth).toBe(794);
      return { from: mockFrom };
    });
    const mockHtml2Pdf = vi.fn().mockReturnValue({ set: mockSet });

    const fakeContainer: any = {
      style: {},
      querySelectorAll: vi.fn().mockReturnValue([]),
      parentNode: {
        removeChild: vi.fn()
      }
    };
    const fakeDoc: any = {
      createElement: vi.fn().mockReturnValue(fakeContainer),
      body: {
        appendChild: vi.fn()
      }
    };

    const prevDoc = (globalThis as any).document;
    (globalThis as any).document = fakeDoc;

    vi.doMock('html2pdf.js', () => ({
      default: mockHtml2Pdf
    }));

    try {
      const { generatePdfBlobFromHtml } = await import('../emailService');
      const portraitHtml = '<!DOCTYPE html><html><head><style>@page { size: A4 portrait; } body { color: red; }</style></head><body><h1>בדיקה</h1></body></html>';
      const blob = await generatePdfBlobFromHtml(portraitHtml, 'behavior_report.pdf');

      expect(blob).toBeDefined();
      expect(fakeContainer.style.width).toBe('794px');
      expect(fakeContainer.style.direction).toBe('rtl');
      expect(fakeContainer.style.background).toBe('#ffffff');
      expect(fakeContainer.className).toBe('tala-pdf-export-container');
      expect(fakeContainer.innerHTML).toContain('.tala-pdf-export-container');
      // Guarantee regression fix: must NOT be fixed positioned or negative z-indexed
      expect(fakeContainer.style.position).not.toBe('fixed');
      expect(fakeContainer.style.zIndex).not.toBe('-99999');
    } finally {
      (globalThis as any).document = prevDoc;
      vi.restoreAllMocks();
      vi.doUnmock('html2pdf.js');
    }
  });
});
