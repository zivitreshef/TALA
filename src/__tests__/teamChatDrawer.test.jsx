import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TeamChatDrawer, { getAuthorColorTheme, AUTHOR_COLOR_THEMES } from '../components/form/TeamChatDrawer';

describe('TeamChatDrawer Component', () => {
  const currentUser = {
    email: 'sara@school.org',
    name: 'שרה כהן',
    title: 'מחנכת'
  };

  const sampleMessages = [
    {
      id: 'msg_1',
      authorEmail: 'sara@school.org',
      authorName: 'שרה כהן',
      authorRole: 'מחנכת',
      text: 'היי מיכל, שיתפתי איתך לקראת ועדת שילוב.',
      createdAt: '2026-10-20T10:00:00Z',
      type: 'share_handoff',
      recipientName: 'מיכל המרפאה'
    },
    {
      id: 'msg_2',
      authorEmail: 'michal@school.org',
      authorName: 'מיכל רוזן',
      authorRole: 'מרפאה בעיסוק',
      text: 'תודה שרה! עדכנתי את מטרות הוויסות החושי.',
      createdAt: '2026-10-21T12:00:00Z',
      type: 'comment'
    }
  ];

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamChatDrawer, {
        isOpen: false,
        onClose: () => {},
        studentName: 'דניאל לוי',
        teamMessages: sampleMessages,
        currentUser
      })
    );
    expect(html).toBe('');
  });

  it('renders drawer header, messages, author roles, and badges when open', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamChatDrawer, {
        isOpen: true,
        onClose: () => {},
        studentName: 'דניאל לוי',
        teamMessages: sampleMessages,
        currentUser
      })
    );

    // Header & student name
    expect(html).toContain('שיח צוות ותיעוד שיתוף');
    expect(html).toContain('דניאל לוי');

    // Message 1 (Handoff by Sara)
    expect(html).toContain('שרה כהן');
    expect(html).toContain('מחנכת');
    expect(html).toContain('היי מיכל, שיתפתי איתך לקראת ועדת שילוב.');
    expect(html).toContain('שיתפה את התוכנית');

    // Message 2 (Comment by Michal)
    expect(html).toContain('מיכל רוזן');
    expect(html).toContain('מרפאה בעיסוק');
    expect(html).toContain('תודה שרה! עדכנתי את מטרות הוויסות החושי.');
  });

  it('shows delete/retract button only for the author\'s own messages', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamChatDrawer, {
        isOpen: true,
        onClose: () => {},
        studentName: 'דניאל לוי',
        teamMessages: sampleMessages,
        currentUser, // sara@school.org
        onRetractMessage: () => {}
      })
    );

    // Sara can delete msg_1 (her own message)
    expect(html).toContain('data-testid="retract-msg_1"');
    // Sara CANNOT delete msg_2 (Michal's message)
    expect(html).not.toContain('data-testid="retract-msg_2"');
  });

  it('renders clean empty state when there are no messages', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamChatDrawer, {
        isOpen: true,
        onClose: () => {},
        studentName: 'דניאל לוי',
        teamMessages: [],
        currentUser
      })
    );

    expect(html).toContain('אין עדיין הודעות בשיח הצוות');
  });

  it('places the drawer on the LEFT side so Hebrew text on the right remains visible and unblocked', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamChatDrawer, {
        isOpen: true,
        onClose: () => {},
        studentName: 'דניאל לוי',
        teamMessages: sampleMessages,
        currentUser
      })
    );

    // In RTL, justifyContent: flex-end positions the drawer on the left side
    expect(html).toContain('justify-content:flex-end');
    expect(html).toContain('slideInLeft');
  });

  it('assigns distinct color themes per author for easy visual tracking', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamChatDrawer, {
        isOpen: true,
        onClose: () => {},
        studentName: 'דניאל לוי',
        teamMessages: [
          ...sampleMessages,
          {
            id: 'msg_3',
            authorEmail: 'dana@school.org',
            authorName: 'דנה לוין',
            authorRole: 'קלינאית תקשורת',
            text: 'מעולה שרה, עדכנתי את מטרה 2.',
            createdAt: '2026-10-22T14:00:00Z',
            type: 'comment'
          }
        ],
        currentUser // Sara
      })
    );

    // Sara's card has (אני) indicator
    expect(html).toContain('(אני)');

    // 3 distinct authors get 3 distinct theme colors matching the mockup (Purple, Blue, Emerald Green)
    expect(html).toContain(AUTHOR_COLOR_THEMES[0].bg); // Author 1 (Sara): Purple #faf5ff
    expect(html).toContain(AUTHOR_COLOR_THEMES[1].bg); // Author 2 (Michal): Blue #eff6ff
    expect(html).toContain(AUTHOR_COLOR_THEMES[2].bg); // Author 3 (Dana): Emerald Green #f0fdf4

    // Distinct borders matching the mock
    expect(html).toContain(AUTHOR_COLOR_THEMES[0].border); // #d8b4fe
    expect(html).toContain(AUTHOR_COLOR_THEMES[1].border); // #93c5fd
    expect(html).toContain(AUTHOR_COLOR_THEMES[2].border); // #86efac

    // Circular avatar 2-letter initials
    expect(html).toContain('שכ'); // שרה כהן
    expect(html).toContain('מר'); // מיכל רוזן
    expect(html).toContain('דל'); // דנה לוין
  });

  it('sets high stacking context (z-index 3500) so floating support widgets do not overlap team chat input', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamChatDrawer, {
        isOpen: true,
        onClose: () => {},
        studentName: 'דניאל לוי',
        teamMessages: sampleMessages,
        currentUser
      })
    );

    expect(html).toContain('z-index:3500');
    expect(html).toContain('z-index:3501');
  });
});
