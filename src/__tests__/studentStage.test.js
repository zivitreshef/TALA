import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  hasKindergarten,
  hasSchool,
  detectStudentStage,
  formatPromptWithStudentContext,
  getEffectiveStudentStage,
  isGoalRelevantForStage
} from '../utils/studentStage.js';
import { getAdditionalMetadataItems } from '../export/wordAndPrintBuilders.js';

describe('studentStage detection logic', () => {
  it('normalizes Hebrew text correctly with maqaf and quotes', () => {
    expect(normalizeText('ביה"ס יסודי')).toBe('ביה"ס יסודי');
    expect(normalizeText('ביה\'ס יסודי')).toBe('ביה"ס יסודי');
    expect(normalizeText('גני-שקד')).toBe('גני שקד');
  });

  describe('test cases from plan table', () => {
    it('educationalFramework: גן חובה -> kindergarten', () => {
      const res = detectStudentStage({ educationalFramework: 'גן חובה' });
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('educational_framework');
    });

    it('educationalFramework: כיתה א\' -> school', () => {
      const res = detectStudentStage({ educationalFramework: "כיתה א'" });
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('educational_framework');
    });

    it('teacherFreeText: בכיתה ב\' -> school', () => {
      const res = detectStudentStage({ teacherFreeText: "בכיתה ב'" });
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: ביה"ס יסודי -> school (normalized quote)', () => {
      const res = detectStudentStage({ teacherFreeText: 'ביה"ס יסודי' });
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: בי"ס -> school (abbreviation)', () => {
      const res = detectStudentStage({ teacherFreeText: 'בי"ס' });
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: גננת -> kindergarten (role)', () => {
      const res = detectStudentStage({ teacherFreeText: 'גננת' });
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: לגננת -> kindergarten (role with preposition)', () => {
      const res = detectStudentStage({ teacherFreeText: 'לגננת' });
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: הגן -> kindergarten (setting)', () => {
      const res = detectStudentStage({ teacherFreeText: 'הגן' });
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: הגננות -> kindergarten (plural role)', () => {
      const res = detectStudentStage({ teacherFreeText: 'הגננות' });
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: למורה -> school (role with preposition)', () => {
      const res = detectStudentStage({ teacherFreeText: 'למורה' });
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: המורות -> school (plural role)', () => {
      const res = detectStudentStage({ teacherFreeText: 'המורות' });
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: מורי -> school (plural role)', () => {
      const res = detectStudentStage({ teacherFreeText: 'מורי' });
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('teacherFreeText: מורה alone -> unknown (no_data / ambiguous)', () => {
      const res = detectStudentStage({ teacherFreeText: 'מורה' });
      expect(res.stage).toBe('unknown');
      expect(res.stageSource).toBe('no_data');
    });

    it('teacherFreeText: המורה alone -> unknown (no_data / ambiguous)', () => {
      const res = detectStudentStage({ teacherFreeText: 'המורה' });
      expect(res.stage).toBe('unknown');
      expect(res.stageSource).toBe('no_data');
    });

    it('teacherFreeText with bare מורה and free text -> unknown unless school indicators exist', () => {
      const res = detectStudentStage({ teacherFreeText: 'המורה אמרה שהילד מתקדם' });
      expect(res.stage).toBe('unknown');
      expect(res.stageSource).toBe('no_data');
    });

    it('teacherFreeText: "גן" and "כיתה ה\'" in same field -> unknown conflict', () => {
      const res = detectStudentStage({ teacherFreeText: 'לומד בגן ובכיתה ה\'' });
      expect(res.stage).toBe('unknown');
      expect(res.stageSource).toBe('conflict');
    });

    it('teacherFreeText: הולך לגן -> kindergarten', () => {
      const res = detectStudentStage({ teacherFreeText: 'הולך לגן' });
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('birthDate only, age 5.5 -> kindergarten', () => {
      const refDate = new Date('2026-09-01');
      const birthDate = '2021-03-01'; // ~5.5 years
      const res = detectStudentStage({ birthDate }, refDate);
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('birth_date');
    });

    it('birthDate only, age 6.0 -> school', () => {
      const refDate = new Date('2026-09-01');
      const birthDate = '2020-09-01'; // exactly 6.0 years
      const res = detectStudentStage({ birthDate }, refDate);
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('birth_date');
    });

    it('birthDate only, age 6.5 -> school', () => {
      const refDate = new Date('2026-09-01');
      const birthDate = '2020-03-01'; // ~6.5 years
      const res = detectStudentStage({ birthDate }, refDate);
      expect(res.stage).toBe('school');
      expect(res.stageSource).toBe('birth_date');
    });

    it('birthDate conflicts with text (text wins)', () => {
      const refDate = new Date('2026-09-01');
      // birthDate gives age 12 (school), but text explicitly says "גן חובה"
      const res = detectStudentStage(
        { teacherFreeText: 'הולך לגן חובה', birthDate: '2014-01-01' },
        refDate
      );
      expect(res.stage).toBe('kindergarten');
      expect(res.stageSource).toBe('teacher_text');
    });

    it('educationalFramework has conflict -> unknown even if age says school', () => {
      const refDate = new Date('2026-09-01');
      const res = detectStudentStage(
        { educationalFramework: 'גן וכיתה א\'', birthDate: '2018-01-01' },
        refDate
      );
      expect(res.stage).toBe('unknown');
      expect(res.stageSource).toBe('conflict');
    });

    it('empty all -> unknown no_data', () => {
      const res = detectStudentStage({});
      expect(res.stage).toBe('unknown');
      expect(res.stageSource).toBe('no_data');
    });
  });

  describe('formatPromptWithStudentContext', () => {
    it('appends [STUDENT_CONTEXT] block at top of prompt', () => {
      const formData = {
        stage: 'kindergarten',
        stageSource: 'teacher_text',
        stageReason: 'matched גן',
        stageUpdatedAt: '2026-10-09T10:00:00.000Z'
      };
      const result = formatPromptWithStudentContext('Do something', formData);
      expect(result).toContain('[STUDENT_CONTEXT]');
      expect(result).toContain('stage: kindergarten');
      expect(result).toContain('stage_source: teacher_text');
      expect(result).toContain('Do something');
    });
  });

  describe('Goal Bank Stage Filtering & School Goals Integration', () => {
    it('getEffectiveStudentStage resolves correctly', () => {
      expect(getEffectiveStudentStage({ stage: 'kindergarten' })).toBe('kindergarten');
      expect(getEffectiveStudentStage({ stage: 'school' })).toBe('school');
      expect(getEffectiveStudentStage({ educationalFramework: 'גן חובה' })).toBe('kindergarten');
      expect(getEffectiveStudentStage({ educationalFramework: 'כיתה ד\'' })).toBe('school');
      expect(getEffectiveStudentStage({})).toBe('all');
    });

    it('isGoalRelevantForStage filters goals according to their stages', () => {
      const kdgGoal = { title: 'משחק בגן', stages: ['kindergarten'] };
      const schoolGoal = { title: 'כתיבה', stages: ['school'] };
      const dualGoal = { title: 'שפה', stages: ['kindergarten', 'school'] };

      expect(isGoalRelevantForStage(kdgGoal, 'kindergarten')).toBe(true);
      expect(isGoalRelevantForStage(kdgGoal, 'school')).toBe(false);
      expect(isGoalRelevantForStage(kdgGoal, 'all')).toBe(true);

      expect(isGoalRelevantForStage(schoolGoal, 'kindergarten')).toBe(false);
      expect(isGoalRelevantForStage(schoolGoal, 'school')).toBe(true);
      expect(isGoalRelevantForStage(schoolGoal, 'all')).toBe(true);

      expect(isGoalRelevantForStage(dualGoal, 'kindergarten')).toBe(true);
      expect(isGoalRelevantForStage(dualGoal, 'school')).toBe(true);
      expect(isGoalRelevantForStage(dualGoal, 'all')).toBe(true);
    });
  });

  describe('Explicit User Stage Selection & Additional Info Metadata', () => {
    it('detectStudentStage respects explicit user selection over conflicting text', () => {
      const explicitKdg = detectStudentStage({
        stage: 'kindergarten',
        stageSource: 'user_explicit',
        educationalFramework: 'בית ספר יסודי כיתה ד\'',
        teacherFreeText: 'לומד בכיתה ומקשיב למורה'
      });
      expect(explicitKdg.stage).toBe('kindergarten');
      expect(explicitKdg.stageSource).toBe('user_explicit');

      const explicitSchool = detectStudentStage({
        stage: 'school',
        stageSource: 'user_explicit',
        educationalFramework: 'גן חובה שקד',
        teacherFreeText: 'הולך לגן'
      });
      expect(explicitSchool.stage).toBe('school');
      expect(explicitSchool.stageSource).toBe('user_explicit');
    });

    it('getAdditionalMetadataItems formats school labels correctly ("as is")', () => {
      const schoolForm = {
        stage: 'school',
        schoolName: 'בי״ס אלונים',
        gradeClass: 'כיתה ב׳1',
        homeroomTeacher: 'רחל כהן',
        integrationTeacher: 'מיכל לוי',
        matyaCoordinator: 'רונית שרון'
      };
      const items = getAdditionalMetadataItems(schoolForm, false);
      const labels = items.map((i) => i.label);

      expect(labels).toContain('בית הספר');
      expect(labels).toContain('כיתה');
      expect(labels).toContain('מחנכת');
      expect(labels).toContain('מורת שילוב');
      expect(labels).toContain('מתכללת מטעם המתי"א');
      expect(labels).not.toContain('מתכללת בית ספרית מטעם המתי"א');
      expect(labels).not.toContain('גן');
      expect(labels).not.toContain('שלב גן');
      expect(labels).not.toContain('גננת');
      expect(labels).not.toContain('גננת שילוב');
    });

    it('getAdditionalMetadataItems formats kindergarten labels correctly', () => {
      const kdgForm = {
        stage: 'kindergarten',
        schoolName: 'גן שקד',
        gradeClass: 'טרום חובה: גילאי 4–5',
        homeroomTeacher: 'שרה הגננת',
        integrationTeacher: 'ענת גננת שילוב',
        matyaCoordinator: 'רונית שרון'
      };
      const items = getAdditionalMetadataItems(kdgForm, false);
      const labels = items.map((i) => i.label);

      expect(labels).toContain('גן');
      expect(labels).toContain('שלב גן');
      expect(labels).toContain('גננת');
      expect(labels).toContain('גננת שילוב');
      expect(labels).toContain('מתכללת מטעם המתי"א');
      expect(labels).not.toContain('בית הספר');
      expect(labels).not.toContain('כיתה');
      expect(labels).not.toContain('מחנכת');
      expect(labels).not.toContain('מורת שילוב');
    });
  });
});
