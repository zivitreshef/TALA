import { describe, it, expect } from 'vitest';
import { DEFAULT_ALLOWED_USERS, verifyUserPassword } from '../allowedUsers';
import { INITIAL_BEHAVIOR_STUDENTS } from '../initialBehaviorStudents';
import { INITIAL_STUDENTS_DATA } from '../goalBankData';
import { getStudentsForUser } from '../domain/permissions';
import {
  computeHourlyHeatmapMatrix,
  computeAbcSequenceSummary,
  computeDurationAndIntensityData,
  computeReplacementSkillCurve,
  computeStaffFidelityMetrics
} from '../domain/behaviorAnalysis';

describe('Behavior Analyst Seeded Data Verification (mreshef@bmc.com)', () => {
  it('includes mreshef@bmc.com in DEFAULT_ALLOWED_USERS with behavior_analyst role', () => {
    const user = DEFAULT_ALLOWED_USERS.find(
      (u) => (u.email || '').toLowerCase() === 'mreshef@bmc.com'
    );
    expect(user).toBeDefined();
    expect(user?.role).toBe('behavior_analyst');
    expect(user?.name).toBe('מיכל דליות');
    expect(user?.title).toBe('מנתחת התנהגות מוסמכת');
    expect(user?.active).toBe(true);
    expect(verifyUserPassword(user!, 'TALA2026')).toBe(true);
  });

  it('contains exactly 3 distinct special-education students for mreshef@bmc.com', () => {
    expect(INITIAL_BEHAVIOR_STUDENTS.length).toBe(3);
    const ids = INITIAL_BEHAVIOR_STUDENTS.map((s) => s.id);
    expect(ids).toContain('st_itai_levi_aba');
    expect(ids).toContain('st_noam_sharon_aba');
    expect(ids).toContain('st_daniel_mizrahi_aba');

    INITIAL_BEHAVIOR_STUDENTS.forEach((student) => {
      expect((student.ownerEmail || '').toLowerCase()).toBe('mreshef@bmc.com');
      expect(student.status).toBe('פעיל');
      expect(student.behaviorAssessment).toBeDefined();
      expect(student.behaviorPlan).toBeDefined();
    });
  });

  it('provides at least 10 daily tracking points and 10 behavior observations for each student', () => {
    INITIAL_BEHAVIOR_STUDENTS.forEach((student) => {
      const tracking = student.behaviorPlan?.ongoingTracking;
      const observations = student.behaviorObservations;

      expect(Array.isArray(tracking)).toBe(true);
      expect(tracking.length).toBeGreaterThanOrEqual(10);

      expect(Array.isArray(observations)).toBe(true);
      expect(observations.length).toBeGreaterThanOrEqual(10);
    });
  });

  it('activates all 5 visual analytics charts for each of the 3 students', () => {
    INITIAL_BEHAVIOR_STUDENTS.forEach((student) => {
      const tracking = student.behaviorPlan?.ongoingTracking;
      const observations = student.behaviorObservations;

      // 1. Hourly Heatmap Matrix
      const heatmap = computeHourlyHeatmapMatrix(tracking, observations);
      expect(heatmap.hasData).toBe(true);
      expect(heatmap.totalOccurrences).toBeGreaterThan(0);
      expect(heatmap.peakDay).toBeDefined();

      // 2. ABC Sequence Summary
      const abc = computeAbcSequenceSummary(observations);
      expect(abc.hasData).toBe(true);
      expect(abc.totalIncidents).toBeGreaterThanOrEqual(8);
      expect(abc.dominantAntecedent).toBeDefined();
      expect(abc.dominantConsequence).toBeDefined();

      // 3. Duration & Intensity Chart
      const durationIntensity = computeDurationAndIntensityData(tracking, observations);
      expect(durationIntensity.hasData).toBe(true);
      expect(durationIntensity.points.length).toBeGreaterThanOrEqual(8);
      expect(durationIntensity.totalDurationMinutes).toBeGreaterThan(0);

      // 4. Replacement Learning Curve
      const replacementCurve = computeReplacementSkillCurve(tracking);
      expect(replacementCurve.hasData).toBe(true);
      expect(replacementCurve.totalReplacementDemonstrations).toBeGreaterThan(0);
      expect(replacementCurve.acquisitionRatePercentage).toBeGreaterThan(50);

      // 5. Staff Fidelity Meter
      const staffFidelity = computeStaffFidelityMetrics(tracking);
      expect(staffFidelity.hasData).toBe(true);
      expect(staffFidelity.totalTrackedSessions).toBeGreaterThanOrEqual(10);
      expect(staffFidelity.overallFidelityPercentage).toBeGreaterThan(70);
    });
  });

  it('correctly returns the 3 students via getStudentsForUser when logged in as mreshef@bmc.com', () => {
    const user = { email: 'mreshef@bmc.com', role: 'behavior_analyst' };
    const scopedStudents = getStudentsForUser(INITIAL_STUDENTS_DATA, user);
    expect(scopedStudents.length).toBe(3);
    const names = scopedStudents.map((s) => s.name);
    expect(names).toContain('איתי לוי');
    expect(names).toContain('נועם שרון');
    expect(names).toContain('דניאל מזרחי');
  });
});
