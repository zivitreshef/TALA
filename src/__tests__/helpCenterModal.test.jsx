import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';
import { PEDAGOGICAL_GUIDE_CHAPTERS, GUIDE_CATEGORIES } from '../components/modals/pedagogicalGuideData';

// ============================================================================
// Test Utilities & React Hooks Dispatcher for Node Testing
// ============================================================================
const reactInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

function getAllExpandedMap() {
  const map = {};
  PEDAGOGICAL_GUIDE_CHAPTERS.forEach((ch) => {
    map[ch.id] = true;
  });
  return map;
}

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

// ============================================================================
// Main 4-Tier Test Suite: TALA Help Center Overhaul
// ============================================================================
describe('TrialUpgradeModal - 4-Tier Comprehensive Test Suite', () => {
  const samplePaidUser = {
    name: 'זיוית רשף',
    email: 'zivit@tala.edu.il',
    role: 'teacher',
    isTrialUser: false
  };

  const sampleTrialUser = {
    name: 'מיכל כהן',
    email: 'michal@school.il',
    role: 'teacher',
    isTrialUser: true
  };

  const sampleExpiredUser = {
    name: 'רונית לוי',
    email: 'ronit@school.il',
    role: 'teacher',
    isTrialUser: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // TIER 1: Feature Coverage (Isolation & Component Presence)
  // ==========================================================================
  describe('Tier 1: Feature Coverage', () => {
    it('returns empty markup when isOpen is false or currentUser is null', () => {
      const htmlClosed = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: false,
          currentUser: samplePaidUser,
          onClose: () => {}
        })
      );
      expect(htmlClosed).toBe('');

      const htmlNoUser = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: null,
          onClose: () => {}
        })
      );
      expect(htmlNoUser).toBe('');
    });

    it('renders exactly 3 consolidated tabs in tab navigation and NO top-level iOS tab', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        })
      );

      // Verify exactly the 3 consolidated tabs are present
      expect(html).toContain('מדריך והנחיות');
      expect(html).toContain('פנייה, משוב והצעות לשיפור');
      expect(html).toContain('שימוש נאות ורישיון');

      // Verify NO separate top-level tab button exists for iOS shortcut
      expect(html).not.toMatch(/<button[^>]*>[^<]*<span>קיצור לאייפד \/ אייפון<\/span><\/button>/);

      // Verify tab labels are clean of technical RFE jargon
      expect(html).not.toContain('הצעות ייעול ושיפורים (RFE)');
      expect(html).not.toContain('(RFE)');
    });

    it('renders the nested iOS/iPad shortcut subsection (Chapter 15) inside the guide', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        })
      );

      // Chapter title and content verified
      expect(html).toContain('פרק 15: התקנת קיצור דרך למסך הבית באייפד ובאייפון');
      expect(html).toContain('Safari');
      expect(html).toContain('שיתוף');
      expect(html).toContain('הוספה למסך הבית');
      expect(html).toContain('אין צורך להתחבר מראש עם שם וסיסמה');
    });

    it('renders all required pedagogical guide topics from R1 (15 chapters & authentic terminology)', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        },
        {
          activeTab: 'guide',
          expandedChapters: getAllExpandedMap()
        }
      );
      const html = renderToStaticMarkup(element);

      // Guide banner and tools
      expect(html).toContain('מדריך עבודה פדגוגי מקיף למערכת TALA');
      expect(html).toContain('הרחב את כל הפרקים');
      expect(html).toContain('כווץ הכל');
      expect(html).toContain('חיפוש נושא במדריך');

      // Core pedagogical topics across all 15 chapters
      expect(html).toContain('התפיסה האקולוגית');
      expect(html).toContain('ניהול תלמידים וכרטיס תלמיד');
      expect(html).toContain('בניית תוכנית עבודה אקולוגית ויעדים פדגוגיים');
      expect(html).toContain('מעקב יומי, יומן פגישות ומשימות מותאמות מטרה');
      expect(html).toContain('סיכומי התקדמות ו-KPI מקצועיים במייל לצוות ולהורים');
      expect(html).toContain('עבודה חכמה ואחראית עם בינה מלאכותית');
      expect(html).toContain('דוחות, מסמכים רשמיים ושער &quot;קול ההורים&quot;');
      expect(html).toContain('עקרונות פדגוגיים מול תפעול המערכת');
      expect(html).toContain('הגנת פרטיות, אבטחת מידע ושימוש אחראי');
      expect(html).toContain('שאלות נפוצות ופתרון תקלות');
      expect(html).toContain('הגדרות אישיות למורה');
    });

    it('renders daily tracking, meeting logs, ministry holidays, and AI tasks documentation', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        },
        {
          activeTab: 'guide',
          expandedChapters: getAllExpandedMap()
        }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('יומן פגישות');
      expect(html).toContain('משרד החינוך');
      expect(html).toContain('Outlook');
      expect(html).toContain('Google Calendar');
      expect(html).toContain('PedagogicalTasksModal');
      expect(html).toContain('21 יום');
    });

    it('renders progress summaries and 4 KPI emails guide with staff meeting checklist', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        },
        {
          activeTab: 'guide',
          expandedChapters: getAllExpandedMap()
        }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('תלמידים במעקב');
      expect(html).toContain('תצפיות שתועדו');
      expect(html).toContain('יעדים בתנופה');
      expect(html).toContain('לרציפות');
      expect(html).toContain('צ&#x27;ק-ליסט מוכנות לישיבות צוות');
      expect(html).toContain('שלח סיכום פדגוגי כעת למייל');
    });

    it('renders pedagogical vs software distinction and the 4 mediation levels', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        },
        {
          activeTab: 'guide',
          expandedChapters: getAllExpandedMap()
        }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('הפרדה מוחלטת בין פדגוגיה לתפעול תוכנה');
      expect(html).toContain('עצמאי לחלוטין');
      expect(html).toContain('תזכורת מילולית');
      expect(html).toContain('תיווך חלקי');
      expect(html).toContain('הדגמה וליווי מלא');
    });

    it('renders unified contact tab with feedback form, suggestions form, and WhatsApp quick link', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: sampleTrialUser,
          onClose: () => {},
          onSubmitSupportMessage: () => {}
        },
        { activeTab: 'contact' }
      );

      const html = renderToStaticMarkup(element);

      // WhatsApp direct link with correctly encoded URI string
      expect(html).toContain('https://wa.me/972559236606');
      expect(html).toContain(encodeURIComponent('התנסיתי במערכת TALA'));
      expect(html).toContain(encodeURIComponent('מיכל כהן'));

      // Direct message form
      expect(html).toContain('פנייה ישירה למנהלת המערכת');
      expect(html).toContain('שליחת הודעה לזיוית');

      // Improvement suggestions form with category options
      expect(html).toContain('הצעות ייעול ושיפור למערכת');
      expect(html).toContain('קטגוריית השיפור / ההצעה:');
      expect(html).toContain('שיפור בטופס תל&quot;א / תח&quot;י');
      expect(html).toContain('מאגר מטרות ויעדים');
      expect(html).toContain('מעקב יומי ויומן פגישות');
      expect(html).toContain('כותרת קצרה להצעה:');
      expect(html).toContain('פירוט הרעיון או הצורך:');
      expect(html).toContain('שליחת הצעת שיפור');
    });

    it('renders Fair Use policy tab with quota limits and copyright terms', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        },
        { activeTab: 'fair_use' }
      );

      const html = renderToStaticMarkup(element);
      expect(html).toContain('הסכם רישיון שימוש ומדיניות &quot;שימוש נאות&quot; (Fair Use)');
      expect(html).toContain('רישיון אישי למורה / גננת (פר משתמשת)');
      expect(html).toContain('עד 35 תלמידים פעילים בשנה');
      expect(html).toContain('עד 20 שאילתות AI לתלמיד בשנה');
      expect(html).toContain('איסור הנדסה לאחור (Reverse Engineering)');
      expect(html).toContain('גב&#x27; זיוית רשף');
    });

    it('renders live chat button, survey button, and video tutorial launcher when handlers are passed', () => {
      const onOpenChat = vi.fn();
      const onOpenSurvey = vi.fn();
      const onOpenIntroVideo = vi.fn();

      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: sampleTrialUser,
          onClose: () => {},
          onOpenChat,
          onOpenSurvey,
          onOpenIntroVideo
        },
        { activeTab: 'contact' }
      );

      const html = renderToStaticMarkup(element);
      expect(html).toContain('צ&#x27;אט חי ישיר עם מנהלת המערכת');
      expect(html).toContain('שאלון משוב קצר למשתמשת');
      expect(html).toContain('סרטון הדרכה');
    });
  });

  // ==========================================================================
  // TIER 2: Boundary & Corner Cases (Validation, Trimming, Edge Roles)
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('disables direct support message submit button when text is empty or whitespace-only', () => {
      // 1. Empty message
      const { element: emptyEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'contact', supportMessage: '' }
      );
      const formsEmpty = findAllInTree(emptyEl, (n) => n.type === 'form');
      const submitBtnEmpty = findInTree(formsEmpty[0], (n) => n.type === 'button' && n.props.type === 'submit');
      expect(submitBtnEmpty.props.disabled).toBe(true);

      // 2. Whitespace-only message
      const { element: wsEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'contact', supportMessage: '   \n   \t  ' }
      );
      const formsWs = findAllInTree(wsEl, (n) => n.type === 'form');
      const submitBtnWs = findInTree(formsWs[0], (n) => n.type === 'button' && n.props.type === 'submit');
      expect(submitBtnWs.props.disabled).toBe(true);

      // 3. Valid non-empty message enables button
      const { element: validEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'contact', supportMessage: 'הודעה לבדיקה' }
      );
      const formsValid = findAllInTree(validEl, (n) => n.type === 'form');
      const submitBtnValid = findInTree(formsValid[0], (n) => n.type === 'button' && n.props.type === 'submit');
      expect(submitBtnValid.props.disabled).toBe(false);
    });

    it('disables improvement suggestion submit button when message is empty or whitespace-only', () => {
      // 1. Empty suggestion message
      const { element: emptyEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'contact', rfeMessage: '' }
      );
      const formsEmpty = findAllInTree(emptyEl, (n) => n.type === 'form');
      const suggestionFormEmpty = formsEmpty[1];
      const submitBtnEmpty = findInTree(suggestionFormEmpty, (n) => n.type === 'button' && n.props.type === 'submit');
      expect(submitBtnEmpty.props.disabled).toBe(true);

      // 2. Whitespace-only suggestion message
      const { element: wsEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'contact', rfeMessage: '     \n  ' }
      );
      const formsWs = findAllInTree(wsEl, (n) => n.type === 'form');
      const suggestionFormWs = formsWs[1];
      const submitBtnWs = findInTree(suggestionFormWs, (n) => n.type === 'button' && n.props.type === 'submit');
      expect(submitBtnWs.props.disabled).toBe(true);

      // 3. Valid non-empty message enables button
      const { element: validEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'contact', rfeMessage: 'הצעת ייעול חשובה' }
      );
      const formsValid = findAllInTree(validEl, (n) => n.type === 'form');
      const suggestionFormValid = formsValid[1];
      const submitBtnValid = findInTree(suggestionFormValid, (n) => n.type === 'button' && n.props.type === 'submit');
      expect(submitBtnValid.props.disabled).toBe(false);
    });

    it('applies title fallback and trims whitespace when submitting suggestion with blank title', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          rfeTitle: '   ',
          rfeCategory: 'מאגר מטרות ויעדים',
          rfeMessage: '   תוספת מטרות תקשורת תומכת וחליפית (תת"ח)   '
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      suggestionForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      // Title fallback
      expect(payload.topic).toContain('ללא כותרת');
      expect(payload.notes).toContain('נושא: כללי');

      // Message trimming
      expect(payload.notes).toContain('תוספת מטרות תקשורת תומכת וחליפית (תת"ח)');
      expect(payload.notes).not.toMatch(/^\s+תוספת/);
    });

    it('renders role variant: non-trial (paid) user with standard title and subtitle', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {}
        })
      );

      expect(html).toContain('מרכז עזרה, מדריכים ותמיכה – מערכת TALA');
      expect(html).toContain('מדריך שימוש מקיף');
      expect(html).toContain('הצעות שיפור');
      expect(html).toContain('תנאי שימוש נאות');
      expect(html).not.toContain('תקופת הניסיון הסתיימה');
    });

    it('renders role variant: active trial user with remaining days countdown badge', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTrialUser,
          remainingDays: 14,
          isExpired: false,
          onClose: () => {}
        })
      );

      expect(html).toContain('מרכז עזרה והסדרת מנוי שנתי – מערכת TALA');
      expect(html).toContain('חשבון התנסות פעיל ב-TALA');
      expect(html).toContain('נותרו 14 ימים לתקופת הניסיון');
    });

    it('renders role variant: expired user with lock badge, warning border, and logout button', () => {
      const onLogout = vi.fn();
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleExpiredUser,
          remainingDays: 0,
          isExpired: true,
          onClose: () => {},
          onLogout
        })
      );

      expect(html).toContain('תקופת הניסיון הסתיימה – הסדרת מנוי שנתי ל-TALA');
      expect(html).toContain('border:1.5px solid #ef4444');
      expect(html).toContain('התנתקות');
      expect(html).toContain('lucide-lock');
    });

    it('handles remainingDays boundary conditions: 0 days, negative days, null days gracefully', () => {
      // 0 days
      const htmlZero = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTrialUser,
          remainingDays: 0,
          onClose: () => {}
        })
      );
      expect(htmlZero).toContain('נותרו 0 ימים לתקופת הניסיון');

      // Negative days
      const htmlNeg = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTrialUser,
          remainingDays: -3,
          onClose: () => {}
        })
      );
      expect(htmlNeg).toBeDefined();

      // Null days
      const htmlNull = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: samplePaidUser,
          remainingDays: null,
          paidRemainingDays: null,
          onClose: () => {}
        })
      );
      expect(htmlNull).toBeDefined();
    });

    it('guards modal backdrop click: triggers onClose for active modal, blocks for expired modal', () => {
      const onClose = vi.fn();

      // 1. Active modal backdrop
      const { element: activeEl } = renderWithHarness({
        isOpen: true,
        currentUser: samplePaidUser,
        isExpired: false,
        onClose
      });
      expect(activeEl.props.onClick).toBe(onClose);

      // 2. Expired modal backdrop
      const { element: expiredEl } = renderWithHarness({
        isOpen: true,
        currentUser: sampleExpiredUser,
        isExpired: true,
        onClose
      });
      expect(expiredEl.props.onClick).toBeUndefined();
    });

    it('stops click propagation on modal container to prevent accidental dismiss', () => {
      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: samplePaidUser,
        onClose: () => {}
      });

      const container = element.props.children;
      const stopPropSpy = vi.fn();
      container.props.onClick({ stopPropagation: stopPropSpy });
      expect(stopPropSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // TIER 3: Interactions & Zero RFE Enforcement (Submissions & Terminology)
  // ==========================================================================
  describe('Tier 3: Interactions & Zero RFE Enforcement', () => {
    it('submitting direct support message calls onSubmitSupportMessage with correct topic and notes for paid user', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: 'שאלה לגבי סנכרון חופשות משרד החינוך'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      directForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      expect(payload.topic).toContain('פנייה ממשתמש/ת מנוי');
      expect(payload.notes).toContain('שאלה לגבי סנכרון חופשות משרד החינוך');
      expect(payload.notes).toContain('וואטסאפ ישיר לזיוית');
      expect(payload.name).toBe('זיוית רשף');
      expect(payload.email).toBe('zivit@tala.edu.il');
    });

    it('submitting direct support message calls onSubmitSupportMessage with trial topic for active trial user', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: sampleTrialUser,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: 'בירור לגבי הסדרת מנוי שנתי'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      directForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      expect(payload.topic).toContain('פנייה ממשתמש/ת ניסיון (הסדרת מנוי / תמיכה)');
      expect(payload.notes).toContain('בירור לגבי הסדרת מנוי שנתי');
      expect(payload.name).toBe('מיכל כהן');
      expect(payload.email).toBe('michal@school.il');
    });

    it('submitting direct support message calls onSubmitSupportMessage with expired topic for expired user', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: sampleExpiredUser,
          isExpired: true,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: 'פג תוקף, רוצה לחדש מנוי'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      directForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      expect(payload.topic).toContain('פנייה ממשתמש/ת ניסיון שפג תוקפו (הסדרת מנוי)');
      expect(payload.notes).toContain('פג תוקף, רוצה לחדש מנוי');
      expect(payload.name).toBe('רונית לוי');
    });

    it('submitting improvement suggestion calls onSubmitSupportMessage with category, title, and ZERO RFE tags', () => {
      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: sampleTrialUser,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          rfeCategory: 'מעקב יומי ויומן פגישות',
          rfeTitle: 'אפשרות לייצוא אירועי יומן לפורמט Excel',
          rfeMessage: 'יהיה נוח מאוד לייצא את יומן הפגישות לטבלת אקסל חודשית.'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      suggestionForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];

      // Verifies topic is formatted in clean Hebrew
      expect(payload.topic).toBe('💡 הצעת ייעול ובקשה לשיפור: מעקב יומי ויומן פגישות - אפשרות לייצוא אירועי יומן לפורמט Excel');
      // STRICT: payload topic must NOT contain (Minor RFE) or (RFE)
      expect(payload.topic).not.toContain('(Minor RFE)');
      expect(payload.topic).not.toContain('(RFE)');

      // Verifies notes body is formatted in clean Hebrew
      expect(payload.notes).toContain('[בקשת שיפור והצעת ייעול ממשתמש/ת מיכל כהן (michal@school.il)]:');
      expect(payload.notes).toContain('קטגוריה: מעקב יומי ויומן פגישות');
      expect(payload.notes).toContain('נושא: אפשרות לייצוא אירועי יומן לפורמט Excel');
      expect(payload.notes).toContain('יהיה נוח מאוד לייצא את יומן הפגישות לטבלת אקסל חודשית.');
      // STRICT: payload notes must NOT contain RFE
      expect(payload.notes).not.toContain('RFE');
    });

    it('strictly enforces ZERO occurrences of (RFE) or Request for Enhancement in static markup across all tabs', () => {
      // 1. Tab 1: Guide tab markup
      const { element: guideEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'guide', expandedChapters: getAllExpandedMap() }
      );
      const guideHtml = renderToStaticMarkup(guideEl);
      expect(guideHtml.match(/\(RFE\)/i)).toBeNull();
      expect(guideHtml.match(/Request for Enhancement/i)).toBeNull();

      // 2. Tab 2: Contact & Feedback tab markup
      const { element: contactEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'contact' }
      );
      const contactHtml = renderToStaticMarkup(contactEl);
      expect(contactHtml.match(/\(RFE\)/i)).toBeNull();
      expect(contactHtml.match(/Request for Enhancement/i)).toBeNull();

      // 3. Tab 3: Fair Use tab markup
      const { element: fairUseEl } = renderWithHarness(
        { isOpen: true, currentUser: samplePaidUser, onClose: () => {} },
        { activeTab: 'fair_use' }
      );
      const fairUseHtml = renderToStaticMarkup(fairUseEl);
      expect(fairUseHtml.match(/\(RFE\)/i)).toBeNull();
      expect(fairUseHtml.match(/Request for Enhancement/i)).toBeNull();

      // 4. Expired User view markup
      const { element: expiredEl } = renderWithHarness(
        { isOpen: true, currentUser: sampleExpiredUser, isExpired: true, onClose: () => {} },
        { activeTab: 'contact' }
      );
      const expiredHtml = renderToStaticMarkup(expiredEl);
      expect(expiredHtml.match(/\(RFE\)/i)).toBeNull();
      expect(expiredHtml.match(/Request for Enhancement/i)).toBeNull();
    });

    it('invokes onOpenSurvey callback when clicking survey launcher button', () => {
      const onOpenSurvey = vi.fn();
      const onClose = vi.fn();

      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose,
          onOpenSurvey
        },
        { activeTab: 'contact' }
      );

      const surveyBtn = findInTree(
        element,
        (n) => n.type === 'button' && n.props.children?.some?.((c) => c?.props?.children === 'פתיחת שאלון המשוב')
      );
      expect(surveyBtn).toBeDefined();

      surveyBtn.props.onClick();
      expect(onClose).toHaveBeenCalled();
      expect(onOpenSurvey).toHaveBeenCalledTimes(1);
    });

    it('invokes onOpenChat callback when clicking live chat launcher button', () => {
      const onOpenChat = vi.fn();

      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: samplePaidUser,
          onClose: () => {},
          onOpenChat
        },
        { activeTab: 'contact' }
      );

      const chatBtn = findInTree(
        element,
        (n) => n.type === 'button' && n.props.className === 'btn-primary-sm'
      );
      expect(chatBtn).toBeDefined();

      chatBtn.props.onClick();
      expect(onOpenChat).toHaveBeenCalledTimes(1);
    });

    it('invokes onClose callback when clicking the header close button', () => {
      const onClose = vi.fn();

      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: samplePaidUser,
        onClose
      });

      const closeBtn = findInTree(
        element,
        (n) => n.type === 'button' && n.props.title === 'סגור חלון'
      );
      expect(closeBtn).toBeDefined();

      closeBtn.props.onClick();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('invokes onLogout callback when clicking the logout button on expired modal', () => {
      const onLogout = vi.fn();

      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: sampleExpiredUser,
        isExpired: true,
        onClose: () => {},
        onLogout
      });

      const logoutBtn = findInTree(
        element,
        (n) => n.type === 'button' && n.props.onClick === onLogout
      );
      expect(logoutBtn).toBeDefined();

      logoutBtn.props.onClick();
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // TIER 4: Real-World Scenarios (Layout Stability & Teacher Workflows)
  // ==========================================================================
  describe('Tier 4: Real-World Application Scenarios', () => {
    it('enforces stable bounded modal sizing and internal scrolling styles across all tabs (R3)', () => {
      const tabs = ['guide', 'contact', 'fair_use'];

      for (const tab of tabs) {
        const { element } = renderWithHarness(
          {
            isOpen: true,
            currentUser: samplePaidUser,
            onClose: () => {}
          },
          { activeTab: tab }
        );

        const container = element.props.children;
        const containerStyle = container.props.style;

        // Requirement R3: Outer container sizing stability
        expect(containerStyle.maxWidth).toBe('860px');
        expect(containerStyle.width).toBe('min(860px, 95vw)');
        expect(containerStyle.height).toBe('min(780px, 90vh)');
        expect(containerStyle.minHeight).toBe('560px');
        expect(containerStyle.maxHeight).toBe('90vh');
        expect(containerStyle.display).toBe('flex');
        expect(containerStyle.flexDirection).toBe('column');
        expect(containerStyle.overflow).toBe('hidden');

        // Modal body must scroll internally and expand flexibly
        const modalBody = findInTree(container, (n) => n.props?.className === 'modal-body');
        expect(modalBody).toBeDefined();
        const bodyStyle = modalBody.props.style;
        expect(bodyStyle.flex).toBe('1 1 auto');
        expect(bodyStyle.overflowY).toBe('auto');
        expect(bodyStyle.minHeight).toBe(0);
        expect(bodyStyle.scrollbarGutter).toBe('stable');

        // Pinned header and footer must have flexShrink: 0
        const header = findInTree(container, (n) => n.props?.className === 'modal-header');
        expect(header.props.style.flexShrink).toBe(0);

        const footer = findInTree(container, (n) => n.props?.className === 'modal-footer');
        expect(footer.props.style.flexShrink).toBe(0);
      }
    });

    it('simulates end-to-end teacher workflow: opening help, browsing guide, navigating to feedback, submitting suggestion', () => {
      const onSubmitSupportMessage = vi.fn();
      const teacher = {
        name: 'שירה אלון',
        email: 'shira.teacher@gan-shiluv.k12.il',
        role: 'teacher',
        isTrialUser: false
      };

      // Step 1: Teacher opens help modal (default tab is 'guide')
      const step1 = renderWithHarness(
        {
          isOpen: true,
          currentUser: teacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        { activeTab: 'guide', expandedChapters: getAllExpandedMap() }
      );
      const step1Html = renderToStaticMarkup(step1.element);
      expect(step1Html).toContain('מדריך עבודה פדגוגי מקיף למערכת TALA');
      expect(step1Html).toContain('מעקב יומי, יומן פגישות ומשימות מותאמות מטרה');

      // Step 2: Teacher clicks tab button to navigate to 'contact'
      const tabButtons = findAllInTree(step1.element, (n) => n.type === 'button' && n.props?.onClick);
      const contactTabBtn = tabButtons.find((btn) =>
        btn.props.children?.some?.((c) => c?.props?.children === 'פנייה, משוב והצעות לשיפור')
      );
      expect(contactTabBtn).toBeDefined();

      // Step 3: Teacher is now on 'contact' tab
      const step3 = renderWithHarness(
        {
          isOpen: true,
          currentUser: teacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          rfeCategory: 'מעקב יומי ויומן פגישות',
          rfeTitle: 'הוספת תזכורת לפערי תצפית מעל 14 יום',
          rfeMessage: 'בכיתת שילוב עם מספר רב של תלמידים, תזכורת כבר אחרי 14 יום תסייע לנו מאוד לשמור על רצף טיפולי.'
        }
      );
      const step3Html = renderToStaticMarkup(step3.element);
      expect(step3Html).toContain('הצעות ייעול ושיפור למערכת');

      // Step 4: Teacher submits the suggestion form
      const forms = findAllInTree(step3.element, (n) => n.type === 'form');
      const suggestionForm = forms[1];
      suggestionForm.props.onSubmit({ preventDefault: () => {} });

      // Step 5: Verify submitted payload and zero RFE terminology
      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const submittedPayload = onSubmitSupportMessage.mock.calls[0][0];

      expect(submittedPayload.topic).toBe(
        '💡 הצעת ייעול ובקשה לשיפור: מעקב יומי ויומן פגישות - הוספת תזכורת לפערי תצפית מעל 14 יום'
      );
      expect(submittedPayload.topic).not.toContain('RFE');
      expect(submittedPayload.notes).toContain('שירה אלון');
      expect(submittedPayload.notes).toContain('shira.teacher@gan-shiluv.k12.il');
      expect(submittedPayload.notes).toContain('בכיתת שילוב עם מספר רב של תלמידים');
      expect(submittedPayload.notes).not.toContain('RFE');
      expect(submittedPayload.name).toBe('שירה אלון');
      expect(submittedPayload.email).toBe('shira.teacher@gan-shiluv.k12.il');
    });
  });
});
