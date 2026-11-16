import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createEmptyBehaviorProgressReport,
  getBehaviorProgressPeriodLabelHebrew,
  computeHourlyHeatmapMatrix,
  computeAbcSequenceSummary,
  computeDurationAndIntensityData,
  computeReplacementSkillCurve,
  computeStaffFidelityMetrics
} from '../domain/behaviorAnalysis';
import {
  buildBehaviorProgressReportWordDocumentHtml,
  buildBehaviorProgressReportPrintHtml,
  getBehaviorProgressReportTitle
} from '../export/wordAndPrintBuilders';
import BehaviorProgressReportForm from '../components/behavior/BehaviorProgressReportForm';
import {
  BehaviorObservation,
  OngoingTrackingPoint,
  StudentProfile
} from '../domain/types';

describe('Behavior Progress Report Domain & Calculations Suite', () => {
  it('creates empty progress reports for mid-year, end-year, and periodic with Hebrew labels', () => {
    const mid = createEmptyBehaviorProgressReport('mid_year');
    expect(mid.period).toBe('mid_year');
    expect(mid.reviewPeriodLabel).toContain('מחצית ראשונה');

    const end = createEmptyBehaviorProgressReport('end_year');
    expect(end.period).toBe('end_year');
    expect(end.reviewPeriodLabel).toContain('סיכום שנתי מלא');

    const periodic = createEmptyBehaviorProgressReport('periodic');
    expect(periodic.period).toBe('periodic');

    expect(getBehaviorProgressPeriodLabelHebrew('mid_year')).toBe('סיכום אמצע שנה');
    expect(getBehaviorProgressPeriodLabelHebrew('end_year')).toBe('סיכום סוף שנה');
    expect(getBehaviorProgressPeriodLabelHebrew('periodic')).toBe('דוח התקדמות תקופתי');
  });

  describe('1. computeHourlyHeatmapMatrix (מפת פיזור שעתית)', () => {
    it('returns hasData: false when no tracking or observations exist', () => {
      const result = computeHourlyHeatmapMatrix([], []);
      expect(result.hasData).toBe(false);
      expect(result.totalOccurrences).toBe(0);
      expect(result.cells).toHaveLength(36); // 6 days x 6 periods
    });

    it('aggregates occurrences correctly across days and periods and detects peaks', () => {
      // 2026-11-10 is a Tuesday (Day index 2 in JS getDay)
      // 2026-11-11 is a Wednesday (Day index 3)
      const tracking: OngoingTrackingPoint[] = [
        {
          id: 't1',
          date: '2026-11-10',
          period: 'שיעור 2',
          targetBehaviorOccurrences: 4,
          replacementBehaviorUsed: false,
          reinforcementDelivered: true
        },
        {
          id: 't2',
          date: '2026-11-10',
          period: 'שיעור 2',
          targetBehaviorOccurrences: 3,
          replacementBehaviorUsed: true,
          reinforcementDelivered: true
        },
        {
          id: 't3',
          date: '2026-11-11',
          period: 'שיעור 4',
          targetBehaviorOccurrences: 1,
          replacementBehaviorUsed: true,
          reinforcementDelivered: false
        }
      ];

      const result = computeHourlyHeatmapMatrix(tracking);
      expect(result.hasData).toBe(true);
      expect(result.totalOccurrences).toBe(8);
      expect(result.maxCellOccurrences).toBe(7); // 4 + 3 on Tuesday Period 2
      expect(result.peakDay).toBe('שלישי');
      expect(result.peakPeriod).toBe('שיעור 2');
    });
  });

  describe('2. computeAbcSequenceSummary (רצף תנאי מקדים-התנהגות-תוצאה)', () => {
    it('returns hasData: false when observations have no antecedent or consequence', () => {
      const result = computeAbcSequenceSummary([]);
      expect(result.hasData).toBe(false);
      expect(result.rows).toHaveLength(0);
    });

    it('cross-tabulates antecedents vs consequences and computes percentages', () => {
      const sampleObs: BehaviorObservation[] = [
        {
          id: 'o1',
          timestamp: 1000,
          dateTime: '2026-11-10 09:00',
          location: 'כיתה',
          activity: 'חשבון',
          antecedent: 'דרישה למשימה עצמאית',
          behavior: 'השלכת מחברת ויציאה מהכיתה',
          intensity: 'moderate',
          consequence: 'יציאה למרחב שליו',
          perceivedFunction: 'escape'
        },
        {
          id: 'o2',
          timestamp: 2000,
          dateTime: '2026-11-11 10:00',
          location: 'כיתה',
          activity: 'שפה',
          antecedent: 'דרישה למשימה עצמאית',
          behavior: 'השלכת מחברת',
          intensity: 'mild',
          consequence: 'יציאה למרחב שליו',
          perceivedFunction: 'escape'
        },
        {
          id: 'o3',
          timestamp: 3000,
          dateTime: '2026-11-12 11:00',
          location: 'חצר',
          activity: 'הפסקה',
          antecedent: 'הפסד במשחק כדורגל',
          behavior: 'צעקות על חברים',
          intensity: 'severe',
          consequence: 'תיווך מורה תורנית',
          perceivedFunction: 'attention'
        }
      ];

      const result = computeAbcSequenceSummary(sampleObs);
      expect(result.hasData).toBe(true);
      expect(result.totalIncidents).toBe(3);
      expect(result.rows).toHaveLength(2);
      expect(result.dominantAntecedent).toBe('דרישה למשימה עצמאית');
      expect(result.dominantConsequence).toBe('יציאה למרחב שליו');

      const topRow = result.rows[0];
      expect(topRow.antecedent).toBe('דרישה למשימה עצמאית');
      expect(topRow.count).toBe(2);
      expect(topRow.percentage).toBe(67);
    });
  });

  describe('3. computeDurationAndIntensityData (משך ועוצמת אירוע)', () => {
    it('returns hasData: false when points have no duration or high intensity', () => {
      const result = computeDurationAndIntensityData([], []);
      expect(result.hasData).toBe(false);
      expect(result.points).toHaveLength(0);
    });

    it('calculates average, peak, and total duration minutes correctly', () => {
      const tracking: OngoingTrackingPoint[] = [
        {
          id: 'p1',
          date: '2026-11-01',
          period: 'שיעור 1',
          targetBehaviorOccurrences: 1,
          replacementBehaviorUsed: false,
          reinforcementDelivered: false,
          durationMinutes: 20
        },
        {
          id: 'p2',
          date: '2026-11-02',
          period: 'שיעור 3',
          targetBehaviorOccurrences: 1,
          replacementBehaviorUsed: false,
          reinforcementDelivered: true,
          durationMinutes: 10
        }
      ];

      const result = computeDurationAndIntensityData(tracking);
      expect(result.hasData).toBe(true);
      expect(result.totalDurationMinutes).toBe(30);
      expect(result.averageDurationMinutes).toBe(15);
      expect(result.maxDurationMinutes).toBe(20);
      expect(result.points).toHaveLength(2);
    });
  });

  describe('4. computeReplacementSkillCurve (עקומת למידה מצטברת)', () => {
    it('returns hasData: false when replacement was never demonstrated', () => {
      const tracking: OngoingTrackingPoint[] = [
        {
          id: '1',
          date: '2026-11-01',
          period: '1',
          targetBehaviorOccurrences: 2,
          replacementBehaviorUsed: false,
          reinforcementDelivered: false
        }
      ];
      const result = computeReplacementSkillCurve(tracking);
      expect(result.hasData).toBe(false);
      expect(result.totalReplacementDemonstrations).toBe(0);
    });

    it('builds a monotonically non-decreasing cumulative curve', () => {
      const tracking: OngoingTrackingPoint[] = [
        { id: '1', date: '2026-11-01', period: '1', targetBehaviorOccurrences: 2, replacementBehaviorUsed: true, reinforcementDelivered: true },
        { id: '2', date: '2026-11-02', period: '2', targetBehaviorOccurrences: 1, replacementBehaviorUsed: false, reinforcementDelivered: true },
        { id: '3', date: '2026-11-03', period: '1', targetBehaviorOccurrences: 0, replacementBehaviorUsed: true, reinforcementDelivered: true },
        { id: '4', date: '2026-11-04', period: '3', targetBehaviorOccurrences: 1, replacementBehaviorUsed: true, reinforcementDelivered: true }
      ];

      const result = computeReplacementSkillCurve(tracking);
      expect(result.hasData).toBe(true);
      expect(result.totalReplacementDemonstrations).toBe(3);
      expect(result.acquisitionRatePercentage).toBe(75);
      expect(result.points).toHaveLength(4);
      expect(result.points[0].cumulativeCount).toBe(1);
      expect(result.points[1].cumulativeCount).toBe(1);
      expect(result.points[2].cumulativeCount).toBe(2);
      expect(result.points[3].cumulativeCount).toBe(3);
    });
  });

  describe('5. computeStaffFidelityMetrics (נאמנות יישום הצוות)', () => {
    it('computes fidelity percentage and high fidelity badge', () => {
      const tracking: OngoingTrackingPoint[] = [
        { id: '1', date: '2026-11-01', period: 'שיעור 1', targetBehaviorOccurrences: 1, replacementBehaviorUsed: true, reinforcementDelivered: true },
        { id: '2', date: '2026-11-02', period: 'שיעור 1', targetBehaviorOccurrences: 1, replacementBehaviorUsed: true, reinforcementDelivered: true },
        { id: '3', date: '2026-11-03', period: 'שיעור 2', targetBehaviorOccurrences: 1, replacementBehaviorUsed: true, reinforcementDelivered: true },
        { id: '4', date: '2026-11-04', period: 'שיעור 2', targetBehaviorOccurrences: 1, replacementBehaviorUsed: false, reinforcementDelivered: false },
        { id: '5', date: '2026-11-05', period: 'שיעור 3', targetBehaviorOccurrences: 0, replacementBehaviorUsed: true, reinforcementDelivered: true }
      ];

      const result = computeStaffFidelityMetrics(tracking);
      expect(result.hasData).toBe(true);
      expect(result.totalTrackedSessions).toBe(5);
      expect(result.reinforcedSessions).toBe(4);
      expect(result.overallFidelityPercentage).toBe(80);
      expect(result.ratingLabel).toBe('נאמנות גבוהה ועקבית');
      expect(result.periodBreakdowns).toHaveLength(3);
    });
  });
});

describe('Behavior Progress Report Document Export & Print', () => {
  const sampleStudent: StudentProfile = {
    id: 'st_123',
    name: 'יונתן כהן',
    idNumber: '321654987',
    birthDate: '2016-04-12',
    educationalFramework: 'בית ספר אלונים',
    schoolYear: 'תשפ״ו',
    behaviorProgressReport: {
      period: 'mid_year',
      reportDate: '2026-11-15',
      assessorName: 'רוני מנתחת התנהגות',
      reviewPeriodLabel: 'מחצית ראשונה (ספטמבר - ינואר)',
      executiveSummary: 'במחצית הראשונה נצפתה התקדמות משמעותית בהפחתת התנהגויות הימנעות.',
      targetBehaviorsProgress: [
        {
          id: 't1',
          behaviorName: 'יציאה מהכיתה ללא רשות',
          baselineAverage: 6.5,
          currentAverage: 2.1,
          reductionPercent: 68,
          trend: 'improving',
          statusNotes: 'הפחתה יפה ועקבית'
        }
      ],
      replacementBehaviorsAcquisition: [
        {
          id: 'r1',
          skillName: 'בקשת כרטיס הפוגה',
          masteryLevel: 'עצמאי לחלוטין',
          acquisitionNotes: 'משתמש בכרטיס באופן עצמאי ב-80% מהשיעורים'
        }
      ],
      environmentalAdjustments: 'ארגון מקום ישיבה ליד דלת הכיתה ולוח זמנים חזותי.',
      staffFidelityObservations: 'צוות הכיתה מיישם את מתן החיזוק בעקביות גבוהה.',
      recommendations: 'להמשיך בתוכנית תוך דילול הדרגתי של החיזוקים.'
    }
  };

  it('generates valid Word document HTML with Hebrew-only titles and correct sections', () => {
    const html = buildBehaviorProgressReportWordDocumentHtml(sampleStudent, false);
    expect(html).toContain('דוח סיכום והערכת התקדמות התנהגותית - אמצע שנה');
    expect(html).toContain('יונתן כהן');
    expect(html).toContain('321654987');
    expect(html).toContain('יציאה מהכיתה ללא רשות');
    expect(html).toContain('68%');
    expect(html).toContain('בקשת כרטיס הפוגה');
    expect(html).toContain('עצמאי לחלוטין');
    expect(html).toContain('חתימת מנתחת התנהגות');
    expect(html).not.toMatch(/\([A-Za-z0-9\s_-]+\)/); // strictly no English in parentheses
  });

  it('generates valid Print HTML with proper metadata and formatting', () => {
    const printHtml = buildBehaviorProgressReportPrintHtml(sampleStudent, false);
    expect(printHtml).toContain('<!DOCTYPE html>');
    expect(printHtml).toContain('dir="rtl"');
    expect(printHtml).toContain('דוח סיכום והערכת התקדמות התנהגותית - אמצע שנה');
    expect(printHtml).toContain('יציאה מהכיתה ללא רשות');
    expect(printHtml).toContain('בקשת כרטיס הפוגה');
    expect(printHtml).toContain('חתימת מחנכת הכיתה');
  });

  it('honors title function for mid-year, end-year and periodic', () => {
    expect(getBehaviorProgressReportTitle('mid_year')).toBe('דוח סיכום והערכת התקדמות התנהגותית - אמצע שנה');
    expect(getBehaviorProgressReportTitle('end_year')).toBe('דוח סיכום והערכת התקדמות התנהגותית - סוף שנה');
    expect(getBehaviorProgressReportTitle('periodic')).toBe('דוח סיכום והערכת התקדמות התנהגותית תקופתי');
  });
});

describe('BehaviorProgressReportForm Component UI', () => {
  it('renders report form with action buttons, period controls and all core sections', () => {
    const student: StudentProfile = {
      id: 'st_test',
      name: 'דניאל ישראלי',
      behaviorPlan: {
        targetBehaviors: [{ id: 'b1', name: 'התפרצויות זעם', baselineAverage: 5, operationalDefinition: 'צעקות ובכי', measurementType: 'frequency' }],
        replacementBehaviors: [{ replacementSkill: 'טכניקת נשימות', teachingStrategies: 'הדגמה' }],
        ongoingTracking: [
          {
            id: 'tk1',
            date: '2026-11-10',
            period: 'שיעור 1',
            targetBehaviorOccurrences: 2,
            replacementBehaviorUsed: true,
            reinforcementDelivered: true,
            durationMinutes: 15
          }
        ],
        antecedentStrategies: '',
        reinforcementSystem: { preferredReinforcers: '', scheduleOfReinforcement: '' },
        reactiveProtocol: { staffResponse: '' }
      },
      behaviorObservations: [
        {
          id: 'o1',
          timestamp: Date.now(),
          dateTime: '2026-11-10 08:30',
          location: 'כיתה',
          activity: 'שיעור 1',
          antecedent: 'מעבר לשיעור',
          behavior: 'סירוב להיכנס',
          intensity: 'moderate',
          durationMinutes: 15,
          consequence: 'תיווך מורה',
          perceivedFunction: 'escape'
        }
      ]
    };

    const mockSave = vi.fn();

    const html = renderToStaticMarkup(
      <BehaviorProgressReportForm
        student={student}
        currentUser={{ name: 'שירה מנתחת', email: 'shira@school.org', role: 'behavior_analyst' }}
        onSaveStudentPlan={mockSave}
      />
    );

    // Verify title and main action buttons
    expect(html).toContain('דוח סיכום והערכת התקדמות התנהגותית');
    expect(html).toContain('שמור דוח');
    expect(html).toContain('הדפס');
    expect(html).toContain('ייצא לוורד');
    expect(html).toContain('שלח במייל');
    expect(html).toContain('תצוגת מסמך');

    // Verify period selector buttons
    expect(html).toContain('סיכום אמצע שנה');
    expect(html).toContain('סיכום סוף שנה');
    expect(html).toContain('דוח תקופתי');

    // Verify all 8 core sections exist in the output
    expect(html).toContain('פרטי הדוח והתקופה');
    expect(html).toContain('תמצית מנהלים והערכת התקדמות כללית');
    expect(html).toContain('מעקב והתקדמות בהתנהגויות המטרה');
    expect(html).toContain('רכישת מיומנויות והתנהגויות חלופיות');
    expect(html).toContain('ניתוחים חזותיים מתקדמים');
    expect(html).toContain('התאמות סביבתיות ונהלי צוות');
    expect(html).toContain('נאמנות יישום ועקביות הצוות');
    expect(html).toContain('המלצות להמשך תוכנית ההתערבות וישיבות רב-מקצועיות');

    // Verify the 5 conditional visualizations render because data exists
    expect(html).toContain('מפת פיזור שעתית לאורך ימות השבוע');
    expect(html).toContain('טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית');
    expect(html).toContain('גרף משך זמן ועוצמת אירוע');
    expect(html).toContain('עקומת למידה מצטברת של מיומנות חלופית');
    expect(html).toContain('טבלת נאמנות יישום של צוות בית הספר');
    // Verify enterprise design system classes and card architecture
    expect(html).toContain('progress-report-container');
    expect(html).toContain('progress-form-header');
    expect(html).toContain('progress-card');
    expect(html).toContain('progress-card-header');
    expect(html).toContain('progress-card-body');
    expect(html).toContain('progress-section-badge');
    expect(html).toContain('progress-textarea');
    expect(html).toContain('progress-input');
    expect(html).toContain('progress-bottom-bar');
    expect(html).toContain('btn-progress-primary');
    expect(html).toContain('btn-progress-secondary');
    expect(html).toContain('btn-progress-word');
  });

  it('omits conditional charts when student has zero tracking points or observations', () => {
    const emptyStudent: StudentProfile = {
      id: 'st_empty',
      name: 'רוני בדיקה',
      behaviorPlan: {
        targetBehaviors: [],
        replacementBehaviors: [],
        ongoingTracking: [],
        antecedentStrategies: '',
        reinforcementSystem: { preferredReinforcers: '', scheduleOfReinforcement: '' },
        reactiveProtocol: { staffResponse: '' }
      },
      behaviorObservations: []
    };

    const html = renderToStaticMarkup(
      <BehaviorProgressReportForm
        student={emptyStudent}
        onSaveStudentPlan={vi.fn()}
      />
    );

    // Form renders cleanly
    expect(html).toContain('דוח סיכום והערכת התקדמות התנהגותית');
    // None of the 5 charts should be present in the HTML
    expect(html).not.toContain('מפת פיזור שעתית לאורך ימות השבוע');
    expect(html).not.toContain('טבלת רצף תנאי מקדים, התנהגות ותוצאה סביבתית');
    expect(html).not.toContain('גרף משך זמן ועוצמת אירוע');
    expect(html).not.toContain('עקומת למידה מצטברת של מיומנות חלופית');
    expect(html).not.toContain('טבלת נאמנות יישום של צוות בית הספר');
  });
});
