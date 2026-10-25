import { describe, it, expect } from 'vitest';
import {
  buildDiagnosticPrompt,
  sanitizeDiagnosticIntakeResult,
  applyDiagnosticIntakeToStudent,
  extractTextFromDocx,
  extractTextFromFile
} from '../domain/diagnosticIntake';

describe('diagnosticIntake', () => {
  it('builds gender-specific prompt for diagnostic evaluation', () => {
    const promptGirl = buildDiagnosticPrompt({
      diagnosticText: 'דוח אבחון פסיכודידקטי',
      gender: 'girl',
      studentName: 'מאיה',
      planType: 'תל"א'
    });
    expect(promptGirl).toContain('התלמידה');
    expect(promptGirl).toContain('מאיה');
    expect(promptGirl).toContain('studentGeneralBackground');

    const promptBoy = buildDiagnosticPrompt({
      diagnosticText: 'דוח אבחון פסיכודידקטי',
      gender: 'boy',
      studentName: 'אורי',
      planType: 'תח"י'
    });
    expect(promptBoy).toContain('התלמיד');
    expect(promptBoy).toContain('אורי');
  });

  it('sanitizes intake result and assigns unique goal IDs', () => {
    const raw = {
      studentGeneralBackground: 'רקע קליני',
      suggestedGoals: [
        {
          environment: 'כיתה ולימודים',
          title: 'שיפור קשב',
          objectives: 'ישב 15 דקות',
          leadProfessional: 'מורת שילוב'
        }
      ]
    };
    const sanitized = sanitizeDiagnosticIntakeResult(raw, 'boy');
    expect(sanitized.studentGeneralBackground).toBe('רקע קליני');
    expect(sanitized.suggestedGoals).toHaveLength(1);
    expect(sanitized.suggestedGoals[0].id).toMatch(/^intake_g_/);
    expect(sanitized.suggestedGoals[0].leadProfessional).toBe('מורת שילוב');
  });

  it('applies selected intake goals and merges background into student', () => {
    const student = {
      name: 'איתי',
      studentGeneralBackground: 'רקע קיים',
      goals: [{ id: 'g_existing', title: 'מטרה קיימת' }]
    };

    const intake = {
      studentGeneralBackground: 'אובחן עם הפרעת קשב',
      studentSupportReceived: 'טיפול רגשי שבועי',
      suggestedGoals: [
        { id: 'intake_1', title: 'מטרה חדשה 1' },
        { id: 'intake_2', title: 'מטרה חדשה 2' }
      ]
    };

    const applied = applyDiagnosticIntakeToStudent(student, intake, ['intake_1']);
    expect(applied.studentGeneralBackground).toContain('רקע קיים');
    expect(applied.studentGeneralBackground).toContain('אובחן עם הפרעת קשב');
    expect(applied.studentSupportReceived).toBe('טיפול רגשי שבועי');
    expect(applied.goals).toHaveLength(2);
    expect(applied.goals[0].id).toBe('g_existing');
    expect(applied.goals[1].id).toBe('intake_1');
  });

  it('extractTextFromDocx handles empty buffer gracefully', async () => {
    const text = await extractTextFromDocx(null);
    expect(text).toBe('');
    const emptyBuf = new ArrayBuffer(10);
    const textEmpty = await extractTextFromDocx(emptyBuf);
    expect(textEmpty).toBe('');
  });

  it('extractTextFromFile handles text files', async () => {
    const mockFile = {
      name: 'report.txt',
      text: async () => 'דוח אבחון טקסטואלי'
    };
    const text = await extractTextFromFile(mockFile);
    expect(text).toBe('דוח אבחון טקסטואלי');
  });
});
