import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usageTelemetryService } from '../services/usageTelemetryService';
import {
  TELEMETRY_EVENTS,
  validateEventProperties
} from '../domain/telemetryTaxonomy';
import {
  trackSessionStart,
  trackSessionEnd,
  trackNavigateScreen
} from '../App';

describe('Task 1: Session Lifecycle & Navigation Telemetry', () => {
  beforeEach(() => {
    usageTelemetryService.clear();
    usageTelemetryService.setEnabled(true);
    usageTelemetryService.setSamplingRate(1.0);
  });

  afterEach(() => {
    usageTelemetryService.clear();
  });

  it('validates SESSION_END properties schema', () => {
    const valid = validateEventProperties(TELEMETRY_EVENTS.SESSION_END, { durationSec: 120 });
    expect(valid.valid).toBe(true);

    const invalid = validateEventProperties(TELEMETRY_EVENTS.SESSION_END, { durationSec: -5 });
    expect(invalid.valid).toBe(false);
  });

  it('tracks session_start event correctly into ring buffer', () => {
    const tracked = trackSessionStart({ email: 'teacher@school.gov.il', role: 'teacher' });
    expect(tracked).toBe(true);

    const events = usageTelemetryService.getRingBuffer();
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe(TELEMETRY_EVENTS.SESSION_START);
    expect(events[0].category).toBe('engagement');
  });

  it('tracks session_end event with durationSec into ring buffer', () => {
    const tracked = trackSessionEnd({ durationSec: 345, email: 'teacher@school.gov.il' });
    expect(tracked).toBe(true);

    const events = usageTelemetryService.getRingBuffer();
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe(TELEMETRY_EVENTS.SESSION_END);
    expect(events[0].properties.durationSec).toBe(345);
    expect(events[0].category).toBe('engagement');
  });

  it('tracks navigate_screen event with target screen name', () => {
    const tracked = trackNavigateScreen('daily_tracker', { email: 'teacher@school.gov.il' });
    expect(tracked).toBe(true);

    const events = usageTelemetryService.getRingBuffer();
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe(TELEMETRY_EVENTS.NAVIGATE_SCREEN);
    expect(events[0].properties.screen).toBe('daily_tracker');
    expect(events[0].category).toBe('engagement');
  });
});
