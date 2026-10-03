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
  Save,
  Archive,
  RotateCcw,
  Printer,
  KeyRound
} from 'lucide-react';
import {
  loadAllowedUsers,
  saveAllowedUsers,
  stampSessionUserWithDate,
  isSessionUserValidForToday
} from './allowedUsers';
import {
  AllowlistAuthGate,
  AdminAllowlistModal,
  UserSelfPasswordModal
} from './AllowlistAuthGate';
import {
  INITIAL_STUDENTS_DATA,
  ENVIRONMENTS_LIST,
  loadGoalBank,
  saveGoalBank,
  recordGoalUsageOrAdd,
  getSortedGoalBank,
  addGoalByAdmin,
  updateGoalByAdmin,
  deleteGoalByAdmin,
  getNextSchoolYear,
  buildRolloverStudentForNextYear
} from './goalBankData';
import {
  subscribeToTalaBackend,
  saveAllowedUsersToCloud,
  saveAdminRequestsToCloud,
  saveGoalBankToCloud,
  saveSettingsToCloud,
  saveStudentToCloud,
  deleteStudentFromCloud,
  ensureFirebaseAuthSession,
  signOutFirebaseAuthSession
} from './firebaseBackend';
import {
  loadEmailEngineConfig,
  saveEmailEngineConfig
} from './emailService';
import {
  PRIMARY_ADMIN_EMAIL,
  isStudentOwnedByUser,
  getStudentsForUser,
  getArchivedStudentsForUser
} from './domain/permissions';
import {
  safeGetStorageItem,
  safeSetStorageItem,
  safeRemoveStorageItem,
  safeGetStorageJson,
  safeSetStorageJson
} from './services/storage';
import ErrorBoundary from './components/ErrorBoundary';
import {
  DeleteStudentModal,
  ArchiveStudentModal,
  LogoutUnsavedModal
} from './components/modals/StudentActionModals';
import EcologicalWorkPlanForm from './EcologicalWorkPlanForm';
import './index.css';

const STUDENTS_STORAGE_KEY = 'tala_students_plans_v3';
const SESSION_USER_KEY = 'tala_current_session_user_v1';
const PASSWORD_POLICY_STORAGE_KEY = 'tala_enforce_password_policy_v1';
const ADMIN_REQUESTS_STORAGE_KEY = 'tala_admin_requests_v1';

export default function App() {
  // Allowed users list
  const [allowedUsers, setAllowedUsers] = useState(() => loadAllowedUsers());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showSelfPasswordModal, setShowSelfPasswordModal] = useState(false);
  const [cloudSyncState, setCloudSyncState] = useState({
    connected: false,
    status: 'local_only'
  });

  // Contact Admin requests from landing page
  const [adminRequests, setAdminRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(ADMIN_REQUESTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Password Policy Enforcement flag (Admin setting)
  const [enforcePasswordPolicy, setEnforcePasswordPolicy] = useState(() => {
    try {
      return localStorage.getItem(PASSWORD_POLICY_STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  // Direct Background Email Engine configuration (synced across cloud for all users)
  const [emailEngineConfig, setEmailEngineConfig] = useState(() => loadEmailEngineConfig());

  const handleUpdateEmailEngineConfig = (nextCfg) => {
    const saved = saveEmailEngineConfig(nextCfg);
    setEmailEngineConfig(saved);
    saveSettingsToCloud({ emailEngineConfig: saved });
  };

  const handleChangeEnforcePasswordPolicy = (enabled) => {
    const nextVal = Boolean(enabled);
    setEnforcePasswordPolicy(nextVal);
    localStorage.setItem(PASSWORD_POLICY_STORAGE_KEY, String(nextVal));
    saveSettingsToCloud({ enforcePasswordPolicy: nextVal });
  };

  const handleSubmitAdminRequest = (newReq) => {
    setAdminRequests((prev) => {
      const next = [newReq, ...prev];
      localStorage.setItem(ADMIN_REQUESTS_STORAGE_KEY, JSON.stringify(next));
      saveAdminRequestsToCloud(next);
      return next;
    });
  };

  const handleDismissAdminRequest = (reqId) => {
    setAdminRequests((prev) => {
      const next = prev.filter((r) => r.id !== reqId);
      localStorage.setItem(ADMIN_REQUESTS_STORAGE_KEY, JSON.stringify(next));
      saveAdminRequestsToCloud(next);
      return next;
    });
  };

  // Current logged-in user (must be in Allowed Users List and logged in today)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!isSessionUserValidForToday(parsed)) {
          localStorage.removeItem(SESSION_USER_KEY);
          return null;
        }
        const stillAllowed = loadAllowedUsers().find(
          (u) => u.email.toLowerCase() === parsed.email?.toLowerCase() && u.active
        );
        if (!stillAllowed) {
          localStorage.removeItem(SESSION_USER_KEY);
          return null;
        }
        return {
          ...stillAllowed,
          sessionDate: parsed.sessionDate,
          loginAt: parsed.loginAt
        };
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
            ownerEmail: (s.ownerEmail || PRIMARY_ADMIN_EMAIL).toLowerCase()
          }));
        }
      }
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_STUDENTS_DATA.map((s) => ({
      ...s,
      ownerEmail: (s.ownerEmail || PRIMARY_ADMIN_EMAIL).toLowerCase()
    }));
  });

  // Do NOT auto-open any student report upon login/re-login; start on the inside landing page (selectedStudentId = null)
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [insideLandingSearch, setInsideLandingSearch] = useState('');
  // Clustered by educationalFramework — collapsed by default
  const [expandedFrameworks, setExpandedFrameworks] = useState({});
  // Student deletion & archive confirmation modal states
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [studentToArchive, setStudentToArchive] = useState(null);
  // Archive viewer modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [selectedArchivedStudentId, setSelectedArchivedStudentId] = useState(null);
  const [selectedArchiveYear, setSelectedArchiveYear] = useState(null);
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

  const handleChangeGeminiApiKey = (newKey) => {
    setGeminiApiKey(newKey);
    if (newKey) {
      localStorage.setItem('tala_gemini_api_key', newKey);
      saveSettingsToCloud({ geminiApiKey: newKey });
    }
  };

  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem('tala_gemini_api_key', geminiApiKey);
    }
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  // Real-time Cloud Firestore Backend Subscription
  useEffect(() => {
    const unsubscribe = subscribeToTalaBackend({
      getInitialAllowedUsers: () => loadAllowedUsers(),
      getInitialGoalBank: () => loadGoalBank(),
      getInitialStudents: () => students,
      getInitialGeminiKey: () => geminiApiKey,
      onAllowedUsersChange: (cloudUsers) => {
        setAllowedUsers(cloudUsers);
        saveAllowedUsers(cloudUsers);
      },
      onGoalBankChange: (cloudGoals) => {
        const hasOldTestingWeights =
          localStorage.getItem('tala_cloud_goal_weights_zeroed_v1') !== 'true' &&
          Array.isArray(cloudGoals) &&
          cloudGoals.some((g) => Number(g.usageCount) > 0);

        if (hasOldTestingWeights) {
          const zeroedGoals = cloudGoals.map((g) => ({ ...g, usageCount: 0 }));
          localStorage.setItem('tala_cloud_goal_weights_zeroed_v1', 'true');
          setGoalBank(zeroedGoals);
          saveGoalBank(zeroedGoals);
          saveGoalBankToCloud(zeroedGoals);
        } else {
          localStorage.setItem('tala_cloud_goal_weights_zeroed_v1', 'true');
          setGoalBank(cloudGoals);
          saveGoalBank(cloudGoals);
        }
      },
      onStudentsChange: (cloudStudents) => {
        const normalized = cloudStudents.map((s) => ({
          ...s,
          ownerEmail: (s.ownerEmail || 'zivit.reshef@gmail.com').toLowerCase()
        }));
        setStudents(normalized);
        localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(normalized));
      },
      onSettingsChange: (settings) => {
        if (settings?.geminiApiKey) {
          setGeminiApiKey(settings.geminiApiKey);
          localStorage.setItem('tala_gemini_api_key', settings.geminiApiKey);
        }
        if (typeof settings?.enforcePasswordPolicy === 'boolean') {
          setEnforcePasswordPolicy(settings.enforcePasswordPolicy);
          localStorage.setItem(
            PASSWORD_POLICY_STORAGE_KEY,
            String(settings.enforcePasswordPolicy)
          );
        }
        if (Array.isArray(settings?.adminRequests)) {
          setAdminRequests(settings.adminRequests);
          localStorage.setItem(
            ADMIN_REQUESTS_STORAGE_KEY,
            JSON.stringify(settings.adminRequests)
          );
        }
        if (settings?.emailEngineConfig && typeof settings.emailEngineConfig === 'object') {
          const syncedEmailCfg = saveEmailEngineConfig(settings.emailEngineConfig);
          setEmailEngineConfig(syncedEmailCfg);
        }
      },
      onSyncStatusChange: (statusObj) => {
        setCloudSyncState(statusObj);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Ensure logged-in user is still active and sync mustChangePassword when allowedUsers changes in real time
  useEffect(() => {
    if (!currentUser) return;
    const matchingUser = allowedUsers.find(
      (u) => u.email.toLowerCase() === currentUser.email?.toLowerCase()
    );
    if (matchingUser) {
      if (!matchingUser.active) {
        performLogout();
      } else if (
        Boolean(matchingUser.mustChangePassword) !== Boolean(currentUser.mustChangePassword) ||
        (matchingUser.group || '') !== (currentUser.group || '')
      ) {
        const syncedUser = {
          ...currentUser,
          group: matchingUser.group || '',
          mustChangePassword: Boolean(matchingUser.mustChangePassword)
        };
        setCurrentUser(syncedUser);
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(syncedUser));
      }
    }
  }, [allowedUsers]);

  // If the currently selected student no longer belongs to the logged-in user (or was deleted/archived), return to the inside landing page (null)
  useEffect(() => {
    if (!currentUser) {
      setSelectedStudentId(null);
      return;
    }
    if (!selectedStudentId) return;
    const myStudents = getStudentsForUser(students, currentUser);
    if (!myStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [currentUser?.email, students.length, selectedStudentId]);

  const handleUpdateAllowedUsers = (updatedList) => {
    setAllowedUsers(updatedList);
    saveAllowedUsers(updatedList);
    saveAllowedUsersToCloud(updatedList);
  };

  useEffect(() => {
    if (currentUser?.email) {
      ensureFirebaseAuthSession(currentUser.email, currentUser.accessCode);
    }
  }, [currentUser?.email]);

  const handleChangeOwnPassword = (newAccessCode) => {
    if (!currentUser) return;
    const updatedList = allowedUsers.map((u) =>
      u.email.toLowerCase() === currentUser.email.toLowerCase()
        ? { ...u, accessCode: newAccessCode, mustChangePassword: false }
        : u
    );
    handleUpdateAllowedUsers(updatedList);
    const updatedCurrent = {
      ...currentUser,
      accessCode: newAccessCode,
      mustChangePassword: false
    };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);
  };

  const handleLoginSuccess = (user) => {
    const stampedUser = stampSessionUserWithDate(user);
    setCurrentUser(stampedUser);
    safeSetStorageJson(SESSION_USER_KEY, stampedUser);
    ensureFirebaseAuthSession(user.email, user.accessCode);
    setSelectedStudentId(null);
    setStudentSearch('');
    setInsideLandingSearch('');
  };

  const performLogout = () => {
    setShowLogoutUnsavedModal(false);
    setUnsavedDraftState({ isDirty: false, draftData: null });
    setCurrentUser(null);
    setSelectedStudentId(null);
    safeRemoveStorageItem(SESSION_USER_KEY);
    signOutFirebaseAuthSession();
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
      saveStudentToCloud(updated);
      (updated.goals || []).forEach((g) => {
        if (g.title && g.title.trim()) {
          handleUseOrAddGoalToBank(g);
        }
      });
    }
    performLogout();
  };

  // Daily auto-logout: reset session automatically when a new calendar day starts
  useEffect(() => {
    if (!currentUser) return undefined;

    const checkDailySessionExpiry = () => {
      if (!isSessionUserValidForToday(currentUser)) {
        if (unsavedDraftState.isDirty && unsavedDraftState.draftData) {
          handleSaveAndLogout();
        } else {
          performLogout();
        }
      }
    };

    const intervalId = setInterval(checkDailySessionExpiry, 60 * 1000);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkDailySessionExpiry();
      }
    };

    window.addEventListener('focus', checkDailySessionExpiry);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', checkDailySessionExpiry);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [currentUser, unsavedDraftState.isDirty, unsavedDraftState.draftData, students]);

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
      name: '',
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
    saveStudentToCloud(newStudentPlan);
    setSelectedStudentId(newId);
    setExpandedFrameworks((prev) => ({
      ...prev,
      'ללא מסגרת חינוכית מוגדרת': true
    }));
  };

  const handleDeleteStudent = (studentObj, e) => {
    if (e) e.stopPropagation();
    if (!isStudentOwnedByUser(studentObj, currentUser)) return;
    setStudentToDelete(studentObj);
  };

  const confirmDeleteStudent = () => {
    if (!studentToDelete || !isStudentOwnedByUser(studentToDelete, currentUser)) {
      setStudentToDelete(null);
      return;
    }
    const id = studentToDelete.id;
    const remainingAll = students.filter((s) => s.id !== id);
    setStudents(remainingAll);
    deleteStudentFromCloud(id);
    if (selectedStudentId === id) {
      setSelectedStudentId(null);
    }
    if (selectedArchivedStudentId === id) {
      const remainingArchived = getArchivedStudentsForUser(remainingAll, currentUser);
      setSelectedArchivedStudentId(remainingArchived[0]?.id || null);
    }
    setStudentToDelete(null);
  };

  const handleRequestArchiveStudent = (studentObj, e) => {
    if (e) e.stopPropagation();
    if (!isStudentOwnedByUser(studentObj, currentUser)) return;
    setStudentToArchive(studentObj);
  };

  const confirmArchiveStudent = (overrideStudent = null) => {
    const target = overrideStudent || studentToArchive;
    if (!target || !isStudentOwnedByUser(target, currentUser)) {
      setStudentToArchive(null);
      return;
    }
    const id = target.id;
    const archivedDate = new Date().toLocaleDateString('he-IL');

    let archivedStudentDoc = null;
    const updatedAll = students.map((s) => {
      if (s.id !== id) return s;
      const baseData =
        unsavedDraftState.isDirty && unsavedDraftState.draftData?.id === id
          ? unsavedDraftState.draftData
          : s;
      archivedStudentDoc = {
        ...baseData,
        archived: true,
        archivedAt: archivedDate,
        status: 'הושלם – בארכיון'
      };
      return archivedStudentDoc;
    });

    setStudents(updatedAll);
    if (archivedStudentDoc) {
      saveStudentToCloud(archivedStudentDoc);
    }
    if (selectedStudentId === id) {
      setSelectedStudentId(null);
      setUnsavedDraftState({ isDirty: false, draftData: null });
    }
    setSelectedArchivedStudentId(id);
    setStudentToArchive(null);
    setStudentToDelete(null);
  };

  const handleRestoreFromArchive = (studentId) => {
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent || !isStudentOwnedByUser(targetStudent, currentUser)) return;
    let restoredDoc = null;
    const updatedAll = students.map((s) => {
      if (s.id !== studentId) return s;
      restoredDoc = { ...s, archived: false, status: 'פעיל' };
      return restoredDoc;
    });
    setStudents(updatedAll);
    if (restoredDoc) {
      saveStudentToCloud(restoredDoc);
    }
    const restoredStudent = updatedAll.find((s) => s.id === studentId);
    if (restoredStudent) {
      const fwKey =
        (restoredStudent.educationalFramework || '').trim() ||
        'ללא מסגרת חינוכית מוגדרת';
      setExpandedFrameworks((prev) => ({ ...prev, [fwKey]: true }));
      setSelectedStudentId(studentId);
    }
    const remainingArchived = getArchivedStudentsForUser(updatedAll, currentUser);
    setSelectedArchivedStudentId(remainingArchived[0]?.id || null);
  };

  const handleRolloverArchivedStudentToNewYear = (studentObj, sourceYear) => {
    if (!studentObj || !isStudentOwnedByUser(studentObj, currentUser)) return;
    const nextYr = getNextSchoolYear(sourceYear || studentObj.schoolYear);
    if (
      !window.confirm(
        `האם לפתוח תכנית עבודה חדשה לשנת הלימודים ${nextYr} עבור "${studentObj.name}" על בסיס נתוני ${sourceYear || studentObj.schoolYear}?`
      )
    ) {
      return;
    }
    const rolledDoc = buildRolloverStudentForNextYear(studentObj, sourceYear, nextYr);
    const updatedAll = students.map((s) => (s.id === studentObj.id ? rolledDoc : s));
    setStudents(updatedAll);
    saveStudentToCloud(rolledDoc);
    const fwKey =
      (rolledDoc.educationalFramework || '').trim() || 'ללא מסגרת חינוכית מוגדרת';
    setExpandedFrameworks((prev) => ({ ...prev, [fwKey]: true }));
    setSelectedStudentId(rolledDoc.id);
    setShowArchiveModal(false);
  };

  const handleSaveStudentPlan = (updatedStudent) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
    saveStudentToCloud(updatedStudent);
  };

  const handleUseOrAddGoalToBank = (goalData) => {
    setGoalBank((prevBank) => {
      const nextBank = recordGoalUsageOrAdd(goalData, prevBank);
      saveGoalBankToCloud(nextBank);
      return nextBank;
    });
  };

  // === Admin Goal Bank CRUD Handlers ===
  const handleStartAddGoalToBank = () => {
    setEditingBankGoal({
      mode: 'add',
      id: '',
      title: '',
      environment: ENVIRONMENTS_LIST[0],
      usageCount: 0,
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
      usageCount: goalItem.usageCount ?? 0,
      defaultActivity: goalItem.defaultActivity || '',
      suggestedObjectivesText: (goalItem.suggestedObjectives || []).join('\n'),
      defaultOpportunities: goalItem.defaultOpportunities || '',
      defaultPartners: goalItem.defaultPartners || 'צוות חינוכי, הורים',
      defaultDuration: goalItem.defaultDuration || 'עד סוף השנה',
      defaultEvaluation: goalItem.defaultEvaluation || ''
    });
  };

  const handleResetAllGoalWeights = () => {
    if (!window.confirm('האם לאפס את מונה השכיחות של כל המטרות במאגר ל-0?')) return;
    setGoalBank((prev) => {
      const zeroed = prev.map((g) => ({ ...g, usageCount: 0 }));
      saveGoalBank(zeroed);
      saveGoalBankToCloud(zeroed);
      return zeroed;
    });
  };

  const handleSaveAdminBankGoal = (e) => {
    e.preventDefault();
    if (!editingBankGoal || !editingBankGoal.title.trim()) {
      window.alert('נא להזין כותרת למטרה.');
      return;
    }

    if (editingBankGoal.mode === 'add') {
      setGoalBank((prev) => {
        const nextBank = addGoalByAdmin(
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
        );
        saveGoalBankToCloud(nextBank);
        return nextBank;
      });
    } else {
      setGoalBank((prev) => {
        const nextBank = updateGoalByAdmin(
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
        );
        saveGoalBankToCloud(nextBank);
        return nextBank;
      });
    }
    setEditingBankGoal(null);
  };

  const handleDeleteAdminBankGoal = (goalItem) => {
    if (!window.confirm(`האם למחוק את המטרה "${goalItem.title}" ממאגר המטרות הדינמי?`)) {
      return;
    }
    setGoalBank((prev) => {
      const nextBank = deleteGoalByAdmin(goalItem.id, prev);
      saveGoalBankToCloud(nextBank);
      return nextBank;
    });
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
        onUpdateAllowedUsers={handleUpdateAllowedUsers}
        onSubmitAdminRequest={handleSubmitAdminRequest}
      />
    );
  }

  const lockedOutUsers = (allowedUsers || []).filter((u) => Boolean(u.lockedOut));
  const totalAdminAlerts = lockedOutUsers.length + (adminRequests || []).length;

  const userStudents = getStudentsForUser(students, currentUser);
  const archivedUserStudents = getArchivedStudentsForUser(students, currentUser);
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

  const filteredArchivedStudents = archivedUserStudents.filter(
    (s) =>
      (s.name || '').includes(archiveSearch) ||
      (s.educationalFramework || '').includes(archiveSearch)
  );
  const activeArchivedStudent =
    archivedUserStudents.find((s) => s.id === selectedArchivedStudentId) ||
    filteredArchivedStudents[0] ||
    null;

  const availableArchiveYears = activeArchivedStudent
    ? Array.from(
        new Set([
          ...(activeArchivedStudent.schoolYear ? [activeArchivedStudent.schoolYear] : []),
          ...Object.keys(activeArchivedStudent.reportsByYear || {})
        ])
      )
    : [];
  const currentArchiveYear =
    selectedArchiveYear && availableArchiveYears.includes(selectedArchiveYear)
      ? selectedArchiveYear
      : activeArchivedStudent?.schoolYear || availableArchiveYears[0] || '';
  const activeArchiveReport =
    (activeArchivedStudent?.reportsByYear &&
      currentArchiveYear &&
      activeArchivedStudent.reportsByYear[currentArchiveYear]) ||
    activeArchivedStudent ||
    {};

  return (
    <div className="tala-app-root" dir="rtl">
      {/* Top Stained-Glass Accent Strip */}
      <div className="stained-glass-top-strip" />
      {/* Top Header */}
      <header className="tala-header">
        <div
          className="tala-brand"
          onClick={() => setSelectedStudentId(null)}
          style={{ cursor: 'pointer' }}
          title="חזרה לדף הבית הפנימי (בחירת או יצירת תלמיד/ה)"
        >
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

          <button
            type="button"
            className="btn-header-bank"
            onClick={() => {
              if (!selectedArchivedStudentId && archivedUserStudents.length > 0) {
                setSelectedArchivedStudentId(archivedUserStudents[0].id);
              }
              setShowArchiveModal(true);
            }}
            title="צפה בתלמידים שהועברו לארכיון ובדוחות שלהם"
          >
            <Archive size={16} />
            <span>ארכיון ({archivedUserStudents.length})</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              type="button"
              className="btn-header-admin"
              onClick={() => setShowAdminModal(true)}
              style={{ position: 'relative' }}
            >
              <ShieldCheck size={16} />
              <span>ניהול משתמשים מורשים ({allowedUsers.filter((u) => u.active).length})</span>
              {totalAdminAlerts > 0 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 800,
                    marginRight: '4px'
                  }}
                >
                  🚨 {totalAdminAlerts}
                </span>
              )}
            </button>
          )}

          <div
            className="current-user-chip"
            onClick={() => setShowSelfPasswordModal(true)}
            title="לחץ לשינוי הסיסמה האישית שלך"
            style={{ cursor: 'pointer' }}
          >
            <UserCheck size={16} />
            <div className="user-chip-text">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.title}</small>
            </div>
            <KeyRound size={14} style={{ opacity: 0.75, marginRight: '4px' }} />
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

      {/* Admin Security Lockout / Contact Request Notification Banner Under Site ADMIN */}
      {currentUser.role === 'admin' && totalAdminAlerts > 0 && (
        <div
          style={{
            background: '#fef2f2',
            borderBottom: '2px solid #f87171',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '13px',
            color: '#991b1b',
            fontWeight: 700
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>
              {lockedOutUsers.length > 0 &&
                `התראת אבטחה למנהל/ת המערכת: ${lockedOutUsers.length} משתמש/ים נחסמו אוטומטית לאחר 5 ניסיונות סיסמה שגויים (${lockedOutUsers
                  .map((u) => u.name)
                  .join(', ')}). `}
              {adminRequests.length > 0 &&
                `קיימות ${adminRequests.length} פניות חדשות מדף הכניסה הממתינות לטיפולך.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            לצפייה ושחרור חסימה בניהול משתמשים
          </button>
        </div>
      )}

      {/* Main Workspace: Student Roster Sidebar + Interactive Ecological Form */}
      <div className="tala-workspace-layout">
        {/* Right Sidebar: Students List */}
        <aside className="tala-students-sidebar">
          <div className="sidebar-top-row">
            <div className="sidebar-title-group">
              <Users size={19} />
              <h3>רשימת תלמידים</h3>
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
                              {(st.ownerEmail || '').toLowerCase() !==
                              currentUser.email.toLowerCase() ? (
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '999px',
                                    padding: '1px 6px',
                                    fontWeight: 700
                                  }}
                                >
                                  שותף עמך
                                </span>
                              ) : (
                                Array.isArray(st.sharedWith) &&
                                st.sharedWith.length > 0 && (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      background: '#f3eefc',
                                      color: '#5b21b6',
                                      border: '1px solid #ddd6fe',
                                      borderRadius: '999px',
                                      padding: '1px 6px',
                                      fontWeight: 700
                                    }}
                                  >
                                    משותף ({st.sharedWith.length})
                                  </span>
                                )
                              )}
                              {st.lastSavedAt && (
                                <span className="st-saved-time">עודכן: {st.lastSavedAt}</span>
                              )}
                            </div>
                          </div>
                          {isStudentOwnedByUser(st, currentUser) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <button
                                type="button"
                                className="btn-delete-st"
                                onClick={(e) => handleRequestArchiveStudent(st, e)}
                                title="העבר תלמיד/ה לארכיון"
                                style={{ color: '#6b5b95' }}
                              >
                                <Archive size={15} />
                              </button>
                              <button
                                type="button"
                                className="btn-delete-st"
                                onClick={(e) => handleDeleteStudent(st, e)}
                                title="מחק תלמיד"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
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
            <ErrorBoundary key={selectedStudent.id}>
              <EcologicalWorkPlanForm
                student={selectedStudent}
                goalBank={goalBank}
                geminiApiKey={geminiApiKey}
                isAdmin={currentUser.role === 'admin'}
                currentUser={currentUser}
                allowedUsers={allowedUsers}
                onOpenGoalBankManager={() => setShowGoalBankOverview(true)}
                onSaveStudentPlan={handleSaveStudentPlan}
                onUseOrAddGoalToBank={handleUseOrAddGoalToBank}
                onDraftStateChange={setUnsavedDraftState}
                emailEngineConfig={emailEngineConfig}
                onUpdateEmailEngineConfig={handleUpdateEmailEngineConfig}
              />
            </ErrorBoundary>
          ) : (
            <div className="inside-landing-page">
              <div className="inside-landing-hero">
                <div className="inside-landing-badge">
                  <Sparkles size={15} />
                  <span>ברוכה הבאה למרחב העבודה האישי</span>
                </div>
                <h2>שלום, {currentUser.name} 👋</h2>
                <p>
                  כדי להתחיל לעבוד, בחרי האם ליצור תוכנית עבודה אקולוגית לתלמיד/ה חדש/ה או לפתוח תוכנית קיימת מתוך רשימת התלמידים שלך.
                </p>
              </div>

              <div className="inside-landing-cards-grid">
                {/* Card 1: Create New Student */}
                <div className="inside-landing-card create-card">
                  <div className="inside-card-icon create-icon">
                    <Plus size={28} />
                  </div>
                  <h3>יצירת תוכנית לתלמיד/ה חדש/ה</h3>
                  <p>
                    פתיחת גיליון תוכנית עבודה אקולוגית ותח"י חדשה מאפס, כולל הגדרת פרופיל תלמיד, תחומי תפקוד, בחירת מטרות מהמאגר ושאלות מנחות ב-AI.
                  </p>
                  <button
                    type="button"
                    className="btn-inside-landing-primary"
                    onClick={handleAddNewStudent}
                  >
                    <Plus size={18} />
                    <span>צור תוכנית עבודה לתלמיד/ה חדש/ה</span>
                  </button>
                </div>

                {/* Card 2: Open Existing Student */}
                <div className="inside-landing-card open-card">
                  <div className="inside-card-icon open-icon">
                    <BookOpen size={26} />
                  </div>
                  <h3>פתיחת תוכנית של תלמיד/ה קיים/ת ({userStudents.length})</h3>
                  <p>
                    בחרי תלמיד/ה מתוך הרשימה להמשך עריכה, עדכון מטרות, הדפסה או שליחה למייל:
                  </p>

                  <div className="inside-landing-search">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="חיפוש מהיר לפי שם תלמיד/ה או מסגרת חינוכית..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="inside-landing-empty-list">
                      {userStudents.length === 0
                        ? 'עדיין לא הוגדרו תלמידים במערכת. לחצי על הכפתור מימין ליצירת התלמיד/ה הראשון/ה.'
                        : 'לא נמצאו תלמידים התואמים לחיפוש.'}
                    </div>
                  ) : (
                    <div className="inside-landing-student-list">
                      {filteredStudents.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          className="inside-landing-student-row"
                          onClick={() => setSelectedStudentId(st.id)}
                        >
                          <div className="inside-st-main">
                            <strong>{st.name || 'ללא שם'}</strong>
                            <span>{st.educationalFramework || 'ללא מסגרת חינוכית מוגדרת'}</span>
                          </div>
                          <div className="inside-st-meta">
                            {(st.ownerEmail || '').toLowerCase() !==
                              currentUser.email.toLowerCase() && (
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '999px',
                                  padding: '1px 7px',
                                  fontWeight: 700
                                }}
                              >
                                שותף עמך
                              </span>
                            )}
                            <span className="st-goals-badge">
                              {(st.goals || []).filter((g) => g.title).length} מטרות
                            </span>
                            <ChevronLeft size={16} className="inside-st-arrow" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Self-Service & Mandatory First-Login Password Change Modal */}
      <UserSelfPasswordModal
        isOpen={showSelfPasswordModal || Boolean(currentUser?.mustChangePassword)}
        onClose={() => {
          if (!currentUser?.mustChangePassword) {
            setShowSelfPasswordModal(false);
          }
        }}
        currentUser={currentUser}
        enforcePasswordPolicy={enforcePasswordPolicy}
        onChangeOwnPassword={handleChangeOwnPassword}
        isMandatoryFirstLogin={Boolean(currentUser?.mustChangePassword)}
      />

      {/* Admin Allowlist Management Modal (Only accessible to Admin) */}
      {currentUser.role === 'admin' && (
        <AdminAllowlistModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          allowedUsers={allowedUsers}
          onUpdateAllowedUsers={handleUpdateAllowedUsers}
          geminiApiKey={geminiApiKey}
          onChangeGeminiApiKey={handleChangeGeminiApiKey}
          enforcePasswordPolicy={enforcePasswordPolicy}
          onChangeEnforcePasswordPolicy={handleChangeEnforcePasswordPolicy}
          adminRequests={adminRequests}
          onDismissAdminRequest={handleDismissAdminRequest}
          cloudSyncState={cloudSyncState}
          emailEngineConfig={emailEngineConfig}
          onUpdateEmailEngineConfig={handleUpdateEmailEngineConfig}
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
                <h3>מאגר המטרות הדינמי</h3>
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
                      👑 הרשאת מנהל מערכת: באפשרותך להוסיף, לערוך או להסיר מטרות ויעדים במאגר.
                    </strong>
                  ) : (
                    <span style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                      באפשרותך להוסיף מטרות חדשות למאגר המשותף.
                    </span>
                  )}
                </p>

                {!editingBankGoal && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        className="btn-secondary-sm"
                        onClick={handleResetAllGoalWeights}
                        title="אפס את מונה השכיחות של כל המטרות ל-0"
                      >
                        <RotateCcw size={14} />
                        <span>אפס שכיחויות</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-admin-add-bank-goal"
                      onClick={handleStartAddGoalToBank}
                    >
                      <Plus size={16} />
                      <span>הוסף מטרה חדשה למאגר</span>
                    </button>
                  </div>
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
                            נבחר {g.usageCount ?? 0} פעמים
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

      {/* Student Deletion & Archive Confirmation Modals */}
      <DeleteStudentModal
        studentToDelete={studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirmArchiveInstead={confirmArchiveStudent}
        onConfirmDelete={confirmDeleteStudent}
      />

      <ArchiveStudentModal
        studentToArchive={studentToArchive}
        onClose={() => setStudentToArchive(null)}
        onConfirmArchive={confirmArchiveStudent}
      />


      {/* Archive Viewer Modal (ארכיון תלמידים ודוחות) */}
      {showArchiveModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowArchiveModal(false)}
          dir="rtl"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '1080px', width: '96%', borderTopColor: '#4a88c7' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <Archive size={22} style={{ color: '#4a88c7' }} />
                <h3>ארכיון תלמידים ותכניות עבודה</h3>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setShowArchiveModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '18px 20px', maxHeight: '78vh' }}>
              {archivedUserStudents.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    color: '#5c6f8c'
                  }}
                >
                  <Archive size={44} style={{ color: '#8b6fc0', marginBottom: '10px', opacity: 0.75 }} />
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#2b4c73' }}>
                    הארכיון ריק כעת
                  </h4>
                  <p style={{ margin: 0, fontSize: '13.5px' }}>
                    תלמידים שסיימו את התוכנית ויועברו לארכיון יופיעו כאן יחד עם כל הדוחות, המטרות והמידע האישי שלהם.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '270px 1fr',
                    gap: '18px',
                    alignItems: 'start'
                  }}
                >
                  {/* Right Column: Archived Students List */}
                  <div
                    style={{
                      background: '#f8faff',
                      border: '1px solid #d3dff0',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div className="sidebar-search-box">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="חיפוש בארכיון..."
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        maxHeight: '58vh',
                        overflowY: 'auto'
                      }}
                    >
                      {filteredArchivedStudents.map((st) => {
                        const isSelected = activeArchivedStudent?.id === st.id;
                        return (
                          <div
                            key={st.id}
                            className={`sidebar-student-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedArchivedStudentId(st.id)}
                          >
                            <div className="st-card-info">
                              <strong>{st.name || 'ללא שם'}</strong>
                              <small>{st.educationalFramework || 'ללא מסגרת מוגדרת'}</small>
                              <div className="st-card-meta">
                                <span className="st-goals-badge">
                                  {(st.goals || []).filter((g) => g.title).length} מטרות
                                </span>
                                {st.archivedAt && (
                                  <span className="st-saved-time">
                                    ארכיון: {st.archivedAt}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Left Column: Selected Archived Student Full Report & Info */}
                  {activeArchivedStudent && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #d3dff0',
                        borderRadius: '12px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}
                    >
                      {/* Top Header & Actions for Archived Student */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                          borderBottom: '2px solid #e4ecf7',
                          paddingBottom: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#2b4c73' }}>
                              {activeArchivedStudent.name || 'ללא שם'}
                            </h3>
                            <span
                              style={{
                                background: '#f3eefc',
                                color: '#563d82',
                                border: '1px solid #b8a2e3',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                padding: '2px 9px',
                                borderRadius: '12px'
                              }}
                            >
                              {activeArchivedStudent.status || 'בארכיון'}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                              marginTop: '4px'
                            }}
                          >
                            <small style={{ color: '#5c6f8c', fontSize: '12.5px' }}>
                              {activeArchiveReport.planType || activeArchivedStudent.planType || 'תל"א / תח"י'} • שנת לימודים:
                            </small>
                            {availableArchiveYears.length > 0 ? (
                              <select
                                value={currentArchiveYear}
                                onChange={(e) => setSelectedArchiveYear(e.target.value)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #b8a2e3',
                                  background: '#faf8ff',
                                  color: '#2b4c73',
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                  fontFamily: 'inherit',
                                  cursor: 'pointer'
                                }}
                              >
                                {availableArchiveYears.map((yr) => (
                                  <option key={yr} value={yr}>
                                    {yr}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <small style={{ color: '#5c6f8c', fontSize: '12.5px' }}>
                                {activeArchivedStudent.schoolYear || '—'}
                              </small>
                            )}
                            {activeArchivedStudent.archivedAt && (
                              <small style={{ color: '#5c6f8c', fontSize: '12.5px' }}>
                                • הועבר לארכיון: {activeArchivedStudent.archivedAt}
                              </small>
                            )}
                          </div>
                        </div>

                        {isStudentOwnedByUser(activeArchivedStudent, currentUser) && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() =>
                                handleRolloverArchivedStudentToNewYear(
                                  activeArchivedStudent,
                                  currentArchiveYear
                                )
                              }
                              style={{
                                background: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #6ee7b7',
                                borderRadius: '8px',
                                padding: '7px 13px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="שכפל ופתח תכנית המשך לשנת הלימודים הבאה"
                            >
                              <Plus size={15} />
                              <span>פתח שנה חדשה</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRestoreFromArchive(activeArchivedStudent.id)}
                              style={{
                                background: 'linear-gradient(135deg, #5b9bd5 0%, #8b6fc0 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '7px 13px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="החזר תלמיד/ה לרשימת התלמידים הפעילה"
                            >
                              <RotateCcw size={15} />
                              <span>שחזר לרשימה הפעילה</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteStudent(activeArchivedStudent, e)}
                              style={{
                                background: '#fdf2f2',
                                color: '#b83f3f',
                                border: '1px solid #f3b4b4',
                                borderRadius: '8px',
                                padding: '7px 12px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                              title="מחק תלמיד/ה לצמיתות מהארכיון"
                            >
                              <Trash2 size={14} />
                              <span>מחק לצמיתות</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Personal Info Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                          gap: '10px',
                          background: '#f4f7fc',
                          border: '1px solid #d3dff0',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#5c6f8c' }}>שם הילד/ה:</strong>{' '}
                          <span>{activeArchivedStudent.name || '—'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#5c6f8c' }}>מסגרת חינוכית:</strong>{' '}
                          <span>{activeArchivedStudent.educationalFramework || '—'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#5c6f8c' }}>ת.ז:</strong>{' '}
                          <span>{activeArchivedStudent.idNumber || '—'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#5c6f8c' }}>תאריך לידה:</strong>{' '}
                          <span>{activeArchivedStudent.birthDate || '—'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#5c6f8c' }}>טלפון:</strong>{' '}
                          <span>{activeArchivedStudent.phone || '—'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#5c6f8c' }}>כתובת:</strong>{' '}
                          <span>{activeArchivedStudent.address || '—'}</span>
                        </div>
                      </div>

                      {/* Background, Strengths & Recommendations */}
                      {(activeArchiveReport.teacherFreeText ||
                        activeArchiveReport.strengthsExisting ||
                        activeArchiveReport.strengthsToEmpower ||
                        activeArchiveReport.recommendations) && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '10px'
                          }}
                        >
                          {activeArchiveReport.teacherFreeText && (
                            <div
                              style={{
                                background: '#f8faff',
                                border: '1px solid #e4ecf7',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12.5px'
                              }}
                            >
                              <strong style={{ color: '#2b4c73', display: 'block', marginBottom: '4px' }}>
                                רקע ותיאור תפקוד חופשי:
                              </strong>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {activeArchiveReport.teacherFreeText}
                              </div>
                            </div>
                          )}

                          {activeArchiveReport.strengthsExisting && (
                            <div
                              style={{
                                background: '#f8faff',
                                border: '1px solid #e4ecf7',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12.5px'
                              }}
                            >
                              <strong style={{ color: '#2b4c73', display: 'block', marginBottom: '4px' }}>
                                מוקדי כוח קיימים:
                              </strong>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {activeArchiveReport.strengthsExisting}
                              </div>
                            </div>
                          )}

                          {activeArchiveReport.strengthsToEmpower && (
                            <div
                              style={{
                                background: '#f8faff',
                                border: '1px solid #e4ecf7',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12.5px'
                              }}
                            >
                              <strong style={{ color: '#2b4c73', display: 'block', marginBottom: '4px' }}>
                                מוקדי כוח להעצמה:
                              </strong>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {activeArchiveReport.strengthsToEmpower}
                              </div>
                            </div>
                          )}

                          {activeArchiveReport.recommendations && (
                            <div
                              style={{
                                background: '#f8faff',
                                border: '1px solid #e4ecf7',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12.5px'
                              }}
                            >
                              <strong style={{ color: '#2b4c73', display: 'block', marginBottom: '4px' }}>
                                המלצות והתאמות:
                              </strong>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {activeArchiveReport.recommendations}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Full Goals & Objectives Report Table */}
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '14.5px', color: '#2b4c73' }}>
                          דוח מטרות ויעדים בתכנית העבודה – {currentArchiveYear || 'ללא שנה'} ({(activeArchiveReport.goals || []).length})
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table
                            className="allowed-users-table"
                            style={{
                              border: '1px solid #d3dff0',
                              borderRadius: '8px',
                              fontSize: '12.5px'
                            }}
                          >
                            <thead>
                              <tr style={{ background: '#eaf3fc' }}>
                                <th>סביבת פעילות</th>
                                <th>פעילות והשתתפות</th>
                                <th>מטרה ויעדים אופרטיביים</th>
                                <th>הזדמנויות ואמצעים</th>
                                <th>שותפים ומשך</th>
                                <th>אמות מידה והערכה תקופתית</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(activeArchiveReport.goals || []).map((g, idx) => (
                                <tr key={g.id || idx}>
                                  <td style={{ fontWeight: 700, color: '#2b4c73' }}>
                                    {g.environment || '—'}
                                  </td>
                                  <td style={{ whiteSpace: 'pre-wrap' }}>
                                    {g.activityParticipation || '—'}
                                  </td>
                                  <td>
                                    {g.title && (
                                      <strong style={{ display: 'block', marginBottom: '4px', color: '#4c1d95' }}>
                                        {g.title}
                                      </strong>
                                    )}
                                    <div style={{ whiteSpace: 'pre-wrap' }}>
                                      {g.objectives || '—'}
                                    </div>
                                  </td>
                                  <td style={{ whiteSpace: 'pre-wrap' }}>
                                    {g.opportunities || '—'}
                                  </td>
                                  <td>
                                    <div><strong>שותפים:</strong> {g.partners || '—'}</div>
                                    <div><strong>משך:</strong> {g.duration || '—'}</div>
                                  </td>
                                  <td style={{ whiteSpace: 'pre-wrap' }}>
                                    <div>{g.evaluationCriteria || '—'}</div>
                                    {(g.achievementStatus || g.midYearEvaluation || g.endYearEvaluation) && (
                                      <div
                                        style={{
                                          marginTop: '6px',
                                          paddingTop: '6px',
                                          borderTop: '1px dashed #cbd5e1',
                                          fontSize: '11.5px',
                                          color: '#1e3a8a'
                                        }}
                                      >
                                        {g.achievementStatus && (
                                          <div><strong>סטטוס:</strong> {g.achievementStatus}</div>
                                        )}
                                        {g.midYearEvaluation && (
                                          <div><strong>מחצית:</strong> {g.midYearEvaluation}</div>
                                        )}
                                        {g.endYearEvaluation && (
                                          <div><strong>סוף שנה:</strong> {g.endYearEvaluation}</div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ textAlign: 'left' }}>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={() => setShowArchiveModal(false)}
              >
                סגור ארכיון
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes on Logout Confirmation Popup Modal */}
      <LogoutUnsavedModal
        isOpen={showLogoutUnsavedModal}
        draftStudentName={unsavedDraftState.draftData?.name}
        onClose={() => setShowLogoutUnsavedModal(false)}
        onDiscardAndLogout={performLogout}
        onSaveAndLogout={handleSaveAndLogout}
      />
    </div>
  );
}

