import { describe, it, expect } from 'vitest';
import {
  calculateBaselineStats,
  calculateTrackingStats,
  getBehaviorFunctionLabelHebrew,
  getMeasurementTypeLabelHebrew,
  createEmptyBehaviorAssessment,
  createEmptyBehaviorPlan
} from '../domain/behaviorAnalysis';
import {
  BaselineDataPoint,
  OngoingTrackingPoint,
  StudentProfile
} from '../domain/types';
import { AllowedUserRecord } from '../allowedUsers';

describe('Behavior Analysis Domain Model & Calculations', () => {
  describe('calculateBaselineStats', () => {
    it('returns zero values when data is empty or undefined', () => {
      expect(calculateBaselineStats()).toEqual({ count: 0, average: 0, min: 0, max: 0 });
      expect(calculateBaselineStats([])).toEqual({ count: 0, average: 0, min: 0, max: 0 });
    });

    it('accurately computes count, average, min, and max for positive values', () => {
      const sampleBaseline: BaselineDataPoint[] = [
        { id: '1', date: '2026-11-01', sessionOrPeriod: 'שיעור 1', value: 4 },
        { id: '2', date: '2026-11-02', sessionOrPeriod: 'שיעור 1', value: 8 },
        { id: '3', date: '2026-11-03', sessionOrPeriod: 'שיעור 1', value: 3 },
        { id: '4', date: '2026-11-04', sessionOrPeriod: 'שיעור 1', value: 5 }
      ];

      const stats = calculateBaselineStats(sampleBaseline);
      expect(stats.count).toBe(4);
      expect(stats.average).toBe(5); // (4 + 8 + 3 + 5) / 4 = 5.0
      expect(stats.min).toBe(3);
      expect(stats.max).toBe(8);
    });

    it('filters out invalid or negative numbers safely', () => {
      const noisyBaseline = [
        { id: '1', date: '2026-11-01', sessionOrPeriod: '1', value: 6 },
        { id: '2', date: '2026-11-02', sessionOrPeriod: '2', value: -2 }, // invalid
        { id: '3', date: '2026-11-03', sessionOrPeriod: '3', value: NaN }, // invalid
        { id: '4', date: '2026-11-04', sessionOrPeriod: '4', value: 10 }
      ] as BaselineDataPoint[];

      const stats = calculateBaselineStats(noisyBaseline);
      expect(stats.count).toBe(2);
      expect(stats.average).toBe(8);
      expect(stats.min).toBe(6);
      expect(stats.max).toBe(10);
    });
  });

  describe('calculateTrackingStats', () => {
    it('returns zero values when tracking data is empty', () => {
      const stats = calculateTrackingStats([]);
      expect(stats).toEqual({
        totalOccurrences: 0,
        averageOccurrences: 0,
        replacementSuccessRate: 0,
        reductionPercentage: 0
      });
    });

    it('accurately tracks reduction against baseline and replacement rate', () => {
      const sampleTracking: OngoingTrackingPoint[] = [
        {
          id: '1',
          date: '2026-11-10',
          period: 'בוקר',
          targetBehaviorOccurrences: 2,
          replacementBehaviorUsed: true,
          reinforcementDelivered: true
        },
        {
          id: '2',
          date: '2026-11-11',
          period: 'בוקר',
          targetBehaviorOccurrences: 1,
          replacementBehaviorUsed: true,
          reinforcementDelivered: true
        },
        {
          id: '3',
          date: '2026-11-12',
          period: 'בוקר',
          targetBehaviorOccurrences: 3,
          replacementBehaviorUsed: false,
          reinforcementDelivered: false
        },
        {
          id: '4',
          date: '2026-11-13',
          period: 'בוקר',
          targetBehaviorOccurrences: 0,
          replacementBehaviorUsed: true,
          reinforcementDelivered: true
        }
      ];

      // Total occurrences: 2 + 1 + 3 + 0 = 6
      // Average: 6 / 4 = 1.5
      // Replacement used in 3 out of 4 sessions = 75%
      // Baseline was 5.0 -> reduction = ((5.0 - 1.5) / 5.0) * 100 = 70%
      const stats = calculateTrackingStats(sampleTracking, 5.0);
      expect(stats.totalOccurrences).toBe(6);
      expect(stats.averageOccurrences).toBe(1.5);
      expect(stats.replacementSuccessRate).toBe(75);
      expect(stats.reductionPercentage).toBe(70);
    });
  });

  describe('Hebrew-Only Nomenclature & Policy Compliance', () => {
    it('provides clean Hebrew labels without any English in parentheses', () => {
      const functions = ['escape', 'attention', 'tangible', 'sensory', 'other'] as const;
      for (const fn of functions) {
        const label = getBehaviorFunctionLabelHebrew(fn);
        expect(label).toBeTruthy();
        expect(label).not.toMatch(/[a-zA-Z]/);
        expect(label).not.toMatch(/\(.*\)/);
      }

      const measurements = ['frequency', 'duration', 'interval'] as const;
      for (const m of measurements) {
        const label = getMeasurementTypeLabelHebrew(m);
        expect(label).toBeTruthy();
        expect(label).not.toMatch(/[a-zA-Z]/);
        expect(label).not.toMatch(/\(.*\)/);
      }
    });
  });

  describe('Template Initializers', () => {
    it('creates initial assessment with required structures', () => {
      const assessment = createEmptyBehaviorAssessment();
      expect(Array.isArray(assessment.targetBehaviors)).toBe(true);
      expect(Array.isArray(assessment.baselineData)).toBe(true);
      expect(assessment.mainHypothesizedFunction).toBe('escape');
      expect(assessment.updatedAt).toBeDefined();
    });

    it('creates initial intervention plan with required structures', () => {
      const plan = createEmptyBehaviorPlan();
      expect(Array.isArray(plan.targetBehaviors)).toBe(true);
      expect(Array.isArray(plan.replacementBehaviors)).toBe(true);
      expect(Array.isArray(plan.ongoingTracking)).toBe(true);
      expect(plan.reinforcementSystem).toBeDefined();
      expect(plan.reactiveProtocol).toBeDefined();
    });
  });

  describe('StudentProfile and Role Integration', () => {
    it('allows behavior_analyst role on AllowedUserRecord', () => {
      const analystUser: AllowedUserRecord = {
        id: 'u-123',
        email: 'analyst@school.org.il',
        name: 'דנה מנתחת התנהגות',
        role: 'behavior_analyst',
        passwordSalt: 'abc',
        passwordHash: 'def',
        active: true
      };
      expect(analystUser.role).toBe('behavior_analyst');
    });

    it('allows storing behavior assessment and plan on student profile', () => {
      const student: StudentProfile = {
        id: 's-1',
        name: 'יוסי',
        behaviorAssessment: createEmptyBehaviorAssessment(),
        behaviorPlan: createEmptyBehaviorPlan(),
        behaviorObservations: []
      };

      expect(student.behaviorAssessment).toBeDefined();
      expect(student.behaviorPlan).toBeDefined();
      expect(student.behaviorObservations).toEqual([]);
    });
  });
});
