import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StudentProfile } from '../domain/types';
import {
  buildBehaviorAssessmentWordDocumentHtml,
  buildBehaviorAssessmentPrintHtml,
  buildBehaviorPlanWordDocumentHtml,
  buildBehaviorPlanPrintHtml,
  getSafeReportFilename,
  getBehaviorAssessmentTitle,
  getBehaviorPlanTitle
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
    expect(wordHtml).toContain('אסטרטגיות מניעה והתאמות סביבתיות לתנאים מקדימים');
    expect(wordHtml).toContain('מחזקים מועדפים:');
    expect(wordHtml).toContain('לוח זמנים ותדירות חיזוק:');
    expect(wordHtml).toContain('תגובת הצוות בעת התרחשות ההתנהגות:');
    expect(wordHtml).toContain('תוכנית בטיחות והתמודדות במשבר:');
    expect(wordHtml).toContain('טבלת מעקב שוטף ולוח התקדמות');
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

    expect(markup).toContain('הסתרת פרטים');
    expect(markup).toContain('הורדת וורד');
    expect(markup).toContain('הדפסה');
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

    expect(markup).toContain('הסתרת פרטים');
    expect(markup).toContain('הורדת וורד');
    expect(markup).toContain('הדפסה');
  });
});
