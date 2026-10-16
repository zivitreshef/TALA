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
  KeyRound,
  MessageSquareHeart,
  Lock,
  Unlock,
  GraduationCap,
  UserPlus,
  Bell,
  MessageCircle
} from 'lucide-react';
import {
  loadAllowedUsers,
  saveAllowedUsers,
  stampSessionUserWithDate,
  isSessionUserValidForToday,
  isTrialUserExpired,
  getTrialRemainingDays,
  createPasswordCredentials,
  ensureUsersListPasswordsHashed,
  verifyUserPassword
} from './allowedUsers';
import {
  AllowlistAuthGate,
  UserSelfPasswordModal
} from './AllowlistAuthGate';
import AdminAllowlistModal from './components/modals/AdminAllowlistModal';
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
  buildRolloverStudentForNextYear,
  adaptTextToGender,
  resolveStudentAgeAndDateInfo,
  normalizeAndSizeGoalDuration,
  isGoalEmpty,
  deduplicateAndNormalizeGoalBank,
  getCanonicalEnvironmentsForStage,
  canonicalizeEnvironment,
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS
} from './goalBankData';
import {
  subscribeToTalaBackend,
  saveAllowedUsersToCloud,
  saveAdminRequestsToCloud,
  submitAdminRequestToCloud,
  saveGoalBankToCloud,
  saveSettingsToCloud,
  saveStudentToCloud,
  deleteStudentFromCloud,
  recordUserPresence,
  ensureFirebaseAuthSession,
  signOutFirebaseAuthSession
} from './firebaseBackend';
import {
  loadEmailEngineConfig,
  saveEmailEngineConfig,
  sendSignedNdaEmailToAdmin,
  sendUserSurveyEmailToAdmin
} from './emailService';
import {
  detectStudentStage,
  getEffectiveStudentStage,
  isGoalRelevantForStage
} from './studentStage.js';
import {
  PRIMARY_ADMIN_EMAIL,
  isStudentOwnedByUser,
  getStudentsForUser,
  getArchivedStudentsForUser,
  getUnreadSharedReportsForUser,
  markSharedReportAsRead
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
import TrialNdaModal from './components/modals/TrialNdaModal';
import TrialUpgradeModal from './components/modals/TrialUpgradeModal';
import UserFeedbackSurveyModal from './components/modals/UserFeedbackSurveyModal';
import EcologicalWorkPlanForm from './EcologicalWorkPlanForm';
import './index.css';

const STUDENTS_STORAGE_KEY = 'tala_students_plans_v3';
const SESSION_USER_KEY = 'tala_current_session_user_v1';
const PASSWORD_POLICY_STORAGE_KEY = 'tala_enforce_password_policy_v1';
const ADMIN_REQUESTS_STORAGE_KEY = 'tala_admin_requests_v1';
const USER_USAGE_TRACKER_KEY = 'tala_user_usage_tracker_v1';
const DISMISSED_SHARED_REPORTS_KEY = 'tala_dismissed_shared_reports_v1';

export default function App() {
  // Allowed users list
  const [allowedUsers, setAllowedUsers] = useState(() => loadAllowedUsers());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showSelfPasswordModal, setShowSelfPasswordModal] = useState(false);
  const [showFeedbackSurveyModal, setShowFeedbackSurveyModal] = useState(false);
  const [showTrialUpgradeModal, setShowTrialUpgradeModal] = useState(false);
  const [surveySnoozedInSession, setSurveySnoozedInSession] = useState(false);
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

  const GEMINI_KEY_STORAGE_KEY = 'tala_gemini_api_key';
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || import.meta.env?.VITE_GEMINI_API_KEY || '';
    } catch (e) {
      return '';
    }
  });

  const handleChangeGeminiApiKey = (newKey) => {
    const trimmed = (newKey || '').trim();
    setGeminiApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(GEMINI_KEY_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
      }
    } catch (e) {}
  };

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
      return next;
    });
    submitAdminRequestToCloud(newReq);
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
        // The server verified this user at login; the live profile listener enforces later deactivation.
        const stillAllowed = parsed?.email && parsed.active ? parsed : null;
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
  // Sort mode for student roster: 'framework' (by educationalFramework) | 'name' (alphabetical by student name)
  const [studentSortBy, setStudentSortBy] = useState(() => {
    try {
      const saved = localStorage.getItem('tala_student_sort_by');
      return saved === 'name' || saved === 'framework' ? saved : 'framework';
    } catch {
      return 'framework';
    }
  });
  const handleChangeStudentSortBy = (mode) => {
    setStudentSortBy(mode);
    try {
      localStorage.setItem('tala_student_sort_by', mode);
    } catch {
      // ignore storage errors
    }
  };
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
  const [showIntroVideoModal, setShowIntroVideoModal] = useState(false);
  // Guided Onboarding Interactive Tour Step (0 = inactive, 1 = point to create card button, 2 = point to name field, 3 = point to gender, 4 = point to framework, 5 = point to first goal button, 6 = point to free text & analyze button)
  const [onboardingTourStep, setOnboardingTourStep] = useState(0);

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
  const [goalBankEnvFilter, setGoalBankEnvFilter] = useState('הכל');
  const [goalBankStageFilter, setGoalBankStageFilter] = useState(null); // null = auto based on selected student stage
  const [selectedHlDomain, setSelectedHlDomain] = useState(null); // null = show HL domains grid; string = domain drilled into
  const [targetBankStudentId, setTargetBankStudentId] = useState('');
  const [bankAddToast, setBankAddToast] = useState('');
  const [externalGoalsRevision, setExternalGoalsRevision] = useState(0);
  const [editingBankGoal, setEditingBankGoal] = useState(null); // null | { mode: 'add' | 'edit', ...fields }



  useEffect(() => {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  // Real-time Cloud Firestore Backend Subscription
  useEffect(() => {
    // Cloud data is only readable after login (Firestore rules require a verified session).
    if (!currentUser?.email) return undefined;
    let didInitialUsersMerge = false;
    const meKey = currentUser.email.trim().toLowerCase();
    const isAdminUser = currentUser.role === 'admin' || meKey === 'zivit.reshef@gmail.com';
    // Non-admins get a public directory + their own profile (never the password hashes).
    let directoryUsers = [];
    let myProfile = null;
    const mergeDirectoryAndProfile = () => {
      if (!myProfile) return;
      const sameUser = (u) => (u.email || '').trim().toLowerCase() === meKey;
      const list = directoryUsers.map((d) => (sameUser(d) ? { ...d, ...myProfile } : d));
      if (!list.some(sameUser)) list.push(myProfile);
      setAllowedUsers(list);
    };
    const unsubscribe = subscribeToTalaBackend({
      email: meKey,
      isAdmin: isAdminUser,
      getInitialGoalBank: () => loadGoalBank(),
      onDirectoryChange: (users) => {
        directoryUsers = users;
        mergeDirectoryAndProfile();
      },
      onProfileChange: (profile) => {
        myProfile = profile;
        mergeDirectoryAndProfile();
      },
      getInitialStudents: () => students,
      onAllowedUsersChange: (rawCloudUsers) => {
        const localUsers = loadAllowedUsers();
        const { users: cloudUsers, migrated: cloudMigrated } =
          ensureUsersListPasswordsHashed(rawCloudUsers);
        let needsCloudHeal = cloudMigrated;
        const mergedUsers = cloudUsers.map((cu) => {
          const lu = localUsers.find(
            (u) => u.email?.toLowerCase() === cu.email?.toLowerCase()
          );
          const cuIsDefaultPassword =
            verifyUserPassword(cu, 'TALA2026') || verifyUserPassword(cu, '1234');
          const luHasCustomPassword =
            lu &&
            lu.passwordHash &&
            lu.passwordSalt &&
            !verifyUserPassword(lu, 'TALA2026') &&
            !verifyUserPassword(lu, '1234');

          if (luHasCustomPassword && cuIsDefaultPassword && lu.passwordHash !== cu.passwordHash) {
            needsCloudHeal = true;
            return {
              ...cu,
              passwordHash: lu.passwordHash,
              passwordSalt: lu.passwordSalt,
              failedLoginAttempts: 0,
              lockedOut: false
            };
          }
          return cu;
        });

        // On initial cloud sync, keep cloud list authoritative. Do not auto-reinject deleted local users.
        if (!didInitialUsersMerge) {
          didInitialUsersMerge = true;
        }

        if (needsCloudHeal) {
          saveAllowedUsersToCloud(mergedUsers);
        }
        setAllowedUsers(mergedUsers);
        saveAllowedUsers(mergedUsers);
      },
      onGoalBankChange: (cloudGoals) => {
        const cleanedGoals = deduplicateAndNormalizeGoalBank(cloudGoals || []);
        const hasOldTestingWeights =
          localStorage.getItem('tala_cloud_goal_weights_zeroed_v1') !== 'true' &&
          Array.isArray(cleanedGoals) &&
          cleanedGoals.some((g) => Number(g.usageCount) > 0);

        if (hasOldTestingWeights) {
          const zeroedGoals = cleanedGoals.map((g) => ({ ...g, usageCount: 0 }));
          localStorage.setItem('tala_cloud_goal_weights_zeroed_v1', 'true');
          setGoalBank(zeroedGoals);
          saveGoalBank(zeroedGoals);
          saveGoalBankToCloud(zeroedGoals);
        } else {
          localStorage.setItem('tala_cloud_goal_weights_zeroed_v1', 'true');
          setGoalBank(cleanedGoals);
          saveGoalBank(cleanedGoals);
          // If deduplication removed messy items or normalized composite environments, sync back to cloud
          if (Array.isArray(cloudGoals) && cleanedGoals.length !== cloudGoals.length) {
            saveGoalBankToCloud(cleanedGoals);
          }
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
  }, [currentUser?.email, currentUser?.role]);

  // Local dismissed shared report IDs per teacher email
  const [dismissedSharedByEmail, setDismissedSharedByEmail] = useState(() =>
    safeGetStorageJson(DISMISSED_SHARED_REPORTS_KEY, {})
  );
  const [autoShownSharedAlertIds, setAutoShownSharedAlertIds] = useState([]);

  const currentUserEmailLower = (currentUser?.email || '').trim().toLowerCase();
  const localDismissedForCurrentUser = currentUserEmailLower
    ? dismissedSharedByEmail[currentUserEmailLower] || []
    : [];
  const unreadSharedReports = getUnreadSharedReportsForUser(
    students,
    currentUser,
    localDismissedForCurrentUser
  );

  // Auto-open the user notification modal once when a new shared report is detected for the teacher
  useEffect(() => {
    if (!currentUser || currentUser.mustChangePassword) return;
    if (currentUser.isTrialUser && (currentUser.mustSignNda || !currentUser.ndaSigned)) return;
    if (currentUser.notifyOnSharedReport === false) return;
    if (!Array.isArray(unreadSharedReports) || unreadSharedReports.length === 0) return;

    const unseenNewReports = unreadSharedReports.filter(
      (st) => st?.id && !autoShownSharedAlertIds.includes(st.id)
    );
    if (unseenNewReports.length > 0) {
      setAutoShownSharedAlertIds((prev) => [
        ...new Set([...prev, ...unseenNewReports.map((s) => s.id)])
      ]);
      setShowSelfPasswordModal(true);
    }
  }, [
    currentUser?.email,
    currentUser?.mustChangePassword,
    currentUser?.isTrialUser,
    currentUser?.mustSignNda,
    currentUser?.ndaSigned,
    currentUser?.notifyOnSharedReport,
    unreadSharedReports.length
  ]);

  // Ensure logged-in user is still active, not trial-expired, and sync profile / mustChangePassword / trial / NDA fields when allowedUsers changes in real time
  useEffect(() => {
    if (!currentUser) return;
    const matchingUser = allowedUsers.find(
      (u) =>
        u.id === currentUser.id ||
        u.email.toLowerCase() === currentUser.email?.toLowerCase()
    );
    if (matchingUser) {
      if (!matchingUser.active) {
        performLogout();
      } else if (
        (matchingUser.name || '') !== (currentUser.name || '') ||
        (matchingUser.email || '').toLowerCase() !== (currentUser.email || '').toLowerCase() ||
        (matchingUser.title || '') !== (currentUser.title || '') ||
        (matchingUser.role || 'teacher') !== (currentUser.role || 'teacher') ||
        Boolean(matchingUser.mustChangePassword) !== Boolean(currentUser.mustChangePassword) ||
        (matchingUser.group || '') !== (currentUser.group || '') ||
        Boolean(matchingUser.isTrialUser) !== Boolean(currentUser.isTrialUser) ||
        Boolean(matchingUser.mustSignNda) !== Boolean(currentUser.mustSignNda) ||
        Boolean(matchingUser.ndaSigned) !== Boolean(currentUser.ndaSigned) ||
        (matchingUser.trialExpiresAt || '') !== (currentUser.trialExpiresAt || '') ||
        (matchingUser.trialDays || 0) !== (currentUser.trialDays || 0) ||
        (matchingUser.notifyOnSharedReport !== false) !==
          (currentUser.notifyOnSharedReport !== false)
      ) {
        const syncedUser = {
          ...currentUser,
          name: matchingUser.name,
          email: matchingUser.email,
          title: matchingUser.title,
          role: matchingUser.role,
          group: matchingUser.group || '',
          mustChangePassword: Boolean(matchingUser.mustChangePassword),
          isTrialUser: Boolean(matchingUser.isTrialUser),
          trialDays: matchingUser.trialDays,
          trialStartedAt: matchingUser.trialStartedAt,
          trialExpiresAt: matchingUser.trialExpiresAt,
          mustSignNda: Boolean(matchingUser.mustSignNda),
          ndaSigned: Boolean(matchingUser.ndaSigned),
          ndaSignedAt: matchingUser.ndaSignedAt,
          ndaSignerIdNumber: matchingUser.ndaSignerIdNumber,
          notifyOnSharedReport: matchingUser.notifyOnSharedReport !== false,
          dismissedSharedReportIds: Array.isArray(matchingUser.dismissedSharedReportIds)
            ? matchingUser.dismissedSharedReportIds
            : currentUser.dismissedSharedReportIds || []
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

  const handleUpdateAllowedUsers = (updatedList, editMeta = null) => {
    const { users: hashedList } = ensureUsersListPasswordsHashed(updatedList);
    setAllowedUsers(hashedList);
    saveAllowedUsers(hashedList);
    saveAllowedUsersToCloud(hashedList);

    // Sync currentUser session if the currently active user was modified
    if (currentUser?.email) {
      const activeEmailLower = currentUser.email.trim().toLowerCase();
      const myUpdated = hashedList.find(
        (u) => (u.email || '').toLowerCase() === activeEmailLower
      );
      if (myUpdated) {
        const syncedCurrent = { ...currentUser, ...myUpdated };
        setCurrentUser(syncedCurrent);
        safeSetStorageJson(SESSION_USER_KEY, syncedCurrent);
      }
    }

    if (
      editMeta &&
      editMeta.oldEmail &&
      editMeta.newEmail &&
      editMeta.oldEmail.toLowerCase() !== editMeta.newEmail.toLowerCase()
    ) {
      const oldEmailLower = editMeta.oldEmail.trim().toLowerCase();
      const newEmailLower = editMeta.newEmail.trim().toLowerCase();
      setStudents((prevStudents) =>
        prevStudents.map((st) => {
          let changed = false;
          let nextSt = { ...st };
          if ((nextSt.ownerEmail || '').trim().toLowerCase() === oldEmailLower) {
            nextSt.ownerEmail = newEmailLower;
            changed = true;
          }
          if (Array.isArray(nextSt.sharedWith)) {
            const hasInShared = nextSt.sharedWith.some(
              (em) => (em || '').trim().toLowerCase() === oldEmailLower
            );
            if (hasInShared) {
              nextSt.sharedWith = nextSt.sharedWith.map((em) =>
                (em || '').trim().toLowerCase() === oldEmailLower ? newEmailLower : em
              );
              changed = true;
            }
          }
          if (changed) {
            saveStudentToCloud(nextSt);
          }
          return nextSt;
        })
      );
    }
  };

  const handleOpenSharedReportNotification = (studentObj) => {
    if (!studentObj?.id || !currentUser?.email) return;
    const emailLower = currentUser.email.trim().toLowerCase();

    // 1. Mark as read on the student object & persist to cloud so it disappears permanently
    const updatedStudent = markSharedReportAsRead(studentObj, emailLower);
    setStudents((prev) =>
      prev.map((st) => (st.id === studentObj.id ? updatedStudent : st))
    );
    saveStudentToCloud(updatedStudent);

    // 2. Record in localStorage dismissed map for immediate disappearance
    setDismissedSharedByEmail((prev) => {
      const prevList = Array.isArray(prev[emailLower]) ? prev[emailLower] : [];
      const nextList = prevList.includes(studentObj.id)
        ? prevList
        : [...prevList, studentObj.id];
      const nextMap = { ...prev, [emailLower]: nextList };
      safeSetStorageJson(DISMISSED_SHARED_REPORTS_KEY, nextMap);
      return nextMap;
    });

    // 3. Also record on the user profile in allowedUsers if present
    const userDismissed = Array.isArray(currentUser.dismissedSharedReportIds)
      ? currentUser.dismissedSharedReportIds
      : [];
    if (!userDismissed.includes(studentObj.id)) {
      const nextUserDismissed = [...userDismissed, studentObj.id];
      const updatedCurrent = {
        ...currentUser,
        dismissedSharedReportIds: nextUserDismissed
      };
      setCurrentUser(updatedCurrent);
      safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);

      if (currentUser.role === 'admin') {
        const updatedList = allowedUsers.map((u) =>
          u.email.toLowerCase() === emailLower
            ? { ...u, dismissedSharedReportIds: nextUserDismissed }
            : u
        );
        handleUpdateAllowedUsers(updatedList);
      }
    }

    // 4. Open the shared student report and close the notification modal
    const fwKey = (studentObj.educationalFramework || '').trim() || 'ללא מסגרת חינוכית מוגדרת';
    setExpandedFrameworks((prev) => ({ ...prev, [fwKey]: true }));
    setSelectedStudentId(studentObj.id);
    setShowSelfPasswordModal(false);
  };

  const handleToggleNotifySharedReport = (enabled) => {
    if (!currentUser) return;
    const nextVal = Boolean(enabled);
    const updatedCurrent = {
      ...currentUser,
      notifyOnSharedReport: nextVal
    };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);

    const updatedList = allowedUsers.map((u) =>
      u.email.toLowerCase() === currentUser.email.toLowerCase()
        ? { ...u, notifyOnSharedReport: nextVal }
        : u
    );
    handleUpdateAllowedUsers(updatedList);
  };

  const handleNotifySharedColleague = (studentId, colleagueEmail, isNewlyShared) => {
    if (!studentId || !colleagueEmail || !isNewlyShared) return;
    const cleanColleague = colleagueEmail.trim().toLowerCase();

    // Clear from local dismissed cache if testing on same browser
    setDismissedSharedByEmail((prev) => {
      const existing = Array.isArray(prev[cleanColleague]) ? prev[cleanColleague] : [];
      if (!existing.includes(studentId)) return prev;
      const nextMap = {
        ...prev,
        [cleanColleague]: existing.filter((id) => id !== studentId)
      };
      safeSetStorageJson(DISMISSED_SHARED_REPORTS_KEY, nextMap);
      return nextMap;
    });

    // Clear from colleague's dismissedSharedReportIds in allowedUsers if present
    const targetColleague = allowedUsers.find(
      (u) => (u.email || '').trim().toLowerCase() === cleanColleague
    );
    if (
      targetColleague &&
      Array.isArray(targetColleague.dismissedSharedReportIds) &&
      targetColleague.dismissedSharedReportIds.includes(studentId)
    ) {
      const updatedList = allowedUsers.map((u) =>
        (u.email || '').trim().toLowerCase() === cleanColleague
          ? {
              ...u,
              dismissedSharedReportIds: (u.dismissedSharedReportIds || []).filter(
                (id) => id !== studentId
              )
            }
          : u
      );
      handleUpdateAllowedUsers(updatedList);
    }
  };

  useEffect(() => {
    if (currentUser?.email) {
      ensureFirebaseAuthSession(currentUser.email);
    }
  }, [currentUser?.email]);

  const handleChangeOwnPassword = (newAccessCode) => {
    if (!currentUser) return;
    const creds = createPasswordCredentials(newAccessCode);
    const updatedList = allowedUsers.map((u) => {
      if (u.email.toLowerCase() !== currentUser.email.toLowerCase()) return u;
      const { accessCode: _removed, ...rest } = u;
      return { ...rest, ...creds, mustChangePassword: false };
    });
    handleUpdateAllowedUsers(updatedList);
    const { accessCode: _removedCurrent, ...restCurrent } = currentUser;
    const updatedCurrent = {
      ...restCurrent,
      ...creds,
      mustChangePassword: false
    };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);
  };

  const handleCompleteTrialNda = async (ndaPayload) => {
    if (!currentUser) return;
    const signedAtStr = new Date().toLocaleString('he-IL');
    const resolvedSignedDate =
      ndaPayload.signedDate ||
      ndaPayload.signerDate ||
      new Date().toLocaleDateString('he-IL');

    const updatedList = allowedUsers.map((u) =>
      u.email.toLowerCase() === currentUser.email.toLowerCase()
        ? {
            ...u,
            mustSignNda: false,
            ndaSigned: true,
            ndaSignedAt: signedAtStr,
            ndaSignedDate: resolvedSignedDate,
            ndaSignerIdNumber: ndaPayload.signerIdNumber
          }
        : u
    );
    handleUpdateAllowedUsers(updatedList);

    const updatedCurrent = {
      ...currentUser,
      mustSignNda: false,
      ndaSigned: true,
      ndaSignedAt: signedAtStr,
      ndaSignedDate: resolvedSignedDate,
      ndaSignerIdNumber: ndaPayload.signerIdNumber
    };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);

    handleSubmitAdminRequest({
      id: 'nda_' + Date.now(),
      topic: 'אישור וחתימה על הסכם סודיות (NDA) – משתמש ניסיון',
      name: ndaPayload.signerName || currentUser.name,
      email: ndaPayload.signerEmail || currentUser.email,
      notes: `ת.ז.: ${ndaPayload.signerIdNumber} | תאריך חתימה: ${resolvedSignedDate} | תקופת ניסיון: ${ndaPayload.trialDays || 7} ימים`,
      createdAt: signedAtStr
    });

    // Send signed NDA email to Admin in the background without blocking modal dismissal
    sendSignedNdaEmailToAdmin({
      config: emailEngineConfig,
      ...ndaPayload,
      signerDate: resolvedSignedDate
    }).catch((err) => {
      console.warn(
        'Could not send signed NDA email in background, recorded in admin notifications:',
        err
      );
    });
  };

  const handleSubmitUserSurvey = (surveyPayload) => {
    if (!currentUser) return;
    setShowFeedbackSurveyModal(false);
    setSurveySnoozedInSession(true);

    const submittedAtStr =
      surveyPayload.submittedAt ||
      new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

    const updatedList = allowedUsers.map((u) =>
      u.email.toLowerCase() === currentUser.email.toLowerCase()
        ? {
            ...u,
            surveyCompleted: true,
            surveyCompletedAt: submittedAtStr
          }
        : u
    );
    handleUpdateAllowedUsers(updatedList);

    const updatedCurrent = {
      ...currentUser,
      surveyCompleted: true,
      surveyCompletedAt: submittedAtStr
    };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);

    const r = surveyPayload.ratings || {};
    const summaryNotes = [
      `קלות שימוש: ${r.easeOfWebsite || 5}/5`,
      `יצירת תלמיד: ${r.createStudent || 5}/5`,
      `מטרות ו-AI: ${r.generateGoals || 5}/5`,
      `הפקת דוחות: ${r.createReport || 5}/5`,
      `שיתוף עם קולגות: ${r.collaborateWithColleagues || 5}/5`,
      `המלצה לרכישה: ${surveyPayload.recommendToColleaguesAndManager || '—'}`,
      surveyPayload.overallFeedback ? `משוב: ${surveyPayload.overallFeedback}` : '',
      surveyPayload.improvementSuggestions ? `הצעות שיפור: ${surveyPayload.improvementSuggestions}` : ''
    ]
      .filter(Boolean)
      .join(' | ');

    handleSubmitAdminRequest({
      id: 'survey_' + Date.now(),
      topic: '⭐ משוב חוויית משתמש במערכת TALA',
      name: surveyPayload.userName || currentUser.name,
      email: surveyPayload.userEmail || currentUser.email,
      notes: summaryNotes,
      createdAt: submittedAtStr
    });

    sendUserSurveyEmailToAdmin({
      config: emailEngineConfig,
      ...surveyPayload,
      submittedAt: submittedAtStr
    }).catch((err) => {
      console.warn('Could not send user survey email in background:', err);
    });
  };

  const handleSnoozeUserSurvey = () => {
    setShowFeedbackSurveyModal(false);
    setSurveySnoozedInSession(true);
  };

  const handleDismissUserSurveyPermanently = () => {
    setShowFeedbackSurveyModal(false);
    setSurveySnoozedInSession(true);
    if (!currentUser) return;

    const updatedList = allowedUsers.map((u) =>
      u.email.toLowerCase() === currentUser.email.toLowerCase()
        ? { ...u, surveyDismissed: true }
        : u
    );
    handleUpdateAllowedUsers(updatedList);

    const updatedCurrent = { ...currentUser, surveyDismissed: true };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);
  };

  // Track active usage for new users and automatically trigger the optional survey after working with the webapp for a while
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return undefined;
    if (currentUser.mustChangePassword) return undefined;
    if (currentUser.isTrialUser && (currentUser.mustSignNda || !currentUser.ndaSigned)) {
      return undefined;
    }
    if (currentUser.surveyCompleted || currentUser.surveyDismissed || surveySnoozedInSession) {
      return undefined;
    }

    const emailKey = currentUser.email.trim().toLowerCase();
    const ownedCount = students.filter(
      (s) => s.ownerEmail?.toLowerCase() === emailKey && (s.name || '').trim()
    ).length;

    const checkAndAdvanceUsage = () => {
      if (document.visibilityState !== 'visible') return;
      const allUsage = safeGetStorageJson(USER_USAGE_TRACKER_KEY, {}) || {};
      const prevEntry = allUsage[emailKey] || {
        firstSeenAt: Date.now(),
        activeSeconds: 0
      };
      const nextSeconds = (Number(prevEntry.activeSeconds) || 0) + 30;
      allUsage[emailKey] = {
        ...prevEntry,
        activeSeconds: nextSeconds
      };
      safeSetStorageJson(USER_USAGE_TRACKER_KEY, allUsage);

      // Trigger optional survey after ~8 minutes of active usage, or after ~3 minutes if the user already created/worked on a student card
      const hasWorkedEnough =
        nextSeconds >= 480 || (ownedCount >= 1 && nextSeconds >= 180);
      if (hasWorkedEnough) {
        setShowFeedbackSurveyModal(true);
      }
    };

    const timerId = setInterval(checkAndAdvanceUsage, 30 * 1000);
    return () => clearInterval(timerId);
  }, [currentUser, students, surveySnoozedInSession]);

  // Record active user presence in Firestore for deployment gate (15 min idle rule)
  useEffect(() => {
    if (!currentUser) return;
    recordUserPresence(currentUser);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        recordUserPresence(currentUser);
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Proactive Trial Expiration Alert Modal (pops up once per browser session when remaining trial days <= 2)
  useEffect(() => {
    if (!currentUser || !currentUser.isTrialUser) return;
    if (currentUser.mustChangePassword) return;
    if (currentUser.mustSignNda || !currentUser.ndaSigned) return;

    const remaining = getTrialRemainingDays(currentUser);
    if (remaining !== null && remaining <= 2) {
      const sessionKey = `tala_trial_alert_shown_${currentUser.email.toLowerCase()}`;
      const alreadyShown = sessionStorage.getItem(sessionKey);
      if (!alreadyShown) {
        sessionStorage.setItem(sessionKey, 'true');
        const timer = setTimeout(() => {
          setShowTrialUpgradeModal(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    const stampedUser = stampSessionUserWithDate(user);
    setCurrentUser(stampedUser);
    safeSetStorageJson(SESSION_USER_KEY, stampedUser);
    ensureFirebaseAuthSession(user.email);
    setSurveySnoozedInSession(false);
    setSelectedStudentId(null);
    setStudentSearch('');
    setInsideLandingSearch('');
  };

  const performLogout = () => {
    setShowLogoutUnsavedModal(false);
    setShowFeedbackSurveyModal(false);
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

  // Daily auto-logout & trial expiration check: reset session automatically when a new calendar day starts or trial expires
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
    const stageInfo = detectStudentStage({ educationalFramework: '', teacherFreeText: '', birthDate: '' }, todayStr);
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
      stage: 'school',
      stageSource: 'user_explicit',
      stageReason: 'בחירת ברירת מחדל: בית ספר',
      stageUpdatedAt: new Date().toISOString(),
      goals: []
    };

    setStudents((prev) => [newStudentPlan, ...prev]);
    saveStudentToCloud(newStudentPlan);
    setSelectedStudentId(newId);
    setExpandedFrameworks((prev) => ({
      ...prev,
      'ללא מסגרת חינוכית מוגדרת': true
    }));
  };

  // Load a rich sample student plan for quick onboarding exploration
  const handleLoadSampleStudent = () => {
    if (!currentUser) return;
    const newId = 'st_sample_' + Date.now();
    const todayStr = new Date().toLocaleDateString('he-IL');
    const sampleStudentPlan = {
      id: newId,
      ownerEmail: currentUser.email.trim().toLowerCase(),
      date: todayStr,
      schoolYear: 'תשפ"ו (2025-2026)',
      planType: 'תל"א (תוכנית לימודים אישית)',
      name: 'יונתן כהן (תוכנית לדוגמה)',
      gender: 'boy',
      idNumber: '012345678',
      birthDate: '15/04/2018',
      educationalFramework: 'בית ספר ארזים',
      gradeClass: 'כיתה ב׳2',
      address: 'הדרור 14, תל אביב',
      phone: '050-1234567',
      stage: 'school',
      stageSource: 'user_explicit',
      stageReason: 'תוכנית לדוגמה להתרשמות',
      stageUpdatedAt: new Date().toISOString(),
      teacherFreeText: 'יונתן ילד מקסים וסקרן, אוהב מאוד לצייר ולבנות בלגו. מפגין קושי מסוים בשמירה על קשב בריכוז ממושך ומעברים בין פעילויות. משתתף בהתלהבות בשיעורי ספורט ומוזיקה ויוצר קשרים חברתיים בקלות.',
      strengthsExisting: 'יכולת ביטוי מילולית עשירה, אמפתיה לחברים, מוטיבציה גבוהה להצלחה.',
      strengthsToEmpower: 'התמדה במשימות כתובות, ויסות תנועתי בכיתה, שימוש בכרטיסיות ניווט עצמי.',
      recommendations: 'מומלץ לשלב הפוגות תנועתיות קצרות, חיזוקים חיוביים תכופים, ותיווך מותאם במעברים.',
      status: 'בטיוטה',
      lastSavedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      goals: [
        {
          id: 'g_sample_1',
          domain: 'תפקוד התנהגותי ורגשי',
          subDomain: 'ויסות והתארגנות',
          mainGoal: 'יונתן ישב במקומו וישתתף במליאת הבוקר במשך 15 דקות רצופות תוך שימוש באביזר תחושתי.',
          performanceStandard: '4 מתוך 5 ימים בשבוע',
          timeline: 'אמצע שנה (פברואר)',
          environment: 'כיתת אם / מליאה',
          partners: 'מחנכת, מורת שילוב, סייעת',
          toolsAndMethods: 'לוח זמנים חזותי, כרית ישיבה תחושתית, חיזוק מותאם בתום המליאה'
        },
        {
          id: 'g_sample_2',
          domain: 'תפקוד שפתי ואורייני',
          subDomain: 'קריאה וכתיבה',
          mainGoal: 'יונתן יקרא פסקה קצרה (3-4 שורות) ויענה על 2 שאלות איתור מידע ברמת דיוק של 80%.',
          performanceStandard: 'ב-3 מפגשים פרטניים עוקבים',
          timeline: 'סוף שנה (יוני)',
          environment: 'חדר שילוב / למידה פרטנית',
          partners: 'מורת שילוב, הורים',
          toolsAndMethods: 'דפי עבודה מוגדלים, סימון מרקר להדגשת מילות מפתח'
        }
      ]
    };

    setStudents((prev) => [sampleStudentPlan, ...prev]);
    saveStudentToCloud(sampleStudentPlan);
    setSelectedStudentId(newId);
    setExpandedFrameworks((prev) => ({
      ...prev,
      'בית ספר ארזים': true
    }));
    setOnboardingTourStep(0);
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

  const handleAddBankGoalToStudent = (bankItem, targetStudentObj) => {
    if (!bankItem || !targetStudentObj) return;
    const baseStudent =
      unsavedDraftState.isDirty && unsavedDraftState.draftData?.id === targetStudentObj.id
        ? unsavedDraftState.draftData
        : targetStudentObj;

    if (baseStudent.isLocked) {
      setGoalBankAddedToast('הדו"ח של התלמיד/ה נעול לעריכה – יש לפתוח את הנעילה כדי להוסיף מטרות.');
      setTimeout(() => setGoalBankAddedToast(''), 3500);
      return;
    }

    const genderToUse = baseStudent.gender || 'boy';
    const studentFirstName = (
      baseStudent.name || (genderToUse === 'girl' ? 'הילדה' : 'הילד')
    )
      .trim()
      .split(/\s+/)[0];

    const genderTitle = adaptTextToGender(bankItem.title || '', genderToUse);
    const genderActivity = adaptTextToGender(bankItem.defaultActivity || '', genderToUse);
    const genderObjectives = (bankItem.suggestedObjectives || [])
      .map((o) => `• ${adaptTextToGender(o, genderToUse)}`)
      .join('\n');
    const personalizedOpportunities = adaptTextToGender(
      (bankItem.defaultOpportunities || '').replace(/הילד/g, studentFirstName),
      genderToUse
    );
    const genderEval = adaptTextToGender(bankItem.defaultEvaluation || '', genderToUse);
    const dateInfo = resolveStudentAgeAndDateInfo(
      baseStudent,
      baseStudent.teacherFreeText || ''
    );

    const existingGoals = Array.isArray(baseStudent.goals) ? baseStudent.goals : [];
    const alreadyExists = existingGoals.some(
      (g) =>
        (g.title || '').trim() === genderTitle.trim() ||
        (g.title || '').trim() === (bankItem.title || '').trim()
    );
    if (alreadyExists) return;

    const draftGoal = {
      id: 'g_bank_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      environment: bankItem.environment || ENVIRONMENTS_LIST[0],
      activityParticipation: genderActivity || '',
      title: genderTitle,
      objectives: genderObjectives || '',
      opportunities: personalizedOpportunities || '',
      partners: bankItem.defaultPartners || 'צוות הגן, סייעת אישית',
      duration: '',
      evaluationCriteria: genderEval || '',
      isTeacherAdded: true,
      isTeacherModified: true
    };

    const sizedGoal = {
      ...draftGoal,
      duration: normalizeAndSizeGoalDuration(
        draftGoal,
        baseStudent.teacherFreeText || '',
        baseStudent,
        dateInfo
      )
    };

    const nextGoals =
      existingGoals.length === 1 && isGoalEmpty(existingGoals[0])
        ? [sizedGoal]
        : [...existingGoals, sizedGoal];

    const nowTime = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const activeYear = baseStudent.schoolYear || 'תשפ"ו (2025-2026)';
    const updatedStudent = {
      ...baseStudent,
      goals: nextGoals,
      lastSavedAt: nowTime,
      reportsByYear: {
        ...(baseStudent.reportsByYear || {}),
        [activeYear]: {
          ...(baseStudent.reportsByYear?.[activeYear] || {}),
          date: baseStudent.date || new Date().toLocaleDateString('he-IL'),
          planType: baseStudent.planType || 'תל"א (תוכנית לימודים אישית)',
          teacherFreeText: baseStudent.teacherFreeText || '',
          freeTextAnalyzed: Boolean(baseStudent.freeTextAnalyzed),
          removedAiGoals: Array.isArray(baseStudent.removedAiGoals)
            ? baseStudent.removedAiGoals
            : [],
          strengthsExisting: baseStudent.strengthsExisting || '',
          strengthsToEmpower: baseStudent.strengthsToEmpower || '',
          recommendations: baseStudent.recommendations || '',
          evalReportFreeText: baseStudent.evalReportFreeText || '',
          evalReportSummary: baseStudent.evalReportSummary || '',
          statusReportSections: Array.isArray(baseStudent.statusReportSections)
            ? baseStudent.statusReportSections
            : [],
          statusReportUpdatedAt: baseStudent.statusReportUpdatedAt || '',
          lastSavedAt: nowTime,
          goals: nextGoals
        }
      }
    };

    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
    saveStudentToCloud(updatedStudent);
    handleUseOrAddGoalToBank({
      title: bankItem.title,
      environment: bankItem.environment
    });
    setExternalGoalsRevision((r) => r + 1);
    setUnsavedDraftState({ isDirty: false, draftData: updatedStudent });

    const studentDisplayName = baseStudent.name?.trim() || 'התלמיד/ה';
    setBankAddToast(
      `✅ המטרה "${genderTitle}" נוספה לתכנית של ${studentDisplayName} ומשקלה במאגר עלה ב-+1!`
    );
    if (onboardingTourStep === 5) {
      setOnboardingTourStep(6);
    }
    setTimeout(() => setBankAddToast(''), 3500);
  };

  // === Admin Goal Bank CRUD Handlers ===
  const handleStartAddGoalToBank = () => {
    setEditingBankGoal({
      mode: 'add',
      id: '',
      title: '',
      stages: ['kindergarten'],
      environment: ENVIRONMENTS_LIST[0],
      usageCount: 0,
      defaultActivity: '',
      suggestedObjectivesText: '',
      defaultOpportunities: '',
      defaultPartners: 'צוות חינוכי, הורים',
      defaultDuration: 'עד סוף השנה',
      defaultEvaluation: ''
    });
  };

  const handleStartEditBankGoal = (goalItem) => {
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

    const resolvedStages = Array.isArray(editingBankGoal.stages) && editingBankGoal.stages.length > 0
      ? editingBankGoal.stages
      : ['kindergarten'];

    if (editingBankGoal.mode === 'add') {
      setGoalBank((prev) => {
        const nextBank = addGoalByAdmin(
          {
            title: editingBankGoal.title,
            stages: resolvedStages,
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
            stages: resolvedStages,
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
        enforcePasswordPolicy={enforcePasswordPolicy}
        onChangeEnforcePasswordPolicy={handleChangeEnforcePasswordPolicy}
      />
    );
  }

  const isTrialExpired = Boolean(currentUser?.isTrialUser && isTrialUserExpired(currentUser));

  // If trial period has ended, all the user will be able to see after a successful login is the upgrade modal
  if (isTrialExpired) {
    return (
      <div
        className="tala-app-container"
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px'
        }}
      >
        <TrialUpgradeModal
          isOpen={true}
          isExpired={true}
          currentUser={currentUser}
          remainingDays={0}
          onLogout={performLogout}
          onOpenSurvey={() => setShowFeedbackSurveyModal(true)}
          onOpenIntroVideo={() => setShowIntroVideoModal(true)}
          onSubmitSupportMessage={(payload) => {
            handleSubmitAdminRequest({
              id: 'trial_inquiry_' + Date.now(),
              topic: payload.topic || '💬 פנייה ממשתמש/ת ניסיון שפג תוקפו (הסדרת מנוי)',
              name: payload.name || currentUser.name,
              email: payload.email || currentUser.email,
              notes: payload.notes,
              createdAt: new Date().toLocaleString('he-IL', {
                dateStyle: 'short',
                timeStyle: 'short'
              })
            });
          }}
        />

        {/* Survey Modal accessible from the expired modal if user wishes to submit feedback */}
        <UserFeedbackSurveyModal
          isOpen={Boolean(showFeedbackSurveyModal)}
          currentUser={currentUser}
          onSubmitSurvey={handleSubmitUserSurvey}
          onSnoozeSurvey={() => setShowFeedbackSurveyModal(false)}
          onDismissSurveyPermanently={() => setShowFeedbackSurveyModal(false)}
        />
      </div>
    );
  }

  const lockedOutUsers = (allowedUsers || []).filter((u) => Boolean(u.lockedOut));
  const totalAdminAlerts = lockedOutUsers.length + (adminRequests || []).length;
  const trialRemainingDays = currentUser?.isTrialUser ? getTrialRemainingDays(currentUser) : null;

  const userStudents = getStudentsForUser(students, currentUser);
  const archivedUserStudents = getArchivedStudentsForUser(students, currentUser);
  const selectedStudent = userStudents.find((s) => s.id === selectedStudentId);
  const filteredStudents = userStudents.filter(
    (s) =>
      (s.name || '').includes(studentSearch) ||
      (s.educationalFramework || '').includes(studentSearch)
  );
  const sortedStudentsByName = [...filteredStudents].sort((a, b) =>
    (a.name || '').trim().localeCompare((b.name || '').trim(), 'he')
  );
  const sortedStudentsByFramework = [...filteredStudents].sort((a, b) => {
    const fwA = (a.educationalFramework || '').trim() || 'ללא מסגרת חינוכית מוגדרת';
    const fwB = (b.educationalFramework || '').trim() || 'ללא מסגרת חינוכית מוגדרת';
    const fwCmp = fwA.localeCompare(fwB, 'he');
    if (fwCmp !== 0) return fwCmp;
    return (a.name || '').trim().localeCompare((b.name || '').trim(), 'he');
  });
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
  const activeBankTargetStudent =
    userStudents.find(
      (s) => s.id === (targetBankStudentId || selectedStudentId)
    ) ||
    selectedStudent ||
    userStudents[0] ||
    null;
  const activeGoalBankStudentStage = activeBankTargetStudent ? getEffectiveStudentStage(activeBankTargetStudent) : 'all';
  const currentModalStage = goalBankStageFilter !== null ? goalBankStageFilter : activeGoalBankStudentStage;
  const goalBankEnvironments = getCanonicalEnvironmentsForStage(currentModalStage);

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

  const siteVersion =
    typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : '1.0.33';

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1>TALA – תכנית עבודה אקולוגית ותח"י</h1>
              <span
                className="site-version-watermark"
                dir="ltr"
                title={`גרסת מערכת TALA (מבוסס על PR): ver. ${siteVersion}`}
              >
                ver. {siteVersion}
              </span>
            </div>
            <span className="brand-subtitle">
              מערכת אינטראקטיבית לבניית תכנית עבודה משותפת, מאגר מטרות דינמי ושאלות מנחות ב-AI
            </span>
          </div>
        </div>

        <div className="tala-header-controls">
          <button
            type="button"
            className={`btn-header-bank ${onboardingTourStep === 5 ? 'tour-highlight-btn' : ''}`}
            onClick={() => {
              setTargetBankStudentId(selectedStudentId || userStudents[0]?.id || '');
              setShowGoalBankOverview(true);
              if (onboardingTourStep === 5) {
                setOnboardingTourStep(6);
              }
            }}
            style={{ position: 'relative' }}
            title="צפה בדירוג שכיחות המטרות במאגר והוסף מטרות לתכנית התלמיד/ה"
          >
            {onboardingTourStep === 5 && (
              <div className="onboarding-tour-arrow-box" style={{ top: '42px', right: '0' }}>
                <span className="tour-arrow-anim">☝️</span>
                <span>צעד 5: לחצי כאן לפתיחת מאגר המטרות הדינמי</span>
              </div>
            )}
            <TrendingUp size={16} />
            <span>מאגר מטרות דינמי</span>
          </button>

          <button
            type="button"
            className={`btn-header-bank ${
              archivedUserStudents.length === 0 ? 'btn-header-disabled' : ''
            }`}
            disabled={archivedUserStudents.length === 0}
            onClick={() => {
              if (archivedUserStudents.length === 0) return;
              if (!selectedArchivedStudentId && archivedUserStudents.length > 0) {
                setSelectedArchivedStudentId(archivedUserStudents[0].id);
              }
              setShowArchiveModal(true);
            }}
            style={
              archivedUserStudents.length === 0
                ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(1)' }
                : undefined
            }
            title={
              archivedUserStudents.length === 0
                ? 'הארכיון ריק – אין תלמידים בארכיון'
                : 'צפה בתלמידים שהועברו לארכיון ובדוחות שלהם'
            }
          >
            <Archive size={16} />
            <span>ארכיון ({archivedUserStudents.length})</span>
          </button>

          {currentUser.isTrialUser && (
            <button
              type="button"
              className="btn-header-bank"
              onClick={() => setShowTrialUpgradeModal(true)}
              title="מידע על תקופת הניסיון והסדרת מנוי שנתי (150 ₪ לשנה)"
              style={{
                position: 'relative',
                background:
                  trialRemainingDays !== null && trialRemainingDays <= 2
                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                    : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                color:
                  trialRemainingDays !== null && trialRemainingDays <= 2
                    ? '#92400e'
                    : '#5b21b6',
                borderColor:
                  trialRemainingDays !== null && trialRemainingDays <= 2
                    ? '#f59e0b'
                    : '#8b5cf6',
                fontWeight: 600
              }}
            >
              <Sparkles size={16} />
              <span>רכישת מנוי שנתי</span>
              {trialRemainingDays !== null && trialRemainingDays <= 2 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '999px',
                    marginRight: '6px'
                  }}
                >
                  {trialRemainingDays === 0
                    ? 'היום!'
                    : `נותרו ${trialRemainingDays} ימים`}
                </span>
              )}
            </button>
          )}

          {/* Unified Help & Support Hub */}
          <button
            type="button"
            className="btn-header-bank"
            onClick={() => setShowTrialUpgradeModal(true)}
            title="מרכז עזרה, סרטון הדרכה, וואטסאפ ומשוב"
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              color: '#166534',
              borderColor: '#86efac',
              fontWeight: 600
            }}
          >
            <MessageCircle size={16} />
            <span>עזרה</span>
            {!currentUser.surveyCompleted && !currentUser.surveyDismissed && currentUser.role !== 'admin' && (
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'inline-block',
                  marginRight: '4px'
                }}
                title="ישנו שאלון משוב פתוח"
              />
            )}
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
            title={
              unreadSharedReports.length > 0
                ? `יש לך ${unreadSharedReports.length} דו"חות משותפים חדשים – לחץ לצפייה ופתיחה`
                : 'לחץ לצפייה בהתראות דו"חות משותפים ושינוי סיסמה אישית'
            }
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <UserCheck size={16} />
            <div className="user-chip-text">
              <strong>{currentUser.name}</strong>
              <small>{currentUser.title}</small>
            </div>
            {currentUser.notifyOnSharedReport !== false && unreadSharedReports.length > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: '#dc2626',
                  color: '#ffffff',
                  borderRadius: '999px',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: 800,
                  marginRight: '4px',
                  boxShadow: '0 0 0 2px #fecaca'
                }}
              >
                <Bell size={12} />
                <span>{unreadSharedReports.length}</span>
              </span>
            ) : (
              <KeyRound size={14} style={{ opacity: 0.75, marginRight: '4px' }} />
            )}
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

          <div className="sidebar-sort-bar" role="group" aria-label="מיון רשימת תלמידים">
            <span className="sidebar-sort-label">מיון לפי:</span>
            <div className="sidebar-sort-pills">
              <button
                type="button"
                className={`sidebar-sort-pill ${studentSortBy === 'framework' ? 'active' : ''}`}
                onClick={() => handleChangeStudentSortBy('framework')}
              >
                מסגרת חינוכית
              </button>
              <button
                type="button"
                className={`sidebar-sort-pill ${studentSortBy === 'name' ? 'active' : ''}`}
                onClick={() => handleChangeStudentSortBy('name')}
              >
                שם תלמיד/ה
              </button>
            </div>
          </div>

          <div className="sidebar-students-list">
            {studentSortBy === 'name' ? (
              sortedStudentsByName.map((st) => {
                const isStLocked = Boolean(
                  unsavedDraftState.isDirty && unsavedDraftState.draftData?.id === st.id
                    ? unsavedDraftState.draftData.isLocked
                    : st.isLocked
                );
                return (
                  <div
                    key={st.id}
                    className={`sidebar-student-card ${
                      selectedStudentId === st.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedStudentId(st.id)}
                  >
                    <div className="st-card-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong>{st.name || 'ללא שם'}</strong>
                        <span
                          className={`st-lock-indicator ${isStLocked ? 'locked' : 'unlocked'}`}
                          title={
                            isStLocked
                              ? 'הדו"ח נעול לעריכה (ניתן לעדכן הערכת מחצית / סוף שנה)'
                              : 'הדו"ח פתוח לעריכה ולשיתוף'
                          }
                        >
                          {isStLocked ? <Lock size={13} /> : <Unlock size={13} />}
                        </span>
                      </div>
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
                );
              })
            ) : (
              frameworkClusters.map(([frameworkName, clusterStudents]) => {
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
                        {clusterStudents.map((st) => {
                          const isStLocked = Boolean(
                            unsavedDraftState.isDirty && unsavedDraftState.draftData?.id === st.id
                              ? unsavedDraftState.draftData.isLocked
                              : st.isLocked
                          );
                          return (
                          <div
                            key={st.id}
                            className={`sidebar-student-card ${
                              selectedStudentId === st.id ? 'selected' : ''
                            }`}
                            onClick={() => setSelectedStudentId(st.id)}
                          >
                            <div className="st-card-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{st.name || 'ללא שם'}</strong>
                                <span
                                  className={`st-lock-indicator ${isStLocked ? 'locked' : 'unlocked'}`}
                                  title={
                                    isStLocked
                                      ? 'הדו"ח נעול לעריכה (ניתן לעדכן הערכת מחצית / סוף שנה)'
                                      : 'הדו"ח פתוח לעריכה ולשיתוף'
                                  }
                                >
                                  {isStLocked ? <Lock size={13} /> : <Unlock size={13} />}
                                </span>
                              </div>
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
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Form Area */}
        <main className="tala-main-form-area">
          {selectedStudent ? (
            <ErrorBoundary key={selectedStudent.id}>
              <EcologicalWorkPlanForm
                student={selectedStudent}
                externalRevision={externalGoalsRevision}
                goalBank={goalBank}
                isAdmin={currentUser.role === 'admin'}
                currentUser={currentUser}
                allowedUsers={allowedUsers}
                onOpenGoalBankManager={() => {
                  if (selectedStudent?.id) setTargetBankStudentId(selectedStudent.id);
                  setShowGoalBankOverview(true);
                }}
                onSaveStudentPlan={handleSaveStudentPlan}
                onUseOrAddGoalToBank={handleUseOrAddGoalToBank}
                onDraftStateChange={setUnsavedDraftState}
                emailEngineConfig={emailEngineConfig}
                onUpdateEmailEngineConfig={handleUpdateEmailEngineConfig}
                onNotifySharedColleague={handleNotifySharedColleague}
                onboardingTourStep={onboardingTourStep}
                setOnboardingTourStep={setOnboardingTourStep}
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
                {/* Onboarding Quickstart Banner for New Users */}
                {userStudents.length === 0 && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
                      border: '1.5px solid #86efac',
                      borderRadius: '16px',
                      padding: '24px 28px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 14px rgba(22, 101, 52, 0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 3px 8px rgba(22, 163, 74, 0.25)'
                        }}
                      >
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#14532d' }}>
                            צעד ראשון במערכת TALA: יצירת תוכנית העבודה הראשונה שלך
                          </h4>
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              border: '1px solid #86efac'
                            }}
                          >
                            הדרכה מלווה
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13.5px', color: '#166534', lineHeight: 1.55 }}>
                          ברוכה הבאה! לחצי על הכפתור הירוק כדי להתחיל. המערכת תלווה אותך שלב אחר שלב: הזנת פרטי התלמיד/ה, בחירת שלב חינוכי (גן/בי"ס), מטרות מהמאגר האקולוגי ושמירה מאובטחת.
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(134, 239, 172, 0.5)'
                      }}
                    >
                      {/* Dominant Primary CTA */}
                      <button
                        type="button"
                        className="btn-inside-landing-primary tour-highlight-btn"
                        onClick={() => {
                          handleAddNewStudent();
                          setOnboardingTourStep(2);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '14.5px',
                          padding: '11px 22px',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                        }}
                      >
                        <span className="tour-arrow-anim-horizontal" style={{ fontSize: '16px' }}>👈</span>
                        <UserPlus size={18} />
                        <span>לחצי כאן להתחלה: יצירת תוכנית עבודה ראשונה</span>
                      </button>

                      {/* Secondary Options Group */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-inside-landing-primary"
                          onClick={handleLoadSampleStudent}
                          style={{
                            background: '#ffffff',
                            color: '#0369a1',
                            border: '1.5px solid #bae6fd',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="טעינת תלמיד לדוגמה עם יעדים ומטרות מלאים להתרשמות נוחה"
                        >
                          <Sparkles size={15} style={{ color: '#0284c7' }} />
                          <span>צפייה בתוכנית לדוגמה</span>
                        </button>

                        <button
                          type="button"
                          className="btn-inside-landing-primary"
                          onClick={() => setShowIntroVideoModal(true)}
                          style={{
                            background: '#ffffff',
                            color: '#475569',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="צפייה בסרטון הדרכה קצר על עבודה עם מערכת TALA"
                        >
                          <BookOpen size={15} style={{ color: '#64748b' }} />
                          <span>סרטון הדרכה (3 דק׳)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card 1: Create New Student */}
                <div className="inside-landing-card create-card" style={{ position: 'relative' }}>
                  <div className="inside-card-icon create-icon">
                    <GraduationCap size={26} />
                  </div>
                  <h3>יצירת תוכנית לתלמיד/ה חדש/ה</h3>
                  <p>
                    פתיחת גיליון תוכנית עבודה אקולוגית ותח"י חדשה מאפס, כולל הגדרת פרופיל תלמיד, תחומי תפקוד, בחירת מטרות מהמאגר ושאלות מנחות ב-AI.
                  </p>
                  <button
                    type="button"
                    className={`btn-inside-landing-primary ${userStudents.length === 0 && onboardingTourStep === 1 ? 'tour-highlight-btn' : ''}`}
                    onClick={() => {
                      handleAddNewStudent();
                      if (userStudents.length === 0) {
                        setOnboardingTourStep(2);
                      } else {
                        setOnboardingTourStep(0);
                      }
                    }}
                  >
                    <UserPlus size={18} />
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

                  <div className="sidebar-sort-bar" role="group" aria-label="מיון רשימת תלמידים">
                    <span className="sidebar-sort-label">מיון לפי:</span>
                    <div className="sidebar-sort-pills">
                      <button
                        type="button"
                        className={`sidebar-sort-pill ${studentSortBy === 'framework' ? 'active' : ''}`}
                        onClick={() => handleChangeStudentSortBy('framework')}
                      >
                        מסגרת חינוכית
                      </button>
                      <button
                        type="button"
                        className={`sidebar-sort-pill ${studentSortBy === 'name' ? 'active' : ''}`}
                        onClick={() => handleChangeStudentSortBy('name')}
                      >
                        שם תלמיד/ה
                      </button>
                    </div>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="inside-landing-empty-list">
                      {userStudents.length === 0
                        ? 'עדיין לא הוגדרו תלמידים במערכת. לחצי על הכפתור מימין ליצירת התלמיד/ה הראשון/ה.'
                        : 'לא נמצאו תלמידים התואמים לחיפוש.'}
                    </div>
                  ) : (
                    <div className="inside-landing-student-list">
                      {(studentSortBy === 'name' ? sortedStudentsByName : sortedStudentsByFramework).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          className="inside-landing-student-row"
                          onClick={() => {
                            setSelectedStudentId(st.id);
                            setOnboardingTourStep(0);
                          }}
                        >
                          <div className="inside-st-main">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong>{st.name || 'ללא שם'}</strong>
                              <span
                                className={`st-lock-indicator ${st.isLocked ? 'locked' : 'unlocked'}`}
                                title={
                                  st.isLocked
                                    ? 'הדו"ח נעול לעריכה (ניתן לעדכן הערכת מחצית / סוף שנה)'
                                    : 'הדו"ח פתוח לעריכה ולשיתוף'
                                }
                              >
                                {st.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                              </span>
                            </div>
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
        unreadSharedReports={unreadSharedReports}
        allowedUsers={allowedUsers}
        onOpenSharedReportNotification={handleOpenSharedReportNotification}
        onToggleNotifySharedReport={handleToggleNotifySharedReport}
      />

      {/* Mandatory Hebrew NDA Modal for Trial Users (opens immediately after password change) */}
      <TrialNdaModal
        isOpen={Boolean(
          currentUser &&
            !currentUser.mustChangePassword &&
            currentUser.isTrialUser &&
            (currentUser.mustSignNda || !currentUser.ndaSigned)
        )}
        currentUser={currentUser}
        onCompleteNda={handleCompleteTrialNda}
        onSignNdaComplete={handleCompleteTrialNda}
        onLogout={performLogout}
      />

      {/* Optional Post-Usage User Experience & Recommendation Survey Modal */}
      <UserFeedbackSurveyModal
        isOpen={Boolean(
          showFeedbackSurveyModal &&
            currentUser &&
            !currentUser.mustChangePassword &&
            !(currentUser.isTrialUser && (currentUser.mustSignNda || !currentUser.ndaSigned))
        )}
        currentUser={currentUser}
        onSubmitSurvey={handleSubmitUserSurvey}
        onSnoozeSurvey={handleSnoozeUserSurvey}
        onDismissSurveyPermanently={handleDismissUserSurveyPermanently}
      />

      {/* Trial / Contact & Support Modal (Accessible to all users) */}
      <TrialUpgradeModal
        isOpen={Boolean(
          showTrialUpgradeModal &&
            currentUser &&
            !currentUser.mustChangePassword &&
            !(currentUser.isTrialUser && (currentUser.mustSignNda || !currentUser.ndaSigned))
        )}
        onClose={() => setShowTrialUpgradeModal(false)}
        currentUser={currentUser}
        remainingDays={trialRemainingDays}
        onOpenSurvey={() => {
          setShowTrialUpgradeModal(false);
          setShowFeedbackSurveyModal(true);
        }}
        onOpenIntroVideo={() => {
          setShowTrialUpgradeModal(false);
          setShowIntroVideoModal(true);
        }}
        onSubmitSupportMessage={(payload) => {
          handleSubmitAdminRequest({
            id: 'support_inquiry_' + Date.now(),
            topic: payload.topic || '💬 פנייה למנהלת המערכת',
            name: payload.name || currentUser.name,
            email: payload.email || currentUser.email,
            notes: payload.notes,
            createdAt: new Date().toLocaleString('he-IL', {
              dateStyle: 'short',
              timeStyle: 'short'
            })
          });
        }}
      />

      {/* Admin Allowlist Management Modal (Only accessible to Admin) */}
      {currentUser.role === 'admin' && (
        <AdminAllowlistModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          allowedUsers={allowedUsers}
          onUpdateAllowedUsers={handleUpdateAllowedUsers}
          onUpdateEmailEngineConfig={handleUpdateEmailEngineConfig}
          enforcePasswordPolicy={enforcePasswordPolicy}
          onChangeEnforcePasswordPolicy={handleChangeEnforcePasswordPolicy}
          geminiApiKey={geminiApiKey}
          onChangeGeminiApiKey={handleChangeGeminiApiKey}
          adminRequests={adminRequests}
          onDismissAdminRequest={handleDismissAdminRequest}
          cloudSyncState={cloudSyncState}
          emailEngineConfig={emailEngineConfig}
          students={students}
        />
      )}

      {/* Dynamic Goal Bank Popularity & Admin Management Modal */}
      {showGoalBankOverview && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowGoalBankOverview(false);
            setEditingBankGoal(null);
            setSelectedHlDomain(null);
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
                  setSelectedHlDomain(null);
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

              {/* Target Student Bar for Direct Goal Injection from the Bank */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f3eefc 0%, #eef6ff 100%)',
                  border: '1.5px solid #d6c6f7',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                {userStudents.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#3b2868' }}>
                        🎯 הוספת מטרה מהמאגר ישירות לתכנית של:
                      </span>
                      <select
                        value={activeBankTargetStudent?.id || ''}
                        onChange={(e) => setTargetBankStudentId(e.target.value)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #b39ddb',
                          background: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#24344d',
                          cursor: 'pointer'
                        }}
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
                    {activeBankTargetStudent &&
                      selectedStudentId !== activeBankTargetStudent.id && (
                        <button
                          type="button"
                          className="btn-secondary-sm"
                          onClick={() => {
                            setSelectedStudentId(activeBankTargetStudent.id);
                            setShowGoalBankOverview(false);
                            setSelectedHlDomain(null);
                          }}
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                        >
                          פתח את תכנית התלמיד/ה ⬅
                        </button>
                      )}
                  </>
                ) : (
                  <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                    💡 צרי כרטיס תלמיד/ה כדי להוסיף אליו מטרות בלחיצה אחת מתוך המאגר.
                  </span>
                )}
              </div>

              {bankAddToast && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    color: '#166534',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                >
                  {bankAddToast}
                </div>
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

              {/* Stage Filter Pills & High-Level Domain Navigation Bar */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Stage pills (גן / בית ספר / הכל) */}
                  {(() => {
                    const studentStage = activeBankTargetStudent ? getEffectiveStudentStage(activeBankTargetStudent) : 'all';
                    const activeStage = goalBankStageFilter !== null ? goalBankStageFilter : studentStage;
                    return (
                      <div style={{ display: 'inline-flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '999px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setGoalBankStageFilter('kindergarten');
                            setSelectedHlDomain(null);
                            setGoalBankEnvFilter('הכל');
                          }}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: activeStage === 'kindergarten' ? 700 : 600,
                            cursor: 'pointer',
                            border: 'none',
                            background: activeStage === 'kindergarten' ? '#7c3aed' : 'transparent',
                            color: activeStage === 'kindergarten' ? '#ffffff' : '#334155'
                          }}
                        >
                          גן
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGoalBankStageFilter('school');
                            setSelectedHlDomain(null);
                            setGoalBankEnvFilter('הכל');
                          }}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: activeStage === 'school' ? 700 : 600,
                            cursor: 'pointer',
                            border: 'none',
                            background: activeStage === 'school' ? '#7c3aed' : 'transparent',
                            color: activeStage === 'school' ? '#ffffff' : '#334155'
                          }}
                        >
                          בית ספר
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGoalBankStageFilter('all');
                            setSelectedHlDomain(null);
                            setGoalBankEnvFilter('הכל');
                          }}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: activeStage === 'all' ? 700 : 600,
                            cursor: 'pointer',
                            border: 'none',
                            background: activeStage === 'all' ? '#7c3aed' : 'transparent',
                            color: activeStage === 'all' ? '#ffffff' : '#334155'
                          }}
                        >
                          הכל
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Back button or breadcrumb when drilled down into a specific HL domain */}
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

              {/* VIEW 1: High-Level Goal Domains Grid (When no domain selected and no search) */}
              {!selectedHlDomain && !goalBankSearch.trim() ? (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, marginBottom: '10px' }}>
                    בחר/י תחום פעילות או מטרת-על כדי לצפות במטרות המותאמות:
                  </div>
                  <div className="goal-bank-hl-domains-grid">
                    {(() => {
                      const studentStage = activeBankTargetStudent ? getEffectiveStudentStage(activeBankTargetStudent) : 'all';
                      const activeStage = goalBankStageFilter !== null ? goalBankStageFilter : studentStage;

                      // Gather relevant canonical environments for active stage
                      const domainsToShow = [];
                      if (activeStage === 'kindergarten' || activeStage === 'all') {
                        KINDERGARTEN_ENVIRONMENTS.forEach((env) => {
                          domainsToShow.push({ name: env, stage: 'kindergarten', stageLabel: 'גן' });
                        });
                      }
                      if (activeStage === 'school' || activeStage === 'all') {
                        SCHOOL_ENVIRONMENTS.forEach((env) => {
                          domainsToShow.push({ name: env, stage: 'school', stageLabel: 'בית ספר' });
                        });
                      }

                      const domainIcons = {
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

                      return domainsToShow.map((item) => {
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
                                {domainIcons[item.name] || '🎯'}
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
                      });
                    })()}
                  </div>
                </div>
              ) : (
                /* VIEW 2: Drilled-down Goals List (Under selected domain or during search) */
                <>
                  {selectedHlDomain && !goalBankSearch.trim() && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '10px'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                        🎯 מטרות בתחום: <strong>{selectedHlDomain}</strong>
                      </span>
                    </div>
                  )}

                  <div className="goal-bank-items-scroll" style={{ maxHeight: '420px' }}>
                    {(() => {
                      const studentStage = activeBankTargetStudent ? getEffectiveStudentStage(activeBankTargetStudent) : 'all';
                      const activeStage = goalBankStageFilter !== null ? goalBankStageFilter : studentStage;
                      const effectiveEnvFilter = selectedHlDomain || goalBankEnvFilter;

                      return sortedBank
                        .filter((g) => {
                          if (!isGoalRelevantForStage(g, activeStage)) {
                            return false;
                          }
                          if (
                            effectiveEnvFilter !== 'הכל' &&
                            canonicalizeEnvironment(g.environment) !== effectiveEnvFilter &&
                            !(g.environment || '').includes(effectiveEnvFilter)
                          ) {
                            return false;
                          }
                          const q = goalBankSearch.trim();
                          if (!q) return true;
                          return (
                            (g.title || '').includes(q) ||
                            (g.environment || '').includes(q) ||
                            (g.suggestedObjectives || []).some((o) => o.includes(q))
                          );
                        })
                    .map((g, i) => {
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
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
                        >
                          {activeBankTargetStudent && (
                            targetStudentForCheck?.isLocked ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
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
                                  padding: '5px 10px',
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
                                onClick={() =>
                                  handleAddBankGoalToStudent(g, activeBankTargetStudent)
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '5px 11px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #4a88c7 0%, #6d5cae 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 2px 6px rgba(74, 136, 199, 0.25)'
                                }}
                                title={`הוסף מטרה זו (מותאמת למגדר) ישירות אל תכנית העבודה של ${
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
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer" style={{ textAlign: 'left' }}>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={() => {
                  setShowGoalBankOverview(false);
                  setEditingBankGoal(null);
                  setSelectedHlDomain(null);
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

      {/* Introductory Video Player Modal */}
      {showIntroVideoModal && (
        <div className="modal-backdrop" onClick={() => setShowIntroVideoModal(false)} dir="rtl">
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', padding: '0', overflow: 'hidden', borderRadius: '16px' }}
          >
            <div className="modal-header" style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div className="modal-header-title">
                <BookOpen size={20} className="text-primary" />
                <h3>סרטון הדרכה – היכרות עם מערכת TALA</h3>
              </div>
              <button type="button" className="btn-icon-close" onClick={() => setShowIntroVideoModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <video
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '75vh', display: 'block' }}
                src="./tala_intro_video.mp4"
              >
                הדפדפן שלך אינו תומך בנגן הווידאו.
              </video>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                הופק באמצעות NotebookLM • הדרכה קצרה וממוקדת
              </span>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={() => setShowIntroVideoModal(false)}
              >
                סגור נגן
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

