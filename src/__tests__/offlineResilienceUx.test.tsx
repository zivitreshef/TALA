import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import EcologicalWorkPlanForm from '../EcologicalWorkPlanForm';

vi.mock('../firebaseBackend.js', () => ({
  getFirebaseAuth: vi.fn(() => ({
    currentUser: { email: 'teacher@school.gov.il' }
  })),
  getActiveFirebaseConfig: vi.fn(() => ({ projectId: 'tala-test' })),
  reportHealthEventToCloud: vi.fn(() => Promise.resolve(true)),
  subscribeToUserPresence: vi.fn(() => () => {}),
  subscribeToStudentInvites: vi.fn(() => () => {}),
  subscribeToHealthEvents: vi.fn(() => () => {})
}));

describe('Offline Resilience & Local Engine Retirement Safeguards', () => {
  const formPath = path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx');
  const formSource = fs.readFileSync(formPath, 'utf8');

  it('completely removes confusing local engine fallback buttons from EcologicalWorkPlanForm UI', () => {
    // Buttons that misled teachers into thinking offline rule engine is AI
    expect(formSource).not.toContain('⚡ הפק במנוע מקומי');
    expect(formSource).not.toContain('⚡ מעבר לעיבוד מקומי ללא אינטרנט');
    expect(formSource).not.toContain('הפקה מקומית:');
  });

  it('includes defensive offline checks before triggering AI generation', () => {
    expect(formSource).toContain("אין חיבור לאינטרנט. הפקת יעדים ומטרות באמצעות בינה מלאכותית דורשת חיבור פעיל לרשת");
    expect(formSource).toContain("אין חיבור לאינטרנט. ניסוח הערכה פדגוגית ב-AI דורש חיבור פעיל לרשת");
    expect(formSource).toContain("אין חיבור לאינטרנט. ניסוח הערכה תקופתית ב-AI דורש חיבור פעיל לרשת");
    expect(formSource).toContain('אין חיבור לאינטרנט. הפקת דו"ח מצב ב-AI דורשת חיבור פעיל לרשת');
  });

  it('renders EcologicalWorkPlanForm safely with all new offline resilience elements', () => {
    const mockStudent = {
      id: 'student_offline_test',
      name: 'דניאל כהן',
      gender: 'boy',
      stage: 'school',
      educationalFramework: 'בית ספר ממלכתי',
      goals: []
    };

    const html = renderToStaticMarkup(
      <EcologicalWorkPlanForm
        student={mockStudent}
        currentUser={{ email: 'teacher@school.gov.il', role: 'teacher' }}
        onSaveStudentPlan={vi.fn()}
        goalBank={[]}
        onRecordGoalUsage={vi.fn()}
        onGoHome={vi.fn()}
        readOnly={false}
      />
    );

    expect(html).toContain('btn-save-progress');
    expect(html).toContain('שמור התקדמות');
  });

  it('provides explicit reassurance that local saving will sync to cloud upon reconnecting', () => {
    expect(formSource).toContain('נשמר מקומית במכשיר (יסונכרן לענן בהתחברות)');
    expect(formSource).toContain('(ממתין לסנכרון ענן)');
  });
});
