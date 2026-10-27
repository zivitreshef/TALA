import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareTeamModal from '../components/form/ShareTeamModal';

describe('ShareTeamModal Component (Tenant Isolation & Student Sharing)', () => {
  const allowedUsers = [
    { email: 'zivit@tala.edu.il', name: 'זיוית רשף', role: 'admin', group: 'מתי"א מרכז', active: true },
    { email: 'teacher1@tala.edu.il', name: 'מיכל כהן', role: 'teacher', group: 'מתי"א מרכז', active: true },
    { email: 'teacher2@tala.edu.il', name: 'רונית לוי', role: 'teacher', group: 'מתי"א צפון', active: true },
    { email: 'inactive@tala.edu.il', name: 'דנה ישראלי', role: 'teacher', group: 'מתי"א מרכז', active: false },
    { email: 'moti_reshef@bmc.com', name: 'מוטי רשף (Admin)', role: 'admin', group: '', active: true }
  ];

  const sampleStudent = {
    id: 'st_123',
    name: 'יוסי כהן',
    sharedWith: ['teacher1@tala.edu.il']
  };

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareTeamModal, {
        isOpen: false,
        onClose: () => {},
        formData: sampleStudent,
        currentUser: { email: 'teacher1@tala.edu.il', group: 'מתי"א מרכז' },
        allowedUsers,
        onToggleShareColleague: () => {}
      })
    );
    expect(html).toBe('');
  });

  it('strictly displays a security warning and blocks user list when current user has no group (e.g. moti_reshef Admin)', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareTeamModal, {
        isOpen: true,
        onClose: () => {},
        formData: sampleStudent,
        currentUser: { email: 'moti_reshef@bmc.com', group: '' },
        allowedUsers,
        onToggleShareColleague: () => {}
      })
    );

    // Security warning container is displayed
    expect(html).toContain('אינך משויך/ת לצוות או מתי&quot;א');
    expect(html).toContain('מטעמי אבטחת מידע והגנת פרטיות התלמידים');
    expect(html).toContain('שיתוף תוכניות עבודה מתאפשר אך ורק בין אנשי צוות השייכים לאותו צוות');

    // No checkboxes or teacher names are exposed
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('מיכל כהן');
    expect(html).not.toContain('רונית לוי');
    expect(html).not.toContain('הצג את כל הצוותים');
  });

  it('renders ONLY colleagues from the same group when user is assigned to a Matya, strictly excluding cross-group users', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareTeamModal, {
        isOpen: true,
        onClose: () => {},
        formData: sampleStudent,
        currentUser: { email: 'zivit@tala.edu.il', group: 'מתי"א מרכז' },
        allowedUsers,
        onToggleShareColleague: () => {}
      })
    );

    // Renders header for specific group
    expect(html).toContain('חברי צוות:');
    expect(html).toContain('מתי&quot;א מרכז');

    // Contains same-group colleague (מיכל כהן)
    expect(html).toContain('מיכל כהן');
    // Checked and marked as shared
    expect(html).toContain('checked=""');
    expect(html).toContain('משותף');

    // Strictly does NOT contain cross-group colleague (רונית לוי from מתי"א צפון)
    expect(html).not.toContain('רונית לוי');
    expect(html).not.toContain('teacher2@tala.edu.il');

    // Strictly does NOT contain inactive colleague
    expect(html).not.toContain('דנה ישראלי');

    // Strictly does NOT contain self (זיוית רשף) in colleague selection
    expect(html).not.toContain('zivit@tala.edu.il');

    // The cross-team bypass button ("הצג את כל הצוותים") is completely removed
    expect(html).not.toContain('הצג את כל הצוותים');
  });

  it('renders an empty state when user belongs to a group with no other registered colleagues', () => {
    const loneUser = { email: 'lone@tala.edu.il', name: 'מורה יחיד', group: 'מתי"א דרום', active: true };
    const html = renderToStaticMarkup(
      React.createElement(ShareTeamModal, {
        isOpen: true,
        onClose: () => {},
        formData: sampleStudent,
        currentUser: loneUser,
        allowedUsers: [...allowedUsers, loneUser],
        onToggleShareColleague: () => {}
      })
    );

    expect(html).toContain('לא נמצאו אנשי צוות נוספים הרשומים ב');
    expect(html).toContain('מתי&quot;א דרום');
    expect(html).not.toContain('type="checkbox"');
  });

  it('renders optional note section with quick chips for share handoff message', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareTeamModal, {
        isOpen: true,
        onClose: () => {},
        formData: sampleStudent,
        currentUser: { email: 'zivit@tala.edu.il', group: 'מתי"א מרכז' },
        allowedUsers,
        onToggleShareColleague: () => {}
      })
    );

    expect(html).toContain('הודעת פתיחה והנחיות');
    expect(html).toContain('נא להוסיף מטרות');
    expect(html).toContain('לעיונך והערות');
    expect(html).toContain('בדיקת סטטוס');
  });
});
