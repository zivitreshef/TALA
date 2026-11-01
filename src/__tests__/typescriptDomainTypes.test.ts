import { describe, it, expect } from 'vitest';
import type {
  EducationalStage,
  EcologicalGoal,
  StudentProfile,
  HealthEventPayload,
  TelemetryEventEnvelope,
  TenantScope,
  UserAccount
} from '../domain/types';

describe('TypeScript Domain Types & Compiler Verification (Phase 1 & 2)', () => {
  it('correctly types a StudentProfile and its nested EcologicalGoals', () => {
    const stage: EducationalStage = 'kindergarten';
    const goal: EcologicalGoal = {
      id: 'g-101',
      domain: 'ניהול עצמי',
      environment: 'חצר',
      target: 'השתתפות במשחק חצר משותף',
      achievementStatus: 'achieved'
    };

    const student: StudentProfile = {
      id: 's-1',
      name: 'ישראל ישראלי',
      stage,
      goals: [goal]
    };

    expect(student.id).toBe('s-1');
    expect(student.stage).toBe('kindergarten');
    expect(student.goals).toHaveLength(1);
    expect(student.goals?.[0].target).toBe('השתתפות במשחק חצר משותף');
  });

  it('correctly types HealthEventPayload and TelemetryEventEnvelope contracts', () => {
    const healthPayload: HealthEventPayload = {
      kind: 'ai_proxy_error',
      operation: 'generateGoals',
      userEmail: 'teacher@matya.org.il',
      timestamp: 1730491200000,
      category: 'rate_limit',
      status: 429
    };

    const telemetryEnvelope: TelemetryEventEnvelope = {
      eventType: 'ai_client_error',
      userEmail: 'teacher@matya.org.il',
      matyaGroup: 'matya-tel-aviv',
      clientTimestamp: 1730491200000,
      payload: { code: 429 }
    };

    expect(healthPayload.kind).toBe('ai_proxy_error');
    expect(telemetryEnvelope.matyaGroup).toBe('matya-tel-aviv');
  });

  it('correctly types UserAccount with TenantScope', () => {
    const tenant: TenantScope = {
      groupId: 'g-central',
      matyaName: 'מתיא מרכז'
    };

    const user: UserAccount = {
      uid: 'user-xyz',
      email: 'coordinator@matya.org.il',
      role: 'matya_manager',
      tenant
    };

    expect(user.role).toBe('matya_manager');
    expect(user.tenant?.matyaName).toBe('מתיא מרכז');
  });
});
