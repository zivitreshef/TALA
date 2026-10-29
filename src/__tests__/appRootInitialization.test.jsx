import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('App Root Hook Ordering & TDZ Prevention (Regression Tests)', () => {
  it('ensures userStudents is declared before any hook references it in App.jsx', () => {
    const appPath = path.resolve(__dirname, '../App.jsx');
    const appSource = fs.readFileSync(appPath, 'utf8');

    const lines = appSource.split(/\r?\n/);
    let userStudentsDeclLine = -1;
    let digestHookLine = -1;

    lines.forEach((line, idx) => {
      if (/const\s+userStudents\s*=\s*getStudentsForUser/.test(line)) {
        userStudentsDeclLine = idx + 1;
      }
      if (/Automated Pedagogical Digest Scheduler/.test(line)) {
        digestHookLine = idx + 1;
      }
    });

    expect(userStudentsDeclLine).toBeGreaterThan(0);
    expect(digestHookLine).toBeGreaterThan(0);
    // Crucial: userStudents declaration must appear BEFORE the digest hook
    expect(digestHookLine).toBeGreaterThan(userStudentsDeclLine);
  });
});
