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
  canLockReport,
  getStudentsForUser,
  getArchivedStudentsForUser,
  getUnreadSharedReportsForUser,
  markSharedReportAsRead
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
import { deriveFirebaseAuthPassword, sanitizeForFirestore } from '../firebaseBackend';
import { safeGetStorageJson } from '../services/storage';
import {
  buildWordDocumentHtml,
  buildEvalWordDocumentHtml,
  buildStatusReportWordDocumentHtml,
  getSafeReportFilename
} from '../export/wordAndPrintBuilders';
import {
  DEFAULT_ALLOWED_USERS,
  getCurrentLocalDayKey,
  stampSessionUserWithDate,
  isSessionUserValidForToday,
  computeTrialExpirationIso,
  isTrialUserExpired,
  getTrialRemainingDays,
  verifyAllowedUser,
  createPasswordCredentials,
  verifyUserPassword,
  ensureUsersListPasswordsHashed
} from '../allowedUsers';
import { buildSignedNdaDocumentHtml, buildUserSurveyEmailHtml } from '../emailService';

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

  it('allows owner teacher full permissions including delete, archive, and lock/unlock report', () => {
    expect(isStudentOwnedByUser(student, ownerTeacher)).toBe(true);
    expect(isStudentSharedWithUser(student, ownerTeacher)).toBe(false);
    expect(canViewStudent(student, ownerTeacher)).toBe(true);
    expect(canEditStudent(student, ownerTeacher)).toBe(true);
    expect(canDeleteStudent(student, ownerTeacher)).toBe(true);
    expect(canArchiveStudent(student, ownerTeacher)).toBe(true);
    expect(canRestoreStudent(student, ownerTeacher)).toBe(true);
    expect(canShareStudent(student, ownerTeacher)).toBe(true);
    expect(canLockReport(student, ownerTeacher)).toBe(true);
  });

  it('allows shared teacher to view and edit, but strictly blocks delete, archive, restore, share, and lock/unlock toggle', () => {
    expect(isStudentOwnedByUser(student, sharedTeacher)).toBe(false);
    expect(isStudentSharedWithUser(student, sharedTeacher)).toBe(true);
    expect(canViewStudent(student, sharedTeacher)).toBe(true);
    expect(canEditStudent(student, sharedTeacher)).toBe(true);
    expect(canDeleteStudent(student, sharedTeacher)).toBe(false);
    expect(canArchiveStudent(student, sharedTeacher)).toBe(false);
    expect(canRestoreStudent(student, sharedTeacher)).toBe(false);
    expect(canShareStudent(student, sharedTeacher)).toBe(false);
    expect(canLockReport(student, sharedTeacher)).toBe(false);
  });

  it('denies all permissions to unrelated teachers', () => {
    expect(canViewStudent(student, unrelatedTeacher)).toBe(false);
    expect(canEditStudent(student, unrelatedTeacher)).toBe(false);
    expect(canDeleteStudent(student, unrelatedTeacher)).toBe(false);
    expect(canArchiveStudent(student, unrelatedTeacher)).toBe(false);
    expect(canLockReport(student, unrelatedTeacher)).toBe(false);
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
      isLocked: true,
      lockedAt: '01/05/2026',
      lockedBy: 'teacher1@tala.edu.il',
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
    expect(rolled.isLocked).toBe(false);
    expect(rolled.reportsByYear[prevYear]).toBeDefined();
    expect(rolled.reportsByYear[prevYear].isLocked).toBe(true);
    expect(rolled.reportsByYear[nextYear].isLocked).toBe(false);
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

  it('validates daily session expiration and resets session when calendar day changes', () => {
    const loginTime = new Date(2026, 9, 3, 10, 30, 0); // Oct 3, 2026 10:30
    const sameDayLater = new Date(2026, 9, 3, 22, 15, 0); // Oct 3, 2026 22:15
    const nextDayMorning = new Date(2026, 9, 4, 7, 45, 0); // Oct 4, 2026 07:45

    expect(getCurrentLocalDayKey(loginTime)).toBe('2026-10-03');

    const stamped = stampSessionUserWithDate(
      { email: 'teacher@tala.edu.il', name: 'מיכל' },
      loginTime
    );
    expect(stamped.sessionDate).toBe('2026-10-03');
    expect(isSessionUserValidForToday(stamped, sameDayLater)).toBe(true);
    expect(isSessionUserValidForToday(stamped, nextDayMorning)).toBe(false);
    // Legacy session without sessionDate should also expire
    expect(isSessionUserValidForToday({ email: 'teacher@tala.edu.il' }, sameDayLater)).toBe(false);
  });

  it('enforces time-limited trial user expiration and builds signed Hebrew NDA document', () => {
    const start = new Date('2026-10-01T08:00:00.000Z');
    const expiresAt = computeTrialExpirationIso(7, start);
    const trialUser = {
      id: 'u_trial_1',
      name: 'דנה כהן',
      email: 'dana@trial.edu.il',
      accessCode: 'Trial1234',
      active: true,
      isTrialUser: true,
      trialDays: 7,
      trialStartedAt: start.toISOString(),
      trialExpiresAt: expiresAt,
      mustSignNda: true,
      ndaSigned: false
    };

    const day3 = new Date('2026-10-04T08:00:00.000Z');
    const day9 = new Date('2026-10-10T08:00:00.000Z');

    expect(isTrialUserExpired(trialUser, day3)).toBe(false);
    expect(getTrialRemainingDays(trialUser, day3)).toBe(4);
    expect(isTrialUserExpired(trialUser, day9)).toBe(true);
    expect(getTrialRemainingDays(trialUser, day9)).toBe(0);

    // Expired trial user is blocked by verifyAllowedUser
    const expiredUser = {
      ...trialUser,
      trialExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    };
    const res = verifyAllowedUser('dana@trial.edu.il', 'Trial1234', [expiredUser]);
    expect(res.allowed).toBe(false);
    expect(res.isTrialExpired).toBe(true);
    expect(res.reason).toContain('תקופת הניסיון');

    // Signed NDA HTML document contains signer details, ID number, Hebrew NDA text, and both graphical + stamp signatures
    const sampleTableSig = '<table width="224"><tr><td bgcolor="#1e3a5f">&nbsp;</td></tr></table>';
    const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const ndaEmailHtml = buildSignedNdaDocumentHtml({
      signerName: 'דנה כהן',
      signerEmail: 'dana@trial.edu.il',
      signerIdNumber: '012345678',
      signerDate: '03/10/2026',
      signatureText: 'דנה כהן',
      signatureTableHtml: sampleTableSig,
      signatureDataUrl: sampleDataUrl,
      preferImageSignature: false,
      trialDays: 7
    });
    expect(ndaEmailHtml).toContain('כתב התחייבות לשמירת סודיות, קניין רוחני ואי-הפצה (NDA)');
    expect(ndaEmailHtml).toContain('012345678');
    expect(ndaEmailHtml).toContain(sampleTableSig);
    expect(ndaEmailHtml).toContain('✍️ דנה כהן');

    const ndaPdfHtml = buildSignedNdaDocumentHtml({
      signerName: 'דנה כהן',
      signerEmail: 'dana@trial.edu.il',
      signerIdNumber: '012345678',
      signerDate: '03/10/2026',
      signatureText: 'דנה כהן',
      signatureTableHtml: sampleTableSig,
      signatureDataUrl: sampleDataUrl,
      preferImageSignature: true,
      trialDays: 7
    });
    expect(ndaPdfHtml).toContain(sampleDataUrl);
    expect(ndaPdfHtml).toContain('✍️ דנה כהן');
  });

  it('builds the optional post-usage User Experience Survey HTML email with all ratings and recommendation', () => {
    const surveyHtml = buildUserSurveyEmailHtml({
      userName: 'דנה כהן',
      userEmail: 'dana@trial.edu.il',
      userTitle: 'גננת שילוב',
      userGroup: 'מתי"א מרכז',
      isTrialUser: true,
      ratings: {
        easeOfWebsite: 5,
        createStudent: 5,
        generateGoals: 4,
        createReport: 5,
        collaborateWithColleagues: 5
      },
      recommendToColleaguesAndManager: 'בהחלט כן – אמליץ בחום לקולגות ולמנהל/ת לרכוש גישה להמשך שימוש',
      overallFeedback: 'מערכת נהדרת שחוסכת שעות של כתיבה.',
      improvementSuggestions: 'להוסיף עוד תבניות למפגש בוקר.'
    });

    expect(surveyHtml).toContain('משוב משתמש/ת על העבודה במערכת TALA');
    expect(surveyHtml).toContain('4.8 / 5');
    expect(surveyHtml).toContain('בהחלט כן – אמליץ בחום לקולגות ולמנהל/ת לרכוש גישה להמשך שימוש');
    expect(surveyHtml).toContain('מערכת נהדרת שחוסכת שעות של כתיבה.');
    expect(surveyHtml).toContain('להוסיף עוד תבניות למפגש בוקר.');

    // Verify sanitizeForFirestore strips undefined values so Firestore setDoc never rejects non-trial users
    const rawUsers = [
      {
        id: 'u_moti',
        email: 'moti.reshef@gmail.com',
        name: 'מוטי רשף',
        isTrialUser: false,
        trialDays: undefined,
        trialStartedAt: undefined
      }
    ];
    const sanitized = sanitizeForFirestore(rawUsers);
    expect(sanitized[0].email).toBe('moti.reshef@gmail.com');
    expect('trialDays' in sanitized[0]).toBe(false);
  });

  it('hashes and salts user passwords with unique per-user salts and migrates legacy plaintext accessCode', () => {
    // DEFAULT_ALLOWED_USERS must never contain plaintext accessCode
    DEFAULT_ALLOWED_USERS.forEach((u) => {
      expect('accessCode' in u).toBe(false);
      expect(u.passwordSalt).toMatch(/^[0-9a-f]{32}$/);
      expect(u.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    });

    // Two users with the exact same password receive distinct random salts and distinct hashes
    const creds1 = createPasswordCredentials('Secret#2026!');
    const creds2 = createPasswordCredentials('Secret#2026!');
    expect(creds1.passwordSalt).not.toBe(creds2.passwordSalt);
    expect(creds1.passwordHash).not.toBe(creds2.passwordHash);
    expect(verifyUserPassword(creds1, 'Secret#2026!')).toBe(true);
    expect(verifyUserPassword(creds2, 'Secret#2026!')).toBe(true);
    expect(verifyUserPassword(creds1, 'WrongPassword!')).toBe(false);

    // Legacy user record with plaintext accessCode is automatically migrated to passwordHash + passwordSalt
    const legacyUsers = [
      {
        id: 'u_legacy_1',
        name: 'מוטי רשף',
        email: 'moti.reshef@gmail.com',
        accessCode: 'Moti#2026!',
        active: true
      }
    ];
    const { users: migratedUsers, migrated } = ensureUsersListPasswordsHashed(legacyUsers);
    expect(migrated).toBe(true);
    expect('accessCode' in migratedUsers[0]).toBe(false);
    expect(migratedUsers[0].passwordSalt).toMatch(/^[0-9a-f]{32}$/);
    expect(migratedUsers[0].passwordHash).toMatch(/^[0-9a-f]{64}$/);

    // verifyAllowedUser authenticates against the salted hash and strips any legacy accessCode
    const authOk = verifyAllowedUser('moti.reshef@gmail.com', 'Moti#2026!', legacyUsers);
    expect(authOk.allowed).toBe(true);
    expect('accessCode' in authOk.user).toBe(false);
    expect(authOk.updatedUsersList).not.toBeNull();
    expect('accessCode' in authOk.updatedUsersList[0]).toBe(false);

    const authFail = verifyAllowedUser('moti.reshef@gmail.com', 'BadPass#1', migratedUsers);
    expect(authFail.allowed).toBe(false);
  });

  it('tracks unread shared report notifications and removes them once opened/clicked', () => {
    const sharedColleague = {
      id: 'u_colleague_1',
      name: 'רונית הגננת',
      email: 'ronit@tala.edu.il',
      notifyOnSharedReport: true
    };
    const sharedStudent = {
      id: 'st_shared_99',
      name: 'אורי לוי',
      ownerEmail: 'michal@tala.edu.il',
      sharedByName: 'מיכל כהן',
      sharedWith: ['ronit@tala.edu.il'],
      sharedReadBy: [],
      archived: false
    };

    const unreadInitial = getUnreadSharedReportsForUser([sharedStudent], sharedColleague, []);
    expect(unreadInitial).toHaveLength(1);
    expect(unreadInitial[0].id).toBe('st_shared_99');

    // When teacher clicks the notification, markSharedReportAsRead adds their email to sharedReadBy
    const markedReadStudent = markSharedReportAsRead(sharedStudent, sharedColleague.email);
    expect(markedReadStudent.sharedReadBy).toContain('ronit@tala.edu.il');

    const unreadAfterClick = getUnreadSharedReportsForUser(
      [markedReadStudent],
      sharedColleague,
      []
    );
    expect(unreadAfterClick).toHaveLength(0);

    // If user disables notifications (notifyOnSharedReport: false), returns empty list
    const disabledUser = { ...sharedColleague, notifyOnSharedReport: false };
    expect(getUnreadSharedReportsForUser([sharedStudent], disabledUser, [])).toHaveLength(0);
  });

  it('formats Educational-Functional Status Report with professional bullets and strips all numbers', () => {
    const rawSections = [
      {
        sectionNumber: 1,
        title: '1. פרטים מזהים ורקע כללי',
        content: '1. תלמיד בגן חובה\n2. משולב במסגרת חינוכית'
      },
      {
        sectionNumber: 99,
        title: '14) סעיף מותאם אישית',
        content: '1) מטרה ראשונה במפגש\n- מטרה שנייה בחצר'
      }
    ];

    const sanitized = sanitizeStatusReportSections(rawSections, 'boy');
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0].title).toBe('פרטים מזהים ורקע כללי');
    expect(sanitized[0].content).toBe('• תלמיד בגן חובה\n• משולב במסגרת חינוכית');
    expect(sanitized[1].title).toBe('סעיף מותאם אישית');
    expect(sanitized[1].content).toBe('• מטרה ראשונה במפגש\n• מטרה שנייה בחצר');

    const wordHtml = buildStatusReportWordDocumentHtml(
      {
        name: 'אורי לוי',
        gender: 'boy',
        schoolYear: 'תשפ"ו',
        educationalFramework: 'גן אורן',
        statusReportSections: sanitized
      },
      false
    );
    expect(wordHtml).toContain('<span style="color:#2563eb;">&#9670;</span> פרטים מזהים ורקע כללי');
    expect(wordHtml).not.toContain('1. פרטים מזהים ורקע כללי');
    expect(wordHtml).toContain('• תלמיד בגן חובה');
  });
});




