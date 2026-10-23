import { describe, it, expect } from 'vitest';
import { generatePedagogicalTasksHeuristic } from '../components/modals/PedagogicalTasksModal';

describe('generatePedagogicalTasksHeuristic (TALA)', () => {
  const mockStudents = [
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
        },
        {
          id: 'g_2',
          title: 'אחיזת עיפרון',
          environment: 'שולחן יצירה',
          observations: [{ date: '2026-07-01', note: 'אחיזה יציבה' }]
        }
      ]
    },
    {
      id: 'st_2',
      name: 'רוני כהן',
      educationalFramework: 'בית ספר אלונים',
      goals: [
        {
          id: 'g_3',
          title: 'קריאת הוראות עצמאית',
          environment: 'כיתת שילוב',
          observations: [{ date: '2026-07-20', note: 'תיווך חלקי' }]
        }
      ]
    }
  ];

  const mockEvents = [
    {
      id: 'ev_1',
      studentId: 'st_1',
      studentName: 'איתי לוי',
      title: 'שיעור פרטני',
      date: '2026-07-26',
      startTime: '09:00'
    }
  ];

  it('generates a focused task connected to scheduled meeting and priority goal without observations', () => {
    const tasks = generatePedagogicalTasksHeuristic([mockStudents[0]], mockEvents, '2026-07-26');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].studentId).toBe('st_1');
    expect(tasks[0].studentName).toBe('איתי לוי');
    expect(tasks[0].text).toContain('איתי לוי');
    expect(tasks[0].text).toContain('במפגש');
    expect(tasks[0].text).toContain('משחק חברתי בחצר');
    expect(tasks[0].date).toBe('2026-07-26');
    expect(tasks[0].selected).toBe(true);
  });

  it('generates a task for student without meeting targeting their active goal and environment', () => {
    const tasks = generatePedagogicalTasksHeuristic([mockStudents[1]], mockEvents, '2026-07-26');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].studentId).toBe('st_2');
    expect(tasks[0].studentName).toBe('רוני כהן');
    expect(tasks[0].text).toContain('רוני כהן');
    expect(tasks[0].text).toContain('קריאת הוראות עצמאית');
    expect(tasks[0].text).toContain('כיתת שילוב');
  });

  it('includes custom focus instruction when provided by teacher', () => {
    const focus = 'דגש על מוטיבציה ותגמול מילולי חיובי';
    const tasks = generatePedagogicalTasksHeuristic([mockStudents[0]], mockEvents, '2026-07-26', focus);
    expect(tasks[0].text).toContain('[דגש: דגש על מוטיבציה ותגמול מילולי חיובי]');
  });

  it('handles empty students list gracefully', () => {
    const tasks = generatePedagogicalTasksHeuristic([], mockEvents, '2026-07-26');
    expect(tasks).toEqual([]);
  });
});
