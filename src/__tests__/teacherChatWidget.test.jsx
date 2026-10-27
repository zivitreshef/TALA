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

  it('renders closed by default with soft watermarked fade launcher button and correct text', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'teacher@school.org', name: 'שרה כהן' },
        allowedUsers: []
      })
    );

    expect(html).toContain('צ&#x27;אט תמיכה ועזרה');
    expect(html).toContain('title="פתח צ&#x27;אט תמיכה ישיר מול מנהלת המערכת"');
    // Watermarked faded background styling in signature blue & purple theme
    expect(html).toContain('rgba(74, 136, 199, 0.16)');
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

  it('renders open chat window with Rubik typography and pedagogical greeting when defaultOpen is true', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'teacher@school.org', name: 'מיכל' },
        defaultOpen: true,
        allowedUsers: []
      })
    );

    expect(html).toContain('צ&#x27;אט תמיכה TALA');
    expect(html).toContain('Rubik');
    expect(html).toContain('מענה ישיר ממנהלת המערכת');
    expect(html).toContain('שלום מיכל!');
    expect(html).toContain('להדביק צילום מסך');
    // Verifies paperclip attachment button
    expect(html).toContain('title="צרף צילום מסך (או הדבק ב-Ctrl+V)"');
    // Verifies green circle is replaced with subtle message icon (no green circle #4ade80)
    expect(html).not.toContain('#4ade80');
    // Verifies friendly Headphones support icon is rendered instead of defensive shield
    expect(html).toContain('lucide-headphones');
    expect(html).not.toContain('lucide-shield-check');
  });

  it('honors isOpenControlled when opened externally from Help Modal', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'teacher@school.org', name: 'אורלי' },
        isOpenControlled: true,
        allowedUsers: []
      })
    );

    expect(html).toContain('צ&#x27;אט תמיכה TALA');
    expect(html).toContain('שלום אורלי!');
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

  it('renders resolution rating bar (thumbs up / down) when an admin has replied', () => {
    const threadWithAdminReply = {
      id: 'thread_sara',
      userEmail: 'sara@school.org',
      userName: 'שרה',
      status: 'active',
      messages: [
        {
          id: 'm1',
          senderRole: 'user',
          senderName: 'שרה',
          text: 'שאלה לגבי התחברות',
          createdAt: '27/10/2026, 18:00',
          timestamp: 1730000000000
        },
        {
          id: 'm2',
          senderRole: 'admin',
          senderName: 'מנהלת המערכת',
          text: 'היי שרה, הסיסמה עודכנה.',
          createdAt: '27/10/2026, 18:05',
          timestamp: 1730000300000
        }
      ]
    };

    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'sara@school.org', name: 'שרה' },
        defaultOpen: true,
        initialThread: threadWithAdminReply,
        allowedUsers: []
      })
    );

    expect(html).toContain('האם המענה פתר את שאלתך?');
    expect(html).toContain('כן, תודה!');
    expect(html).toContain('עדיין זקוק/ה לעזרה');
    expect(html).toContain('title="המענה עזר, סגור פנייה"');
    expect(html).toContain('title="לא הספיק, דרוש המשך טיפול"');
  });

  it('does NOT render resolution bar when only teacher messages exist without admin reply', () => {
    const threadUserOnly = {
      id: 'thread_sara',
      userEmail: 'sara@school.org',
      userName: 'שרה',
      status: 'active',
      messages: [
        {
          id: 'm1',
          senderRole: 'user',
          senderName: 'שרה',
          text: 'שאלה לגבי התחברות',
          createdAt: '27/10/2026, 18:00',
          timestamp: 1730000000000
        }
      ]
    };

    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'sara@school.org', name: 'שרה' },
        defaultOpen: true,
        initialThread: threadUserOnly,
        allowedUsers: []
      })
    );

    expect(html).not.toContain('האם המענה פתר את שאלתך?');
    expect(html).not.toContain('כן, תודה!');
  });

  it('renders resolved status banner with reopen action when thread is resolved', () => {
    const resolvedThread = {
      id: 'thread_sara',
      userEmail: 'sara@school.org',
      userName: 'שרה',
      status: 'resolved',
      resolutionFeedback: 'thumbs_up',
      messages: [
        {
          id: 'm1',
          senderRole: 'user',
          text: 'עזרה',
          timestamp: 1730000000000
        },
        {
          id: 'm2',
          senderRole: 'admin',
          text: 'נפתר',
          timestamp: 1730000300000
        }
      ]
    };

    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'sara@school.org', name: 'שרה' },
        defaultOpen: true,
        initialThread: resolvedThread,
        allowedUsers: []
      })
    );

    expect(html).toContain('הפנייה טופלה לשביעות רצונך 👍');
    expect(html).toContain('שאלה נוספת?');
  });

  it('renders needs_attention banner when thread is flagged for further assistance', () => {
    const needsAttentionThread = {
      id: 'thread_sara',
      userEmail: 'sara@school.org',
      userName: 'שרה',
      status: 'needs_attention',
      lastFeedback: 'needs_help',
      messages: [
        {
          id: 'm1',
          senderRole: 'admin',
          text: 'מענה ראשוני',
          timestamp: 1730000000000
        }
      ]
    };

    const html = renderToStaticMarkup(
      React.createElement(TeacherChatWidget, {
        currentUser: { email: 'sara@school.org', name: 'שרה' },
        defaultOpen: true,
        initialThread: needsAttentionThread,
        allowedUsers: []
      })
    );

    expect(html).toContain('הפנייה בטיפול מנהלת ⚠️');
    expect(html).toContain('העניין הסתדר?');
  });
});
