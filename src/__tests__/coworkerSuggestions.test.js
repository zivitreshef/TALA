import { describe, it, expect } from 'vitest';
import {
  COWORKER_FIELDS,
  extractCoworkerSuggestions,
  getStudentsWithTeamData,
  extractTeamDataFromStudent
} from '../domain/coworkerSuggestions.js';

describe('Coworker & Team Auto-Complete Suggestions', () => {
  const mockStudents = [
    {
      id: 's1',
      name: 'יוסי כהן',
      ownerEmail: 'teacher1@school.org',
      schoolName: 'בית ספר דגניה',
      gradeClass: 'ג׳2',
      homeroomTeacher: 'רחל לוי',
      integrationTeacher: 'שרה מזרחי',
      counselorName: 'דנה ישראלי',
      psychologistName: 'ד״ר שמעון לוי',
      matyaCoordinator: 'אורנה גולן',
      learningSupportAssistant: 'תמר סייעת',
      emotionalTherapist: 'יונתן תרפיה',
      paraMedicalTeam: 'קלינאית תקשורת רונית',
      additionalPartners: 'מורה לאנגלית מיכל'
    },
    {
      id: 's2',
      name: 'נועה לוי',
      ownerEmail: 'teacher2@school.org',
      schoolName: 'בית ספר דגניה',
      gradeClass: 'ג׳1',
      homeroomTeacher: 'מרים אביב',
      integrationTeacher: 'שרה מזרחי',
      counselorName: 'דנה ישראלי',
      psychologistName: '',
      matyaCoordinator: 'אורנה גולן'
    },
    {
      id: 's3',
      name: 'דניאל אברהם',
      ownerEmail: 'teacher1@school.org',
      schoolName: '',
      homeroomTeacher: ''
    },
    {
      id: 's4_telaviv',
      name: 'רוני תל אביבי',
      ownerEmail: 'teacher_ta@school.org',
      schoolName: 'בית ספר תל אביב',
      homeroomTeacher: 'גלית תל אביב',
      counselorName: 'יועצת תל אביב'
    }
  ];

  const mockAllowedUsers = [
    {
      email: 'teacher1@school.org',
      name: 'מיכל אטיאס',
      title: 'מורת שילוב',
      group: 'מתי"א קרית שמונה',
      active: true
    },
    {
      email: 'teacher2@school.org',
      name: 'ורד כהן',
      title: 'מתכללת מתי"א',
      group: 'מתי"א קרית שמונה',
      active: true
    },
    {
      email: 'teacher_ta@school.org',
      name: 'יפה מזרחי',
      title: 'רכזת שילוב',
      group: 'מתי"א תל אביב', // Different group!
      active: true
    },
    {
      email: 'moti_reshef@bmc.com',
      name: 'מוטי רשף',
      group: '', // No group
      active: true
    }
  ];

  it('extracts unique, deduplicated, trimmed suggestions across authorized students', () => {
    const currentUser = { email: 'teacher1@school.org', group: 'מתי"א קרית שמונה' };
    const suggestions = extractCoworkerSuggestions(mockStudents, mockAllowedUsers, currentUser);

    expect(suggestions.schoolName).toEqual(['בית ספר דגניה']);
    expect(suggestions.homeroomTeacher).toEqual(['מרים אביב', 'רחל לוי']); // Sorted
    expect(suggestions.integrationTeacher).toEqual(['מיכל אטיאס', 'שרה מזרחי']);
    expect(suggestions.counselorName).toEqual(['דנה ישראלי']);
    expect(suggestions.psychologistName).toEqual(['ד״ר שמעון לוי']);
    expect(suggestions.learningSupportAssistant).toEqual(['תמר סייעת']);
    // Must NOT contain suggestions from 'מתי"א תל אביב'
    expect(suggestions.schoolName).not.toContain('בית ספר תל אביב');
    expect(suggestions.homeroomTeacher).not.toContain('גלית תל אביב');
  });

  it('safely extracts suggestions from nested year reports and planType reports', () => {
    const studentsWithReports = [
      {
        id: 's4',
        name: 'רוני גל',
        ownerEmail: 'teacher1@school.org',
        reportsByYear: {
          '2024': { counselorName: 'רותי יועצת תשפד' }
        },
        reportsByPlanType: {
          tala: { emotionalTherapist: 'ענת מטפלת באומנות' }
        }
      }
    ];

    const currentUser = { email: 'teacher1@school.org', group: 'מתי"א קרית שמונה' };
    const suggestions = extractCoworkerSuggestions(studentsWithReports, [], currentUser);
    expect(suggestions.counselorName).toContain('רותי יועצת תשפד');
    expect(suggestions.emotionalTherapist).toContain('ענת מטפלת באומנות');
  });

  it('strictly limits candidate students to the user own students if user has NO group', () => {
    const motiUser = { email: 'moti_reshef@bmc.com', group: '' };
    // Moti owns none of s1, s2, s4_telaviv in mockStudents
    const candidatesEmpty = getStudentsWithTeamData(mockStudents, 's_other', motiUser, mockAllowedUsers);
    expect(candidatesEmpty).toEqual([]);

    // If Moti owns a student:
    const mockWithMoti = [
      ...mockStudents,
      {
        id: 's_moti_1',
        name: 'תלמיד של מוטי',
        ownerEmail: 'moti_reshef@bmc.com',
        schoolName: 'חטיבה עצמאית',
        homeroomTeacher: 'דוד כהן'
      }
    ];

    const candidates = getStudentsWithTeamData(mockWithMoti, 's_new', motiUser, mockAllowedUsers);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].name).toBe('תלמיד של מוטי');
    expect(candidates[0].id).toBe('s_moti_1');
  });

  it('scopes candidate students to the same group when user belongs to a group', () => {
    const kiryatShmonaUser = { email: 'teacher1@school.org', group: 'מתי"א קרית שמונה' };
    const candidates = getStudentsWithTeamData(mockStudents, 's1', kiryatShmonaUser, mockAllowedUsers);

    // s1 is excluded because it's the current student.
    // s2 is included because owner teacher2 belongs to מתי"א קרית שמונה.
    // s3 is excluded because it has no team fields.
    // s4_telaviv is excluded because owner belongs to מתי"א תל אביב.
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('s2');
    expect(candidates.map((c) => c.id)).not.toContain('s4_telaviv');
  });

  it('includes colleagues from the SAME group into role-based fields, excluding different groups', () => {
    const currentUser = { email: 'teacher1@school.org', group: 'מתי"א קרית שמונה' };
    const suggestions = extractCoworkerSuggestions([], mockAllowedUsers, currentUser);

    expect(suggestions.integrationTeacher).toContain('מיכל אטיאס');
    expect(suggestions.matyaCoordinator).toContain('ורד כהן');
    // From different group 'מתי"א תל אביב' should NOT be included
    expect(suggestions.matyaCoordinator).not.toContain('יפה מזרחי');
    expect(suggestions.integrationTeacher).not.toContain('יפה מזרחי');
  });

  it('extracts clean team data dictionary from a student', () => {
    const teamData = extractTeamDataFromStudent(mockStudents[0]);
    expect(teamData.schoolName).toBe('בית ספר דגניה');
    expect(teamData.homeroomTeacher).toBe('רחל לוי');
    expect(teamData.integrationTeacher).toBe('שרה מזרחי');
    expect(teamData.counselorName).toBe('דנה ישראלי');
    expect(teamData.name).toBeUndefined();
    expect(teamData.id).toBeUndefined();
  });

  it('handles empty or null parameters without errors', () => {
    expect(extractCoworkerSuggestions(null, null, null)).toBeDefined();
    expect(getStudentsWithTeamData(null, null, null, null)).toEqual([]);
    expect(extractTeamDataFromStudent(null)).toEqual({});
  });
});
