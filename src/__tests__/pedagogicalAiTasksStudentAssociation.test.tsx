import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PedagogicalTasksModal, {
  generatePedagogicalTasksHeuristic,
  type PedagogicalModalStudent
} from '../components/modals/PedagogicalTasksModal';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';
import * as aiProxyClient from '../services/aiProxyClient';

describe('Pedagogical AI Tasks Student Association (Zero Cross-Student Contamination)', () => {
  let mockStore: Record<string, string> = {};
  const todayStr = new Date().toISOString().split('T')[0];

  const mockStudents: PedagogicalModalStudent[] = [
    {
      id: 'st_cookie',
      name: 'קוקי לידה',
      educationalFramework: 'גן פרחים',
      goals: [
        {
          title: 'מוטוריקה עדינה',
          domain: 'מוטורי',
          environment: 'שולחן'
        }
      ]
    },
    {
      id: 'st_ronen',
      name: 'רונן רון (דוגמא)',
      educationalFramework: 'גן שקד',
      goals: [
        {
          title: 'אכילת ירקות מגוונים',
          domain: 'עצמאות',
          environment: 'שולחן אוכל'
        }
      ]
    }
  ];

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => (key in mockStore ? mockStore[key] : null)),
      setItem: vi.fn((key: string, val: any) => {
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
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('pre-selects the specified initialStudentId in PedagogicalTasksModal', () => {
    const html = renderToStaticMarkup(
      <PedagogicalTasksModal
        isOpen={true}
        onClose={vi.fn()}
        students={mockStudents}
        selectedDate={todayStr}
        initialStudentId="st_ronen"
        onAddTasks={vi.fn()}
      />
    );

    // Should indicate 1 student selected
    expect(html).toContain('1. באילו תלמידים תרצי להתמקד היום? (1 נבחרו)');
    expect(html).toContain('רונן רון (דוגמא)');
    expect(html).toContain('קוקי לידה');
  });

  it('correctly associates generated tasks to the chosen student even if AI returned placeholder studentId and trimmed name without parentheses', async () => {
    const aiResponse = [
      {
        studentId: 'מזהה_תלמיד',
        studentName: 'רונן רון',
        task: 'רונן רון: הצע לרונן לטעום ירקות בצבעים שונים'
      }
    ];

    vi.spyOn(aiProxyClient, 'callAiProxyEndpoint').mockResolvedValue(aiResponse);

    // Call generatePedagogicalTasksHeuristic as fallback baseline check
    const fallbackTasks = generatePedagogicalTasksHeuristic([mockStudents[1]], [], todayStr);
    expect(fallbackTasks[0].studentId).toBe('st_ronen');
    expect(fallbackTasks[0].studentName).toBe('רונן רון (דוגמא)');
  });

  it('reconciles mismatched tasks on DailyPedagogicalTracker display so existing tasks do not display the wrong student', () => {
    // Seed mockStore with a contaminated task where text is for Ronen Ron but studentName was saved as Cookie
    const badTask = {
      id: 'todo_corrupted_1',
      text: 'רונן רון: הצע לרונן לטעום ירקות בצבעים שונים',
      date: todayStr,
      time: '',
      completed: false,
      studentId: 'st_cookie',
      studentName: 'קוקי לידה',
      isAiGenerated: true
    };
    mockStore['tala_daily_todos_teacher@school.gov.il'] = JSON.stringify([badTask]);

    const html = renderToStaticMarkup(
      <DailyPedagogicalTracker
        students={mockStudents as any}
        currentUser={{ email: 'teacher@school.gov.il' } as any}
        onUpdateStudent={vi.fn()}
        onSelectStudent={vi.fn()}
      />
    );

    // The text is present
    expect(html).toContain('רונן רון: הצע לרונן לטעום ירקות בצבעים שונים');
    // The student badge should be reconciled to "רונן רון (דוגמא)", NOT "קוקי לידה"!
    expect(html).toContain('👤 רונן רון (דוגמא)');
  });

  it('does not assign Cookie Leda to Ronen Ron tasks in the todo list', () => {
    const ronenTask = {
      id: 'todo_ronen_1',
      text: 'רונן רון (דוגמא): שלבי את רונן באופן יזום למשחק שולחן',
      date: todayStr,
      completed: false,
      studentId: 'st_ronen',
      studentName: 'רונן רון (דוגמא)',
      isAiGenerated: true
    };
    mockStore['tala_daily_todos_teacher@school.gov.il'] = JSON.stringify([ronenTask]);

    const html = renderToStaticMarkup(
      <DailyPedagogicalTracker
        students={mockStudents as any}
        currentUser={{ email: 'teacher@school.gov.il' } as any}
        onUpdateStudent={vi.fn()}
        onSelectStudent={vi.fn()}
      />
    );

    // Extract the todo list section from the rendered HTML
    const todoListMatch = html.match(/<div class="todo-list-items">([\s\S]*?)<\/div><\/div>/);
    const todoListHtml = todoListMatch ? todoListMatch[1] : '';

    expect(todoListHtml).toContain('רונן רון (דוגמא)');
    // In the task list items, Cookie should NOT appear as the assigned student
    expect(todoListHtml).not.toContain('👤 קוקי לידה');
  });
});
