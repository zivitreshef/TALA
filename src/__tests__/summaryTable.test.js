import { describe, it, expect } from 'vitest';
import { buildSummaryTablePrompt, applyAiSummary } from '../domain/summaryTable';

describe('summaryTable', () => {
  it('embeds free text and numbered goals', () => {
    const p = buildSummaryTablePrompt({
      freeText: 'טקסט',
      goals: [{ environment: 'כיתה', title: 'מטרה' }],
      isKindergarten: false
    });
    expect(p).toContain('"טקסט"');
    expect(p).toContain('1. סביבה: כיתה | מטרה: מטרה');
  });
  it('keeps existing focus domains when AI returns an empty list', () => {
    const out = applyAiSummary(
      { talaFocusDomains: ['רגשי'] },
      { talaFocusDomains: [] },
      '10:00'
    );
    expect(out).toMatchObject({
      talaFocusDomains: ['רגשי'],
      freeTextAnalyzed: true,
      status: 'מוכן להדפסה',
      lastSavedAt: '10:00'
    });
  });
});
