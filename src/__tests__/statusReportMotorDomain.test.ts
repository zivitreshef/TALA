import { describe, it, expect } from 'vitest';
import {
  STATUS_REPORT_SECTIONS_SCHEMA,
  generateStatusReportLocally,
  sanitizeStatusReportSections
} from '../domain/statusReportGenerator';
import { addManualStatusSection } from '../domain/workPlanEdits';

describe('Educational Status Report - Motor Domain Section (התחום המוטורי)', () => {
  it('defines the 16-section schema with Section 8 designated as תחום מוטורי', () => {
    expect(STATUS_REPORT_SECTIONS_SCHEMA).toHaveLength(16);
    const motorSchema = STATUS_REPORT_SECTIONS_SCHEMA.find((s) => s.sectionNumber === 8);
    expect(motorSchema).toBeDefined();
    expect(motorSchema?.title).toBe('תחום מוטורי');

    const independenceSchema = STATUS_REPORT_SECTIONS_SCHEMA.find((s) => s.sectionNumber === 9);
    expect(independenceSchema?.title).toBe('תפקודי עצמאות והתארגנות');

    const finalRecommendations = STATUS_REPORT_SECTIONS_SCHEMA[15];
    expect(finalRecommendations.sectionNumber).toBe(16);
    expect(finalRecommendations.title).toBe('סיכום והמלצות מקצועיות');
  });

  it('generates Section 8 locally covering gross motor, fine motor, and sensory regulation', () => {
    const studentWithMotorDetails = {
      name: 'איתי שפירא',
      gender: 'boy',
      birthDate: '2019-02-14',
      educationalFramework: 'בית ספר גולדה',
      schoolYear: 'תשפ"ז',
      planType: 'תל"א',
      teacherFreeText:
        'בתחום המוטוריקה הגסה, התלמיד מתנייד באופן עצמאי במרחב הבית-ספרי, אך מתקשה בשמירה על שיווי משקל בפעילויות ספורטיביות. בתחום המוטוריקה העדינה, ניכרת אחיזת עיפרון בשלה, אך קצב הכתיבה איטי ומלווה בהתעייפות מהירה של כף היד וקושי בגזירה במספריים. מבחינה חושית, התלמיד זקוק להפסקות תנועה יזומות במהלך השיעור כדי לשמור על ריכוז. מומלץ להמשיך בליווי של ריפוי בעיסוק.',
      goals: [
        {
          id: 'goal_motor_1',
          environment: 'סדנא ויצירה',
          title: 'שכלול מיומנויות מוטוריקה עדינה וגזירה',
          activityParticipation: 'מתקשה בגזירה עצמאית לפי קווים מוגדרים',
          midYearEvaluation: 'התקדמות יפה בשימוש במספריים מותאמים',
          achievementStatus: 'בתהליך'
        }
      ]
    };

    const sections = generateStatusReportLocally(studentWithMotorDetails);
    const motorSection = sections.find((s) => s.sectionNumber === 8);

    expect(motorSection).toBeDefined();
    expect(motorSection?.title).toBe('תחום מוטורי');
    expect(motorSection?.content).toContain('מוטוריקה גסה ושיווי משקל');
    expect(motorSection?.content).toContain('מתנייד באופן עצמאי');
    expect(motorSection?.content).toContain('מוטוריקה עדינה ותיאום עין-יד');
    expect(motorSection?.content).toContain('אחיזת עיפרון בשלה');
    expect(motorSection?.content).toContain('ויסות חושי');
    expect(motorSection?.content).toContain('הפסקות תנועה');
    expect(motorSection?.content).toContain('בסביבת "סדנא ויצירה" – התקדמות יפה בשימוש במספריים מותאמים');
  });

  it('omits Section 8 when no motor or sensory data is documented', () => {
    const studentWithoutMotorData = {
      name: 'דנה ישראלי',
      gender: 'girl',
      birthDate: '2020-04-10',
      educationalFramework: 'גן שושן',
      schoolYear: 'תשפ"ז',
      teacherFreeText: 'דנה ילדה חייכנית, משתתפת יפה במפגש ומביעה את עצמה בעושר שפתי רב.',
      studentGeneralBackground: 'שפה עשירה ויחסי גומלין חיוביים עם הצוות.'
    };

    const sections = generateStatusReportLocally(studentWithoutMotorData);
    const motorSection = sections.find((s) => s.sectionNumber === 8);
    expect(motorSection).toBeUndefined();
  });

  it('sanitizes and maps both "תחום מוטורי" and "התחום המוטורי" to canonical Section 8', () => {
    const rawWithAltTitle = [
      {
        sectionNumber: 8,
        title: 'התחום המוטורי',
        content: '• מתנייד עצמאית בבית הספר.\n• מגלה אחיזת עיפרון יציבה.'
      }
    ];

    const sanitized = sanitizeStatusReportSections(rawWithAltTitle, 'boy');
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].sectionNumber).toBe(8);
    expect(sanitized[0].title).toBe('תחום מוטורי');
    expect(sanitized[0].content).toContain('• מתנייד עצמאית בבית הספר');
  });

  it('seamlessly migrates legacy reports that saved section 8 as תפקודי עצמאות והתארגנות to Section 9', () => {
    const legacyReport = [
      {
        sectionNumber: 1,
        title: 'פרטים מזהים ורקע כללי',
        content: 'יוסי כהן, לומד בכיתה ג.'
      },
      {
        sectionNumber: 8,
        title: 'תפקודי עצמאות והתארגנות',
        content: 'עצמאי לחלוטין באכילה ובשירותים, מתארגן מהר עם תיק הלימודים.'
      },
      {
        sectionNumber: 15,
        title: 'סיכום והמלצות מקצועיות',
        content: 'מומלץ להמשיך במתן מענה שילוב שבועי.'
      }
    ];

    const migrated = sanitizeStatusReportSections(legacyReport, 'boy');
    expect(migrated).toHaveLength(3);

    // Section 1 remains 1
    expect(migrated[0].sectionNumber).toBe(1);

    // Legacy Section 8 with independence title is migrated to Section 9
    expect(migrated[1].sectionNumber).toBe(9);
    expect(migrated[1].title).toBe('תפקודי עצמאות והתארגנות');

    // Legacy Section 15 with recommendations title is migrated to Section 16
    expect(migrated[2].sectionNumber).toBe(16);
    expect(migrated[2].title).toBe('סיכום והמלצות מקצועיות');
  });

  it('supports manually adding Section 8 via addManualStatusSection', () => {
    const initialReport = {
      statusReportSections: [
        {
          id: 'sec_1',
          sectionNumber: 1,
          title: 'פרטים מזהים ורקע כללי',
          content: '• פרטי תלמיד'
        }
      ]
    };

    const withMotorAdded = addManualStatusSection(initialReport, 8);
    expect(withMotorAdded.statusReportSections).toHaveLength(2);
    const addedSec = withMotorAdded.statusReportSections.find((s) => s.sectionNumber === 8);
    expect(addedSec).toBeDefined();
    expect(addedSec?.title).toBe('תחום מוטורי');
    expect(addedSec?.content).toBe('');

    // Idempotent: trying to add Section 8 again does not duplicate it
    const duplicateAttempt = addManualStatusSection(withMotorAdded, 8);
    expect(duplicateAttempt.statusReportSections).toHaveLength(2);
  });
});
