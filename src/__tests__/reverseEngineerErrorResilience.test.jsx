import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { reverseEngineerRawTextLocally } from '../goalBankData';
import EcologicalWorkPlanForm from '../EcologicalWorkPlanForm.jsx';
import { HEALTH_EVENT_KINDS } from '../domain/healthEvents';

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

describe('Reverse Engineer AI Error Resilience & Network Glitch Safeguards', () => {
  it('renders EcologicalWorkPlanForm runtime component without errors', () => {
    const mockStudent = {
      id: 'student_resilience_test',
      name: 'רוני שחר',
      gender: 'girl',
      stage: 'school',
      educationalFramework: 'בית ספר ממלכתי',
      goals: []
    };

    expect(() => {
      renderToStaticMarkup(
        React.createElement(EcologicalWorkPlanForm, {
          student: mockStudent,
          currentUser: { email: 'teacher@school.gov.il', role: 'teacher' },
          onSaveStudentPlan: vi.fn(),
          goalBank: [],
          onRecordGoalUsage: vi.fn(),
          onGoHome: vi.fn(),
          readOnly: false
        })
      );
    }).not.toThrow();
  });

  it('declares AI_CLIENT_PROCESSING_ERROR in health event kinds for runtime reporting', () => {
    expect(HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR).toBe('ai_client_processing_error');
  });

  it('local engine synthesizes valid goals immediately when raw text is provided without internet', () => {
    const rawText = 'ילד סקרן וחברותי בכיתה א, זקוק לתיווך במעברים והתארגנות עם קלמר וספרים, מתקשה בכתיבה ממושכת.';
    const formData = {
      name: 'איתי',
      gender: 'boy',
      stage: 'school',
      educationalFramework: 'בית ספר יסודי'
    };

    const engineered = reverseEngineerRawTextLocally(rawText, formData, []);
    expect(engineered).not.toBeNull();
    expect(Array.isArray(engineered.goals)).toBe(true);
    expect(engineered.goals.length).toBeGreaterThan(0);
    expect(engineered.goals[0].title).toBeTruthy();
  });
});
