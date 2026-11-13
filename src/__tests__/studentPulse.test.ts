import { describe, it, expect } from 'vitest';
import {
  collectObservationTimestamps,
  getLastObservationInfo,
  startOfWeekSunday,
  formatLastObservationLabel,
  formatCompactLastObservationLabel,
  isStale,
  calculateCurrentStreak,
  computeClassPulse
} from '../domain/studentPulse';

const NOW = new Date(2026, 10, 12, 12, 0, 0); // Thursday 12 Nov 2026, local time
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const studentWithGoalObs = (id: string, name: string, iso: string) => ({
  id,
  name,
  goals: [{ id: `g_${id}`, title: 'יעד', observations: [{ id: 'o1', timestamp: iso, date: iso.slice(0, 10) }] }]
});

describe('studentPulse (v3.0.0)', () => {
  describe('getLastObservationInfo', () => {
    it('returns nulls for a student with no observations', () => {
      expect(getLastObservationInfo({ id: 's', goals: [] }, NOW)).toEqual({ lastMs: null, daysSince: null });
      expect(getLastObservationInfo(null, NOW)).toEqual({ lastMs: null, daysSince: null });
    });

    it('reads goal observations', () => {
      const info = getLastObservationInfo(studentWithGoalObs('a', 'א', daysAgo(3)), NOW);
      expect(info.daysSince).toBe(3);
    });

    it('also reads unmatched dailyPedagogicalEntries (previously invisible)', () => {
      const st = { id: 'b', goals: [], dailyPedagogicalEntries: [{ id: 'e1', timestamp: daysAgo(1) }] };
      expect(getLastObservationInfo(st, NOW).daysSince).toBe(1);
    });

    it('uses the most recent across goals and daily entries', () => {
      const st = {
        ...studentWithGoalObs('c', 'ג', daysAgo(9)),
        dailyPedagogicalEntries: [{ id: 'e', timestamp: daysAgo(2) }]
      };
      expect(getLastObservationInfo(st, NOW).daysSince).toBe(2);
    });

    it('ignores malformed dates and never returns negative days', () => {
      const st = {
        goals: [{ observations: [{ timestamp: 'not-a-date' }, { timestamp: new Date(NOW.getTime() + 86400000).toISOString() }] }]
      };
      expect(collectObservationTimestamps(st)).toHaveLength(1);
      expect(getLastObservationInfo(st, NOW).daysSince).toBe(0);
    });
  });

  describe('labels and staleness', () => {
    it('formats Hebrew labels', () => {
      expect(formatLastObservationLabel({ lastMs: null, daysSince: null })).toBe('טרם תועד');
      expect(formatLastObservationLabel({ lastMs: 1, daysSince: 0 })).toBe('תצפית אחרונה: היום');
      expect(formatLastObservationLabel({ lastMs: 1, daysSince: 1 })).toBe('תצפית אחרונה: אתמול');
      expect(formatLastObservationLabel({ lastMs: 1, daysSince: 5 })).toBe('תצפית אחרונה: לפני 5 ימים');
    });

    it('formats compact Hebrew labels without redundant prefixes for student cards', () => {
      expect(formatCompactLastObservationLabel({ lastMs: null, daysSince: null })).toBe('טרם תועד');
      expect(formatCompactLastObservationLabel({ lastMs: 1, daysSince: 0 })).toBe('היום');
      expect(formatCompactLastObservationLabel({ lastMs: 1, daysSince: 1 })).toBe('אתמול');
      expect(formatCompactLastObservationLabel({ lastMs: 1, daysSince: 5 })).toBe('לפני 5 ימים');
    });

    it('treats never-documented and 10+ days as stale', () => {
      expect(isStale({ lastMs: null, daysSince: null })).toBe(true);
      expect(isStale({ lastMs: 1, daysSince: 9 })).toBe(false);
      expect(isStale({ lastMs: 1, daysSince: 10 })).toBe(true);
    });
  });

  describe('startOfWeekSunday', () => {
    it('returns the previous Sunday at 00:00 for a Thursday', () => {
      const s = startOfWeekSunday(NOW);
      expect(s.getDay()).toBe(0);
      expect(s.getDate()).toBe(8);
      expect(s.getHours()).toBe(0);
    });

    it('returns the same day when already Sunday', () => {
      const sunday = new Date(2026, 10, 8, 15, 0, 0);
      expect(startOfWeekSunday(sunday).getDate()).toBe(8);
    });
  });

  describe('calculateCurrentStreak', () => {
    it('is 0 with no observations', () => {
      expect(calculateCurrentStreak([], '2026-11-12')).toBe(0);
    });

    it('counts consecutive days including daily entries', () => {
      const st = {
        goals: [{ observations: [{ date: '2026-11-12' }, { date: '2026-11-11' }] }],
        dailyPedagogicalEntries: [{ date: '2026-11-10' }]
      };
      expect(calculateCurrentStreak([st], '2026-11-12')).toBe(3);
    });

    it('keeps the streak alive when today is not yet logged', () => {
      const st = { goals: [{ observations: [{ date: '2026-11-11' }, { date: '2026-11-10' }] }] };
      expect(calculateCurrentStreak([st], '2026-11-12')).toBe(2);
    });

    it('breaks on a gap', () => {
      const st = { goals: [{ observations: [{ date: '2026-11-12' }, { date: '2026-11-09' }] }] };
      expect(calculateCurrentStreak([st], '2026-11-12')).toBe(1);
    });
  });

  describe('computeClassPulse', () => {
    it('handles empty or invalid input', () => {
      expect(computeClassPulse([], NOW)).toMatchObject({ total: 0, documentedThisWeek: 0, waiting: [] });
      expect(computeClassPulse(null as any, NOW).total).toBe(0);
    });

    it('counts this-week documentation and lists waiting students, longest wait first', () => {
      const students = [
        studentWithGoalObs('fresh', 'טרי', daysAgo(1)), // Wed, this week
        studentWithGoalObs('old', 'ישן', daysAgo(14)),
        studentWithGoalObs('older', 'ישן מאוד', daysAgo(30)),
        { id: 'never', name: 'חדש', goals: [] }
      ];
      const pulse = computeClassPulse(students, NOW);
      expect(pulse.total).toBe(4);
      expect(pulse.documentedThisWeek).toBe(1);
      expect(pulse.waiting.map((w) => w.id)).toEqual(['never', 'older', 'old']);
    });

    it('does not count last week as this week', () => {
      const pulse = computeClassPulse([studentWithGoalObs('x', 'x', daysAgo(5))], NOW); // Saturday before the week
      expect(pulse.documentedThisWeek).toBe(0);
    });
  });
});
