import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Users,
  Check,
  X,
  Lock,
  Activity
} from 'lucide-react';
import {
  NO_FRAMEWORK_LABEL,
  getFrameworkKey,
  compareFrameworks,
  computeStudentReadiness,
  computeClassReadinessSummary,
  filterStudentsByReadiness,
  filterStudentsBySearch,
  type StudentListItem,
  type ReadinessFilterKey,
  type ReadinessStatus
} from '../domain/studentListView';
import {
  computeBehaviorStudentReadiness,
  computeBehaviorReadinessSummary,
  filterStudentsByBehaviorReadiness,
  type BehaviorReadinessFilterKey,
  type BehaviorReadinessSummary
} from '../domain/behaviorAnalysis';

export interface ClassReadinessOverviewProps {
  students?: StudentListItem[] | null;
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
    title?: string;
    [key: string]: unknown;
  } | null;
  isBehaviorAnalyst?: boolean;
  onSelectStudent?: (
    studentId: string,
    preferredDocType?: 'behavior_assessment' | 'behavior_plan' | 'pedagogical_plan'
  ) => void;
  onClose?: () => void;
}

interface PedagogicalFilterOption {
  key: ReadinessFilterKey;
  label: string;
  getCount: (summary: ReturnType<typeof computeClassReadinessSummary>) => number;
}

const PEDAGOGICAL_FILTER_OPTIONS: readonly PedagogicalFilterOption[] = [
  { key: 'all', label: 'כל התלמידים', getCount: (s) => s.total },
  { key: 'missing_parents', label: 'חסר קול הורים', getCount: (s) => s.missingParentsCount },
  { key: 'missing_eval', label: 'חסרה הערכת אמצע', getCount: (s) => s.missingEvalCount },
  { key: 'missing_goals', label: 'חסרות מטרות פעילות', getCount: (s) => s.missingGoalsCount },
  { key: 'ready', label: 'מוכנים לוועדה', getCount: (s) => s.readyCount }
];

interface BehaviorFilterOption {
  key: BehaviorReadinessFilterKey;
  label: string;
  getCount: (summary: BehaviorReadinessSummary) => number;
}

const BEHAVIOR_FILTER_OPTIONS: readonly BehaviorFilterOption[] = [
  { key: 'all', label: 'כל התלמידים', getCount: (s) => s.total },
  { key: 'missing_baseline', label: 'חסרים נתוני בסיס', getCount: (s) => s.missingBaselineCount },
  { key: 'missing_hypothesis', label: 'חסרה השערה תפקודית', getCount: (s) => s.missingHypothesisCount },
  { key: 'missing_replacement', label: 'חסרה התנהגות חלופית', getCount: (s) => s.missingReplacementCount },
  { key: 'missing_tracking', label: 'ללא מעקב שוטף', getCount: (s) => s.missingTrackingCount },
  { key: 'ready', label: 'מוכנים לישיבת צוות', getCount: (s) => s.readyCount }
];

function getPedagogicalStatusVisuals(status: ReadinessStatus) {
  if (status === 'ready') {
    return {
      text: 'מוכן לוועדה',
      dotColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.14)',
      badgeColor: '#047857',
      badgeBorder: 'rgba(16, 185, 129, 0.35)'
    };
  }
  if (status === 'partial') {
    return {
      text: 'בתהליך',
      dotColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#b45309',
      badgeBorder: 'rgba(245, 158, 11, 0.38)'
    };
  }
  return {
    text: 'דורש השלמה',
    dotColor: '#f43f5e',
    badgeBg: 'rgba(244, 63, 94, 0.14)',
    badgeColor: '#be123c',
    badgeBorder: 'rgba(244, 63, 94, 0.35)'
  };
}

function getBehaviorStatusVisuals(status: ReadinessStatus) {
  if (status === 'ready') {
    return {
      text: 'מוכן לישיבה',
      dotColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.14)',
      badgeColor: '#047857',
      badgeBorder: 'rgba(16, 185, 129, 0.35)'
    };
  }
  if (status === 'partial') {
    return {
      text: 'בתהליך',
      dotColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#b45309',
      badgeBorder: 'rgba(245, 158, 11, 0.38)'
    };
  }
  return {
    text: 'דורש השלמה',
    dotColor: '#f43f5e',
    badgeBg: 'rgba(244, 63, 94, 0.14)',
    badgeColor: '#be123c',
    badgeBorder: 'rgba(244, 63, 94, 0.35)'
  };
}

export default function ClassReadinessOverview({
  students = [],
  currentUser,
  isBehaviorAnalyst,
  onSelectStudent
}: ClassReadinessOverviewProps): React.JSX.Element {
  const safeStudents = useMemo(
    () => (Array.isArray(students) ? students : []),
    [students]
  );

  const isAnalystUser = Boolean(
    isBehaviorAnalyst ??
      (currentUser?.role === 'behavior_analyst' ||
        Boolean(currentUser?.title && /מנתח[/\\]?ת?\s*התנהגות/.test(currentUser.title)))
  );

  const [viewMode, setViewMode] = useState<'pedagogical' | 'behavior_analysis'>(
    isAnalystUser ? 'behavior_analysis' : 'pedagogical'
  );

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(true);

  // Extract unique frameworks
  const frameworksList = useMemo(() => {
    const set = new Set<string>();
    safeStudents.forEach((st) => {
      const fw = getFrameworkKey(st);
      if (fw) set.add(fw);
    });
    return Array.from(set).sort((a, b) => compareFrameworks(a, b));
  }, [safeStudents]);

  // Filter by framework first
  const frameworkFilteredStudents = useMemo(() => {
    if (selectedFramework === 'all') return safeStudents;
    return safeStudents.filter((st) => getFrameworkKey(st) === selectedFramework);
  }, [safeStudents, selectedFramework]);

  // Then filter by search query
  const searchedStudents = useMemo(
    () => filterStudentsBySearch(frameworkFilteredStudents, searchQuery),
    [frameworkFilteredStudents, searchQuery]
  );

  // Compute summaries
  const pedagogicalSummary = useMemo(
    () => computeClassReadinessSummary(searchedStudents),
    [searchedStudents]
  );

  const behaviorSummary = useMemo(
    () => computeBehaviorReadinessSummary(searchedStudents),
    [searchedStudents]
  );

  // Filter by readiness status / issue depending on view mode
  const visibleStudents = useMemo(() => {
    if (viewMode === 'behavior_analysis') {
      return filterStudentsByBehaviorReadiness(
        searchedStudents,
        activeFilter as BehaviorReadinessFilterKey
      );
    }
    return filterStudentsByReadiness(
      searchedStudents,
      activeFilter as ReadinessFilterKey
    );
  }, [searchedStudents, activeFilter, viewMode]);

  const isBehaviorMode = viewMode === 'behavior_analysis';

  return (
    <section
      className="class-readiness-overview-card"
      dir="rtl"
      aria-label={
        isBehaviorMode
          ? 'דוח מוכנות לישיבות צוות ומבט מרוכז במעקב התנהגותי'
          : 'דוח מוכנות לישיבות צוות ומבט כיתתי מרוכז'
      }
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px 28px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        width: '100%',
        margin: '0 auto'
      }}
    >
      {/* Top Header: Title, Mode Switcher, Global Actions & Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          paddingBottom: '16px',
          marginBottom: '18px',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isBehaviorMode
                ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)',
              flexShrink: 0
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
                {isBehaviorMode
                  ? 'דוח מוכנות לישיבות צוות ומבט מרוכז במעקב התנהגותי'
                  : 'דוח מוכנות לישיבות צוות ומבט כיתתי מרוכז'}
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 600,
                  background: '#f8fafc'
                }}
              >
                {visibleStudents.length}{' '}
                {isBehaviorMode ? 'תלמידים במעקב התנהגותי' : 'תלמידים מוצגים'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              {isBehaviorMode
                ? 'תמונת מצב שוטפת לקראת דיוני צוות רב-מקצועיים, ישיבות מעקב התערבות והערכות תפקודיות'
                : 'תמונת מצב שוטפת לקראת דיוני צוות שבועיים, הערכות תקופתיות וועדות אפיון'}
            </p>
          </div>
        </div>

        {/* Global Controls: Mode Switcher, Search Input & Framework Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dual Perspective Toggle (Pedagogical vs Behavioral) */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1'
            }}
            role="tablist"
            aria-label="בחירת מבט דוח מוכנות"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'pedagogical'}
              onClick={() => {
                setViewMode('pedagogical');
                setActiveFilter('all');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'pedagogical' ? '#ffffff' : 'transparent',
                color: viewMode === 'pedagogical' ? '#1d4ed8' : '#64748b',
                fontWeight: viewMode === 'pedagogical' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: viewMode === 'pedagogical' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              מבט הוראה מותאמת
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'behavior_analysis'}
              onClick={() => {
                setViewMode('behavior_analysis');
                setActiveFilter('all');
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'behavior_analysis' ? '#ffffff' : 'transparent',
                color: viewMode === 'behavior_analysis' ? '#1d4ed8' : '#64748b',
                fontWeight: viewMode === 'behavior_analysis' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: viewMode === 'behavior_analysis' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              מבט ניתוח התנהגות
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '7px 12px',
              minWidth: '200px'
            }}
          >
            <Search size={15} style={{ color: '#64748b', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="חיפוש לפי שם או מסגרת..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="חיפוש בדוח מוכנות לצוות"
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0f172a',
                width: '100%'
              }}
            />
          </div>

          {frameworksList.length > 1 && (
            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              aria-label="סינון לפי מסגרת חינוכית"
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="all">כל המסגרות החינוכיות ({safeStudents.length})</option>
              {frameworksList.map((fw) => {
                const count = safeStudents.filter((s) => getFrameworkKey(s) === fw).length;
                return (
                  <option key={fw} value={fw}>
                    {fw} ({count})
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>

      {/* Cohort Summary KPIs & Traffic-Light Progress Bar */}
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          background: '#f8fafc'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
              {isBehaviorMode
                ? 'תמונת מצב מערך מעקב התנהגותי:'
                : 'תמונת מצב כיתתית:'}
            </span>

            {/* Traffic-Light KPI Clickable Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === 'ready' ? 'all' : 'ready')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#047857',
                  border:
                    activeFilter === 'ready'
                      ? '2px solid #10b981'
                      : '1px solid rgba(16, 185, 129, 0.35)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={
                  isBehaviorMode
                    ? 'סינון תלמידים מוכנים לישיבת צוות'
                    : 'סינון תלמידים מוכנים לוועדה'
                }
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: '#10b981'
                  }}
                />
                {isBehaviorMode
                  ? `${behaviorSummary.readyCount} מוכנים לישיבת צוות`
                  : `${pedagogicalSummary.readyCount} מוכנים לוועדה`}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === 'partial' ? 'all' : 'partial')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#b45309',
                  border:
                    activeFilter === 'partial'
                      ? '2px solid #f59e0b'
                      : '1px solid rgba(245, 158, 11, 0.38)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="סינון תלמידים בתהליך"
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: '#f59e0b'
                  }}
                />
                {isBehaviorMode
                  ? `${behaviorSummary.partialCount} בתהליך`
                  : `${pedagogicalSummary.partialCount} בתהליך`}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === 'missing' ? 'all' : 'missing')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  background: 'rgba(244, 63, 94, 0.14)',
                  color: '#be123c',
                  border:
                    activeFilter === 'missing'
                      ? '2px solid #f43f5e'
                      : '1px solid rgba(244, 63, 94, 0.35)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="סינון תלמידים שדורשים השלמה"
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: '#f43f5e'
                  }}
                />
                {isBehaviorMode
                  ? `${behaviorSummary.missingCount} דורשים השלמה`
                  : `${pedagogicalSummary.missingCount} דורשים השלמה`}
              </button>
            </div>
          </div>

          {/* Standard Unified 32x32px Collapse Button */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
            aria-expanded={isFilterDrawerOpen}
            aria-label={isFilterDrawerOpen ? 'סגירת סרגל סינון מהיר' : 'פתיחת סרגל סינון מהיר'}
            title="פתיחה או סגירה של סרגל סינון מהיר"
            style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            {isFilterDrawerOpen ? '−' : '+'}
          </button>
        </div>

        {/* Stacked Traffic-Light Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '9px',
            borderRadius: '999px',
            overflow: 'hidden',
            display: 'flex',
            marginTop: '12px',
            background: '#e2e8f0'
          }}
        >
          <div
            style={{
              width: `${isBehaviorMode ? behaviorSummary.readyPct : pedagogicalSummary.readyPct}%`,
              background: '#10b981',
              height: '100%',
              transition: 'width 0.3s ease'
            }}
            title={
              isBehaviorMode
                ? `מוכנים לישיבת צוות (${behaviorSummary.readyCount})`
                : `מוכנים לוועדה (${pedagogicalSummary.readyCount})`
            }
          />
          <div
            style={{
              width: `${isBehaviorMode ? behaviorSummary.partialPct : pedagogicalSummary.partialPct}%`,
              background: '#f59e0b',
              height: '100%',
              transition: 'width 0.3s ease'
            }}
            title={`בתהליך (${isBehaviorMode ? behaviorSummary.partialCount : pedagogicalSummary.partialCount})`}
          />
          <div
            style={{
              width: `${isBehaviorMode ? behaviorSummary.missingPct : pedagogicalSummary.missingPct}%`,
              background: '#f43f5e',
              height: '100%',
              transition: 'width 0.3s ease'
            }}
            title={`דורשים השלמה (${isBehaviorMode ? behaviorSummary.missingCount : pedagogicalSummary.missingCount})`}
          />
        </div>

        {/* Collapsible Filter Chips Drawer */}
        {isFilterDrawerOpen && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              סינון מהיר לפי חוסר:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {isBehaviorMode
                ? BEHAVIOR_FILTER_OPTIONS.map((f) => {
                    const count = f.getCount(behaviorSummary);
                    const isActive = activeFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setActiveFilter(f.key)}
                        style={{
                          fontSize: '12px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: isActive ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                          background: isActive ? '#1d4ed8' : '#ffffff',
                          color: isActive ? '#ffffff' : '#1e293b',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{f.label}</span>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            background: isActive
                              ? 'rgba(255, 255, 255, 0.22)'
                              : '#f1f5f9',
                            color: isActive ? '#ffffff' : '#475569'
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })
                : PEDAGOGICAL_FILTER_OPTIONS.map((f) => {
                    const count = f.getCount(pedagogicalSummary);
                    const isActive = activeFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setActiveFilter(f.key)}
                        style={{
                          fontSize: '12px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: isActive ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                          background: isActive ? '#1d4ed8' : '#ffffff',
                          color: isActive ? '#ffffff' : '#1e293b',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{f.label}</span>
                        <span
                          style={{
                            padding: '1px 6px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            background: isActive
                              ? 'rgba(255, 255, 255, 0.22)'
                              : '#f1f5f9',
                            color: isActive ? '#ffffff' : '#475569'
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        )}
      </div>

      {/* The Full-Width Pedagogical or Behavioral Matrix Table */}
      {visibleStudents.length === 0 ? (
        <div
          style={{
            padding: '36px 16px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '14px'
          }}
        >
          לא נמצאו תלמידים התואמים לסינון הנוכחי.
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '13px'
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: 700
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '48px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px 14px', minWidth: '180px' }}>שם התלמיד/ה ומסגרת</th>
                  {isBehaviorMode ? (
                    <>
                      <th style={{ padding: '12px 14px', minWidth: '150px', textAlign: 'center' }}>
                        הערכת תפקוד ובייסליין
                      </th>
                      <th style={{ padding: '12px 14px', minWidth: '150px', textAlign: 'center' }}>
                        השערה תפקודית ומנע
                      </th>
                      <th style={{ padding: '12px 14px', minWidth: '150px', textAlign: 'center' }}>
                        התנהגות חלופית וחיזוקים
                      </th>
                      <th style={{ padding: '12px 14px', minWidth: '150px', textAlign: 'center' }}>
                        מעקב שוטף ונתוני שטח
                      </th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '12px 14px', minWidth: '130px', textAlign: 'center' }}>
                        מטרות פעילות (2+)
                      </th>
                      <th style={{ padding: '12px 14px', minWidth: '130px', textAlign: 'center' }}>
                        קול הורים ושותפות
                      </th>
                      <th style={{ padding: '12px 14px', minWidth: '130px', textAlign: 'center' }}>
                        הערכת אמצע שנה
                      </th>
                      <th style={{ padding: '12px 14px', minWidth: '130px', textAlign: 'center' }}>
                        דו״ח מצב ונעילה
                      </th>
                    </>
                  )}
                  <th style={{ padding: '12px 14px', minWidth: '120px', textAlign: 'center' }}>
                    סטטוס תיק
                  </th>
                  <th style={{ padding: '12px 14px', width: '120px', textAlign: 'center' }}>
                    פעולה מהירה
                  </th>
                </tr>
              </thead>
              <tbody>
                {isBehaviorMode
                  ? visibleStudents.map((st, idx) => {
                      const bInfo = computeBehaviorStudentReadiness(st);
                      const visuals = getBehaviorStatusVisuals(bInfo.status);
                      const frameworkLabel = getFrameworkKey(st) || NO_FRAMEWORK_LABEL;

                      return (
                        <tr
                          key={String(st.id || st.name || idx)}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            background: idx % 2 === 0 ? '#ffffff' : '#fafcff',
                            transition: 'background 0.12s ease'
                          }}
                        >
                          {/* Row index */}
                          <td
                            style={{
                              padding: '12px 14px',
                              textAlign: 'center',
                              color: '#94a3b8',
                              fontWeight: 600
                            }}
                          >
                            {idx + 1}
                          </td>

                          {/* Student Name + Framework */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '999px',
                                  background: visuals.dotColor,
                                  flexShrink: 0
                                }}
                                title={visuals.text}
                              />
                              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                                {st.name || 'ללא שם'}
                              </strong>
                              {bInfo.isLocked && (
                                <span
                                  title="התיק נעול לעריכה"
                                  style={{ color: '#64748b', display: 'inline-flex' }}
                                >
                                  <Lock size={13} />
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#64748b',
                                display: 'block',
                                paddingRight: '17px'
                              }}
                            >
                              {frameworkLabel}
                            </span>
                          </td>

                          {/* Column 3: Functional Assessment & Baseline */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background:
                                  bInfo.hasTargetBehaviors && bInfo.hasBaselineData
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : bInfo.hasTargetBehaviors
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(244, 63, 94, 0.1)',
                                color:
                                  bInfo.hasTargetBehaviors && bInfo.hasBaselineData
                                    ? '#047857'
                                    : bInfo.hasTargetBehaviors
                                    ? '#b45309'
                                    : '#be123c',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {bInfo.hasTargetBehaviors && bInfo.hasBaselineData ? (
                                <Check size={14} />
                              ) : bInfo.hasTargetBehaviors ? (
                                <Activity size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>
                                {bInfo.hasTargetBehaviors && bInfo.hasBaselineData
                                  ? `${bInfo.targetBehaviorsCount} יעדים • ${bInfo.baselineDataCount} בייסליין`
                                  : bInfo.hasTargetBehaviors
                                  ? `${bInfo.targetBehaviorsCount} יעדים (ללא בייסליין)`
                                  : 'טרם הוגדר'}
                              </span>
                            </div>
                          </td>

                          {/* Column 4: Functional Hypothesis & Antecedents */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: bInfo.hasFunctionalHypothesis
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(244, 63, 94, 0.1)',
                                color: bInfo.hasFunctionalHypothesis ? '#047857' : '#be123c',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {bInfo.hasFunctionalHypothesis ? (
                                <Check size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>
                                {bInfo.hypothesizedFunctionLabel ||
                                  (bInfo.hasFunctionalHypothesis ? 'גובשה השערה' : 'טרם גובשה')}
                              </span>
                            </div>
                          </td>

                          {/* Column 5: Replacement Behaviors & Intervention Plan */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: bInfo.hasReplacementBehaviors
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : bInfo.hasInterventionStrategies
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(244, 63, 94, 0.1)',
                                color: bInfo.hasReplacementBehaviors
                                  ? '#047857'
                                  : bInfo.hasInterventionStrategies
                                  ? '#b45309'
                                  : '#be123c',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {bInfo.hasReplacementBehaviors ? (
                                <Check size={14} />
                              ) : bInfo.hasInterventionStrategies ? (
                                <Activity size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>
                                {bInfo.hasReplacementBehaviors
                                  ? `${bInfo.replacementBehaviorsCount} חלופות • חיזוקים`
                                  : bInfo.hasInterventionStrategies
                                  ? 'בגיבוש אסטרטגיות'
                                  : 'חסרה תוכנית'}
                              </span>
                            </div>
                          </td>

                          {/* Column 6: Ongoing Tracking & Field Data */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: bInfo.isLocked
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : bInfo.hasOngoingTracking
                                  ? 'rgba(37, 99, 235, 0.12)'
                                  : 'rgba(244, 63, 94, 0.1)',
                                color: bInfo.isLocked
                                  ? '#047857'
                                  : bInfo.hasOngoingTracking
                                  ? '#1d4ed8'
                                  : '#be123c',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {bInfo.isLocked ? (
                                <Lock size={13} />
                              ) : bInfo.hasOngoingTracking ? (
                                <Check size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              <span>
                                {bInfo.isLocked
                                  ? 'נעול ומאושר'
                                  : bInfo.hasOngoingTracking
                                  ? `${bInfo.trackingPointsCount} רישומי שטח`
                                  : 'ללא רישום'}
                              </span>
                            </div>
                          </td>

                          {/* Column 7: Final Status */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                background: visuals.badgeBg,
                                color: visuals.badgeColor,
                                border: `1px solid ${visuals.badgeBorder}`,
                                fontWeight: 700,
                                fontSize: '12px'
                              }}
                            >
                              {visuals.text}
                            </span>
                          </td>

                          {/* Column 8: Direct Action */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (st.id && onSelectStudent) {
                                  const preferredDocType =
                                    bInfo.hasReplacementBehaviors || bInfo.hasOngoingTracking
                                      ? 'behavior_plan'
                                      : 'behavior_assessment';
                                  onSelectStudent(String(st.id), preferredDocType);
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#1d4ed8',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 4px rgba(29, 78, 216, 0.2)',
                                transition: 'background 0.15s ease'
                              }}
                              title="מעבר ישיר לתיק התלמיד/ה להערכת תפקוד או תוכנית התערבות"
                            >
                              <span>מעבר לתיק</span>
                              <ExternalLink size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  : visibleStudents.map((st, idx) => {
                      const info = computeStudentReadiness(st);
                      const visuals = getPedagogicalStatusVisuals(info.status);
                      const frameworkLabel = getFrameworkKey(st) || NO_FRAMEWORK_LABEL;

                      return (
                        <tr
                          key={String(st.id || st.name || idx)}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            background: idx % 2 === 0 ? '#ffffff' : '#fafcff',
                            transition: 'background 0.12s ease'
                          }}
                        >
                          {/* Row index */}
                          <td
                            style={{
                              padding: '12px 14px',
                              textAlign: 'center',
                              color: '#94a3b8',
                              fontWeight: 600
                            }}
                          >
                            {idx + 1}
                          </td>

                          {/* Student Name + Framework */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '999px',
                                  background: visuals.dotColor,
                                  flexShrink: 0
                                }}
                                title={visuals.text}
                              />
                              <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                                {st.name || 'ללא שם'}
                              </strong>
                              {info.isLocked && (
                                <span
                                  title="התיק נעול לעריכה"
                                  style={{ color: '#64748b', display: 'inline-flex' }}
                                >
                                  <Lock size={13} />
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#64748b',
                                display: 'block',
                                paddingRight: '17px'
                              }}
                            >
                              {frameworkLabel}
                            </span>
                          </td>

                          {/* Goals Column */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: info.hasActiveGoals
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(244, 63, 94, 0.1)',
                                color: info.hasActiveGoals ? '#047857' : '#be123c',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {info.hasActiveGoals ? <Check size={14} /> : <X size={14} />}
                              <span>{info.goalsCount} מטרות</span>
                            </div>
                          </td>

                          {/* Parent Voice Column */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: info.hasParentVoice
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(244, 63, 94, 0.1)',
                                color: info.hasParentVoice ? '#047857' : '#be123c',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {info.hasParentVoice ? <Check size={14} /> : <X size={14} />}
                              <span>{info.hasParentVoice ? 'שולב בתיק' : 'חסר'}</span>
                            </div>
                          </td>

                          {/* Mid-Year Eval Column */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                background: info.hasMidYearEval
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(244, 63, 94, 0.1)',
                                color: info.hasMidYearEval ? '#047857' : '#be123c',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            >
                              {info.hasMidYearEval ? <Check size={14} /> : <X size={14} />}
                              <span>{info.hasMidYearEval ? 'הוזנה' : 'חסרה'}</span>
                            </div>
                          </td>

                          {/* Status Report Column */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {(() => {
                              const isDone = Boolean(info.isLocked || info.hasStatusReport);
                              return (
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    background: isDone
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : 'rgba(244, 63, 94, 0.1)',
                                    color: isDone ? '#047857' : '#be123c',
                                    fontWeight: 600,
                                    fontSize: '12px'
                                  }}
                                >
                                  {isDone ? <Check size={14} /> : <X size={14} />}
                                  <span>
                                    {info.isLocked
                                      ? 'נעול'
                                      : info.hasStatusReport
                                      ? 'הופק'
                                      : 'טרם ננעל'}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Final Status */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                background: visuals.badgeBg,
                                color: visuals.badgeColor,
                                border: `1px solid ${visuals.badgeBorder}`,
                                fontWeight: 700,
                                fontSize: '12px'
                              }}
                            >
                              {visuals.text}
                            </span>
                          </td>

                          {/* Direct Action */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (st.id && onSelectStudent) {
                                  onSelectStudent(String(st.id), 'pedagogical_plan');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#1d4ed8',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 4px rgba(29, 78, 216, 0.2)',
                                transition: 'background 0.15s ease'
                              }}
                              title="מעבר ישיר לתיק התלמיד/ה לעריכה ולהשלמה"
                            >
                              <span>מעבר לתיק</span>
                              <ExternalLink size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Legend and Guidance */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #e2e8f0',
          fontSize: '12px',
          color: '#64748b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: '#10b981'
              }}
            />
            {isBehaviorMode ? 'הושלם ותקין לדיון' : 'הושלם ותקין'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                background: '#f43f5e'
              }}
            />
            טרם הוזן / חסר בתיק
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Lock size={12} style={{ color: '#4338ca' }} />
            {isBehaviorMode ? 'הערכה או תוכנית נעולים' : 'תיק נעול לעריכה'}
          </span>
        </div>
        <div>
          <span>
            {isBehaviorMode
              ? 'לחיצה על "מעבר לתיק" פותחת את הערכת התפקוד או תוכנית ההתערבות בעריכה'
              : 'לחיצה על "מעבר לתיק" פותחת את הגיליון ישירות בעריכה'}
          </span>
        </div>
      </div>
    </section>
  );
}
