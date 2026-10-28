import React, { useState, useEffect, useMemo } from 'react';
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
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Home,
  ClipboardList
} from 'lucide-react';
import {
  loadAllowedUsers,
  saveAllowedUsers,
  stampSessionUserWithDate,
  isSessionUserValidForToday,
  isTrialUserExpired,
  getTrialRemainingDays,
  getPaidRemainingDays,
  createPasswordCredentials,
  ensureUsersListPasswordsHashed,
  verifyUserPassword
} from './allowedUsers';
import {
  AllowlistAuthGate,
  UserSelfPasswordModal
} from './AllowlistAuthGate';
import {
  DEFAULT_USER_PREFERENCES,
  loadLocalUserPreferences,
  saveLocalUserPreferences,
  normalizeUserPreferences
} from './domain/userPreferences';
import AdminAllowlistModal from './components/modals/AdminAllowlistModal';
import UpgradeBanner from './components/UpgradeBanner';
import SessionEvictedModal from './components/modals/SessionEvictedModal';
import {
  subscribeToSession,
  sendSessionHeartbeat,
  clearSession,
  activateSession,
  generateSessionId
} from './services/sessionSecurity';
import { startAiProxyKeepAlive } from './services/aiProxyClient';
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
  saveUserPreferencesToCloud,
  subscribeToUserPreferences,
  saveStudentToCloud,
  deleteStudentFromCloud,
  recordUserPresence,
  ensureFirebaseAuthSession,
  signOutFirebaseAuthSession,
  subscribeToHealthEvents,
  clearHealthEventsInCloud
} from './firebaseBackend';
import { countUnreviewedHealthEvents } from './domain/healthEvents.js';
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
  getUnreadTeamMessagesCountForUser,
  markTeamMessagesAsRead,
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
import TeacherChatWidget from './components/chat/TeacherChatWidget';
import { subscribeToAllSupportThreads } from './services/supportChatService';
import { computePendingInquiriesCount, THREAD_STATUS } from './domain/supportChat.js';
import UserFeedbackSurveyModal from './components/modals/UserFeedbackSurveyModal';
import EcologicalWorkPlanForm from './EcologicalWorkPlanForm';
import { appendBankGoalToStudent } from './domain/bankGoalApplication';
import {
  getFrameworkKey,
  filterStudentsBySearch,
  sortStudentsByName,
  sortStudentsByFramework,
  groupStudentsByFramework,
  resolveBankTargetStudent
} from './domain/studentListView';
import {
  isSurveyEligible,
  advanceUsageEntry,
  shouldPromptSurvey,
  patchUserByEmail,
  buildSurveySummaryNotes
} from './domain/userEngagement';
import { buildAdminBankGoalPayload } from './domain/goalBankAdmin';
import DailyPedagogicalTracker from './components/DailyPedagogicalTracker';
import GoalBankPage from './components/GoalBankPage';
import './index.css';

const STUDENTS_STORAGE_KEY = 'tala_students_plans_v3';
const SESSION_USER_KEY = 'tala_current_session_user_v1';
const PASSWORD_POLICY_STORAGE_KEY = 'tala_enforce_password_policy_v1';
const ADMIN_REQUESTS_STORAGE_KEY = 'tala_admin_requests_v1';
const USER_USAGE_TRACKER_KEY = 'tala_user_usage_tracker_v1';
const DISMISSED_SHARED_REPORTS_KEY = 'tala_dismissed_shared_reports_v1';
const UPGRADE_BANNER_STORAGE_KEY = 'tala_upgrade_banner_v1';

export default function App() {
  // Allowed users list
  const [allowedUsers, setAllowedUsers] = useState(() => loadAllowedUsers());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalInitialTab, setAdminModalInitialTab] = useState('users');
  const [adminModalInitialActiveChatReqId, setAdminModalInitialActiveChatReqId] = useState(null);
  const [showSelfPasswordModal, setShowSelfPasswordModal] = useState(false);
  const [showFeedbackSurveyModal, setShowFeedbackSurveyModal] = useState(false);
  const [showTrialUpgradeModal, setShowTrialUpgradeModal] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
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

  // Real-time upgrade & deployment warning banner (PR + merge + deploy)
  const [upgradeBanner, setUpgradeBanner] = useState(() => {
    try {
      const saved = localStorage.getItem(UPGRADE_BANNER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const handleUpdateUpgradeBanner = (nextBanner) => {
    setUpgradeBanner(nextBanner);
    if (nextBanner) {
      safeSetStorageJson(UPGRADE_BANNER_STORAGE_KEY, nextBanner);
    } else {
      safeRemoveStorageItem(UPGRADE_BANNER_STORAGE_KEY);
    }
    saveSettingsToCloud({ upgradeBanner: nextBanner });
  };

  const handleQuickSaveFromBanner = () => {
    if (unsavedDraftState?.isDirty && unsavedDraftState?.draftData) {
      const updated = {
        ...unsavedDraftState.draftData,
        lastSavedAt: new Date().toLocaleTimeString('he-IL', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      setStudents((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      saveStudentToCloud(updated);
      (updated.goals || []).forEach((g) => {
        if (g.title && g.title.trim()) {
          handleUseOrAddGoalToBank(g);
        }
      });
      setUnsavedDraftState({ isDirty: false, draftData: updated });
    }
  };

  const handleUpdateEmailEngineConfig = (nextCfg) => {
    const saved = saveEmailEngineConfig(nextCfg);
    setEmailEngineConfig(saved);
    saveSettingsToCloud({ emailEngineConfig: saved });
  };

  const handleChangeEnforcePasswordPolicy = (enabled) => {
    const nextVal = Boolean(enabled);
    setEnforcePasswordPolicy(nextVal);
    safeSetStorageItem(PASSWORD_POLICY_STORAGE_KEY, String(nextVal));
    saveSettingsToCloud({ enforcePasswordPolicy: nextVal });
  };

  const [aiFreeze, setAiFreeze] = useState(false);
  const handleUpdateAiFreeze = (nextVal) => {
    const val = Boolean(nextVal);
    setAiFreeze(val);
    saveSettingsToCloud({ aiFreeze: val });
  };

  const handleSubmitAdminRequest = (newReq) => {
    setAdminRequests((prev) => {
      const next = [newReq, ...prev];
      safeSetStorageJson(ADMIN_REQUESTS_STORAGE_KEY, next);
      return next;
    });
    submitAdminRequestToCloud(newReq);
  };

  const handleDismissAdminRequest = (reqId) => {
    setAdminRequests((prev) => {
      const next = prev.filter((r) => r.id !== reqId);
      safeSetStorageJson(ADMIN_REQUESTS_STORAGE_KEY, next);
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
          loginAt: parsed.loginAt,
          sessionId: parsed.sessionId
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  });

  // Eviction modal state when account is logged into from another host/IP
  const [evictionModalInfo, setEvictionModalInfo] = useState(null);

  // Teacher Personal Preferences & Defaults (stored per user email)
  const [userPreferences, setUserPreferences] = useState(() => {
    try {
      const savedUser = localStorage.getItem(SESSION_USER_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.email) {
          return loadLocalUserPreferences(parsed.email);
        }
      }
    } catch {}
    return DEFAULT_USER_PREFERENCES;
  });

  useEffect(() => {
    if (!currentUser?.email) {
      setUserPreferences(DEFAULT_USER_PREFERENCES);
      return;
    }
    const local = loadLocalUserPreferences(currentUser.email);
    setUserPreferences(local);

    const unsub = subscribeToUserPreferences(currentUser.email, (cloudPrefs) => {
      if (cloudPrefs) {
        const merged = normalizeUserPreferences({ ...local, ...cloudPrefs });
        setUserPreferences(merged);
        saveLocalUserPreferences(currentUser.email, merged);
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [currentUser?.email]);

  const handleSaveUserPreferences = (updatedPrefs) => {
    if (!currentUser?.email) return;
    const normalized = normalizeUserPreferences(updatedPrefs);
    setUserPreferences(normalized);
    saveLocalUserPreferences(currentUser.email, normalized);
    saveUserPreferencesToCloud(currentUser.email, normalized).catch((err) => {
      console.warn('Could not save user preferences to cloud:', err);
    });
  };

  const effectiveCurrentUser = useMemo(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      name: userPreferences?.fullName || currentUser.name,
      title: userPreferences?.professionalTitle || currentUser.title,
      group: userPreferences?.institutionalAffiliation || currentUser.group
    };
  }, [currentUser, userPreferences?.fullName, userPreferences?.professionalTitle, userPreferences?.institutionalAffiliation]);

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
  const [showDailyTracker, setShowDailyTracker] = useState(false);
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
    safeSetStorageJson(STUDENTS_STORAGE_KEY, students);
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
        if (!Array.isArray(cloudGoals) || cloudGoals.length === 0) return;
        const currentLocal = loadGoalBank();
        const merged = deduplicateAndNormalizeGoalBank([...(cloudGoals || []), ...(currentLocal || [])]);
        const hasOldTestingWeights =
          localStorage.getItem('tala_cloud_goal_weights_zeroed_v1') !== 'true' &&
          Array.isArray(merged) &&
          merged.some((g) => Number(g.usageCount) > 0);

        if (hasOldTestingWeights) {
          const zeroedGoals = merged.map((g) => ({ ...g, usageCount: 0 }));
          localStorage.setItem('tala_cloud_goal_weights_zeroed_v1', 'true');
          setGoalBank(zeroedGoals);
          saveGoalBank(zeroedGoals);
          saveGoalBankToCloud(zeroedGoals).catch(() => {});
        } else {
          localStorage.setItem('tala_cloud_goal_weights_zeroed_v1', 'true');
          setGoalBank(merged);
          saveGoalBank(merged);
          // If local had additions or normalization that cloud lacked, sync back to cloud
          if (merged.length !== cloudGoals.length) {
            saveGoalBankToCloud(merged).catch(() => {});
          }
        }
      },
      onStudentsChange: (cloudStudents) => {
        const normalized = cloudStudents.map((s) => ({
          ...s,
          ownerEmail: (s.ownerEmail || 'zivit.reshef@gmail.com').toLowerCase()
        }));
        setStudents(normalized);
        safeSetStorageJson(STUDENTS_STORAGE_KEY, normalized);
      },
      onSettingsChange: (settings) => {

        if (typeof settings?.enforcePasswordPolicy === 'boolean') {
          setEnforcePasswordPolicy(settings.enforcePasswordPolicy);
          safeSetStorageItem(
            PASSWORD_POLICY_STORAGE_KEY,
            String(settings.enforcePasswordPolicy)
          );
        }
        if (Array.isArray(settings?.adminRequests)) {
          setAdminRequests(settings.adminRequests);
          safeSetStorageJson(
            ADMIN_REQUESTS_STORAGE_KEY,
            settings.adminRequests
          );
        }
        if (settings?.emailEngineConfig && typeof settings.emailEngineConfig === 'object') {
          const syncedEmailCfg = saveEmailEngineConfig(settings.emailEngineConfig);
          setEmailEngineConfig(syncedEmailCfg);
        }
        if (settings && typeof settings.aiFreeze === 'boolean') {
          setAiFreeze(settings.aiFreeze);
        }
        if (settings && 'upgradeBanner' in settings) {
          setUpgradeBanner(settings.upgradeBanner);
          if (settings.upgradeBanner) {
            safeSetStorageJson(UPGRADE_BANNER_STORAGE_KEY, settings.upgradeBanner);
          } else {
            safeRemoveStorageItem(UPGRADE_BANNER_STORAGE_KEY);
          }
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

  // System-health events (AI failures / local-engine fallbacks) – admin only
  const HEALTH_REVIEWED_STORAGE_KEY = 'tala_health_reviewed_ms';
  const [healthEvents, setHealthEvents] = useState([]);
  const [healthReviewedMs, setHealthReviewedMs] = useState(() => {
    const stored = Number(localStorage.getItem(HEALTH_REVIEWED_STORAGE_KEY));
    return Number.isFinite(stored) ? stored : 0;
  });
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      setHealthEvents([]);
      return undefined;
    }
    return subscribeToHealthEvents((events) => setHealthEvents(events));
  }, [currentUser?.email, currentUser?.role]);

  const [adminSupportThreads, setAdminSupportThreads] = useState([]);
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      setAdminSupportThreads([]);
      return undefined;
    }
    return subscribeToAllSupportThreads((threads) => {
      setAdminSupportThreads(threads || []);
    });
  }, [currentUser?.email, currentUser?.role]);

  // Auto-prune adminRequests when matching support thread is already resolved
  useEffect(() => {
    if (!Array.isArray(adminRequests) || !Array.isArray(adminSupportThreads) || adminRequests.length === 0) return;
    const resolvedEmails = new Set(
      adminSupportThreads
        .filter((t) => t.status === THREAD_STATUS.RESOLVED || (!t.unreadByAdmin && t.status !== THREAD_STATUS.NEEDS_ATTENTION))
        .map((t) => (t.userEmail || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const hasStaleReq = adminRequests.some((r) => {
      const email = (r.email || '').trim().toLowerCase();
      return email && resolvedEmails.has(email);
    });

    if (hasStaleReq) {
      setAdminRequests((prev) => {
        const next = prev.filter((r) => {
          const email = (r.email || '').trim().toLowerCase();
          return !email || !resolvedEmails.has(email);
        });
        safeSetStorageJson(ADMIN_REQUESTS_STORAGE_KEY, next);
        saveAdminRequestsToCloud(next);
        return next;
      });
    }
  }, [adminRequests, adminSupportThreads]);

  // Handle deep-link to directly open teacher support chat from notification links (?openAdminChat=email)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const chatEmailParam = urlParams.get('openAdminChat');
      if (chatEmailParam && !currentUser) {
        sessionStorage.setItem('tala_pending_admin_chat', chatEmailParam);
      }
    } catch (_) {}
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const pendingFromSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('tala_pending_admin_chat') : null;
      const chatEmail = urlParams.get('openAdminChat') || pendingFromSession;

      if (chatEmail) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('tala_pending_admin_chat');
        }
        const cleanEmail = chatEmail.trim().toLowerCase();
        setAdminModalInitialTab('requests');
        setAdminModalInitialActiveChatReqId(cleanEmail);
        setShowAdminModal(true);

        if (urlParams.has('openAdminChat')) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('openAdminChat');
          window.history.replaceState({}, document.title, newUrl.toString());
        }
      }
    } catch (err) {
      console.warn('Failed to parse openAdminChat deep link:', err);
    }
  }, [currentUser?.role, currentUser?.email]);

  const handleMarkHealthReviewed = () => {
    const now = Date.now();
    localStorage.setItem(HEALTH_REVIEWED_STORAGE_KEY, String(now));
    setHealthReviewedMs(now);
  };
  const handleClearHealthEvents = async () => {
    const ok = await clearHealthEventsInCloud();
    if (ok) handleMarkHealthReviewed();
    return ok;
  };

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
        (matchingUser.paidExpiresAt || '') !== (currentUser.paidExpiresAt || '') ||
        (matchingUser.subscriptionType || '') !== (currentUser.subscriptionType || '') ||
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
          subscriptionType: matchingUser.subscriptionType || (matchingUser.isTrialUser ? 'trial' : 'annual_paid'),
          paidExpiresAt: matchingUser.paidExpiresAt || null,
          upgradedToPaidAt: matchingUser.upgradedToPaidAt || null,
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
        safeSetStorageJson(SESSION_USER_KEY, syncedUser);
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
    let updatedStudent = markSharedReportAsRead(studentObj, emailLower);
    updatedStudent = markTeamMessagesAsRead(updatedStudent, emailLower);
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
    const fwKey = getFrameworkKey(studentObj);
    setExpandedFrameworks((prev) => ({ ...prev, [fwKey]: true }));
    setSelectedStudentId(studentObj.id);
    setShowSelfPasswordModal(false);
  };

  const handleDismissSharedReportNotification = (studentObj) => {
    if (!studentObj?.id || !currentUser?.email) return;
    const emailLower = currentUser.email.trim().toLowerCase();

    // 1. Mark as read on the student object & persist to cloud
    let updatedStudent = markSharedReportAsRead(studentObj, emailLower);
    updatedStudent = markTeamMessagesAsRead(updatedStudent, emailLower);
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
  };

  const handleDismissAllSharedReports = () => {
    if (!currentUser?.email || !Array.isArray(unreadSharedReports) || unreadSharedReports.length === 0) return;
    const emailLower = currentUser.email.trim().toLowerCase();
    const idsToDismiss = unreadSharedReports.map((st) => st.id).filter(Boolean);

    // 1. Mark all unread reports & messages as read
    setStudents((prev) =>
      prev.map((st) => {
        if (!idsToDismiss.includes(st.id)) return st;
        let updated = markSharedReportAsRead(st, emailLower);
        updated = markTeamMessagesAsRead(updated, emailLower);
        saveStudentToCloud(updated);
        return updated;
      })
    );

    // 2. Add all to localStorage dismissed map
    setDismissedSharedByEmail((prev) => {
      const prevList = Array.isArray(prev[emailLower]) ? prev[emailLower] : [];
      const nextList = Array.from(new Set([...prevList, ...idsToDismiss]));
      const nextMap = { ...prev, [emailLower]: nextList };
      safeSetStorageJson(DISMISSED_SHARED_REPORTS_KEY, nextMap);
      return nextMap;
    });

    // 3. Add all to user profile
    const userDismissed = Array.isArray(currentUser.dismissedSharedReportIds)
      ? currentUser.dismissedSharedReportIds
      : [];
    const nextUserDismissed = Array.from(new Set([...userDismissed, ...idsToDismiss]));
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

    const updatedList = patchUserByEmail(allowedUsers, currentUser.email, {
      surveyCompleted: true,
      surveyCompletedAt: submittedAtStr
    });
    handleUpdateAllowedUsers(updatedList);

    const updatedCurrent = {
      ...currentUser,
      surveyCompleted: true,
      surveyCompletedAt: submittedAtStr
    };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);

    const summaryNotes = buildSurveySummaryNotes(surveyPayload);

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

    const updatedList = patchUserByEmail(allowedUsers, currentUser.email, {
      surveyDismissed: true
    });
    handleUpdateAllowedUsers(updatedList);

    const updatedCurrent = { ...currentUser, surveyDismissed: true };
    setCurrentUser(updatedCurrent);
    safeSetStorageJson(SESSION_USER_KEY, updatedCurrent);
  };

  // Track active usage for new users and automatically trigger the optional survey after working with the webapp for a while
  useEffect(() => {
    if (!isSurveyEligible(currentUser, surveySnoozedInSession)) {
      return undefined;
    }

    const emailKey = currentUser.email.trim().toLowerCase();
    const ownedCount = students.filter(
      (s) => s.ownerEmail?.toLowerCase() === emailKey && (s.name || '').trim()
    ).length;

    const checkAndAdvanceUsage = () => {
      if (document.visibilityState !== 'visible') return;
      const allUsage = safeGetStorageJson(USER_USAGE_TRACKER_KEY, {}) || {};
      const nextEntry = advanceUsageEntry(allUsage[emailKey]);
      allUsage[emailKey] = nextEntry;
      safeSetStorageJson(USER_USAGE_TRACKER_KEY, allUsage);

      // Trigger optional survey after ~8 minutes of active usage, or after ~3 minutes if the user already created/worked on a student card
      if (shouldPromptSurvey(nextEntry.activeSeconds, ownedCount)) {
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

  // Keep AI backend warm during active teacher session ($0 baseline, prevents cold-start drops)
  useEffect(() => {
    if (!currentUser?.email) return undefined;
    const cleanup = startAiProxyKeepAlive();
    return cleanup;
  }, [currentUser?.email]);

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

  // Real-time single session enforcement & heartbeat
  useEffect(() => {
    if (!currentUser || !currentUser.email) return;

    const email = currentUser.email.toLowerCase();
    const sessionId = currentUser.sessionId || generateSessionId();

    if (!currentUser.sessionId) {
      const updatedUser = { ...currentUser, sessionId };
      setCurrentUser(updatedUser);
      safeSetStorageJson(SESSION_USER_KEY, updatedUser);
      activateSession(email, sessionId);
    }

    // Realtime eviction listener (cross-host / cross-tab)
    const unsubscribe = subscribeToSession(email, sessionId, (evictionData) => {
      console.warn('[SessionSecurity] Local session was evicted by another login:', evictionData);
      setEvictionModalInfo(evictionData);
      setCurrentUser(null);
      safeRemoveStorageItem(SESSION_USER_KEY);
      signOutFirebaseAuthSession();
    });

    // 2-minute presence & session heartbeat
    sendSessionHeartbeat(email, sessionId);
    const heartbeatInterval = setInterval(() => {
      sendSessionHeartbeat(email, sessionId);
    }, 2 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(heartbeatInterval);
    };
  }, [currentUser?.email, currentUser?.sessionId]);

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

  const performLogout = async () => {
    const userToClear = currentUser;
    setShowLogoutUnsavedModal(false);
    setShowFeedbackSurveyModal(false);
    setUnsavedDraftState({ isDirty: false, draftData: null });
    setCurrentUser(null);
    setSelectedStudentId(null);
    safeRemoveStorageItem(SESSION_USER_KEY);
    if (userToClear?.email) {
      try {
        await clearSession(userToClear.email, userToClear.sessionId);
      } catch (err) {
        console.warn('Failed to clear session on logout:', err);
      }
    }
    await signOutFirebaseAuthSession();
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
      safeSetStorageJson(
        STUDENTS_STORAGE_KEY,
        updatedStudents
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
    const isTachiPref = userPreferences?.defaultReportType === 'tachi';
    const chosenPlanType = isTachiPref
      ? 'תח"י (תוכנית חינוכית יחידנית)'
      : 'תל"א (תוכנית לימודים אישית)';
    const defaultFramework = userPreferences?.defaultEducationalFramework || '';
    const newStudentPlan = {
      id: newId,
      ownerEmail: currentUser.email.trim().toLowerCase(),
      date: todayStr,
      schoolYear: 'תשפ"ו (2025-2026)',
      planType: chosenPlanType,
      name: '',
      gender: 'boy',
      idNumber: '',
      birthDate: '',
      educationalFramework: defaultFramework,
      homeroomTeacher: userPreferences?.fullName || '',
      integrationTeacher: isTachiPref ? (userPreferences?.fullName || '') : '',
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

  const handleNavigateBackToStudents = () => {
    if (unsavedDraftState.isDirty && unsavedDraftState.draftData) {
      handleSaveStudentPlan(unsavedDraftState.draftData);
      setUnsavedDraftState({ isDirty: false, draftData: null });
    }
    setSelectedStudentId(null);
  };

  const handleUseOrAddGoalToBank = (goalData) => {
    const nextBank = recordGoalUsageOrAdd(goalData, goalBank);
    setGoalBank(nextBank);
    saveGoalBank(nextBank);
    saveGoalBankToCloud(nextBank).catch(() => {});
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

    const res = appendBankGoalToStudent(baseStudent, bankItem);
    if (!res.added) return;

    const updatedStudent = res.student;

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
      `✅ המטרה "${res.goalTitle}" נוספה לתכנית של ${studentDisplayName} ומשקלה במאגר עלה ב-+1!`
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

    const payload = buildAdminBankGoalPayload(editingBankGoal);
    const targetTitle = payload.title;
    const targetEnv = payload.environment;
    const resolvedStages = payload.stages;

    let nextBank;
    if (editingBankGoal.mode === 'add') {
      nextBank = addGoalByAdmin(payload, goalBank);
      setBankAddToast(`✅ המטרה "${targetTitle}" נוספה בהצלחה למאגר!`);
    } else {
      nextBank = updateGoalByAdmin(editingBankGoal.id, payload, goalBank);
      setBankAddToast(`✅ השינויים במטרה "${targetTitle}" נשמרו בהצלחה!`);
    }

    setGoalBank(nextBank);
    saveGoalBank(nextBank);
    saveGoalBankToCloud(nextBank).catch(() => {});

    // Navigate user directly to the domain and search for the goal so they see it immediately
    setSelectedHlDomain(targetEnv);
    setGoalBankEnvFilter(targetEnv);
    if (goalBankStageFilter !== 'all' && goalBankStageFilter !== null) {
      const isVisibleInCurrentStage = resolvedStages.includes(goalBankStageFilter);
      if (!isVisibleInCurrentStage) {
        setGoalBankStageFilter('all');
      }
    }
    setGoalBankSearch(targetTitle);
    setEditingBankGoal(null);
    setTimeout(() => setBankAddToast(''), 4500);
  };

  const handleDeleteAdminBankGoal = (goalItem) => {
    if (!window.confirm(`האם למחוק את המטרה "${goalItem.title}" ממאגר המטרות הדינמי?`)) {
      return;
    }
    const nextBank = deleteGoalByAdmin(goalItem.id, goalBank);
    setGoalBank(nextBank);
    saveGoalBank(nextBank);
    saveGoalBankToCloud(nextBank).catch(() => {});
    setBankAddToast(`🗑️ המטרה "${goalItem.title}" נמחקה מהמאגר.`);
    setTimeout(() => setBankAddToast(''), 3500);
    if (editingBankGoal?.id === goalItem.id) {
      setEditingBankGoal(null);
    }
  };

  // Gate the entire app if user is not authenticated in the Allowed Users List
  if (!currentUser) {
    return (
      <>
        {evictionModalInfo && (
          <SessionEvictedModal
            evictionInfo={evictionModalInfo}
            onAcknowledge={() => setEvictionModalInfo(null)}
          />
        )}
        <AllowlistAuthGate
          allowedUsers={allowedUsers}
          onLoginSuccess={handleLoginSuccess}
          onUpdateAllowedUsers={handleUpdateAllowedUsers}
          onSubmitAdminRequest={handleSubmitAdminRequest}
          enforcePasswordPolicy={enforcePasswordPolicy}
          onChangeEnforcePasswordPolicy={handleChangeEnforcePasswordPolicy}
        />
      </>
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
          onOpenChat={() => setIsSupportChatOpen(true)}
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
  const unreviewedHealthEventsCount = countUnreviewedHealthEvents(healthEvents, healthReviewedMs);
  const pendingInquiriesCount = computePendingInquiriesCount(adminRequests, adminSupportThreads);
  const totalAdminAlerts =
    lockedOutUsers.length + pendingInquiriesCount + unreviewedHealthEventsCount;
  const trialRemainingDays = currentUser?.isTrialUser ? getTrialRemainingDays(currentUser) : null;
  const paidRemainingDays = (!currentUser?.isTrialUser && currentUser) ? getPaidRemainingDays(currentUser) : null;

  const userStudents = getStudentsForUser(students, currentUser);
  const archivedUserStudents = getArchivedStudentsForUser(students, currentUser);
  const selectedStudent = userStudents.find((s) => s.id === selectedStudentId);
  const filteredStudents = filterStudentsBySearch(userStudents, studentSearch);
  const sortedStudentsByName = sortStudentsByName(filteredStudents);
  const sortedStudentsByFramework = sortStudentsByFramework(filteredStudents);
  const frameworkClusters = groupStudentsByFramework(filteredStudents);
  const sortedBank = getSortedGoalBank(goalBank);
  const activeBankTargetStudent = resolveBankTargetStudent(
    userStudents,
    targetBankStudentId,
    selectedStudentId
  );
  const activeGoalBankStudentStage = activeBankTargetStudent ? getEffectiveStudentStage(activeBankTargetStudent) : 'all';
  const currentModalStage = goalBankStageFilter !== null ? goalBankStageFilter : activeGoalBankStudentStage;
  const goalBankEnvironments = getCanonicalEnvironmentsForStage(currentModalStage);

  const filteredArchivedStudents = filterStudentsBySearch(archivedUserStudents, archiveSearch);
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
    typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? __APP_VERSION__ : '2.0.3';

  return (
    <div className="tala-app-root" dir="rtl">
      {/* Real-Time Deployment & Upgrade Warning Banner */}
      <UpgradeBanner
        bannerData={upgradeBanner}
        onSaveCurrentWork={handleQuickSaveFromBanner}
        isDirty={Boolean(unsavedDraftState?.isDirty)}
      />
      {/* Top Stained-Glass Accent Strip */}
      <div className="stained-glass-top-strip" />
      {/* Top Header */}
      <header className="tala-header">
        <div
          className="tala-brand"
          onClick={() => setSelectedStudentId(null)}
          style={{ cursor: 'pointer' }}
          title="חזרה לניהול תלמידים (בחירת או יצירת תלמיד/ה)"
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
          {/* Zone 1: Main Workspaces Segmented Nav Bar */}
          <nav className="header-nav-segment" aria-label="ניווט ראשי">
            <button
              type="button"
              className={`header-nav-btn ${selectedStudentId === null && !showDailyTracker && !showGoalBankOverview ? 'active' : ''}`}
              onClick={() => {
                setSelectedStudentId(null);
                setShowDailyTracker(false);
                setShowGoalBankOverview(false);
              }}
              title="ניהול תלמידים"
            >
              <Users size={15} />
              <span>ניהול תלמידים</span>
            </button>

            <button
              type="button"
              className={`header-nav-btn ${showDailyTracker && selectedStudentId === null && !showGoalBankOverview ? 'active' : ''}`}
              onClick={() => {
                setSelectedStudentId(null);
                setShowDailyTracker(true);
                setShowGoalBankOverview(false);
              }}
              title="מעקב יומי פדגוגי ולוח שנה"
            >
              <ClipboardList size={15} />
              <span>מעקב יומי</span>
            </button>

            <button
              type="button"
              className={`header-nav-btn ${showGoalBankOverview && selectedStudentId === null ? 'active' : ''} ${onboardingTourStep === 5 ? 'tour-highlight-btn' : ''}`}
              onClick={() => {
                setTargetBankStudentId(selectedStudentId || userStudents[0]?.id || '');
                setSelectedStudentId(null);
                setShowDailyTracker(false);
                setShowGoalBankOverview(true);
                if (onboardingTourStep === 5) {
                  setOnboardingTourStep(6);
                }
              }}
              style={{ position: 'relative' }}
              title="מאגר מטרות דינמי"
            >
              {onboardingTourStep === 5 && (
                <div className="onboarding-tour-arrow-box" style={{ top: '42px', right: '0' }}>
                  <span className="tour-arrow-anim">☝️</span>
                  <span>צעד 5: לחצי כאן לפתיחת מאגר המטרות הדינמי</span>
                </div>
              )}
              <TrendingUp size={15} />
              <span>מאגר מטרות</span>
            </button>
          </nav>

          {/* Zone 2: Secondary Utilities (Archive, Help, Trial) */}
          <div className="header-tools-group">
            <button
              type="button"
              className={`header-tool-btn ${
                archivedUserStudents.length === 0 ? 'disabled' : ''
              }`}
              disabled={archivedUserStudents.length === 0}
              onClick={() => {
                if (archivedUserStudents.length === 0) return;
                if (!selectedArchivedStudentId && archivedUserStudents.length > 0) {
                  setSelectedArchivedStudentId(archivedUserStudents[0].id);
                }
                setShowArchiveModal(true);
              }}
              title={
                archivedUserStudents.length === 0
                  ? 'הארכיון ריק – אין תלמידים בארכיון'
                  : 'צפה בתלמידים שהועברו לארכיון'
              }
            >
              <Archive size={15} />
              <span>ארכיון</span>
              <span className="header-badge-count">{archivedUserStudents.length}</span>
            </button>

            <button
              type="button"
              className="header-tool-btn"
              onClick={() => setShowTrialUpgradeModal(true)}
              title="מרכז עזרה, סרטון הדרכה, וואטסאפ ומשוב"
            >
              <MessageCircle size={15} />
              <span>עזרה</span>
              {!currentUser.surveyCompleted && !currentUser.surveyDismissed && currentUser.role !== 'admin' && (
                <span className="header-alert-dot" title="ישנו שאלון משוב פתוח" />
              )}
            </button>

            {currentUser.isTrialUser && (
              <button
                type="button"
                className="header-tool-btn header-trial-btn"
                onClick={() => setShowTrialUpgradeModal(true)}
                title="מידע על תקופת הניסיון והסדרת מנוי שנתי"
              >
                <Sparkles size={15} />
                <span>מנוי שנתי</span>
                {trialRemainingDays !== null && trialRemainingDays <= 2 && (
                  <span className="header-trial-badge">
                    {trialRemainingDays === 0
                      ? 'היום!'
                      : `נותרו ${trialRemainingDays} ימים`}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Zone 3: User Profile & Admin Group */}
          <div className="header-user-group">
            {currentUser.role === 'admin' && (
              <button
                type="button"
                className="header-tool-btn header-admin-btn"
                onClick={() => {
                  if (pendingInquiriesCount > 0) {
                    setAdminModalInitialTab('requests');
                  } else if (unreviewedHealthEventsCount > 0) {
                    setAdminModalInitialTab('health');
                  } else {
                    setAdminModalInitialTab('users');
                  }
                  setShowAdminModal(true);
                }}
                title="ניהול משתמשים והרשאות מערכת"
              >
                <ShieldCheck size={15} />
                <span>ניהול</span>
                <span className="header-badge-count">{allowedUsers.filter((u) => u.active).length}</span>
                {totalAdminAlerts > 0 && (
                  <span className="header-admin-alert-badge">
                    🚨 {totalAdminAlerts}
                  </span>
                )}
              </button>
            )}

            <div
              className="header-user-chip"
              onClick={() => setShowSelfPasswordModal(true)}
              title={
                unreadSharedReports.length > 0
                  ? `יש לך ${unreadSharedReports.length} דו"חות משותפים חדשים – לחץ לצפייה ופתיחה`
                  : 'לחץ לצפייה בהתראות דו"חות משותפים ושינוי סיסמה אישית'
              }
              role="button"
              tabIndex={0}
            >
              <div className="header-user-avatar">
                {effectiveCurrentUser.name ? effectiveCurrentUser.name.trim().charAt(0) : <UserCheck size={13} />}
              </div>
              <div className="header-user-meta">
                <strong className="header-user-name">{effectiveCurrentUser.name}</strong>
                <span className="header-user-role">{effectiveCurrentUser.title || 'משתמש'}</span>
              </div>
              {currentUser.notifyOnSharedReport !== false && unreadSharedReports.length > 0 ? (
                <span className="header-unread-badge">
                  <Bell size={11} />
                  <span>{unreadSharedReports.length}</span>
                </span>
              ) : (
                <KeyRound size={13} className="header-key-icon" />
              )}
            </div>

            <button
              type="button"
              className="header-logout-btn"
              onClick={handleLogout}
              title="התנתק מהמערכת"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Admin Security Lockout Notification Banner Under Site Header */}
      {currentUser.role === 'admin' && lockedOutUsers.length > 0 && (
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
              התראת אבטחה למנהל/ת המערכת: {lockedOutUsers.length} משתמש/ים נחסמו אוטומטית לאחר 5 ניסיונות סיסמה שגויים ({lockedOutUsers
                .map((u) => u.name)
                .join(', ')}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAdminModalInitialTab('requests');
              setShowAdminModal(true);
            }}
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
      <div className={`tala-workspace-layout ${selectedStudent ? 'has-selected-student' : 'no-selected-student'}`}>
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
                    onClick={() => {
                      setSelectedStudentId(st.id);
                      setShowDailyTracker(false);
                    }}
                  >
                    <div className="st-card-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong>{st.name || 'ללא שם'}</strong>
                        <span
                          className={`st-lock-indicator ${isStLocked ? 'locked' : 'unlocked'}`}
                          title={
                            isStLocked
                              ? 'הדו"ח נעול לעריכה (הערכת מחצית/סוף שנה ותצפית מהירה זמינות ויפתחו את הנעילה אוטומטית)'
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
                            onClick={() => {
                              setSelectedStudentId(st.id);
                              setShowDailyTracker(false);
                            }}
                          >
                            <div className="st-card-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{st.name || 'ללא שם'}</strong>
                                <span
                                  className={`st-lock-indicator ${isStLocked ? 'locked' : 'unlocked'}`}
                                  title={
                                    isStLocked
                                      ? 'הדו"ח נעול לעריכה (הערכת מחצית/סוף שנה ותצפית מהירה זמינות ויפתחו את הנעילה אוטומטית)'
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
              {/* Mobile Navigation Header for Mobile Phones */}
              <div className="mobile-student-top-nav">
                <button
                  type="button"
                  className="btn-mobile-back-roster"
                  onClick={() => setSelectedStudentId(null)}
                  title="ניהול תלמידים"
                >
                  <Users size={17} />
                  <span>ניהול תלמידים</span>
                </button>
                <button
                  type="button"
                  className="btn-mobile-back-roster"
                  onClick={handleNavigateBackToStudents}
                  title="חזרה לרשימת התלמידים"
                >
                  <ArrowRight size={18} />
                  <span>רשימת תלמידים</span>
                </button>
                <div className="mobile-student-nav-title">
                  <strong className="mobile-student-name">{selectedStudent.name || 'ללא שם'}</strong>
                  <span className="mobile-student-nav-badge">
                    {selectedStudent.planType?.includes('תח"י') ? 'תח"י' : 'תל"א'}
                  </span>
                </div>
              </div>
              <EcologicalWorkPlanForm
                student={selectedStudent}
                allStudents={userStudents}
                externalRevision={externalGoalsRevision}
                goalBank={goalBank}
                userPreferences={userPreferences}
                privateGoals={userPreferences?.privateGoals || []}
                isAdmin={currentUser.role === 'admin'}
                currentUser={effectiveCurrentUser}
                allowedUsers={allowedUsers}
                onOpenGoalBankManager={() => {
                  if (selectedStudent?.id) setTargetBankStudentId(selectedStudent.id);
                  setSelectedStudentId(null);
                  setShowDailyTracker(false);
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
                onGoHome={() => setSelectedStudentId(null)}
              />
            </ErrorBoundary>
          ) : showDailyTracker ? (
            <ErrorBoundary componentName="DailyPedagogicalTracker">
              <DailyPedagogicalTracker
                students={userStudents}
                currentUser={effectiveCurrentUser}
                onUpdateStudent={(updatedStudent) => {
                  handleSaveStudentPlan(updatedStudent);
                }}
                onSelectStudent={(studentId) => {
                  setSelectedStudentId(studentId);
                  setShowDailyTracker(false);
                  setShowGoalBankOverview(false);
                }}
                onClose={() => setShowDailyTracker(false)}
              />
            </ErrorBoundary>
          ) : showGoalBankOverview ? (
            <ErrorBoundary componentName="GoalBankPage">
              <GoalBankPage
                goalBank={goalBank}
                currentUser={effectiveCurrentUser}
                userStudents={userStudents}
                targetBankStudentId={targetBankStudentId}
                setTargetBankStudentId={setTargetBankStudentId}
                unsavedDraftState={unsavedDraftState}
                onAddGoalToStudent={handleAddBankGoalToStudent}
                onSaveBankGoal={(editingGoal, payload) => {
                  let nextBank;
                  if (editingGoal.mode === 'add') {
                    nextBank = addGoalByAdmin(payload, goalBank);
                  } else {
                    nextBank = updateGoalByAdmin(editingGoal.id, payload, goalBank);
                  }
                  setGoalBank(nextBank);
                  saveGoalBank(nextBank);
                  saveGoalBankToCloud(nextBank).catch(() => {});
                }}
                onDeleteBankGoal={handleDeleteAdminBankGoal}
                onResetAllGoalWeights={handleResetAllGoalWeights}
                onOpenStudentPlan={(studentId) => {
                  setSelectedStudentId(studentId);
                  setShowGoalBankOverview(false);
                  setShowDailyTracker(false);
                }}
                onGoHome={() => {
                  setShowGoalBankOverview(false);
                  setSelectedStudentId(null);
                  setShowDailyTracker(false);
                }}
              />
            </ErrorBoundary>
          ) : (
            <div className="inside-landing-page">
              <div className="inside-landing-hero">
                <div className="inside-landing-header-info">
                  <div className="inside-landing-avatar" title="מרחב ניהול תלמידים">
                    <Users size={22} color="#ffffff" strokeWidth={2.2} />
                  </div>
                  <div className="inside-landing-title-box">
                    <h2>
                      <span>שלום, {effectiveCurrentUser.name} 👋</span>
                      <span className="inside-landing-badge">
                        <Sparkles size={12} />
                        מרחב ניהול תלמידים
                      </span>
                    </h2>
                    <p>
                      כדי להתחיל לעבוד, בחרי האם ליצור תוכנית עבודה אקולוגית לתלמיד/ה חדש/ה או לפתוח תוכנית קיימת מתוך רשימת התלמידים שלך
                    </p>
                  </div>
                </div>
                <div className="inside-landing-header-actions">
                  <button
                    type="button"
                    onClick={() => setShowDailyTracker(true)}
                    className="btn-inside-landing-tracker"
                    title="פתיחת מעקב יומי ויומן פדגוגי"
                  >
                    <Calendar size={14} />
                    <span>מעקב יומי ויומן</span>
                    <ArrowLeft size={13} />
                  </button>
                </div>
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
                          onClick={() => setShowDailyTracker(true)}
                          style={{
                            background: '#ffffff',
                            color: '#2b4c73',
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
                          title="פתיחת מעקב יומי, משימות ולוח שנה פדגוגי"
                        >
                          <Calendar size={15} style={{ color: '#4a88c7' }} />
                          <span>מעקב יומי ויומן</span>
                        </button>
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
                                    ? 'הדו"ח נעול לעריכה (הערכת מחצית/סוף שנה ותצפית מהירה זמינות ויפתחו את הנעילה אוטומטית)'
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
                                  background: st.isLocked ? '#fffbeb' : '#eff6ff',
                                  color: st.isLocked ? '#92400e' : '#1d4ed8',
                                  border: st.isLocked ? '1px solid #fde68a' : '1px solid #bfdbfe',
                                  borderRadius: '9999px',
                                  padding: '1px 7px',
                                  fontWeight: 700
                                }}
                              >
                                {st.isLocked ? 'שותף עמך (קריאה בלבד)' : 'שותף עמך'}
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
        currentUser={effectiveCurrentUser}
        userPreferences={userPreferences}
        onSavePreferences={handleSaveUserPreferences}
        enforcePasswordPolicy={enforcePasswordPolicy}
        onChangeOwnPassword={handleChangeOwnPassword}
        isMandatoryFirstLogin={Boolean(currentUser?.mustChangePassword)}
        unreadSharedReports={unreadSharedReports}
        allowedUsers={allowedUsers}
        onOpenSharedReportNotification={handleOpenSharedReportNotification}
        onToggleNotifySharedReport={handleToggleNotifySharedReport}
        onDismissSharedReportNotification={handleDismissSharedReportNotification}
        onDismissAllSharedReports={handleDismissAllSharedReports}
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
        paidRemainingDays={paidRemainingDays}
        onOpenSurvey={() => {
          setShowTrialUpgradeModal(false);
          setShowFeedbackSurveyModal(true);
        }}
        onOpenIntroVideo={() => {
          setShowTrialUpgradeModal(false);
          setShowIntroVideoModal(true);
        }}
        onOpenChat={() => {
          setShowTrialUpgradeModal(false);
          setIsSupportChatOpen(true);
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
          initialTab={adminModalInitialTab}
          initialActiveChatReqId={adminModalInitialActiveChatReqId}
          initialSupportThreads={adminSupportThreads}
          onClose={() => {
            setShowAdminModal(false);
            setAdminModalInitialActiveChatReqId(null);
          }}
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
          upgradeBanner={upgradeBanner}
          onUpdateUpgradeBanner={handleUpdateUpgradeBanner}
          healthEvents={healthEvents}
          healthReviewedMs={healthReviewedMs}
          onMarkHealthReviewed={handleMarkHealthReviewed}
          onClearHealthEvents={handleClearHealthEvents}
          aiFreeze={aiFreeze}
          onUpdateAiFreeze={handleUpdateAiFreeze}
        />
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
      {/* Live Bi-directional Support Chat Widget for Teachers (Non-intrusive floating launcher) */}
      {currentUser && (
        <TeacherChatWidget
          currentUser={currentUser}
          allowedUsers={allowedUsers}
          emailEngineConfig={emailEngineConfig}
          isOpenControlled={isSupportChatOpen}
          onToggleOpen={setIsSupportChatOpen}
        />
      )}
    </div>
  );
}

