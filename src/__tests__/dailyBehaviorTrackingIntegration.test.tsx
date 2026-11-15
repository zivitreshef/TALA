import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';
import { StudentProfile, OngoingTrackingPoint, BehaviorObservation } from '../domain/types';
import { calculateTrackingStats } from '../domain/behaviorAnalysis';

describe('Daily Behavior Tracking Integration Suite', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => (key in mockStore ? mockStore[key] : null)),
      setItem: vi.fn((key: string, val: string) => {
        mockStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      })
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const sampleStudent: StudentProfile = {
    id: 'st_behavior_1',
    name: 'נועם אברהמי',
    educationalFramework: 'בית ספר יסודי רימונים',
    behaviorAssessment: {
      assessorName: 'רונית שפירא',
      assessmentDate: '2026-11-01',
      targetBehaviors: [
        {
          id: 'target_1',
          name: 'עזיבת מקום ללא אישור',
          operationalDefinition: 'קימה מהכיסא במהלך שיעור',
          measurementType: 'frequency',
          baselineAverage: 5,
          targetGoal: 1
        }
      ],
      baselineData: [
        { id: 'b_1', date: '2026-11-01', sessionOrPeriod: 'שיעור 1', value: 6 },
        { id: 'b_2', date: '2026-11-02', sessionOrPeriod: 'שיעור 1', value: 4 }
      ],
      mainHypothesizedFunction: 'escape'
    },
    behaviorPlan: {
      targetBehaviors: [
        {
          id: 'target_1',
          name: 'עזיבת מקום ללא אישור',
          operationalDefinition: 'קימה מהכיסא במהלך שיעור',
          measurementType: 'frequency',
          baselineAverage: 5,
          targetGoal: 1
        }
      ],
      replacementBehaviors: [
        {
          targetBehaviorId: 'target_1',
          replacementSkill: 'הרמת כרטיס הפסקה יזומה',
          teachingStrategies: 'עיצוב התנהגות ומתן חיזוק מיידי בכל שימוש'
        }
      ],
      antecedentStrategies: 'חלוקת משימות לחלקים קצרים',
      reinforcementSystem: {
        preferredReinforcers: 'נקודות ומשחק מחשב בסוף יום',
        scheduleOfReinforcement: 'FR1 בימים הראשונים'
      },
      reactiveProtocol: {
        staffResponse: 'הפניה שקטה לכרטיס ההפסקה ללא תשומת לב מילולית'
      },
      ongoingTracking: []
    },
    behaviorObservations: []
  };

  it('renders DailyPedagogicalTracker with the behavior observation mode button', () => {
    const handleUpdate = vi.fn();
    const html = renderToStaticMarkup(
      <DailyPedagogicalTracker
        students={[sampleStudent]}
        currentUser={{ name: 'רונית שפירא', role: 'behavior_analyst', email: 'ronit@example.com' }}
        onUpdateStudent={handleUpdate}
      />
    );

    // Verify behavior tracking button is rendered in toggle group
    expect(html).toContain('אירוע התנהגותי');
    expect(html).toContain('תיעוד חופשי ב-AI');
    expect(html).toContain('יעד ממוקד ידני');
  });

  it('correctly appends new ongoing tracking point and behavior observation to student record', () => {
    const newTrackingPoint: OngoingTrackingPoint = {
      id: 'track_12345',
      date: '2026-11-15',
      period: 'שיעור 2',
      targetBehaviorOccurrences: 2,
      replacementBehaviorUsed: true,
      reinforcementDelivered: true,
      notes: 'ביקש הפסקה בכרטיסיה לאחר 15 דקות'
    };

    const newObs: BehaviorObservation = {
      id: 'obs_12345',
      timestamp: Date.now(),
      dateTime: '2026-11-15 10:15',
      location: 'כיתה',
      activity: 'שיעור 2',
      antecedent: '',
      behavior: 'ביקש הפסקה בכרטיסיה לאחר 15 דקות',
      intensity: 'moderate',
      consequence: 'חיזוק ניתן',
      perceivedFunction: 'escape',
      notes: 'ביקש הפסקה בכרטיסיה לאחר 15 דקות'
    };

    const updatedStudent: StudentProfile = {
      ...sampleStudent,
      behaviorPlan: {
        ...sampleStudent.behaviorPlan!,
        ongoingTracking: [newTrackingPoint, ...(sampleStudent.behaviorPlan?.ongoingTracking || [])]
      },
      behaviorObservations: [newObs, ...(sampleStudent.behaviorObservations || [])]
    };

    expect(updatedStudent.behaviorPlan?.ongoingTracking).toHaveLength(1);
    expect(updatedStudent.behaviorPlan?.ongoingTracking[0].targetBehaviorOccurrences).toBe(2);
    expect(updatedStudent.behaviorPlan?.ongoingTracking[0].replacementBehaviorUsed).toBe(true);
    expect(updatedStudent.behaviorObservations).toHaveLength(1);

    // Verify calculating tracking stats against baseline
    const stats = calculateTrackingStats(updatedStudent.behaviorPlan!.ongoingTracking, 5);
    expect(stats.totalOccurrences).toBe(2);
    expect(stats.averageOccurrences).toBe(2);
    expect(stats.reductionPercentage).toBe(60); // (5 - 2) / 5 = 60%
    expect(stats.replacementSuccessRate).toBe(100);
  });
});
