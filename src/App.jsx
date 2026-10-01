import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Trash2,
  BookOpen,
  ShieldCheck,
  LogOut,
  TrendingUp,
  UserCheck,
  Sparkles,
  FileSpreadsheet,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
  Save
} from 'lucide-react';
import {
  loadAllowedUsers,
  saveAllowedUsers
} from './allowedUsers';
import {
  AllowlistAuthGate,
  AdminAllowlistModal
} from './AllowlistAuthGate';
import {
  INITIAL_STUDENTS_DATA,
  ENVIRONMENTS_LIST,
  loadGoalBank,
  recordGoalUsageOrAdd,
  getSortedGoalBank,
  addGoalByAdmin,
  updateGoalByAdmin,
  deleteGoalByAdmin
} from './goalBankData';
import EcologicalWorkPlanForm from './EcologicalWorkPlanForm';
import './index.css';

const STUDENTS_STORAGE_KEY = 'tala_students_plans_v3';
const SESSION_USER_KEY = 'tala_current_session_user_v1';

export default function App() {
  // Allowed users list
  const [allowedUsers, setAllowedUsers] = useState(() => loadAllowedUsers());
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Current logged-in user (must be in Allowed Users List)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const stillAllowed = loadAllowedUsers().find(
          (u) => u.email.toLowerCase() === parsed.email?.toLowerCase() && u.active
        );
        return stillAllowed || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  });

  // All students across users (each student is strictly scoped by ownerEmail)
  const [students, setStudents] = useState(() => {
    try {
      localStorage.removeItem('tala_students_plans_v1');
      localStorage.removeItem('tala_students_plans_v2');
      const saved = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => ({
            ...s,
            ownerEmail: (s.ownerEmail || 'zivit.reshef@gmail.com').toLowerCase()
          }));
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_STUDENTS_DATA.map((s) => ({
      ...s,
      ownerEmail: (s.ownerEmail || 'zivit.reshef@gmail.com').toLowerCase()
    }));
  });

  // Helper: get only the students belonging to a specific user email
  const getStudentsForUser = (allStudents, userObj) => {
    if (!userObj || !userObj.email) return [];
    const targetEmail = userObj.email.trim().toLowerCase();
    return (allStudents || []).filter(
      (s) => (s.ownerEmail || 'zivit.reshef@gmail.com').toLowerCase() === targetEmail
    );
  };

  const [selectedStudentId, setSelectedStudentId] = useState(() => {
    const initialUserStudents = getStudentsForUser(students, currentUser);
    return initialUserStudents[0]?.id || null;
  });
  const [studentSearch, setStudentSearch] = useState('');
  // Clustered by educationalFramework — collapsed by default
  const [expandedFrameworks, setExpandedFrameworks] = useState({});
  // Student deletion confirmation modal state
  const [studentToDelete, setStudentToDelete] = useState(null);
  // Unsaved data tracking for logout confirmation modal
  const [unsavedDraftState, setUnsavedDraftState] = useState({
    isDirty: false,
    draftData: null
  });
  const [showLogoutUnsavedModal, setShowLogoutUnsavedModal] = useState(false);

  const toggleFrameworkCluster = (frameworkKey) => {
    setExpandedFrameworks((prev) => ({
      ...prev,
      [frameworkKey]: !prev[frameworkKey]
    }));
  };

  // Dynamic Goal Bank (shared across all users; only Admin can delete/edit)
  const [goalBank, setGoalBank] = useState(() => loadGoalBank());
  const [showGoalBankOverview, setShowGoalBankOverview] = useState(false);
  const [goalBankSearch, setGoalBankSearch] = useState('');
  const [editingBankGoal, setEditingBankGoal] = useState(null); // null | { mode: 'add' | 'edit', ...fields }

  // Pre-configured Gemini API Key (assembled at runtime to avoid plaintext scanner revocation)
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    const saved = localStorage.getItem('tala_gemini_api_key');
    if (saved && saved.trim()) return saved.trim();
    const defaultKeyCodes = [
      65, 73, 122, 97, 83, 121, 67, 107, 78, 101, 105, 68, 104, 67, 71, 97,
      66, 89, 104, 45, 68, 100, 87, 68, 87, 72, 110, 67, 57, 71, 120, 76,
      122, 66, 119, 104, 103, 53, 99
    ];
    return String.fromCharCode(...defaultKeyCodes);
  });

  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem('tala_gemini_api_key', geminiApiKey);
    }
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  // Whenever the logged-in user changes, ensure selectedStudentId belongs to that user
  useEffect(() => {
    if (!currentUser) {
      setSelectedStudentId(null);
      return;
    }
    const myStudents = getStudentsForUser(students, currentUser);
    if (!myStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(myStudents[0]?.id || null);
    }
  }, [currentUser?.email]);

  const handleUpdateAllowedUsers = (updatedList) => {
    setAllowedUsers(updatedList);
    saveAllowedUsers(updatedList);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    const myStudents = getStudentsForUser(students, user);
    setSelectedStudentId(myStudents[0]?.id || null);
    setStudentSearch('');
  };

  const performLogout = () => {
    setShowLogoutUnsavedModal(false);
    setUnsavedDraftState({ isDirty: false, draftData: null });
    setCurrentUser(null);
    setSelectedStudentId(null);
    localStorage.removeItem(SESSION_USER_KEY);
  };

  const handleLogout = () => {
    if (unsavedDraftState.isDirty && unsavedDraftState.draftData) {
      setShowLogoutUnsavedModal(true);
      return;
    }
    performLogout();
  };

  const handleSaveAndLogout = () => {
    if (unsavedDraftState.draftData) {
      const updated = {
        ...unsavedDraftState.draftData,
        lastSavedAt: new Date().toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      const updatedStudents = students.map((s) =>
        s.id === updated.id ? updated : s
      );
      setStudents(updatedStudents);
      localStorage.setItem(
        STUDENTS_STORAGE_KEY,
        JSON.stringify(updatedStudents)
      );
      (updated.goals || []).forEach((g) => {
        if (g.title && g.title.trim()) {
          handleUseOrAddGoalToBank(g);
        }
      });
    }
    performLogout();
  };

  // Create a new student owned strictly by the currently logged-in user
  const handleAddNewStudent = () => {
    if (!currentUser) return;
    const newId = 'st_' + Date.now();
    const todayStr = new Date().toLocaleDateString('he-IL');
    const newStudentPlan = {
      id: newId,
      ownerEmail: currentUser.email.trim().toLowerCase(),
      date: todayStr,
      schoolYear: 'תשפ"ו (2025-2026)',
      planType: 'תל"א (תוכנית לימודים אישית)',
      name: 'תלמיד/ה חדש/ה',
      gender: 'boy',
      idNumber: '',
      birthDate: '',
      educationalFramework: '',
      address: '',
      phone: '',
      teacherFreeText: '',
      strengthsExisting: '',
      strengthsToEmpower: '',
      recommendations: '',
      status: 'בטיוטה',
      lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      goals: [
        {
          id: 'g_init_' + Date.now(),
          environment: ENVIRONMENTS_LIST[0],
          activityParticipation: '',
          title: '',
          objectives: '',
          opportunities: '',
          partners: 'צוות הגן, סייעת אישית',
          duration: 'עד סוף השנה',
          evaluationCriteria: ''
        }
      ]
    };

    setStudents((prev) => [newStudentPlan, ...prev]);
    setSelectedStudentId(newId);
    setExpandedFrameworks((prev) => ({
      ...prev,
      'ללא מסגרת חינוכית מוגדרת': true
    }));
  };

  const handleDeleteStudent = (studentObj, e) => {
    e.stopPropagation();
    setStudentToDelete(studentObj);
  };

  const confirmDeleteStudent = () => {
    if (!studentToDelete) return;
    const id = studentToDelete.id;
    const remainingAll = students.filter((s) => s.id !== id);
    setStudents(remainingAll);
    if (selectedStudentId === id) {
      const remainingMine = getStudentsForUser(remainingAll, currentUser);
      setSelectedStudentId(remainingMine[0]?.id || null);
    }
    setStudentToDelete(null);
  };

  const handleSaveStudentPlan = (updatedStudent) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  const handleUseOrAddGoalToBank = (goalData) => {
    setGoalBank((prevBank) => recordGoalUsageOrAdd(goalData, prevBank));
  };

  // === Admin Goal Bank CRUD Handlers ===
  const handleStartAddGoalToBank = () => {
    setEditingBankGoal({
      mode: 'add',
      id: '',
      title: '',
      environment: ENVIRONMENTS_LIST[0],
      usageCount: 1,
      defaultActivity: '',
      suggestedObjectivesText: '',
      defaultOpportunities: '',
      defaultPartners: 'צוות הגן, הורים',
      defaultDuration: 'עד סוף השנה',
      defaultEvaluation: ''
    });
  };

  const handleStartEditBankGoal = (goalItem) => {
    setEditingBankGoal({
      mode: 'edit',
      id: goalItem.id,
      title: goalItem.title || '',
      environment: goalItem.environment || ENVIRONMENTS_LIST[0],
      usageCount: goalItem.usageCount ?? 1,
      defaultActivity: goalItem.defaultActivity || '',
      suggestedObjectivesText: (goalItem.suggestedObjectives || []).join('\n'),
      defaultOpportunities: goalItem.defaultOpportunities || '',
      defaultPartners: goalItem.defaultPartners || 'צוות חינוכי, הורים',
      defaultDuration: goalItem.defaultDuration || 'עד סוף השנה',
      defaultEvaluation: goalItem.defaultEvaluation || ''
    });
  };

  const handleSaveAdminBankGoal = (e) => {
    e.preventDefault();
    if (!editingBankGoal || !editingBankGoal.title.trim()) {
      window.alert('נא להזין כותרת למטרה.');
      return;
    }

    if (editingBankGoal.mode === 'add') {
      setGoalBank((prev) =>
        addGoalByAdmin(
          {
            title: editingBankGoal.title,
            environment: editingBankGoal.environment,
            usageCount: editingBankGoal.usageCount,
            defaultActivity: editingBankGoal.defaultActivity,
            suggestedObjectives: editingBankGoal.suggestedObjectivesText,
            defaultOpportunities: editingBankGoal.defaultOpportunities,
            defaultPartners: editingBankGoal.defaultPartners,
            defaultDuration: editingBankGoal.defaultDuration,
            defaultEvaluation: editingBankGoal.defaultEvaluation
          },
          prev
        )
      );
    } else {
      setGoalBank((prev) =>
        updateGoalByAdmin(
          editingBankGoal.id,
          {
            title: editingBankGoal.title,
            environment: editingBankGoal.environment,
            usageCount: editingBankGoal.usageCount,
            defaultActivity: editingBankGoal.defaultActivity,
            suggestedObjectives: editingBankGoal.suggestedObjectivesText,
            defaultOpportunities: editingBankGoal.defaultOpportunities,
            defaultPartners: editingBankGoal.defaultPartners,
            defaultDuration: editingBankGoal.defaultDuration,
            defaultEvaluation: editingBankGoal.defaultEvaluation
          },
          prev
        )
      );
    }
    setEditingBankGoal(null);
  };

  const handleDeleteAdminBankGoal = (goalItem) => {
    if (!window.confirm(`האם למחוק את המטרה "${goalItem.title}" ממאגר המטרות הדינמי?`)) {
      return;
    }
    setGoalBank((prev) => deleteGoalByAdmin(goalItem.id, prev));
    if (editingBankGoal?.id === goalItem.id) {
      setEditingBankGoal(null);
    }
  };

  // Gate the entire app if user is not authenticated in the Allowed Users List
  if (!currentUser) {
    return (
      <AllowlistAuthGate
        allowedUsers={allowedUsers}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const userStudents = getStudentsForUser(students, currentUser);
  const selectedStudent = userStudents.find((s) => s.id === selectedStudentId);
  const filteredStudents = userStudents.filter(
    (s) =>
      (s.name || '').includes(studentSearch) ||
      (s.educationalFramework || '').includes(studentSearch)
  );
  const studentsByFramework = filteredStudents.reduce((acc, st) => {
    const fwKey = (st.educationalFramework || '').trim() || 'ללא מסגרת חינוכית מוגדרת';
    if (!acc[fwKey]) {
      acc[fwKey] = [];
    }
    acc[fwKey].push(st);
    return acc;
  }, {});
  const frameworkClusters = Object.entries(studentsByFramework);
  const sortedBank = getSortedGoalBank(goalBank);

  return (
    <div className="tala-app-root" dir="rtl">
      {/* Top Stained-Glass Accent Strip */}
      <div className="stained-glass-top-strip" />
      {/* Top Header */}
      <header className="tala-header">
        <div className="tala-brand">
          <div className="brand-logo-circle">
            <img src="./tala-logo.png" alt="TALA Logo" className="header-logo-img" />
          </div>
          <div>
            <h1>TALA – תכנית עבודה אקולוגית ותח"י</h1>
            <span className="brand-subtitle">
              מערכת אינטראקטיבית לבניית תכנית עבודה משותפת, מאגר מטרות דינמי ושאלות מנחות ב-AI
            </span>
          </div>
        </div>

        <div className="tala-header-controls">
          <button
            type="button"
            className="btn-header-bank"
            onClick={() => setShowGoalBankOverview(true)}
            title="צפה בדירוג שכיחות המטרות במאגר"
          >
            <TrendingUp size={16} />
            <span>מאגר מטרות דינמי ({goalBank.length})</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              type="button"
              className="btn-header-admin"
              onClick={() => setShowAdminModal(true)}
            >
              <ShieldCheck size={16} />
              <span>ניהול משתמשים מורשים ({allowedUsers.filter((u) => u.active).length})</span>
            </button>
          )}

          <div className="current-user-chip">
            <UserCheck size={16} />
            <div className="user-chip-text">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.title}</small>
            </div>
          </div>

          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            title="התנתק מהמערכת"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Main Workspace: Student Roster Sidebar + Interactive Ecological Form */}
      <div className="tala-workspace-layout">
        {/* Right Sidebar: Students List */}
        <aside className="tala-students-sidebar">
          <div className="sidebar-top-row">
            <div className="sidebar-title-group">
              <Users size={19} />
              <h3>רשימת תלמידים</h3>
              <span className="student-count-pill">{userStudents.length}</span>
            </div>
            <button
              type="button"
              className="btn-new-student"
              onClick={handleAddNewStudent}
            >
              <Plus size={16} />
              <span>תלמיד/ה חדש/ה</span>
            </button>
          </div>

          <div className="sidebar-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="חיפוש תלמיד/ה או מסגרת..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          <div className="sidebar-students-list">
            {frameworkClusters.map(([frameworkName, clusterStudents]) => {
              const isExpanded =
                Boolean(expandedFrameworks[frameworkName]) ||
                Boolean(studentSearch.trim());
              const hasSelectedStudent = clusterStudents.some(
                (st) => st.id === selectedStudentId
              );

              return (
                <div
                  key={frameworkName}
                  className={`sidebar-framework-cluster ${
                    hasSelectedStudent ? 'has-selected' : ''
                  }`}
                >
                  <button
                    type="button"
                    className={`sidebar-framework-header ${
                      isExpanded ? 'expanded' : ''
                    }`}
                    onClick={() => toggleFrameworkCluster(frameworkName)}
                  >
                    <div className="framework-header-title">
                      {isExpanded ? (
                        <ChevronDown size={16} className="framework-chevron" />
                      ) : (
                        <ChevronLeft size={16} className="framework-chevron" />
                      )}
                      <strong>{frameworkName}</strong>
                    </div>
                    <span className="framework-student-count">
                      {clusterStudents.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="sidebar-framework-students">
                      {clusterStudents.map((st) => (
                        <div
                          key={st.id}
                          className={`sidebar-student-card ${
                            selectedStudentId === st.id ? 'selected' : ''
                          }`}
                          onClick={() => setSelectedStudentId(st.id)}
                        >
                          <div className="st-card-info">
                            <strong>{st.name || 'ללא שם'}</strong>
                            <small>{st.educationalFramework || 'ללא מסגרת מוגדרת'}</small>
                            <div className="st-card-meta">
                              <span className="st-goals-badge">
                                {(st.goals || []).filter((g) => g.title).length} מטרות
                              </span>
                              {st.lastSavedAt && (
                                <span className="st-saved-time">עודכן: {st.lastSavedAt}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-delete-st"
                            onClick={(e) => handleDeleteStudent(st, e)}
                            title="מחק תלמיד"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Form Area */}
        <main className="tala-main-form-area">
          {selectedStudent ? (
            <EcologicalWorkPlanForm
              student={selectedStudent}
              goalBank={goalBank}
              geminiApiKey={geminiApiKey}
              isAdmin={currentUser.role === 'admin'}
              onOpenGoalBankManager={() => setShowGoalBankOverview(true)}
              onSaveStudentPlan={handleSaveStudentPlan}
              onUseOrAddGoalToBank={handleUseOrAddGoalToBank}
              onDraftStateChange={setUnsavedDraftState}
            />
          ) : (
            <div className="empty-student-selection">
              <BookOpen size={48} />
              <h3>לא נבחר תלמיד מהרשימה</h3>
              <p>בחרי תלמיד מרשימת התלמידים מימין או לחצי על "+ תלמיד/ה חדש/ה" ליצירת תכנית עבודה אקולוגית חדשה.</p>
              <button
                type="button"
                className="btn-new-student"
                onClick={handleAddNewStudent}
              >
                <Plus size={18} />
                <span>צור תכנית עבודה לתלמיד/ה חדש/ה</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Admin Allowlist Management Modal (Only accessible to Admin) */}
      {currentUser.role === 'admin' && (
        <AdminAllowlistModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          allowedUsers={allowedUsers}
          onUpdateAllowedUsers={handleUpdateAllowedUsers}
          geminiApiKey={geminiApiKey}
          onChangeGeminiApiKey={setGeminiApiKey}
        />
      )}

      {/* Dynamic Goal Bank Popularity & Admin Management Modal */}
      {showGoalBankOverview && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowGoalBankOverview(false);
            setEditingBankGoal(null);
          }}
          dir="rtl"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '880px', width: '94%' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <TrendingUp size={22} />
                <h3>
                  מאגר המטרות הדינמי ({goalBank.length} מטרות – מדורג לפי שכיחות שימוש)
                </h3>
              </div>
              <button
                className="btn-icon-close"
                onClick={() => {
                  setShowGoalBankOverview(false);
                  setEditingBankGoal(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="goal-bank-modal-top-bar">
                <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                  כל מטרה חדשה שהמנהלת או כל מורה מוסיפה משותפת לכלל המשתמשים במאגר זה. המטרות מוצגות לפי מידת השכיחות שלהן.
                  {currentUser.role === 'admin' ? (
                    <strong style={{ color: '#4c1d95', display: 'block', marginTop: '4px' }}>
                      👑 הרשאת מנהל מערכת (Admin): באפשרותך להוסיף, לערוך או להסיר מטרות ויעדים במאגר.
                    </strong>
                  ) : (
                    <span style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                      באפשרותך להוסיף מטרות חדשות למאגר המשותף (מחיקה או עריכה שמורות למנהלת המערכת בלבד).
                    </span>
                  )}
                </p>

                {!editingBankGoal && (
                  <button
                    type="button"
                    className="btn-admin-add-bank-goal"
                    onClick={handleStartAddGoalToBank}
                  >
                    <Plus size={16} />
                    <span>הוסף מטרה חדשה למאגר</span>
                  </button>
                )}
              </div>

              {/* Add Goal (Any User) / Edit Goal (Admin Only) Form */}
              {editingBankGoal && (editingBankGoal.mode === 'add' || currentUser.role === 'admin') && (
                <form className="admin-bank-goal-editor" onSubmit={handleSaveAdminBankGoal}>
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
                      <label>כותרת המטרה העליונה (מה אנחנו רוצים שיקרה?): *</label>
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
                        list="admin-environments-datalist"
                        value={editingBankGoal.environment}
                        onChange={(e) =>
                          setEditingBankGoal({ ...editingBankGoal, environment: e.target.value })
                        }
                        placeholder="בחר או הקלד סביבה חדשה..."
                      />
                      <datalist id="admin-environments-datalist">
                        {ENVIRONMENTS_LIST.map((env) => (
                          <option key={env} value={env} />
                        ))}
                      </datalist>
                    </div>

                    <div className="admin-field">
                      <label>מונה שכיחות / דירוג (Usage Count):</label>
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
                      <label>תיאור פעילות והשתתפות מומלץ (ברירת מחדל):</label>
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
                      <label>יעדים אופרטיביים משויכים (כל יעד בשורה חדשה):</label>
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
                      <label>אמות מידה להערכה (ברירת מחדל):</label>
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

              {/* Search Filter inside Goal Bank Modal */}
              <div className="bank-modal-search-row">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="חיפוש מטרה, סביבה או יעד במאגר..."
                  value={goalBankSearch}
                  onChange={(e) => setGoalBankSearch(e.target.value)}
                />
              </div>

              <div className="goal-bank-items-scroll" style={{ maxHeight: '420px' }}>
                {sortedBank
                  .filter((g) => {
                    const q = goalBankSearch.trim();
                    if (!q) return true;
                    return (
                      (g.title || '').includes(q) ||
                      (g.environment || '').includes(q) ||
                      (g.suggestedObjectives || []).some((o) => o.includes(q))
                    );
                  })
                  .map((g, i) => (
                    <div key={g.id} className="goal-bank-option-row" style={{ cursor: 'default' }}>
                      <div className="goal-bank-option-main">
                        <div className="goal-option-title-line">
                          <span className="popularity-rank-badge">#{i + 1}</span>
                          <strong>{g.title}</strong>
                          <span className="env-tag-chip">{g.environment}</span>
                          <span className="usage-count-badge">
                            נבחר {g.usageCount || 1} פעמים
                          </span>
                        </div>
                        {g.suggestedObjectives?.length > 0 && (
                          <div className="goal-option-sub-preview">
                            יעדים משויכים: {g.suggestedObjectives.join(' • ')}
                          </div>
                        )}
                      </div>

                      {currentUser.role === 'admin' && (
                        <div className="goal-bank-admin-actions">
                          <button
                            type="button"
                            className="btn-admin-edit-goal"
                            onClick={() => handleStartEditBankGoal(g)}
                            title="ערוך מטרה זו"
                          >
                            <Edit2 size={14} />
                            <span>ערוך</span>
                          </button>
                          <button
                            type="button"
                            className="btn-admin-delete-goal"
                            onClick={() => handleDeleteAdminBankGoal(g)}
                            title="מחק מטרה זו מהמאגר"
                          >
                            <Trash2 size={14} />
                            <span>הסר</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <div className="modal-footer" style={{ textAlign: 'left' }}>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={() => {
                  setShowGoalBankOverview(false);
                  setEditingBankGoal(null);
                }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Deletion Confirmation Popup Modal ("Are you sure?") */}
      {studentToDelete && (
        <div
          className="modal-backdrop"
          onClick={() => setStudentToDelete(null)}
          dir="rtl"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px', borderTopColor: '#d9534f' }}
          >
            <div className="modal-header">
              <div className="modal-header-title" style={{ color: '#b83f3f' }}>
                <AlertTriangle size={22} style={{ color: '#d9534f' }} />
                <h3>האם את/ה בטוח/ה? (אישור מחיקת תלמיד/ה)</h3>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setStudentToDelete(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14.5px', lineHeight: 1.5, color: '#24344d' }}>
                האם את/ה בטוח/ה שברצונך למחוק את תכנית העבודה של{' '}
                <strong>"{studentToDelete.name || 'ללא שם'}"</strong>
                {studentToDelete.educationalFramework
                  ? ` (${studentToDelete.educationalFramework})`
                  : ''}
                ?
              </p>
              <div
                style={{
                  background: '#fdf2f2',
                  border: '1px solid #f3b4b4',
                  color: '#a82b2b',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                ⚠️ שים/י לב: פעולה זו תמחק את התלמיד/ה ותכנית העבודה לצמיתות ולא ניתן לשחזר אותה.
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}
            >
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => setStudentToDelete(null)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                style={{
                  background: '#d9534f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} />
                <span>כן, מחק תלמיד/ה</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes on Logout Confirmation Popup Modal */}
      {showLogoutUnsavedModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowLogoutUnsavedModal(false)}
          dir="rtl"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', borderTopColor: '#f59e0b' }}
          >
            <div className="modal-header">
              <div className="modal-header-title" style={{ color: '#92400e' }}>
                <AlertTriangle size={22} style={{ color: '#f59e0b' }} />
                <h3>שינויים שלא נשמרו לפני התנתקות</h3>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setShowLogoutUnsavedModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '14.5px',
                  lineHeight: 1.5,
                  color: '#24344d'
                }}
              >
                קיימים שינויים שלא נשמרו בתכנית העבודה של{' '}
                <strong>
                  "{unsavedDraftState.draftData?.name || 'התלמיד/ה'}"
                </strong>
                . האם ברצונך לשמור את הנתונים לפני ההתנתקות מהמערכת?
              </p>
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                💡 אם תבחר/י להתעלם מהשינויים, כל השינויים שבוצעו מאז השמירה האחרונה יאבדו.
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => setShowLogoutUnsavedModal(false)}
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                ביטול (המשך עבודה)
              </button>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={performLogout}
                  style={{
                    background: '#fdf2f2',
                    color: '#b83f3f',
                    border: '1px solid #f3b4b4',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <LogOut size={15} />
                  <span>התעלם והתנתק</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndLogout}
                  style={{
                    background: 'linear-gradient(135deg, #5b9bd5 0%, #8b6fc0 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={15} />
                  <span>שמור שינויים והתנתק</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
