import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  hasKindergarten,
  hasSchool,
  detectStudentStage,
  formatPromptWithStudentContext
} from '../utils/studentStage.js';

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
});
