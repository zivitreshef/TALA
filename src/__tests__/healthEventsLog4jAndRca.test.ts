import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  HEALTH_EVENT_KINDS,
  classifyAiError,
  getHealthEventLogLevel,
  filterVisibleAdminHealthEvents,
  formatHealthEventsAsLog4j,
  HealthEventEntity
} from '../domain/healthEvents';
import { reportDatabaseHealthError } from '../services/healthTelemetry';
import * as firebaseBackend from '../firebaseBackend';
import SystemHealthPanel from '../components/modals/SystemHealthPanel';

vi.mock('../firebaseBackend', () => ({
  getFirebaseAuth: vi.fn(() => ({ currentUser: { email: 'admin@tala.edu' } })),
  reportHealthEventToCloud: vi.fn(() => Promise.resolve(true)),
  pingFirestore: vi.fn(() => Promise.resolve({ ok: true, latencyMs: 12, message: '' }))
}));

vi.mock('../services/aiProxyClient', () => ({
  pingAiProxy: vi.fn(() => Promise.resolve({ ok: true, latencyMs: 35, category: '', status: 200, message: '' }))
}));

describe('Health Events Classification & RCA Enhancement', () => {
  it('correctly classifies TypeError with Failed to fetch as network (not client_code_error)', () => {
    const fetchTypeError = new TypeError('Failed to fetch');
    const result = classifyAiError(fetchTypeError);
    expect(result.category).toBe('network');
    expect(result.message).toContain('Failed to fetch');
  });

  it('correctly classifies Safari Load failed TypeError as network', () => {
    const safariError = new TypeError('Load failed');
    const result = classifyAiError(safariError);
    expect(result.category).toBe('network');
  });

  it('still classifies genuine JavaScript exceptions (e.g. Cannot read property) as client_code_error', () => {
    const typeError = new TypeError('Cannot read properties of undefined (reading "title")');
    const result = classifyAiError(typeError);
    expect(result.category).toBe('client_code_error');
  });

  it('classifies Firestore database errors as db_error', () => {
    const dbErr = new Error('FirebaseError: [code=permission-denied] Missing or insufficient permissions.');
    const result = classifyAiError(dbErr);
    expect(result.category).toBe('db_error');
  });
});

describe('Log4j Pattern Layout & Log Level Mapping', () => {
  const baseTime = 1773180000000; // Fixed epoch for deterministic testing

  it('maps severity levels to Log4j standards (FATAL, ERROR, WARN, INFO)', () => {
    expect(getHealthEventLogLevel({ category: 'injection' })).toBe('FATAL');
    expect(getHealthEventLogLevel({ status: 500 })).toBe('FATAL');
    expect(getHealthEventLogLevel({ kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR })).toBe('ERROR');
    expect(getHealthEventLogLevel({ kind: HEALTH_EVENT_KINDS.DB_ERROR })).toBe('ERROR');
    expect(getHealthEventLogLevel({ category: 'client_code_error' })).toBe('ERROR');
    expect(getHealthEventLogLevel({ kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK })).toBe('WARN');
    expect(getHealthEventLogLevel({ category: 'rate_limit' })).toBe('WARN');
    expect(getHealthEventLogLevel({ kind: 'custom_ping', category: 'unknown' })).toBe('INFO');
  });

  it('filters out non-alert levels and keeps only FATAL, ERROR, and WARN', () => {
    const events: HealthEventEntity[] = [
      {
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'callGeminiProxy',
        category: 'network',
        status: 0,
        message: 'Failed to fetch',
        userEmail: 'teacher@school.org',
        createdAtMs: baseTime,
        createdAtIso: new Date(baseTime).toISOString()
      },
      {
        kind: 'info_ping',
        operation: 'ping',
        category: 'unknown',
        status: 200,
        message: 'Ping ok',
        userEmail: 'teacher@school.org',
        createdAtMs: baseTime + 1000,
        createdAtIso: new Date(baseTime + 1000).toISOString()
      },
      {
        kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK,
        operation: 'workPlan',
        category: 'unknown',
        status: 0,
        message: 'local_engine_used',
        userEmail: 'teacher@school.org',
        createdAtMs: baseTime + 2000,
        createdAtIso: new Date(baseTime + 2000).toISOString()
      }
    ];

    const filtered = filterVisibleAdminHealthEvents(events);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((e) => e.kind)).toEqual([
      HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
      HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK
    ]);
  });

  it('formats events into a standard Log4j plain-text layout', () => {
    const events: HealthEventEntity[] = [
      {
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'callGeminiProxy',
        category: 'network',
        status: 0,
        message: 'Failed to fetch (latency=24ms, online=true, ver=2.6.49, type=TypeError)',
        reason: 'latency=24ms • online=true • ver=2.6.49',
        userEmail: 'nekosman@gmail.com',
        createdAtMs: baseTime,
        createdAtIso: new Date(baseTime).toISOString()
      },
      {
        kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK,
        operation: 'reverseEngineerFullReport',
        category: 'unknown',
        status: 0,
        message: 'local_engine_used',
        reason: 'local_engine_used',
        stage: 'school',
        userEmail: 'nekosman@gmail.com',
        createdAtMs: baseTime + 5000,
        createdAtIso: new Date(baseTime + 5000).toISOString()
      }
    ];

    const log4jText = formatHealthEventsAsLog4j(events);
    expect(log4jText).toContain('# TALA System Health & Diagnostics Log (Log4j Format)');
    expect(log4jText).toContain('[ERROR] [network:callGeminiProxy] [nekosman@gmail.com] - Failed to fetch');
    expect(log4jText).toContain('[WARN ] [unknown:reverseEngineerFullReport] [nekosman@gmail.com] - local_engine_used [stage=school]');
  });
});

describe('Database Health Telemetry & Admin UI Integration', () => {
  it('dispatches reportDatabaseHealthError with RCA diagnostics and DB_ERROR kind', () => {
    const reportSpy = vi.spyOn(firebaseBackend, 'reportHealthEventToCloud');
    reportDatabaseHealthError('saveStudentToCloud', new Error('permission-denied'), { studentId: 'student_123' });

    expect(reportSpy).toHaveBeenCalled();
    const lastCallArg = reportSpy.mock.calls[0][0];
    expect(lastCallArg.kind).toBe(HEALTH_EVENT_KINDS.DB_ERROR);
    expect(lastCallArg.operation).toBe('saveStudentToCloud');
    expect(lastCallArg.category).toBe('db_error');
    expect(lastCallArg.message).toContain('permission-denied');
    expect(lastCallArg.message).toContain('online=');
  });

  it('renders Log4j download button and severity badges on SystemHealthPanel', () => {
    const mockEvents: HealthEventEntity[] = [
      {
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'callGeminiProxy',
        category: 'network',
        status: 0,
        message: 'Failed to fetch',
        userEmail: 'user@test.com',
        createdAtMs: Date.now() - 1000,
        createdAtIso: new Date().toISOString()
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(SystemHealthPanel, {
        healthEvents: mockEvents,
        healthReviewedMs: 0,
        cloudSyncState: { connected: true, status: 'synced' },
        onMarkHealthReviewed: vi.fn(),
        onClearHealthEvents: vi.fn()
      })
    );

    expect(html).toContain('הורדת יומן שגיאות');
    expect(html).toContain('ERROR');
  });
});
