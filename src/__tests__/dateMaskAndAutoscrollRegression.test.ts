import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDate, calcAgeYears } from '../studentStage';
import { maskDateInput, normalizeDateOnBlur } from '../utils/dateMask';

describe('Regression: Date Input Masking and Auto-Scroll Elimination', () => {
  it('parses raw 8-digit birth date without slashes in parseDate and calcAgeYears', () => {
    const parsed = parseDate('10031976');
    expect(parsed).not.toBeNull();
    expect(parsed?.getDate()).toBe(10);
    expect(parsed?.getMonth()).toBe(2); // March (0-indexed)
    expect(parsed?.getFullYear()).toBe(1976);

    const age = calcAgeYears('10031976', new Date(2026, 2, 10));
    expect(age).toBeCloseTo(50, 1);
  });

  it('masks teacher raw digit entry from 10031976 into DD/MM/YYYY format 10/03/1976', () => {
    const formatted = maskDateInput('10031976');
    expect(formatted).toBe('10/03/1976');
  });

  it('normalizes single digit day and month on blur (e.g. 5/3/2020 -> 05/03/2020)', () => {
    expect(normalizeDateOnBlur('5/3/2020')).toBe('05/03/2020');
    expect(normalizeDateOnBlur('10031976')).toBe('10/03/1976');
  });

  it('guarantees autoSaveTimer in EcologicalWorkPlanForm does NOT scroll to section 3', () => {
    const formCode = fs.readFileSync(path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx'), 'utf8');

    // Find the autoSaveTimer block
    const autoSaveBlockMatch = formCode.match(/const autoSaveTimer = setTimeout\(\(\) => \{([\s\S]*?)\}, 2500\);/);
    expect(autoSaveBlockMatch).not.toBeNull();
    const autoSaveBlockContent = autoSaveBlockMatch ? autoSaveBlockMatch[1] : '';

    // Verify section3Ref scrollIntoView is strictly NOT present inside autoSaveTimer
    expect(autoSaveBlockContent).not.toContain('section3Ref');
    expect(autoSaveBlockContent).not.toContain('scrollIntoView');
  });

  it('ensures teacher chat placeholder is compact and does not contain overflowing Ctrl+V', () => {
    const chatCode = fs.readFileSync(path.resolve(__dirname, '../components/chat/TeacherChatWidget.tsx'), 'utf8');
    expect(chatCode).toContain('"כתוב/י הודעה (ניתן להדביק צילום מסך)..."');
    expect(chatCode).not.toContain('"כתוב/י הודעה (ניתן להדביק צילום מסך ב-Ctrl+V)..."');
  });
});
