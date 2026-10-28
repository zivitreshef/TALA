import { buildPedagogicalReminderEmailHtml } from '../emailService';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
  loadLocalUserPreferences,
  saveLocalUserPreferences,
  addPrivateGoal,
  removePrivateGoal,
  updatePrivateGoal,
  applyPreferencesToNewStudent,
  getBesadHeaderHtml,
  toHebrewGematria,
  formatHebrewCalendarDate,
  formatDateWithPreferences
} from '../domain/userPreferences';
import {
  getDisplayReportDate,
  buildWorkPlanPrintHtml,
  getTeacherMetaBadge,
  getTeacherSignaturePrintBlock,
  getTeacherSignatureWordCell
} from '../export/wordAndPrintBuilders';
import TeacherPreferencesModal from '../components/modals/TeacherPreferencesModal';

// Mock localStorage for test environment
const storageMap = new Map();
const localStorageMock = {
  getItem: (k) => storageMap.get(k) ?? null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};
globalThis.localStorage = localStorageMock;

describe('User Preferences Domain & Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('normalizes empty or null preferences with sensible defaults', () => {
    const prefs = normalizeUserPreferences(null);
    expect(prefs.defaultReportType).toBe('tala');
    expect(prefs.reportDateFormat).toBe('both');
    expect(prefs.defaultPrivacyMode).toBe('full_name');
    expect(prefs.dailyDigestTime).toBe('14:00');
    expect(prefs.showBesad).toBe(false);
    expect(prefs.besadText).toBe('בס"ד');
    expect(prefs.privateGoals).toEqual([]);
    expect(prefs.notifyOnTeamMessage).toBe(true);
    expect(prefs.pedagogicalReminderEnabled).toBe(false);
    expect(prefs.pedagogicalReminderFrequency).toBe('monthly');
    expect(prefs.pedagogicalReminderWeeklyDay).toBe('sunday');
    expect(prefs.pedagogicalReminderMonthlyDay).toBe(1);
    expect(prefs.pedagogicalReminderTime).toBe('09:00');
  });

  it('normalizes pedagogical reminder fields and synchronizes legacy monthlyPedagogicalReminder', () => {
    const rawWeekly = {
      pedagogicalReminderEnabled: true,
      pedagogicalReminderFrequency: 'weekly',
      pedagogicalReminderWeeklyDay: 'wednesday',
      dailyDigestTime: '08:45'
    };
    const normWeekly = normalizeUserPreferences(rawWeekly);
    expect(normWeekly.pedagogicalReminderEnabled).toBe(true);
    expect(normWeekly.monthlyPedagogicalReminder).toBe(true);
    expect(normWeekly.pedagogicalReminderFrequency).toBe('weekly');
    expect(normWeekly.pedagogicalReminderWeeklyDay).toBe('wednesday');
    expect(normWeekly.dailyDigestTime).toBe('08:45');

    const rawMonthly = {
      monthlyPedagogicalReminder: true,
      pedagogicalReminderFrequency: 'monthly',
      pedagogicalReminderMonthlyDay: 25,
      pedagogicalReminderTime: '17:00'
    };
    const normMonthly = normalizeUserPreferences(rawMonthly);
    expect(normMonthly.pedagogicalReminderEnabled).toBe(true);
    expect(normMonthly.pedagogicalReminderFrequency).toBe('monthly');
    expect(normMonthly.pedagogicalReminderMonthlyDay).toBe(25);
    expect(normMonthly.pedagogicalReminderTime).toBe('17:00');
  });

  it('sanitizes and preserves valid user settings', () => {
    const custom = {
      defaultReportType: 'tachi',
      reportDateFormat: 'hebrew',
      defaultPrivacyMode: 'acronym',
      defaultEducationalFramework: 'גן רקפת',
      dailyDigestTime: '13:00',
      showBesad: true,
      besadText: 'ב"ה',
      aiWritingTone: 'empathetic'
    };
    const prefs = normalizeUserPreferences(custom);
    expect(prefs.defaultReportType).toBe('tachi');
    expect(prefs.reportDateFormat).toBe('hebrew');
    expect(prefs.defaultPrivacyMode).toBe('acronym');
    expect(prefs.defaultEducationalFramework).toBe('גן רקפת');
    expect(prefs.dailyDigestTime).toBe('13:00');
    expect(prefs.showBesad).toBe(true);
    expect(prefs.besadText).toBe('ב"ה');
    expect(prefs.aiWritingTone).toBe('empathetic');
  });

  it('saves and retrieves preferences in localStorage correctly', () => {
    const email = 'teacher@tala.edu.il';
    const prefs = {
      defaultReportType: 'tachi',
      defaultEducationalFramework: 'בי"ס שחפים',
      dailyDigestTime: '15:00'
    };
    const ok = saveLocalUserPreferences(email, prefs);
    expect(ok).toBe(true);

    const loaded = loadLocalUserPreferences(email);
    expect(loaded.defaultReportType).toBe('tachi');
    expect(loaded.defaultEducationalFramework).toBe('בי"ס שחפים');
    expect(loaded.dailyDigestTime).toBe('15:00');
  });

  it('adds, updates, and deletes private goals without polluting shared data', () => {
    const initial = { ...DEFAULT_USER_PREFERENCES };
    const withGoal = addPrivateGoal(initial, {
      text: 'התלמיד ישתף פעולה במשחק תורות',
      domain: 'רגשי-חברתי',
      environment: 'חצר'
    });
    expect(withGoal.privateGoals.length).toBe(1);
    expect(withGoal.privateGoals[0].text).toBe('התלמיד ישתף פעולה במשחק תורות');
    expect(withGoal.privateGoals[0].id).toBeDefined();

    const goalId = withGoal.privateGoals[0].id;
    const updated = updatePrivateGoal(withGoal, goalId, {
      text: 'התלמיד ישתף פעולה במשחק תורות למשך 10 דקות'
    });
    expect(updated.privateGoals[0].text).toBe('התלמיד ישתף פעולה במשחק תורות למשך 10 דקות');

    const removed = removePrivateGoal(updated, goalId);
    expect(removed.privateGoals.length).toBe(0);
  });

  it('applies default preferences when creating a new student', () => {
    const prefs = {
      defaultReportType: 'tachi',
      defaultEducationalFramework: 'גן אלון'
    };
    const student = applyPreferencesToNewStudent({ name: 'דניאל' }, prefs);
    expect(student.planType).toBe('תח"י');
    expect(student.educationalFramework).toBe('גן אלון');
  });

  it('generates Besad header HTML only when showBesad is enabled', () => {
    expect(getBesadHeaderHtml({ showBesad: false })).toBe('');
    const besadHtml = getBesadHeaderHtml({ showBesad: true, besadText: 'ב"ה' });
    expect(besadHtml).toContain('ב"ה');
    expect(besadHtml).toContain('doc-besad-header');
  });
});

describe('Hebrew Dates & Print Output (Bug 6)', () => {
  it('converts numbers to Hebrew gematria accurately', () => {
    expect(toHebrewGematria(1)).toBe('א׳');
    expect(toHebrewGematria(15)).toBe('ט״ו');
    expect(toHebrewGematria(16)).toBe('ט״ז');
    expect(toHebrewGematria(17)).toBe('י״ז');
    expect(toHebrewGematria(28)).toBe('כ״ח');
  });

  it('formats dates according to preference: gregorian, hebrew, or both', () => {
    const dateStr = '2026-10-28';
    const gregOnly = formatDateWithPreferences(dateStr, 'gregorian');
    expect(gregOnly).toBe('28.10.2026');

    const hebOnly = formatDateWithPreferences(dateStr, 'hebrew');
    expect(hebOnly).toContain('תשפ״ז');
    expect(hebOnly).not.toContain('28.10.2026');

    const both = formatDateWithPreferences(dateStr, 'both');
    expect(both).toContain('תשפ״ז');
    expect(both).toContain('28.10.2026');
    expect(both).toContain('|');
  });

  it('applies reportDateFormat preference in print HTML output', () => {
    const sampleStudent = {
      studentName: 'יובל לוי',
      date: '2026-10-28',
      reportDateFormat: 'hebrew'
    };
    const displayDate = getDisplayReportDate(sampleStudent);
    expect(displayDate).toContain('תשפ״ז');
    expect(displayDate).not.toContain('28.10.2026');

    const printHtml = buildWorkPlanPrintHtml(sampleStudent, false, 'https://example.com/logo.png');
    expect(printHtml).toContain(displayDate);
  });
});

describe('TeacherPreferencesModal Rendering & UX (Bugs 1-5)', () => {
  const dummyUser = {
    email: 'michal@tala.edu.il',
    name: 'מיכל כהן',
    title: 'מורת שילוב',
    group: 'מתי"א מרכז'
  };

  it('renders all 4 tabs WITHOUT numbers and title without בס"ד (Bugs 1 & 5)', () => {
    const html = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={DEFAULT_USER_PREFERENCES}
        onSavePreferences={() => {}}
      />
    );

    // Verify unnumbered tabs
    expect(html).toContain('<span>ברירות מחדל לדוחות</span>');
    expect(html).toContain('<span>בנק מטרות אישי (0)</span>');
    expect(html).toContain('<span>התראות ותקשורת</span>');
    expect(html).toContain('<span>פרופיל מקצועי וחתימה</span>');

    // Verify numbered labels are not present
    expect(html).not.toContain('1. ברירות מחדל');
    expect(html).not.toContain('2. בנק מטרות');
    expect(html).not.toContain('3. התראות');
    expect(html).not.toContain('4. פרופיל');

    // Verify Tab 4 does not have בס"ד in title
    expect(html).not.toContain('פרופיל, בס&quot;ד וחתימה');
  });

  it('renders daily digest unconstrained time input when daily_digest is active', () => {
    const prefsWithDailyDigest = {
      ...DEFAULT_USER_PREFERENCES,
      notifyOnTeamMessage: true,
      notificationFrequency: 'daily_digest',
      dailyDigestTime: '13:30'
    };

    const html = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={prefsWithDailyDigest}
        onSavePreferences={() => {}}
      />
    );

    expect(html).toContain('data-testid="daily-digest-time-select"');
    expect(html).toContain('value="13:30"');
    expect(html).toContain('תזכורת וסיכום פדגוגי');
    expect(html).not.toContain('תזכורת פדגוגית חודשית למעקב יעדים:');
  });

  it('renders weekly and monthly recurrence controls for pedagogical reminder', () => {
    // 1. Weekly recurrence
    const weeklyPrefs = {
      ...DEFAULT_USER_PREFERENCES,
      pedagogicalReminderEnabled: true,
      pedagogicalReminderFrequency: 'weekly',
      pedagogicalReminderWeeklyDay: 'tuesday'
    };
    const htmlWeekly = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={weeklyPrefs}
        onSavePreferences={() => {}}
      />
    );
    expect(htmlWeekly).toContain('data-testid="reminder-freq-weekly"');
    expect(htmlWeekly).toContain('data-testid="reminder-weekly-day-select"');
    expect(htmlWeekly).toContain('יום שלישי');
    expect(htmlWeekly).toContain('data-testid="weekly-reminder-time-09:00"');
    expect(htmlWeekly).toContain('data-testid="weekly-reminder-time-12:00"');
    expect(htmlWeekly).toContain('data-testid="weekly-reminder-time-17:00"');

    // 2. Monthly recurrence (exact day 1-31 and time 09:00 / 12:00 / 17:00)
    const monthlyPrefs = {
      ...DEFAULT_USER_PREFERENCES,
      pedagogicalReminderEnabled: true,
      pedagogicalReminderFrequency: 'monthly',
      pedagogicalReminderMonthlyDay: 15,
      pedagogicalReminderTime: '12:00'
    };
    const htmlMonthly = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={monthlyPrefs}
        onSavePreferences={() => {}}
      />
    );
    expect(htmlMonthly).toContain('data-testid="reminder-monthly-day-select"');
    expect(htmlMonthly).toContain('15 לחודש');
    expect(htmlMonthly).toContain('data-testid="reminder-time-09:00"');
    expect(htmlMonthly).toContain('data-testid="reminder-time-12:00"');
    expect(htmlMonthly).toContain('data-testid="reminder-time-17:00"');
  });

  
  it('renders "Send Now" button for pedagogical summary and generates rich team-meeting ready HTML', () => {
    const html = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={DEFAULT_USER_PREFERENCES}
        onSavePreferences={() => {}}
      />
    );

    expect(html).toContain('data-testid="send-pedagogical-reminder-now-btn"');
    expect(html).toContain('שלח סיכום פדגוגי כעת למייל');

    // Test email template builder with accomplishments and adhoc notes
    const sampleGaps = [
      {
        studentId: 'st_1',
        studentName: 'דניאל ישראלי',
        framework: 'כיתת שילוב ב׳',
        goalId: 'g_1',
        goalTitle: 'קריאת טקסט שוטפת ברמת גיל',
        environment: 'לימודי',
        currentProgress: 40,
        targetProgress: 80,
        daysSinceObservation: 52,
        neverObserved: false
      }
    ];

    const sampleAccomplishments = {
      advancedGoals: [
        {
          studentId: 'st_1',
          studentName: 'דניאל ישראלי',
          framework: 'כיתת שילוב ב׳',
          goalTitle: 'עצמאות בהתארגנות בבוקר',
          environment: 'עצמאות',
          currentProgress: 85,
          targetProgress: 80
        }
      ],
      recentObservations: [
        {
          studentId: 'st_1',
          studentName: 'דניאל ישראלי',
          framework: 'כיתת שילוב ב׳',
          goalTitle: 'משחק חברתי בהפסקה',
          environment: 'חברתי',
          timestamp: '2026-10-25T11:00:00Z',
          progress: 75,
          note: 'הגיב מצוין לתיווך חזותי והשתלב במשחק כדורגל',
          supportLevel: 'תיווך חלקי'
        }
      ]
    };

    const emailHtmlFullName = buildPedagogicalReminderEmailHtml({
      teacherName: 'מיכל כהן',
      gaps: sampleGaps,
      accomplishments: sampleAccomplishments,
      totalStudents: 1,
      privacyMode: 'full_name'
    });

    // Positive and team-ready headers
    expect(emailHtmlFullName).toContain('סיכום פדגוגי שבועי • מוכנות לישיבות צוות');
    expect(emailHtmlFullName).toContain('הישגים והתקדמות לפי התוכנית');
    expect(emailHtmlFullName).toContain('עצמאות בהתארגנות בבוקר');
    expect(emailHtmlFullName).toContain('85%');

    // Ad-hoc observation notes from individual sessions
    expect(emailHtmlFullName).toContain('תובנות ודגשים מהעבודה הפרטנית בזמן אמת');
    expect(emailHtmlFullName).toContain('הגיב מצוין לתיווך חזותי והשתלב במשחק כדורגל');
    expect(emailHtmlFullName).toContain('תיווך חלקי');

    // Team meeting preparation checklist
    expect(emailHtmlFullName).toContain('נקודות מפתח להצגה בישיבת צוות');

    // Continuity gaps
    expect(emailHtmlFullName).toContain('מוקדים מומלצים לתצפית בימים הקרובים');
    expect(emailHtmlFullName).toContain('52 ימים');

    // Test acronym mode
    const emailHtmlAcronym = buildPedagogicalReminderEmailHtml({
      teacherName: 'מיכל כהן',
      gaps: sampleGaps,
      accomplishments: sampleAccomplishments,
      totalStudents: 1,
      privacyMode: 'acronym'
    });
    expect(emailHtmlAcronym).toContain('ד.י.');
    expect(emailHtmlAcronym).not.toContain('דניאל ישראלי');
  });

  it('has stable height and stained glass strip to prevent jumping (Bug 2 & 3)', () => {
    const html = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={DEFAULT_USER_PREFERENCES}
        onSavePreferences={() => {}}
      />
    );

    expect(html).toContain('height:660px');
    expect(html).toContain('linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%)');
    expect(html).toContain('linear-gradient(135deg, #3b6ea5 0%, #5b9bd5 50%, #8e7cc3 100%)');
  });

  it('shows upload button only when no signature exists; shows remove button when signature exists', () => {
    // 1. Without signature: upload button is visible, remove button is not
    const htmlNoSig = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={{ ...DEFAULT_USER_PREFERENCES, signatureImage: null }}
        onSavePreferences={() => {}}
      />
    );
    expect(htmlNoSig).toContain('data-testid="upload-signature-label"');
    expect(htmlNoSig).not.toContain('data-testid="remove-signature-btn"');

    // 2. With signature: remove button is visible, upload button is not
    const htmlWithSig = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={{ ...DEFAULT_USER_PREFERENCES, signatureImage: 'data:image/png;base64,sample' }}
        onSavePreferences={() => {}}
      />
    );
    expect(htmlWithSig).toContain('data-testid="remove-signature-btn"');
    expect(htmlWithSig).not.toContain('data-testid="upload-signature-label"');
  });
});

describe('Teacher Profile in Reports and Exports', () => {
  const teacherData = {
    teacherName: 'מוטי גל רשף',
    teacherTitle: 'ממלא מקום ראש הממשלה',
    institutionalAffiliation: 'קיבוץ עמיר'
  };

  it('generates teacher meta badge for student details bar', () => {
    const badge = getTeacherMetaBadge(teacherData);
    expect(badge).toContain('עורך/ת התוכנית:');
    expect(badge).toContain('מוטי גל רשף');
    expect(badge).toContain('(ממלא מקום ראש הממשלה)');
    expect(badge).toContain('קיבוץ עמיר');
  });

  it('generates teacher signature print block with and without signature image', () => {
    // 1. Without image
    const blockNoImg = getTeacherSignaturePrintBlock(teacherData, 'מחנכת הכיתה');
    expect(blockNoImg).toContain('חתימת ממלא מקום ראש הממשלה');
    expect(blockNoImg).toContain('מוטי גל רשף • קיבוץ עמיר');

    // 2. With image
    const blockWithImg = getTeacherSignaturePrintBlock({
      ...teacherData,
      signatureImage: 'data:image/png;base64,sample'
    });
    expect(blockWithImg).toContain('חתימת ממלא מקום ראש הממשלה:');
    expect(blockWithImg).toContain('מוטי גל רשף');
    expect(blockWithImg).toContain('קיבוץ עמיר');
    expect(blockWithImg).toContain('<img');
  });

  it('includes teacher name, title and institution in full work plan print HTML', () => {
    const sampleStudent = {
      studentName: 'יונתן כהן',
      date: '2026-10-28',
      ...teacherData
    };
    const html = buildWorkPlanPrintHtml(sampleStudent, false, 'https://example.com/logo.png');
    expect(html).toContain('עורך/ת התוכנית:');
    expect(html).toContain('מוטי גל רשף');
    expect(html).toContain('(ממלא מקום ראש הממשלה)');
    expect(html).toContain('קיבוץ עמיר');
    expect(html).toContain('חתימת ממלא מקום ראש הממשלה');
  });

  it('applies teacher fullName to new student homeroomTeacher and integrationTeacher', () => {
    const prefs = {
      defaultReportType: 'tachi',
      fullName: 'מוטי גל רשף'
    };
    const student = applyPreferencesToNewStudent({ name: 'רוני' }, prefs);
    expect(student.homeroomTeacher).toBe('מוטי גל רשף');
    expect(student.integrationTeacher).toBe('מוטי גל רשף');
  });

  it('ensures TeacherPreferencesModal imports getObservationGaps and pedagogical helpers', () => {
    const modalSource = fs.readFileSync(path.resolve(__dirname, '../components/modals/TeacherPreferencesModal.jsx'), 'utf8');
    const firstLines = modalSource.slice(0, 500);
    expect(firstLines).toContain('getObservationGaps');
    expect(firstLines).toContain('getPedagogicalAccomplishmentsSummary');
    expect(firstLines).toContain('sendPedagogicalReminderEmailInBackground');
  });

  it('ensures App.jsx imports useMemo to prevent runtime ReferenceError (Regression #useMemo)', () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, '../App.jsx'), 'utf8');
    const firstLines = appSource.slice(0, 500);
    expect(firstLines).toMatch(/import\s+React,\s*\{[^}]*useMemo[^}]*\}\s+from\s+['"]react['"]/);
  });
});
