import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeTelemetryPayload,
  detectDeviceCategory,
  detectIsPwa
} from '../domain/telemetryPrivacy';
import { computeTechnicalHealthMetrics } from '../domain/telemetryAggregator';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';

describe('Telemetry Device & Smartphone Detection', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
  });

  it('detects desktop device when width > 1024 without mobile user agent', () => {
    vi.stubGlobal('window', { innerWidth: 1440, matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });

    expect(detectDeviceCategory()).toBe('desktop');
    expect(detectIsPwa()).toBe(false);
  });

  it('detects mobile smartphone when userAgent is iPhone or Android mobile', () => {
    vi.stubGlobal('window', { innerWidth: 390, matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' });

    expect(detectDeviceCategory()).toBe('mobile');
  });

  it('detects tablet when userAgent is iPad or width is between 769 and 1024', () => {
    vi.stubGlobal('window', { innerWidth: 820, matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X)' });

    expect(detectDeviceCategory()).toBe('tablet');
  });

  it('detects installed PWA standalone mode', () => {
    vi.stubGlobal('window', {
      innerWidth: 412,
      matchMedia: (query: string) => ({ matches: query === '(display-mode: standalone)' })
    });
    vi.stubGlobal('navigator', { standalone: true });

    expect(detectIsPwa()).toBe(true);
  });

  it('attaches deviceType and isPwa to the telemetry envelope', () => {
    vi.stubGlobal('window', { innerWidth: 375, matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });

    const envelope = sanitizeTelemetryPayload(TELEMETRY_EVENTS.STUDENT_CREATED, {
      educationalFramework: 'גן שילוב'
    }, 'teacher@test.com');

    expect(envelope).not.toBeNull();
    expect(envelope?.deviceType).toBe('mobile');
    expect(envelope?.isPwa).toBe(false);
    expect(envelope?.appVersion).toBe('3.0.21');
  });

  it('aggregates device counts correctly in technical health metrics', () => {
    const mockEvents: any[] = [
      { eventName: TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, deviceType: 'mobile', properties: {} },
      { eventName: TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, deviceType: 'mobile', properties: {} },
      { eventName: TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, deviceType: 'desktop', properties: {} },
      { eventName: TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, deviceType: 'tablet', properties: {} }
    ];

    const health = computeTechnicalHealthMetrics(mockEvents);
    expect(health.devices.mobile).toBe(2);
    expect(health.devices.desktop).toBe(1);
    expect(health.devices.tablet).toBe(1);
  });
});
