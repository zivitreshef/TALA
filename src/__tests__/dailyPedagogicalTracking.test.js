import { describe, it, expect } from 'vitest';
import {
  getObservationGaps,
  createOutlook365CalendarUrl,
  createGoogleCalendarUrl,
  generateIcsFileContent,
  buildAiGoalMatchPrompt,
  parseAiGoalMatchResponse
} from '../domain/dailyPedagogicalTracking.js';

describe('dailyPedagogicalTracking domain tests', () => {
  it('correctly identifies observation gaps when goal has no observations', () => {
    const students = [
      {
        id: 'st_1',
        name: 'איתי לוי',
        educationalFramework: 'גן שקד',
        goals: [
          {
            id: 'g_1',
            title: 'משחק חברתי בחצר',
            environment: 'חצר',
            observations: []
          }
        ]
      }
    ];

    const gaps = getObservationGaps(students, 21, new Date('2026-07-26T10:00:00Z'));
    expect(gaps).toHaveLength(1);
    expect(gaps[0].studentName).toBe('איתי לוי');
    expect(gaps[0].neverObserved).toBe(true);
  });

  it('correctly identifies observation gaps when last observation is older than threshold', () => {
    const students = [
      {
        id: 'st_1',
        name: 'איתי לוי',
        goals: [
          {
            id: 'g_1',
            title: 'משחק חברתי בחצר',
            observations: [
              { timestamp: '2026-06-01T10:00:00Z', note: 'תצפית ישנה' }
            ]
          }
        ]
      }
    ];

    const gaps = getObservationGaps(students, 21, new Date('2026-07-26T10:00:00Z'));
    expect(gaps).toHaveLength(1);
    expect(gaps[0].daysSinceObservation).toBeGreaterThan(21);
  });

  it('ignores goals with recent observations within threshold', () => {
    const students = [
      {
        id: 'st_1',
        name: 'איתי לוי',
        goals: [
          {
            id: 'g_1',
            title: 'משחק חברתי בחצר',
            observations: [
              { timestamp: '2026-07-20T10:00:00Z', note: 'תצפית טרייה' }
            ]
          }
        ]
      }
    ];

    const gaps = getObservationGaps(students, 21, new Date('2026-07-26T10:00:00Z'));
    expect(gaps).toHaveLength(0);
  });

  it('generates valid Outlook 365 deep link url', () => {
    const url = createOutlook365CalendarUrl({
      title: 'ועדת תלא',
      startIso: '2026-07-30T10:00:00',
      endIso: '2026-07-30T11:00:00',
      details: 'דיון פדגוגי',
      location: 'חדר מנהלת'
    });

    expect(url).toContain('https://outlook.office.com/calendar/0/deeplink/compose');
    expect(url).toContain('subject=%D7%95%D7%A2%D7%93%D7%AA+%D7%AA%D7%9C%D7%90');
    expect(url).toContain('location=%D7%97%D7%93%D7%A8+%D7%9E%D7%A0%D7%94%D7%9C%D7%AA');
  });

  it('generates valid Google Calendar url', () => {
    const url = createGoogleCalendarUrl({
      title: 'שיעור פרטני',
      startIso: '2026-07-26T09:30:00',
      endIso: '2026-07-26T10:15:00',
      details: 'עבודה על שברים',
      location: 'כיתה ה'
    });

    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('dates=20260726T093000%2F20260726T101500');
  });

  it('generates valid ics calendar content', () => {
    const events = [
      {
        title: 'ועדת תל"א שנתית',
        startIso: '2026-07-30T13:00:00',
        endIso: '2026-07-30T14:00:00',
        details: 'הצגת דוח מצב תפקודי',
        location: 'חדר ישיבות'
      }
    ];

    const ics = generateIcsFileContent(events);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:ועדת תל"א שנתית');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('builds AI prompt and parses AI response cleanly', () => {
    const prompt = buildAiGoalMatchPrompt({
      note: 'שיחק יפה בכדור בחצר',
      student: { name: 'איתי', goals: [{ id: 'g_1', title: 'משחק בחצר' }] }
    });
    expect(prompt).toContain('שיחק יפה בכדור בחצר');
    expect(prompt).toContain('איתי');

    const parsed = parseAiGoalMatchResponse({
      matchedGoalId: 'g_1',
      matchedGoalTitle: 'משחק בחצר',
      environment: 'חצר',
      observedSupportLevel: 'תזכורת מילולית',
      suggestedProgressDelta: 5
    });

    expect(parsed.matchedGoalId).toBe('g_1');
    expect(parsed.observedSupportLevel).toBe('תזכורת מילולית');
    expect(parsed.suggestedProgressDelta).toBe(5);
  });
});
