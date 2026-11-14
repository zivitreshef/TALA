import React, { useState } from 'react';
import {
  Printer,
  Mail,
  Copy,
  Check,
  X,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  getPedagogicalAccomplishmentsSummary,
  getObservationGaps
} from '../../domain/dailyPedagogicalTracking';
import { buildPedagogicalReminderEmailHtml, sendPedagogicalReminderEmailInBackground, type PedagogicalGap } from '../../emailService';
import { openHtmlPrintWindow } from '../../export/wordAndPrintBuilders';
import { usageTelemetryService } from '../../services/usageTelemetryService';
import { TELEMETRY_EVENTS } from '../../domain/telemetryTaxonomy';
import './TeamMeetingReportModal.css';

export interface TeamMeetingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  userPreferences: any;
  currentUser: { email: string; name?: string };
}

export const TeamMeetingReportModal: React.FC<TeamMeetingReportModalProps> = ({
  isOpen,
  onClose,
  students,
  userPreferences,
  currentUser
}) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const summaryData = getPedagogicalAccomplishmentsSummary(students, 7);
  const rawGaps = getObservationGaps(students, 21);
  const gaps: PedagogicalGap[] = rawGaps.map((g) => ({
    studentName: g.studentName,
    goalTitle: g.goalTitle,
    framework: g.framework,
    environment: g.environment,
    daysSinceObservation: g.daysSinceObservation === null ? undefined : g.daysSinceObservation,
    neverObserved: g.neverObserved,
    currentProgress: g.currentProgress
  }));

  // Derive active coverage
  const studentsWithRecentObs = new Set(
    (summaryData.recentObservations || []).map((o: any) => o.studentId || o.studentName).filter(Boolean)
  );
  const coveredCount = studentsWithRecentObs.size;
  const totalStudentsCount = students.length;

  // Group gaps by student to eliminate duplicates and cleanly list specific goals per student
  const gapMap = new Map<string, PedagogicalGap[]>();
  gaps.forEach((gap) => {
    const stName = gap.studentName || 'תלמיד/ה';
    const list = gapMap.get(stName) || [];
    list.push(gap);
    gapMap.set(stName, list);
  });
  const gapsByStudent = Array.from(gapMap.entries()).map(([studentName, studentGaps]) => ({
    studentName,
    gaps: studentGaps
  }));

  const getEmailHtml = () => {
    return buildPedagogicalReminderEmailHtml({
      teacherName: currentUser?.name || userPreferences?.fullName || 'מורה יקרה',
      accomplishments: summaryData,
      students,
      gaps,
      totalStudents: totalStudentsCount,
      privacyMode: userPreferences?.defaultPrivacyMode || 'full_name',
      siteUrl: window.location.origin + window.location.pathname
    });
  };

  const handlePrint = () => {
    usageTelemetryService.track(
      TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED,
      {
        summaryType: 'staff_meeting',
        studentCount: students.length,
        goalsCount: (summaryData.recentObservations || []).length,
        hasSignificantProgress: (summaryData.recentObservations || []).length > 0
      },
      currentUser.email ? { userContext: { email: currentUser.email } } : {}
    );
    usageTelemetryService.track(
      TELEMETRY_EVENTS.DOCUMENT_SHARED,
      {
        shareFormat: 'print',
        recipientType: 'staff_meeting'
      },
      currentUser.email ? { userContext: { email: currentUser.email } } : {}
    );

    const html = getEmailHtml();
    openHtmlPrintWindow(html);
  };

  const handleCopyText = async () => {
    const lines: string[] = [];
    lines.push(`סיכום פדגוגי שבועי - ${new Date().toLocaleDateString('he-IL')}`);
    lines.push(`תלמידים שקיבלו מענה השבוע: ${coveredCount} מתוך ${totalStudentsCount}`);
    lines.push(`סך תצפיות שתועדו: ${(summaryData.recentObservations || []).length}`);
    lines.push('');

    if (summaryData.recentObservations && summaryData.recentObservations.length > 0) {
      lines.push('תצפיות והישגים אחרונים:');
      summaryData.recentObservations.forEach((obs: any) => {
        lines.push(`• ${obs.studentName || 'תלמיד/ה'} [${obs.goalTitle || 'כללי'}]: ${obs.text || obs.note}`);
      });
      lines.push('');
    }

    if (gaps.length > 0) {
      lines.push('יעדים ללא תיעוד לאחרונה (מעל 21 יום):');
      gaps.forEach((gap) => {
        const timeText = gap.daysSinceObservation !== undefined
          ? `לפני ${gap.daysSinceObservation} ימים`
          : 'טרם תועד';
        lines.push(`• ${gap.studentName} - ${gap.goalTitle} (${timeText})`);
      });
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setStatusMessage({ type: 'success', text: 'הסיכום הועתק ללוח בהצלחה' });
    } catch {
      setStatusMessage({ type: 'error', text: 'שגיאה בהעתקה ללוח' });
    }
  };

  const handleSendToMyself = async () => {
    if (!currentUser.email) return;
    setIsSendingEmail(true);
    setStatusMessage(null);

    try {
      await sendPedagogicalReminderEmailInBackground({
        toEmail: currentUser.email,
        teacherName: currentUser?.name || userPreferences?.fullName || 'מורה יקרה',
        students,
        gaps,
        accomplishments: summaryData,
        totalStudents: totalStudentsCount,
        privacyMode: userPreferences?.defaultPrivacyMode || 'full_name',
        siteUrl: window.location.origin + window.location.pathname
      });

      usageTelemetryService.track(
        TELEMETRY_EVENTS.PEDAGOGICAL_SUMMARY_GENERATED,
        {
          summaryType: 'staff_meeting',
          studentCount: students.length,
          goalsCount: (summaryData.recentObservations || []).length,
          hasSignificantProgress: (summaryData.recentObservations || []).length > 0
        },
        currentUser.email ? { userContext: { email: currentUser.email } } : {}
      );
      usageTelemetryService.track(
        TELEMETRY_EVENTS.DOCUMENT_SHARED,
        {
          shareFormat: 'email',
          recipientType: 'staff_meeting'
        },
        currentUser.email ? { userContext: { email: currentUser.email } } : {}
      );

      setStatusMessage({ type: 'success', text: 'הסיכום נשלח בהצלחה למייל שלך!' });
    } catch {
      setStatusMessage({ type: 'error', text: 'שליחת המייל נכשלה. ניתן להדפיס או להעתיק את הסיכום.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div
      className="team-report-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-report-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="team-report-card" dir="rtl">
        {/* Header */}
        <div className="team-report-header">
          <div className="team-report-title-group">
            <h3 id="team-report-title" className="team-report-title">
              סיכום שבועי לישיבת צוות
            </h3>
            <span className="team-report-date">
              <Calendar size={13} />
              {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button
            type="button"
            className="team-report-close-btn"
            onClick={onClose}
            aria-label="סגירה"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Preview */}
        <div className="team-report-body">
          {/* Summary KPIs */}
          <div className="team-report-kpi-grid">
            <div className="team-report-kpi-card">
              <span className="team-report-kpi-num">
                {coveredCount} / {totalStudentsCount}
              </span>
              <span className="team-report-kpi-label">תלמידים שקיבלו מענה</span>
            </div>
            <div className="team-report-kpi-card">
              <span className="team-report-kpi-num">
                {(summaryData.recentObservations || []).length}
              </span>
              <span className="team-report-kpi-label">תצפיות שתועדו השבוע</span>
            </div>
            <div className="team-report-kpi-card">
              <span className="team-report-kpi-num">
                {gaps.length}
              </span>
              <span className="team-report-kpi-label">ממתינים לתצפית</span>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`team-report-alert ${statusMessage.type}`}>
              {statusMessage.type === 'error' && <AlertCircle size={15} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Recent Observations List */}
          <div className="team-report-section">
            <h4 className="team-report-section-title">תצפיות והתקדמות השבוע</h4>
            {!summaryData.recentObservations || summaryData.recentObservations.length === 0 ? (
              <p className="team-report-empty">לא נרשמו תצפיות ב-7 הימים האחרונים.</p>
            ) : (
              <div className="team-report-obs-list">
                {summaryData.recentObservations.map((obs: any, idx: number) => (
                  <div key={obs.id || idx} className="team-report-obs-item">
                    <div className="team-report-obs-meta">
                      <strong>{obs.studentName || 'תלמיד/ה'}</strong>
                      {obs.goalTitle && <span className="team-report-obs-goal">{obs.goalTitle}</span>}
                      <span className="team-report-obs-date">{obs.date || obs.timestamp?.slice(0, 10)}</span>
                    </div>
                    <p className="team-report-obs-text">{obs.text || obs.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Goals Needing Attention */}
          {gaps.length > 0 && (
            <div className="team-report-section">
              <h4 className="team-report-section-title">יעדים ללא תיעוד לאחרונה (מעל 21 יום)</h4>
              <div className="team-report-attention-groups">
                {gapsByStudent.map(({ studentName, gaps: studentGaps }) => (
                  <div key={studentName} className="team-report-student-gap-card">
                    <div className="team-report-st-header">
                      <span className="team-report-st-name">{studentName}</span>
                      <span className="team-report-st-count">
                        {studentGaps.length === 1 ? 'יעד אחד ממתין' : `${studentGaps.length} יעדים ממתינים`}
                      </span>
                    </div>
                    <div className="team-report-student-goals-list">
                      {studentGaps.map((gap, idx) => (
                        <div key={`${gap.goalTitle}_${idx}`} className="team-report-attention-item">
                          <span className="team-report-goal-title">{gap.goalTitle}</span>
                          <span className="team-report-st-days">
                            {gap.daysSinceObservation === undefined
                              ? 'טרם תועד'
                              : `לפני ${gap.daysSinceObservation} ימים`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="team-report-footer">
          <div className="team-report-actions-group">
            <button
              type="button"
              className="team-report-btn secondary"
              onClick={handleCopyText}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'הועתק!' : 'העתקת טקסט'}</span>
            </button>
            <button
              type="button"
              className="team-report-btn secondary"
              onClick={handleSendToMyself}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Mail size={16} />
              )}
              <span>שליחה למייל שלי</span>
            </button>
          </div>
          <button
            type="button"
            className="team-report-btn primary"
            onClick={handlePrint}
          >
            <Printer size={16} />
            <span>הדפסה או שמירה כקובץ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamMeetingReportModal;
