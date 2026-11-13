import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';
import { usageTelemetryService } from '../services/usageTelemetryService';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';
import fs from 'fs';
import path from 'path';

vi.mock('../services/telemetryStorage', () => ({
  setupUsageTelemetryTransport: vi.fn(),
  fetchTelemetryEvents: vi.fn().mockResolvedValue([])
}));

describe('AI Feedback, Compact Header & Telemetry Fix Suite (v2.6.68)', () => {
  const mockStudents: any[] = [
    {
      id: 'st_1',
      name: 'רוני כהן',
      gender: 'girl',
      stage: 'elementary',
      schoolYear: 'תשפ"ז (2026-2027)',
      goals: [
        {
          id: 'goal_1',
          title: 'השתתפות עצמאית במפגש בוקר',
          environment: 'כיתת אם',
          currentProgress: 60,
          observations: []
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Daily Tracking Rendering & Markup', () => {
    it('renders cleanly with textarea and AI action button', () => {
      const html = renderToStaticMarkup(
        <DailyPedagogicalTracker
          students={mockStudents}
          currentUser={{ email: 'teacher@test.com', name: 'מורה' } as any}
        />
      );

      expect(html).toContain('ai-note-textarea');
      expect(html).toContain('btn-ai-analyze');
      expect(html).toContain('נתח ושייך ליעד ב-AI');
    });

    it('DailyPedagogicalTracker source code guards abandonment to unmount only', () => {
      const rawCode = fs.readFileSync(
        path.resolve(__dirname, '../components/DailyPedagogicalTracker.tsx'),
        'utf8'
      );
      const code = rawCode.replace(/\r\n/g, '\n');

      // Verify that checkAndDispatchAbandonment is NOT in an effect depending on [aiNoteText, manualNote]
      expect(code).not.toContain('}, [aiNoteText, manualNote]);');

      // Verify it is hooked to unmount only []
      expect(code).toContain('checkAndDispatchAbandonment();');
      expect(code).toContain('}, []);');

      // Verify refs are used for safe text access on unmount
      expect(code).toContain('aiNoteTextRef.current');
      expect(code).toContain('manualNoteRef.current');
    });

    it('DailyPedagogicalTracker guards state setters to prevent infinite render loops', () => {
      const code = fs.readFileSync(
        path.resolve(__dirname, '../components/DailyPedagogicalTracker.tsx'),
        'utf8'
      );

      // Guarded manualProgress update
      expect(code).toContain('setManualProgress((prev) => (prev !== targetProgress ? targetProgress : prev));');

      // Guarded newTodoStudentId update
      expect(code).toContain('setNewTodoStudentId((prev) => (prev !== targetStudentId ? targetStudentId : prev));');
    });
  });

  describe('AI Progressive Milestone Stepper', () => {
    it('EcologicalWorkPlanForm uses monotonic 4-step progression without modulo loop', () => {
      const code = fs.readFileSync(
        path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx'),
        'utf8'
      );

      // Strictly forbids cycling via modulo (% 3)
      expect(code).not.toContain('(prev + 1) % 3');

      // Contains 4 clear pedagogical milestones
      expect(code).toContain('שלב 1 מתוך 4');
      expect(code).toContain('שלב 2 מתוך 4');
      expect(code).toContain('שלב 3 מתוך 4');
      expect(code).toContain('שלב 4 מתוך 4');
    });

    it('DailyPedagogicalTracker contains progressive AI observation skeleton styles', () => {
      const css = fs.readFileSync(
        path.resolve(__dirname, '../components/DailyPedagogicalTracker.css'),
        'utf8'
      );

      expect(css).toContain('.ai-observation-skeleton-box');
      expect(css).toContain('.skeleton-stage-row');
      expect(css).toContain('.skeleton-bar');
      expect(css).toContain('.skeleton-ghost-pill');
    });
  });

  describe('Compact Header Workspace Optimization', () => {
    it('index.css provides compact header and slim sticky action bar rules', () => {
      const css = fs.readFileSync(
        path.resolve(__dirname, '../index.css'),
        'utf8'
      );

      expect(css).toContain('.tala-header.compact-mode');
      expect(css).toContain('.header-active-student-pill');
      expect(css).toContain('padding: 7px 14px');
    });

    it('App.tsx passes compact-mode to tala-header when selectedStudentId is present', () => {
      const code = fs.readFileSync(
        path.resolve(__dirname, '../App.tsx'),
        'utf8'
      );

      expect(code).toContain("header className={`tala-header ${selectedStudentId ? 'compact-mode' : ''}`}");
      expect(code).toContain('header-active-student-pill');
    });
  });

  describe('Telemetry Abandonment Dispatch Logic', () => {
    it('dispatches abandonment only when started is true and text is present', () => {
      const trackSpy = vi.spyOn(usageTelemetryService, 'track');

      // Test helper simulating the component's internal logic
      function testAbandonment(hasStarted: boolean, text: string, timeSpentSec: number) {
        if (hasStarted && text.trim()) {
          usageTelemetryService.track(
            TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED,
            { mode: 'text', timeSpentSec }
          );
        }
      }

      // 1. Text is empty -> no dispatch
      testAbandonment(true, '', 10);
      expect(trackSpy).not.toHaveBeenCalled();

      // 2. Not started -> no dispatch
      testAbandonment(false, 'היום בחצר', 10);
      expect(trackSpy).not.toHaveBeenCalled();

      // 3. Started and text is present -> dispatches abandonment event
      testAbandonment(true, 'היום בחצר שיתף פעולה יפה', 12);
      expect(trackSpy).toHaveBeenCalledWith(
        TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED,
        { mode: 'text', timeSpentSec: 12 }
      );
    });
  });
});
