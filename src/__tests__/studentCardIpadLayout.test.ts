import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { formatCompactLastObservationLabel, formatLastObservationLabel } from '../domain/studentPulse';

describe('Student Card iPad & Tablet Layout Gate (v3.0.12)', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const rawCss = fs.readFileSync(cssPath, 'utf8');
  const css = rawCss.replace(/\r\n/g, '\n');

  describe('CSS layout and responsiveness rules', () => {
    it('sets responsive breakpoint to 1080px to accommodate iPad landscape viewports', () => {
      expect(css).toContain('@media (max-width: 1080px) {');
      expect(css).toContain('.inside-landing-cards-grid {\n    grid-template-columns: 1fr;\n  }');
    });

    it('ensures student cards have minimum 310px width and hidden horizontal overflow', () => {
      expect(css).toContain('grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));');
      expect(css).toContain('overflow-x: hidden;');
    });

    it('contains integrated action cluster inside the student card container', () => {
      expect(css).toContain('.inside-landing-student-clickable {');
      expect(css).toContain('.inside-st-actions {');
      expect(css).toContain('.inside-landing-student-mic-btn {');
      expect(css).toContain('.inside-st-arrow-btn {');
    });

    it('ensures mic button has 32x32px unified touch dimension', () => {
      expect(css).toContain('width: 32px;');
      expect(css).toContain('height: 32px;');
      expect(css).toContain('flex: 0 0 32px;');
    });
  });

  describe('Compact observation badges', () => {
    it('formats compact observation labels without redundant "תצפית אחרונה:" prefix', () => {
      expect(formatCompactLastObservationLabel({ lastMs: null, daysSince: null })).toBe('טרם תועד');
      expect(formatCompactLastObservationLabel({ lastMs: 1, daysSince: 0 })).toBe('היום');
      expect(formatCompactLastObservationLabel({ lastMs: 1, daysSince: 1 })).toBe('אתמול');
      expect(formatCompactLastObservationLabel({ lastMs: 1, daysSince: 7 })).toBe('לפני 7 ימים');
    });

    it('preserves full verbose label for tooltip titles', () => {
      expect(formatLastObservationLabel({ lastMs: 1, daysSince: 7 })).toBe('תצפית אחרונה: לפני 7 ימים');
    });
  });
});
