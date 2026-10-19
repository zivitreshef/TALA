import { describe, it, expect } from 'vitest';
import {
  HEALTH_EVENT_KINDS,
  classifyAiError,
  buildHealthEvent,
  summarizeHealthEvents,
  countUnreviewedHealthEvents,
  normalizeHealthEvents,
  buildPingResult
} from '../domain/healthEvents.js';

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;
const ev = (over = {}) => ({
  id: Math.random().toString(36).slice(2),
  kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
  category: 'rate_limit',
  userEmail: 'a@b.c',
  createdAtMs: NOW - HOUR,
  ...over
});

describe('classifyAiError', () => {
  it.each([
    [{ status: 429, message: 'Rate limit exceeded' }, 'rate_limit'],
    [{ status: 400, message: 'Prompt injection detected' }, 'injection'],
    [{ status: 400, message: 'rawText invalid length' }, 'prompt_too_long'],
    [{ status: 400, message: 'teacherFreeText too long' }, 'prompt_too_long'],
    [{ status: 401, message: 'unauthorized' }, 'auth'],
    [{ status: 502, message: 'Gemini call failed' }, 'server_error'],
    [{ message: 'Failed to fetch' }, 'network'],
    [{ status: 418, message: 'teapot' }, 'unknown']
  ])('classifies %j as %s', (err, expected) => {
    expect(classifyAiError(err).category).toBe(expected);
  });

  it('handles null / empty errors without throwing', () => {
    expect(classifyAiError(null).category).toBe('unknown');
    expect(classifyAiError({}).category).toBe('unknown');
  });
});

describe('buildHealthEvent', () => {
  it('never copies prompts or arbitrary fields (PII safety)', () => {
    const e = buildHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
      operation: 'rawPrompt',
      error: { status: 429, message: 'Rate limit exceeded' },
      user: { email: ' Teacher@School.com ' },
      extra: { promptLength: 1234, prompt: 'שם התלמיד בני רשף', studentName: 'בני', stage: 'school' },
      nowMs: NOW
    });
    expect(e.userEmail).toBe('teacher@school.com');
    expect(e.promptLength).toBe(1234);
    expect(e.stage).toBe('school');
    expect(e.category).toBe('rate_limit');
    expect(JSON.stringify(e)).not.toContain('בני');
    expect(e).not.toHaveProperty('prompt');
    expect(e).not.toHaveProperty('studentName');
  });

  it('only emits keys allowed by the Firestore rule', () => {
    const allowed = new Set([
      'kind', 'operation', 'category', 'status', 'message', 'userEmail',
      'createdAtMs', 'createdAtIso', 'promptLength', 'stage', 'reason', 'viaDirectKey'
    ]);
    const e = buildHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK,
      extra: { reason: 'local_engine_used', stage: 'school', promptLength: 5, viaDirectKey: false, junk: 1 },
      nowMs: NOW
    });
    Object.keys(e).forEach((k) => expect(allowed.has(k)).toBe(true));
  });

  it('truncates long messages to the rule limit (300)', () => {
    const e = buildHealthEvent({
      kind: HEALTH_EVENT_KINDS.AI_PROXY_ERROR,
      error: { status: 502, message: 'x'.repeat(5000) },
      nowMs: NOW
    });
    expect(e.message.length).toBeLessThanOrEqual(300);
  });

  it('marks empty AI responses with their own category', () => {
    const e = buildHealthEvent({ kind: HEALTH_EVENT_KINDS.AI_EMPTY_RESPONSE, nowMs: NOW });
    expect(e.category).toBe('empty_response');
  });
});

describe('summarizeHealthEvents', () => {
  it('is ok when there are no events in the window', () => {
    expect(summarizeHealthEvents([], NOW).severity).toBe('ok');
    expect(summarizeHealthEvents([ev({ createdAtMs: NOW - 48 * HOUR })], NOW).total).toBe(0);
  });

  it('warns on isolated errors and goes critical on a local fallback', () => {
    expect(summarizeHealthEvents([ev()], NOW).severity).toBe('warn');
    const critical = summarizeHealthEvents(
      [ev(), ev({ kind: HEALTH_EVENT_KINDS.AI_LOCAL_FALLBACK, category: 'unknown' })],
      NOW
    );
    expect(critical.severity).toBe('critical');
    expect(critical.fallbackCount).toBe(1);
  });

  it('goes critical after 5 repeated errors and counts affected users', () => {
    const many = Array.from({ length: 5 }, (_, i) => ev({ userEmail: `u${i % 2}@x.y`, createdAtMs: NOW - i * 1000 }));
    const s = summarizeHealthEvents(many, NOW);
    expect(s.severity).toBe('critical');
    expect(s.affectedUsers).toBe(2);
    expect(s.byCategory.rate_limit).toBe(5);
  });
});

describe('countUnreviewedHealthEvents / normalizeHealthEvents', () => {
  it('counts only events newer than the reviewed watermark', () => {
    const events = [ev({ createdAtMs: NOW - 3 * HOUR }), ev({ createdAtMs: NOW - HOUR })];
    expect(countUnreviewedHealthEvents(events, 0, NOW)).toBe(2);
    expect(countUnreviewedHealthEvents(events, NOW - 2 * HOUR, NOW)).toBe(1);
    expect(countUnreviewedHealthEvents(events, NOW, NOW)).toBe(0);
  });

  it('drops malformed docs and sorts newest first', () => {
    const out = normalizeHealthEvents([{ kind: 'x' }, null, ev({ createdAtMs: 1 }), ev({ createdAtMs: 5 })]);
    expect(out.map((e) => e.createdAtMs)).toEqual([5, 1]);
  });
});

describe('buildPingResult', () => {
  it('reports success and failure with latency', () => {
    expect(buildPingResult('ai', 100, 350)).toMatchObject({ ok: true, latencyMs: 250 });
    const bad = buildPingResult('ai', 100, 150, { status: 429, message: 'Rate limit exceeded' });
    expect(bad).toMatchObject({ ok: false, category: 'rate_limit', status: 429 });
  });
});
