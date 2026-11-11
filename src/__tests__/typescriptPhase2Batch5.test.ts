import { describe, it, expect } from 'vitest';
import {
  SCHOOL_YEARS_LIST,
  getNextSchoolYear,
  buildRolloverStudentForNextYear
} from '../domain/schoolYearRollover';
import {
  normalizeStage,
  textHasKindergartenMarker,
  adaptTextToSchoolStage,
  adaptTextToKindergartenStage,
  adaptPartnersToStage,
  isEnvironmentAllowedForStage,
  getDefaultEnvironmentForStage,
  remapEnvironmentForStage,
  getDefaultPartnersForStage,
  getCuratedTitlesExclusiveToStage,
  enforceGoalStage,
  resolveGoalStageForBank,
  inferStagesFromEnvironment,
  filterBankForStage,
  buildBankReferenceForPrompt,
  buildStageRulesBlock,
  getStageLabelHe
} from '../domain/stageGuard';
import {
  STATUS_REPORT_SECTIONS_SCHEMA,
  formatStatusReportBulletLines,
  sanitizeStatusReportSections,
  generateStatusReportLocally
} from '../domain/statusReportGenerator';

describe('TypeScript Migration Phase 2 Batch 5 Gate', () => {
  describe('schoolYearRollover.ts', () => {
    it('returns sequential school year and falls back safely', () => {
      expect(getNextSchoolYear('תשפ"ד (2023-2024)')).toBe('תשפ"ה (2024-2025)');
      expect(getNextSchoolYear('תשפ"ה (2024-2025)')).toBe('תשפ"ו (2025-2026)');
      expect(getNextSchoolYear('תש"צ (2029-2030)')).toBe('תשצ"א (2030-2031)');
      expect(getNextSchoolYear(null)).toBe('תשפ"ח (2027-2028)');
      expect(getNextSchoolYear('שנה לא קיימת')).toBe('תשפ"ח (2027-2028)');
      expect(SCHOOL_YEARS_LIST.length).toBeGreaterThanOrEqual(12);
    });

    it('builds rollover student object with rolled goals and archived previous year', () => {
      const student = {
        id: 's1',
        name: 'יוסי',
        schoolYear: 'תשפ"ה (2024-2025)',
        status: 'הושלם',
        archived: true,
        goals: [
          {
            id: 'g1',
            environment: 'חצר',
            title: 'משחק כדור',
            objectives: 'מסירה לקבוצה',
            activityParticipation: 'משתתף במשחקי כדור בחצר',
            achievementStatus: 'הושג במלואו',
            endYearEvaluation: 'שולט בכללי המשחק'
          },
          {
            id: 'g2',
            environment: 'מפגש בגן',
            title: 'הקשבה והבעה',
            objectives: 'הקשבה 10 דקות',
            activityParticipation: 'מתקשה להקשיב ברצף',
            achievementStatus: 'הושג חלקית',
            midYearEvaluation: 'שיפור קל'
          }
        ]
      };

      const rolled = buildRolloverStudentForNextYear(student, 'תשפ"ה (2024-2025)');
      expect(rolled).not.toBeNull();
      expect(rolled?.schoolYear).toBe('תשפ"ו (2025-2026)');
      expect(rolled?.archived).toBe(false);
      expect(rolled?.status).toBe('בטיוטה');
      expect(rolled?.goals).toHaveLength(2);

      // Achieved goal has empty title/objectives to encourage new goals, but retains continuity note
      const rolledAchieved = rolled?.goals[0];
      expect(rolledAchieved?.title).toBe('');
      expect(rolledAchieved?.activityParticipation).toContain('סטטוס שנה קודמת (תשפ"ה (2024-2025)): הושג במלואו');
      expect(rolledAchieved?.activityParticipation).toContain('סיכום שנה קודמת: שולט בכללי המשחק');

      // Partially achieved goal keeps title & objectives for continuation
      const rolledPartial = rolled?.goals[1];
      expect(rolledPartial?.title).toBe('הקשבה והבעה');
      expect(rolledPartial?.activityParticipation).toContain('הערכת מחצית קודמת: שיפור קל');

      // Previous year is archived in reportsByYear
      expect(rolled?.reportsByYear?.['תשפ"ה (2024-2025)']).toBeDefined();
      expect(rolled?.reportsByYear?.['תשפ"ו (2025-2026)']).toBeDefined();
    });

    it('handles null student gracefully and creates default goal if goals array is empty', () => {
      expect(buildRolloverStudentForNextYear(null)).toBeNull();

      const emptyStudent = {
        name: 'דנה',
        schoolYear: 'תשפ"ו (2025-2026)',
        goals: []
      };
      const rolled = buildRolloverStudentForNextYear(emptyStudent, 'תשפ"ו (2025-2026)');
      expect(rolled?.goals).toHaveLength(1);
      expect(rolled?.goals[0].partners).toBe('צוות הגן, סייעת אישית');
    });
  });

  describe('stageGuard.ts', () => {
    it('normalizes educational stage and detects kindergarten markers', () => {
      expect(normalizeStage('kindergarten')).toBe('kindergarten');
      expect(normalizeStage('school')).toBe('school');
      expect(normalizeStage('university')).toBeNull();
      expect(normalizeStage(null)).toBeNull();

      expect(textHasKindergartenMarker('הילד לומד בגן חובה')).toBe(true);
      expect(textHasKindergartenMarker('שהגננת תדריך את הילד')).toBe(true);
      expect(textHasKindergartenMarker('התלמיד לומד בבית ספר יסודי')).toBe(false);
      // Public garden is not kindergarten
      expect(textHasKindergartenMarker('משפחה יצאה לטיול בגן השעשועים')).toBe(false);
      expect(textHasKindergartenMarker('החייל הגן על המולדת')).toBe(false);
    });

    it('adapts text and partners between kindergarten and school stages', () => {
      const kdgText = 'שהגננת תלווה את הילד במפגש בגן ובמרחב הגן';
      const schoolText = adaptTextToSchoolStage(kdgText);
      expect(schoolText).toContain('שהמחנכת');
      expect(schoolText).toContain('במפגש כיתתי');
      expect(schoolText).toContain('ובמרחב הכיתה');

      const schText = 'המחנכת מלווה את התלמיד במרחב הכיתה';
      const backToKdg = adaptTextToKindergartenStage(schText);
      expect(backToKdg).toContain('הגננת');
      expect(backToKdg).toContain('במרחב הגן');

      expect(adaptPartnersToStage('מורת השילוב, מחנכת הכיתה', 'kindergarten')).toBe('גננת שילוב, גננת');
      expect(adaptPartnersToStage('גננת שילוב, גננת', 'school')).toBe('מורת שילוב, מחנכת');
      expect(getDefaultPartnersForStage('kindergarten', false)).toBe('גננת, גננת שילוב, הורים');
      expect(getDefaultPartnersForStage('school', true)).toBe('מחנכת, מורת שילוב, מטפלת באומנויות');
    });

    it('validates and remaps environments across stages', () => {
      expect(isEnvironmentAllowedForStage('מתמטיקה', 'school')).toBe(true);
      expect(isEnvironmentAllowedForStage('מתמטיקה', 'kindergarten')).toBe(false);
      expect(isEnvironmentAllowedForStage('סדנא / יצירה', 'kindergarten')).toBe(true);
      expect(isEnvironmentAllowedForStage('סדנא / יצירה', 'school')).toBe(false);

      expect(getDefaultEnvironmentForStage('school')).toBe('האזנה ודיבור – כשירות תקשורתית');
      expect(getDefaultEnvironmentForStage('kindergarten')).toBe(
        'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה'
      );

      const remappedToSchool = remapEnvironmentForStage('סדנא / יצירה', 'school', {
        title: 'איות וכתיבה במחברת'
      });
      expect(remappedToSchool).toBe('כתיבה');

      const remappedToKdg = remapEnvironmentForStage('מתמטיקה', 'kindergarten', {
        title: 'משחקי חשבון ומספרים'
      });
      expect(remappedToKdg).toBe('משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה');
    });

    it('enforces stage compliance on goals', () => {
      const kdgGoal = {
        title: 'מפגש בגן',
        environment: 'סדנא / יצירה',
        partners: 'גננת'
      };

      // When enforcing school stage on a pure kindergarten title, it drops it
      const schoolResult = enforceGoalStage(kdgGoal, 'school');
      expect(schoolResult.dropped).toBe(true);
      expect(schoolResult.goal).toBeNull();

      // Transition goals are preserved and adapted
      const transitionGoal = {
        title: 'מעבר מהגן לבית הספר',
        environment: 'סדנא / יצירה',
        activityParticipation: 'בגן הילדים משחק יפה',
        partners: 'גננת'
      };
      const transResult = enforceGoalStage(transitionGoal, 'school');
      expect(transResult.dropped).toBe(false);
      expect(transResult.goal?.title).toBe('מעבר מהגן לבית הספר');
      expect(transResult.goal?.partners).toBe('מחנכת');
      expect(transResult.corrected).toBe(true);

      // Kindergarten enforcement adapts school terminology
      const schGoal = {
        title: 'קשב בשיעור',
        environment: 'מתמטיקה',
        partners: 'מחנכת הכיתה'
      };
      const kdgResult = enforceGoalStage(schGoal, 'kindergarten');
      expect(kdgResult.dropped).toBe(false);
      expect(kdgResult.goal?.partners).toBe('הגננת');
      expect(kdgResult.corrected).toBe(true);
    });

    it('resolves bank stage and filters bank goals for AI prompts', () => {
      expect(resolveGoalStageForBank({ environment: 'מתמטיקה' }, 'school')).toBe('school');
      expect(resolveGoalStageForBank({ environment: 'חצר' }, 'kindergarten')).toBe('kindergarten');
      expect(inferStagesFromEnvironment('מתמטיקה')).toEqual(['school']);
      expect(inferStagesFromEnvironment('חצר')).toEqual(['kindergarten']);

      const mockBank = [
        { id: '1', title: 'חשבון', environment: 'מתמטיקה', stages: ['school'] },
        { id: '2', title: 'חצר ומשחק בגן', environment: 'חצר', stages: ['kindergarten'] }
      ];
      const filteredSchool = filterBankForStage(mockBank, 'school');
      expect(filteredSchool).toHaveLength(1);
      expect(filteredSchool[0].title).toBe('חשבון');

      const filteredKdg = filterBankForStage(mockBank, 'kindergarten');
      expect(filteredKdg).toHaveLength(1);
      expect(filteredKdg[0].title).toBe('חצר ומשחק בגן');

      const exclusiveSchool = getCuratedTitlesExclusiveToStage(mockBank, 'school');
      expect(exclusiveSchool).toEqual(['חשבון']);

      const promptRef = buildBankReferenceForPrompt(mockBank, 'school', 'boy');
      expect(promptRef).toContain('מתמטיקה');
      expect(promptRef).toContain('חשבון');

      const rulesSchool = buildStageRulesBlock('school');
      expect(rulesSchool).toContain('בית-ספר יסודי / על-יסודי');
      expect(rulesSchool).toContain('MANDATORY EDUCATIONAL STAGE: SCHOOL');

      const rulesKdg = buildStageRulesBlock('kindergarten');
      expect(rulesKdg).toContain('ילד/ה בגן ילדים');
      expect(rulesKdg).toContain('MANDATORY EDUCATIONAL STAGE: KINDERGARTEN');

      expect(getStageLabelHe('school')).toBe('בית ספר');
      expect(getStageLabelHe('kindergarten')).toBe('גן ילדים');
    });
  });

  describe('statusReportGenerator.ts', () => {
    it('validates schema sections and sanitizes raw bullet lines', () => {
      expect(STATUS_REPORT_SECTIONS_SCHEMA).toHaveLength(16);
      expect(STATUS_REPORT_SECTIONS_SCHEMA[0].title).toBe('פרטים מזהים ורקע כללי');
      expect(STATUS_REPORT_SECTIONS_SCHEMA[7].title).toBe('תחום מוטורי');
      expect(STATUS_REPORT_SECTIONS_SCHEMA[15].title).toBe('סיכום והמלצות מקצועיות');

      const formatted = formatStatusReportBulletLines(
        '1. מתקשה בריכוז\nלא ידוע\n• משתף פעולה במשחקים',
        'boy'
      );
      expect(formatted).toContain('• מתקשה בריכוז');
      expect(formatted).toContain('• משתף פעולה במשחקים');
      expect(formatted).not.toContain('לא ידוע');

      const rawSections = [
        { sectionNumber: 1, title: 'פרטים מזהים', content: 'תלמיד בכיתה ב בבית ספר' },
        { sectionNumber: 4, title: 'תחום לימודי', content: 'קצר' }, // too short, should be dropped
        { sectionNumber: 16, title: 'סיכום', content: 'מומלץ להמשיך בתוכנית העבודה הנוכחית' }
      ];
      const sanitized = sanitizeStatusReportSections(rawSections, 'boy');
      expect(sanitized).toHaveLength(2);
      expect(sanitized[0].sectionNumber).toBe(1);
      expect(sanitized[1].sectionNumber).toBe(16);
    });

    it('generates a comprehensive local status report from form data', () => {
      const formData = {
        name: 'רוני',
        gender: 'girl',
        birthDate: '2018-05-10',
        educationalFramework: 'בית ספר ארזים',
        schoolYear: 'תשפ"ו (2025-2026)',
        planType: 'תח"י',
        teacherFreeText: 'רוני ילדה סקרנית, אוהבת לצייר אך מתקשה בהתמדה בעת קריאה וכתיבה.',
        studentGeneralBackground: 'משפחה תומכת, אובחנה עם קשיי קשב וריכוז.',
        studentSupportReceived: 'סיוע בהוראה מותאמת פעמיים בשבוע.',
        studentMainGoal: 'להצליח לקרוא טקסט קצר באופן עצמאי.',
        strengthsExisting: 'יצירתית מאוד\nחברותית ואהובה',
        strengthsToEmpower: 'התמדה במשימות לימודיות',
        recommendations: 'להמשיך ליווי בהוראה מותאמת.',
        goals: [
          {
            environment: 'קריאה והפקת משמעות',
            title: 'קריאת מילים ומשפטים',
            activityParticipation: 'מתקשה לקרוא באופן שוטף',
            objectives: 'פענוח עיצורים ותנועות',
            opportunities: 'תרגול יומי עם מורת השילוב',
            partners: 'מחנכת, מורת שילוב',
            duration: 'עד סוף השנה',
            evaluationCriteria: 'קריאה של 8 מתוך 10 מילים בדיוק',
            achievementStatus: 'בתהליך',
            midYearEvaluation: 'התקדמות יפה בזיהוי תנועות'
          }
        ]
      };

      const sections = generateStatusReportLocally(formData);
      expect(sections.length).toBeGreaterThanOrEqual(8);

      // Section 1: Identification with female inflection
      const sec1 = sections.find((s) => s.sectionNumber === 1);
      expect(sec1).toBeDefined();
      expect(sec1?.content).toContain('רוני');
      expect(sec1?.content).toContain('לומדת במסגרת "בית ספר ארזים"');

      // Section 2: Diagnosis & background
      const sec2 = sections.find((s) => s.sectionNumber === 2);
      expect(sec2).toBeDefined();
      expect(sec2?.content).toContain('תמיכות ומענים במסגרת');

      // Section 4: Cognitive/Learning
      const sec4 = sections.find((s) => s.sectionNumber === 4);
      expect(sec4).toBeDefined();
      expect(sec4?.content).toContain('קריאה');

      // Section 8: Motor domain should be omitted when no motor/sensory data exists
      expect(sections.some((s) => s.sectionNumber === 8)).toBe(false);

      // Section 12: Progress
      const sec12 = sections.find((s) => s.sectionNumber === 12);
      expect(sec12).toBeDefined();
      expect(sec12?.content).toContain('הערכת מחצית: התקדמות יפה בזיהוי תנועות');

      // Section 15: Goals for future
      const sec15 = sections.find((s) => s.sectionNumber === 15);
      expect(sec15).toBeDefined();
      expect(sec15?.content).toContain('קריאה והפקת משמעות');

      // Section 16: Recommendations
      const sec16 = sections.find((s) => s.sectionNumber === 16);
      expect(sec16).toBeDefined();
      expect(sec16?.content).toContain('להמשיך ליווי בהוראה מותאמת');
    });
  });
});
