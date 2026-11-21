import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Unlock,
  PenLine,
  MoreVertical,
  Archive,
  Trash2
} from 'lucide-react';
import {
  getLastObservationInfo,
  formatLastObservationLabel,
  formatCompactLastObservationLabel
} from '../../domain/studentPulse';

export interface StudentCardV4Props {
  student: any;
  currentUserEmail: string;
  isOwnedByUser: boolean;
  onSelectStudent: (studentId: string) => void;
  onQuickRecord: (student: any) => void;
  onArchiveStudent: (student: any, e: React.MouseEvent) => void;
  onDeleteStudent: (student: any, e: React.MouseEvent) => void;
}

export const StudentCardV4: React.FC<StudentCardV4Props> = ({
  student,
  currentUserEmail,
  isOwnedByUser,
  onSelectStudent,
  onQuickRecord,
  onArchiveStudent,
  onDeleteStudent
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const obsInfo = getLastObservationInfo(student);
  const obsLabel = formatLastObservationLabel(obsInfo);
  const compactObsLabel = formatCompactLastObservationLabel(obsInfo);
  const isStale = obsInfo.daysSince === null || obsInfo.daysSince >= 10;

  // Primary actionable status
  const primaryStatus =
    obsInfo.daysSince === null
      ? { label: 'טרם תועדה תצפית', variant: 'attention' as const }
      : isStale
      ? { label: `דרוש תיעוד · ${compactObsLabel}`, variant: 'attention' as const }
      : { label: compactObsLabel, variant: 'fresh' as const };

  // At most ONE secondary indicator when genuinely needed for decision-making
  const normalizedCurrent = (currentUserEmail || '').trim().toLowerCase();
  const normalizedOwner = (student.ownerEmail || '').trim().toLowerCase();
  const isSharedWithMe = Boolean(normalizedOwner && normalizedOwner !== normalizedCurrent);
  const sharedTeamCount = Array.isArray(student.sharedWith)
    ? student.sharedWith.filter(
        (em: string) => String(em || '').trim().toLowerCase() !== normalizedCurrent
      ).length
    : 0;
  const activeGoalsCount = Array.isArray(student.goals)
    ? student.goals.filter((g: any) => g && String(g.title || '').trim()).length
    : 0;

  let secondaryIndicator: { label: string; variant: 'info' | 'warning' } | null = null;
  if (activeGoalsCount === 0) {
    secondaryIndicator = { label: 'טרם הוגדרו מטרות', variant: 'warning' };
  } else if (isSharedWithMe) {
    secondaryIndicator = { label: 'שותף עמך', variant: 'info' };
  } else if (sharedTeamCount > 0) {
    secondaryIndicator = { label: `משותף עם ${sharedTeamCount} בצוות`, variant: 'info' };
  }

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectStudent(student.id);
    }
  };

  return (
    <div
      className="v4-student-card"
      role="button"
      tabIndex={0}
      onClick={() => onSelectStudent(student.id)}
      onKeyDown={handleCardKeyDown}
      aria-label={`פתיחת מרחב העבודה של ${student.name || 'תלמיד ללא שם'}`}
      data-testid={`v4-student-card-${student.id}`}
    >
      <div className="v4-student-card-head">
        <div className="v4-student-identity">
          <div className="v4-student-name-row">
            <h3 className="v4-student-name">{student.name || 'ללא שם'}</h3>
            <span
              className={`v4-lock-icon ${student.isLocked ? 'is-locked' : 'is-unlocked'}`}
              title={
                student.isLocked
                  ? 'התוכנית נעולה לעריכה'
                  : 'התוכנית פתוחה לעריכה'
              }
              aria-label={student.isLocked ? 'תוכנית נעולה' : 'תוכנית פתוחה'}
            >
              {student.isLocked ? <Lock size={13} aria-hidden="true" /> : <Unlock size={13} aria-hidden="true" />}
            </span>
          </div>
          <p className="v4-student-framework">
            {student.educationalFramework || 'ללא מסגרת חינוכית מוגדרת'}
          </p>
        </div>

        {/* Direct Quick Observation + Contextual Kebab Menu */}
        <div
          className="v4-student-card-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="v4-card-action-btn v4-quick-obs-btn"
            onClick={(e) => {
              e.stopPropagation();
              onQuickRecord(student);
            }}
            title={`תיעוד תצפית מהיר עבור ${student.name || 'התלמיד'}`}
            aria-label={`תיעוד תצפית מהיר עבור ${student.name || 'התלמיד'}`}
            data-testid={`v4-quick-obs-${student.id}`}
          >
            <PenLine size={16} aria-hidden="true" />
          </button>

          {isOwnedByUser && (
            <div className="v4-kebab-wrapper" ref={menuRef}>
              <button
                type="button"
                className="v4-card-action-btn v4-kebab-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`פעולות נוספות עבור ${student.name || 'התלמיד'}`}
                title="פעולות נוספות"
                data-testid={`v4-kebab-btn-${student.id}`}
              >
                <MoreVertical size={16} aria-hidden="true" />
              </button>

              {menuOpen && (
                <div
                  className="v4-kebab-menu"
                  role="menu"
                  data-testid={`v4-kebab-menu-${student.id}`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="v4-kebab-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onArchiveStudent(student, e);
                    }}
                    data-testid={`v4-archive-student-${student.id}`}
                  >
                    <Archive size={15} aria-hidden="true" />
                    <span>העברה לארכיון</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="v4-kebab-item is-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDeleteStudent(student, e);
                    }}
                    data-testid={`v4-delete-student-${student.id}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    <span>מחיקת תלמיד</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actionable Status Row: 1 primary + optional 1 secondary */}
      <div className="v4-student-status-row">
        <span
          className={`v4-status-pill v4-status-${primaryStatus.variant}`}
          title={`מועד התצפית האחרונה: ${obsLabel}`}
        >
          <span className="v4-status-dot" aria-hidden="true" />
          <span>{primaryStatus.label}</span>
        </span>

        {secondaryIndicator && (
          <span className={`v4-secondary-pill v4-secondary-${secondaryIndicator.variant}`}>
            {secondaryIndicator.label}
          </span>
        )}
      </div>
    </div>
  );
};
