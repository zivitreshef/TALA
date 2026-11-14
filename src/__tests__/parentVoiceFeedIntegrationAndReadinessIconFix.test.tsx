import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createParentVoiceSnippet, addSnippet } from '../domain/pedagogicalFeed';
import ClassReadinessOverview from '../components/ClassReadinessOverview';

describe('Parent Voice Feed Integration & Readiness Icon Harmonization', () => {
  describe('Parent Voice Feed Integration', () => {
    it('creates a designated pedagogical snippet for parent voice', () => {
      const block = '— קול ההורים (כפי שנמסר על ידי ההורים) —\n• מה חשוב לנו שידעו: אוהב לצייר ורגיש לרעש';
      const snippet = createParentVoiceSnippet(block);

      expect(snippet.sourceType).toBe('teacher_note');
      expect(snippet.sourceTitle).toBe('קול ההורים');
      expect(snippet.authorName).toBe('הורי התלמיד/ה');
      expect(snippet.content).toContain('אוהב לצייר ורגיש לרעש');
      expect(snippet.id).toMatch(/^ps_/);
    });

    it('correctly appends parent voice snippet to existing snippets list', () => {
      const existing = [
        {
          id: 'sn_1',
          sourceType: 'teacher_note' as const,
          sourceTitle: 'תצפית מורה',
          content: 'תצפית ראשונית בכיתה',
          createdAt: '2026-11-01T08:00:00.000Z'
        }
      ];

      const block = '— קול ההורים — שיתוף פעולה מצוין בבית';
      const parentSnippet = createParentVoiceSnippet(block);
      const nextSnippets = addSnippet(existing, parentSnippet);

      expect(nextSnippets).toHaveLength(2);
      expect(nextSnippets[1].sourceTitle).toBe('קול ההורים');
      expect(nextSnippets[1].content).toContain('שיתוף פעולה מצוין בבית');
    });
  });

  describe('ClassReadinessOverview Status Report & Lock Icon Harmonization', () => {
    const mockStudentLocked = {
      id: 'st_locked',
      name: 'רונן רון (דוגמא)',
      educationalFramework: 'כיתה א׳',
      goals: [
        { id: 'g1', title: 'מטרה 1' },
        { id: 'g2', title: 'מטרה 2' }
      ],
      teacherFreeText: '— קול ההורים — שיתוף פעולה',
      hasMidYearEval: true,
      isLocked: true
    };

    const mockStudentOpen = {
      id: 'st_open',
      name: 'יונתן כהן',
      educationalFramework: 'כיתה א׳',
      goals: [
        { id: 'g1', title: 'מטרה 1' },
        { id: 'g2', title: 'מטרה 2' }
      ],
      teacherFreeText: '— קול ההורים — שיתוף פעולה',
      hasMidYearEval: true,
      isLocked: false,
      hasStatusReport: false
    };

    it('renders green checkmark icon for locked status report matching the other green indicators', () => {
      const html = renderToStaticMarkup(
        <ClassReadinessOverview students={[mockStudentLocked]} onSelectStudent={vi.fn()} />
      );

      // Extract the row from the table
      const rowMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
      const rowHtml = rowMatch ? rowMatch[1] : '';

      // Should render the locked badge with green styling in the table row
      expect(rowHtml).toContain('נעול');
      expect(rowHtml).toContain('rgba(16, 185, 129, 0.12)');
      expect(rowHtml).toContain('#047857');
      // Should NOT contain the old purple lock styling in the table row
      expect(rowHtml).not.toContain('rgba(99, 102, 241, 0.12)');
      expect(rowHtml).not.toContain('#4338ca');
    });

    it('renders red X icon and "טרם ננעל" when report is neither locked nor generated', () => {
      const html = renderToStaticMarkup(
        <ClassReadinessOverview students={[mockStudentOpen]} onSelectStudent={vi.fn()} />
      );

      expect(html).toContain('טרם ננעל');
      expect(html).toContain('rgba(244, 63, 94, 0.1)');
      expect(html).toContain('#be123c');
    });
  });
});
