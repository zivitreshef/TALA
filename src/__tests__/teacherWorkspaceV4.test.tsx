import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SmartAlertSlot,
  SmartAlertBell,
  buildSmartAlerts
} from '../components/v4/SmartAlertSlot';
import { StudentCardV4 } from '../components/v4/StudentCardV4';
import { TeacherLandingV4 } from '../components/v4/TeacherLandingV4';
import {
  readV4WorkspaceEnabled,
  writeV4WorkspaceEnabled,
  V4_WORKSPACE_STORAGE_KEY
} from '../components/v4/workspaceFlag';
import EcologicalWorkPlanForm from '../EcologicalWorkPlanForm';

function makeStudent(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id || 'st_1',
    name: overrides.name || 'יונתן לוי',
    educationalFramework: overrides.educationalFramework || 'גן אלונים',
    ownerEmail: overrides.ownerEmail || 'teacher@school.org',
    isLocked: overrides.isLocked ?? false,
    sharedWith: overrides.sharedWith || [],
    goals: overrides.goals || [
      {
        id: 'g1',
        environment: 'שפה ותקשורת',
        title: 'יבקש עזרה במילים',
        objectives: [],
        observations: []
      }
    ],
    dailyObservations: overrides.dailyObservations || [],
    ...overrides
  };
}

describe('TALA v4.0.0 Workspace Feature Flag & Rollback Safety', () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    (globalThis as any).window = {
      location: { href: 'http://localhost/' },
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        }
      }
    };
  });

  it('defaults to enabled and cleanly toggles back to classic 3.0.96 mode', () => {
    expect(readV4WorkspaceEnabled()).toBe(true);
    writeV4WorkspaceEnabled(false);
    expect(store[V4_WORKSPACE_STORAGE_KEY]).toBe('false');
    expect(readV4WorkspaceEnabled()).toBe(false);
    writeV4WorkspaceEnabled(true);
    expect(readV4WorkspaceEnabled()).toBe(true);
  });
});

describe('SmartAlertSlot & SmartAlertBell (Mandatory vs Dismissible Alerts)', () => {
  it('renders blocking offline alert without a dismiss button and prioritizes it over informational alerts', () => {
    const html = renderToStaticMarkup(
      <SmartAlertSlot
        isOnline={false}
        justReconnected={false}
        isDirty={true}
        onSaveCurrentWork={vi.fn()}
        hasAppUpdate={true}
        newPublishedVersion="4.0.1"
        isAppUpdateDismissed={false}
        onDismissAppUpdate={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="v4-blocking-alert-slot"');
    expect(html).toContain('data-testid="v4-alert-offline"');
    expect(html).not.toContain('data-testid="v4-info-alert-slot"');
    // Mandatory blocking alert must NEVER expose a dismiss button
    expect(html).not.toContain('aria-label="סגירת הודעה"');
    expect(html).toContain('שמירה מקומית עכשיו');
  });

  it('keeps dismissed informational alerts discoverable in SmartAlertBell while hiding top banner', () => {
    const dismissedProps = {
      isOnline: true,
      justReconnected: false,
      isDirty: false,
      hasAppUpdate: true,
      newPublishedVersion: '4.0.1',
      isAppUpdateDismissed: true,
      onRefreshApp: vi.fn(),
      onDismissAppUpdate: vi.fn()
    };

    const { blocking, informational, dismissedDiscoverable } = buildSmartAlerts(dismissedProps);
    expect(blocking).toHaveLength(0);
    expect(informational).toHaveLength(0);
    expect(dismissedDiscoverable).toHaveLength(1);
    expect(dismissedDiscoverable[0].id).toBe('app_update');

    const slotHtml = renderToStaticMarkup(<SmartAlertSlot {...dismissedProps} />);
    expect(slotHtml).toBe('');

    const bellHtml = renderToStaticMarkup(<SmartAlertBell alertsProps={dismissedProps} />);
    expect(bellHtml).toContain('data-testid="v4-alert-bell-btn"');
    expect(bellHtml).toContain('data-testid="v4-alert-bell-count">1<');
  });

  it('renders multiple simultaneous blocking alerts together without hiding any critical alert', () => {
    const html = renderToStaticMarkup(
      <SmartAlertSlot
        isOnline={false}
        justReconnected={false}
        isDirty={false}
        upgradeBanner={{ active: true, message: 'עדכון כללי אבטחה' }}
        lockedOutUsersCount={2}
        lockedOutUsersNames={['דנה', 'אורי']}
      />
    );

    expect(html).toContain('data-testid="v4-alert-offline"');
    expect(html).toContain('data-testid="v4-alert-upgrade"');
    expect(html).toContain('data-testid="v4-alert-security_lockout"');
  });
});

describe('StudentCardV4 (Status Hierarchy, Quick Observation, Accessibility & Clean Markup)', () => {
  it('renders primary status, secondary status, direct quick observation button, kebab menu, and keyboard semantics', () => {
    const student = makeStudent({ id: 'st_99', name: 'נועה ברק', goals: [] });

    const html = renderToStaticMarkup(
      <StudentCardV4
        student={student}
        currentUserEmail="teacher@school.org"
        isOwnedByUser={true}
        onSelectStudent={vi.fn()}
        onQuickRecord={vi.fn()}
        onArchiveStudent={vi.fn()}
        onDeleteStudent={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="v4-student-card-st_99"');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('נועה ברק');
    expect(html).toContain('טרם תועדה תצפית');
    expect(html).toContain('טרם הוגדרו מטרות');
    expect(html).toContain('data-testid="v4-quick-obs-st_99"');
    expect(html).toContain('data-testid="v4-kebab-btn-st_99"');
    // Must not contain redundant footer label
    expect(html).not.toContain('כניסה לתוכנית ויומן');
  });

  it('hides kebab archive/delete menu when student is shared (not owned by user)', () => {
    const student = makeStudent({
      id: 'st_shared',
      name: 'עמית רון',
      ownerEmail: 'colleague@school.org'
    });

    const html = renderToStaticMarkup(
      <StudentCardV4
        student={student}
        currentUserEmail="teacher@school.org"
        isOwnedByUser={false}
        onSelectStudent={vi.fn()}
        onQuickRecord={vi.fn()}
        onArchiveStudent={vi.fn()}
        onDeleteStudent={vi.fn()}
      />
    );

    expect(html).toContain('שותף עמך');
    expect(html).toContain('data-testid="v4-quick-obs-st_shared"');
    expect(html).not.toContain('data-testid="v4-kebab-btn-st_shared"');
  });
});

describe('TeacherLandingV4 (First-Time Teacher vs Returning Teacher)', () => {
  it('renders dedicated calm empty state for first-time teacher with 0 students', () => {
    const html = renderToStaticMarkup(
      <TeacherLandingV4
        currentUser={{ name: 'שרה לוי', email: 'sara@school.org' }}
        userStudents={[]}
        filteredStudents={[]}
        frameworkClusters={[]}
        studentSearch=""
        onChangeSearch={vi.fn()}
        studentSortBy="framework"
        onChangeSortBy={vi.fn()}
        userPreferences={{}}
        isStudentOwnedByUser={() => true}
        onAddNewStudent={vi.fn()}
        onSelectStudent={vi.fn()}
        onQuickRecordStudent={vi.fn()}
        onArchiveStudent={vi.fn()}
        onDeleteStudent={vi.fn()}
        onOpenDailyTracker={vi.fn()}
        onOpenTeamReport={vi.fn()}
        onOptInReminder={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="v4-new-teacher-landing"');
    expect(html).toContain('data-testid="v4-first-student-cta"');
    expect(html).toContain('הוספת תלמיד/ה ראשונ/ה');
    expect(html).not.toContain('data-testid="v4-student-search-input"');
  });

  it('renders returning teacher roster for large student lists with search, filters, and collapsed pulse disclosure', () => {
    const students = Array.from({ length: 24 }, (_, idx) =>
      makeStudent({
        id: `st_${idx + 1}`,
        name: `תלמיד ${idx + 1}`,
        educationalFramework: idx % 2 === 0 ? 'גן אלונים' : 'בי״ס גפן'
      })
    );

    const html = renderToStaticMarkup(
      <TeacherLandingV4
        currentUser={{ name: 'שרה לוי', email: 'teacher@school.org' }}
        userStudents={students}
        filteredStudents={students}
        frameworkClusters={[
          ['גן אלונים', students.filter((_, i) => i % 2 === 0)],
          ['בי״ס גפן', students.filter((_, i) => i % 2 === 1)]
        ]}
        studentSearch=""
        onChangeSearch={vi.fn()}
        studentSortBy="framework"
        onChangeSortBy={vi.fn()}
        userPreferences={{}}
        isStudentOwnedByUser={() => true}
        onAddNewStudent={vi.fn()}
        onSelectStudent={vi.fn()}
        onQuickRecordStudent={vi.fn()}
        onArchiveStudent={vi.fn()}
        onDeleteStudent={vi.fn()}
        onOpenDailyTracker={vi.fn()}
        onOpenTeamReport={vi.fn()}
        onOptInReminder={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="v4-returning-teacher-landing"');
    expect(html).toContain('data-testid="v4-student-card-st_1"');
    expect(html).toContain('data-testid="v4-student-card-st_24"');
    expect(html).toContain('data-testid="v4-student-search-input"');
    expect(html).toContain('data-testid="v4-pulse-toggle-btn"');
    expect(html).toContain('aria-expanded="false"');
  });
});

describe('EcologicalWorkPlanForm v4 Progressive Disclosure (Goal 1 Expanded, Goal 2+ Collapsed, Zero Data Loss)', () => {
  it('expands first goal by default, collapses remaining goals, and keeps controlled values mounted in DOM', () => {
    const student = makeStudent({
      id: 'st_prog_1',
      name: 'תמר כהן',
      goals: [
        {
          id: 'goal_alpha',
          environment: 'שפה ותקשורת',
          title: 'מטרה ראשונה',
          activityParticipation: 'טקסט התחלתי',
          objectives: ['יעד 1'],
          observations: []
        },
        {
          id: 'goal_beta',
          environment: 'כישורים חברתיים',
          title: 'מטרה שנייה',
          activityParticipation: 'תיאור שני שמור',
          objectives: ['יעד 2'],
          observations: []
        }
      ]
    });

    const html = renderToStaticMarkup(
      <EcologicalWorkPlanForm
        student={student}
        allStudents={[student]}
        goalBank={[]}
        currentUser={{ name: 'שרה', email: 'teacher@school.org', role: 'teacher' }}
        onSaveStudentPlan={vi.fn()}
        useModernWorkspaceV4={true}
      />
    );

    // Toolbar with Expand All / Collapse All is present
    expect(html).toContain('data-testid="v4-goals-collapse-toolbar"');
    expect(html).toContain('data-testid="v4-expand-all-goals"');
    expect(html).toContain('data-testid="v4-collapse-all-goals"');

    // Goal 1 is expanded by default (aria-hidden="false"), Goal 2 is collapsed (aria-hidden="true")
    expect(html).toContain('aria-hidden="false" data-testid="v4-goal-body-goal_alpha"');
    expect(html).toContain('aria-hidden="true" data-testid="v4-goal-body-goal_beta"');

    // Collapsed Goal 2 still displays its title summary AND preserves its data in DOM
    expect(html).toContain('data-testid="v4-goal-summary-goal_beta"');
    expect(html).toContain('מטרה שנייה');
    expect(html).toContain('יעד 2');
  });

  it('preserves classic 3.0.96 all-expanded behavior when useModernWorkspaceV4 is false', () => {
    const student = makeStudent({
      id: 'st_classic_1',
      name: 'דניאל לוי',
      goals: [
        { id: 'g_a', environment: 'שפה', title: 'מטרה א', objectives: [], observations: [] },
        { id: 'g_b', environment: 'חברתי', title: 'מטרה ב', objectives: [], observations: [] }
      ]
    });

    const html = renderToStaticMarkup(
      <EcologicalWorkPlanForm
        student={student}
        allStudents={[student]}
        goalBank={[]}
        currentUser={{ name: 'שרה', email: 'teacher@school.org', role: 'teacher' }}
        onSaveStudentPlan={vi.fn()}
        useModernWorkspaceV4={false}
      />
    );

    expect(html).not.toContain('data-testid="v4-goals-collapse-toolbar"');
    expect(html).toContain('aria-hidden="false" data-testid="v4-goal-body-g_a"');
    expect(html).toContain('aria-hidden="false" data-testid="v4-goal-body-g_b"');
  });
});
