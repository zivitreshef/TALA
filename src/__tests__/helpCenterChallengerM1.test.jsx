import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';
import { PEDAGOGICAL_GUIDE_CHAPTERS, GUIDE_CATEGORIES } from '../components/modals/pedagogicalGuideData';

// React dispatcher harness for headless node unit testing
const reactInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

function renderWithHarness(props, stateOverrides = {}) {
  const originalDispatcher = reactInternals.H;
  const stateValues = {
    supportMessage: '',
    messageSent: false,
    isSubmitting: false,
    showAboutLetter: false,
    activeTab: props.isExpired ? 'contact' : 'guide',
    rfeTitle: '',
    rfeCategory: 'שיפור בטופס תל"א / תח"י',
    rfeMessage: '',
    rfeSubmitted: false,
    isSubmittingRfe: false,
    guideSearchQuery: '',
    guideSelectedCategory: 'all',
    expandedChapters: { 1: true, 15: true },
    ...stateOverrides
  };

  const stateSetters = {};
  const stateKeys = Object.keys(stateValues);
  let hookIndex = 0;

  reactInternals.H = {
    useState(initial) {
      const key = stateKeys[hookIndex++] || `state_${hookIndex}`;
      const val = key in stateOverrides ? stateOverrides[key] : (typeof initial === 'function' ? initial() : initial);
      stateValues[key] = val;
      const setter = vi.fn((next) => {
        stateValues[key] = typeof next === 'function' ? next(stateValues[key]) : next;
      });
      stateSetters[key] = setter;
      return [val, setter];
    },
    useEffect() {},
    useRef(init) { return { current: init }; },
    useCallback(fn) { return fn; },
    useMemo(fn) { return fn(); }
  };

  try {
    const element = TrialUpgradeModal(props);
    return { element, stateValues, stateSetters };
  } finally {
    reactInternals.H = originalDispatcher;
  }
}

function findAllInTree(node, predicate, results = []) {
  if (!node || typeof node !== 'object') return results;
  if (predicate(node)) results.push(node);
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      findAllInTree(child, predicate, results);
    }
  } else if (children && typeof children === 'object') {
    findAllInTree(children, predicate, results);
  }
  return results;
}

function findInTree(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findInTree(child, predicate);
      if (found) return found;
    }
  } else if (children && typeof children === 'object') {
    return findInTree(children, predicate);
  }
  return null;
}

describe('Milestone 1 Empirical Challenger: Forms & Pedagogical Guide Stress Tests', () => {
  const mockPaidTeacher = {
    name: 'זיוית רשף',
    email: 'zivit@tala.edu.il',
    role: 'teacher',
    isTrialUser: false
  };

  const mockTrialTeacher = {
    name: 'דנה שפירא',
    email: 'dana@gan-shiluv.k12.il',
    role: 'teacher',
    isTrialUser: true
  };

  const mockExpiredTeacher = {
    name: 'רונית קפלן',
    email: 'ronit@school.k12.il',
    role: 'teacher',
    isTrialUser: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // OBJECTIVE 1: Direct Support Message Form Empirical Verification
  // ==========================================================================
  describe('Direct Support Message Form Validation & Submission', () => {
    it('blocks empty message submission (empty string "")', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockPaidTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: ''
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      const submitBtn = findInTree(directForm, (n) => n.type === 'button' && n.props.type === 'submit');

      // Verify submit button is disabled
      expect(submitBtn.props.disabled).toBe(true);

      // Attempt form submission directly
      directForm.props.onSubmit({ preventDefault: () => {} });

      // Must NOT call callback
      expect(onSubmitSupportMessage).not.toHaveBeenCalled();
    });

    it('blocks whitespace-only message submission ("   \\n\\t  ")', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockPaidTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: '   \n\t  '
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      const submitBtn = findInTree(directForm, (n) => n.type === 'button' && n.props.type === 'submit');

      // Verify submit button is disabled
      expect(submitBtn.props.disabled).toBe(true);

      // Attempt form submission
      directForm.props.onSubmit({ preventDefault: () => {} });

      // Must NOT call callback
      expect(onSubmitSupportMessage).not.toHaveBeenCalled();
    });

    it('submits valid message for paid user with correct topic, trimmed notes, and user details', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockPaidTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: '  שלום, אשמח לקבל הדרכה לגבי ייצוא דוח ל-Word  '
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      directForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      expect(payload.topic).toBe('💬 פנייה ממשתמש/ת מנוי (תמיכה ושאלות)');
      expect(payload.notes).toContain('פנייה ממשתמש/ת מנוי:');
      expect(payload.notes).toContain('שלום, אשמח לקבל הדרכה לגבי ייצוא דוח ל-Word');
      expect(payload.notes).not.toContain('  שלום'); // trimmed
      expect(payload.notes).toContain('(ערוץ פנייה מועדף: וואטסאפ ישיר לזיוית)');
      expect(payload.name).toBe('זיוית רשף');
      expect(payload.email).toBe('zivit@tala.edu.il');
    });

    it('submits valid message for active trial user with trial topic', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTrialTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: 'איך מסדירים תשלום מנוי שנתי?'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      directForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      expect(payload.topic).toBe('💬 פנייה ממשתמש/ת ניסיון (הסדרת מנוי / תמיכה)');
      expect(payload.notes).toContain('פנייה ממשתמש/ת ניסיון:');
      expect(payload.notes).toContain('איך מסדירים תשלום מנוי שנתי?');
      expect(payload.name).toBe('דנה שפירא');
      expect(payload.email).toBe('dana@gan-shiluv.k12.il');
    });

    it('submits valid message for expired user with expired topic', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockExpiredTeacher,
          isExpired: true,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: 'תקופת הניסיון הסתיימה, מעוניינת לחדש'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      directForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      expect(payload.topic).toBe('💬 פנייה ממשתמש/ת ניסיון שפג תוקפו (הסדרת מנוי)');
      expect(payload.notes).toContain('פנייה ממשתמש/ת ניסיון שפג תוקפו:');
      expect(payload.notes).toContain('תקופת הניסיון הסתיימה, מעוניינת לחדש');
      expect(payload.name).toBe('רונית קפלן');
      expect(payload.email).toBe('ronit@school.k12.il');
    });

    it('handles undefined onSubmitSupportMessage gracefully without crashing', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockPaidTeacher,
          onClose: () => {}
          // onSubmitSupportMessage omitted
        },
        {
          activeTab: 'contact',
          supportMessage: 'בדיקת הודעה ללא קולבק'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      expect(() => {
        directForm.props.onSubmit({ preventDefault: () => {} });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // OBJECTIVE 1: Suggestions for Improvement Form Empirical Verification
  // ==========================================================================
  describe('Suggestions for Improvement Form Validation & Sanitization', () => {
    it('blocks empty suggestion message submission (empty string "")', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTrialTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          rfeCategory: 'מאגר מטרות ויעדים',
          rfeTitle: 'תוספת מטרות תקשורת תומכת וחליפית',
          rfeMessage: ''
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      const submitBtn = findInTree(suggestionForm, (n) => n.type === 'button' && n.props.type === 'submit');

      // Verify submit button is disabled
      expect(submitBtn.props.disabled).toBe(true);

      // Attempt form submission
      suggestionForm.props.onSubmit({ preventDefault: () => {} });

      // Must NOT call callback
      expect(onSubmitSupportMessage).not.toHaveBeenCalled();
    });

    it('blocks whitespace-only suggestion message submission ("   \\n  ")', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTrialTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          rfeCategory: 'מאגר מטרות ויעדים',
          rfeTitle: 'תוספת מטרות תקשורת',
          rfeMessage: '   \n   '
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      const submitBtn = findInTree(suggestionForm, (n) => n.type === 'button' && n.props.type === 'submit');

      expect(submitBtn.props.disabled).toBe(true);

      suggestionForm.props.onSubmit({ preventDefault: () => {} });
      expect(onSubmitSupportMessage).not.toHaveBeenCalled();
    });

    it('submits valid suggestion with category, title, trimmed message, and ZERO RFE tags', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockPaidTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          rfeCategory: 'מעקב יומי ויומן פגישות',
          rfeTitle: 'סימון צבעוני לפגישות דחופות',
          rfeMessage: '  הוספת דגש צבע אדום בוהק לפגישות עם הורים שדורשות תשומת לב מיוחדת  '
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      suggestionForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      // Verification of sanitized topic without (Minor RFE)
      expect(payload.topic).toBe('💡 הצעת ייעול ובקשה לשיפור: מעקב יומי ויומן פגישות - סימון צבעוני לפגישות דחופות');
      expect(payload.topic).not.toContain('(Minor RFE)');
      expect(payload.topic).not.toContain('(RFE)');
      expect(payload.topic).not.toContain('Minor RFE');
      expect(payload.topic).not.toContain('RFE');

      // Verification of notes without RFE
      expect(payload.notes).toContain('[בקשת שיפור והצעת ייעול ממשתמש/ת זיוית רשף (zivit@tala.edu.il)]:');
      expect(payload.notes).toContain('קטגוריה: מעקב יומי ויומן פגישות');
      expect(payload.notes).toContain('נושא: סימון צבעוני לפגישות דחופות');
      expect(payload.notes).toContain('הוספת דגש צבע אדום בוהק לפגישות עם הורים שדורשות תשומת לב מיוחדת');
      expect(payload.notes).not.toContain('  הוספת'); // trimmed
      expect(payload.notes).not.toContain('RFE');

      expect(payload.name).toBe('זיוית רשף');
      expect(payload.email).toBe('zivit@tala.edu.il');
    });

    it('handles empty/whitespace title by falling back to "ללא כותרת" in topic and "כללי" in notes', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTrialTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          rfeCategory: 'מאגר מטרות ויעדים',
          rfeTitle: '   ',
          rfeMessage: 'הצעה לשיפור הניסוח של מטרות ויסות חושי בחצר'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      suggestionForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      expect(payload.topic).toBe('💡 הצעת ייעול ובקשה לשיפור: מאגר מטרות ויעדים - ללא כותרת');
      expect(payload.topic).not.toContain('(Minor RFE)');
      expect(payload.topic).not.toContain('(RFE)');
      expect(payload.notes).toContain('נושא: כללי');
      expect(payload.notes).toContain('הצעה לשיפור הניסוח של מטרות ויסות חושי בחצר');
    });

    it('handles undefined onSubmitSupportMessage gracefully in suggestions form', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTrialTeacher,
          onClose: () => {}
        },
        {
          activeTab: 'contact',
          rfeCategory: 'הפקת דוחות והדפסה',
          rfeTitle: 'בדיקה ללא קולבק',
          rfeMessage: 'הודעה לבדיקת חוסן במקרה שאין קולבק מוגדר'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      expect(() => {
        suggestionForm.props.onSubmit({ preventDefault: () => {} });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // OBJECTIVE 2: 15 Pedagogical Guide Chapters Empirical Verification
  // ==========================================================================
  describe('15 Pedagogical Guide Chapters Empirical Completeness & Accuracy', () => {
    it('verifies exactly 15 sequential, non-empty chapters exist in PEDAGOGICAL_GUIDE_CHAPTERS', () => {
      expect(PEDAGOGICAL_GUIDE_CHAPTERS).toHaveLength(15);

      PEDAGOGICAL_GUIDE_CHAPTERS.forEach((ch, idx) => {
        const expectedId = idx + 1;
        expect(ch.id).toBe(expectedId);
        expect(ch.title).toContain(`פרק ${expectedId}:`);
        expect(ch.subtitle).toBeTruthy();
        expect(ch.badge).toBeTruthy();
        expect(ch.category).toBeTruthy();
        expect(ch.content).toBeInstanceOf(Array);
        expect(ch.content.length).toBeGreaterThan(0);

        ch.content.forEach((section) => {
          expect(section.heading).toBeTruthy();
          expect(section.text).toBeTruthy();
        });
      });
    });

    it('verifies Chapter 6 contains Daily Tracking (DailyPedagogicalTracker, meeting logs with holidays, calendar sync)', () => {
      const ch6 = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === 6);
      expect(ch6).toBeDefined();

      const combinedText = ch6.content.map((c) => `${c.heading} ${c.text}`).join(' ');

      // Meeting logs & Ministry holidays
      expect(combinedText).toContain('יומן פגישות');
      expect(combinedText).toContain('משרד החינוך');
      expect(combinedText).toContain('2024–2027');
      expect(combinedText).toContain('אין לימודים');
      expect(combinedText).toContain('יש לימודים');

      // Calendar sync
      expect(combinedText).toContain('Outlook');
      expect(combinedText).toContain('Google Calendar');
      expect(combinedText).toContain('ics');

      // Daily tasks (PedagogicalTasksModal)
      expect(combinedText).toContain('משימות יומיות מותאמות מטרה');
      expect(combinedText).toContain('PedagogicalTasksModal');

      // 21-day observation gap warnings
      expect(combinedText).toContain('21 יום');
      expect(combinedText).toContain('פערי תצפית');

      // Dual-mode progress updating (AI free-text vs manual 4 mediation levels)
      expect(combinedText).toContain('מצב AI');
      expect(combinedText).toContain('מצב ידני');
      expect(combinedText).toContain('עצמאי לחלוטין');
      expect(combinedText).toContain('תזכורת מילולית');
      expect(combinedText).toContain('תיווך חלקי');
      expect(combinedText).toContain('הדגמה וליווי מלא');
    });

    it('verifies Chapter 7 contains 4-metric KPI emails with meeting readiness checklist & instant send button', () => {
      const ch7 = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === 7);
      expect(ch7).toBeDefined();

      const combinedText = ch7.content.map((c) => `${c.heading} ${c.text}`).join(' ');

      // 4 KPIs
      expect(combinedText).toContain('תלמידים במעקב');
      expect(combinedText).toContain('תצפיות שתועדו');
      expect(combinedText).toContain('יעדים בתנופה (70%+)');
      expect(combinedText).toContain('לרציפות (45+ יום)');

      // Meeting checklist
      expect(combinedText).toContain("צ'ק-ליסט מוכנות לישיבות צוות");
      expect(combinedText).toContain('נקודות להצגה בגאווה');
      expect(combinedText).toContain('נקודות לשיתוף מהשטח');

      // Instant send button
      expect(combinedText).toContain('שלח סיכום פדגוגי כעת למייל');
    });

    it('verifies Chapter 8, 9, and 12 contain PII protection, print privacy toggles, and AI safety', () => {
      // Chapter 8: AI Safety and PII Masking
      const ch8 = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === 8);
      const ch8Text = ch8.content.map((c) => `${c.heading} ${c.text}`).join(' ');
      expect(ch8Text).toContain('מסוך פרטיות אוטומטי');
      expect(ch8Text).toContain('PII Masking');
      expect(ch8Text).toContain('הזרקת פרומפטים');
      expect(ch8Text).toContain('Human-in-the-Loop');

      // Chapter 9: Print privacy toggle
      const ch9 = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === 9);
      const ch9Text = ch9.content.map((c) => `${c.heading} ${c.text}`).join(' ');
      expect(ch9Text).toContain('הגנת פרטיות');
      expect(ch9Text).toContain('ראשי תיבות');
      expect(ch9Text).toContain('קול ההורים');
      expect(ch9Text).toContain('וואטסאפ');

      // Chapter 12: Data protection & Fair Use
      const ch12 = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === 12);
      expect(ch12.title).toContain('הגנת פרטיות, אבטחת מידע ושימוש אחראי');
      const ch12Text = ch12.content.map((c) => `${c.heading} ${c.text}`).join(' ');
      expect(ch12Text).toContain('חובת ההגנה על פרטיות התלמידים');
      expect(ch12Text).toContain('מכסת תלמידים: עד 35 תלמידים');
      expect(ch12Text).toContain('מכסת שאילתות AI: עד 20 שאילתות');
    });

    it('verifies Chapter 15 contains complete Safari iPad/iPhone shortcut guide', () => {
      const ch15 = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === 15);
      expect(ch15).toBeDefined();

      const combinedText = ch15.content.map((c) => `${c.heading} ${c.text}`).join(' ');

      expect(combinedText).toContain('Safari');
      expect(combinedText).toContain('שיתוף');
      expect(combinedText).toContain('הוספה למסך הבית');
      expect(combinedText).toContain('אין צורך להתחבר מראש עם שם וסיסמה');
      expect(combinedText).toContain('https://zivitreshef.github.io/TALA/');
    });

    it('verifies all 7 guide categories in GUIDE_CATEGORIES are represented', () => {
      expect(GUIDE_CATEGORIES).toHaveLength(7);
      const categoryIds = GUIDE_CATEGORIES.map((c) => c.id);

      expect(categoryIds).toContain('all');
      expect(categoryIds).toContain('getting_started');
      expect(categoryIds).toContain('programs_goals');
      expect(categoryIds).toContain('daily_tracking');
      expect(categoryIds).toContain('ai_reports');
      expect(categoryIds).toContain('methodology');
      expect(categoryIds).toContain('settings_tools');

      // Verify each chapter matches a valid non-all category
      PEDAGOGICAL_GUIDE_CHAPTERS.forEach((ch) => {
        expect(categoryIds).toContain(ch.category);
        expect(ch.category).not.toBe('all');
      });
    });

    it('filters chapters correctly with guideSearchQuery and category pills', () => {
      // 1. Search for iPad/iPhone shortcut
      const { element: searchEl } = renderWithHarness(
        { isOpen: true, currentUser: mockPaidTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: 'קיצור דרך' }
      );
      const searchHtml = renderToStaticMarkup(searchEl);
      expect(searchHtml).toContain('פרק 15: התקנת קיצור דרך');
      expect(searchHtml).not.toContain('פרק 1: מבוא');

      // 2. Filter by category 'daily_tracking'
      const { element: catEl } = renderWithHarness(
        { isOpen: true, currentUser: mockPaidTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSelectedCategory: 'daily_tracking' }
      );
      const catHtml = renderToStaticMarkup(catEl);
      expect(catHtml).toContain('פרק 6: מעקב יומי');
      expect(catHtml).toContain('פרק 7: סיכומי התקדמות');
      expect(catHtml).not.toContain('פרק 1: מבוא');

      // 3. Search query with no matches shows graceful empty state
      const { element: emptyEl } = renderWithHarness(
        { isOpen: true, currentUser: mockPaidTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: 'מונחשאינוקייםכלל' }
      );
      const emptyHtml = renderToStaticMarkup(emptyEl);
      expect(emptyHtml).toContain('לא נמצאו פרקים התואמים לחיפוש');
    });
  });

  // ==========================================================================
  // OBJECTIVE 3: Zero RFE & Clean Markup Empirical Verification
  // ==========================================================================
  describe('Zero RFE / Request for Enhancement Markup Audit', () => {
    it('verifies static markup of all 3 tabs has ZERO occurrences of (RFE) or Request for Enhancement', () => {
      const tabs = ['guide', 'contact', 'fair_use'];

      for (const tab of tabs) {
        const { element } = renderWithHarness(
          { isOpen: true, currentUser: mockPaidTeacher, onClose: () => {} },
          { activeTab: tab }
        );
        const html = renderToStaticMarkup(element);

        expect(html).not.toMatch(/\(RFE\)/i);
        expect(html).not.toMatch(/Request for Enhancement/i);
        expect(html).not.toMatch(/\(Minor RFE\)/i);
        expect(html).not.toMatch(/Minor RFE/i);
      }
    });

    it('verifies suggestions select dropdown options are clean of RFE jargon', () => {
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: mockPaidTeacher, onClose: () => {} },
        { activeTab: 'contact' }
      );

      const select = findInTree(element, (n) => n.type === 'select');
      expect(select).toBeDefined();

      const options = findAllInTree(select, (n) => n.type === 'option');
      expect(options.length).toBe(7);

      options.forEach((opt) => {
        expect(opt.props.value).not.toContain('RFE');
        expect(opt.props.children).not.toContain('RFE');
      });
    });
  });
});

