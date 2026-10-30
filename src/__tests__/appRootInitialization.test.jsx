import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('App Root Hook Ordering & Rules of Hooks (Regression Tests for Error #310)', () => {
  it('ensures userStudents is declared before any hook references it in App.jsx', () => {
    const appPath = path.resolve(__dirname, '../App.jsx');
    const appSource = fs.readFileSync(appPath, 'utf8');

    const lines = appSource.split(/\r?\n/);
    let userStudentsDeclLine = -1;
    let digestHookLine = -1;

    lines.forEach((line, idx) => {
      if (/const\s+userStudents\s*=\s*useMemo/.test(line) || /const\s+userStudents\s*=\s*getStudentsForUser/.test(line)) {
        if (userStudentsDeclLine === -1) {
          userStudentsDeclLine = idx + 1;
        }
      }
      if (/Automated Pedagogical Digest Scheduler/.test(line)) {
        digestHookLine = idx + 1;
      }
    });

    expect(userStudentsDeclLine).toBeGreaterThan(0);
    expect(digestHookLine).toBeGreaterThan(0);
    // Crucial: userStudents declaration must appear BEFORE the digest hook (prevents TDZ)
    expect(digestHookLine).toBeGreaterThan(userStudentsDeclLine);
  });

  it('ensures NO React hooks are called after any top-level early return in App.jsx (prevents React Error #310)', () => {
    const appPath = path.resolve(__dirname, '../App.jsx');
    const appSource = fs.readFileSync(appPath, 'utf8');
    const lines = appSource.split(/\r?\n/);

    // Find the line where the top-level gate returns early for unauthenticated users
    const authGateEarlyReturnIdx = lines.findIndex(
      (l, idx) => l.includes('if (!currentUser) {') && lines[idx + 1]?.includes('return (')
    );

    expect(authGateEarlyReturnIdx).toBeGreaterThan(0);

    const violations = [];
    lines.forEach((line, idx) => {
      if (idx > authGateEarlyReturnIdx) {
        // Look for hook calls at top level of the component body
        if (/\buse[A-Z]\w*\s*\(/.test(line)) {
          violations.push({ line: idx + 1, code: line.trim() });
        }
      }
    });

    // Zero hooks allowed after the top-level early return statement
    expect(violations).toEqual([]);
  });

  it('verifies that all hooks in App.jsx are grouped strictly in the initialization preamble', () => {
    const appPath = path.resolve(__dirname, '../App.jsx');
    const appSource = fs.readFileSync(appPath, 'utf8');
    const lines = appSource.split(/\r?\n/);

    // Find the first top-level return in App()
    const firstReturnLine = lines.findIndex(
      (l, idx) => /^\s*if\s*\(.*?\)\s*\{?\s*$/.test(l) && lines[idx + 1]?.includes('return (')
    );

    expect(firstReturnLine).toBeGreaterThan(0);

    // Any hook invocation must occur before firstReturnLine
    lines.forEach((line, idx) => {
      if (/\b(useState|useEffect|useMemo|useCallback|useRef)\s*\(/.test(line)) {
        expect(idx).toBeLessThan(firstReturnLine);
      }
    });
  });
});
