import { describe, it, expect } from 'vitest';
import {
  getObservationGaps,
  createOutlook365CalendarUrl,
  createGoogleCalendarUrl,
  generateIcsFileContent,
  buildAiGoalMatchPrompt,
  parseAiGoalMatchResponse,
  getIsraeliHolidayOrVacation
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

  describe('getIsraeliHolidayOrVacation', () => {
    it('correctly identifies Summer Vacation for any year in July and August', () => {
      expect(getIsraeliHolidayOrVacation('2024-07-01')).toBe('החופש הגדול');
      expect(getIsraeliHolidayOrVacation('2025-07-15')).toBe('החופש הגדול');
      expect(getIsraeliHolidayOrVacation('2026-08-01')).toBe('החופש הגדול');
      expect(getIsraeliHolidayOrVacation('2027-08-31')).toBe('החופש הגדול');
    });

    it('correctly identifies multi-day Jewish holidays across years', () => {
      // 2024
      expect(getIsraeliHolidayOrVacation('2024-03-24')).toBe('חופשת פורים');
      expect(getIsraeliHolidayOrVacation('2024-04-20')).toBe('חופשת פסח');
      expect(getIsraeliHolidayOrVacation('2024-10-03')).toBe('ראש השנה');
      expect(getIsraeliHolidayOrVacation('2024-10-18')).toBe('חופשת סוכות');
      expect(getIsraeliHolidayOrVacation('2024-12-28')).toBe('חופשת חנוכה');

      // 2025
      expect(getIsraeliHolidayOrVacation('2025-03-14')).toBe('חופשת פורים');
      expect(getIsraeliHolidayOrVacation('2025-04-10')).toBe('חופשת פסח');
      expect(getIsraeliHolidayOrVacation('2025-10-08')).toBe('חופשת סוכות');
      expect(getIsraeliHolidayOrVacation('2025-12-18')).toBe('חופשת חנוכה');

      // 2026
      expect(getIsraeliHolidayOrVacation('2026-03-03')).toBe('חופשת פורים');
      expect(getIsraeliHolidayOrVacation('2026-04-02')).toBe('חופשת פסח');
      expect(getIsraeliHolidayOrVacation('2026-09-12')).toBe('ראש השנה');
      expect(getIsraeliHolidayOrVacation('2026-09-28')).toBe('חופשת סוכות');
      expect(getIsraeliHolidayOrVacation('2026-12-08')).toBe('חופשת חנוכה');

      // 2027
      expect(getIsraeliHolidayOrVacation('2027-03-23')).toBe('חופשת פורים');
      expect(getIsraeliHolidayOrVacation('2027-04-20')).toBe('חופשת פסח');
      expect(getIsraeliHolidayOrVacation('2027-10-02')).toBe('ראש השנה');
      expect(getIsraeliHolidayOrVacation('2027-10-18')).toBe('חופשת סוכות');
      expect(getIsraeliHolidayOrVacation('2027-12-28')).toBe('חופשת חנוכה');
    });

    it('correctly identifies national memorial and celebration days', () => {
      expect(getIsraeliHolidayOrVacation('2026-04-14')).toBe('יום הזיכרון לשואה ולגבורה');
      expect(getIsraeliHolidayOrVacation('2026-04-21')).toBe('יום הזיכרון לחללי צה"ל');
      expect(getIsraeliHolidayOrVacation('2026-04-22')).toBe('יום העצמאות');
      expect(getIsraeliHolidayOrVacation('2026-05-05')).toBe('ל"ג בעומר');
      expect(getIsraeliHolidayOrVacation('2026-05-15')).toBe('יום ירושלים');
    });

    it('returns null on ordinary school days', () => {
      expect(getIsraeliHolidayOrVacation('2026-11-10')).toBeNull();
      expect(getIsraeliHolidayOrVacation('2025-01-15')).toBeNull();
      expect(getIsraeliHolidayOrVacation('2026-06-15')).toBeNull();
      expect(getIsraeliHolidayOrVacation('2026-09-01')).toBeNull();
    });

    it('gracefully handles missing or malformed inputs', () => {
      expect(getIsraeliHolidayOrVacation(null)).toBeNull();
      expect(getIsraeliHolidayOrVacation(undefined)).toBeNull();
      expect(getIsraeliHolidayOrVacation('')).toBeNull();
      expect(getIsraeliHolidayOrVacation('invalid-date')).toBeNull();
      expect(getIsraeliHolidayOrVacation(12345)).toBeNull();
    });
  });
});
