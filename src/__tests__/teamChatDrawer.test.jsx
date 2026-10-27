import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TeamChatDrawer from '../components/form/TeamChatDrawer';

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
    expect(html).toContain('שיתוף תוכנית');

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
});
