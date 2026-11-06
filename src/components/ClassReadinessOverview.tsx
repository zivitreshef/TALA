import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Users,
  Lock,
  Unlock
} from 'lucide-react';
import {
  NO_FRAMEWORK_LABEL,
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
  { key: 'missing_goals', label: 'חסרות מטרות פעילות', getCount: (s) => s.missingGoalsCount },
  { key: 'missing_parents', label: 'חסר קול הורים', getCount: (s) => s.missingParentsCount },
  { key: 'missing_eval', label: 'חסרה הערכת אמצע', getCount: (s) => s.missingEvalCount },
  { key: 'ready', label: 'מוכנים ונעולים', getCount: (s) => s.readyCount }
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => String(safeStudents[0]?.id || '')
  );

  const searchedStudents = useMemo(
    () => filterStudentsBySearch(safeStudents, searchQuery),
    [safeStudents, searchQuery]
  );

  const summary = useMemo(
    () => computeClassReadinessSummary(searchedStudents),
    [searchedStudents]
  );

  const visibleStudents = useMemo(
    () => filterStudentsByReadiness(searchedStudents, activeFilter),
    [searchedStudents, activeFilter]
  );

  const activeStudent = useMemo(() => {
    if (visibleStudents.length === 0) return null;
    return (
      visibleStudents.find((s) => String(s.id) === String(selectedStudentId)) ||
      visibleStudents[0]
    );
  }, [visibleStudents, selectedStudentId]);

  const activeStudentReadiness = useMemo(
    () => computeStudentReadiness(activeStudent),
    [activeStudent]
  );

  const handleFilterClick = (key: ReadinessFilterKey) => {
    setActiveFilter(key);
    const nextVisible = filterStudentsByReadiness(searchedStudents, key);
    if (
      nextVisible.length > 0 &&
      !nextVisible.some((s) => String(s.id) === String(selectedStudentId))
    ) {
      setSelectedStudentId(String(nextVisible[0].id || ''));
    }
  };

  return (
    <section
      className="class-readiness-overview-card"
      dir="rtl"
      aria-label="מבט-על כיתתי על מוכנות תיקים ומועדי דיווח"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '22px 24px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        maxWidth: '1080px',
        margin: '0 auto'
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '14px',
          marginBottom: '16px',
          borderBottom: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Users size={19} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                רשימת תלמידים ומבט-על כיתתי
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
                {summary.total} תלמידים
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              תמונת מצב מרוכזת של עמידה ביעדים, שותפות הורים והערכות לקראת דיווח וועדות
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '6px 12px',
            minWidth: '230px'
          }}
        >
          <Search size={15} style={{ color: '#64748b', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="חיפוש תלמיד/ה או מסגרת..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="חיפוש במבט-על כיתתי"
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
      </div>

      {/* Collapsible Class Readiness Traffic-Light Bar */}
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '18px',
          background: '#f8fafc'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
              מוכנות כיתתית לדיווח
            </span>

            {/* Traffic-Light Summary Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#047857',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: '#10b981'
                  }}
                />
                {summary.readyCount} מוכנים
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#b45309',
                  fontSize: '12px',
                  fontWeight: 700
                }}
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
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(244, 63, 94, 0.14)',
                  color: '#be123c',
                  fontSize: '12px',
                  fontWeight: 700
                }}
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
              </span>
            </div>
          </div>

          {/* Standard Unified 32x32px +/- Collapse Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            aria-expanded={isDrawerOpen}
            aria-label={isDrawerOpen ? 'סגירת פירוט מוכנות וסינון מהיר' : 'פתיחת פירוט מוכנות וסינון מהיר'}
            title="פתיחה או סגירה של פירוט מוכנות וסינון מהיר"
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
            {isDrawerOpen ? '−' : '+'}
          </button>
        </div>

        {/* Stacked Traffic-Light Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '999px',
            overflow: 'hidden',
            display: 'flex',
            marginTop: '10px',
            background: '#e2e8f0'
          }}
        >
          <div
            style={{ width: `${summary.readyPct}%`, background: '#10b981', height: '100%' }}
            title={`מוכנים לוועדה (${summary.readyCount})`}
          />
          <div
            style={{ width: `${summary.partialPct}%`, background: '#f59e0b', height: '100%' }}
            title={`בתהליך (${summary.partialCount})`}
          />
          <div
            style={{ width: `${summary.missingPct}%`, background: '#f43f5e', height: '100%' }}
            title={`דורשים השלמה (${summary.missingCount})`}
          />
        </div>

        {/* Collapsible Filter Pills Drawer */}
        {isDrawerOpen && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              סינון מהיר לפי חוסר בתיק (לחיצה מסננת את הרשימה למטה):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {FILTER_OPTIONS.map((f) => {
                const count = f.getCount(summary);
                const isActive = activeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleFilterClick(f.key)}
                    style={{
                      fontSize: '12px',
                      padding: '5px 11px',
                      borderRadius: '999px',
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
                        fontSize: '12px',
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

      {/* Main Two-Column Content: Student Cards Roster (Right) + Readiness Inspector (Left) */}
      {visibleStudents.length === 0 ? (
        <div
          style={{
            padding: '32px 16px',
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
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
            alignItems: 'start'
          }}
        >
          {/* Right Column: Student Cards List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '460px',
              overflowY: 'auto',
              paddingLeft: '4px'
            }}
          >
            {visibleStudents.map((st) => {
              const info = computeStudentReadiness(st);
              const visuals = getStatusVisuals(info.status);
              const isSelected = activeStudent && String(activeStudent.id) === String(st.id);
              const frameworkLabel =
                String(st.educationalFramework || '').trim() || NO_FRAMEWORK_LABEL;

              return (
                <div
                  key={String(st.id || st.name)}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedStudentId(String(st.id || ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStudentId(String(st.id || ''));
                    }
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '999px',
                          background: visuals.dotColor,
                          flexShrink: 0
                        }}
                        title={visuals.text}
                      />
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                        {st.name || 'ללא שם'}
                      </strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        ({frameworkLabel})
                      </span>
                      {info.isLocked ? (
                        <Lock size={13} style={{ color: '#475569' }} />
                      ) : (
                        <Unlock size={13} style={{ color: '#94a3b8' }} />
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '1px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569'
                        }}
                      >
                        {info.goalsCount} מטרות
                      </span>

                      {info.missingTags.length > 0 ? (
                        info.missingTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '12px',
                              padding: '1px 8px',
                              borderRadius: '6px',
                              background: 'rgba(244, 63, 94, 0.1)',
                              color: '#be123c',
                              fontWeight: 600
                            }}
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            padding: '1px 8px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#047857',
                            fontWeight: 600
                          }}
                        >
                          התיק מלא
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: visuals.badgeBg,
                      color: visuals.badgeColor,
                      border: `1px solid ${visuals.badgeBorder}`,
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {visuals.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Left Column: Selected Student Readiness Breakdown Inspector */}
          {activeStudent && (
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '16px 18px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '10px',
                    marginBottom: '12px',
                    borderBottom: '1px solid #e2e8f0',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                      {activeStudent.name || 'ללא שם'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {String(activeStudent.educationalFramework || '').trim() ||
                        NO_FRAMEWORK_LABEL}
                    </div>
                  </div>
                  {(() => {
                    const visuals = getStatusVisuals(activeStudentReadiness.status);
                    return (
                      <span
                        style={{
                          fontSize: '12px',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: visuals.badgeBg,
                          color: visuals.badgeColor,
                          border: `1px solid ${visuals.badgeBorder}`,
                          fontWeight: 700
                        }}
                      >
                        {visuals.text}
                      </span>
                    );
                  })()}
                </div>

                {/* 4 Readiness Indicators Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    {
                      label: 'מטרות פעילות בתוכנית (לפחות 2)',
                      done: activeStudentReadiness.hasActiveGoals,
                      detail: `${activeStudentReadiness.goalsCount} מטרות מוגדרות`
                    },
                    {
                      label: 'תיעוד קול הורים ושותפות',
                      done: activeStudentReadiness.hasParentVoice,
                      detail: activeStudentReadiness.hasParentVoice
                        ? 'התקבל ושולב בתיק'
                        : 'טרם הוזן תיעוד הורים'
                    },
                    {
                      label: 'הערכת אמצע שנה במטרות',
                      done: activeStudentReadiness.hasMidYearEval,
                      detail: activeStudentReadiness.hasMidYearEval
                        ? 'הוזנה הערכת מחצית'
                        : 'חסרה הערכה במטרות'
                    },
                    {
                      label: 'דו"ח מצב עדכני ונעילת תיק',
                      done:
                        activeStudentReadiness.hasStatusReport ||
                        activeStudentReadiness.isLocked,
                      detail: activeStudentReadiness.isLocked
                        ? 'הדו"ח הופק ונעול'
                        : activeStudentReadiness.hasStatusReport
                          ? 'דו"ח מצב הופק (פתוח לעריכה)'
                          : 'פתוח לעריכה'
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '13px'
                      }}
                    >
                      {item.done ? (
                        <CheckCircle2
                          size={16}
                          style={{ color: '#059669', marginTop: '2px', flexShrink: 0 }}
                        />
                      ) : (
                        <XCircle
                          size={16}
                          style={{ color: '#e11d48', marginTop: '2px', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.label}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{item.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action CTA to jump directly into the student's work plan */}
              <div
                style={{
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (activeStudent?.id && onSelectStudent) {
                      onSelectStudent(String(activeStudent.id));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)'
                  }}
                >
                  <span>פתיחת תיק התלמיד/ה להשלמה ולעריכה</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
