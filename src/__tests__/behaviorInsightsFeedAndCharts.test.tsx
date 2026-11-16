import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getDefaultBehaviorParentQuestions,
  buildVoiceMergeText,
  buildWhatsAppShareUrl,
  getInviteQuestions
} from '../domain/parentInvite';
import {
  BaselineFrequencyBarChart,
  FunctionDistributionHorizontalBarChart,
  ProgressMonitoringDualLineChart
} from '../components/behavior/BehaviorCharts';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import { BaselineDataPoint, OngoingTrackingPoint, StudentProfile } from '../domain/types';

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

describe('Behavior Insights Feed, Parent Voice & SVG Charts Suite', () => {
  describe('Indirect Assessment & Behavior Parent Voice Domain', () => {
    it('generates 3 targeted indirect behavioral assessment questions', () => {
      const questions = getDefaultBehaviorParentQuestions({ childName: 'דניאל', gender: 'boy' });
      expect(questions.length).toBe(3);
      expect(questions[0]).toContain('באילו שעות, זמנים או מצבים בבית');
      expect(questions[1]).toContain('מה בדרך כלל עוזר לדניאל להירגע');
      expect(questions[2]).toContain('מהם הדברים, הפעילויות או החיזוקים האהובים');
    });

    it('formats WhatsApp share message specifically for behavioral assessment', () => {
      const url = buildWhatsAppShareUrl('https://tala.app/#/share-input/tok123', {
        childFirstName: 'דניאל',
        inviteType: 'behavior_parent'
      });
      expect(url).toContain('wa.me');
      expect(decodeURIComponent(url)).toContain('הערכת התפקוד ותוכנית ההתערבות ההתנהגותית של דניאל');
    });

    it('formats merge text with clean Hebrew behavioral labels', () => {
      const invite = {
        inviteType: 'behavior_parent' as const,
        responses: {
          strengths: 'שעות אחר הצהריים לקראת שיעורי בית',
          challenges: 'מוזיקה שקטה ופינת קריאה',
          goal: 'זמן לגו ובנייה'
        }
      };
      const text = buildVoiceMergeText(invite);
      expect(text).toContain('שאלון עקיף וקול ההורה לניתוח התנהגות');
      expect(text).toContain('זמנים ומצבי קושי בבית (טריגרים)');
      expect(text).toContain('גורמים מרגיעים ודרכי ויסות');
      expect(text).toContain('חיזוקים ופעילויות אהובות בעלות ערך מניע');
    });

    it('resolves invite questions for behavior_parent type without English parentheses', () => {
      const questions = getInviteQuestions({
        childName: 'רוני',
        gender: 'girl',
        inviteType: 'behavior_parent'
      });
      expect(questions.length).toBe(3);
      questions.forEach((q) => {
        expect(q.label).not.toMatch(/\([A-Za-z\s]+\)/);
      });
    });
  });

  describe('Behavioral SVG Charts Rendering & Threshold Gate', () => {
    const sampleBaselinePoints: BaselineDataPoint[] = [
      { id: 'b1', date: '2026-11-01', sessionOrPeriod: '1', value: 6 },
      { id: 'b2', date: '2026-11-02', sessionOrPeriod: '2', value: 8 },
      { id: 'b3', date: '2026-11-03', sessionOrPeriod: '3', value: 7 },
      { id: 'b4', date: '2026-11-04', sessionOrPeriod: '4', value: 9 },
      { id: 'b5', date: '2026-11-05', sessionOrPeriod: '5', value: 8 }
    ];

    it('displays threshold notice when fewer than 3 baseline points exist', () => {
      const html = renderToStaticMarkup(
        <BaselineFrequencyBarChart data={sampleBaselinePoints.slice(0, 2)} />
      );
      expect(html).toContain('הגרף יופק אוטומטית ברגע שיוזנו לפחות 3 תצפיות');
      expect(html).toContain('2 / 3');
      expect(html).not.toContain('<rect');
    });

    it('renders crisp SVG vertical bar chart with dashed average line when >= 3 points exist', () => {
      const html = renderToStaticMarkup(
        <BaselineFrequencyBarChart data={sampleBaselinePoints} />
      );
      expect(html).toContain('<svg');
      expect(html).toContain('תדירות התנהגות מטרה בשלב קו הבסיס');
      expect(html).toContain('ממוצע: 7.6');
      expect(html).toContain('stroke-dasharray="5,5"');
      expect(html).toContain('יום תצפית');
      expect(html).toContain('מספר אירועים בשיעור');
    });

    it('angles and truncates long X-axis labels to prevent overlap when descriptive session names are used', () => {
      const longLabelPoints: BaselineDataPoint[] = [
        { id: 'b1', date: '2026-11-01', sessionOrPeriod: 'מעבר צלצול בוקר', value: 6 },
        { id: 'b2', date: '2026-11-02', sessionOrPeriod: 'הפסקת עשר', value: 7 },
        { id: 'b3', date: '2026-11-03', sessionOrPeriod: 'סיום שיעור שפה', value: 5 }
      ];
      const html = renderToStaticMarkup(
        <BaselineFrequencyBarChart data={longLabelPoints} />
      );
      expect(html).toContain('rotate(36');
      expect(html).toContain('text-anchor="start"');
      expect(html).toContain('<title>מפגש מעבר צלצול בוקר</title>');
    });

    it('renders horizontal function distribution bar chart with 4 core functions', () => {
      const html = renderToStaticMarkup(
        <FunctionDistributionHorizontalBarChart
          mainFunction="escape"
          totalEvents={38}
        />
      );
      expect(html).toContain('<svg');
      expect(html).toContain('התפלגות התפקוד המשוער של ההתנהגות (מתוך 38 אירועים)');
      expect(html).toContain('הימנעות ממטלה');
      expect(html).toContain('קבלת תשומת לב');
      expect(html).toContain('גישה לפריט או פעילות');
      expect(html).toContain('ויסות חושי עצמי');
      expect(html).toContain('74%');
      expect(html).toContain('16%');
    });

    it('renders progress monitoring dual line chart when >= 3 session points exist', () => {
      const sampleOngoingPoints: OngoingTrackingPoint[] = [
        {
          id: 'o1',
          date: '2026-11-06',
          period: 'שיעור 1',
          targetBehaviorOccurrences: 5,
          replacementBehaviorUsed: 2,
          reinforcementDelivered: true
        },
        {
          id: 'o2',
          date: '2026-11-07',
          period: 'שיעור 1',
          targetBehaviorOccurrences: 4,
          replacementBehaviorUsed: 4,
          reinforcementDelivered: true
        }
      ];

      const html = renderToStaticMarkup(
        <ProgressMonitoringDualLineChart
          baselinePoints={sampleBaselinePoints}
          ongoingPoints={sampleOngoingPoints}
        />
      );
      expect(html).toContain('<svg');
      expect(html).toContain('מעקב התקדמות: קו בסיס מול שלב ההתערבות');
      expect(html).toContain('התנהגות חלופית');
      expect(html).toContain('התנהגות מאתגרת');
      expect(html).toContain('שלב קו בסיס');
      expect(html).toContain('שלב התערבות');
      expect(html).toContain('stroke="#f97316"'); // Orange challenging line
      expect(html).toContain('stroke="#3b82f6"'); // Blue replacement line
    });
  });

  describe('BehaviorAssessmentForm Insights Feed & Visual Charts Integration', () => {
    const fullStudent: StudentProfile = {
      id: 'st_full',
      name: 'אביגיל שחר',
      educationalFramework: 'בית ספר יסודי אלונים',
      behaviorAssessment: {
        assessorName: 'רונית שפירא',
        assessmentDate: '2026-11-15',
        backgroundInfo: 'רקע תקין',
        mainHypothesizedFunction: 'escape',
        targetBehaviors: [
          {
            id: 'tb_1',
            name: 'יציאה מהכיתה',
            operationalDefinition: 'קימה מהכיסא ועזיבת מרחב הלמידה ללא אישור',
            measurementType: 'frequency',
            baselineAverage: 6,
            targetGoal: 1
          }
        ],
        baselineData: [
          { id: 'b1', date: '2026-11-01', sessionOrPeriod: '1', value: 6 },
          { id: 'b2', date: '2026-11-02', sessionOrPeriod: '2', value: 8 },
          { id: 'b3', date: '2026-11-03', sessionOrPeriod: '3', value: 7 }
        ]
      },
      pedagogicalSnippets: [
        {
          id: 'snip_1',
          content: 'תצפית: כאשר מתבקשת להעתיק מהלוח מתחילה אי-שקט',
          authorName: 'מנתחת התנהגות',
          createdAt: '2026-11-10T10:00:00Z',
          sourceTitle: 'תצפית כיתתית',
          sourceType: 'teacher_note'
        }
      ]
    };

    it('renders the pedagogical insights feed and parent voice control inside BehaviorAssessmentForm', () => {
      const handleSave = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorAssessmentForm
          student={fullStudent}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      expect(html).toContain('ציר תובנות פדגוגי ומסמכי רקע');
      expect(html).toContain('קול ההורים');
      expect(html).toContain('תצפית: כאשר מתבקשת להעתיק מהלוח מתחילה אי-שקט');
    });

    it('renders visual charts in Section 3 and Section 4 inside BehaviorAssessmentForm', () => {
      const handleSave = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorAssessmentForm
          student={fullStudent}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      expect(html).toContain('תדירות התנהגות מטרה בשלב קו הבסיס');
      expect(html).toContain('התפלגות התפקוד המשוער של ההתנהגות');
    });

    it('strictly complies with Hebrew-Only Titles rule with zero English in parentheses', () => {
      const handleSave = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorAssessmentForm
          student={fullStudent}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      expect(html).not.toContain('(FBA)');
      expect(html).not.toContain('(BIP)');
      expect(html).not.toContain('(ABC)');
      expect(html).not.toContain('(Escape)');
      expect(html).not.toContain('(Attention)');
    });
  });
});
