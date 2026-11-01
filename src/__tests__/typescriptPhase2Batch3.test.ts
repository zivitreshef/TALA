import { describe, it, expect } from 'vitest';
import {
  COWORKER_FIELDS,
  extractCoworkerSuggestions,
  getStudentsWithTeamData,
  extractTeamDataFromStudent,
  type StudentEntityForTeam,
  type UserDirectoryEntity
} from '../domain/coworkerSuggestions';
import {
  personalizeBankItem,
  fillGoalRowFromBank,
  appendBankGoalToStudent,
  type BankGoalItem,
  type StudentEntityForBank
} from '../domain/bankGoalApplication';
import {
  switchPlanType,
  switchSchoolYear,
  type StudentFormDataForReport
} from '../domain/reportSwitching';

describe('TypeScript Phase 2 Batch 3: Team Suggestions, Bank Goals & Report Switching', () => {
  describe('coworkerSuggestions.ts', () => {
    const teacherUser: UserDirectoryEntity = {
      email: 'teacher@school.org',
      group: 'matya-center'
    };
    const colleague: UserDirectoryEntity = {
      email: 'coordinator@school.org',
      name: 'שרה רכזת',
      title: 'רכזת מתי"א',
      group: 'matya-center',
      active: true
    };
    const studentWithTeam: StudentEntityForTeam = {
      id: 'st-team-1',
      name: 'יוסי כהן',
      ownerEmail: 'teacher@school.org',
      schoolName: 'בית ספר שלום',
      homeroomTeacher: 'רחל מחנכת',
      gradeClass: 'כיתה ג1'
    };

    it('extracts unique coworker suggestions scoped to user and group', () => {
      const suggestions = extractCoworkerSuggestions(
        [studentWithTeam],
        [colleague],
        teacherUser
      );

      expect(COWORKER_FIELDS).toContain('schoolName');
      expect(suggestions.schoolName).toContain('בית ספר שלום');
      expect(suggestions.homeroomTeacher).toContain('רחל מחנכת');
      expect(suggestions.matyaCoordinator).toContain('שרה רכזת');
    });

    it('filters team candidates and extracts team data from student profile', () => {
      const candidates = getStudentsWithTeamData(
        [studentWithTeam],
        'other-id',
        teacherUser,
        [colleague]
      );
      expect(candidates).toHaveLength(1);
      expect(candidates[0].name).toBe('יוסי כהן');

      const extracted = extractTeamDataFromStudent(studentWithTeam);
      expect(extracted.schoolName).toBe('בית ספר שלום');
      expect(extracted.homeroomTeacher).toBe('רחל מחנכת');
    });
  });

  describe('bankGoalApplication.ts', () => {
    const bankItem: BankGoalItem = {
      title: 'ישתתף בשיח',
      defaultActivity: 'משחק במליאה',
      suggestedObjectives: ['ימתין לתורו'],
      defaultOpportunities: 'במהלך המפגש הילד ישתלב בשיחה',
      defaultEvaluation: 'מבצע 3 פעמים בשבוע'
    };
    const girlStudent: StudentEntityForBank = {
      name: 'נועה לוי',
      gender: 'girl',
      stage: 'school',
      goals: []
    };

    it('personalizes bank goal text according to student gender and name', () => {
      const personalized = personalizeBankItem(bankItem, girlStudent);
      expect(personalized.title).toContain('תשתתף');
      expect(personalized.opportunities).toContain('נועה');
    });

    it('fills goal row and appends bank goal with deduplication', () => {
      const initialGoal = { id: 'g-row-1' };
      const filled = fillGoalRowFromBank(initialGoal, bankItem, girlStudent);
      expect(filled.isTeacherModified).toBe(true);
      expect(filled.title).toContain('תשתתף');

      const appendResult = appendBankGoalToStudent(girlStudent, bankItem);
      expect(appendResult.added).toBe(true);
      expect(appendResult.student.goals).toHaveLength(1);

      // Attempting to append duplicate returns added: false
      const dupResult = appendBankGoalToStudent(appendResult.student, bankItem);
      expect(dupResult.added).toBe(false);
    });
  });

  describe('reportSwitching.ts', () => {
    const studentData: StudentFormDataForReport = {
      schoolYear: 'תשפ״ה',
      planType: 'תל״א',
      gender: 'boy',
      schoolName: 'אלון',
      goals: [{ id: 'g-1', title: 'מטרה 1' }]
    };

    it('switches plan type and preserves snapshot in reportsByPlanType', () => {
      const switched = switchPlanType(studentData, 'תח״י');
      expect(switched.planType).toBe('תח״י');
      expect(switched.reportsByPlanType).toBeDefined();
    });

    it('switches school year cleanly and archives prior year', () => {
      const switchedYear = switchSchoolYear(studentData, 'תשפ״ו');
      expect(switchedYear.schoolYear).toBe('תשפ״ו');
      expect(switchedYear.reportsByYear?.['תשפ״ה']).toBeDefined();
    });
  });
});
