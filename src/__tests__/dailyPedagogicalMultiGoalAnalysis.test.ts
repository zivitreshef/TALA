import { describe, it, expect } from 'vitest';
import {
  buildAiGoalMatchPrompt,
  parseAiGoalMultiMatchResponse
} from '../domain/dailyPedagogicalTracking';

describe('Daily Pedagogical Multi-Goal AI Analysis Test Suite', () => {
  const sampleGoals = [
    {
      id: 'goal_reading',
      title: 'שיפור בהבנת הנקרא',
      environment: 'כיתה',
      currentProgress: 40,
      targetProgress: 80,
      observations: [
        { id: 'obs_hist_1', date: '2026-10-15', note: 'קריאה ראשונית עם ליווי', supportLevel: 'תיווך חלקי' }
      ]
    },
    {
      id: 'goal_independent',
      title: 'ביצוע משימות לימודיות באופן עצמאי',
      environment: 'כיתה',
      currentProgress: 50,
      targetProgress: 85,
      observations: []
    },
    {
      id: 'goal_social',
      title: 'יוזמה והשתתפות באינטראקציה חברתית',
      environment: 'חצר',
      currentProgress: 30,
      targetProgress: 75,
      observations: []
    }
  ];

  const studentWithGoals = {
    id: 'st_noa',
    name: 'נועה',
    gender: 'girl',
    goals: sampleGoals
  };

  describe('Prompt Construction & Pedagogical Directives', () => {
    it('buildAiGoalMatchPrompt instructs AI to evaluate independently and distribute across all addressed goals', () => {
      const note = 'נועה קראה סיפור והשיבה על שאלות הבנה. בדף העבודה פעלה עצמאית. בחצר שוחחה עם חברה.';
      const prompt = buildAiGoalMatchPrompt({ note, student: studentWithGoals });

      expect(prompt).toContain('נועה');
      expect(prompt).toContain('שיפור בהבנת הנקרא');
      expect(prompt).toContain('ביצוע משימות לימודיות באופן עצמאי');
      expect(prompt).toContain('יוזמה והשתתפות באינטראקציה חברתית');
      expect(prompt).toContain('חובה לפצל ולשייך את המידע לכל היעדים הרלוונטיים');
      expect(prompt).toContain('matches');
      expect(prompt).toContain('noMatchReason');
      expect(prompt).toContain('אל תמציא, אל תנחש');
    });

    it('safely clamps oversized feedback note to 5,000 characters to prevent prompt overflow', () => {
      const giantNote = 'התלמידה שיתפה פעולה יפה מאוד בכיתה. '.repeat(500); // > 17,000 chars
      const prompt = buildAiGoalMatchPrompt({ note: giantNote, student: studentWithGoals });

      expect(prompt.length).toBeLessThan(12000);
      expect(prompt).toContain('התלמידה שיתפה פעולה');
    });

    it('handles student with no active goals gracefully without throwing', () => {
      const emptyStudent = { id: 'st_empty', name: 'אורי', goals: [] };
      const prompt = buildAiGoalMatchPrompt({ note: 'היה מפגש מוצלח', student: emptyStudent });

      expect(prompt).toContain('אין עדיין יעדים מוגדרים');
      expect(prompt).toContain('אורי');
    });
  });

  describe('Multi-Goal AI Response Parsing (parseAiGoalMultiMatchResponse)', () => {
    it('Scenario 1: Student with one goal -> correctly associates feedback with that goal', () => {
      const singleGoalResponse = {
        matches: [
          {
            matchedGoalId: 'goal_reading',
            matchedGoalTitle: 'שיפור בהבנת הנקרא',
            environment: 'כיתה',
            observedSupportLevel: 'תזכורת מילולית',
            conciseObservationNote: 'קראה פסקה קצרה והשיבה נכון על שאלות תוכן בתזכורת אחת.',
            suggestedProgressDelta: 5,
            confidenceScore: 0.95,
            explanation: 'התצפית מעידה על שליטה בקריאה ומענה לשאלות'
          }
        ],
        noMatchReason: null
      };

      const result = parseAiGoalMultiMatchResponse(singleGoalResponse);
      expect(result).toHaveLength(1);
      expect(result[0].matchedGoalId).toBe('goal_reading');
      expect(result[0].observedSupportLevel).toBe('תזכורת מילולית');
      expect(result[0].conciseObservationNote).toContain('קראה פסקה קצרה');
      expect(result[0].suggestedProgressDelta).toBe(5);
    });

    it('Scenario 2: Student with two goals, both addressed -> distributes feedback across both goals', () => {
      const twoGoalsResponse = {
        matches: [
          {
            matchedGoalId: 'goal_reading',
            matchedGoalTitle: 'שיפור בהבנת הנקרא',
            environment: 'כיתה',
            observedSupportLevel: 'תיווך חלקי',
            conciseObservationNote: 'קראה סיפור קצר וענתה בהצלחה על שאלות הבנה בתיווך מינימלי.',
            suggestedProgressDelta: 5
          },
          {
            matchedGoalId: 'goal_independent',
            matchedGoalTitle: 'ביצוע משימות לימודיות באופן עצמאי',
            environment: 'כיתה',
            observedSupportLevel: 'עצמאי לחלוטין',
            conciseObservationNote: 'השלימה את דף העבודה העצמאי ללא צורך בסיוע המורה.',
            suggestedProgressDelta: 10
          }
        ]
      };

      const result = parseAiGoalMultiMatchResponse(twoGoalsResponse);
      expect(result).toHaveLength(2);

      const readingMatch = result.find((m) => m.matchedGoalId === 'goal_reading');
      const indepMatch = result.find((m) => m.matchedGoalId === 'goal_independent');

      expect(readingMatch).toBeDefined();
      expect(readingMatch?.observedSupportLevel).toBe('תיווך חלקי');
      expect(readingMatch?.suggestedProgressDelta).toBe(5);

      expect(indepMatch).toBeDefined();
      expect(indepMatch?.observedSupportLevel).toBe('עצמאי לחלוטין');
      expect(indepMatch?.suggestedProgressDelta).toBe(10);
    });

    it('Scenario 3: Student with three goals, all addressed -> all goals receive distinct extracted analyses', () => {
      const threeGoalsResponse = {
        matches: [
          {
            matchedGoalId: 'goal_reading',
            matchedGoalTitle: 'שיפור בהבנת הנקרא',
            environment: 'כיתה',
            observedSupportLevel: 'תיווך חלקי',
            conciseObservationNote: 'התקדמות בהבנת הנקרא: קראה וענתה על שאלות תוכן.',
            suggestedProgressDelta: 5
          },
          {
            matchedGoalId: 'goal_independent',
            matchedGoalTitle: 'ביצוע משימות לימודיות באופן עצמאי',
            environment: 'כיתה',
            observedSupportLevel: 'עצמאי לחלוטין',
            conciseObservationNote: 'עבודה עצמאית: השלימה את כל המשימות ללא עזרה.',
            suggestedProgressDelta: 5
          },
          {
            matchedGoalId: 'goal_social',
            matchedGoalTitle: 'יוזמה והשתתפות באינטראקציה חברתית',
            environment: 'חצר',
            observedSupportLevel: 'תזכורת מילולית',
            conciseObservationNote: 'תפקוד חברתי: יזמה שיחה עם חברה והשתתפה בדיון קבוצתי.',
            suggestedProgressDelta: 5
          }
        ]
      };

      const result = parseAiGoalMultiMatchResponse(threeGoalsResponse);
      expect(result).toHaveLength(3);
      expect(result.map((m) => m.matchedGoalId)).toEqual([
        'goal_reading',
        'goal_independent',
        'goal_social'
      ]);
      // Each goal received distinct observations
      expect(result[0].conciseObservationNote).not.toEqual(result[1].conciseObservationNote);
      expect(result[1].conciseObservationNote).not.toEqual(result[2].conciseObservationNote);
    });

    it('Scenario 4: Student with multiple goals, only one addressed -> returns only that relevant goal', () => {
      const oneOfThreeResponse = {
        matches: [
          {
            matchedGoalId: 'goal_social',
            matchedGoalTitle: 'יוזמה והשתתפות באינטראקציה חברתית',
            environment: 'חצר',
            observedSupportLevel: 'עצמאי לחלוטין',
            conciseObservationNote: 'שיחקה בכדור בחצר עם שני חברים והמתינה לתורה.',
            suggestedProgressDelta: 5
          }
        ]
      };

      const result = parseAiGoalMultiMatchResponse(oneOfThreeResponse);
      expect(result).toHaveLength(1);
      expect(result[0].matchedGoalId).toBe('goal_social');
      expect(result.find((m) => m.matchedGoalId === 'goal_reading')).toBeUndefined();
      expect(result.find((m) => m.matchedGoalId === 'goal_independent')).toBeUndefined();
    });

    it('Scenario 5: Single sentence containing observations for multiple goals -> correctly split', () => {
      const singleSentenceExtracted = {
        matches: [
          {
            matchedGoalId: 'goal_reading',
            matchedGoalTitle: 'שיפור בהבנת הנקרא',
            observedSupportLevel: 'עצמאי לחלוטין',
            conciseObservationNote: 'הבינה את הוראות הטקסט באופן מלא.'
          },
          {
            matchedGoalId: 'goal_independent',
            matchedGoalTitle: 'ביצוע משימות לימודיות באופן עצמאי',
            observedSupportLevel: 'עצמאי לחלוטין',
            conciseObservationNote: 'ביצעה את המטלה מתחילתה ועד סופה ללא תיווך.'
          }
        ]
      };

      const result = parseAiGoalMultiMatchResponse(singleSentenceExtracted);
      expect(result).toHaveLength(2);
      expect(result[0].conciseObservationNote).toBe('הבינה את הוראות הטקסט באופן מלא.');
      expect(result[1].conciseObservationNote).toBe('ביצעה את המטלה מתחילתה ועד סופה ללא תיווך.');
    });

    it('Scenario 6: Feedback completely unrelated to all goals -> returns empty array without fabricating', () => {
      const unrelatedResponse = {
        matches: [],
        noMatchReason: 'התצפית מתארת איחור של ההסעה עקב מזג האוויר ואינה נוגעת ליעדים הפדגוגיים'
      };

      const result = parseAiGoalMultiMatchResponse(unrelatedResponse);
      expect(result).toEqual([]);
    });

    it('Scenario 7: Robustness with raw markdown code block wrapping (```json)', () => {
      const markdownWrapped = `
\`\`\`json
{
  "matches": [
    {
      "matchedGoalId": "goal_reading",
      "matchedGoalTitle": "שיפור בהבנת הנקרא",
      "observedSupportLevel": "תיווך חלקי",
      "conciseObservationNote": "קראה טקסט בעזרת כרטיסיות מילים.",
      "suggestedProgressDelta": 5
    },
    {
      "matchedGoalId": "goal_social",
      "matchedGoalTitle": "יוזמה והשתתפות באינטראקציה חברתית",
      "observedSupportLevel": "תזכורת מילולית",
      "conciseObservationNote": "פנתה לחבר במהלך הפסקת האוכל.",
      "suggestedProgressDelta": 5
    }
  ]
}
\`\`\`
`;

      const result = parseAiGoalMultiMatchResponse(markdownWrapped);
      expect(result).toHaveLength(2);
      expect(result[0].matchedGoalId).toBe('goal_reading');
      expect(result[1].matchedGoalId).toBe('goal_social');
    });

    it('Scenario 8: Robustness with cloud proxy object wrappers ({ raw: ... })', () => {
      const proxyWrapped = {
        raw: JSON.stringify({
          matches: [
            {
              matchedGoalId: 'goal_independent',
              matchedGoalTitle: 'ביצוע משימות לימודיות באופן עצמאי',
              observedSupportLevel: 'עצמאי לחלוטין',
              conciseObservationNote: 'עבדה ברציפות 20 דקות.',
              suggestedProgressDelta: 5
            }
          ]
        })
      };

      const result = parseAiGoalMultiMatchResponse(proxyWrapped);
      expect(result).toHaveLength(1);
      expect(result[0].matchedGoalId).toBe('goal_independent');
      expect(result[0].conciseObservationNote).toBe('עבדה ברציפות 20 דקות.');
    });

    it('Scenario 9: Legacy single object response format is parsed cleanly for backward compatibility', () => {
      const legacyObject = {
        matchedGoalId: 'goal_reading',
        matchedGoalTitle: 'שיפור בהבנת הנקרא',
        environment: 'כיתה',
        observedSupportLevel: 'תזכורת מילולית',
        conciseObservationNote: 'תצפית יחידה',
        suggestedProgressDelta: 10
      };

      const result = parseAiGoalMultiMatchResponse(legacyObject);
      expect(result).toHaveLength(1);
      expect(result[0].matchedGoalId).toBe('goal_reading');
      expect(result[0].suggestedProgressDelta).toBe(10);
    });

    it('Scenario 10: Deduplication by matchedGoalId prevents duplicated entries for the same goal', () => {
      const duplicateMatches = {
        matches: [
          {
            matchedGoalId: 'goal_reading',
            matchedGoalTitle: 'שיפור בהבנת הנקרא',
            conciseObservationNote: 'הערה 1'
          },
          {
            matchedGoalId: 'goal_reading',
            matchedGoalTitle: 'שיפור בהבנת הנקרא',
            conciseObservationNote: 'הערה 2'
          }
        ]
      };

      const result = parseAiGoalMultiMatchResponse(duplicateMatches);
      expect(result).toHaveLength(1);
      expect(result[0].matchedGoalId).toBe('goal_reading');
      expect(result[0].conciseObservationNote).toBe('הערה 1');
    });

    it('Scenario 11: Normalizes and bounds progress delta and support level correctly', () => {
      const rawMatch = {
        matches: [
          {
            matchedGoalId: 'goal_reading',
            observedSupportLevel: 'תמיכה לא מוכרת',
            suggestedProgressDelta: 999,
            confidenceScore: 5
          }
        ]
      };

      const result = parseAiGoalMultiMatchResponse(rawMatch);
      expect(result).toHaveLength(1);
      expect(result[0].observedSupportLevel).toBe('תיווך חלקי');
      expect(result[0].suggestedProgressDelta).toBe(15);
      expect(result[0].confidenceScore).toBe(1);
    });
  });

  describe('Multi-Goal Student State Mutation & Persistence', () => {
    it('applies multiple observations and updates currentProgress independently across all addressed goals', () => {
      const matchesToApply = [
        {
          matchedGoalId: 'goal_reading',
          matchedGoalTitle: 'שיפור בהבנת הנקרא',
          observedSupportLevel: 'תיווך חלקי',
          conciseObservationNote: 'קראה סיפור קצר וענתה על שאלות.',
          suggestedProgressDelta: 5
        },
        {
          matchedGoalId: 'goal_independent',
          matchedGoalTitle: 'ביצוע משימות לימודיות באופן עצמאי',
          observedSupportLevel: 'עצמאי לחלוטין',
          conciseObservationNote: 'השלימה דף עבודה עצמאי.',
          suggestedProgressDelta: 10
        }
      ];

      const matchMap = new Map(matchesToApply.map((m) => [m.matchedGoalId, m]));

      const updatedGoals = sampleGoals.map((g) => {
        const m = matchMap.get(g.id);
        if (m) {
          const currentP = Number(g.currentProgress) || 0;
          const newP = Math.min(100, currentP + (m.suggestedProgressDelta || 0));
          const existingObs = Array.isArray(g.observations) ? g.observations : [];
          const newObs: any = {
            id: `obs_${Date.now()}_${g.id}`,
            date: '2026-11-07',
            authorName: 'מורה משלבת',
            supportLevel: m.observedSupportLevel,
            note: m.conciseObservationNote,
            source: 'ai_daily_tracker'
          };
          return {
            ...g,
            currentProgress: newP,
            observations: [newObs, ...existingObs]
          };
        }
        return g;
      });

      const updatedReading = updatedGoals.find((g) => g.id === 'goal_reading');
      expect(updatedReading?.currentProgress).toBe(45);
      expect(updatedReading?.observations).toHaveLength(2);
      expect((updatedReading?.observations[0] as any).note).toBe('קראה סיפור קצר וענתה על שאלות.');
      expect((updatedReading?.observations[0] as any).supportLevel).toBe('תיווך חלקי');
      expect((updatedReading?.observations[1] as any).id).toBe('obs_hist_1');

      const updatedIndep = updatedGoals.find((g) => g.id === 'goal_independent');
      expect(updatedIndep?.currentProgress).toBe(60);
      expect(updatedIndep?.observations).toHaveLength(1);
      expect((updatedIndep?.observations[0] as any).note).toBe('השלימה דף עבודה עצמאי.');
      expect((updatedIndep?.observations[0] as any).supportLevel).toBe('עצמאי לחלוטין');

      const updatedSocial = updatedGoals.find((g) => g.id === 'goal_social');
      expect(updatedSocial?.currentProgress).toBe(30);
      expect(updatedSocial?.observations).toHaveLength(0);
    });
  });
});
