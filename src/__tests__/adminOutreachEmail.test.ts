import { describe, it, expect, vi } from 'vitest';
import {
  buildAdminOutreachEmailHtml,
  sendAdminOutreachEmailInBackground
} from '../emailService';

describe('Admin Outreach Email Service', () => {
  it('generates HTML email containing TALA logo, teacher name, and content', () => {
    const html = buildAdminOutreachEmailHtml({
      teacherName: 'מיכל לוי',
      teacherEmail: 'michal@school.org',
      remainingDays: 3,
      group: 'מתי"א מרכז',
      subject: 'בדיקת קשר לקראת סיום תקופת הניסיון',
      messageContent: 'רצינו לבדוק אם הכל ברור והאם את זקוקה לסיוע.'
    });

    expect(html).toContain('מיכל לוי');
    expect(html).toContain('tala-logo.png');
    expect(html).toContain('רצינו לבדוק אם הכל ברור');
    expect(html).toContain('https://zivitreshef.github.io/TALA/');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('מערכת TALA');
  });

  it('formats multi-line messages into clean HTML paragraphs', () => {
    const html = buildAdminOutreachEmailHtml({
      teacherName: 'דנה ישראלי',
      teacherEmail: 'dana@school.org',
      subject: 'שלום דנה',
      messageContent: 'פסקה ראשונה כאן.\n\nפסקה שנייה כאן.'
    });

    expect(html).toContain('פסקה ראשונה כאן.');
    expect(html).toContain('פסקה שנייה כאן.');
  });
});
