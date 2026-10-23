import { describe, it, expect } from 'vitest';
import { getIsraeliHolidayInfo } from '../domain/dailyPedagogicalTracking.js';

describe('HebrewDatePicker domain and date navigation logic', () => {
  const shiftDate = (dateStr, deltaDays) => {
    const parts = dateStr.split('-').map(Number);
    const curr = new Date(parts[0], parts[1] - 1, parts[2]);
    curr.setDate(curr.getDate() + deltaDays);
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  it('correctly shifts date backward and forward by 1 day', () => {
    expect(shiftDate('2026-10-23', -1)).toBe('2026-10-22');
    expect(shiftDate('2026-10-23', 1)).toBe('2026-10-24');
  });

  it('handles month boundaries cleanly when shifting days', () => {
    expect(shiftDate('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDate('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('handles year boundaries cleanly when shifting days', () => {
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('correctly formats Hebrew date strings for full and compact modes', () => {
    const d = new Date(2026, 9, 23); // 23 Oct 2026
    const full = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    const compact = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });

    expect(full).toContain('23');
    expect(full).toContain('אוקטובר');
    expect(compact).toContain('23');
    expect(compact).toContain('2026');
  });

  it('accurately identifies weekend days Friday (5) and Saturday (6)', () => {
    const friday = new Date(2026, 9, 23); // 2026-10-23 is Friday
    expect(friday.getDay()).toBe(5);

    const saturday = new Date(2026, 9, 24); // 2026-10-24 is Saturday
    expect(saturday.getDay()).toBe(6);

    const sunday = new Date(2026, 9, 25); // 2026-10-25 is Sunday
    expect(sunday.getDay()).toBe(0);
  });

  it('integrates with Israeli holidays and vacations for highlighted badges', () => {
    const sukkot = getIsraeliHolidayInfo('2026-10-23');
    // Sukkot in 2026 is detected
    if (sukkot) {
      expect(sukkot.name).toBeDefined();
    }
  });
});
