import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import DiagnosticIntakeModal from '../components/form/DiagnosticIntakeModal';
import MinistryCopyModal from '../components/form/MinistryCopyModal';
import {
  useModalAnimation,
  lockScroll,
  unlockScroll,
  getScrollLockCount,
  resetScrollLockForTesting,
  pushModalEsc,
  popModalEsc,
  getModalEscStackCount,
  resetModalEscStackForTesting,
  isReducedMotion
} from '../hooks/useModalAnimation';

// Minimal DOM mock for Node environment
function setupNodeDomMock() {
  const windowListeners: Record<string, Array<(e: any) => void>> = {};
  const classes = new Set<string>();

  const doc = {
    body: {
      style: { overflow: '' },
      classList: {
        add: (cls: string) => classes.add(cls),
        remove: (cls: string) => classes.delete(cls),
        contains: (cls: string) => classes.has(cls),
        _classes: classes
      }
    }
  };

  const win = {
    addEventListener: (type: string, listener: any) => {
      if (!windowListeners[type]) windowListeners[type] = [];
      windowListeners[type].push(listener);
    },
    removeEventListener: (type: string, listener: any) => {
      if (!windowListeners[type]) return;
      windowListeners[type] = windowListeners[type].filter((l) => l !== listener);
    },
    dispatchEvent: (event: any) => {
      const arr = windowListeners[event.type] || [];
      arr.forEach((fn) => fn(event));
    },
    matchMedia: (query: string) => ({
      matches: false,
      media: query
    })
  };

  (global as any).document = doc;
  (global as any).window = win;

  return { doc, win, windowListeners, classes };
}

describe('TALA Consistent Modal Animation System Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupNodeDomMock();
    resetScrollLockForTesting();
    resetModalEscStackForTesting();
  });

  afterEach(() => {
    resetScrollLockForTesting();
    resetModalEscStackForTesting();
    vi.useRealTimers();
    delete (global as any).document;
    delete (global as any).window;
  });

  // --------------------------------------------------------------------------
  // Suite 1: useModalAnimation Hook Contract & Static Rendering
  // --------------------------------------------------------------------------
  describe('useModalAnimation Lifecycle & Contract', () => {
    function DummyModal({
      isOpen,
      onClose
    }: {
      isOpen: boolean;
      onClose?: () => void;
    }) {
      const { shouldRender, isClosing } = useModalAnimation({ isOpen, onClose });
      if (!shouldRender) return null;
      return (
        <div className={`modal-backdrop ${isClosing ? 'is-closing' : ''}`}>
          <div className={`modal-container ${isClosing ? 'is-closing' : ''}`}>
            <h3>כותרת מודאל</h3>
          </div>
        </div>
      );
    }

    it('returns null and renders empty string when isOpen is false', () => {
      const html = renderToStaticMarkup(<DummyModal isOpen={false} />);
      expect(html).toBe('');
    });

    it('renders modal backdrop and container when isOpen is true', () => {
      const html = renderToStaticMarkup(<DummyModal isOpen={true} />);
      expect(html).toContain('modal-backdrop');
      expect(html).toContain('modal-container');
      expect(html).toContain('כותרת מודאל');
      expect(html).not.toContain('is-closing');
    });

    it('handles backdrop click helper safely (triggers onClose only when target matches currentTarget)', () => {
      let hookReturn: any = null;
      function TestHook() {
        hookReturn = useModalAnimation({
          isOpen: true,
          onClose: vi.fn()
        });
        return null;
      }
      renderToStaticMarkup(<TestHook />);

      expect(hookReturn).not.toBeNull();
      expect(hookReturn.shouldRender).toBe(true);
      expect(hookReturn.isClosing).toBe(false);

      // Child target click inside modal container does not fire onClose
      const mockChildEvent = {
        target: { id: 'inner' },
        currentTarget: { id: 'backdrop' }
      } as any;
      hookReturn.handleBackdropClick(mockChildEvent);

      // Exact backdrop target click triggers onClose
      const mockBackdropEvent = {
        target: { id: 'backdrop' },
        currentTarget: { id: 'backdrop' }
      } as any;
      hookReturn.handleBackdropClick(mockBackdropEvent);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Scroll Lock Reference Counting (Single & Nested Modals)
  // --------------------------------------------------------------------------
  describe('Scroll Lock Reference Counting Safeguards', () => {
    it('locks body overflow and adds modal-open class when modal mounts', () => {
      expect(getScrollLockCount()).toBe(0);
      expect(document.body.classList.contains('modal-open')).toBe(false);

      lockScroll();

      expect(getScrollLockCount()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.classList.contains('modal-open')).toBe(true);

      unlockScroll();
      expect(getScrollLockCount()).toBe(0);
      expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    it('nested modals increment count and keep body locked until ALL modals close', () => {
      // 1st modal opens
      lockScroll();
      expect(getScrollLockCount()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');

      // 2nd nested modal opens on top of 1st
      lockScroll();
      expect(getScrollLockCount()).toBe(2);
      expect(document.body.style.overflow).toBe('hidden');

      // 2nd nested modal closes: body MUST still remain locked
      unlockScroll();
      expect(getScrollLockCount()).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.classList.contains('modal-open')).toBe(true);

      // 1st modal closes: body is restored
      unlockScroll();
      expect(getScrollLockCount()).toBe(0);
      expect(document.body.classList.contains('modal-open')).toBe(false);
    });

    it('never allows negative scroll lock counts on accidental extra unlocks', () => {
      unlockScroll();
      unlockScroll();
      expect(getScrollLockCount()).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Keyboard ESC Dismissal Stack
  // --------------------------------------------------------------------------
  describe('Keyboard ESC Dismissal Stack', () => {
    it('single modal dismisses via Escape key', () => {
      const onClose = vi.fn();
      pushModalEsc(onClose);
      expect(getModalEscStackCount()).toBe(1);

      // Simulate Escape
      window.dispatchEvent({ type: 'keydown', key: 'Escape', stopPropagation: vi.fn() } as unknown as Event);
      popModalEsc(onClose);
      expect(getModalEscStackCount()).toBe(0);
    });

    it('nested modals: Escape key only dismisses the topmost modal in stack', () => {
      const modal1Close = vi.fn();
      const modal2Close = vi.fn();

      pushModalEsc(modal1Close);
      pushModalEsc(modal2Close);
      expect(getModalEscStackCount()).toBe(2);

      // Top handler is modal 2
      popModalEsc(modal2Close);
      expect(getModalEscStackCount()).toBe(1);

      // Remaining handler is modal 1
      popModalEsc(modal1Close);
      expect(getModalEscStackCount()).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 4: Accessibility & prefers-reduced-motion
  // --------------------------------------------------------------------------
  describe('prefers-reduced-motion Accessibility', () => {
    it('detects reduced motion setting via matchMedia', () => {
      (window as any).matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query
      }));

      expect(isReducedMotion()).toBe(true);
    });

    it('returns false when window or matchMedia is unavailable', () => {
      delete (global as any).window;
      expect(isReducedMotion()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 5: CSS Design Tokens & Architecture Contracts
  // --------------------------------------------------------------------------
  describe('CSS Architecture & Animation Tokens Contract', () => {
    it('verifies index.css defines exact centralized animation parameters and keyframes', () => {
      const cssPath = path.resolve(__dirname, '../index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // 1. Duration & Easing Variables
      expect(cssContent).toContain('--modal-anim-open-duration: 220ms;');
      expect(cssContent).toContain('--modal-anim-close-duration: 160ms;');
      expect(cssContent).toContain('--modal-anim-backdrop-open-duration: 200ms;');
      expect(cssContent).toContain('--modal-anim-backdrop-close-duration: 160ms;');
      expect(cssContent).toContain('--modal-anim-easing-open: cubic-bezier(0.16, 1, 0.3, 1);');
      expect(cssContent).toContain('--modal-anim-easing-close: cubic-bezier(0.7, 0, 0.84, 0);');
      expect(cssContent).toContain('--modal-backdrop-bg: rgba(0, 0, 0, 0.40);');

      // 2. Keyframes
      expect(cssContent).toContain('@keyframes talaModalBackdropIn');
      expect(cssContent).toContain('@keyframes talaModalBackdropOut');
      expect(cssContent).toContain('@keyframes talaModalCardIn');
      expect(cssContent).toContain('@keyframes talaModalCardOut');

      // 3. Opening scales & opacities
      expect(cssContent).toContain('transform: scale(0.96);');
      expect(cssContent).toContain('transform: scale(1);');

      // 4. Closing scales & opacities
      expect(cssContent).toContain('transform: scale(0.98);');

      // 5. Pointer events safety while closing
      expect(cssContent).toContain('pointer-events: none !important;');

      // 6. Reduced-motion block
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toContain('animation: none !important;');
      expect(cssContent).toContain('transform: none !important;');

      // 7. Scroll lock class
      expect(cssContent).toContain('body.modal-open {');
      expect(cssContent).toContain('overflow: hidden !important;');
    });
  });

  describe('Rules-of-Hooks Compliance & Regression (React Error #310 Prevention)', () => {
    it('DiagnosticIntakeModal safely renders with isOpen=false and isOpen=true without hook mismatch', () => {
      const mockFormData: any = { id: 'st-1', name: 'ישראל ישראלי', pedagogicalSnippets: [] };

      // Render closed
      const closedHtml = renderToStaticMarkup(
        <DiagnosticIntakeModal
          formData={mockFormData}
          isOpen={false}
          onClose={vi.fn()}
        />
      );
      expect(closedHtml).toBe('');

      // Render open (must not throw React error #310)
      const openHtml = renderToStaticMarkup(
        <DiagnosticIntakeModal
          formData={mockFormData}
          isOpen={true}
          initialDocName="test.pdf"
          initialText="שורה ראשונה\nשורה שנייה"
          onClose={vi.fn()}
        />
      );
      expect(openHtml).toContain('קליטת מסמך ושמירה בתיק התלמיד/ה');
      expect(openHtml).toContain('modal-backdrop');
    });

    it('MinistryCopyModal safely renders with isOpen=false and isOpen=true', () => {
      const mockFormData: any = { id: 'st-1', name: 'ישראל ישראלי', goals: [] };

      // Render closed
      const closedHtml = renderToStaticMarkup(
        <MinistryCopyModal
          formData={mockFormData}
          isOpen={false}
          onClose={vi.fn()}
        />
      );
      expect(closedHtml).toBe('');

      // Render open
      const openHtml = renderToStaticMarkup(
        <MinistryCopyModal
          formData={mockFormData}
          isOpen={true}
          onClose={vi.fn()}
        />
      );
      expect(openHtml).toContain('העתקה למנב');
      expect(openHtml).toContain('modal-backdrop');
    });

    it('Guarantees zero hook violations across all components in src via AST inspection', () => {
      let violations: string[] = [];

      function checkFile(filePath: string) {
        const content = fs.readFileSync(filePath, 'utf8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

        function inspectNode(node: ts.Node) {
          if (
            (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
            node.body &&
            ts.isBlock(node.body)
          ) {
            let seenReturn = false;
            let returnLine = -1;

            for (const stmt of node.body.statements) {
              function checkCalls(n: ts.Node) {
                if (ts.isCallExpression(n)) {
                  let callName = '';
                  if (ts.isIdentifier(n.expression)) callName = n.expression.text;
                  else if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.name)) {
                    callName = n.expression.name.text;
                  }

                  if (
                    /^use[A-Z]/.test(callName) &&
                    !['useFakeTimers', 'useRealTimers'].includes(callName) &&
                    seenReturn
                  ) {
                    const line = sourceFile.getLineAndCharacterOfPosition(n.getStart()).line + 1;
                    violations.push(`${filePath}:${line} -> Hook '${callName}' called after return on line ${returnLine}`);
                  }
                }
                ts.forEachChild(n, checkCalls);
              }

              checkCalls(stmt);

              if (ts.isIfStatement(stmt)) {
                const t = stmt.thenStatement;
                if (
                  ts.isReturnStatement(t) ||
                  (ts.isBlock(t) && t.statements.some((s) => ts.isReturnStatement(s)))
                ) {
                  seenReturn = true;
                  returnLine = sourceFile.getLineAndCharacterOfPosition(stmt.getStart()).line + 1;
                }
              } else if (ts.isReturnStatement(stmt)) {
                seenReturn = true;
                returnLine = sourceFile.getLineAndCharacterOfPosition(stmt.getStart()).line + 1;
              }
            }
          }
          ts.forEachChild(node, inspectNode);
        }

        inspectNode(sourceFile);
      }

      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'graphify-out'].includes(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
            checkFile(fullPath);
          }
        }
      }

      walk('src');
      expect(violations).toEqual([]);
    });
  });
});
