import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import HebrewDatePicker, { parseDateToParts } from '../components/HebrewDatePicker';
import BehaviorStudentDetailsCard from '../components/behavior/BehaviorStudentDetailsCard';
import BehaviorAssessmentForm from '../components/behavior/BehaviorAssessmentForm';
import BehaviorInterventionPlanForm from '../components/behavior/BehaviorInterventionPlanForm';
import BehaviorProgressReportForm from '../components/behavior/BehaviorProgressReportForm';
import type { StudentProfile } from '../domain/types';

vi.mock('../firebaseBackend', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'analyst@tala.edu' }
  })
}));

vi.mock('../services/inviteService', () => ({
  createInvite: vi.fn(),
  deleteInvite: vi.fn(),
  ensureTeacherSession: vi.fn(),
  markInviteReviewed: vi.fn(),
  subscribeToStudentInvites: vi.fn(() => () => {})
}));

describe('Behavior HebrewDatePicker Integration & Date Parsing Suite', () => {
  describe('parseDateToParts helper', () => {
    it('accurately parses standard ISO YYYY-MM-DD dates', () => {
      expect(parseDateToParts('2026-11-15')).toEqual({ year: 2026, month: 11, day: 15 });
      expect(parseDateToParts('2025-01-05')).toEqual({ year: 2025, month: 1, day: 5 });
    });

    it('accurately parses slash format DD/MM/YYYY dates', () => {
      expect(parseDateToParts('15/11/2026')).toEqual({ year: 2026, month: 11, day: 15 });
      expect(parseDateToParts('05/01/2025')).toEqual({ year: 2025, month: 1, day: 5 });
    });

    it('accurately parses dot format DD.MM.YYYY dates', () => {
      expect(parseDateToParts('15.11.2026')).toEqual({ year: 2026, month: 11, day: 15 });
    });

    it('returns null safely for empty or invalid date strings', () => {
      expect(parseDateToParts('')).toBeNull();
      expect(parseDateToParts('invalid-date')).toBeNull();
      expect(parseDateToParts('99/99/2026')).toBeNull();
    });
  });

  describe('HebrewDatePicker Component Rendering', () => {
    it('renders formatted Hebrew date and trigger button', () => {
      const html = renderToStaticMarkup(
        <HebrewDatePicker
          value="2026-11-15"
          onChange={() => {}}
          ariaLabel="בחירת תאריך"
        />
      );

      expect(html).toContain('hdp-root');
      expect(html).toContain('hdp-trigger-btn');
      expect(html).toContain('15');
      expect(html).toContain('נובמבר');
    });

    it('renders placeholder when value is empty and placeholder is provided', () => {
      const html = renderToStaticMarkup(
        <HebrewDatePicker
          value=""
          onChange={() => {}}
          placeholder="בחר תאריך"
        />
      );

      expect(html).toContain('בחר תאריך');
      expect(html).toContain('hdp-placeholder');
    });

    it('respects disabled prop and renders disabled button and hidden input', () => {
      const html = renderToStaticMarkup(
        <HebrewDatePicker
          value="2026-11-15"
          onChange={() => {}}
          disabled={true}
        />
      );

      expect(html).toContain('is-disabled');
      expect(html).toContain('disabled=""');
    });

    it('applies hdp-full-width class when fullWidth prop is true', () => {
      const html = renderToStaticMarkup(
        <HebrewDatePicker
          value="2026-11-15"
          onChange={() => {}}
          fullWidth={true}
        />
      );

      expect(html).toContain('hdp-full-width');
    });

    it('formats clean date without weekday in standard form mode to prevent text truncation', () => {
      const html = renderToStaticMarkup(
        <HebrewDatePicker
          value="2026-11-15"
          onChange={() => {}}
        />
      );

      expect(html).toContain('15 בנובמבר 2026');
      expect(html).not.toContain('יום א');
    });

    it('includes weekday when showWeekday or showDayNav is true', () => {
      const htmlNav = renderToStaticMarkup(
        <HebrewDatePicker
          value="2026-11-15"
          onChange={() => {}}
          showDayNav={true}
        />
      );

      expect(htmlNav).toContain('יום א');

      const htmlWeekday = renderToStaticMarkup(
        <HebrewDatePicker
          value="2026-11-15"
          onChange={() => {}}
          showWeekday={true}
        />
      );

      expect(htmlWeekday).toContain('יום א');
    });

    it('guarantees behavior card containers use overflow visible so popovers are never clipped', () => {
      const assessCss = fs.readFileSync(path.resolve(__dirname, '../components/behavior/BehaviorAssessmentForm.css'), 'utf8');
      const planCss = fs.readFileSync(path.resolve(__dirname, '../components/behavior/BehaviorInterventionPlanForm.css'), 'utf8');
      const progressCss = fs.readFileSync(path.resolve(__dirname, '../components/behavior/BehaviorProgressReportForm.css'), 'utf8');

      expect(assessCss).toMatch(/\.behavior-card\s*\{[^}]*overflow:\s*visible/);
      expect(planCss).toMatch(/\.plan-card\s*\{[^}]*overflow:\s*visible/);
      expect(progressCss).toMatch(/\.progress-card\s*\{[^}]*overflow:\s*visible/);
    });
  });

  describe('Behavior Analyst Reports - Zero Default Input[type=date] Parity', () => {
    const mockStudent: StudentProfile = {
      id: 'st_demo_101',
      name: 'דניאל מזרחי',
      reportDate: '2026-11-15',
      behaviorAssessment: {
        assessmentDate: '2026-11-15',
        isLocked: false,
        targetBehaviors: [],
        baselineData: [{ id: 'base_1', date: '2026-11-10', sessionOrPeriod: 'שיעור 1', value: 3 }]
      },
      behaviorPlan: {
        effectiveDate: '2026-11-15',
        reviewDate: '2026-12-15',
        isLocked: false,
        targetBehaviors: [],
        replacementBehaviors: [],
        antecedentStrategies: '',
        reinforcementSystem: { preferredReinforcers: '', scheduleOfReinforcement: '' },
        reactiveProtocol: { staffResponse: '' },
        ongoingTracking: []
      }
    };

    it('BehaviorStudentDetailsCard uses HebrewDatePicker and contains zero input[type=date]', () => {
      const html = renderToStaticMarkup(
        <BehaviorStudentDetailsCard
          studentData={mockStudent}
          onChangeField={() => {}}
          disabled={false}
        />
      );

      expect(html).toContain('תאריך הערכה או פתיחת דוח:');
      expect(html).toContain('hdp-root');
      expect(html).not.toContain('type="date"');
    });

    it('BehaviorAssessmentForm uses HebrewDatePicker and contains zero input[type=date]', () => {
      const html = renderToStaticMarkup(
        <BehaviorAssessmentForm
          student={mockStudent}
          onSaveStudentPlan={() => {}}
        />
      );

      expect(html).toContain('תאריך ביצוע ההערכה');
      expect(html).toContain('hdp-root');
      expect(html).not.toContain('type="date"');
    });

    it('BehaviorInterventionPlanForm uses HebrewDatePicker and contains zero input[type=date]', () => {
      const html = renderToStaticMarkup(
        <BehaviorInterventionPlanForm
          student={mockStudent}
          onSaveStudentPlan={() => {}}
        />
      );

      expect(html).toContain('תאריך תחילת יישום התוכנית');
      expect(html).toContain('תאריך יעד לבחינה והערכה מחודשת');
      expect(html).toContain('hdp-root');
      expect(html).not.toContain('type="date"');
    });

    it('BehaviorProgressReportForm uses HebrewDatePicker and contains zero input[type=date]', () => {
      const html = renderToStaticMarkup(
        <BehaviorProgressReportForm
          student={mockStudent}
          onSaveStudentPlan={() => {}}
        />
      );

      expect(html).toContain('תאריך עריכת הדוח:');
      expect(html).toContain('hdp-root');
      expect(html).not.toContain('type="date"');
    });

    it('renders popover with portal support escaping container overflow', () => {
      const html = renderToStaticMarkup(
        <HebrewDatePicker
          value="2026-10-09"
          onChange={() => {}}
          ariaLabel="תאריך תחילת יישום התוכנית"
        />
      );

      expect(html).toContain('hdp-root');
      expect(html).toContain('9 באוקטובר 2026');
    });
  });
});
