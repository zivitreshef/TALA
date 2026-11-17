import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import { StudentProfile } from '../domain/types';
import { createEmptyBehaviorPlan } from '../domain/behaviorAnalysis';

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

describe('Pedagogical Feed Visibility and Intervention Plan Parity Suite', () => {
  const mockStudentWithDocs: StudentProfile = {
    id: 'stud_doc_1',
    name: 'נעם לוי',
    educationalFramework: 'בית ספר גולדה מאיר',
    diagnosticDocuments: [
      {
        id: 'doc_1',
        fileName: 'סיכום_ועדת_אפיון.pdf',
        fileType: 'application/pdf',
        fileSizeFormatted: '1.2MB',
        storageUrl: 'https://storage.test/doc1',
        storagePath: 'students/doc1.pdf',
        uploadedAt: '2026-11-10T10:00:00Z',
        extractionStatus: 'success',
        textSnippet: 'המלצה לתמיכה התנהגותית',
        fullText: 'דוח מלא של ועדת אפיון וזכאות'
      }
    ],
    pedagogicalSnippets: [
      {
        id: 'snip_1',
        sourceType: 'teacher_note',
        sourceTitle: 'תצפית יומית',
        content: 'מגלה קושי במעברים בין שיעורים',
        authorName: 'מורה שילוב',
        createdAt: '2026-11-12T09:00:00Z'
      }
    ],
    behaviorPlan: {
      ...createEmptyBehaviorPlan(),
      analystName: 'דנה שפירא',
      effectiveDate: '2026-11-17',
      antecedentStrategies: 'הטרמה של 5 דקות לפני כל מעבר',
      targetBehaviors: [
        {
          id: 'tb_1',
          name: 'צעקות בזמן מעבר',
          operationalDefinition: 'צעקות בעוצמה גבוהה במהלך מעבר בין כיתות',
          measurementType: 'frequency',
          baselineAverage: 5,
          targetGoal: 1
        }
      ]
    }
  };

  it('renders the Pedagogical Feed and background documents card inside BehaviorInterventionPlanForm', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudentWithDocs}
        currentUser={{ name: 'דנה שפירא', role: 'behavior_analyst' }}
        onSaveStudentPlan={handleSave}
      />
    );

    expect(html).toContain('ציר תובנות פדגוגי ומסמכי רקע');
    expect(html).toContain('1 תובנות ומסמכים');
    expect(html).toContain('1 מסמכי אבחון');
  });

  it('shows background document chips with preview action in collapsed state', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudentWithDocs}
        currentUser={{ name: 'דנה שפירא', role: 'behavior_analyst' }}
        onSaveStudentPlan={handleSave}
      />
    );

    expect(html).toContain('מסמכי רקע שמורים:');
    expect(html).toContain('סיכום_ועדת_אפיון.pdf');
    expect(html).toContain('צפייה');
    expect(html).toContain('פתיחת תובנות ומסמכים לעריכה והוספה');
  });

  it('strictly adheres to Hebrew-only titles with zero English in parentheses in BehaviorInterventionPlanForm', () => {
    const handleSave = vi.fn();
    const html = renderToStaticMarkup(
      <BehaviorInterventionPlanForm
        student={mockStudentWithDocs}
        currentUser={{ name: 'דנה שפירא', role: 'behavior_analyst' }}
        onSaveStudentPlan={handleSave}
      />
    );

    expect(html).not.toContain('(FBA)');
    expect(html).not.toContain('(BIP)');
    expect(html).not.toContain('(DRA)');
    expect(html).not.toContain('(DRI)');
    expect(html).not.toContain('(DRO)');
    expect(html).not.toContain('(FCT)');
  });
});
