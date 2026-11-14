import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  extractObservationTimestampMs,
  getObservationGaps,
  getPedagogicalAccomplishmentsSummary
} from '../domain/dailyPedagogicalTracking';
import TeamMeetingReportModal from '../components/modals/TeamMeetingReportModal';

describe('Team Meeting Report & Pedagogical Observation Gaps Fix', () => {
  describe('extractObservationTimestampMs', () => {
    it('accurately parses standard ISO timestamps', () => {
      const ms = extractObservationTimestampMs({ timestamp: '2026-11-14T10:00:00.000Z' });
      expect(ms).toBe(new Date('2026-11-14T10:00:00.000Z').getTime());
    });

    it('accurately parses dateIso from QuickObservationModal', () => {
      const ms = extractObservationTimestampMs({ dateIso: '2026-11-14T12:30:00.000Z' });
      expect(ms).toBe(new Date('2026-11-14T12:30:00.000Z').getTime());
    });

    it('accurately parses YYYY-MM-DD date strings', () => {
      const ms = extractObservationTimestampMs({ date: '2026-11-14' });
      expect(ms).toBe(new Date('2026-11-14').getTime());
    });

    it('accurately parses Israeli date formats DD/MM/YYYY and DD.MM.YYYY', () => {
      const msSlash = extractObservationTimestampMs({ date: '14/11/2026' });
      expect(msSlash).not.toBeNull();
      const d1 = new Date(msSlash!);
      expect(d1.getFullYear()).toBe(2026);
      expect(d1.getMonth()).toBe(10); // November is 10
      expect(d1.getDate()).toBe(14);

      const msDot = extractObservationTimestampMs({ date: '14.11.2026' });
      expect(msDot).not.toBeNull();
      const d2 = new Date(msDot!);
      expect(d2.getFullYear()).toBe(2026);
      expect(d2.getMonth()).toBe(10);
      expect(d2.getDate()).toBe(14);
    });

    it('gracefully handles missing or invalid observation values', () => {
      expect(extractObservationTimestampMs(null)).toBeNull();
      expect(extractObservationTimestampMs(undefined)).toBeNull();
      expect(extractObservationTimestampMs({})).toBeNull();
      expect(extractObservationTimestampMs({ date: 'invalid-date' })).toBeNull();
    });
  });

  describe('getObservationGaps and pedagogical continuity synchronization', () => {
    it('recognizes observations saved with dateIso or date, preventing false gaps for documented students', () => {
      const refDate = new Date('2026-11-14T12:00:00Z');
      const students = [
        {
          id: 'st_ronen',
          name: 'רונן רון (דוגמא)',
          educationalFramework: 'גן שקד',
          goals: [
            {
              id: 'g_ronen_1',
              title: 'פיתוח אינטראקציות חברתיות חיוביות עם חברים',
              observations: [
                {
                  id: 'obs_1',
                  dateIso: '2026-11-14T09:00:00Z',
                  note: 'הילד בחר לצייר עם סיגלית'
                }
              ]
            },
            {
              id: 'g_ronen_2',
              title: 'התמדה במשחקי שולחן ומשחק משותף',
              observations: [
                {
                  id: 'obs_2',
                  date: '2026-11-14',
                  note: 'הילד שיתף פעולה באופן מלא'
                }
              ]
            }
          ]
        },
        {
          id: 'st_hila',
          name: 'הילה נחום (דוגמא)',
          educationalFramework: 'גן שקד',
          goals: [
            { id: 'g_hila_1', title: 'חיזוק שפה ותקשורת', observations: [] },
            { id: 'g_hila_2', title: 'מוטוריקה עדינה', observations: [] },
            { id: 'g_hila_3', title: 'ויסות רגשי', observations: [] }
          ]
        }
      ];

      const gaps = getObservationGaps(students, 21, refDate);

      // Ronen Ron has observations on both goals from today -> 0 gaps
      const ronenGaps = gaps.filter((g) => g.studentName.includes('רונן רון'));
      expect(ronenGaps).toHaveLength(0);

      // Hila Nahum has 3 unobserved goals -> 3 gaps
      const hilaGaps = gaps.filter((g) => g.studentName.includes('הילה נחום'));
      expect(hilaGaps).toHaveLength(3);
      expect(hilaGaps.map((g) => g.goalTitle)).toEqual([
        'חיזוק שפה ותקשורת',
        'מוטוריקה עדינה',
        'ויסות רגשי'
      ]);
    });

    it('getPedagogicalAccomplishmentsSummary and getObservationGaps agree on coverage', () => {
      const refDate = new Date('2026-11-14T12:00:00Z');
      const students = [
        {
          id: 'st_ronen',
          name: 'רונן רון (דוגמא)',
          goals: [
            {
              id: 'g_1',
              title: 'יעד ראשון',
              observations: [{ dateIso: '2026-11-14T09:00:00Z', note: 'תצפית מעולה' }]
            }
          ]
        }
      ];

      const summary = getPedagogicalAccomplishmentsSummary(students, 7, refDate);
      const gaps = getObservationGaps(students, 21, refDate);

      expect(summary.recentObservations).toHaveLength(1);
      expect(summary.recentObservations[0].note).toBe('תצפית מעולה');
      expect(gaps).toHaveLength(0);
    });
  });

  describe('TeamMeetingReportModal UI Rendering', () => {
    it('groups gaps by student without repeating student names, showing exact goal titles and unobserved status', () => {
      const students = [
        {
          id: 'st_ronen',
          name: 'רונן רון (דוגמא)',
          goals: [
            {
              id: 'g_ronen_1',
              title: 'פיתוח אינטראקציות חברתיות חיוביות עם חברים',
              observations: [
                {
                  id: 'obs_1',
                  dateIso: new Date().toISOString(),
                  note: 'הילד בחר לצייר עם סיגלית'
                }
              ]
            }
          ]
        },
        {
          id: 'st_hila',
          name: 'הילה נחום (דוגמא)',
          goals: [
            { id: 'g_hila_1', title: 'חיזוק שפה ותקשורת', observations: [] },
            { id: 'g_hila_2', title: 'מוטוריקה עדינה', observations: [] }
          ]
        }
      ];

      const html = renderToStaticMarkup(
        <TeamMeetingReportModal
          isOpen={true}
          onClose={vi.fn()}
          students={students}
          userPreferences={{ defaultPrivacyMode: 'full_name' }}
          currentUser={{ email: 'teacher@school.gov.il', name: 'גננת מובילה' }}
        />
      );

      // Ronen was documented today -> should appear in recent observations
      expect(html).toContain('הילד בחר לצייר עם סיגלית');

      // Ronen should NOT appear in the unobserved section
      const unobservedSectionMatch = html.match(
        /יעדים ללא תיעוד לאחרונה[\s\S]*?(?=<div className="team-report-footer"|<div class="team-report-footer")/
      );
      expect(unobservedSectionMatch).not.toBeNull();
      const unobservedHtml = unobservedSectionMatch ? unobservedSectionMatch[0] : '';

      expect(unobservedHtml).not.toContain('רונן רון (דוגמא)');

      // Hila Nahum has 2 unobserved goals -> she should be rendered in a student card
      expect(unobservedHtml).toContain('הילה נחום (דוגמא)');
      expect(unobservedHtml).toContain('2 יעדים ממתינים');
      expect(unobservedHtml).toContain('חיזוק שפה ותקשורת');
      expect(unobservedHtml).toContain('מוטוריקה עדינה');
      expect(unobservedHtml).toContain('טרם תועד');

      // Check that Hila's name is NOT duplicated across multiple cards
      const hilaOccurrences = (unobservedHtml.match(/class="team-report-st-name">הילה נחום \(דוגמא\)/g) || []).length;
      expect(hilaOccurrences).toBe(1);
    });
  });
});
