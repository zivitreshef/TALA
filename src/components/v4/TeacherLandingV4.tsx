import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Calendar,
  Sparkles,
  BookOpen,
  School,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import { ClassPulseStrip } from '../ClassPulseStrip';
import { StudentCardV4 } from './StudentCardV4';
import { getFrameworkKey } from '../../domain/studentListView';
import { getLastObservationInfo } from '../../domain/studentPulse';

export interface TeacherLandingV4Props {
  currentUser: any;
  userStudents: any[];
  filteredStudents: any[];
  frameworkClusters: [string, any[]][];
  studentSearch: string;
  onChangeSearch: (q: string) => void;
  studentSortBy: 'framework' | 'name';
  onChangeSortBy: (sort: 'framework' | 'name') => void;
  userPreferences: any;
  isStudentOwnedByUser: (st: any, user: any) => boolean;
  onAddNewStudent: () => void;
  onSelectStudent: (studentId: string) => void;
  onQuickRecordStudent: (student: any) => void;
  onArchiveStudent: (student: any, e: React.MouseEvent) => void;
  onDeleteStudent: (student: any, e: React.MouseEvent) => void;
  onOpenDailyTracker: () => void;
  onOpenTeamReport: () => void;
  onOptInReminder: () => void;
  onSelectDemoMode?: () => void;
  onOpenIntroVideo?: () => void;
}

export const TeacherLandingV4: React.FC<TeacherLandingV4Props> = ({
  currentUser,
  userStudents,
  filteredStudents,
  frameworkClusters,
  studentSearch,
  onChangeSearch,
  studentSortBy,
  onChangeSortBy,
  userPreferences,
  isStudentOwnedByUser,
  onAddNewStudent,
  onSelectStudent,
  onQuickRecordStudent,
  onArchiveStudent,
  onDeleteStudent,
  onOpenDailyTracker,
  onOpenTeamReport,
  onOptInReminder,
  onSelectDemoMode,
  onOpenIntroVideo
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_attention'>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [showPulsePanel, setShowPulsePanel] = useState<boolean>(false);

  const uniqueFrameworks = useMemo(() => {
    const set = new Set<string>();
    (userStudents || []).forEach((st) => {
      const fw = getFrameworkKey(st);
      if (fw) set.add(fw);
    });
    return Array.from(set);
  }, [userStudents]);

  const needsAttentionCount = useMemo(() => {
    return (userStudents || []).filter((st) => {
      const info = getLastObservationInfo(st);
      return info.daysSince === null || info.daysSince >= 10;
    }).length;
  }, [userStudents]);

  const applyLocalFilters = (list: any[]) => {
    return list.filter((st) => {
      if (statusFilter === 'needs_attention') {
        const info = getLastObservationInfo(st);
        if (info.daysSince !== null && info.daysSince < 10) return false;
      }
      if (frameworkFilter !== 'all') {
        if (getFrameworkKey(st) !== frameworkFilter) return false;
      }
      return true;
    });
  };

  const visibleStudents = useMemo(
    () => applyLocalFilters(filteredStudents),
    [filteredStudents, statusFilter, frameworkFilter]
  );

  const visibleClusters = useMemo(() => {
    return frameworkClusters
      .map(([fw, list]) => [fw, applyLocalFilters(list)] as [string, any[]])
      .filter(([, list]) => list.length > 0);
  }, [frameworkClusters, statusFilter, frameworkFilter]);

  // =========================================================================
  // EXPERIENCE A: FIRST-TIME TEACHER (0 STUDENTS)
  // =========================================================================
  if (!userStudents || userStudents.length === 0) {
    return (
      <section
        className="v4-empty-landing"
        dir="rtl"
        data-testid="v4-new-teacher-landing"
      >
        <div className="v4-empty-landing-card">
          <div className="v4-empty-icon-box" aria-hidden="true">
            <UserPlus size={30} />
          </div>
          <h2 className="v4-empty-title">
            שלום {currentUser?.name || ''}, ברוכה הבאה לסביבת העבודה שלך
          </h2>
          <p className="v4-empty-desc">
            כאן תוכלי לנהל את תוכניות העבודה האישיות, להגדיר מטרות פדגוגיות ולתעד תצפיות יומיות במקום אחד.
            כדי להתחיל, הוסיפי את התלמיד או התלמידה הראשונים שלך.
          </p>

          <button
            type="button"
            className="v4-btn-primary v4-btn-lg"
            onClick={onAddNewStudent}
            data-testid="v4-first-student-cta"
          >
            <UserPlus size={18} aria-hidden="true" />
            <span>הוספת תלמיד/ה ראשונ/ה</span>
          </button>

          {(onSelectDemoMode || onOpenIntroVideo) && (
            <div className="v4-empty-secondary-links">
              {onSelectDemoMode && (
                <button
                  type="button"
                  className="v4-text-link-btn"
                  onClick={onSelectDemoMode}
                >
                  <Sparkles size={15} aria-hidden="true" />
                  <span>התנסות עם תלמיד לדוגמה</span>
                </button>
              )}
              {onOpenIntroVideo && (
                <button
                  type="button"
                  className="v4-text-link-btn"
                  onClick={onOpenIntroVideo}
                >
                  <BookOpen size={15} aria-hidden="true" />
                  <span>צפייה בסרטון היכרות קצר</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // =========================================================================
  // EXPERIENCE B: RETURNING TEACHER (STUDENT ROSTER HERO)
  // =========================================================================
  const firstCandidateForQuickObs =
    visibleStudents.find((st) => {
      const info = getLastObservationInfo(st);
      return info.daysSince === null || info.daysSince >= 10;
    }) || visibleStudents[0] || userStudents[0];

  return (
    <section
      className="v4-returning-landing"
      dir="rtl"
      data-testid="v4-returning-teacher-landing"
    >
      {/* Header Row: Calm Greeting + One Dominant Primary Action */}
      <div className="v4-landing-top-row">
        <div className="v4-landing-greeting">
          <h2 className="v4-landing-title">שלום, {currentUser?.name || ''}</h2>
          <p className="v4-landing-subtitle">
            {userStudents.length === 1
              ? 'תלמיד/ה 1 פעיל/ה בסביבת העבודה שלך'
              : `${userStudents.length} תלמידים פעילים בסביבת העבודה שלך`}
            {needsAttentionCount > 0 ? ` · ${needsAttentionCount} ממתינים לתיעוד` : ''}
          </p>
        </div>

        <div className="v4-landing-cta-group">
          <button
            type="button"
            className="v4-btn-secondary"
            onClick={() => {
              if (firstCandidateForQuickObs) {
                onQuickRecordStudent(firstCandidateForQuickObs);
              } else {
                onOpenDailyTracker();
              }
            }}
            title="תיעוד תצפית יומית מהירה"
            data-testid="v4-quick-observation-cta"
          >
            <Calendar size={16} aria-hidden="true" />
            <span>תיעוד תצפית מהיר</span>
          </button>

          <button
            type="button"
            className="v4-btn-primary"
            onClick={onAddNewStudent}
            data-testid="v4-add-student-cta"
          >
            <UserPlus size={16} aria-hidden="true" />
            <span>תלמיד/ה חדש/ה</span>
          </button>
        </div>
      </div>

      {/* Collapsible Weekly Class Pulse Disclosure (Preserves ClassPulseStrip without clutter) */}
      <div className="v4-pulse-disclosure">
        <button
          type="button"
          className="v4-pulse-toggle-btn"
          onClick={() => setShowPulsePanel((prev) => !prev)}
          aria-expanded={showPulsePanel}
          data-testid="v4-pulse-toggle-btn"
        >
          <span className="v4-pulse-toggle-label">
            <Activity size={15} aria-hidden="true" />
            <span>תמונת מצב שבועית ורצף תיעוד</span>
          </span>
          {showPulsePanel ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </button>

        {showPulsePanel && (
          <div className="v4-pulse-body">
            <ClassPulseStrip
              students={userStudents}
              userPreferences={userPreferences}
              onQuickRecordStudent={onQuickRecordStudent}
              onOpenTeamReport={onOpenTeamReport}
              onOptInReminder={onOptInReminder}
            />
          </div>
        )}
      </div>

      {/* Unified Search, Filter Pills & Sort Toolbar */}
      <div className="v4-roster-toolbar">
        <div className="v4-search-box">
          <Search size={16} className="v4-search-icon" aria-hidden="true" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="חיפוש לפי שם תלמיד/ה או מסגרת חינוכית..."
            aria-label="חיפוש תלמידים"
            data-testid="v4-student-search-input"
          />
        </div>

        <div className="v4-filter-pills" role="group" aria-label="סינון רשימת תלמידים">
          <button
            type="button"
            className={`v4-filter-pill ${statusFilter === 'all' && frameworkFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('all');
              setFrameworkFilter('all');
            }}
            data-testid="v4-filter-all"
          >
            הכל ({userStudents.length})
          </button>

          {needsAttentionCount > 0 && (
            <button
              type="button"
              className={`v4-filter-pill ${statusFilter === 'needs_attention' ? 'active' : ''}`}
              onClick={() =>
                setStatusFilter((prev) => (prev === 'needs_attention' ? 'all' : 'needs_attention'))
              }
              data-testid="v4-filter-attention"
            >
              דרוש תיעוד ({needsAttentionCount})
            </button>
          )}

          {uniqueFrameworks.length > 1 &&
            uniqueFrameworks.slice(0, 4).map((fw) => (
              <button
                key={fw}
                type="button"
                className={`v4-filter-pill ${frameworkFilter === fw ? 'active' : ''}`}
                onClick={() => setFrameworkFilter((prev) => (prev === fw ? 'all' : fw))}
              >
                {fw}
              </button>
            ))}
        </div>

        <div className="v4-sort-control">
          <label htmlFor="v4-sort-select" className="v4-sort-label">
            מיון:
          </label>
          <select
            id="v4-sort-select"
            value={studentSortBy}
            onChange={(e) => onChangeSortBy(e.target.value as 'framework' | 'name')}
            className="v4-sort-select"
          >
            <option value="framework">לפי מסגרת חינוכית</option>
            <option value="name">לפי שם תלמיד/ה</option>
          </select>
        </div>
      </div>

      {/* Student Roster Grid */}
      {visibleStudents.length === 0 ? (
        <div className="v4-no-matches" data-testid="v4-no-matches">
          <p>לא נמצאו תלמידים התואמים לחיפוש או לסינון שנבחר.</p>
          <button
            type="button"
            className="v4-btn-secondary"
            onClick={() => {
              onChangeSearch('');
              setStatusFilter('all');
              setFrameworkFilter('all');
            }}
          >
            איפוס סינון
          </button>
        </div>
      ) : studentSortBy === 'framework' ? (
        <div className="v4-framework-groups">
          {visibleClusters.map(([frameworkName, clusterStudents]) => (
            <div key={frameworkName} className="v4-framework-section">
              <div className="v4-framework-header">
                <span className="v4-framework-title">
                  <School size={16} aria-hidden="true" />
                  <strong>{frameworkName}</strong>
                </span>
                <span className="v4-framework-count">
                  {clusterStudents.length === 1
                    ? 'תלמיד/ה 1'
                    : `${clusterStudents.length} תלמידים`}
                </span>
              </div>
              <div className="v4-student-grid">
                {clusterStudents.map((st) => (
                  <StudentCardV4
                    key={st.id}
                    student={st}
                    currentUserEmail={currentUser?.email || ''}
                    isOwnedByUser={isStudentOwnedByUser(st, currentUser)}
                    onSelectStudent={onSelectStudent}
                    onQuickRecord={onQuickRecordStudent}
                    onArchiveStudent={onArchiveStudent}
                    onDeleteStudent={onDeleteStudent}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="v4-student-grid">
          {visibleStudents.map((st) => (
            <StudentCardV4
              key={st.id}
              student={st}
              currentUserEmail={currentUser?.email || ''}
              isOwnedByUser={isStudentOwnedByUser(st, currentUser)}
              onSelectStudent={onSelectStudent}
              onQuickRecord={onQuickRecordStudent}
              onArchiveStudent={onArchiveStudent}
              onDeleteStudent={onDeleteStudent}
            />
          ))}
        </div>
      )}
    </section>
  );
};
