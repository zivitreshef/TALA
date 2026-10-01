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
  FileSpreadsheet
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
  loadGoalBank,
  recordGoalUsageOrAdd,
  getSortedGoalBank
} from './goalBankData';
import EcologicalWorkPlanForm from './EcologicalWorkPlanForm';
import './index.css';

const STUDENTS_STORAGE_KEY = 'tala_students_plans_v1';
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

  // Students list & their ecological work plans
  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_STUDENTS_DATA;
  });

  const [selectedStudentId, setSelectedStudentId] = useState(
    () => students[0]?.id || null
  );
  const [studentSearch, setStudentSearch] = useState('');

  // Dynamic Goal Bank
  const [goalBank, setGoalBank] = useState(() => loadGoalBank());
  const [showGoalBankOverview, setShowGoalBankOverview] = useState(false);

  // Optional Gemini API Key
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('tala_gemini_api_key') || '';
  });

  useEffect(() => {
    localStorage.setItem('tala_gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  const handleUpdateAllowedUsers = (updatedList) => {
    setAllowedUsers(updatedList);
    saveAllowedUsers(updatedList);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_USER_KEY);
  };

  // Create a new student and open blank interactive form
  const handleAddNewStudent = () => {
    const newId = 'st_' + Date.now();
    const todayStr = new Date().toLocaleDateString('he-IL');
    const newStudentPlan = {
      id: newId,
      date: todayStr,
      schoolYear: 'תשפ"ו (2025-2026)',
      name: 'תלמיד/ה חדש/ה',
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
          environment: 'מרחב הגן',
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
  };

  const handleDeleteStudent = (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`האם למחוק את תכנית העבודה של "${name}"?`)) return;
    const remaining = students.filter((s) => s.id !== id);
    setStudents(remaining);
    if (selectedStudentId === id) {
      setSelectedStudentId(remaining[0]?.id || null);
    }
  };

  const handleSaveStudentPlan = (updatedStudent) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  const handleUseOrAddGoalToBank = (goalData) => {
    setGoalBank((prevBank) => recordGoalUsageOrAdd(goalData, prevBank));
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

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const filteredStudents = students.filter(
    (s) =>
      (s.name || '').includes(studentSearch) ||
      (s.educationalFramework || '').includes(studentSearch)
  );
  const sortedBank = getSortedGoalBank(goalBank);

  return (
    <div className="tala-app-root" dir="rtl">
      {/* Top Stained-Glass Accent Strip */}
      <div className="stained-glass-top-strip" />
      {/* Top Header */}
      <header className="tala-header">
        <div className="tala-brand">
          <div className="brand-logo-circle">
            <img src="./tala-logo.jpg" alt="TALA Logo" className="header-logo-img" />
          </div>
          <div>
            <h1>TALA – תכנית עבודה אקולוגית ותח"י</h1>
            <span className="brand-subtitle">
              מערכת אינטראקטיבית לבניית תכנית עבודה משותפת, מאגר מטרות דינמי ושאלות מנחות ב-AI
            </span>
          </div>
        </div>

        <div className="tala-header-controls">
          <div className="api-key-pill">
            <Sparkles size={14} />
            <span>מפתח Gemini AI:</span>
            <input
              type="password"
              placeholder="אופציונלי להעשרת AI..."
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
          </div>

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
              <span className="student-count-pill">{students.length}</span>
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
            {filteredStudents.map((st) => (
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
                  onClick={(e) => handleDeleteStudent(st.id, st.name, e)}
                  title="מחק תלמיד"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Form Area */}
        <main className="tala-main-form-area">
          {selectedStudent ? (
            <EcologicalWorkPlanForm
              student={selectedStudent}
              goalBank={goalBank}
              geminiApiKey={geminiApiKey}
              onSaveStudentPlan={handleSaveStudentPlan}
              onUseOrAddGoalToBank={handleUseOrAddGoalToBank}
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

      {/* Admin Allowlist Management Modal */}
      <AdminAllowlistModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        allowedUsers={allowedUsers}
        onUpdateAllowedUsers={handleUpdateAllowedUsers}
      />

      {/* Dynamic Goal Bank Popularity Modal */}
      {showGoalBankOverview && (
        <div className="modal-backdrop" onClick={() => setShowGoalBankOverview(false)} dir="rtl">
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <TrendingUp size={22} />
                <h3>מאגר המטרות הדינמי (מדורג אוטומטית לפי שכיחות שימוש)</h3>
              </div>
              <button
                className="btn-icon-close"
                onClick={() => setShowGoalBankOverview(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: '#475569', marginTop: 0 }}>
                כל מטרה חדשה שמורה מגדירה נשמרת אוטומטית במאגר זה. המטרות מוצגות למורים לפי מידת השכיחות שלהן (הנפוצות ביותר בראש הרשימה והפחות נפוצות בתחתית).
              </p>
              <div className="goal-bank-items-scroll" style={{ maxHeight: '420px' }}>
                {sortedBank.map((g, i) => (
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
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ textAlign: 'left' }}>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={() => setShowGoalBankOverview(false)}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
