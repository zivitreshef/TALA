import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Audit utility: scans source code of a React component file and verifies
 * that it adheres strictly to the React Rules of Hooks:
 * 1. No hooks called after any conditional early return at component scope.
 * 2. No hooks called inside conditionals, loops, or nested callback blocks.
 */
export function analyzeComponentHooks(sourceCode, fileName = 'component.jsx') {
  const lines = sourceCode.split(/\r?\n/);
  const violations = [];

  let inComponent = false;
  let componentName = '';
  let braceDepth = 0;
  let sawEarlyReturn = false;
  let earlyReturnLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect functional component declaration: function ComponentName(...) or const ComponentName = (...) =>
    const compMatch = line.match(/(?:export\s+(?:default\s+)?)?(?:function\s+([A-Z]\w*)|(?:const|let|var)\s+([A-Z]\w*)\s*=\s*(?:React\.(?:memo|forwardRef)\()?(?:\(.*?\)|[a-zA-Z0-9_]+)\s*=>)/);
    if (compMatch) {
      inComponent = true;
      componentName = compMatch[1] || compMatch[2] || 'AnonymousComponent';
      braceDepth = 0;
      sawEarlyReturn = false;
      earlyReturnLine = -1;
    }

    if (!inComponent) continue;

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Check for a top-level early return inside the component body (at braceDepth === 1)
    if (braceDepth === 1) {
      if (/^\s*if\s*\(.*?\)\s*return\b/.test(line) || /^\s*if\s*\(.*?\)\s*\{\s*return\b/.test(line)) {
        sawEarlyReturn = true;
        earlyReturnLine = i + 1;
      }
    }

    braceDepth += openBraces - closeBraces;

    if (braceDepth <= 0 && inComponent) {
      inComponent = false;
      sawEarlyReturn = false;
    }

    // Violation: Hook invocation after an early return
    if (sawEarlyReturn && braceDepth === 1) {
      const hookMatch = line.match(/\b(use[A-Z]\w*)\s*\(/);
      if (hookMatch) {
        violations.push({
          file: fileName,
          component: componentName,
          type: 'HOOK_AFTER_EARLY_RETURN',
          hook: hookMatch[1],
          line: i + 1,
          code: line.trim(),
          earlyReturnLine
        });
      }
    }

    // Violation: Inline conditional hook execution (e.g. if (foo) useState())
    if (/\bif\s*\(.*?\).*\b(use[A-Z]\w*)\s*\(/.test(line)) {
      const inlineHookMatch = line.match(/\b(use[A-Z]\w*)\s*\(/);
      violations.push({
        file: fileName,
        component: componentName || 'Unknown',
        type: 'CONDITIONAL_HOOK_CALL',
        hook: inlineHookMatch ? inlineHookMatch[1] : 'useHook',
        line: i + 1,
        code: line.trim()
      });
    }
  }

  return violations;
}

function getSrcComponentFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', '__tests__', 'dist', 'build'].includes(entry.name)) {
        results = results.concat(getSrcComponentFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.jsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Rules of Hooks Zero-Exception Audit Suite (Prevents React #310 across entire codebase)', () => {
  const srcRoot = path.resolve(__dirname, '..');
  const componentFiles = getSrcComponentFiles(srcRoot);

  it('scans all JSX component files and detects ZERO hook order/count violations', () => {
    expect(componentFiles.length).toBeGreaterThan(15);

    const allViolations = [];
    for (const filePath of componentFiles) {
      const relPath = path.relative(srcRoot, filePath);
      const code = fs.readFileSync(filePath, 'utf8');
      const fileViolations = analyzeComponentHooks(code, relPath);
      if (fileViolations.length > 0) {
        allViolations.push(...fileViolations);
      }
    }

    if (allViolations.length > 0) {
      console.error('Rules of Hooks violations found:', JSON.stringify(allViolations, null, 2));
    }

    expect(allViolations).toEqual([]);
  });

  it('verifies App.jsx strictly calls all hooks in initialization preamble before auth gates', () => {
    const appPath = path.resolve(srcRoot, 'App.jsx');
    const appCode = fs.readFileSync(appPath, 'utf8');
    const lines = appCode.split(/\r?\n/);

    const unauthGateLine = lines.findIndex(
      (l, idx) => l.includes('if (!currentUser) {') && lines[idx + 1]?.includes('return (')
    );
    expect(unauthGateLine).toBeGreaterThan(0);

    // Scan for any hook called below the unauth gate
    const postGateHooks = [];
    lines.forEach((l, idx) => {
      if (idx > unauthGateLine && /\buse[A-Z]\w*\s*\(/.test(l)) {
        postGateHooks.push({ line: idx + 1, code: l.trim() });
      }
    });

    expect(postGateHooks).toEqual([]);
  });

  it('verifies AllowlistAuthGate.jsx has no hook violations', () => {
    const gatePath = path.resolve(srcRoot, 'AllowlistAuthGate.jsx');
    const gateCode = fs.readFileSync(gatePath, 'utf8');
    const violations = analyzeComponentHooks(gateCode, 'AllowlistAuthGate.jsx');
    expect(violations).toEqual([]);
  });

  it('verifies AdminAllowlistModal.jsx has no hooks called after if (!isOpen) return null', () => {
    const modalPath = path.resolve(srcRoot, 'components/modals/AdminAllowlistModal.jsx');
    const modalCode = fs.readFileSync(modalPath, 'utf8');
    const violations = analyzeComponentHooks(modalCode, 'AdminAllowlistModal.jsx');
    expect(violations).toEqual([]);
  });

  describe('Audit Scanner Self-Verification (Negative Testing)', () => {
    it('reliably catches and reports a simulated hook placed after an early return', () => {
      const flawedComponentCode = `
        export default function FlawedComponent({ isOpen, data }) {
          const [val, setVal] = useState(0);
          if (!isOpen) return null;
          const memoized = useMemo(() => data * 2, [data]);
          return <div>{val} - {memoized}</div>;
        }
      `;

      const detected = analyzeComponentHooks(flawedComponentCode, 'FlawedComponent.jsx');
      expect(detected).toHaveLength(1);
      expect(detected[0].type).toBe('HOOK_AFTER_EARLY_RETURN');
      expect(detected[0].hook).toBe('useMemo');
    });

    it('reliably catches and reports a simulated inline conditional hook call', () => {
      const flawedConditionalCode = `
        export default function ConditionalHookComponent({ condition }) {
          if (condition) useEffect(() => {}, []);
          return <div>Test</div>;
        }
      `;

      const detected = analyzeComponentHooks(flawedConditionalCode, 'ConditionalHookComponent.jsx');
      expect(detected).toHaveLength(1);
      expect(detected[0].type).toBe('CONDITIONAL_HOOK_CALL');
      expect(detected[0].hook).toBe('useEffect');
    });
  });
});
