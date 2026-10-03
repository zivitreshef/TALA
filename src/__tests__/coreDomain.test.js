import { describe, it, expect } from 'vitest';
import {
  isStudentOwnedByUser,
  isStudentSharedWithUser,
  canViewStudent,
  canEditStudent,
  canDeleteStudent,
  canArchiveStudent,
  canRestoreStudent,
  canShareStudent,
  getStudentsForUser,
  getArchivedStudentsForUser
} from '../domain/permissions';
import {
  resolveStudentAgeAndDateInfo,
  normalizeAndSizeGoalDuration,
  attachAiBaselineToGoal,
  isGoalProtectedFromAiOverwrite,
  mergeReanalyzedGoals,
  adaptTextToGender,
  toHebrewAcronym,
  maskSensitiveValue,
  redactStudentNameInText,
  STATUS_REPORT_SECTIONS_SCHEMA,
  sanitizeStatusReportSections,
  generateStatusReportLocally,
  getNextSchoolYear,
  buildRolloverStudentForNextYear
} from '../goalBankData';
import { deriveFirebaseAuthPassword } from '../firebaseBackend';
import { safeGetStorageJson } from '../services/storage';
import {
  buildWordDocumentHtml,
  buildEvalWordDocumentHtml,
  buildStatusReportWordDocumentHtml,
  getSafeReportFilename
} from '../export/wordAndPrintBuilders';

describe('Permissions & Shared Student Guards', () => {
  const ownerTeacher = { email: 'teacher1@tala.edu.il', name: 'מיכל' };
  const sharedTeacher = { email: 'teacher2@tala.edu.il', name: 'רונית' };
  const unrelatedTeacher = { email: 'other@tala.edu.il', name: 'דנה' };

  const student = {
    id: 'st_100',
    name: 'נועם כהן',
    ownerEmail: 'teacher1@tala.edu.il',
    sharedWith: ['teacher2@tala.edu.il'],
    archived: false
  };

  it('allows owner teacher full permissions including delete and archive', () => {
    expect(isStudentOwnedByUser(student, ownerTeacher)).toBe(true);
    expect(isStudentSharedWithUser(student, ownerTeacher)).toBe(false);
    expect(canViewStudent(student, ownerTeacher)).toBe(true);
    expect(canEditStudent(student, ownerTeacher)).toBe(true);
    expect(canDeleteStudent(student, ownerTeacher)).toBe(true);
    expect(canArchiveStudent(student, ownerTeacher)).toBe(true);
    expect(canRestoreStudent(student, ownerTeacher)).toBe(true);
    expect(canShareStudent(student, ownerTeacher)).toBe(true);
  });

  it('allows shared teacher to view and edit, but strictly blocks delete, archive, restore, and share', () => {
    expect(isStudentOwnedByUser(student, sharedTeacher)).toBe(false);
    expect(isStudentSharedWithUser(student, sharedTeacher)).toBe(true);
    expect(canViewStudent(student, sharedTeacher)).toBe(true);
    expect(canEditStudent(student, sharedTeacher)).toBe(true);
    expect(canDeleteStudent(student, sharedTeacher)).toBe(false);
    expect(canArchiveStudent(student, sharedTeacher)).toBe(false);
    expect(canRestoreStudent(student, sharedTeacher)).toBe(false);
    expect(canShareStudent(student, sharedTeacher)).toBe(false);
  });

  it('denies all permissions to unrelated teachers', () => {
    expect(canViewStudent(student, unrelatedTeacher)).toBe(false);
    expect(canEditStudent(student, unrelatedTeacher)).toBe(false);
    expect(canDeleteStudent(student, unrelatedTeacher)).toBe(false);
    expect(canArchiveStudent(student, unrelatedTeacher)).toBe(false);
  });

  it('filters active and archived students accurately for owner and shared teachers', () => {
    const archivedStudent = { ...student, id: 'st_101', archived: true };
    const all = [student, archivedStudent];

    expect(getStudentsForUser(all, ownerTeacher).map((s) => s.id)).toEqual(['st_100']);
    expect(getArchivedStudentsForUser(all, ownerTeacher).map((s) => s.id)).toEqual(['st_101']);
    expect(getStudentsForUser(all, sharedTeacher).map((s) => s.id)).toEqual(['st_100']);
    expect(getArchivedStudentsForUser(all, unrelatedTeacher)).toEqual([]);
  });
});

describe('T-Shirt Goal Sizing & Relative Timeframes', () => {
  it('sizes a focused short-term routine goal as S (~1 month) with a relative target date', () => {
    const formData = { date: '01/10/2026', birthDate: '2021-05-01' };
    const rawText = 'ילד בן 5, עצמאי ונבון, זקוק לתזכורת קלה בהתארגנות עם ציוד';
    const goal = {
      environment: 'מעברים ושגרות יומיות',
      title: 'יתארגן עם ציוד אישי באופן עצמאי',
      objectives: 'ייעזר בכרטיסיית סדר יום',
      tShirtSize: 'S'
    };
    const dateInfo = resolveStudentAgeAndDateInfo(formData, rawText);
    const durationStr = normalizeAndSizeGoalDuration(goal, rawText, formData, dateInfo);
    expect(durationStr).toContain('חודש');
    expect(durationStr).toContain('01/11/2026');
  });

  it('sizes a complex multi-step emotional/social regulation goal as L (up to end of year)', () => {
    const formData = { date: '01/10/2026', birthDate: '2021-05-01' };
    const rawText = 'קושי משמעותי בוויסות רגשי והתפרצויות במעברים';
    const goal = {
      environment: 'חצר',
      title: 'יפתח ויסות רגשי והתמודדות עם תסכולים מורכבים לאורך השנה',
      objectives: '1. יזהה תסכול\n2. יבקש עזרה\n3. ימתין לתור\n4. יפתור קונפליקטים בשיח',
      tShirtSize: 'L'
    };
    const dateInfo = resolveStudentAgeAndDateInfo(formData, rawText);
    const durationStr = normalizeAndSizeGoalDuration(goal, rawText, formData, dateInfo);
    expect(durationStr).toContain('30/06/2027');
  });
});

describe('Teacher-Edited Goal Protection on Re-Analysis', () => {
  it('preserves a goal that the teacher modified after AI analysis and only updates untouched goals', () => {
    const g1 = attachAiBaselineToGoal({
      id: 'g_1',
      environment: 'מפגש',
      title: 'ישתתף במפגש בוקר',
      objectives: 'יקשיב 10 דקות',
      opportunities: 'תיווך מילולי',
      partners: 'גננת',
      duration: 'עד סוף השנה',
      evaluationCriteria: 'תצפית'
    });
    const g2 = attachAiBaselineToGoal({
      id: 'g_2',
      environment: 'חצר',
      title: 'ישחק עם חבר בחצר',
      objectives: 'משחק זוגי',
      opportunities: 'תיווך בחצר',
      partners: 'סייעת',
      duration: 'עד סוף השנה',
      evaluationCriteria: 'תצפית'
    });

    // Teacher edits g1's objectives
    const g1EditedByTeacher = {
      ...g1,
      objectives: 'יקשיב 15 דקות וישתף במשפט שלם (נערך ע"י הגננת)'
    };

    expect(isGoalProtectedFromAiOverwrite(g1EditedByTeacher)).toBe(true);
    expect(isGoalProtectedFromAiOverwrite(g2)).toBe(false);

    const newCandidateGoals = [
      {
        id: 'cand_1',
        environment: 'מפגש',
        title: 'ישתתף במפגש בוקר',
        objectives: 'יעד חדש שלא אמור לדרוס את עריכת הגננת'
      },
      {
        id: 'cand_2',
        environment: 'סדנא ומרכזי למידה',
        title: 'יתנסה בגזירה והדבקה בסדנא',
        objectives: 'גזירה על קו ישר'
      }
    ];

    const mergedGoals = mergeReanalyzedGoals({
      existingGoals: [g1EditedByTeacher, g2],
      candidateNewGoals: newCandidateGoals,
      removedGoals: [],
      gender: 'boy'
    });

    expect(mergedGoals[0].id).toBe('g_1');
    expect(mergedGoals[0].objectives).toBe(
      'יקשיב 15 דקות וישתף במשפט שלם (נערך ע"י הגננת)'
    );
    expect(mergedGoals.some((g) => g.environment === 'סדנא ומרכזי למידה')).toBe(true);
  });
});

describe('Status Report Generator (15-Section Specification)', () => {
  it('omits sections without data, strips forbidden placeholders, and integrates mid/end-year evaluation', () => {
    expect(STATUS_REPORT_SECTIONS_SCHEMA).toHaveLength(15);

    const studentData = {
      name: 'מאיה לוי',
      gender: 'girl',
      birthDate: '2021-03-15',
      educationalFramework: 'גן כלנית',
      schoolYear: 'תשפ"ו',
      teacherFreeText: 'מאיה משתתפת במפגש בוקר עם תיווך, אוהבת משחקי הרכבה וציור.',
      strengthsExisting: 'סקרנית, אוהבת לצייר ולבנות בלגו',
      evalReportSummary: 'במהלך המחצית חל שיפור ניכר ביכולת ההמתנה לתור ובמשחק משותף בחצר.',
      goals: [
        {
          id: 'g1',
          environment: 'חצר',
          title: 'תרחיב משחק משותף עם בני קבוצת השווים',
          objectives: 'תמתין לתורה במשחק חצר',
          opportunities: 'תיווך מילולי במשחק זוגי',
          partners: 'גננת וסייעת',
          duration: 'עד 01/02/2027',
          evaluationCriteria: 'משחק משותף של 10 דקות',
          achievementStatus: 'הושגה חלקית',
          midYearEvaluation: 'משחקת כיום עם חברה קבועה בחצר למשך כ-8 דקות.'
        }
      ]
    };

    const sections = generateStatusReportLocally(studentData);
    expect(sections.length).toBeGreaterThanOrEqual(5);
    // Section 2 (medical/diagnosis) has no data in studentData, so it must be omitted
    expect(sections.some((s) => s.sectionNumber === 2)).toBe(false);
    // Section 11 (progress) must be included because midYearEvaluation / evalReportSummary exist
    expect(sections.some((s) => s.sectionNumber === 11)).toBe(true);
    // Section 14 (continuing goals) must be included
    expect(sections.some((s) => s.sectionNumber === 14)).toBe(true);

    // Verify sanitizeStatusReportSections strips "לא ידוע" / "לא קיים מידע"
    const dirty = [
      ...sections,
      { sectionNumber: 2, title: 'רקע התפתחותי ואבחוני רלוונטי', content: 'לא ידוע.' },
      { sectionNumber: 5, title: 'תחום שפתי ותקשורתי', content: 'לא קיים מידע' }
    ];
    const cleaned = sanitizeStatusReportSections(dirty, 'girl');
    expect(cleaned.some((s) => s.sectionNumber === 2)).toBe(false);
    expect(cleaned.some((s) => s.sectionNumber === 5)).toBe(false);
  });
});

describe('Privacy Redaction & Gender Adaptation', () => {
  it('converts student name to acronym and redacts full name in free text', () => {
    expect(toHebrewAcronym('דניאל כהן')).toBe('ד.כ.');
    expect(maskSensitiveValue('050-1234567')).toBe('███████████');
    const redacted = redactStudentNameInText(
      'דניאל כהן השתתף יפה במפגש, ודניאל יזם שיח.',
      'דניאל כהן',
      true
    );
    expect(redacted).not.toContain('דניאל');
    expect(redacted).toContain('ד.כ.');
  });

  it('adapts masculine goal phrasing to feminine when gender is girl', () => {
    const adapted = adaptTextToGender('ישתתף במפגש בוקר ויקשיב לתוכן', 'girl');
    expect(adapted).toContain('תשתתף');
    expect(adapted).toContain('תקשיב');
  });
});

describe('School Year Rollover, Firebase Auth Provisioning & Safe Storage', () => {
  it('rolls a student over to the next school year and preserves previous year history', () => {
    const prevYear = 'תשפ"ו (2025-2026)';
    const nextYear = getNextSchoolYear(prevYear);
    expect(nextYear).toBe('תשפ"ז (2026-2027)');

    const st = {
      id: 'st_roll_1',
      name: 'יונתן',
      schoolYear: prevYear,
      archived: true,
      goals: [
        {
          id: 'g1',
          environment: 'חצר',
          title: 'ישתתף במשחק כדור',
          achievementStatus: 'הושגה חלקית',
          endYearEvaluation: 'התקדמות יפה בזריקה ותפיסה'
        }
      ]
    };

    const rolled = buildRolloverStudentForNextYear(st, prevYear, nextYear);
    expect(rolled.archived).toBe(false);
    expect(rolled.schoolYear).toBe(nextYear);
    expect(rolled.reportsByYear[prevYear]).toBeDefined();
    expect(rolled.goals[0].activityParticipation).toContain('רצף מתכנית');
  });

  it('pads short teacher access codes deterministically for Firebase Auth (>= 6 chars)', () => {
    expect(deriveFirebaseAuthPassword('1234').length).toBeGreaterThanOrEqual(6);
    expect(deriveFirebaseAuthPassword('StrongPass123')).toBe('StrongPass123');
  });

  it('returns fallback value safely when storage key is missing', () => {
    expect(safeGetStorageJson('non_existent_key_xyz', { ok: true })).toEqual({ ok: true });
  });

  it('builds Word HTML documents for TALA, Evaluation, and Status Report with privacy redaction', () => {
    const sampleStudent = {
      name: 'נועם ישראלי',
      idNumber: '123456789',
      schoolYear: 'תשפ"ו',
      educationalFramework: 'גן שקד',
      strengthsExisting: 'נועם ילד סקרן וחברותי',
      evalReportSummary: 'נועם התקדם יפה במפגש',
      goals: [
        {
          id: 'g1',
          environment: 'מפגש בגן',
          title: 'ישתתף במפגש',
          activityParticipation: 'נועם מקשיב לסיפור'
        }
      ]
    };

    const fullHtml = buildWordDocumentHtml(sampleStudent, false);
    expect(fullHtml).toContain('נועם ישראלי');

    const redactedHtml = buildWordDocumentHtml(sampleStudent, true);
    expect(redactedHtml).not.toContain('נועם ישראלי');
    expect(redactedHtml).toContain('נ.י.');

    const evalHtml = buildEvalWordDocumentHtml(sampleStudent, true);
    expect(evalHtml).toContain('דוח הערכת מחצית / סוף שנה');
    expect(evalHtml).not.toContain('נועם');

    const statusHtml = buildStatusReportWordDocumentHtml(sampleStudent, true);
    expect(statusHtml).toContain('דו"ח מצב חינוכי-תפקודי עדכני');
    expect(getSafeReportFilename(sampleStudent, true, 'doc', 'status')).toContain('דוח_מצב');
  });
});


