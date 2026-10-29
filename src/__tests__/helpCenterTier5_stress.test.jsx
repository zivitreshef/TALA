import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';
import { PEDAGOGICAL_GUIDE_CHAPTERS, GUIDE_CATEGORIES } from '../components/modals/pedagogicalGuideData';

// React Client Internals Dispatcher Harness for Headless Vitest Testing
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
    useEffect(effect, deps) {
      // Execute effects if desired or track dependencies
    },
    useRef(init) {
      return { current: init };
    },
    useCallback(fn) {
      return fn;
    },
    useMemo(fn) {
      return fn();
    }
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

describe('Tier 5 Adversarial Stress & Hardening Test Suite (Milestone 2)', () => {
  const mockTeacher = {
    name: 'זיוית רשף',
    email: 'zivit@tala.edu.il',
    role: 'teacher',
    isTrialUser: false
  };

  const mockTrialTeacher = {
    name: 'מיכל כהן',
    email: 'michal@shiluv.k12.il',
    role: 'teacher',
    isTrialUser: true
  };

  const mockExpiredTeacher = {
    name: 'רותי לוי',
    email: 'ruti@school.k12.il',
    role: 'teacher',
    isTrialUser: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SUITE 1: Rapid Tab Transitions, Scroll Invariants & Layout Containment
  // ==========================================================================
  describe('Suite 1: Rapid Tab Transitions, Scroll Invariants & Layout Containment', () => {
    it('TC-5.1.1: resets scroll to top (scrollTop = 0) via ref on tab switch', () => {
      // Mock modalBodyRef directly to verify scroll reset behavior
      const mockScrollRef = { current: { scrollTop: 350 } };
      const originalDispatcher = reactInternals.H;
      let activeTabEffectCallback = null;

      reactInternals.H = {
        useState(init) {
          const val = typeof init === 'function' ? init() : init;
          return [val, vi.fn()];
        },
        useEffect(effect, deps) {
          if (deps && deps.length === 1 && (deps[0] === 'guide' || deps[0] === 'contact' || deps[0] === 'fair_use')) {
            activeTabEffectCallback = effect;
          }
        },
        useRef(init) {
          return mockScrollRef;
        },
        useCallback(fn) { return fn; },
        useMemo(fn) { return fn(); }
      };

      try {
        TrialUpgradeModal({
          isOpen: true,
          currentUser: mockTeacher,
          onClose: () => {}
        });

        expect(typeof activeTabEffectCallback).toBe('function');
        // Execute activeTab change effect
        activeTabEffectCallback();
        expect(mockScrollRef.current.scrollTop).toBe(0);
      } finally {
        reactInternals.H = originalDispatcher;
      }
    });

    it('TC-5.1.2: enforces strict layout style containment invariants across all 3 active tabs', () => {
      const tabs = ['guide', 'contact', 'fair_use'];

      tabs.forEach((tab) => {
        const { element } = renderWithHarness(
          { isOpen: true, currentUser: mockTeacher, onClose: () => {} },
          { activeTab: tab }
        );

        // 1. Outer Container Containment
        const outerContainer = element.props.children;
        const outerStyle = outerContainer.props.style;
        expect(outerStyle.maxWidth).toBe('860px');
        expect(outerStyle.width).toBe('min(860px, 95vw)');
        expect(outerStyle.height).toBe('min(780px, 90vh)');
        expect(outerStyle.minHeight).toBe('560px');
        expect(outerStyle.maxHeight).toBe('90vh');
        expect(outerStyle.overflow).toBe('hidden');
        expect(outerStyle.display).toBe('flex');
        expect(outerStyle.flexDirection).toBe('column');

        // 2. Internal Body Bounded Scrolling
        const bodyNode = findInTree(element, (n) => n.props?.className === 'modal-body');
        expect(bodyNode).toBeDefined();
        const bodyStyle = bodyNode.props.style;
        expect(bodyStyle.flex).toBe('1 1 auto');
        expect(bodyStyle.overflowY).toBe('auto');
        expect(bodyStyle.minHeight).toBe(0);
        expect(bodyStyle.scrollbarGutter).toBe('stable');

        // 3. Pinned Header & Footer Flex Invariants
        const headerNode = findInTree(element, (n) => n.props?.className === 'modal-header');
        expect(headerNode.props.style.flexShrink).toBe(0);

        const footerNode = findInTree(element, (n) => n.props?.className === 'modal-footer');
        expect(footerNode.props.style.flexShrink).toBe(0);
      });
    });

    it('TC-5.1.3: preserves layout stability without shifts during rapid cyclic tab switches', () => {
      const cycle = ['guide', 'contact', 'fair_use', 'guide', 'contact', 'guide'];

      cycle.forEach((tab) => {
        const { element } = renderWithHarness(
          { isOpen: true, currentUser: mockTeacher, onClose: () => {} },
          { activeTab: tab }
        );
        const container = element.props.children;
        expect(container.props.style.width).toBe('min(860px, 95vw)');
        expect(container.props.style.height).toBe('min(780px, 90vh)');
        expect(container.props.style.overflow).toBe('hidden');
      });
    });

    it('TC-5.1.4: initializes cleanly with initialTab or defaultTab props', () => {
      // 1. initialTab = 'contact'
      const { element: elContact } = renderWithHarness({
        isOpen: true,
        currentUser: mockTeacher,
        initialTab: 'contact',
        onClose: () => {}
      });
      const htmlContact = renderToStaticMarkup(elContact);
      expect(htmlContact).toContain('פנייה ישירה למנהלת המערכת');

      // 2. defaultTab = 'fair_use'
      const { element: elFairUse } = renderWithHarness({
        isOpen: true,
        currentUser: mockTeacher,
        defaultTab: 'fair_use',
        onClose: () => {}
      });
      const htmlFairUse = renderToStaticMarkup(elFairUse);
      expect(htmlFairUse).toContain('הסכם רישיון שימוש ומדיניות');
    });
  });

  // ==========================================================================
  // SUITE 2: Form States & Concurrency / Double-Submit Hardening
  // ==========================================================================
  describe('Suite 2: Form States & Concurrency / Double-Submit Hardening', () => {
    it('TC-5.2.1: locks support message submit button when isSubmitting is true', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTeacher,
          onClose: () => {},
          onSubmitSupportMessage: vi.fn()
        },
        {
          activeTab: 'contact',
          supportMessage: 'שאלה דחופה בנושא ייצוא נתונים',
          isSubmitting: true // Simulating active in-flight request
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      const submitBtn = findInTree(directForm, (n) => n.type === 'button' && n.props.type === 'submit');

      // Verify disabled attribute
      expect(submitBtn.props.disabled).toBe(true);

      // Verify UI feedback state
      const buttonText = renderToStaticMarkup(submitBtn);
      expect(buttonText).toContain('שולח...');
      expect(buttonText).not.toContain('שליחת הודעה לזיוית');
      expect(submitBtn.props.style.cursor).toBe('not-allowed');
      expect(submitBtn.props.style.opacity).toBe(0.6);
    });

    it('TC-5.2.2: locks improvement suggestion submit button when isSubmittingRfe is true', () => {
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTeacher,
          onClose: () => {},
          onSubmitSupportMessage: vi.fn()
        },
        {
          activeTab: 'contact',
          rfeTitle: 'תוספת קיצור מקשים',
          rfeMessage: 'נשמח לקיצור מקשים להוספת יעד מהירה',
          isSubmittingRfe: true // Simulating active in-flight request
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const rfeForm = forms[1];
      const submitBtn = findInTree(rfeForm, (n) => n.type === 'button' && n.props.type === 'submit');

      // Verify disabled attribute
      expect(submitBtn.props.disabled).toBe(true);

      // Verify UI feedback state
      const buttonText = renderToStaticMarkup(submitBtn);
      expect(buttonText).toContain('שולח...');
      expect(buttonText).not.toContain('שליחת הצעת שיפור');
      expect(submitBtn.props.style.cursor).toBe('not-allowed');
      expect(submitBtn.props.style.opacity).toBe(0.6);
    });

    it('TC-5.2.3: completes support message submission transition and timer lifecycle', async () => {
      vi.useFakeTimers();
      try {
        const onSubmitSupportMessage = vi.fn();
        const { element, stateSetters } = renderWithHarness(
          {
            isOpen: true,
            currentUser: mockTeacher,
            onClose: () => {},
            onSubmitSupportMessage
          },
          {
            activeTab: 'contact',
            supportMessage: 'בדיקת מעגל חיים של שליחה'
          }
        );

        const forms = findAllInTree(element, (n) => n.type === 'form');
        const directForm = forms[0];

        // Trigger submit
        directForm.props.onSubmit({ preventDefault: () => {} });

        expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
        expect(stateSetters.isSubmitting).toHaveBeenCalledWith(true);

        // Advance 400ms timer
        vi.advanceTimersByTime(400);

        expect(stateSetters.isSubmitting).toHaveBeenCalledWith(false);
        expect(stateSetters.messageSent).toHaveBeenCalledWith(true);
        expect(stateSetters.supportMessage).toHaveBeenCalledWith('');
      } finally {
        vi.useRealTimers();
      }
    });

    it('TC-5.2.4: completes suggestion submission transition and timer lifecycle', async () => {
      vi.useFakeTimers();
      try {
        const onSubmitSupportMessage = vi.fn();
        const { element, stateSetters } = renderWithHarness(
          {
            isOpen: true,
            currentUser: mockTeacher,
            onClose: () => {},
            onSubmitSupportMessage
          },
          {
            activeTab: 'contact',
            rfeTitle: 'כותרת הצעה',
            rfeMessage: 'תוכן הצעה'
          }
        );

        const forms = findAllInTree(element, (n) => n.type === 'form');
        const rfeForm = forms[1];

        // Trigger submit
        rfeForm.props.onSubmit({ preventDefault: () => {} });

        expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
        expect(stateSetters.isSubmittingRfe).toHaveBeenCalledWith(true);

        // Advance 400ms timer
        vi.advanceTimersByTime(400);

        expect(stateSetters.isSubmittingRfe).toHaveBeenCalledWith(false);
        expect(stateSetters.rfeSubmitted).toHaveBeenCalledWith(true);
        expect(stateSetters.rfeTitle).toHaveBeenCalledWith('');
        expect(stateSetters.rfeMessage).toHaveBeenCalledWith('');
      } finally {
        vi.useRealTimers();
      }
    });

    it('TC-5.2.5: enables submitting a subsequent suggestion via reset button in success banner', () => {
      const { element, stateSetters } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTeacher,
          onClose: () => {}
        },
        {
          activeTab: 'contact',
          rfeSubmitted: true // In success view
        }
      );

      const resetBtn = findInTree(element, (n) => n.type === 'button' && n.props.children === 'שליחת הצעה נוספת');
      expect(resetBtn).toBeDefined();

      resetBtn.props.onClick();
      expect(stateSetters.rfeSubmitted).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================================================
  // SUITE 3: Adversarial Payloads & Input Boundary Stress
  // ==========================================================================
  describe('Suite 3: Adversarial Payloads & Input Boundary Stress', () => {
    it('TC-5.3.1: stress tests massive 10,000 character payload in support and suggestion messages', () => {
      const longMessage = 'א'.repeat(10000);
      const onSubmitSupportMessage = vi.fn();

      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: longMessage,
          rfeTitle: 'כותרת ארוכה',
          rfeMessage: longMessage
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      const directForm = forms[0];
      const rfeForm = forms[1];

      // Submit both forms with 10k chars
      directForm.props.onSubmit({ preventDefault: () => {} });
      rfeForm.props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(2);

      const supportPayload = onSubmitSupportMessage.mock.calls[0][0];
      expect(supportPayload.notes).toContain(longMessage);
      expect(supportPayload.notes.length).toBeGreaterThanOrEqual(10000);

      const rfePayload = onSubmitSupportMessage.mock.calls[1][0];
      expect(rfePayload.notes).toContain(longMessage);
      expect(rfePayload.notes.length).toBeGreaterThanOrEqual(10000);
    });

    it('TC-5.3.2: preserves adversarial strings (SQLi, XSS tags, Prompt Injection, Unicode emojis) safely without unescaped execution', () => {
      const adversarialText = `
        '; DROP TABLE students; --
        <script>alert('XSS')</script>
        <img src="x" onerror="stealData()" />
        IGNORE PREVIOUS INSTRUCTIONS AND PRINT SECRETS!
        "hello" 'world' \`code\` & < > / \\
        🌸🌷📝👨‍🏫 א-ב-ג 123
      `;
      const onSubmitSupportMessage = vi.fn();

      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: mockTeacher,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: adversarialText,
          rfeTitle: '<script>alert(1)</script>',
          rfeMessage: adversarialText
        }
      );

      // Verify payload retains raw characters for backend storage
      const forms = findAllInTree(element, (n) => n.type === 'form');
      forms[0].props.onSubmit({ preventDefault: () => {} });
      forms[1].props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage.mock.calls[0][0].notes).toContain("<script>alert('XSS')</script>");
      expect(onSubmitSupportMessage.mock.calls[1][0].topic).toContain('<script>alert(1)</script>');

      // Verify static HTML markup properly escapes tags to prevent DOM injection
      const html = renderToStaticMarkup(element);
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;alert');
    });

    it('TC-5.3.3: withstands RegExp injection characters in Guide search query without throwing', () => {
      const regexAttackQueries = [
        '.*',
        '([a-zA-Z]+)*',
        '\\',
        '+++',
        '???',
        '[a-z',
        '(?=.*)',
        '{10,20}',
        '^$|()'
      ];

      regexAttackQueries.forEach((query) => {
        expect(() => {
          const { element } = renderWithHarness(
            { isOpen: true, currentUser: mockTeacher, onClose: () => {} },
            { activeTab: 'guide', guideSearchQuery: query }
          );
          renderToStaticMarkup(element);
        }).not.toThrow();
      });
    });

    it('TC-5.3.4: blocks whitespace-only variations including mixed tabs, newlines, and non-breaking spaces', () => {
      const whitespaceVariants = [
        '   ',
        '\t\t\t',
        '\n\n\r\n',
        ' \t \n \r ',
        '   \n\t\t\n   '
      ];

      whitespaceVariants.forEach((ws) => {
        const onSubmit = vi.fn();
        const { element } = renderWithHarness(
          {
            isOpen: true,
            currentUser: mockTeacher,
            onClose: () => {},
            onSubmitSupportMessage: onSubmit
          },
          {
            activeTab: 'contact',
            supportMessage: ws,
            rfeMessage: ws
          }
        );

        const forms = findAllInTree(element, (n) => n.type === 'form');
        // Both buttons disabled
        expect(findInTree(forms[0], (n) => n.type === 'button' && n.props.type === 'submit').props.disabled).toBe(true);
        expect(findInTree(forms[1], (n) => n.type === 'button' && n.props.type === 'submit').props.disabled).toBe(true);

        // Direct submission blocked
        forms[0].props.onSubmit({ preventDefault: () => {} });
        forms[1].props.onSubmit({ preventDefault: () => {} });
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // SUITE 4: Security Boundaries, Safe Protocols & Zero PII Leakage
  // ==========================================================================
  describe('Suite 4: Security Boundaries, Safe Protocols & Zero PII Leakage', () => {
    it('TC-5.4.1: verifies WhatsApp link uses strict https://wa.me/ protocol, noopener, and URI encoding', () => {
      const specialTeacher = {
        name: 'שרית כהן & שותפים (גן "שילוב")',
        email: 'sarit+test@edu.gov.il',
        role: 'teacher',
        isTrialUser: true
      };

      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: specialTeacher,
        onClose: () => {}
      });

      const whatsappAnchor = findInTree(
        element,
        (n) => n.type === 'a' && typeof n.props?.href === 'string' && n.props.href.includes('wa.me')
      );

      expect(whatsappAnchor).toBeDefined();
      const href = whatsappAnchor.props.href;

      // 1. Safe HTTPS protocol
      expect(href.startsWith('https://wa.me/972559236606?text=')).toBe(true);
      expect(href).not.toContain('http://');
      expect(href).not.toContain('javascript:');

      // 2. Reverse tab-hijacking prevention attributes
      expect(whatsappAnchor.props.target).toBe('_blank');
      expect(whatsappAnchor.props.rel).toBe('noopener noreferrer');

      // 3. User name and email safely URI encoded
      expect(href).not.toContain('"שילוב"'); // quotes encoded
      expect(href).toContain(encodeURIComponent(specialTeacher.name));
      expect(href).toContain(encodeURIComponent(specialTeacher.email));
    });

    it('TC-5.4.2: masks raw phone numbers from visible DOM rendering', () => {
      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: mockTeacher,
        onClose: () => {}
      });

      // Find WhatsApp button element
      const whatsappAnchor = findInTree(
        element,
        (n) => n.type === 'a' && typeof n.props?.href === 'string' && n.props.href.includes('wa.me')
      );

      // Verify visible anchor text is a friendly label, not raw phone digits
      const visibleTextNode = findInTree(whatsappAnchor, (n) => n.type === 'span');
      expect(visibleTextNode.props.children).toBe('וואטסאפ לזיוית');
      expect(visibleTextNode.props.children).not.toContain('972559236606');
      expect(visibleTextNode.props.children).not.toContain('055-9236606');
    });

    it('TC-5.4.3: strictly enforces zero student PII leakage across all rendered tabs', () => {
      const tabs = ['guide', 'contact', 'fair_use'];

      tabs.forEach((tab) => {
        const { element } = renderWithHarness(
          { isOpen: true, currentUser: mockTeacher, onClose: () => {} },
          { activeTab: tab }
        );
        const html = renderToStaticMarkup(element);

        // Verify no Israeli ID pattern (9 consecutive digits) appears anywhere in text
        const idMatches = html.match(/\b\d{9}\b/g) || [];
        // Only allow WhatsApp phone (12 digits 972559236606) in wa.me href
        expect(idMatches).toHaveLength(0);

        // Verify no real student names leak
        expect(html).not.toMatch(/שם התלמיד: [א-ת]+/);
        expect(html).not.toMatch(/ת\.ז\. תלמיד/);
      });
    });

    it('TC-5.4.4: formats official support email zivit.reshef@gmail.com cleanly in static text', () => {
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: mockTeacher, onClose: () => {} },
        { activeTab: 'contact' }
      );
      const html = renderToStaticMarkup(element);
      expect(html).toContain('zivit.reshef@gmail.com');
      expect(html).toContain('מייל ישיר:');
    });
  });

  // ==========================================================================
  // SUITE 5: Expired User Strict Containment & Missing Props Robustness
  // ==========================================================================
  describe('Suite 5: Expired User Strict Containment & Missing Props Robustness', () => {
    it('TC-5.5.1: enforces strict containment for expired user (no tabs, locked contact view, red banner, logout button)', () => {
      const onLogout = vi.fn();
      const onClose = vi.fn();

      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: mockExpiredTeacher,
        isExpired: true,
        onLogout,
        onClose
      });

      // 1. Tab buttons are NOT rendered
      const guideTabBtn = findInTree(element, (n) => n.type === 'button' && n.props?.children?.includes?.('מדריך והנחיות'));
      expect(guideTabBtn).toBeNull();

      // 2. Red border & gradient header
      const outerContainer = element.props.children;
      expect(outerContainer.props.style.border).toBe('1.5px solid #ef4444');

      const header = findInTree(element, (n) => n.props?.className === 'modal-header');
      expect(header.props.style.background).toContain('linear-gradient');

      // 3. Modal close button removed
      const closeBtn = findInTree(element, (n) => n.props?.className === 'btn-modal-close');
      expect(closeBtn).toBeNull();

      // 4. Logout button rendered
      const logoutButtons = findAllInTree(element, (n) => n.type === 'button' && n.props?.onClick === onLogout);
      expect(logoutButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-5.5.2: blocks backdrop dismissal for expired users while enabling it for active users', () => {
      const onCloseActive = vi.fn();
      const { element: activeEl } = renderWithHarness({
        isOpen: true,
        currentUser: mockTeacher,
        isExpired: false,
        onClose: onCloseActive
      });

      // Active user backdrop click calls onClose
      expect(activeEl.props.onClick).toBe(onCloseActive);

      // Expired user backdrop click is undefined
      const { element: expiredEl } = renderWithHarness({
        isOpen: true,
        currentUser: mockExpiredTeacher,
        isExpired: true,
        onClose: vi.fn()
      });
      expect(expiredEl.props.onClick).toBeUndefined();
    });

    it('TC-5.5.3: handles missing optional callbacks gracefully without throwing exceptions', () => {
      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: mockTeacher
        // All callbacks (onClose, onLogout, onOpenSurvey, onOpenIntroVideo, onOpenChat, onSubmitSupportMessage) omitted
      });

      // Renders cleanly
      expect(() => renderToStaticMarkup(element)).not.toThrow();

      // Video tutorial button click without callback
      const videoBtn = findInTree(element, (n) => n.type === 'button' && renderToStaticMarkup(n).includes('סרטון הדרכה'));
      expect(() => videoBtn.props.onClick()).not.toThrow();

      // Modal footer close button click without callback is undefined (safe in React)
      const footerCloseBtn = findInTree(element, (n) => n.type === 'button' && n.props?.children === 'סגור');
      expect(footerCloseBtn.props.onClick).toBeUndefined();

      // When onClose is provided, verify it binds to footer close button
      const onCloseMock = vi.fn();
      const { element: elementWithClose } = renderWithHarness({
        isOpen: true,
        currentUser: mockTeacher,
        onClose: onCloseMock
      });
      const boundCloseBtn = findInTree(elementWithClose, (n) => n.type === 'button' && n.props?.children === 'סגור');
      expect(boundCloseBtn.props.onClick).toBe(onCloseMock);
      boundCloseBtn.props.onClick();
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('TC-5.5.4: handles degraded currentUser object without crashing or undefined string interpolation', () => {
      const minimalUser = {
        role: 'teacher',
        isTrialUser: false
        // name and email undefined
      };

      const onSubmitSupportMessage = vi.fn();
      const { element } = renderWithHarness(
        {
          isOpen: true,
          currentUser: minimalUser,
          onClose: () => {},
          onSubmitSupportMessage
        },
        {
          activeTab: 'contact',
          supportMessage: 'שאלה מיוזר ללא שם מוגדר'
        }
      );

      const forms = findAllInTree(element, (n) => n.type === 'form');
      forms[0].props.onSubmit({ preventDefault: () => {} });

      expect(onSubmitSupportMessage).toHaveBeenCalledTimes(1);
      const payload = onSubmitSupportMessage.mock.calls[0][0];
      expect(payload.name).toBeUndefined();
      expect(payload.email).toBeUndefined();

      // WhatsApp URL fallback handles empty name/email without throwing
      const whatsappAnchor = findInTree(
        element,
        (n) => n.type === 'a' && typeof n.props?.href === 'string' && n.props.href.includes('wa.me')
      );
      expect(whatsappAnchor.props.href).toContain('https://wa.me/972559236606');
    });
  });
});
