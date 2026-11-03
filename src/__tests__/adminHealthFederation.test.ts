import { describe, it, expect } from 'vitest';
import {
  summarizeHealthEvents,
  normalizeHealthEvents,
  HEALTH_EVENT_KINDS
} from '../domain/healthEvents';

describe('Admin Health Telemetry Federation (Option 2)', () => {
  it('summarizes empty health events correctly with ok severity', () => {
    const summary = summarizeHealthEvents([]);
    expect(summary.total).toBe(0);
    expect(summary.fallbackCount).toBe(0);
    expect(summary.affectedUsers).toBe(0);
    expect(summary.severity).toBe('ok');
  });

  it('aggregates fallbacks, affected users, and detects critical severity', () => {
    const now = Date.now();
    const mockEvents = [
      {
        kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
        operation: 'reverseEngineerFullReport',
        category: 'server_error',
        userEmail: 'teacher1@school.gov.il',
        createdAtMs: now - 1000
      },
      {
        kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK,
        operation: 'reverseEngineerFullReport',
        category: 'server_error',
        userEmail: 'teacher1@school.gov.il',
        createdAtMs: now - 500
      },
      {
        kind: HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE,
        operation: 'generateStatusReport',
        category: 'empty_response',
        userEmail: 'teacher2@school.gov.il',
        createdAtMs: now - 200
      }
    ];

    const normalized = normalizeHealthEvents(mockEvents);
    expect(normalized.length).toBe(3);
    // Newest first
    expect(normalized[0].operation).toBe('generateStatusReport');

    const summary = summarizeHealthEvents(normalized, now);
    expect(summary.total).toBe(3);
    expect(summary.fallbackCount).toBe(1);
    expect(summary.affectedUsers).toBe(2);
    expect(summary.severity).toBe('critical'); // multiple fallbacks/errors
    expect(summary.byCategory['server_error']).toBe(2);
    expect(summary.byCategory['empty_response']).toBe(1);
  });
});
