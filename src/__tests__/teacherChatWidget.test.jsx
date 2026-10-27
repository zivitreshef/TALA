import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TeacherChatWidget from '../components/chat/TeacherChatWidget';
import * as supportChatService from '../services/supportChatService';
import { SENDER_ROLES } from '../domain/supportChat';

describe('TeacherChatWidget Component (Bi-directional Support Chat)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders closed by default with floating launcher button and correct text', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'teacher@school.org', name: 'שרה כהן' },
        allowedUsers: []
      })
    );

    expect(html).toContain('צ&#x27;אט תמיכה ועזרה');
    expect(html).toContain('title="פתח צ&#x27;אט תמיכה ישיר מול מנהלת המערכת"');
  });

  it('does not render anything if neither email nor currentUser is provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: null,
        initialUserEmail: ''
      })
    );

    expect(html).toBe('');
  });

  it('renders open chat window with pedagogical greeting when defaultOpen is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'teacher@school.org', name: 'מיכל' },
        defaultOpen: true,
        allowedUsers: []
      })
    );

    expect(html).toContain('צ&#x27;אט תמיכה TALA');
    expect(html).toContain('מענה ישיר ממנהלת המערכת');
    expect(html).toContain('שלום מיכל!');
    expect(html).toContain('ניתן לשאול כל שאלה, לבקש עזרה במערכת או לדווח על תקלה.');
    expect(html).toContain('placeholder="כתוב/י הודעה למנהלת..."');
  });

  it('renders with initialUserEmail on login screen for unauthenticated teachers', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: null,
        initialUserEmail: 'login_issue@school.edu',
        initialUserName: 'אילנה',
        allowedUsers: []
      })
    );

    expect(html).toContain('צ&#x27;אט תמיכה ועזרה');
  });
});
