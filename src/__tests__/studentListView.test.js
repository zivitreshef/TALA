import { describe, it, expect } from 'vitest';
import {
  NO_FRAMEWORK_LABEL,
  filterStudentsBySearch,
  sortStudentsByFramework,
  groupStudentsByFramework,
  resolveBankTargetStudent,
  computeStudentReadiness,
  computeClassReadinessSummary,
  filterStudentsByReadiness
} from '../domain/studentListView';

const s = [
  { id: '1', name: 'תמר', educationalFramework: 'גן חצב' },
  { id: '2', name: 'אורי', educationalFramework: '' },
  { id: '3', name: 'בן', educationalFramework: 'גן חצב' }
];

describe('studentListView', () => {
  it('filters by name or framework', () => {
    expect(filterStudentsBySearch(s, 'חצב').map((x) => x.id)).toEqual(['1', '3']);
    expect(filterStudentsBySearch(s, '').length).toBe(3);
  });
  it('sorts by framework then name, unassigned under the placeholder label', () => {
    const ids = sortStudentsByFramework(s).map((x) => x.id);
    expect(ids.indexOf('3')).toBeLessThan(ids.indexOf('1'));
    expect(s.map((x) => x.id)).toEqual(['1', '2', '3']); // not mutated
  });
  it('groups unassigned students under NO_FRAMEWORK_LABEL', () => {
    const groups = Object.fromEntries(groupStudentsByFramework(s));
    expect(groups[NO_FRAMEWORK_LABEL].map((x) => x.id)).toEqual(['2']);
  });
  it('resolves bank target: explicit → selected → first → null', () => {
    expect(resolveBankTargetStudent(s, '3', '1').id).toBe('3');
    expect(resolveBankTargetStudent(s, null, '2').id).toBe('2');
    expect(resolveBankTargetStudent(s, 'zz', null).id).toBe('1');
    expect(resolveBankTargetStudent([], null, null)).toBeNull();
  });

  describe('computeStudentReadiness & class readiness', () => {
    const readyStudent = {
      id: 'st_ready',
      name: 'נועה כהן',
      educationalFramework: 'כיתה ג׳ 2',
      goals: [
        { id: 'g1', title: 'מטרה 1', midYearEvaluation: 'התקדמות יפה' },
        { id: 'g2', title: 'מטרה 2' }
      ],
      teacherFreeText: '— קול ההורים (כפי שנמסר על ידי ההורים) — חוזקות רבות',
      isLocked: true
    };

    const partialStudent = {
      id: 'st_partial',
      name: 'יונתן לוי',
      educationalFramework: 'כיתה ג׳ 2',
      goals: [
        { id: 'g1', title: 'מטרה 1', midYearEvaluation: 'התקדמות חלקית' },
        { id: 'g2', title: 'מטרה 2' }
      ],
      teacherFreeText: 'רקע כללי של המורה ללא הורים',
      isLocked: false
    };

    const missingStudent = {
      id: 'st_missing',
      name: 'אורי מזרחי',
      educationalFramework: 'גן שקד',
      goals: [{ id: 'g1', title: 'מטרה בודדת' }],
      teacherFreeText: '',
      isLocked: false
    };

    it('computes readiness for null, ready, partial, and missing students', () => {
      expect(computeStudentReadiness(null).status).toBe('missing');

      const r1 = computeStudentReadiness(readyStudent);
      expect(r1.status).toBe('ready');
      expect(r1.goalsCount).toBe(2);
      expect(r1.hasActiveGoals).toBe(true);
      expect(r1.hasParentVoice).toBe(true);
      expect(r1.hasMidYearEval).toBe(true);
      expect(r1.missingTags).toEqual([]);

      const r2 = computeStudentReadiness(partialStudent);
      expect(r2.status).toBe('partial');
      expect(r2.hasParentVoice).toBe(false);
      expect(r2.missingTags).toContain('ללא הורים');

      const r3 = computeStudentReadiness(missingStudent);
      expect(r3.status).toBe('missing');
      expect(r3.hasActiveGoals).toBe(false);
      expect(r3.missingTags).toEqual(['חסרות מטרות', 'ללא הורים', 'ללא הערכת אמצע']);
    });

    it('detects parent voice via pedagogicalSnippets and status report sections', () => {
      const snippetStudent = {
        id: 'st_snip',
        name: 'תמר חדד',
        goals: [{ title: 'א' }, { title: 'ב' }],
        pedagogicalSnippets: [{ id: 'p1', sourceTitle: 'שיחת הורים', content: 'שיתוף פעולה' }],
        evalReportSummary: 'סיכום מחצית חיובי',
        statusReportSections: [{ sectionNumber: 1, content: 'תוכן דו"ח מצב' }],
        isLocked: false
      };
      const info = computeStudentReadiness(snippetStudent);
      expect(info.hasParentVoice).toBe(true);
      expect(info.hasMidYearEval).toBe(true);
      expect(info.hasStatusReport).toBe(true);
      expect(info.status).toBe('ready');
    });

    it('aggregates class readiness summary and filters by readiness key', () => {
      const roster = [readyStudent, partialStudent, missingStudent];
      const summary = computeClassReadinessSummary(roster);
      expect(summary.total).toBe(3);
      expect(summary.readyCount).toBe(1);
      expect(summary.partialCount).toBe(1);
      expect(summary.missingCount).toBe(1);
      expect(summary.missingGoalsCount).toBe(1);
      expect(summary.missingParentsCount).toBe(2);
      expect(summary.missingEvalCount).toBe(1);

      expect(filterStudentsByReadiness(roster, 'all').length).toBe(3);
      expect(filterStudentsByReadiness(roster, 'ready').map((x) => x.id)).toEqual(['st_ready']);
      expect(filterStudentsByReadiness(roster, 'missing_goals').map((x) => x.id)).toEqual([
        'st_missing'
      ]);
      expect(filterStudentsByReadiness(roster, 'missing_parents').map((x) => x.id)).toEqual([
        'st_partial',
        'st_missing'
      ]);
      expect(filterStudentsByReadiness(roster, 'missing_eval').map((x) => x.id)).toEqual([
        'st_missing'
      ]);
    });
  });
});
