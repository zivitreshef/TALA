import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  HEALTH_EVENT_KINDS,
  HEALTH_KIND_LABELS_HE,
  classifyAiError,
  buildHealthEvent
} from '../domain/healthEvents';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';
import { reportHealthEvent } from '../services/healthTelemetry';
import { usageTelemetryService } from '../services/usageTelemetryService';
import * as firebaseBackend from '../firebaseBackend.js';
import { reverseEngineerRawTextLocally } from '../goalBankData.js';
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

describe('AI Client Processing Error Telemetry & Runtime Resilience Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('classifies client-side ReferenceError and TypeError into client_code_error category', () => {
    const refError = new ReferenceError('isDemoStudent is not defined');
    const typeError = new TypeError('Cannot read properties of undefined');

    const classifiedRef = classifyAiError(refError);
    expect(classifiedRef.category).toBe('client_code_error');
    expect(classifiedRef.message).toContain('isDemoStudent is not defined');

    const classifiedType = classifyAiError(typeError);
    expect(classifiedType.category).toBe('client_code_error');
  });

  it('builds a health event with kind AI_CLIENT_PROCESSING_ERROR and notifies admin with operation details', () => {
    const err = new ReferenceError('isDemoStudent is not defined');
    const event = buildHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR,
      operation: 'reverseEngineerFullReport',
      error: err,
      user: { email: 'teacher@school.gov.il' },
      extra: {
        stage: 'school',
        promptLength: 420,
        errorMessage: err.message
      }
    });

    expect(event.kind).toBe(HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR);
    expect(event.operation).toBe('reverseEngineerFullReport');
    expect(event.category).toBe('client_code_error');
    expect(event.userEmail).toBe('teacher@school.gov.il');
    expect(HEALTH_KIND_LABELS_HE[event.kind]).toBe('שגיאת עיבוד AI בקליינט');
  });

  it('dispatches reportHealthEvent and usageTelemetry on client-side AI processing exceptions', async () => {
    const telemetrySpy = vi.spyOn(usageTelemetryService, 'track');

    const runtimeError = new ReferenceError('isDemoStudent is not defined');

    // Simulate what the catch block in EcologicalWorkPlanForm executes
    reportHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR,
      operation: 'reverseEngineerFullReport',
      error: runtimeError,
      extra: {
        stage: 'school',
        promptLength: 250,
        errorMessage: runtimeError.message
      }
    });

    usageTelemetryService.track(TELEMETRY_EVENTS.CLIENT_JS_ERROR, {
      errorType: runtimeError.name,
      operation: 'reverseEngineerFullReport'
    });

    expect(firebaseBackend.reportHealthEventToCloud).toHaveBeenCalledTimes(1);
    const sentEvent = vi.mocked(firebaseBackend.reportHealthEventToCloud).mock.calls[0][0];
    expect(sentEvent.kind).toBe(HEALTH_EVENT_KINDS.AI_CLIENT_PROCESSING_ERROR);
    expect(sentEvent.category).toBe('client_code_error');

    expect(telemetrySpy).toHaveBeenCalledWith(
      TELEMETRY_EVENTS.CLIENT_JS_ERROR,
      expect.objectContaining({
        errorType: 'ReferenceError',
        operation: 'reverseEngineerFullReport'
      })
    );
  });

  it('renders EcologicalWorkPlanForm runtime component without throwing ReferenceError', () => {
    const mockStudent = {
      id: 'student_runtime_test',
      name: 'יונתן כהן',
      gender: 'boy',
      stage: 'school',
      educationalFramework: 'בית ספר יסודי',
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

  it('executes reverseEngineerRawTextLocally on actual text returning valid goals without runtime errors', () => {
    const raw = 'יונתן תלמיד כיתה ב, מתקשה בכתיבה וארגון מחברת, אוהב דינוזאורים ומפגין יכולת מילולית גבוהה.';
    const formData = {
      id: 'demo_1',
      name: 'יונתן',
      gender: 'boy',
      stage: 'school'
    };

    const result = reverseEngineerRawTextLocally(raw, formData, []);
    expect(result).toBeDefined();
    expect(Array.isArray(result.goals)).toBe(true);
    expect(result.goals.length).toBeGreaterThan(0);
    expect(result.goals[0].title).toBeTruthy();
  });
});
