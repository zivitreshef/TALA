import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ParentVoiceControl from '../components/form/ParentVoiceControl';

vi.mock('../../firebaseBackend', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'teacher@school.org' }
  })
}));

vi.mock('../../services/inviteService', () => ({
  createInvite: vi.fn(),
  deleteInvite: vi.fn(),
  ensureTeacherSession: vi.fn(),
  markInviteReviewed: vi.fn(),
  subscribeToStudentInvites: vi.fn(() => () => {})
}));

describe('ParentVoiceControl Component', () => {
  const mockStudent = {
    id: 'student_123',
    name: 'יונתן כהן',
    gender: 'boy'
  };

  const mockUser = {
    email: 'teacher@school.org'
  };

  it('renders initial closed state with "קול ההורים" pill when there are no invites', () => {
    const html = renderToStaticMarkup(
      React.createElement(ParentVoiceControl, {
        student: mockStudent,
        currentUser: mockUser,
        disabled: false,
        onMerge: vi.fn()
      })
    );

    expect(html).toContain('קול ההורים');
    expect(html).not.toContain('modal-backdrop');
  });

  it('renders "העברה לארכיון בלבד" and avoids the misleading "ארכבי ללא שילוב" text when responses exist', () => {
    const mockInvites = [
      {
        token: 'token_abc123',
        status: 'submitted',
        reviewedAction: null,
        childFirstName: 'יונתן',
        gender: 'boy',
        createdAt: new Date(),
        responses: {
          strengths: 'סקרן ואוהב לעזור',
          challenges: 'קושי במעברים',
          goal: 'חיזוק העצמאות'
        }
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(ParentVoiceControl, {
        student: mockStudent,
        currentUser: mockUser,
        disabled: false,
        onMerge: vi.fn(),
        initialOpen: true,
        initialInvites: mockInvites
      })
    );

    // Modal is open with parent responses
    expect(html).toContain('התקבל מענה מההורים');
    expect(html).toContain('סקרן ואוהב לעזור');

    // Regression check: the confusing and misleading text must not exist
    expect(html).not.toContain('ארכבי ללא שילוב');

    // Verified correct pedagogical text
    expect(html).toContain('העברה לארכיון בלבד');
    expect(html).toContain('שלבי בתיאור החופשי של המורה');
  });

  it('renders custom questions toggle and create link button when no invite is pending', () => {
    const html = renderToStaticMarkup(
      React.createElement(ParentVoiceControl, {
        student: mockStudent,
        currentUser: mockUser,
        disabled: false,
        onMerge: vi.fn(),
        initialOpen: true,
        initialInvites: []
      })
    );

    expect(html).toContain('התאמת שאלות אישיות לתלמיד');
    expect(html).toContain('יצירת קישור להורים');
  });

  it('renders archived past responses in history accordion when previous invites were reviewed', () => {
    const pastInvites = [
      {
        token: 'token_past_1',
        status: 'submitted',
        reviewedAction: 'archived',
        childFirstName: 'יונתן',
        gender: 'boy',
        createdAt: new Date('2026-09-15T10:00:00Z'),
        submittedAt: new Date('2026-09-16T10:00:00Z'),
        responses: {
          strengths: 'אוהב לגו',
          challenges: 'הסתגלות בבוקר'
        }
      },
      {
        token: 'token_past_2',
        status: 'submitted',
        reviewedAction: 'merged',
        childFirstName: 'יונתן',
        gender: 'boy',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        submittedAt: new Date('2026-09-02T10:00:00Z'),
        customQuestions: ['איך הוא מבטא כעס?'],
        responses: {
          goal: 'שיפור קשב',
          custom_0: 'לוקח נשימה עמוקה'
        }
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(ParentVoiceControl, {
        student: mockStudent,
        currentUser: mockUser,
        disabled: false,
        onMerge: vi.fn(),
        initialOpen: true,
        initialInvites: pastInvites
      })
    );

    // Pill should not be 'received' because there are no unreviewed answers
    expect(html).toContain('קול ההורים');

    // History section header is visible with counter of 2 past answers
    expect(html).toContain('מענים קודמים מההורים (2)');
  });
});
