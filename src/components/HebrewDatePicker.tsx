import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { getIsraeliHolidayInfo } from '../domain/dailyPedagogicalTracking';
import type { IsraeliHolidayInfo } from '../domain/types';
import './HebrewDatePicker.css';

const HEBREW_WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const;

export interface HebrewDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  showDayNav?: boolean;
  compact?: boolean;
  showWeekday?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  className?: string;
}

export function parseDateToParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  return null;
}

export default function HebrewDatePicker({
  value,
  onChange,
  showDayNav = false,
  compact = false,
  showWeekday = false,
  ariaLabel = 'בחירת תאריך',
  disabled = false,
  fullWidth = false,
  placeholder,
  className = ''
}: HebrewDatePickerProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 340 && rect.top > 340) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const parsedValue = useMemo(() => parseDateToParts(value), [value]);

  const selectedDateStr = useMemo(() => {
    if (parsedValue) {
      return `${parsedValue.year}-${String(parsedValue.month).padStart(2, '0')}-${String(parsedValue.day).padStart(2, '0')}`;
    }
    return todayStr;
  }, [parsedValue, todayStr]);

  // Month currently displayed in the picker popup
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (parsedValue) {
      return new Date(parsedValue.year, parsedValue.month - 1, parsedValue.day);
    }
    const parts = todayStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2] || 1);
  });

  // Keep viewDate in sync when value changes or picker is opened
  useEffect(() => {
    if (parsedValue) {
      setViewDate(new Date(parsedValue.year, parsedValue.month - 1, parsedValue.day));
    }
  }, [parsedValue, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('he-IL', { month: 'long' });
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const handlePrevMonth = (): void => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (): void => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (dayNum: number): void => {
    const nextStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    onChange(nextStr);
    setIsOpen(false);
  };

  const handleShiftDay = (deltaDays: number): void => {
    try {
      const parts = selectedDateStr.split('-').map(Number);
      const curr = new Date(parts[0], parts[1] - 1, parts[2]);
      curr.setDate(curr.getDate() + deltaDays);
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    } catch (_) {}
  };

  const shouldShowWeekday = showWeekday || (showDayNav && !compact);

  const formattedDisplayDate = useMemo(() => {
    if (!value && placeholder) {
      return placeholder;
    }
    try {
      const parts = selectedDateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (compact) {
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      if (shouldShowWeekday) {
        return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
      }
      return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (_) {
      return value || selectedDateStr;
    }
  }, [selectedDateStr, compact, shouldShowWeekday, value, placeholder]);

  const activeHoliday = useMemo<IsraeliHolidayInfo | null>(
    () => (value ? getIsraeliHolidayInfo(selectedDateStr) : null),
    [value, selectedDateStr]
  );

  return (
    <div
      className={`hdp-root ${compact ? 'hdp-compact' : ''} ${fullWidth ? 'hdp-full-width' : ''} ${isOpen ? 'is-open' : ''} ${className}`.trim()}
      ref={containerRef}
      dir="rtl"
    >
      <input type="hidden" value={value || ''} disabled={disabled} readOnly />
      {showDayNav && (
        <div className="hdp-nav-group" dir="ltr">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && handleShiftDay(-1)}
            className="hdp-step-btn"
            title="יום קודם"
            aria-label="יום קודם"
          >
            <ChevronLeft size={15} />
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(todayStr)}
            className={`hdp-today-chip ${selectedDateStr === todayStr ? 'is-active' : ''}`}
            title="עבור להיום"
          >
            היום
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && handleShiftDay(1)}
            className="hdp-step-btn"
            title="יום הבא"
            aria-label="יום הבא"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      <div className="hdp-trigger-wrapper">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`hdp-trigger-btn ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
        >
          <div className="hdp-trigger-content">
            <CalendarIcon size={14} className="hdp-cal-icon" />
            <span className={`hdp-date-text ${!value && placeholder ? 'hdp-placeholder' : ''}`}>
              {formattedDisplayDate}
            </span>
            {activeHoliday && (
              <span
                className={`hdp-holiday-pill ${activeHoliday.isVacation ? 'pill-vacation' : 'pill-observance'}`}
                title={`${activeHoliday.name} (${activeHoliday.statusText})`}
              >
                {activeHoliday.isVacation ? '🏖️' : '🕯️'} {activeHoliday.shortName}
              </span>
            )}
          </div>
          <ChevronDown size={13} className="hdp-chevron-icon" />
        </button>

        {isOpen && (
          <>
            <div className="hdp-backdrop" onClick={() => setIsOpen(false)} />
            <div className={`hdp-popover ${openUpward ? 'open-upward' : ''}`} dir="rtl">
              {/* Header */}
              <div className="hdp-popover-header" dir="ltr">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="hdp-month-arrow"
                  title="חודש קודם"
                  aria-label="חודש קודם"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="hdp-month-title">
                  <strong>{monthName} {viewYear}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="hdp-month-arrow"
                  title="חודש הבא"
                  aria-label="חודש הבא"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Weekdays */}
              <div className="hdp-weekdays-grid" dir="ltr">
                {HEBREW_WEEKDAYS.map((wd, idx) => (
                  <span
                    key={idx}
                    dir="rtl"
                    className={`hdp-weekday-col ${idx === 5 || idx === 6 ? 'is-weekend' : ''}`}
                  >
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="hdp-days-grid" dir="ltr">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`empty-${i}`} className="hdp-day-empty" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = dayStr === selectedDateStr;
                  const isToday = dayStr === todayStr;
                  const dayOfWeek = (firstDayOfWeek + idx) % 7;
                  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                  const holiday = getIsraeliHolidayInfo(dayStr);

                  return (
                    <button
                      type="button"
                      key={dayStr}
                      onClick={() => handleSelectDay(dayNum)}
                      className={`hdp-day-cell ${isSelected ? 'is-selected' : ''} ${isToday && !isSelected ? 'is-today' : ''} ${isWeekend && !isSelected ? 'is-weekend' : ''} ${holiday && !isSelected ? (holiday.isVacation ? 'is-vacation' : 'is-observance') : ''}`}
                      title={holiday ? `${dayStr} • ${holiday.name} (${holiday.statusText})` : dayStr}
                    >
                      <span className="hdp-day-num">{dayNum}</span>
                      {holiday && (
                        <span
                          className={`hdp-day-holiday-dot ${holiday.isVacation ? 'dot-vacation' : 'dot-observance'}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="hdp-popover-footer">
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayStr);
                    setIsOpen(false);
                  }}
                  className="hdp-footer-today-btn"
                >
                  עבור להיום
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="hdp-footer-close-btn"
                >
                  סגור
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
