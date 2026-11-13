import React from 'react';
import {
  Flame,
  FileText,
  Mic,
  Bell,
  Users,
  AlertTriangle
} from 'lucide-react';
import { computeClassPulse } from '../domain/studentPulse';
import './ClassPulseStrip.css';

export interface ClassPulseStripProps {
  students: any[];
  userPreferences: any;
  onQuickRecordStudent: (student: any) => void;
  onOpenTeamReport: () => void;
  onOptInReminder?: () => void;
}

export const ClassPulseStrip: React.FC<ClassPulseStripProps> = ({
  students,
  userPreferences,
  onQuickRecordStudent,
  onOpenTeamReport,
  onOptInReminder
}) => {
  if (!students || students.length === 0) {
    return null;
  }

  const pulse = computeClassPulse(students);
  const showReminderPrompt =
    !userPreferences?.pedagogicalReminderEnabled &&
    !userPreferences?.monthlyPedagogicalReminder &&
    Boolean(onOptInReminder);

  const percentage =
    pulse.total > 0
      ? Math.round((pulse.documentedThisWeek / pulse.total) * 100)
      : 0;

  const waitingList = Array.isArray(pulse.waiting) ? pulse.waiting : [];

  return (
    <div className="class-pulse-strip" dir="rtl" aria-label="דופק כיתתי ומוכנות לצוות">
      {/* Top Banner / Opt-In if not enabled */}
      {showReminderPrompt && (
        <div className="class-pulse-reminder-banner">
          <div className="class-pulse-reminder-text">
            <Bell size={16} className="class-pulse-bell-icon" />
            <span>לקבל סיכום שבועי למייל בימי חמישי עם כל ההתקדמות של הכיתה?</span>
          </div>
          <button
            type="button"
            className="class-pulse-reminder-btn"
            onClick={onOptInReminder}
          >
            הפעלת סיכום שבועי
          </button>
        </div>
      )}

      {/* Main Metrics Bar */}
      <div className="class-pulse-main">
        {/* Coverage Stat */}
        <div className="class-pulse-stat-block">
          <div className="class-pulse-stat-header">
            <Users size={16} className="class-pulse-stat-icon" />
            <span className="class-pulse-stat-title">מענה שבועי</span>
          </div>
          <div className="class-pulse-stat-value-group">
            <span className="class-pulse-stat-value">
              {pulse.documentedThisWeek} / {pulse.total}
            </span>
            <span className="class-pulse-stat-subtitle">תלמידים תועדו השבוע</span>
          </div>
          {/* Progress bar */}
          <div className="class-pulse-progress-track">
            <div
              className="class-pulse-progress-fill"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>

        {/* Streak Stat */}
        <div className="class-pulse-stat-block streak">
          <div className="class-pulse-stat-header">
            <Flame size={16} className="class-pulse-streak-icon" />
            <span className="class-pulse-stat-title">רצף תיעוד פעיל</span>
          </div>
          <div className="class-pulse-stat-value-group">
            <span className="class-pulse-stat-value streak">
              {pulse.streakDays} {pulse.streakDays === 1 ? 'יום' : 'ימים'}
            </span>
            <span className="class-pulse-stat-subtitle">
              {pulse.streakDays > 0 ? 'כל הכבוד על ההתמדה!' : 'התחילי לתעד היום'}
            </span>
          </div>
        </div>

        {/* Team Meeting Quick Action */}
        <div className="class-pulse-action-block">
          <button
            type="button"
            className="class-pulse-team-report-btn"
            onClick={onOpenTeamReport}
          >
            <FileText size={16} />
            <span>דוח לישיבת צוות</span>
          </button>
        </div>
      </div>

      {/* Students Needing Attention (Waiting > 10 Days) */}
      {waitingList.length > 0 && (
        <div className="class-pulse-waiting-section">
          <div className="class-pulse-waiting-header">
            <AlertTriangle size={14} className="class-pulse-alert-icon" />
            <span>תלמידים הממתינים לתצפית מעל 10 ימים:</span>
          </div>
          <div className="class-pulse-waiting-chips">
            {waitingList.slice(0, 3).map((w) => {
              const matchedStudent = students.find((s) => s.id === w.id);
              const obsLabel =
                w.daysSince === null
                  ? 'טרם תועד'
                  : `לפני ${w.daysSince} ימים`;
              return (
                <div key={w.id} className="class-pulse-student-chip">
                  <span className="class-pulse-chip-name">{w.name}</span>
                  <span className="class-pulse-chip-days">{obsLabel}</span>
                  {matchedStudent && (
                    <button
                      type="button"
                      className="class-pulse-chip-mic-btn"
                      title={`תיעוד מהיר עבור ${w.name}`}
                      onClick={() => onQuickRecordStudent(matchedStudent)}
                    >
                      <Mic size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassPulseStrip;
