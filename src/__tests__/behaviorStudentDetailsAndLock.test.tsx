import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BehaviorStudentDetailsCard from '../components/behavior/BehaviorStudentDetailsCard';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import { StudentProfile } from '../domain/types';

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

describe('Behavior Forms Student Details, Locking & Team Collaboration Suite', () => {
  const sampleStudent: StudentProfile = {
    id: 'st_101',
    name: 'ליאור כהן',
    idNumber: '123456789',
    birthDate: '12/04/2015',
    educationalFramework: 'בית ספר יסודי רימונים',
    schoolYear: 'תשפ"ו',
    reportDate: '15/11/2026',
    address: 'הרצל 15, תל אביב',
    phone: '054-1234567',
    schoolName: 'רימונים',
    gradeClass: 'ד\'2',
    educatorName: 'מיכל לוי',
    assistantName: 'שירה רון',
    educationalCounselor: 'תמר ברק',
    supportTeacher: 'דנה שחר',
    psychologistName: 'ד"ר עמית גל',
    otherStaff: 'יוסי פז (קלינאי תקשורת)',
    behaviorAssessment: {
      assessorName: 'רונית שפירא',
      assessmentDate: '2026-11-15',
      backgroundInfo: 'רקע תקין',
      isLocked: false,
      targetBehaviors: [
        {
          id: 'target_1',
          name: 'עזיבת מקום',
          operationalDefinition: 'יציאה מהכיתה ללא רשות',
          measurementType: 'frequency',
          baselineAverage: 5,
          targetGoal: 1
        }
      ],
      baselineData: [
        { id: 'b_1', date: '2026-11-01', sessionOrPeriod: 'שיעור 1', value: 5 }
      ],
      antecedentAnalysis: 'מטלות כתיבה עצמאית',
      mainHypothesizedFunction: 'escape',
      functionalHypothesisNarrative: 'התלמיד קם מהכיסא על מנת להימנע ממטלת כתיבה',
      initialRecommendations: 'מתן כרטיסיית הפסקה'
    },
    behaviorPlan: {
      analystName: 'רונית שפירא',
      effectiveDate: '2026-11-15',
      reviewDate: '2026-12-15',
      isLocked: false,
      targetBehaviors: [
        {
          id: 'target_1',
          name: 'עזיבת מקום',
          operationalDefinition: 'יציאה מהכיתה ללא רשות',
          measurementType: 'frequency',
          baselineAverage: 5,
          targetGoal: 1
        }
      ],
      replacementBehaviors: [
        {
          replacementSkill: 'בקשת הפסקה',
          teachingStrategies: 'שימוש בכרטיסייה חזותית'
        }
      ],
      antecedentStrategies: 'הפחתת אורך משימות',
      reinforcementSystem: {
        preferredReinforcers: 'זמן משחק',
        scheduleOfReinforcement: 'חיזוק מיידי'
      },
      reactiveProtocol: {
        staffResponse: 'הפניה שקטה'
      },
      ongoingTracking: []
    }
  };

  const donorStudent: StudentProfile = {
    id: 'st_donor',
    name: 'תלמיד תורם צוות',
    educationalFramework: 'בית ספר יסודי רימונים',
    schoolName: 'רימונים',
    gradeClass: 'ד\'2',
    educatorName: 'מיכל לוי',
    assistantName: 'שירה רון'
  };

  describe('BehaviorStudentDetailsCard Component', () => {
    it('renders all core demographic fields and values', () => {
      const handleChange = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorStudentDetailsCard
          studentData={sampleStudent}
          allStudents={[sampleStudent, donorStudent]}
          onChangeField={handleChange}
          disabled={false}
        />
      );

      expect(html).toContain('פרטי התלמיד והמסגרת החינוכית');
      expect(html).toContain('ליאור כהן');
      expect(html).toContain('123456789');
      expect(html).toContain('12/04/2015');
      expect(html).toContain('בית ספר יסודי רימונים');
      expect(html).toContain('תשפ&quot;ו');
      expect(html).toContain('15/11/2026');
      expect(html).toContain('הרצל 15, תל אביב');
      expect(html).toContain('054-1234567');
    });

    it('disables all inputs when disabled prop is true', () => {
      const handleChange = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorStudentDetailsCard
          studentData={sampleStudent}
          onChangeField={handleChange}
          disabled={true}
        />
      );

      expect(html).toContain('disabled=""');
    });

    it('renders collapsible additional info and team section with clean Hebrew labels', () => {
      const handleChange = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorStudentDetailsCard
          studentData={sampleStudent}
          onChangeField={handleChange}
          disabled={false}
        />
      );

      expect(html).toContain('מידע נוסף וצוות חינוכי');
      // Verify no English in parentheses
      expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
    });
  });

  describe('BehaviorAssessmentForm Locking & Student Details Integration', () => {
    it('renders the lock button and BehaviorStudentDetailsCard inside the assessment form', () => {
      const handleSave = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorAssessmentForm
          student={sampleStudent}
          allStudents={[sampleStudent, donorStudent]}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      expect(html).toContain('פרטי התלמיד והמסגרת החינוכית');
      expect(html).toContain('btn-report-lock-icon');
      expect(html).toContain('נעילת המסמך לעריכה');
      expect(html).toContain('btn-save-progress');
      expect(html).toContain('שמור התקדמות');
      expect(html).toContain('הדפסה וייצוא');
      expect(html).not.toContain('מסמך זה נעול לעריכה');
    });

    it('renders locked banner and disables inputs when isLocked is true', () => {
      const lockedStudent: StudentProfile = {
        ...sampleStudent,
        behaviorAssessment: {
          ...sampleStudent.behaviorAssessment!,
          isLocked: true,
          lockedAt: '2026-11-15T10:00:00Z',
          lockedBy: 'רונית שפירא'
        }
      };

      const handleSave = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorAssessmentForm
          student={lockedStudent}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      expect(html).toContain('btn-report-lock-icon locked');
      expect(html).toContain('המסמך נעול לעריכה');
      expect(html).toContain('מסמך זה נעול לעריכה');
      expect(html).toContain('רונית שפירא');
      expect(html).toContain('disabled=""');
    });
  });

  describe('BehaviorInterventionPlanForm Locking & Student Details Integration', () => {
    it('renders the lock button and BehaviorStudentDetailsCard inside the intervention plan form', () => {
      const handleSave = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorInterventionPlanForm
          student={sampleStudent}
          allStudents={[sampleStudent, donorStudent]}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      expect(html).toContain('פרטי התלמיד והמסגרת החינוכית');
      expect(html).toContain('btn-report-lock-icon');
      expect(html).toContain('נעילת המסמך לעריכה');
      expect(html).toContain('btn-save-progress');
      expect(html).toContain('שמור התקדמות');
      expect(html).toContain('הדפסה וייצוא');
      expect(html).not.toContain('מסמך זה נעול לעריכה');
    });

    it('renders locked banner and disables inputs when isLocked is true on behaviorPlan', () => {
      const lockedStudent: StudentProfile = {
        ...sampleStudent,
        behaviorPlan: {
          ...sampleStudent.behaviorPlan!,
          isLocked: true,
          lockedAt: '2026-11-15T10:00:00Z',
          lockedBy: 'רונית שפירא'
        }
      };

      const handleSave = vi.fn();
      const html = renderToStaticMarkup(
        <BehaviorInterventionPlanForm
          student={lockedStudent}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      expect(html).toContain('btn-report-lock-icon locked');
      expect(html).toContain('המסמך נעול לעריכה');
      expect(html).toContain('מסמך זה נעול לעריכה');
      expect(html).toContain('רונית שפירא');
      expect(html).toContain('disabled=""');
    });

    it('renders teacher-grade unified export dropdown and save button on both behavior forms', () => {
      const handleSave = vi.fn();
      const assessmentHtml = renderToStaticMarkup(
        <BehaviorAssessmentForm
          student={sampleStudent}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      const planHtml = renderToStaticMarkup(
        <BehaviorInterventionPlanForm
          student={sampleStudent}
          currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst' }}
          onSaveStudentPlan={handleSave}
        />
      );

      // Both forms use teacher-standard action classes
      expect(assessmentHtml).toContain('btn-save-progress');
      expect(assessmentHtml).toContain('שמור התקדמות');
      expect(assessmentHtml).toContain('btn-export-dropdown');
      expect(assessmentHtml).toContain('הדפסה וייצוא');
      expect(assessmentHtml).toContain('סיוע בינה מלאכותית');
      expect(assessmentHtml).toContain('btn-report-lock-icon');

      expect(planHtml).toContain('btn-save-progress');
      expect(planHtml).toContain('שמור התקדמות');
      expect(planHtml).toContain('btn-export-dropdown');
      expect(planHtml).toContain('הדפסה וייצוא');
      expect(planHtml).toContain('סיוע בינה מלאכותית');
      expect(planHtml).toContain('btn-report-lock-icon');
    });
  });
});
