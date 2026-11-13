import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareTeamModal from '../components/form/ShareTeamModal';

describe('ShareTeamModal & Currently Shared Visibility', () => {
  const currentUser = {
    email: 'zivit.reshef@gmail.com',
    name: 'זיוית רשף',
    group: 'מתי״א תל אביב'
  };

  const allowedUsers = [
    { email: 'zivit.reshef@gmail.com', name: 'זיוית רשף', group: 'מתי״א תל אביב', role: 'מורת שילוב' },
    { email: 'dana@matya-tlv.org.il', name: 'דנה קלינאית', group: 'מתי״א תל אביב', role: 'קלינאית תקשורת' }
  ];

  it('renders currently shared users section when formData.sharedWith contains an email not in visibleUsers', () => {
    const formData = {
      id: 'student_arbel',
      name: 'ארבל חנה',
      sharedWith: ['old_colleague@external.org']
    };

    const html = renderToStaticMarkup(
      <ShareTeamModal
        isOpen={true}
        onClose={vi.fn()}
        formData={formData}
        currentUser={currentUser}
        allowedUsers={allowedUsers}
        onSaveShareSettings={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="currently-shared-section"');
    expect(html).toContain('אנשי צוות המשותפים כרגע (1)');
    expect(html).toContain('old_colleague@external.org');
    expect(html).toContain('data-testid="remove-share-btn-old_colleague@external.org"');
    expect(html).toContain('הסר את כל השיתופים');
  });

  it('identifies self-share clearly and displays special notice', () => {
    const formData = {
      id: 'student_arbel',
      name: 'ארבל חנה',
      sharedWith: ['zivit.reshef@gmail.com', 'dana@matya-tlv.org.il']
    };

    const html = renderToStaticMarkup(
      <ShareTeamModal
        isOpen={true}
        onClose={vi.fn()}
        formData={formData}
        currentUser={currentUser}
        allowedUsers={allowedUsers}
        onSaveShareSettings={vi.fn()}
      />
    );

    expect(html).toContain('אנשי צוות המשותפים כרגע (2)');
    expect(html).toContain('המשתמש שלך (שיתוף עצמי');
    expect(html).toContain('data-testid="remove-share-btn-zivit.reshef@gmail.com"');
  });

  it('allows removing all shares even if user has no assigned Matya group (!myGroup)', () => {
    const userWithoutGroup = {
      email: 'zivit.reshef@gmail.com',
      name: 'זיוית רשף',
      group: ''
    };

    const formData = {
      id: 'student_arbel',
      name: 'ארבל חנה',
      sharedWith: ['some_old_share@matya.org']
    };

    const html = renderToStaticMarkup(
      <ShareTeamModal
        isOpen={true}
        onClose={vi.fn()}
        formData={formData}
        currentUser={userWithoutGroup}
        allowedUsers={[]}
        onSaveShareSettings={vi.fn()}
      />
    );

    // Section displays security warning with ability to remove all shares
    expect(html).toContain('אינך משויך/ת לצוות או מתי&quot;א');
    expect(html).toContain('data-testid="remove-all-shares-btn"');
    expect(html).toContain('הסר את כל השיתופים מהתוכנית');
  });
});
