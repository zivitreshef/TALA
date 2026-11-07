/**
 * Utility functions for date input masking and formatting in DD/MM/YYYY format.
 */

/**
 * Automatically masks and formats user date input as DD/MM/YYYY while typing or pasting.
 */
export function maskDateInput(value: string, prevValue: string = ''): string {
  if (!value) return '';

  // Handle backspace when deleting a slash
  if (prevValue && value.length < prevValue.length) {
    if (prevValue.endsWith('/') && value === prevValue.slice(0, -1)) {
      return value.slice(0, -1);
    }
    return value;
  }

  // Normalize common separators
  const cleanInput = value.replace(/[.\-\s]/g, '/');

  // Extract digits
  const digits = cleanInput.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length <= 2) {
    if (digits.length === 2 && (cleanInput.length >= 2 || cleanInput.endsWith('/'))) {
      return `${digits}/`;
    }
    return digits;
  }

  if (digits.length <= 4) {
    const day = digits.slice(0, 2);
    const month = digits.slice(2);
    if (month.length === 2) {
      return `${day}/${month}/`;
    }
    return `${day}/${month}`;
  }

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${day}/${month}/${year}`;
}

/**
 * Normalizes date string on blur to ensure well-formed DD/MM/YYYY.
 * Handles:
 * - 8 raw digits (e.g. 10031976 -> 10/03/1976)
 * - 6 raw digits (e.g. 100376 -> 10/03/1976)
 * - Single digit day/month (e.g. 5/3/2020 -> 05/03/2020)
 * - 2-digit year (e.g. 10/03/24 -> 10/03/2024, 10/03/76 -> 10/03/1976)
 * - Dot and dash separators (e.g. 10.03.1976 -> 10/03/1976)
 */
export function normalizeDateOnBlur(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  // Check 8 raw digits
  const raw8 = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (raw8) {
    return `${raw8[1]}/${raw8[2]}/${raw8[3]}`;
  }

  // Check 6 raw digits DDMMYY
  const raw6 = trimmed.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (raw6) {
    let yr = parseInt(raw6[3], 10);
    yr += yr >= 30 ? 1900 : 2000;
    return `${raw6[1]}/${raw6[2]}/${yr}`;
  }

  // Check separated formats (/, ., -, space)
  const parts = trimmed.split(/[/.\-\s]+/);
  if (parts.length === 3) {
    const [rawDay, rawMonth, rawYear] = parts;
    if (rawDay && rawMonth && rawYear) {
      const day = rawDay.padStart(2, '0');
      const month = rawMonth.padStart(2, '0');
      let year = rawYear;
      if (year.length === 2) {
        let yr = parseInt(year, 10);
        yr += yr >= 30 ? 1900 : 2000;
        year = String(yr);
      }
      return `${day}/${month}/${year}`;
    }
  }

  return trimmed;
}
