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
  getBesadHeaderHtml
} from '../domain/userPreferences';
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
      showBesad: true,
      besadText: 'ב"ה',
      aiWritingTone: 'empathetic'
    };
    const prefs = normalizeUserPreferences(custom);
    expect(prefs.defaultReportType).toBe('tachi');
    expect(prefs.reportDateFormat).toBe('hebrew');
    expect(prefs.defaultPrivacyMode).toBe('acronym');
    expect(prefs.defaultEducationalFramework).toBe('גן רקפת');
    expect(prefs.showBesad).toBe(true);
    expect(prefs.besadText).toBe('ב"ה');
    expect(prefs.aiWritingTone).toBe('empathetic');
  });

  it('saves and retrieves preferences in localStorage correctly', () => {
    const email = 'teacher@tala.edu.il';
    const prefs = {
      defaultReportType: 'tachi',
      defaultEducationalFramework: 'בי"ס שחפים'
    };
    const ok = saveLocalUserPreferences(email, prefs);
    expect(ok).toBe(true);

    const loaded = loadLocalUserPreferences(email);
    expect(loaded.defaultReportType).toBe('tachi');
    expect(loaded.defaultEducationalFramework).toBe('בי"ס שחפים');
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

describe('TeacherPreferencesModal Rendering', () => {
  const dummyUser = {
    email: 'michal@tala.edu.il',
    name: 'מיכל כהן',
    title: 'מורת שילוב',
    group: 'מתי"א מרכז'
  };

  it('renders all 4 tabs and key settings in static markup', () => {
    const html = renderToStaticMarkup(
      <TeacherPreferencesModal
        isOpen={true}
        onClose={() => {}}
        currentUser={dummyUser}
        userPreferences={DEFAULT_USER_PREFERENCES}
        onSavePreferences={() => {}}
      />
    );

    // Verify all 4 tab buttons exist
    expect(html).toContain('tab-default-settings');
    expect(html).toContain('tab-private-goals');
    expect(html).toContain('tab-notifications');
    expect(html).toContain('tab-profile-signature');

    // Verify key fields
    expect(html).toContain('סוג תוכנית עבודה כברירת מחדל');
    expect(html).toContain('בנק המטרות האישי והפרטי שלך:');
    expect(html).toContain('פרטי מורה קבועים בדוחות:');
    expect(html).toContain('הצג בס&quot;ד בראש כל דוח והדפסה');
    expect(html).toContain('save-teacher-preferences-btn');
    expect(html).toContain('user-profile-modal-close-btn');
  });
});
