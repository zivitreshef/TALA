import { describe, it, expect } from 'vitest';
import {
  calculateBaselineStats,
  calculateTrackingStats,
  getBehaviorFunctionLabelHebrew,
  getMeasurementTypeLabelHebrew,
  createEmptyBehaviorAssessment,
  createEmptyBehaviorPlan,
  computeBehaviorStudentReadiness,
  computeBehaviorReadinessSummary,
  filterStudentsByBehaviorReadiness
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

  describe('Behavior Readiness Evaluation Suite', () => {
    it('returns missing status and all missing tags when student is empty', () => {
      const info = computeBehaviorStudentReadiness(null);
      expect(info.status).toBe('missing');
      expect(info.hasTargetBehaviors).toBe(false);
      expect(info.hasBaselineData).toBe(false);
      expect(info.hasFunctionalHypothesis).toBe(false);
      expect(info.hasReplacementBehaviors).toBe(false);
      expect(info.hasOngoingTracking).toBe(false);
      expect(info.missingTags).toContain('חסר בייסליין');
    });

    it('returns partial status when only assessment targets exist without baseline or hypothesis', () => {
      const student = {
        id: 's-partial',
        name: 'דן',
        behaviorAssessment: {
          targetBehaviors: [{ id: 't1', name: 'קימה מהכיסא', behaviorDescription: 'קם ללא רשות' }],
          baselineData: []
        }
      };
      const info = computeBehaviorStudentReadiness(student);
      expect(info.status).toBe('partial');
      expect(info.hasTargetBehaviors).toBe(true);
      expect(info.targetBehaviorsCount).toBe(1);
      expect(info.hasBaselineData).toBe(false);
      expect(info.missingTags).toContain('חסר בייסליין');
    });

    it('returns ready status when all 4 core pillars are satisfied', () => {
      const student = {
        id: 's-ready',
        name: 'עומר',
        behaviorAssessment: {
          targetBehaviors: [{ id: 't1', name: 'התפרצות קולית' }],
          baselineData: [{ value: 5, date: '2026-11-01' }],
          functionalHypothesisNarrative: 'ההתנהגות מתרחשת כדי לקבל תשומת לב',
          mainHypothesizedFunction: 'attention' as const
        },
        behaviorPlan: {
          replacementBehaviors: [
            { replacementSkill: 'הרמת כרטיסיה', teachingStrategies: 'חיזוק דיפרנציאלי' }
          ],
          antecedentStrategies: 'הקדמת תשומת לב יזומה',
          ongoingTracking: [
            { id: 'trk-1', date: '2026-11-10', targetBehaviorOccurrences: 2, replacementBehaviorUsed: true, period: '1', reinforcementDelivered: true }
          ]
        }
      };

      const info = computeBehaviorStudentReadiness(student);
      expect(info.status).toBe('ready');
      expect(info.hasTargetBehaviors).toBe(true);
      expect(info.hasBaselineData).toBe(true);
      expect(info.hasFunctionalHypothesis).toBe(true);
      expect(info.hasReplacementBehaviors).toBe(true);
      expect(info.hasOngoingTracking).toBe(true);
      expect(info.missingTags).toHaveLength(0);
    });

    it('considers locked assessment or plan as satisfying ongoing tracking pillar', () => {
      const student = {
        id: 's-locked',
        name: 'רוני',
        behaviorAssessment: {
          targetBehaviors: [{ id: 't1', name: 'סירוב' }],
          baselineData: [{ value: 3, date: '2026-11-02' }],
          functionalHypothesisNarrative: 'בריחה מקושי לימודי'
        },
        behaviorPlan: {
          replacementBehaviors: [{ replacementSkill: 'בקשת הפסקה', teachingStrategies: 'כרטיס' }],
          isLocked: true,
          ongoingTracking: []
        }
      };

      const info = computeBehaviorStudentReadiness(student);
      expect(info.status).toBe('ready');
      expect(info.isLocked).toBe(true);
    });

    it('computes summary statistics and filters correctly', () => {
      const roster = [
        {
          id: 's1',
          behaviorAssessment: {
            targetBehaviors: [{ name: 'צעקות' }],
            baselineData: [{ value: 4, date: '2026-11-01' }],
            functionalHypothesisNarrative: 'תשומת לב'
          },
          behaviorPlan: {
            replacementBehaviors: [{ replacementSkill: 'הרמת יד', teachingStrategies: 'עידוד' }],
            ongoingTracking: [{ id: 'trk-1', date: '2026-11-10', targetBehaviorOccurrences: 1, replacementBehaviorUsed: true, period: '1', reinforcementDelivered: true }]
          }
        },
        {
          id: 's2',
          behaviorAssessment: {
            targetBehaviors: [{ name: 'עזיבת חדר' }],
            baselineData: []
          }
        },
        {
          id: 's3'
        }
      ];

      const summary = computeBehaviorReadinessSummary(roster);
      expect(summary.total).toBe(3);
      expect(summary.readyCount).toBe(1);
      expect(summary.partialCount).toBe(1);
      expect(summary.missingCount).toBe(1);
      expect(summary.missingBaselineCount).toBe(2);

      const missingBaselineList = filterStudentsByBehaviorReadiness(roster, 'missing_baseline');
      expect(missingBaselineList).toHaveLength(2);
      expect(missingBaselineList.map((s) => s.id)).toEqual(['s2', 's3']);

      const readyList = filterStudentsByBehaviorReadiness(roster, 'ready');
      expect(readyList).toHaveLength(1);
      expect(readyList[0].id).toBe('s1');
    });
  });
});
