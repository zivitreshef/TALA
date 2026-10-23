import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { getIsraeliHolidayInfo } from '../domain/dailyPedagogicalTracking';
import './HebrewDatePicker.css';

const HEBREW_WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function HebrewDatePicker({
  value,
  onChange,
  showDayNav = false,
  compact = false,
  ariaLabel = 'בחירת תאריך'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const selectedDateStr = value || todayStr;

  // Month currently displayed in the picker popup
  const [viewDate, setViewDate] = useState(() => {
    const parts = selectedDateStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2] || 1);
  });

  // Keep viewDate in sync when value changes or picker is opened
  useEffect(() => {
    if (value) {
      const parts = value.split('-').map(Number);
      if (parts.length === 3 && !parts.some(Number.isNaN)) {
        setViewDate(new Date(parts[0], parts[1] - 1, parts[2]));
      }
    }
  }, [value, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
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

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (dayNum) => {
    const nextStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    onChange(nextStr);
    setIsOpen(false);
  };

  const handleShiftDay = (deltaDays) => {
    try {
      const parts = selectedDateStr.split('-').map(Number);
      const curr = new Date(parts[0], parts[1] - 1, parts[2]);
      curr.setDate(curr.getDate() + deltaDays);
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    } catch {}
  };

  const formattedDisplayDate = useMemo(() => {
    try {
      const parts = selectedDateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (compact) {
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr, compact]);

  const activeHoliday = useMemo(() => getIsraeliHolidayInfo(selectedDateStr), [selectedDateStr]);

  return (
    <div className={`hdp-root ${compact ? 'hdp-compact' : ''}`} ref={containerRef} dir="rtl">
      {showDayNav && (
        <div className="hdp-nav-group">
          <button
            type="button"
            onClick={() => handleShiftDay(-1)}
            className="hdp-step-btn"
            title="יום קודם"
            aria-label="יום קודם"
          >
            <ChevronRight size={15} />
          </button>

          <button
            type="button"
            onClick={() => onChange(todayStr)}
            className={`hdp-today-chip ${selectedDateStr === todayStr ? 'is-active' : ''}`}
            title="עבור להיום"
          >
            היום
          </button>

          <button
            type="button"
            onClick={() => handleShiftDay(1)}
            className="hdp-step-btn"
            title="יום הבא"
            aria-label="יום הבא"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      )}

      <div className="hdp-trigger-wrapper">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`hdp-trigger-btn ${isOpen ? 'is-open' : ''}`}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
        >
          <CalendarIcon size={14} className="hdp-cal-icon" />
          <span className="hdp-date-text">{formattedDisplayDate}</span>
          {activeHoliday && (
            <span
              className={`hdp-holiday-pill ${activeHoliday.isVacation ? 'pill-vacation' : 'pill-observance'}`}
              title={`${activeHoliday.name} (${activeHoliday.statusText})`}
            >
              {activeHoliday.isVacation ? '🏖️' : '🕯️'} {activeHoliday.shortName}
            </span>
          )}
          <ChevronDown size={13} className="hdp-chevron-icon" />
        </button>

        {isOpen && (
          <>
            <div className="hdp-backdrop" onClick={() => setIsOpen(false)} />
            <div className="hdp-popover" dir="rtl">
              {/* Header */}
              <div className="hdp-popover-header">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="hdp-month-arrow"
                  title="חודש קודם"
                >
                  <ChevronRight size={16} />
                </button>

                <div className="hdp-month-title">
                  <strong>{monthName} {viewYear}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="hdp-month-arrow"
                  title="חודש הבא"
                >
                  <ChevronLeft size={16} />
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
