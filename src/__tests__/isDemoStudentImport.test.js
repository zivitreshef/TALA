import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isDemoStudent } from '../domain/onboardingJourney';

describe('EcologicalWorkPlanForm Reverse Engineering & Demo Resilience', () => {
  const formSource = fs.readFileSync(
    path.resolve(__dirname, '../EcologicalWorkPlanForm.jsx'),
    'utf8'
  );

  it('imports isDemoStudent from domain/onboardingJourney when called in the component', () => {
    expect(formSource).toContain("import { isDemoStudent } from './domain/onboardingJourney';");
    expect(typeof isDemoStudent).toBe('function');
  });

  it('correctly classifies demo vs real students using isDemoStudent', () => {
    expect(isDemoStudent({ id: 'demo_yonatan_levi' })).toBe(true);
    expect(isDemoStudent({ isDemo: true })).toBe(true);
    expect(isDemoStudent({ id: 'st_real_123', name: 'נחום כהן' })).toBe(false);
    expect(isDemoStudent(null)).toBe(false);
  });

  it('eliminates confusing WiFi-only assumptions from error and reassurance banners', () => {
    expect(formSource).not.toContain('חיבור ה-WiFi');
    expect(formSource).toContain('חיבור הרשת');
  });

  it('protects onSaveStudentPlan and recordGoalInBank with defensive try/catch blocks', () => {
    expect(formSource).toContain("[applyEngineeredPlan] onSaveStudentPlan error:");
    expect(formSource).toContain("[applyEngineeredPlan] recordGoalInBank error:");
    expect(formSource).toContain("[handleReverseEngineerFullReport] onSaveStudentPlan error:");
    expect(formSource).toContain("[handleReverseEngineerFullReport] recordGoalInBank error:");
  });
});
