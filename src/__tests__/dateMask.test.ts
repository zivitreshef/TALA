import { describe, it, expect } from 'vitest';
import { maskDateInput, normalizeDateOnBlur } from '../utils/dateMask';

describe('dateMask utility', () => {
  describe('maskDateInput', () => {
    it('returns empty string on empty input', () => {
      expect(maskDateInput('')).toBe('');
    });

    it('formats 8 consecutive digits to DD/MM/YYYY', () => {
      expect(maskDateInput('10031976')).toBe('10/03/1976');
      expect(maskDateInput('01012020')).toBe('01/01/2020');
    });

    it('adds slashes incrementally while user types', () => {
      expect(maskDateInput('1')).toBe('1');
      expect(maskDateInput('10')).toBe('10/');
      expect(maskDateInput('10/0')).toBe('10/0');
      expect(maskDateInput('1003')).toBe('10/03/');
      expect(maskDateInput('100319')).toBe('10/03/19');
      expect(maskDateInput('10031976')).toBe('10/03/1976');
    });

    it('handles backspace on slash cleanly without getting trapped', () => {
      // User is at '10/' and deletes the '/' -> becomes '1' so they can delete the '0'
      expect(maskDateInput('10', '10/')).toBe('1');
      expect(maskDateInput('10/03', '10/03/')).toBe('10/0');
    });

    it('converts dots or hyphens to slashes', () => {
      expect(maskDateInput('10.03.1976')).toBe('10/03/1976');
      expect(maskDateInput('10-03-1976')).toBe('10/03/1976');
    });

    it('limits output to 10 characters', () => {
      expect(maskDateInput('1003197612345')).toBe('10/03/1976');
    });
  });

  describe('normalizeDateOnBlur', () => {
    it('normalizes 8 raw digits', () => {
      expect(normalizeDateOnBlur('10031976')).toBe('10/03/1976');
    });

    it('normalizes single digit day and month', () => {
      expect(normalizeDateOnBlur('5/3/2020')).toBe('05/03/2020');
      expect(normalizeDateOnBlur('5.3.2020')).toBe('05/03/2020');
      expect(normalizeDateOnBlur('5-3-2020')).toBe('05/03/2020');
    });

    it('normalizes 2-digit years correctly', () => {
      expect(normalizeDateOnBlur('10/03/24')).toBe('10/03/2024');
      expect(normalizeDateOnBlur('10/03/76')).toBe('10/03/1976');
      expect(normalizeDateOnBlur('100376')).toBe('10/03/1976');
    });

    it('returns empty string on empty input', () => {
      expect(normalizeDateOnBlur('')).toBe('');
      expect(normalizeDateOnBlur('   ')).toBe('');
    });
  });
});
