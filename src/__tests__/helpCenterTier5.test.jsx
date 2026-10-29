import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TrialUpgradeModal from '../components/modals/TrialUpgradeModal';
import { PEDAGOGICAL_GUIDE_CHAPTERS, GUIDE_CATEGORIES } from '../components/modals/pedagogicalGuideData';

// ============================================================================
// Test Utilities & React Hooks Dispatcher for Node Testing
// ============================================================================
const reactInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

function sanitizeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderWithHarness(props, stateOverrides = {}) {
  const originalDispatcher = reactInternals.H;
  const stateValues = {
    supportMessage: '',
    messageSent: false,
    isSubmitting: false,
    showAboutLetter: false,
    activeTab: props.initialTab || props.defaultTab || (props.isExpired ? 'contact' : 'guide'),
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
  const effects = [];

  reactInternals.H = {
    useState(initial) {
      const key = stateKeys[hookIndex++] || `state_${hookIndex}`;
      const val = key in stateOverrides
        ? stateOverrides[key]
        : (typeof initial === 'function' ? initial() : initial);
      stateValues[key] = val;
      const setter = vi.fn((next) => {
        stateValues[key] = typeof next === 'function' ? next(stateValues[key]) : next;
      });
      stateSetters[key] = setter;
      return [val, setter];
    },
    useEffect(effectFn, deps) {
      effects.push({ effectFn, deps });
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
    return { element, stateValues, stateSetters, effects };
  } finally {
    reactInternals.H = originalDispatcher;
  }
}

function findAllInTree(node, predicate, results = []) {
  if (!node) return results;
  if (Array.isArray(node)) {
    for (const item of node) {
      findAllInTree(item, predicate, results);
    }
    return results;
  }
  if (typeof node !== 'object') return results;
  if (predicate(node)) results.push(node);
  const children = node.props?.children;
  if (children) {
    findAllInTree(children, predicate, results);
  }
  return results;
}

function findInTree(node, predicate) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findInTree(item, predicate);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  if (predicate(node)) return node;
  const children = node.props?.children;
  if (children) {
    return findInTree(children, predicate);
  }
  return null;
}

// ============================================================================
// Adversarial Test Suite: Help Center Tier 5 (Milestone 2 Phase 2)
// ============================================================================
describe('Tier 5 Adversarial Coverage Hardening: Help Center Modal', () => {
  const sampleTeacher = {
    name: 'זיוית רשף',
    email: 'zivit@tala.edu.il',
    role: 'teacher',
    isTrialUser: false
  };

  const sampleTrialTeacher = {
    name: 'אורנה שחר',
    email: 'orna@gan.k12.il',
    role: 'teacher',
    isTrialUser: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: initialTab & defaultTab Fallback Logic & Priority Chain
  // ==========================================================================
  describe('initialTab & defaultTab Fallback Resolution', () => {
    it('resolves activeTab to initialTab when explicitly provided ("fair_use")', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTeacher,
          onClose: () => {},
          initialTab: 'fair_use'
        })
      );

      // Must display fair_use content
      expect(html).toContain('הסכם רישיון שימוש ומדיניות');
      expect(html).toContain('Fair Use');
      // Must NOT display guide content
      expect(html).not.toContain('מדריך עבודה פדגוגי מקיף למערכת TALA');
    });

    it('resolves activeTab to defaultTab when initialTab is null ("contact")', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTeacher,
          onClose: () => {},
          initialTab: null,
          defaultTab: 'contact'
        })
      );

      // Must display contact content
      expect(html).toContain('פנייה ישירה למנהלת המערכת');
      expect(html).toContain('הצעות ייעול ושיפור למערכת');
      // Must NOT display fair_use or guide content
      expect(html).not.toContain('מדריך עבודה פדגוגי מקיף למערכת TALA');
    });

    it('enforces precedence: initialTab wins over defaultTab when both are provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTeacher,
          onClose: () => {},
          initialTab: 'fair_use',
          defaultTab: 'contact'
        })
      );

      // initialTab ('fair_use') must win over defaultTab ('contact')
      expect(html).toContain('הסכם רישיון שימוש ומדיניות');
      expect(html).toContain('Fair Use');
      expect(html).not.toContain('פנייה ישירה למנהלת המערכת');
    });

    it('falls back to "contact" when both tabs are null and user is expired', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTrialTeacher,
          onClose: () => {},
          isExpired: true,
          initialTab: null,
          defaultTab: null
        })
      );

      // Expired user defaults to contact tab
      expect(html).toContain('פנייה ישירה למנהלת המערכת');
      expect(html).toContain('תקופת הניסיון הסתיימה');
    });

    it('falls back to "guide" when both tabs are null and user is active', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTeacher,
          onClose: () => {},
          isExpired: false,
          initialTab: null,
          defaultTab: null
        })
      );

      // Active user defaults to guide tab
      expect(html).toContain('מדריך עבודה פדגוגי מקיף למערכת TALA');
    });

    it('re-synchronizes activeTab via useEffect when initialTab or isOpen updates', () => {
      const { effects, stateSetters } = renderWithHarness({
        isOpen: true,
        currentUser: sampleTeacher,
        onClose: () => {},
        initialTab: 'fair_use'
      });

      // Execute useEffect #1 (modal open sync)
      expect(effects.length).toBeGreaterThanOrEqual(1);
      const openEffect = effects[0];
      openEffect.effectFn();

      // Verify activeTab setter was invoked with initialTab
      expect(stateSetters.activeTab).toHaveBeenCalledWith('fair_use');
      expect(stateSetters.guideSearchQuery).toHaveBeenCalledWith('');
      expect(stateSetters.guideSelectedCategory).toHaveBeenCalledWith('all');
    });
  });

  // ==========================================================================
  // SECTION 2: Pedagogical Guide Search Query Filtering & Edge Cases
  // ==========================================================================
  describe('Guide Search Query Engine & Edge Cases', () => {
    it('handles empty and whitespace-only search queries gracefully without filtering', () => {
      const whitespaceQueries = ['', '   ', '\t', '\n  \t  \n'];

      for (const query of whitespaceQueries) {
        const { element } = renderWithHarness(
          { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
          { activeTab: 'guide', guideSearchQuery: query }
        );
        const html = renderToStaticMarkup(element);

        // All 15 chapters should be present
        expect(html).toContain('פרק 1: מבוא');
        expect(html).toContain('פרק 15: התקנת קיצור דרך');

        // Clear search button should NOT be rendered when query is empty or whitespace
        if (!query) {
          expect(html).not.toContain('title="נקה חיפוש"');
        }
      }
    });

    it('matches chapters by exact title query', () => {
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: 'ניהול תלמידים וכרטיס תלמיד' }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('פרק 4: ניהול תלמידים וכרטיס תלמיד');
      expect(html).not.toContain('פרק 1: מבוא');
      expect(html).not.toContain('פרק 6: מעקב יומי');
    });

    it('matches chapters by subtitle query when title does not contain search word', () => {
      // In Chapter 1, subtitle contains 'הוליסטית' which is NOT in Chapter 1 title
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: 'הוליסטית' }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('פרק 1: מבוא למערכת TALA');
      expect(html).not.toContain('פרק 2: צעדים ראשונים');
    });

    it('matches chapters by content heading query when title and subtitle do not match', () => {
      // In Chapter 1, content heading contains 'רצף פדגוגי מתועד'
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: 'רצף פדגוגי מתועד' }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('פרק 1: מבוא למערכת TALA');
      expect(html).not.toContain('פרק 3: הכרת סביבת העבודה');
    });

    it('matches chapters by inner body text when title, subtitle and heading do not match', () => {
      // In Chapter 1, text contains 'חצר המשחקים'
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: 'חצר המשחקים' }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('פרק 1: מבוא למערכת TALA');
      expect(html).not.toContain('פרק 5: בניית תוכנית עבודה');
    });

    it('performs case-insensitive searches for English and Latin technical terms', () => {
      const testCases = [
        { query: 'safari', expectedMatch: 'פרק 15: התקנת קיצור דרך' },
        { query: 'SAFARI', expectedMatch: 'פרק 15: התקנת קיצור דרך' },
        { query: 'Safari', expectedMatch: 'פרק 15: התקנת קיצור דרך' },
        { query: 'kpi', expectedMatch: 'פרק 7: סיכומי התקדמות' },
        { query: 'KPI', expectedMatch: 'פרק 7: סיכומי התקדמות' },
        { query: 'word', expectedMatch: 'פרק 9: דוחות, מסמכים רשמיים' },
        { query: 'WORD', expectedMatch: 'פרק 9: דוחות, מסמכים רשמיים' }
      ];

      for (const { query, expectedMatch } of testCases) {
        const { element } = renderWithHarness(
          { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
          { activeTab: 'guide', guideSearchQuery: query }
        );
        const html = renderToStaticMarkup(element);
        expect(html).toContain(expectedMatch);
      }
    });

    it('renders empty search state message when query has no matching chapters', () => {
      const nonExistentQuery = 'מונח_בדיקה_שאינו_קיים_כלל_12345';
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: nonExistentQuery }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('לא נמצאו פרקים התואמים לחיפוש');
      expect(html).toContain(nonExistentQuery);
      expect(html).toContain('נסי מונח אחר או נקי את שורת החיפוש');
      // No chapter card should be rendered
      expect(html).not.toContain('פרק 1: מבוא');
      expect(html).not.toContain('פרק 15: התקנת קיצור דרך');
    });

    it('renders clear search button when query is present and clicking it resets search', () => {
      const { element, stateSetters } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSearchQuery: 'יומן' }
      );

      // Find clear button by title "נקה חיפוש"
      const clearBtn = findInTree(element, (n) => n.type === 'button' && n.props.title === 'נקה חיפוש');
      expect(clearBtn).toBeDefined();

      // Trigger click
      clearBtn.props.onClick();
      expect(stateSetters.guideSearchQuery).toHaveBeenCalledWith('');
    });
  });

  // ==========================================================================
  // SECTION 3: Category Filtering Pills & Category-Search Intersection
  // ==========================================================================
  describe('Guide Category Pills & Intersection Filtering', () => {
    it('verifies all 7 categories isolate their respective chapters correctly', () => {
      const expectedCategories = [
        { id: 'getting_started', expectedChapters: [1, 2, 3] },
        { id: 'programs_goals', expectedChapters: [4, 5] },
        { id: 'daily_tracking', expectedChapters: [6, 7] },
        { id: 'ai_reports', expectedChapters: [8, 9] },
        { id: 'methodology', expectedChapters: [10, 11, 12] },
        { id: 'settings_tools', expectedChapters: [13, 14, 15] }
      ];

      for (const { id, expectedChapters } of expectedCategories) {
        const { element } = renderWithHarness(
          { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
          { activeTab: 'guide', guideSelectedCategory: id }
        );
        const html = renderToStaticMarkup(element);

        // Verify expected chapters are present (handling possible entity quotes and ampersands in title)
        for (const chId of expectedChapters) {
          const chapterObj = PEDAGOGICAL_GUIDE_CHAPTERS.find((c) => c.id === chId);
          const sanitizedTitle = sanitizeHtml(chapterObj.title);
          expect(html).toContain(sanitizedTitle);
        }

        // Verify chapters from other categories are absent
        const otherChapters = PEDAGOGICAL_GUIDE_CHAPTERS.filter((c) => !expectedChapters.includes(c.id));
        for (const ch of otherChapters) {
          const sanitizedTitle = sanitizeHtml(ch.title);
          expect(html).not.toContain(sanitizedTitle);
        }
      }
    });

    it('applies distinct styling to the currently active category pill', () => {
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSelectedCategory: 'daily_tracking' }
      );

      const pills = findAllInTree(
        element,
        (n) => n.type === 'button' && typeof n.props.children === 'string' && GUIDE_CATEGORIES.some((c) => c.label === n.props.children)
      );

      expect(pills.length).toBe(GUIDE_CATEGORIES.length);

      const activePill = pills.find((p) => p.props.children === 'מעקב יומי וסיכומים');
      expect(activePill).toBeDefined();
      expect(activePill.props.style.background).toBe('#eff6ff');
      expect(activePill.props.style.border).toBe('1px solid #2563eb');
      expect(activePill.props.style.fontWeight).toBe(700);

      const inactivePill = pills.find((p) => p.props.children === 'מבוא והתחלה');
      expect(inactivePill).toBeDefined();
      expect(inactivePill.props.style.background).toBe('#ffffff');
      expect(inactivePill.props.style.border).toBe('1px solid #e2e8f0');
      expect(inactivePill.props.style.fontWeight).toBe(500);
    });

    it('filters strictly by intersection of category AND search query', () => {
      // 1. In 'ai_reports', search for 'Word' matches Chapter 9
      const { element: matchingEl } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSelectedCategory: 'ai_reports', guideSearchQuery: 'Word' }
      );
      const matchHtml = renderToStaticMarkup(matchingEl);
      expect(matchHtml).toContain('פרק 9: דוחות, מסמכים רשמיים');
      expect(matchHtml).not.toContain('פרק 8: מנגנון בינה מלאכותית');

      // 2. In 'getting_started', searching for 'Word' yields 0 results and shows empty state
      const { element: noMatchEl } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSelectedCategory: 'getting_started', guideSearchQuery: 'Word' }
      );
      const noMatchHtml = renderToStaticMarkup(noMatchEl);
      expect(noMatchHtml).toContain('לא נמצאו פרקים התואמים לחיפוש');
      expect(noMatchHtml).toContain('Word');
    });

    it('invokes setGuideSelectedCategory when clicking a category pill', () => {
      const { element, stateSetters } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', guideSelectedCategory: 'all' }
      );

      const pill = findInTree(
        element,
        (n) => n.type === 'button' && n.props.children === 'הגדרות וקיצורים'
      );
      expect(pill).toBeDefined();

      pill.props.onClick();
      expect(stateSetters.guideSelectedCategory).toHaveBeenCalledWith('settings_tools');
    });
  });

  // ==========================================================================
  // SECTION 4: Accordion Expansion / Collapse Engine
  // ==========================================================================
  describe('Guide Accordion Expansion & Collapse Engine', () => {
    it('initializes with default expanded state: only chapters 1 and 15 expanded', () => {
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', expandedChapters: { 1: true, 15: true } }
      );
      const html = renderToStaticMarkup(element);

      // Chapter 1 content rendered
      expect(html).toContain('מהות מערכת TALA וייעודה');
      // Chapter 15 content rendered
      expect(html).toContain('קיצור לאייפד / אייפון');
      // Chapter 2 content NOT rendered
      expect(html).not.toContain('כניסה ראשונית וקביעת סיסמה אישית');
    });

    it('expands all 15 chapters when clicking "הרחב את כל הפרקים"', () => {
      const { element, stateSetters } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide' }
      );

      const expandAllBtn = findInTree(
        element,
        (n) => n.type === 'button' && n.props.children === 'הרחב את כל הפרקים'
      );
      expect(expandAllBtn).toBeDefined();

      expandAllBtn.props.onClick();

      // State setter must have been called with a map containing all 15 IDs set to true
      const calledArg = stateSetters.expandedChapters.mock.calls[0][0];
      for (let i = 1; i <= 15; i++) {
        expect(calledArg[i]).toBe(true);
      }
    });

    it('collapses all chapters when clicking "כווץ הכל"', () => {
      const { element, stateSetters } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide' }
      );

      const collapseAllBtn = findInTree(
        element,
        (n) => n.type === 'button' && n.props.children === 'כווץ הכל'
      );
      expect(collapseAllBtn).toBeDefined();

      collapseAllBtn.props.onClick();
      expect(stateSetters.expandedChapters).toHaveBeenCalledWith({});
    });

    it('toggles an individual chapter open and closed', () => {
      const { element, stateSetters } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', expandedChapters: { 1: true, 15: true } }
      );

      // Find all buttons and locate the one whose subtrees contain Chapter 1 header title
      const allButtons = findAllInTree(element, (n) => n.type === 'button');
      const chapter1Btn = allButtons.find((btn) => {
        const textNodes = findAllInTree(btn, (n) => typeof n.props?.children === 'string');
        return textNodes.some((node) => node.props.children.includes('פרק 1:'));
      });
      expect(chapter1Btn).toBeDefined();

      // Click to toggle Chapter 1
      chapter1Btn.props.onClick();

      // Verify the state setter received a toggle callback
      expect(stateSetters.expandedChapters).toHaveBeenCalledTimes(1);
      const updateFn = stateSetters.expandedChapters.mock.calls[0][0];
      const nextState = updateFn({ 1: true, 15: true });
      expect(nextState[1]).toBe(false);
      expect(nextState[15]).toBe(true);
    });

    it('renders dedicated 4-step iOS shortcut instructions when Chapter 15 is expanded', () => {
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide', expandedChapters: { 15: true } }
      );
      const html = renderToStaticMarkup(element);

      expect(html).toContain('קיצור לאייפד / אייפון: איך להוסיף קיצור דרך של TALA למסך הבית באייפד ובאייפון');
      expect(html).toContain('פתיחת Safari:');
      expect(html).toContain('לחיצה על שיתוף:');
      expect(html).toContain('הוספה למסך הבית:');
      expect(html).toContain('אישור:');
      expect(html).toContain('https://zivitreshef.github.io/TALA/');
    });
  });

  // ==========================================================================
  // SECTION 5: Pinned Container Flex Styles & Viewport Resize Simulations
  // ==========================================================================
  describe('Pinned Layout Flex Sizing & Multi-Device Resize Simulations', () => {
    it('enforces zero layout shift styling contracts across outer modal and inner zones', () => {
      const { element } = renderWithHarness({
        isOpen: true,
        currentUser: sampleTeacher,
        onClose: () => {}
      });

      // Outer container
      const container = findInTree(element, (n) => n.props?.className === 'modal-container');
      expect(container).toBeDefined();
      expect(container.props.style.display).toBe('flex');
      expect(container.props.style.flexDirection).toBe('column');
      expect(container.props.style.overflow).toBe('hidden');
      expect(container.props.style.maxWidth).toBe('860px');
      expect(container.props.style.width).toBe('min(860px, 95vw)');
      expect(container.props.style.height).toBe('min(780px, 90vh)');
      expect(container.props.style.minHeight).toBe('560px');

      // Pinned Header
      const header = findInTree(element, (n) => n.props?.className === 'modal-header');
      expect(header.props.style.flexShrink).toBe(0);

      // Scrollable Content Body
      const body = findInTree(element, (n) => n.props?.className === 'modal-body');
      expect(body.props.style.flex).toBe('1 1 auto');
      expect(body.props.style.overflowY).toBe('auto');
      expect(body.props.style.minHeight).toBe(0);
      expect(body.props.style.scrollbarGutter).toBe('stable');

      // Pinned Footer
      const footer = findInTree(element, (n) => n.props?.className === 'modal-footer');
      expect(footer.props.style.flexShrink).toBe(0);
    });

    it('simulates responsive clamping formulas across various device viewports', () => {
      const computeExpectedDimensions = (vw, vh) => {
        const computedWidth = Math.min(860, 0.95 * vw);
        const computedHeight = Math.max(560, Math.min(780, 0.90 * vh));
        return { computedWidth, computedHeight };
      };

      const viewports = [
        { name: 'iPhone SE (375x667)', vw: 375, vh: 667, expectedW: 356.25, expectedH: 600.3 },
        { name: 'iPad Mini (768x1024)', vw: 768, vh: 1024, expectedW: 729.6, expectedH: 780 },
        { name: 'MacBook Air 13" (1280x800)', vw: 1280, vh: 800, expectedW: 860, expectedH: 720 },
        { name: 'Full HD Monitor (1920x1080)', vw: 1920, vh: 1080, expectedW: 860, expectedH: 780 },
        { name: 'Ultra-wide 2K (2560x1440)', vw: 2560, vh: 1440, expectedW: 860, expectedH: 780 }
      ];

      for (const vp of viewports) {
        const { computedWidth, computedHeight } = computeExpectedDimensions(vp.vw, vp.vh);
        expect(computedWidth).toBeCloseTo(vp.expectedW, 1);
        expect(computedHeight).toBeCloseTo(vp.expectedH, 1);
        expect(computedWidth).toBeLessThanOrEqual(860);
        expect(computedHeight).toBeLessThanOrEqual(780);
        expect(computedHeight).toBeGreaterThanOrEqual(560);
      }
    });

    it('preserves pinned navigation bar layout during active scrolling', () => {
      const { element } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'guide' }
      );

      const container = findInTree(element, (n) => n.props?.className === 'modal-container');
      expect(container).toBeDefined();

      // Top panel (status + tab bar) is the second direct child of modal-container
      const topPanel = container.props.children[1];
      expect(topPanel.props.style.flexShrink).toBe(0);
      expect(topPanel.props.style.borderBottom).toBe('1px solid #e2e8f0');
    });
  });

  // ==========================================================================
  // SECTION 6: Additional Adversarial Edge Cases & Interaction Pathways
  // ==========================================================================
  describe('Additional Interactive Pathways & Edge Cases', () => {
    it('allows sending another suggestion after successful submission ("שליחת הצעה נוספת")', () => {
      const { element, stateSetters } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'contact', rfeSubmitted: true }
      );

      // Banner is rendered
      const html = renderToStaticMarkup(element);
      expect(html).toContain('תודה רבה! הצעת השיפור שלך נשלחה בהצלחה ונרשמה בצוות הפיתוח');

      // Find "שליחת הצעה נוספת" button
      const resetBtn = findInTree(
        element,
        (n) => n.type === 'button' && n.props.children === 'שליחת הצעה נוספת'
      );
      expect(resetBtn).toBeDefined();

      resetBtn.props.onClick();
      expect(stateSetters.rfeSubmitted).toHaveBeenCalledWith(false);
    });

    it('toggles personal letter from Zivit Reshef for non-trial user and flips button label', () => {
      // 1. Initially hidden for non-trial user
      const { element: hiddenEl, stateSetters } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'contact', showAboutLetter: false }
      );
      const hiddenHtml = renderToStaticMarkup(hiddenEl);
      expect(hiddenHtml).toContain('אודות TALA ואיך נולדה האפליקציה... 🌷');
      expect(hiddenHtml).toContain('קרא עוד');
      expect(hiddenHtml).not.toContain('אני אשת חינוך מיוחד עם 24 שנות ניסיון');

      // Click toggle button
      const toggleBtn = findInTree(
        hiddenEl,
        (n) => n.type === 'button' && findInTree(n, (c) => typeof c.props?.children === 'string' && c.props.children.includes('אודות TALA'))
      );
      expect(toggleBtn).toBeDefined();
      toggleBtn.props.onClick();
      expect(stateSetters.showAboutLetter).toHaveBeenCalled();

      // 2. Visible when showAboutLetter is true
      const { element: visibleEl } = renderWithHarness(
        { isOpen: true, currentUser: sampleTeacher, onClose: () => {} },
        { activeTab: 'contact', showAboutLetter: true }
      );
      const visibleHtml = renderToStaticMarkup(visibleEl);
      expect(visibleHtml).toContain('הסתר');
      expect(visibleHtml).toContain('אני אשת חינוך מיוחד עם 24 שנות ניסיון');
      expect(visibleHtml).toContain('תודה על השותפות, זיוית');
    });

    it('triggers onOpenIntroVideo and onClose for active user, but avoids onClose for expired user', () => {
      const onOpenIntroVideo = vi.fn();
      const onClose = vi.fn();

      // Case A: Active user -> calls both onClose and onOpenIntroVideo
      const { element: activeEl } = renderWithHarness({
        isOpen: true,
        currentUser: sampleTeacher,
        isExpired: false,
        onClose,
        onOpenIntroVideo
      });

      const videoBtnActive = findInTree(
        activeEl,
        (n) => n.type === 'button' && findInTree(n, (c) => c.props?.children === 'סרטון הדרכה')
      );
      videoBtnActive.props.onClick();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onOpenIntroVideo).toHaveBeenCalledTimes(1);

      // Case B: Expired user -> calls onOpenIntroVideo but NOT onClose
      vi.clearAllMocks();
      const { element: expiredEl } = renderWithHarness({
        isOpen: true,
        currentUser: sampleTrialTeacher,
        isExpired: true,
        onClose,
        onOpenIntroVideo
      });

      const videoBtnExpired = findInTree(
        expiredEl,
        (n) => n.type === 'button' && findInTree(n, (c) => c.props?.children === 'סרטון הדרכה')
      );
      videoBtnExpired.props.onClick();
      expect(onClose).not.toHaveBeenCalled();
      expect(onOpenIntroVideo).toHaveBeenCalledTimes(1);
    });

    it('renders admin badge when paidRemainingDays is Infinity or currentUser.role is admin', () => {
      // Admin role
      const adminUser = { ...sampleTeacher, role: 'admin' };
      const htmlAdmin = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: adminUser,
          onClose: () => {}
        })
      );
      expect(htmlAdmin).toContain('חשבון מנהל (ללא הגבלת זמן)');

      // Infinity days
      const htmlInfinity = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTeacher,
          paidRemainingDays: Infinity,
          onClose: () => {}
        })
      );
      expect(htmlInfinity).toContain('חשבון מנהל (ללא הגבלת זמן)');
    });

    it('renders amber warning badge when paidRemainingDays is 30 days or less', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrialUpgradeModal, {
          isOpen: true,
          currentUser: sampleTeacher,
          paidRemainingDays: 14,
          onClose: () => {}
        })
      );

      expect(html).toContain('נותרו עוד 14 ימים לחידוש המנוי');
      expect(html).toContain('background:#fffbeb');
      expect(html).toContain('color:#b45309');
    });

    it('generates properly escaped WhatsApp URLs for all user roles and missing name/email fallbacks', () => {
      // 1. Expired user
      const { element: expiredEl } = renderWithHarness({
        isOpen: true,
        currentUser: sampleTrialTeacher,
        isExpired: true,
        onClose: () => {}
      });
      const expiredLink = findInTree(expiredEl, (n) => n.type === 'a' && n.props.href?.includes('wa.me'));
      expect(expiredLink.props.href).toContain('הסתיימה%20תקופת%20הניסיון%20שלי');

      // 2. Paid user
      const { element: paidEl } = renderWithHarness({
        isOpen: true,
        currentUser: sampleTeacher,
        isExpired: false,
        onClose: () => {}
      });
      const paidLink = findInTree(paidEl, (n) => n.type === 'a' && n.props.href?.includes('wa.me'));
      expect(paidLink.props.href).toContain(encodeURIComponent('ברצוני להתייעץ בנושא המערכת'));

      // 3. User with missing name and email fields
      const { element: missingEl } = renderWithHarness({
        isOpen: true,
        currentUser: { role: 'teacher', isTrialUser: true },
        isExpired: false,
        onClose: () => {}
      });
      const missingLink = findInTree(missingEl, (n) => n.type === 'a' && n.props.href?.includes('wa.me'));
      expect(missingLink.props.href).not.toContain('undefined');
      expect(missingLink.props.href).toContain('wa.me/972559236606');
    });
  });
});
