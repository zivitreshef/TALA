import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from '../domain/privacyAndAcronyms';
import { getRedactedText } from '../export/wordAndPrintBuilders';
import fs from 'fs';
import path from 'path';

describe('Preview Entity Decoding & Quick Observation Button Style', () => {
  it('decodeHtmlEntities converts HTML entities like &#39; and &quot; back to real punctuation', () => {
    expect(decodeHtmlEntities("ראיתי ששיתפת את חברתך בקוביות, כל הכבוד!&#39;")).toBe(
      "ראיתי ששיתפת את חברתך בקוביות, כל הכבוד!'"
    );
    expect(decodeHtmlEntities('&quot;ראיתי ששיתפת&quot;')).toBe('"ראיתי ששיתפת"');
    expect(decodeHtmlEntities('מטרות ויעדים &amp; תוכנית')).toBe('מטרות ויעדים & תוכנית');
    expect(decodeHtmlEntities('&amp;#39;בדיקה&amp;#39;')).toBe("'בדיקה'");
  });

  it('getRedactedText with shouldEscape=false returns clean unescaped text for React JSX rendering', () => {
    const rawInput = 'ראיתי ששיתפת בקוביות, כל הכבוד!\' וגם "מצוין"';
    const forReact = getRedactedText(rawInput, { name: 'יוסי כהן' }, false, false);

    expect(forReact).not.toContain('&#39;');
    expect(forReact).not.toContain('&quot;');
    expect(forReact).toContain("'");
    expect(forReact).toContain('"');
  });

  it('getRedactedText with default shouldEscape=true escapes HTML for safe HTML string templates', () => {
    const rawInput = '<script>alert("x")</script>';
    const forHtml = getRedactedText(rawInput, { name: 'יוסי כהן' }, false, true);

    expect(forHtml).toContain('&lt;script&gt;');
    expect(forHtml).toContain('&quot;x&quot;');
  });

  it('ensures quick observation button at the bottom of the document preview does not have discordant green inline styling', () => {
    const formPath = path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx');
    const formCode = fs.readFileSync(formPath, 'utf8');

    // Locate the quick observation button inside the preview bottom action bar
    const obsIdx = formCode.indexOf('title="תיעוד תצפית מהירה מהשטח"');
    expect(obsIdx).toBeGreaterThan(0);

    const buttonSnippet = formCode.substring(obsIdx - 300, obsIdx + 300);
    expect(buttonSnippet).toContain('תצפית מהירה');
    expect(buttonSnippet).not.toContain('#15803d');
    expect(buttonSnippet).not.toContain('#86efac');
    expect(buttonSnippet).not.toContain('#dcfce7');
  });
});
