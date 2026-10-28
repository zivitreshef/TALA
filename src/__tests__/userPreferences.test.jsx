import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
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
  buildWorkPlanPrintHtml
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

  it('renders daily digest hour select when daily_digest is active (Bug 4)', () => {
    const prefsWithDailyDigest = {
      ...DEFAULT_USER_PREFERENCES,
      notifyOnTeamMessage: true,
      notificationFrequency: 'daily_digest',
      dailyDigestTime: '13:00'
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
    expect(html).toContain('13:00 (סיום יום לימודים מוקדם)');
    expect(html).toContain('14:00 (ברירת מחדל מומלצת)');
    expect(html).toContain('תזכורת פדגוגית חודשית למעקב יעדים:');
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
});
