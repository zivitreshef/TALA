import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usageTelemetryService } from '../services/usageTelemetryService';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';

describe('Task 2: Core Workflow Telemetry Events', () => {
  beforeEach(() => {
    usageTelemetryService.clear();
    usageTelemetryService.setEnabled(true);
    usageTelemetryService.setSamplingRate(1.0);
  });

  afterEach(() => {
    usageTelemetryService.clear();
  });

  it('tracks goal_created event with stage and non-PII properties', () => {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.GOAL_CREATED,
      { stage: 'elementary', isTalaMode: true, source: 'manual' },
      { userContext: { email: 'teacher@school.gov.il', role: 'teacher' } }
    );

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].eventName).toBe(TELEMETRY_EVENTS.GOAL_CREATED);
    expect(buffer[0].category).toBe('workflow');
    expect(buffer[0].properties.stage).toBe('elementary');
    expect(buffer[0].properties.isTalaMode).toBe(true);
  });

  it('tracks goal_updated event with goals count and stage', () => {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.GOAL_UPDATED,
      { goalsCount: 3, stage: 'kindergarten' },
      { userContext: { email: 'teacher@school.gov.il', role: 'teacher' } }
    );

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].eventName).toBe(TELEMETRY_EVENTS.GOAL_UPDATED);
    expect(buffer[0].category).toBe('workflow');
    expect(buffer[0].properties.goalsCount).toBe(3);
  });

  it('tracks parent_voice_link_created event with customization flag', () => {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.PARENT_VOICE_LINK_CREATED,
      { isCustomized: true },
      { userContext: { email: 'teacher@school.gov.il', role: 'teacher' } }
    );

    const buffer = usageTelemetryService.getRingBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].eventName).toBe(TELEMETRY_EVENTS.PARENT_VOICE_LINK_CREATED);
    expect(buffer[0].category).toBe('workflow');
    expect(buffer[0].properties.isCustomized).toBe(true);
  });
});
