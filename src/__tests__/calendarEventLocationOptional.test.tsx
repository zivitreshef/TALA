import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';

describe('Calendar Event Location Optionality (Fix Hardcoded Default Location)', () => {
  let mockStore: Record<string, string> = {};
  const todayStr = new Date().toISOString().split('T')[0];

  const mockStudents = [
    {
      id: 'st_1',
      name: 'רונן רון (דוגמא)',
      educationalFramework: 'גן שקד'
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

  it('renders agenda event without location cleanly and without hardcoded "חדר טיפולים / כיתה"', () => {
    const eventWithoutLocation = [
      {
        id: 'ev_no_loc_1',
        title: 'שיעור פרטני עם הילה',
        date: todayStr,
        startTime: '10:00',
        endTime: '10:30',
        type: 'שיעור פרטני',
        studentName: 'רונן רון (דוגמא)',
        studentId: 'st_1',
        location: ''
      }
    ];
    mockStore['tala_daily_events_teacher@school.gov.il'] = JSON.stringify(eventWithoutLocation);

    const html = renderToStaticMarkup(
      <DailyPedagogicalTracker
        students={mockStudents as any}
        currentUser={{ email: 'teacher@school.gov.il' } as any}
        onUpdateStudent={vi.fn()}
        onSelectStudent={vi.fn()}
      />
    );

    expect(html).toContain('שיעור פרטני עם הילה');
    expect(html).toContain('תלמיד/ה: רונן רון (דוגמא)');
    // Crucial: Must NOT contain the hardcoded location bullet
    expect(html).not.toContain('חדר טיפולים / כיתה');
  });

  it('renders custom location when explicitly provided by the teacher', () => {
    const eventWithCustomLocation = [
      {
        id: 'ev_custom_loc_1',
        title: 'תצפית חצר',
        date: todayStr,
        startTime: '11:00',
        endTime: '11:45',
        type: 'תצפית',
        studentName: 'רונן רון (דוגמא)',
        studentId: 'st_1',
        location: 'חצר מתקנים'
      }
    ];
    mockStore['tala_daily_events_teacher@school.gov.il'] = JSON.stringify(eventWithCustomLocation);

    const html = renderToStaticMarkup(
      <DailyPedagogicalTracker
        students={mockStudents as any}
        currentUser={{ email: 'teacher@school.gov.il' } as any}
        onUpdateStudent={vi.fn()}
        onSelectStudent={vi.fn()}
      />
    );

    expect(html).toContain('תצפית חצר');
    expect(html).toContain('תלמיד/ה: רונן רון (דוגמא) • חצר מתקנים');
  });
});
