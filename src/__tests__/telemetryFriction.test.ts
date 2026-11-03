import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usageTelemetryService } from '../services/usageTelemetryService';
import {
  TELEMETRY_EVENTS,
  validateEventProperties
} from '../domain/telemetryTaxonomy';

describe('Task 3: UX Friction Telemetry Events', () => {
  beforeEach(() => {
    usageTelemetryService.clear();
    usageTelemetryService.setEnabled(true);
    usageTelemetryService.setSamplingRate(1.0);
  });

  afterEach(() => {
    usageTelemetryService.clear();
  });

  it('validates schema for FORM_DIRTY_ABANDONED and ACTION_FAILED_REPEATEDLY', () => {
    const validDirty = validateEventProperties(TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED, {
      formId: 'work_plan'
    });
    expect(validDirty.valid).toBe(true);

    const validActionFail = validateEventProperties(TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY, {
      action: 'save_student_plan',
      attemptCount: 3
    });
    expect(validActionFail.valid).toBe(true);

    const invalidActionFail = validateEventProperties(TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY, {
      action: 'save_student_plan',
      attemptCount: 0 // schema min is 1
    });
    expect(invalidActionFail.valid).toBe(false);
  });

  it('tracks form_dirty_abandoned when a modified form is closed without saving', () => {
    const tracked = usageTelemetryService.track(
      TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED,
      { formId: 'work_plan' },
      { userContext: { email: 'teacher@school.gov.il', role: 'teacher' } }
    );
    expect(tracked).toBe(true);

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].eventName).toBe(TELEMETRY_EVENTS.FORM_DIRTY_ABANDONED);
    expect(buffer[0].category).toBe('friction');
    expect(buffer[0].properties.formId).toBe('work_plan');
  });

  it('tracks search_zero_results when a search returns no matching records', () => {
    const tracked = usageTelemetryService.track(
      TELEMETRY_EVENTS.SEARCH_ZERO_RESULTS,
      { context: 'goal_bank' },
      { userContext: { email: 'teacher@school.gov.il', role: 'teacher' } }
    );
    expect(tracked).toBe(true);

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].eventName).toBe(TELEMETRY_EVENTS.SEARCH_ZERO_RESULTS);
    expect(buffer[0].category).toBe('friction');
    expect(buffer[0].properties.context).toBe('goal_bank');
  });

  it('tracks action_failed_repeatedly with attemptCount and action name', () => {
    const tracked = usageTelemetryService.track(
      TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY,
      { action: 'save_student_plan', attemptCount: 3 },
      { userContext: { email: 'teacher@school.gov.il', role: 'teacher' } }
    );
    expect(tracked).toBe(true);

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].eventName).toBe(TELEMETRY_EVENTS.ACTION_FAILED_REPEATEDLY);
    expect(buffer[0].category).toBe('friction');
    expect(buffer[0].properties.action).toBe('save_student_plan');
    expect(buffer[0].properties.attemptCount).toBe(3);
  });
});
