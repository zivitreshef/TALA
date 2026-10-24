import { describe, it, expect } from 'vitest';
import {
  isSurveyEligible,
  advanceUsageEntry,
  shouldPromptSurvey,
  patchUserByEmail,
  buildSurveySummaryNotes
} from '../domain/userEngagement';

describe('userEngagement', () => {
  it('eligibility gates', () => {
    expect(isSurveyEligible({ role: 'admin' }, false)).toBe(false);
    expect(isSurveyEligible({ role: 'user', isTrialUser: true, ndaSigned: false }, false)).toBe(false);
    expect(isSurveyEligible({ role: 'user', surveyDismissed: true }, false)).toBe(false);
    expect(isSurveyEligible({ role: 'user' }, true)).toBe(false);
    expect(isSurveyEligible({ role: 'user', email: 'a@b.com' }, false)).toBe(true);
  });
  it('advances usage by 30s and seeds firstSeenAt', () => {
    expect(advanceUsageEntry(undefined, 1000)).toEqual({ firstSeenAt: 1000, activeSeconds: 30 });
    expect(advanceUsageEntry({ firstSeenAt: 5, activeSeconds: 60 }, 1000)).toEqual({ firstSeenAt: 5, activeSeconds: 90 });
  });
  it('survey thresholds: 480s, or 180s with ≥1 owned student', () => {
    expect(shouldPromptSurvey(479, 0)).toBe(false);
    expect(shouldPromptSurvey(480, 0)).toBe(true);
    expect(shouldPromptSurvey(180, 1)).toBe(true);
    expect(shouldPromptSurvey(179, 1)).toBe(false);
  });
  it('patches users case-insensitively', () => {
    const out = patchUserByEmail([{ email: 'A@b.com' }, { email: 'c@d.com' }], 'a@B.com', { surveyDismissed: true });
    expect(out[0].surveyDismissed).toBe(true);
    expect(out[1].surveyDismissed).toBeUndefined();
  });
  it('summary notes default missing ratings to 5 and skip empty free text', () => {
    const notes = buildSurveySummaryNotes({ ratings: {}, recommendToColleaguesAndManager: 'כן' });
    expect(notes).toContain('קלות שימוש: 5/5');
    expect(notes).not.toContain('משוב:');
  });
});
