import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../domain/privacyAndAcronyms';
import {
  getRedactedText,
  getDisplayStudentName,
  getAdditionalMetadataItems
} from '../export/wordAndPrintBuilders';

describe('Security Hardening & XSS Sanitization', () => {
  it('escapeHtml escapes dangerous HTML characters properly', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("hello 'world' & \"friends\" <test>")).toBe(
      'hello &#39;world&#39; &amp; &quot;friends&quot; &lt;test&gt;'
    );
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('getRedactedText sanitizes XSS payloads injected in teacher/parent input', () => {
    const maliciousPayload = '<img src=x onerror=alert(1)> שלום כיתה א';
    const sanitized = getRedactedText(maliciousPayload, { name: 'דני כהן' }, false);
    
    // HTML tags are neutralised so browser renders plain text, never parses as DOM tag
    expect(sanitized).not.toContain('<img');
    expect(sanitized).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('getDisplayStudentName sanitizes XSS payloads in student name field', () => {
    const maliciousName = '<svg onload=alert("pwned")>דני';
    const sanitized = getDisplayStudentName({ name: maliciousName }, false);

    expect(sanitized).not.toContain('<svg');
    expect(sanitized).toContain('&lt;svg onload=alert(&quot;pwned&quot;)&gt;דני');
  });

  it('getAdditionalMetadataItems sanitizes custom staff/notes entries', () => {
    const formData = {
      schoolName: '<b onmouseover=evil()>בי"ס רימונים</b>',
      homeroomTeacher: '<b>מורה</b>'
    };
    const items = getAdditionalMetadataItems(formData, false);
    const schoolItem = items.find((i) => i.label === 'בית הספר');
    const teacherItem = items.find((i) => i.label === 'מחנכת');

    expect(schoolItem.value).not.toContain('<b');
    expect(schoolItem.value).toContain('&lt;b onmouseover=evil()&gt;');
    expect(teacherItem.value).toContain('&lt;b&gt;');
  });
});
