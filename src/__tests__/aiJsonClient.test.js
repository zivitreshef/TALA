import { describe, it, expect, vi } from 'vitest';
vi.mock('../services/aiProxyClient', () => ({ callAiProxyEndpoint: vi.fn() }));
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import { parseAiJsonResult, callAiJson } from '../services/aiJsonClient';

describe('parseAiJsonResult', () => {
  it('parses direct JSON', () => expect(parseAiJsonResult({ raw: '{"a":1}' })).toEqual({ a: 1 }));
  it('salvages fenced JSON from prose', () =>
    expect(parseAiJsonResult({ raw: 'הנה:\n```json\n{"a":1}\n```' })).toEqual({ a: 1 }));
  it('passes through unparseable prose', () => {
    const r = { raw: 'אין כאן JSON' };
    expect(parseAiJsonResult(r)).toBe(r);
  });
  it('passes through structured goal results', () => {
    const r = { goals: [], raw: '{"x":1}' };
    expect(parseAiJsonResult(r)).toBe(r);
  });
});

describe('callAiJson', () => {
  it('masks the student name and returns null on proxy failure', async () => {
    callAiProxyEndpoint.mockRejectedValueOnce(new Error('down'));
    expect(await callAiJson('ספר על נועה כהן', { name: 'נועה כהן', gender: 'girl' })).toBeNull();
    expect(callAiProxyEndpoint.mock.calls[0][0].payload.prompt).not.toContain('נועה כהן');
  });
});
