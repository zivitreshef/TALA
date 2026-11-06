import { describe, it, expect } from 'vitest';
import packageJson from '../../package.json';
import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';
import { sanitizeTelemetryPayload } from '../domain/telemetryPrivacy';
import { UsageTelemetryService } from '../services/usageTelemetryService';

describe('App Version Synchronization & Deployment Gate Compliance', () => {
  it('synchronizes package.json version with CURRENT_APP_VERSION', () => {
    expect(packageJson.version).toBe(CURRENT_APP_VERSION);
    expect(CURRENT_APP_VERSION).toBe('2.6.14');
  });

  it('guarantees telemetry envelope privacy engine attaches CURRENT_APP_VERSION', () => {
    const payload = sanitizeTelemetryPayload('session_start', { test: true }, 'teacher');
    expect(payload.appVersion).toBe(CURRENT_APP_VERSION);
    expect(payload.appVersion).toBe('2.6.14');
  });

  it('guarantees UsageTelemetryService initializes with CURRENT_APP_VERSION', () => {
    const telemetry = new UsageTelemetryService();
    expect(telemetry._appVersion).toBe(CURRENT_APP_VERSION);
    expect(telemetry._appVersion).toBe('2.6.14');
  });
});
