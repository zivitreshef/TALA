import { describe, it, expect } from 'vitest';
import {
  INVITE_TTL_DAYS,
  MAX_ANSWER_LENGTH,
  buildInviteDoc,
  buildInviteUrl,
  buildWhatsAppShareUrl,
  generateInviteToken,
  getInviteQuestions,
  getInviteState,
  hasAnyAnswer,
  isValidInviteToken,
  parseInviteTokenFromHash,
  sanitizeResponses,
  summarizeInvites,
  buildVoiceMergeText,
  appendToFreeText
} from '../domain/parentInvite';

describe('parentInvite - token & URL', () => {
  it('generates unique 22-char url-safe tokens', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(isValidInviteToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('round-trips a token through the hash route and rejects junk', () => {
    const token = generateInviteToken();
    const url = buildInviteUrl('https://zivitreshef.github.io/TALA/?x=1#old', token);
    expect(url).toBe(`https://zivitreshef.github.io/TALA/#/share-input/${token}`);
    expect(parseInviteTokenFromHash(new URL(url).hash)).toBe(token);
    expect(parseInviteTokenFromHash('#/share-input/short')).toBeNull();
    expect(parseInviteTokenFromHash('#/other/' + token)).toBeNull();
    expect(parseInviteTokenFromHash('')).toBeNull();
  });

  it('WhatsApp message carries the link and first name only', () => {
    const wa = buildWhatsAppShareUrl('https://x/#/share-input/abc', { childFirstName: 'נועם' });
    const text = decodeURIComponent(wa.split('?text=')[1]);
    expect(text).toContain('https://x/#/share-input/abc');
    expect(text).toContain('נועם');
  });
});

describe('parentInvite - invite doc', () => {
  const now = new Date('2026-10-16T12:00:00Z');

  it('builds a pending doc with 7-day expiry, lowercase owner, first name only', () => {
    const d = buildInviteDoc({
      ownerEmail: ' Teacher@Example.com ',
      studentId: 's1',
      childFirstName: 'נועם ישראלי',
      gender: 'girl',
      now
    });
    expect(d.ownerEmail).toBe('teacher@example.com');
    expect(d.childFirstName).toBe('נועם');
    expect(d.gender).toBe('girl');
    expect(d.status).toBe('pending');
    expect(d.expiresAt.getTime() - now.getTime()).toBe(INVITE_TTL_DAYS * 86400000);
    expect(JSON.stringify(d)).not.toContain('ישראלי');
  });

  it('rejects missing owner or student', () => {
    expect(() => buildInviteDoc({ ownerEmail: '', studentId: 's1' })).toThrow();
    expect(() => buildInviteDoc({ ownerEmail: 'a@b.c', studentId: '' })).toThrow();
  });
});

describe('parentInvite - state', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  it('classifies missing / pending / expired / submitted', () => {
    expect(getInviteState(null, now)).toBe('missing');
    expect(getInviteState({ status: 'pending', expiresAt: new Date(now + 1000) }, now)).toBe('pending');
    expect(getInviteState({ status: 'pending', expiresAt: new Date(now - 1000) }, now)).toBe('expired');
    expect(getInviteState({ status: 'pending', expiresAt: { toMillis: () => now + 5 } }, now)).toBe('pending');
    expect(getInviteState({ status: 'pending' }, now)).toBe('expired');
    expect(getInviteState({ status: 'submitted', expiresAt: new Date(now - 1000) }, now)).toBe('submitted');
  });
});

describe('parentInvite - responses & questions', () => {
  it('keeps only known keys, trims, clamps length', () => {
    const clean = sanitizeResponses({
      strengths: '  אוהב לצייר  ',
      challenges: '   ',
      goal: 'א'.repeat(MAX_ANSWER_LENGTH + 50),
      evil: 'x'
    });
    expect(Object.keys(clean).sort()).toEqual(['goal', 'strengths']);
    expect(clean.strengths).toBe('אוהב לצייר');
    expect(clean.goal.length).toBe(MAX_ANSWER_LENGTH);
  });

  it('hasAnyAnswer is false for blank input', () => {
    expect(hasAnyAnswer({})).toBe(false);
    expect(hasAnyAnswer({ goal: '  ' })).toBe(false);
    expect(hasAnyAnswer({ goal: 'x' })).toBe(true);
  });

  it('returns 3 gendered questions', () => {
    const girl = getInviteQuestions({ childName: 'נועה', gender: 'girl' });
    expect(girl.map((q) => q.key)).toEqual(['strengths', 'challenges', 'goal']);
    expect(girl[0].label).toContain('אוהבת');
    const boy = getInviteQuestions({ childName: 'נועם', gender: 'boy' });
    expect(boy[0].label).toContain('אוהב לעשות');
    expect(boy[0].label).not.toContain('אוהבת');
  });
});

describe('parentInvite - teacher side', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  const future = new Date(now + 86400000);
  const mk = (over) => ({ token: 't', status: 'pending', expiresAt: future, createdAt: new Date(now), ...over });

  it('summarizes none / waiting / received', () => {
    expect(summarizeInvites([], now).status).toBe('none');
    expect(summarizeInvites([mk()], now).status).toBe('waiting');
    expect(summarizeInvites([mk({ expiresAt: new Date(now - 1) })], now).status).toBe('none');
    const received = mk({ status: 'submitted', responses: { goal: 'לקרוא' } });
    expect(summarizeInvites([mk(), received], now).status).toBe('received');
  });

  it('ignores reviewed or empty submissions', () => {
    const reviewed = mk({ status: 'submitted', responses: { goal: 'x' }, reviewedAction: 'merged' });
    const empty = mk({ status: 'submitted', responses: {} });
    expect(summarizeInvites([reviewed, empty], now).status).toBe('none');
  });

  it('keeps only the newest pending invite', () => {
    const older = mk({ token: 'old', createdAt: new Date(now - 5000) });
    const newer = mk({ token: 'new' });
    expect(summarizeInvites([older, newer], now).pending.token).toBe('new');
  });

  it('builds a labeled merge block and appends without clobbering existing text', () => {
    const block = buildVoiceMergeText({
      responses: { strengths: 'אוהב\nלצייר', goal: 'לקרוא' }
    });
    expect(block).toContain('קול ההורים');
    expect(block).toContain('• חוזקות ותחומי עניין: אוהב לצייר');
    expect(block).not.toContain('קשיים');
    expect(buildVoiceMergeText({ responses: {} })).toBe('');
    expect(appendToFreeText('  טקסט קיים ', block)).toBe(`טקסט קיים\n\n${block}`);
    expect(appendToFreeText('', block)).toBe(block);
  });
});
