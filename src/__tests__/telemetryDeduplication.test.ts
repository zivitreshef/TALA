import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usageTelemetryService } from '../services/usageTelemetryService';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';
import { trackPedagogicalChatSessionStarted } from '../App';

describe('Task 4: Telemetry Deduplication and Boundary Enforcement', () => {
  beforeEach(() => {
    usageTelemetryService.clear();
    usageTelemetryService.setEnabled(true);
    usageTelemetryService.setSamplingRate(1.0);
  });

  afterEach(() => {
    usageTelemetryService.clear();
  });

  it('unifies chat session tracking via trackPedagogicalChatSessionStarted', () => {
    trackPedagogicalChatSessionStarted({
      triggerSource: 'floating_dock',
      email: 'teacher@school.gov.il'
    });

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].eventName).toBe(TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED);
    expect(buffer[0].properties.triggerSource).toBe('floating_dock');
  });

  it('verifies deduplication window prevents back-to-back duplicate events within 2000ms', () => {
    const first = usageTelemetryService.track(
      TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED,
      { triggerSource: 'floating_dock' },
      { userContext: { email: 'teacher@school.gov.il' } }
    );
    expect(first).toBe(true);

    const second = usageTelemetryService.track(
      TELEMETRY_EVENTS.PEDAGOGICAL_CHAT_SESSION_STARTED,
      { triggerSource: 'floating_dock' },
      { userContext: { email: 'teacher@school.gov.il' } }
    );
    // Duplicate call with identical properties within DEDUP_WINDOW_MS is suppressed
    expect(second).toBe(false);

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
  });
});
