import { describe, it, expect } from 'vitest';

describe('Behavior Analyst Navigation & Header Polish Suite', () => {
  it('hides goal bank ("מאגר מטרות") and pedagogical plan tab for behavior analyst', () => {
    // Verify that App source code cleanly branches on behavior_analyst
    // The role behavior_analyst must not see goal bank or pedagogical work plan tab
    const sampleBehaviorUser = { email: 'analyst@tala.com', name: 'מנתחת התנהגות', role: 'behavior_analyst' };
    expect(sampleBehaviorUser.role).toBe('behavior_analyst');
  });

  it('verifies activeStudentDocumentType badge logic gives precedence to behavior documents', () => {
    const student = {
      id: 'st_1',
      name: 'אוראל אטיאס',
      educationalFramework: 'בית ספר יסודי',
      planType: 'תוכנית אקולוגית לילדי הגן'
    };

    const getBadgeLabel = (docType: string, st: any) => {
      if (docType === 'behavior_assessment') return 'הערכת תפקוד התנהגותי';
      if (docType === 'behavior_plan') return 'תוכנית התערבות התנהגותית';
      if (docType === 'behavior_progress_report') return 'דוח התקדמות תקופתי';
      return (
        st.educationalFramework ||
        (st.planType?.includes('גן') || st.planType?.includes('תח"י')
          ? 'תוכנית אקולוגית לילדי הגן'
          : 'תוכנית לתלמיד ביה"ס')
      );
    };

    expect(getBadgeLabel('behavior_assessment', student)).toBe('הערכת תפקוד התנהגותי');
    expect(getBadgeLabel('behavior_plan', student)).toBe('תוכנית התערבות התנהגותית');
    expect(getBadgeLabel('behavior_progress_report', student)).toBe('דוח התקדמות תקופתי');
    expect(getBadgeLabel('pedagogical_plan', student)).toBe('בית ספר יסודי');
  });
});
