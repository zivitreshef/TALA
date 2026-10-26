import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  Lock,
  Check,
  RotateCcw,
  Edit2,
  Trash2,
  X,
  Users,
  Home,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import {
  ENVIRONMENTS_LIST,
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS,
  canonicalizeEnvironment,
  adaptTextToGender
} from '../goalBankData';
import { getEffectiveStudentStage, isGoalRelevantForStage } from '../studentStage';
import { buildAdminBankGoalPayload } from '../domain/goalBankAdmin';
import './GoalBankPage.css';

const DOMAIN_ICONS = {
  'משחקי שולחן, משחקי בנייה, הרכבה, לימודי דיגיטלי ואסטרטגיה': '🎲',
  'מפגש בגן': '⭕',
  'משחק במרחב הגן': '🧸',
  'סדנא / יצירה': '🎨',
  'חצר': '⚽',
  'שירותים': '🧼',
  'אוכל': '🍎',
  'פעילות שאינה בשגרה': '✨',
  'האזנה ודיבור – כשירות תקשורתית': '🗣️',
  'כתיבה': '✍️',
  'קריאה והפקת משמעות': '📖',
  'כשירות לשונית – ידע לשוני': '💬'
};

export default function GoalBankPage({
  goalBank = [],
  currentUser = {},
  userStudents = [],
  targetBankStudentId = '',
  setTargetBankStudentId,
  unsavedDraftState = { isDirty: false, draftData: null },
  onAddGoalToStudent,
  onSaveBankGoal,
  onDeleteBankGoal,
  onResetAllGoalWeights,
  onOpenStudentPlan,
  onGoHome
}) {
  const [goalBankSearch, setGoalBankSearch] = useState('');
  const [goalBankStageFilter, setGoalBankStageFilter] = useState(null);
  const [goalBankEnvFilter, setGoalBankEnvFilter] = useState('הכל');
  const [selectedHlDomain, setSelectedHlDomain] = useState(null);
  const [editingBankGoal, setEditingBankGoal] = useState(null);
  const [bankAddToast, setBankAddToast] = useState('');

  // Resolved active target student
  const activeBankTargetStudent = useMemo(() => {
    return (
      userStudents.find((s) => s.id === targetBankStudentId) ||
      userStudents[0] ||
      null
    );
  }, [userStudents, targetBankStudentId]);

  // Sorted bank by popularity / frequency
  const sortedBank = useMemo(() => {
    return [...goalBank].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
  }, [goalBank]);

  const activeStage = useMemo(() => {
    if (goalBankStageFilter !== null) return goalBankStageFilter;
    if (activeBankTargetStudent) return getEffectiveStudentStage(activeBankTargetStudent);
    return 'all';
  }, [goalBankStageFilter, activeBankTargetStudent]);

  // High-level domains to show in grid
  const domainsToShow = useMemo(() => {
    const list = [];
    if (activeStage === 'kindergarten' || activeStage === 'all') {
      KINDERGARTEN_ENVIRONMENTS.forEach((env) => {
        list.push({ name: env, stage: 'kindergarten', stageLabel: 'גן' });
      });
    }
    if (activeStage === 'school' || activeStage === 'all') {
      SCHOOL_ENVIRONMENTS.forEach((env) => {
        list.push({ name: env, stage: 'school', stageLabel: 'בית ספר' });
      });
    }
    return list;
  }, [activeStage]);

  // Filtered goals
  const filteredGoals = useMemo(() => {
    const effectiveEnvFilter = selectedHlDomain || goalBankEnvFilter;
    const query = goalBankSearch.trim().toLowerCase();

    return sortedBank.filter((g) => {
      if (!isGoalRelevantForStage(g, activeStage)) return false;

      if (
        effectiveEnvFilter !== 'הכל' &&
        canonicalizeEnvironment(g.environment) !== effectiveEnvFilter &&
        !(g.environment || '').includes(effectiveEnvFilter)
      ) {
        return false;
      }

      if (!query) return true;

      const titleMatch = (g.title || '').toLowerCase().includes(query);
      const envMatch = (g.environment || '').toLowerCase().includes(query);
      const objMatch = (g.suggestedObjectives || []).some((o) =>
        o.toLowerCase().includes(query)
      );

      return titleMatch || envMatch || objMatch;
    });
  }, [sortedBank, activeStage, selectedHlDomain, goalBankEnvFilter, goalBankSearch]);

  const handleStartAddGoal = () => {
    setEditingBankGoal({
      mode: 'add',
      id: '',
      title: '',
      stages: activeStage === 'school' ? ['school'] : ['kindergarten'],
      environment: selectedHlDomain || ENVIRONMENTS_LIST[0],
      usageCount: 0,
      defaultActivity: '',
      suggestedObjectivesText: '',
      defaultOpportunities: '',
      defaultPartners: 'צוות חינוכי, הורים',
      defaultDuration: 'עד סוף השנה',
      defaultEvaluation: ''
    });
  };

  const handleStartEditGoal = (goalItem) => {
    setEditingBankGoal({
      mode: 'edit',
      id: goalItem.id,
      title: goalItem.title || '',
      stages: Array.isArray(goalItem.stages) && goalItem.stages.length > 0
        ? goalItem.stages
        : (goalItem.stage ? [goalItem.stage] : ['kindergarten']),
      environment: goalItem.environment || ENVIRONMENTS_LIST[0],
      usageCount: goalItem.usageCount ?? 0,
      defaultActivity: goalItem.defaultActivity || '',
      suggestedObjectivesText: (goalItem.suggestedObjectives || []).join('\n'),
      defaultOpportunities: goalItem.defaultOpportunities || '',
      defaultPartners: goalItem.defaultPartners || 'צוות חינוכי, הורים',
      defaultDuration: goalItem.defaultDuration || 'עד סוף השנה',
      defaultEvaluation: goalItem.defaultEvaluation || ''
    });
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!editingBankGoal || !editingBankGoal.title.trim()) {
      window.alert('נא להזין כותרת למטרה.');
      return;
    }

    const payload = buildAdminBankGoalPayload(editingBankGoal);
    if (onSaveBankGoal) {
      onSaveBankGoal(editingBankGoal, payload);
    }

    const targetTitle = payload.title;
    const targetEnv = payload.environment;
    setSelectedHlDomain(targetEnv);
    setGoalBankEnvFilter(targetEnv);
    setGoalBankSearch(targetTitle);
    setEditingBankGoal(null);

    setBankAddToast(`✅ המטרה "${targetTitle}" נשמרה בהצלחה במאגר!`);
    setTimeout(() => setBankAddToast(''), 4500);
  };

  const handleDeleteGoal = (goalItem) => {
    if (onDeleteBankGoal) {
      onDeleteBankGoal(goalItem);
      setBankAddToast(`🗑️ המטרה "${goalItem.title}" הוסרה מהמאגר.`);
      setTimeout(() => setBankAddToast(''), 3500);
      if (editingBankGoal?.id === goalItem.id) {
        setEditingBankGoal(null);
      }
    }
  };

  const handleAddGoalDirectly = (goalItem) => {
    if (!activeBankTargetStudent || !onAddGoalToStudent) return;
    onAddGoalToStudent(goalItem, activeBankTargetStudent);
    const stName = (activeBankTargetStudent.name || 'התלמיד/ה').split(/\s+/)[0];
    setBankAddToast(`✅ המטרה נוספה בהצלחה לתכנית של ${stName}!`);
    setTimeout(() => setBankAddToast(''), 4000);
  };

  return (
    <div className="goal-bank-page-container" dir="rtl">
      {/* 1. Page Header */}
      <header className="goal-bank-top-header">
        <div className="goal-bank-header-info">
          <div className="goal-bank-header-avatar" aria-hidden="true">
            <TrendingUp size={24} />
          </div>
          <div className="goal-bank-header-title-box">
            <h1>
              <span>מאגר מטרות ויעדים אקולוגי חכם</span>
              <span className="goal-bank-header-badge">
                <Sparkles size={12} />
                <span>דינמי ומדורג</span>
              </span>
            </h1>
            <p className="goal-bank-header-subtitle">
              כל מטרה חדשה שנבנית בצוות משותפת למאגר ומדורגת לפי שכיחות. מותאם לגן ולבית ספר.
              {currentUser.role === 'admin' ? (
                <strong style={{ color: '#4c1d95', display: 'block', marginTop: '2px' }}>
                  👑 הרשאת מנהל מערכת: באפשרותך להוסיף, לערוך, להסיר ולאפס שכיחויות במאגר.
                </strong>
              ) : (
                <span style={{ color: '#64748b', display: 'block', marginTop: '2px' }}>
                  באפשרותך לחפש, לעיין ולהוסיף מטרות חדשות למאגר.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="goal-bank-header-actions">
          {currentUser.role === 'admin' && (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onResetAllGoalWeights}
              title="אפס את מונה השכיחות של כל המטרות ל-0"
            >
              <RotateCcw size={14} />
              <span>אפס שכיחויות</span>
            </button>
          )}

          {!editingBankGoal && (
            <button
              type="button"
              className="btn-admin-add-bank-goal"
              onClick={handleStartAddGoal}
            >
              <Plus size={16} />
              <span>הוסף מטרה חדשה למאגר</span>
            </button>
          )}

          <button
            type="button"
            className="btn-goal-bank-back"
            onClick={onGoHome}
            title="חזרה לניהול תלמידים"
          >
            <Users size={15} />
            <span>חזרה לניהול תלמידים</span>
          </button>
        </div>
      </header>

      {/* 2. Success / Info Toast */}
      {bankAddToast && (
        <div className="goal-bank-toast-banner" role="status">
          <span>{bankAddToast}</span>
        </div>
      )}

      {/* 3. Main Workspace Card */}
      <main className="goal-bank-page-card">
        {/* Direct Injection Target Student Bar */}
        <div className="goal-bank-target-strip">
          {userStudents.length > 0 ? (
            <>
              <div className="goal-bank-target-info">
                <span className="goal-bank-target-label">
                  🎯 הוספת מטרה מהמאגר ישירות לתכנית של:
                </span>
                <select
                  className="goal-bank-target-select"
                  value={activeBankTargetStudent?.id || ''}
                  onChange={(e) => setTargetBankStudentId && setTargetBankStudentId(e.target.value)}
                >
                  {userStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name || 'תלמיד/ה ללא שם'}{' '}
                      {st.educationalFramework ? `(${st.educationalFramework})` : ''} –{' '}
                      {(st.goals || []).filter((g) => (g.title || '').trim()).length} מטרות
                    </option>
                  ))}
                </select>
              </div>

              {activeBankTargetStudent && onOpenStudentPlan && (
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={() => onOpenStudentPlan(activeBankTargetStudent.id)}
                  style={{ fontSize: '12.5px', padding: '6px 14px' }}
                >
                  <span>פתח את תכנית התלמיד/ה</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </>
          ) : (
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              💡 צרי כרטיס תלמיד/ה בניהול תלמידים כדי להוסיף מטרות בלחיצה אחת מתוך המאגר.
            </span>
          )}
        </div>

        {/* Add / Edit Goal Inline Form (Admin or Any User for New Goal) */}
        {editingBankGoal && (editingBankGoal.mode === 'add' || currentUser.role === 'admin') && (
          <form className="admin-bank-goal-editor" onSubmit={handleSaveForm}>
            <div className="admin-editor-header">
              <h4>
                {editingBankGoal.mode === 'add'
                  ? '➕ הוספת מטרה חדשה למאגר המטרות הדינמי'
                  : '✏️ עריכת מטרה קיימת במאגר'}
              </h4>
              <button
                type="button"
                className="btn-cancel-bank-edit"
                onClick={() => setEditingBankGoal(null)}
              >
                <X size={15} />
                <span>ביטול</span>
              </button>
            </div>

            <div className="admin-editor-grid">
              <div className="admin-field full-span">
                <label>כותרת המטרה העליונה: *</label>
                <input
                  type="text"
                  required
                  value={editingBankGoal.title}
                  onChange={(e) =>
                    setEditingBankGoal({ ...editingBankGoal, title: e.target.value })
                  }
                  placeholder="למשל: ירחיב וישכלל את מיומנויותיו במשחק הסוציודרמטי..."
                />
              </div>

              <div className="admin-field">
                <label>סביבה / תחום פעילות:</label>
                <input
                  type="text"
                  list="admin-environments-datalist-page"
                  value={editingBankGoal.environment}
                  onChange={(e) =>
                    setEditingBankGoal({ ...editingBankGoal, environment: e.target.value })
                  }
                  placeholder="בחר או הקלד סביבה חדשה..."
                />
                <datalist id="admin-environments-datalist-page">
                  {ENVIRONMENTS_LIST.map((env) => (
                    <option key={env} value={env} />
                  ))}
                </datalist>
              </div>

              <div className="admin-field">
                <label>שלב חינוכי (גן / בית ספר):</label>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '6px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={(editingBankGoal.stages || []).includes('kindergarten')}
                      onChange={(e) => {
                        const cur = editingBankGoal.stages || [];
                        const next = e.target.checked
                          ? [...cur, 'kindergarten']
                          : cur.filter((s) => s !== 'kindergarten');
                        setEditingBankGoal({
                          ...editingBankGoal,
                          stages: next.length > 0 ? next : ['kindergarten']
                        });
                      }}
                    />
                    <span>גן</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={(editingBankGoal.stages || []).includes('school')}
                      onChange={(e) => {
                        const cur = editingBankGoal.stages || [];
                        const next = e.target.checked
                          ? [...cur, 'school']
                          : cur.filter((s) => s !== 'school');
                        setEditingBankGoal({
                          ...editingBankGoal,
                          stages: next.length > 0 ? next : ['school']
                        });
                      }}
                    />
                    <span>בית ספר</span>
                  </label>
                </div>
              </div>

              <div className="admin-field">
                <label>מונה שכיחות:</label>
                <input
                  type="number"
                  min={0}
                  value={editingBankGoal.usageCount}
                  onChange={(e) =>
                    setEditingBankGoal({
                      ...editingBankGoal,
                      usageCount: Number(e.target.value)
                    })
                  }
                />
              </div>

              <div className="admin-field full-span">
                <label>תיאור פעילות והשתתפות מומלץ:</label>
                <textarea
                  rows={2}
                  value={editingBankGoal.defaultActivity}
                  onChange={(e) =>
                    setEditingBankGoal({
                      ...editingBankGoal,
                      defaultActivity: e.target.value
                    })
                  }
                  placeholder="תיאור תפקוד בסביבה וגורמים מאפשרים/מגבילים..."
                />
              </div>

              <div className="admin-field full-span">
                <label>יעדים אופרטיביים משויכים:</label>
                <textarea
                  rows={3}
                  value={editingBankGoal.suggestedObjectivesText}
                  onChange={(e) =>
                    setEditingBankGoal({
                      ...editingBankGoal,
                      suggestedObjectivesText: e.target.value
                    })
                  }
                  placeholder="יעד אופרטיבי 1&#10;יעד אופרטיבי 2&#10;יעד אופרטיבי 3"
                />
              </div>

              <div className="admin-field full-span">
                <label>הזדמנויות, אמצעים ותיווך מומלץ:</label>
                <textarea
                  rows={2}
                  value={editingBankGoal.defaultOpportunities}
                  onChange={(e) =>
                    setEditingBankGoal({
                      ...editingBankGoal,
                      defaultOpportunities: e.target.value
                    })
                  }
                  placeholder="• המבוגר יזמין...&#10;• שימוש בכרטיסיות סדר יום..."
                />
              </div>

              <div className="admin-field">
                <label>שותפים מומלצים:</label>
                <input
                  type="text"
                  value={editingBankGoal.defaultPartners}
                  onChange={(e) =>
                    setEditingBankGoal({
                      ...editingBankGoal,
                      defaultPartners: e.target.value
                    })
                  }
                  placeholder="צוות הגן, סייעת אישית, מרפאה בעיסוק..."
                />
              </div>

              <div className="admin-field">
                <label>משך מומלץ:</label>
                <input
                  type="text"
                  value={editingBankGoal.defaultDuration}
                  onChange={(e) =>
                    setEditingBankGoal({
                      ...editingBankGoal,
                      defaultDuration: e.target.value
                    })
                  }
                  placeholder="עד סוף השנה / כשלושה חודשים"
                />
              </div>

              <div className="admin-field full-span">
                <label>אמות מידה להערכה:</label>
                <input
                  type="text"
                  value={editingBankGoal.defaultEvaluation}
                  onChange={(e) =>
                    setEditingBankGoal({
                      ...editingBankGoal,
                      defaultEvaluation: e.target.value
                    })
                  }
                  placeholder="כיצד נדע שהמטרה הושגה?"
                />
              </div>
            </div>

            <div className="admin-editor-actions">
              <button type="submit" className="btn-save-bank-goal">
                <Check size={16} />
                <span>
                  {editingBankGoal.mode === 'add'
                    ? 'שמור והוסף מטרה למאגר'
                    : 'שמור שינויים במטרה'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Controls Bar: Search & Stage Filter Pills */}
        <div className="goal-bank-controls-bar">
          <div className="goal-bank-search-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="חיפוש מטרה, סביבה או יעד במאגר..."
              value={goalBankSearch}
              onChange={(e) => setGoalBankSearch(e.target.value)}
            />
            {goalBankSearch && (
              <button
                type="button"
                onClick={() => setGoalBankSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                title="נקה חיפוש"
              >
                <X size={15} color="#94a3b8" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="goal-bank-stage-pills">
              <button
                type="button"
                className={`goal-bank-stage-btn ${activeStage === 'kindergarten' ? 'active' : ''}`}
                onClick={() => {
                  setGoalBankStageFilter('kindergarten');
                  setSelectedHlDomain(null);
                  setGoalBankEnvFilter('הכל');
                }}
              >
                גן
              </button>
              <button
                type="button"
                className={`goal-bank-stage-btn ${activeStage === 'school' ? 'active' : ''}`}
                onClick={() => {
                  setGoalBankStageFilter('school');
                  setSelectedHlDomain(null);
                  setGoalBankEnvFilter('הכל');
                }}
              >
                בית ספר
              </button>
              <button
                type="button"
                className={`goal-bank-stage-btn ${activeStage === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setGoalBankStageFilter('all');
                  setSelectedHlDomain(null);
                  setGoalBankEnvFilter('הכל');
                }}
              >
                הכל
              </button>
            </div>

            {selectedHlDomain && !goalBankSearch.trim() && (
              <button
                type="button"
                className="goal-bank-hl-back-btn"
                onClick={() => {
                  setSelectedHlDomain(null);
                  setGoalBankEnvFilter('הכל');
                }}
              >
                <span>←</span>
                <span>חזרה לכל התחומים</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: High-Level Goal Domains Grid (When no domain selected and no search) */}
        {!selectedHlDomain && !goalBankSearch.trim() ? (
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '14px' }}>
              בחר/י תחום פעילות או סביבה כדי לצפות במטרות המותאמות:
            </div>
            <div className="goal-bank-hl-domains-grid">
              {domainsToShow.map((item) => {
                const count = sortedBank.filter((g) => {
                  if (!isGoalRelevantForStage(g, activeStage)) return false;
                  const canon = canonicalizeEnvironment(g.environment);
                  return canon === item.name || (g.environment || '').includes(item.name);
                }).length;

                return (
                  <div
                    key={`${item.stage}-${item.name}`}
                    className="goal-bank-hl-card"
                    onClick={() => {
                      setSelectedHlDomain(item.name);
                      setGoalBankEnvFilter(item.name);
                    }}
                  >
                    <div className="goal-bank-hl-card-header">
                      <span className="goal-bank-hl-card-icon">
                        {DOMAIN_ICONS[item.name] || '🎯'}
                      </span>
                      <span
                        className={`stage-chip ${
                          item.stage === 'school' ? 'stage-chip-school' : 'stage-chip-kdg'
                        }`}
                      >
                        {item.stageLabel}
                      </span>
                    </div>
                    <div className="goal-bank-hl-card-title">{item.name}</div>
                    <div className="goal-bank-hl-card-footer">
                      <span className="goal-bank-hl-card-count">
                        {count} {count === 1 ? 'מטרה קיימת' : 'מטרות קיימות'}
                      </span>
                      <span className="goal-bank-hl-card-action">
                        צפה במטרות ⬅
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VIEW 2: Drilled-down Goals List (Under selected domain or during search) */
          <div>
            {selectedHlDomain && !goalBankSearch.trim() && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  marginBottom: '14px'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                  🎯 מטרות בתחום: <strong>{selectedHlDomain}</strong>
                </span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                  נמצאו {filteredGoals.length} מטרות
                </span>
              </div>
            )}

            {filteredGoals.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#64748b',
                  fontSize: '14px'
                }}
              >
                🔍 לא נמצאו מטרות תואמות לסינון המבוקש. באפשרותך להוסיף מטרה חדשה למאגר!
              </div>
            ) : (
              <div className="goal-bank-page-items">
                {filteredGoals.map((g, i) => {
                  const targetStudentForCheck =
                    activeBankTargetStudent &&
                    unsavedDraftState.isDirty &&
                    unsavedDraftState.draftData?.id === activeBankTargetStudent.id
                      ? unsavedDraftState.draftData
                      : activeBankTargetStudent;

                  const targetGender = targetStudentForCheck?.gender || 'boy';
                  const genderAdaptedTitle = adaptTextToGender(g.title || '', targetGender);
                  const isAlreadyInTargetStudent = Boolean(
                    targetStudentForCheck &&
                      (targetStudentForCheck.goals || []).some(
                        (stGoal) =>
                          (stGoal.title || '').trim() === genderAdaptedTitle.trim() ||
                          (stGoal.title || '').trim() === (g.title || '').trim()
                      )
                  );

                  const itemStages = Array.isArray(g.stages) && g.stages.length > 0
                    ? g.stages
                    : (g.stage ? [g.stage] : ['kindergarten']);

                  return (
                    <div key={g.id} className="goal-bank-option-row" style={{ cursor: 'default' }}>
                      <div className="goal-bank-option-main">
                        <div className="goal-option-title-line">
                          <span className="popularity-rank-badge">#{i + 1}</span>
                          {itemStages.includes('kindergarten') && (
                            <span className="stage-chip stage-chip-kdg">גן</span>
                          )}
                          {itemStages.includes('school') && (
                            <span className="stage-chip stage-chip-school">בית ספר</span>
                          )}
                          <strong>{g.title}</strong>
                          <span className="env-tag-chip">{canonicalizeEnvironment(g.environment)}</span>
                          <span className="usage-count-badge">
                            נבחר {g.usageCount ?? 0} פעמים
                          </span>
                        </div>
                      </div>

                      <div
                        className="goal-bank-admin-actions"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                      >
                        {activeBankTargetStudent && (
                          targetStudentForCheck?.isLocked ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #f59e0b',
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap'
                              }}
                              title="הדו״ח של התלמיד/ה נעול לעריכה"
                            >
                              <Lock size={13} />
                              <span>הדו"ח נעול</span>
                            </span>
                          ) : isAlreadyInTargetStudent ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: '#dcfce7',
                                color: '#166534',
                                border: '1px solid #86efac',
                                fontSize: '12px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Check size={14} />
                              <span>כבר בתכנית</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddGoalDirectly(g)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 13px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #4a88c7 0%, #6d5cae 100%)',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(74, 136, 199, 0.25)'
                              }}
                              title={`הוסף מטרה זו ישירות אל תכנית העבודה של ${
                                activeBankTargetStudent.name || 'התלמיד/ה'
                              } והעלה את משקל המטרה במאגר`}
                            >
                              <Plus size={14} />
                              <span>
                                הוסף לתכנית של{' '}
                                {(activeBankTargetStudent.name || 'התלמיד/ה').split(/\s+/)[0]}
                              </span>
                            </button>
                          )
                        )}

                        {currentUser.role === 'admin' && (
                          <>
                            <button
                              type="button"
                              className="btn-admin-edit-goal"
                              onClick={() => handleStartEditGoal(g)}
                              title="ערוך מטרה זו"
                            >
                              <Edit2 size={14} />
                              <span>ערוך</span>
                            </button>
                            <button
                              type="button"
                              className="btn-admin-delete-goal"
                              onClick={() => handleDeleteGoal(g)}
                              title="מחק מטרה זו מהמאגר"
                            >
                              <Trash2 size={14} />
                              <span>הסר</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
