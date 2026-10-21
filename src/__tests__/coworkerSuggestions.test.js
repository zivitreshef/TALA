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
      // No team fields
      schoolName: '',
      homeroomTeacher: ''
    }
  ];

  const mockAllowedUsers = [
    {
      name: 'מיכל אטיאס',
      title: 'מורת שילוב',
      group: 'מתי"א קרית שמונה',
      active: true
    },
    {
      name: 'ורד כהן',
      title: 'מתכללת מתי"א',
      group: 'מתי"א קרית שמונה',
      active: true
    },
    {
      name: 'יפה מזרחי',
      title: 'רכזת שילוב',
      group: 'מתי"א תל אביב', // Different group!
      active: true
    }
  ];

  it('extracts unique, deduplicated, trimmed suggestions across all students', () => {
    const suggestions = extractCoworkerSuggestions(mockStudents, [], null);

    expect(suggestions.schoolName).toEqual(['בית ספר דגניה']);
    expect(suggestions.homeroomTeacher).toEqual(['מרים אביב', 'רחל לוי']); // Sorted
    expect(suggestions.integrationTeacher).toEqual(['שרה מזרחי']);
    expect(suggestions.counselorName).toEqual(['דנה ישראלי']);
    expect(suggestions.psychologistName).toEqual(['ד״ר שמעון לוי']);
    expect(suggestions.learningSupportAssistant).toEqual(['תמר סייעת']);
  });

  it('safely extracts suggestions from nested year reports and planType reports', () => {
    const studentsWithReports = [
      {
        id: 's4',
        name: 'רוני גל',
        reportsByYear: {
          '2024': { counselorName: 'רותי יועצת תשפד' }
        },
        reportsByPlanType: {
          tala: { emotionalTherapist: 'ענת מטפלת באומנות' }
        }
      }
    ];

    const suggestions = extractCoworkerSuggestions(studentsWithReports, [], null);
    expect(suggestions.counselorName).toContain('רותי יועצת תשפד');
    expect(suggestions.emotionalTherapist).toContain('ענת מטפלת באומנות');
  });

  it('includes colleagues from the SAME group into role-based fields, excluding different groups', () => {
    const currentUser = { name: 'מורה נוכחי', group: 'מתי"א קרית שמונה' };
    const suggestions = extractCoworkerSuggestions([], mockAllowedUsers, currentUser);

    expect(suggestions.integrationTeacher).toContain('מיכל אטיאס');
    expect(suggestions.matyaCoordinator).toContain('ורד כהן');
    // From different group 'מתי"א תל אביב' should NOT be included
    expect(suggestions.matyaCoordinator).not.toContain('יפה מזרחי');
    expect(suggestions.integrationTeacher).not.toContain('יפה מזרחי');
  });

  it('filters students with team data excluding the current student', () => {
    const candidates = getStudentsWithTeamData(mockStudents, 's1');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('s2');
    expect(candidates[0].name).toBe('נועה לוי');
    // s3 has no team fields so excluded
    // s1 is the current student so excluded
  });

  it('extracts clean team data dictionary from a student', () => {
    const teamData = extractTeamDataFromStudent(mockStudents[0]);
    expect(teamData.schoolName).toBe('בית ספר דגניה');
    expect(teamData.homeroomTeacher).toBe('רחל לוי');
    expect(teamData.integrationTeacher).toBe('שרה מזרחי');
    expect(teamData.counselorName).toBe('דנה ישראלי');
    expect(teamData.name).toBeUndefined(); // Student name should not be part of team data
    expect(teamData.id).toBeUndefined();
  });

  it('handles empty or null parameters without errors', () => {
    expect(extractCoworkerSuggestions(null, null, null)).toBeDefined();
    expect(getStudentsWithTeamData(null, null)).toEqual([]);
    expect(extractTeamDataFromStudent(null)).toEqual({});
  });
});
