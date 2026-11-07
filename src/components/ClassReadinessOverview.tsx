import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Users,
  Check,
  X,
  Lock
} from 'lucide-react';
import {
  NO_FRAMEWORK_LABEL,
  getFrameworkKey,
  computeStudentReadiness,
  computeClassReadinessSummary,
  filterStudentsByReadiness,
  filterStudentsBySearch,
  type StudentListItem,
  type ReadinessFilterKey,
  type ReadinessStatus
} from '../domain/studentListView';

export interface ClassReadinessOverviewProps {
  students?: StudentListItem[] | null;
  onSelectStudent?: (studentId: string) => void;
  onClose?: () => void;
}

interface FilterOption {
  key: ReadinessFilterKey;
  label: string;
  getCount: (summary: ReturnType<typeof computeClassReadinessSummary>) => number;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  { key: 'all', label: 'כל התלמידים', getCount: (s) => s.total },
  { key: 'missing_parents', label: 'חסר קול הורים', getCount: (s) => s.missingParentsCount },
  { key: 'missing_eval', label: 'חסרה הערכת אמצע', getCount: (s) => s.missingEvalCount },
  { key: 'missing_goals', label: 'חסרות מטרות פעילות', getCount: (s) => s.missingGoalsCount },
  { key: 'ready', label: 'מוכנים לוועדה', getCount: (s) => s.readyCount }
];

function getStatusVisuals(status: ReadinessStatus) {
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

export default function ClassReadinessOverview({
  students = [],
  onSelectStudent
}: ClassReadinessOverviewProps): React.JSX.Element {
  const safeStudents = useMemo(
    () => (Array.isArray(students) ? students : []),
    [students]
  );

  const [activeFilter, setActiveFilter] = useState<ReadinessFilterKey>('all');
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
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
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

  // Compute summary for the active search/framework scope
  const summary = useMemo(
    () => computeClassReadinessSummary(searchedStudents),
    [searchedStudents]
  );

  // Finally filter by readiness status / issue
  const visibleStudents = useMemo(
    () => filterStudentsByReadiness(searchedStudents, activeFilter),
    [searchedStudents, activeFilter]
  );

  return (
    <section
      className="class-readiness-overview-card"
      dir="rtl"
      aria-label="מבט על כיתתי על עמידה ביעדים ומועדי דיווח"
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
      {/* Top Header: Title, Global Actions & Search */}
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
              background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
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
                מבט על כיתתי על עמידה ביעדים ומועדי דיווח
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
                {visibleStudents.length} תלמידים מוצגים
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              סריקה מרוכזת במבט אחד של מוכנות כלל התיקים לקראת דיווחי אמצע, ועדות וסיכום שנה
            </p>
          </div>
        </div>

        {/* Global Controls: Search Input & Framework Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '7px 12px',
              minWidth: '220px'
            }}
          >
            <Search size={15} style={{ color: '#64748b', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="חיפוש לפי שם או מסגרת..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="חיפוש במבט על כיתתי"
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

      {/* Class Summary KPIs & Traffic-Light Progress Bar */}
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
              תמונת מצב כיתתית:
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
                  border: activeFilter === 'ready' ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.35)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="סינון תלמידים מוכנים לוועדה"
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: '#10b981'
                  }}
                />
                {summary.readyCount} מוכנים לוועדה
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
                  border: activeFilter === 'partial' ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.38)',
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
                {summary.partialCount} בתהליך
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
                  border: activeFilter === 'missing' ? '2px solid #f43f5e' : '1px solid rgba(244, 63, 94, 0.35)',
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
                {summary.missingCount} דורשים השלמה
              </button>
            </div>
          </div>

          {/* Standard Unified 32x32px +/- Collapse Button */}
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
            style={{ width: `${summary.readyPct}%`, background: '#10b981', height: '100%', transition: 'width 0.3s ease' }}
            title={`מוכנים לוועדה (${summary.readyCount})`}
          />
          <div
            style={{ width: `${summary.partialPct}%`, background: '#f59e0b', height: '100%', transition: 'width 0.3s ease' }}
            title={`בתהליך (${summary.partialCount})`}
          />
          <div
            style={{ width: `${summary.missingPct}%`, background: '#f43f5e', height: '100%', transition: 'width 0.3s ease' }}
            title={`דורשים השלמה (${summary.missingCount})`}
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
              {FILTER_OPTIONS.map((f) => {
                const count = f.getCount(summary);
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
                        background: isActive ? 'rgba(255, 255, 255, 0.22)' : '#f1f5f9',
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

      {/* The Full-Width Pedagogical Matrix Table */}
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
                  <th style={{ padding: '12px 14px', minWidth: '120px', textAlign: 'center' }}>
                    סטטוס תיק
                  </th>
                  <th style={{ padding: '12px 14px', width: '120px', textAlign: 'center' }}>
                    פעולה מהירה
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((st, idx) => {
                  const info = computeStudentReadiness(st);
                  const visuals = getStatusVisuals(info.status);
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
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
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
                            <span title="התיק נעול לעריכה" style={{ color: '#64748b', display: 'inline-flex' }}>
                              <Lock size={13} />
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', paddingRight: '17px' }}>
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
                            background: info.hasActiveGoals ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.1)',
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
                            background: info.hasParentVoice ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.1)',
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
                            background: info.hasMidYearEval ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.1)',
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
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: info.isLocked
                              ? 'rgba(99, 102, 241, 0.12)'
                              : info.hasStatusReport
                                ? 'rgba(16, 185, 129, 0.12)'
                                : '#f1f5f9',
                            color: info.isLocked ? '#4338ca' : info.hasStatusReport ? '#047857' : '#64748b',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}
                        >
                          <span>
                            {info.isLocked ? 'נעול' : info.hasStatusReport ? 'הופק' : 'פתוח'}
                          </span>
                        </div>
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
                              onSelectStudent(String(st.id));
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
            <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#10b981' }} />
            הושלם ותקין
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#f43f5e' }} />
            טרם הוזן / חסר בתיק
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Lock size={12} style={{ color: '#4338ca' }} />
            תיק נעול לעריכה
          </span>
        </div>
        <div>
          <span>לחיצה על "מעבר לתיק" פותחת את הגיליון ישירות בעריכה</span>
        </div>
      </div>
    </section>
  );
}
