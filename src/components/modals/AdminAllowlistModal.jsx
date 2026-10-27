import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  X,
  Users,
  Building2,
  BarChart3,
  Bell,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Send,
  Check,
  Clock,
  CheckCircle2,
  Ban,
  Search,
  Filter,
  RefreshCw,
  FileSignature,
  Settings,
  MessageSquareHeart,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  Award,
  Activity,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import {
  createPasswordCredentials,
  validatePasswordPolicy,
  DEFAULT_TRIAL_DAYS,
  computeTrialExpirationIso,
  isTrialUserExpired,
  getTrialRemainingDays,
  extendUserTrial,
  upgradeUserToAnnualPaid,
  getUserSubscriptionStatus,
  renameUserGroupInList,
  computeGroupStats,
  getDailyQuotaCount,
  DAILY_AI_QUOTA_LIMIT,
  DAILY_EMAIL_QUOTA_LIMIT
} from '../../allowedUsers';
import { sendUserInvitationEmailInBackground } from '../../emailService';
import { subscribeToUserPresence } from '../../firebaseBackend';
import { DEFAULT_UPGRADE_BANNER_MESSAGE } from '../UpgradeBanner';
import SystemHealthPanel from './SystemHealthPanel';
import AdminAlertsPanel from '../admin/AdminAlertsPanel';
import AdminUsageAndSecurityDashboard from './AdminUsageAndSecurityDashboard';
import { fetchTelemetrySnapshot } from '../../services/telemetryService';
import { aggregateTelemetryData } from '../../domain/telemetry';
import { countUnreviewedHealthEvents } from '../../domain/healthEvents.js';
import {
  subscribeToAllSupportThreads,
  sendChatMessageToCloud,
  markThreadReadInCloud,
  resolveSupportThreadInCloud,
  escalateSupportThreadInCloud
} from '../../services/supportChatService.js';
import { SENDER_ROLES, sanitizeThreadKey, THREAD_STATUS } from '../../domain/supportChat.js';

function PasswordPolicyChecklist({ password }) {
  const { checks } = validatePasswordPolicy(password);
  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '8px 10px',
        fontSize: '11px',
        color: '#475569',
        marginTop: '4px'
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '4px', color: '#1e293b' }}>
        דרישות חוזק סיסמה:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px' }}>
        {checks.map((chk) => (
          <div
            key={chk.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: chk.passed ? '#15803d' : '#94a3b8',
              fontWeight: chk.passed ? 700 : 500
            }}
          >
            <span>{chk.passed ? '✓' : '○'}</span>
            <span>{chk.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const generateRandomTempPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$*';
  const pick = (str) => str[Math.floor(Math.random() * str.length)];
  return `Tala${pick(upper)}${pick(lower)}${pick(digits)}${pick(digits)}${pick(specials)}`;
};

export default function AdminAllowlistModal({
  isOpen,
  onClose,
  initialTab = 'users',
  allowedUsers = [],
  onUpdateAllowedUsers,
  enforcePasswordPolicy,
  onChangeEnforcePasswordPolicy,
  geminiApiKey,
  onChangeGeminiApiKey,
  adminRequests = [],
  initialSupportThreads = [],
  initialActiveChatReqId = null,
  onDismissAdminRequest,
  cloudSyncState,
  emailEngineConfig,
  students = [],
  upgradeBanner,
  onUpdateUpgradeBanner,
  healthEvents = [],
  healthReviewedMs = 0,
  onMarkHealthReviewed,
  onClearHealthEvents,
  aiFreeze = false,
  onUpdateAiFreeze
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'users'); // 'users' | 'groups' | 'analytics' | 'requests' | 'health' | 'settings'
  const [supportThreads, setSupportThreads] = useState(initialSupportThreads || []);
  const [activeChatReqId, setActiveChatReqId] = useState(initialActiveChatReqId);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccessMsg, setReplySuccessMsg] = useState('');
  const [adminPreviewImgUrl, setAdminPreviewImgUrl] = useState(null);

  // Sync initial threads if updated from parent
  useEffect(() => {
    if (Array.isArray(initialSupportThreads) && initialSupportThreads.length > 0) {
      setSupportThreads(initialSupportThreads);
    }
  }, [initialSupportThreads]);

  // Subscribe to all live support threads when admin modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToAllSupportThreads((threads) => {
      setSupportThreads(threads || []);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isOpen]);

  // Unify real-time support chat threads and legacy contact requests
  const unifiedInquiries = useMemo(() => {
    const list = [];
    const seenEmails = new Set();

    // 1. All live support chat threads
    (supportThreads || []).forEach((thread) => {
      const email = (thread.userEmail || '').trim().toLowerCase();
      if (!email && !thread.id) return;
      if (email) seenEmails.add(email);

      const matchedReq = (adminRequests || []).find(
        (r) => (r.email || '').trim().toLowerCase() === email
      );

      const matchedUser = (allowedUsers || []).find(
        (u) => (u.email || '').trim().toLowerCase() === email
      );

      const hasMessages = Array.isArray(thread.messages) && thread.messages.length > 0;
      const latestMessage = hasMessages ? thread.messages[thread.messages.length - 1] : null;

      list.push({
        id: thread.id || `thread_${sanitizeThreadKey(email)}`,
        threadKey: thread.id || sanitizeThreadKey(email),
        name: thread.userName || matchedReq?.name || matchedUser?.name || 'מורה',
        email: thread.userEmail || matchedReq?.email || email,
        topic: thread.topic || matchedReq?.topic || "💬 פנייה מתוך צ'אט התמיכה",
        notes: matchedReq?.notes || latestMessage?.text || thread.lastMessageText || '',
        createdAt: latestMessage?.createdAt || thread.updatedAt || matchedReq?.createdAt || '',
        timestamp: latestMessage?.timestamp || (thread.updatedAt ? new Date(thread.updatedAt).getTime() : 0),
        unreadByAdmin: Boolean(thread.unreadByAdmin),
        messages: thread.messages || [],
        adminRequestId: matchedReq?.id || null,
        status: thread.status || 'active',
        resolutionFeedback: thread.resolutionFeedback || null,
        lastFeedback: thread.lastFeedback || null,
        feedbackNote: thread.feedbackNote || null,
        resolvedAt: thread.resolvedAt || null,
        schoolGroup: matchedUser?.group || '',
        userRole: matchedUser?.role || '',
        isChatThread: true
      });
    });

    // 2. Any login-form contact requests that do not yet have an active supportThread
    (adminRequests || []).forEach((req) => {
      const email = (req.email || '').trim().toLowerCase();
      if (email && seenEmails.has(email)) return;
      if (email) seenEmails.add(email);

      const matchedUser = (allowedUsers || []).find(
        (u) => (u.email || '').trim().toLowerCase() === email
      );

      list.push({
        id: req.id,
        threadKey: sanitizeThreadKey(email),
        name: req.name || matchedUser?.name || 'מורה',
        email: req.email || email,
        topic: req.topic || 'פנייה מדף הכניסה',
        notes: req.notes || '',
        createdAt: req.createdAt || '',
        timestamp: req.createdAt ? new Date(req.createdAt).getTime() || 0 : 0,
        unreadByAdmin: true,
        messages: [],
        adminRequestId: req.id,
        status: 'active',
        resolutionFeedback: null,
        lastFeedback: null,
        feedbackNote: null,
        resolvedAt: null,
        schoolGroup: matchedUser?.group || '',
        userRole: matchedUser?.role || '',
        isChatThread: false
      });
    });

    // Sort: unread first, then latest by timestamp
    return list.sort((a, b) => {
      if (a.unreadByAdmin !== b.unreadByAdmin) {
        return a.unreadByAdmin ? -1 : 1;
      }
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [supportThreads, adminRequests, allowedUsers]);

  const [inquiriesFilter, setInquiriesFilter] = useState('pending'); // 'pending' | 'active' | 'resolved' | 'all'
  const [inquiriesSearch, setInquiriesSearch] = useState('');

  const countPending = useMemo(
    () => unifiedInquiries.filter((inq) => inq.unreadByAdmin || inq.status === 'needs_attention').length,
    [unifiedInquiries]
  );
  const countActive = useMemo(
    () => unifiedInquiries.filter((inq) => inq.status !== 'resolved' && !inq.unreadByAdmin && inq.status !== 'needs_attention').length,
    [unifiedInquiries]
  );
  const countResolved = useMemo(
    () => unifiedInquiries.filter((inq) => inq.status === 'resolved' || inq.resolutionFeedback === 'thumbs_up').length,
    [unifiedInquiries]
  );

  const displayedInquiries = useMemo(() => {
    return unifiedInquiries.filter((inq) => {
      // If a chat thread is explicitly targeted/expanded (e.g. from deep link or user selection), always keep it visible
      const isTargeted =
        activeChatReqId &&
        (inq.id === activeChatReqId ||
          inq.threadKey === activeChatReqId ||
          inq.email?.toLowerCase() === activeChatReqId?.toLowerCase());
      if (isTargeted) return true;

      if (inquiriesFilter === 'pending') {
        const isPending = inq.unreadByAdmin || inq.status === 'needs_attention';
        if (!isPending) return false;
      } else if (inquiriesFilter === 'active') {
        const isActive = inq.status !== 'resolved' && !inq.unreadByAdmin && inq.status !== 'needs_attention';
        if (!isActive) return false;
      } else if (inquiriesFilter === 'resolved') {
        const isResolved = inq.status === 'resolved' || inq.resolutionFeedback === 'thumbs_up';
        if (!isResolved) return false;
      }

      if (inquiriesSearch.trim()) {
        const q = inquiriesSearch.trim().toLowerCase();
        const matchName = (inq.name || '').toLowerCase().includes(q);
        const matchEmail = (inq.email || '').toLowerCase().includes(q);
        const matchTopic = (inq.topic || '').toLowerCase().includes(q);
        const matchNotes = (inq.notes || '').toLowerCase().includes(q);
        const matchGroup = (inq.schoolGroup || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchTopic && !matchNotes && !matchGroup) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedInquiries, inquiriesFilter, inquiriesSearch, activeChatReqId]);

  const alertChannelsSummary = useMemo(() => {
    const admins = (allowedUsers || []).filter((u) => u.role === 'admin' && u.active !== false);
    const hasTelegram = admins.some((a) => a.adminAlerts?.telegram?.enabled && a.adminAlerts?.telegram?.botToken);
    const hasWhatsapp = admins.some((a) => a.adminAlerts?.whatsapp?.enabled && a.adminAlerts?.whatsapp?.apiKey);
    const hasEmail = admins.some((a) => a.adminAlerts?.email?.enabled);
    return { hasTelegram, hasWhatsapp, hasEmail };
  }, [allowedUsers]);

  const unreadInquiriesCount = countPending;

  const handleSendAdminReply = async (inquiry) => {
    const cleanText = adminReplyText.trim();
    if (!cleanText || isSendingReply || !inquiry?.email) return;

    setIsSendingReply(true);
    try {
      const existingThread = supportThreads.find(
        (t) =>
          t.userEmail?.toLowerCase() === inquiry.email?.toLowerCase() ||
          t.id === inquiry.threadKey ||
          t.id === sanitizeThreadKey(inquiry.email)
      );

      await sendChatMessageToCloud({
        existingThread,
        userEmail: inquiry.email,
        userName: inquiry.name,
        topic: inquiry.topic || 'פנייה לתמיכה',
        text: cleanText,
        senderRole: SENDER_ROLES.ADMIN,
        senderName: 'מנהלת המערכת',
        admins: allowedUsers.filter((u) => u.role === 'admin')
      });

      if (inquiry.threadKey) {
        markThreadReadInCloud(inquiry.threadKey, SENDER_ROLES.ADMIN).catch(() => {});
      }

      setAdminReplyText('');
      setReplySuccessMsg(`✓ התגובה נשלחה בהצלחה למורה (${inquiry.name})!`);
      setTimeout(() => setReplySuccessMsg(''), 3500);
    } catch (err) {
      console.warn('Failed to send admin reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDismissInquiry = async (inquiry) => {
    if (inquiry.adminRequestId && onDismissAdminRequest) {
      onDismissAdminRequest(inquiry.adminRequestId);
    }
    if (inquiry.email) {
      await resolveSupportThreadInCloud(inquiry.email, 'admin_resolved').catch(() => {});
    } else if (inquiry.threadKey) {
      await markThreadReadInCloud(inquiry.threadKey, SENDER_ROLES.ADMIN).catch(() => {});
    }
  };

  const handleReopenInquiry = async (inquiry) => {
    if (inquiry.email) {
      await escalateSupportThreadInCloud(inquiry.email, 'נפתח מחדש ע"י מנהלת').catch(() => {});
    }
  };

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'trial_active' | 'trial_expired' | 'disabled'
  const [groupFilter, setGroupFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    title: 'גננת / מורה להוראה מותאמת',
    group: '',
    role: 'teacher',
    accessCode: '',
    isTrialUser: false,
    trialDays: DEFAULT_TRIAL_DAYS
  });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [sendInviteEmailOnCreate, setSendInviteEmailOnCreate] = useState(true);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [sendingInviteForUserId, setSendingInviteForUserId] = useState(null);
  const [inviteStatusBanner, setInviteStatusBanner] = useState('');
  const [addUserError, setAddUserError] = useState('');

  const [editingPasswordUserId, setEditingPasswordUserId] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showEditingPassword, setShowEditingPassword] = useState(false);
  const [rowPasswordError, setRowPasswordError] = useState('');
  const [passwordSavedToastId, setPasswordSavedToastId] = useState(null);

  const [editingDetailsUserId, setEditingDetailsUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    title: '',
    group: '',
    role: 'teacher',
    isTrialUser: false,
    trialDays: DEFAULT_TRIAL_DAYS
  });
  const [editUserError, setEditUserError] = useState('');
  const [detailsSavedToastId, setDetailsSavedToastId] = useState(null);
  const [userPresenceMap, setUserPresenceMap] = useState({});

  // Group bulk rename state
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [newGroupNameInput, setNewGroupNameInput] = useState('');

  // Live Daily Quota Stats
  const dailyAiCount = useMemo(() => getDailyQuotaCount('ai'), []);
  const dailyEmailCount = useMemo(() => getDailyQuotaCount('email'), []);
  const [cloudTelemetry, setCloudTelemetry] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchTelemetrySnapshot().then((snap) => {
      if (snap && (snap.aiLogs?.length || snap.emailLogs?.length)) {
        const agg = aggregateTelemetryData({
          aiLogs: snap.aiLogs,
          emailLogs: snap.emailLogs,
          students,
          settings: { aiFreeze },
          now: new Date()
        });
        setCloudTelemetry(agg);
      }
    }).catch(() => {});
  }, [isOpen, students, aiFreeze]);

  const effectiveAiCount = cloudTelemetry ? cloudTelemetry.aiTodayCount : dailyAiCount;
  const effectiveEmailCount = cloudTelemetry ? cloudTelemetry.emailTodayCount : dailyEmailCount;

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToUserPresence((presenceData) => {
      setUserPresenceMap(presenceData || {});
    });
    return () => unsub?.();
  }, [isOpen]);

  if (!isOpen) return null;

  const lockedOutUsers = (allowedUsers || []).filter((u) => Boolean(u.lockedOut));
  const existingGroups = Array.from(
    new Set(
      (allowedUsers || [])
        .map((u) => (u.group || '').trim())
        .filter(Boolean)
    )
  ).sort();

  // Compute student counts map per teacher
  const studentCountByEmail = new Map();
  for (const st of students) {
    const owner = (st.ownerEmail || '').trim().toLowerCase();
    studentCountByEmail.set(owner, (studentCountByEmail.get(owner) || 0) + 1);
  }

  // Group stats calculation
  const groupStats = computeGroupStats(allowedUsers, students);

  // Filtered users list
  const filteredUsers = (allowedUsers || []).filter((u) => {
    const status = getUserSubscriptionStatus(u);
    if (statusFilter === 'paid' && status !== 'paid_active') return false;
    if (statusFilter === 'trial_active' && status !== 'trial_active') return false;
    if (statusFilter === 'trial_expired' && status !== 'trial_expired') return false;
    if (statusFilter === 'disabled' && status !== 'disabled' && status !== 'locked_out') return false;

    if (groupFilter !== 'all' && (u.group || '').trim() !== groupFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = (u.name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchGroup = (u.group || '').toLowerCase().includes(q);
      const matchTitle = (u.title || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchGroup && !matchTitle) return false;
    }

    return true;
  });

  const getUserPresenceBadge = (userEmail) => {
    if (!userEmail) return null;
    const userKey = userEmail.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const presenceData = userPresenceMap[userKey];
    const lastActiveIso = presenceData?.lastActiveIso;

    if (!lastActiveIso) {
      return (
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '999px',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title="מנותק/ת"
        >
          <span>🔴</span>
          <span>לא מחובר/ת</span>
        </span>
      );
    }

    const diffMs = Date.now() - new Date(lastActiveIso).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 5) {
      return (
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '999px',
            background: '#dcfce7',
            color: '#15803d',
            border: '1px solid #86efac',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title={`פעיל/ה כעת (${diffMinutes === 0 ? 'ממש עכשיו' : `לפני ${diffMinutes} דק'`})`}
        >
          <span>🟢</span>
          <span>מחובר/ת</span>
        </span>
      );
    }

    if (diffMinutes <= 15) {
      return (
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '999px',
            background: '#fef9c3',
            color: '#a16207',
            border: '1px solid #fef08a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title={`במנוחה (${diffMinutes} דקות)`}
        >
          <span>🟡</span>
          <span>במנוחה</span>
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: '10.5px',
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: '999px',
          background: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px'
        }}
        title={`פעילות אחרונה לפני ${diffMinutes} דקות`}
      >
        <span>🔴</span>
        <span>לא מחובר/ת</span>
      </span>
    );
  };

  // Quick Action Handlers
  const handleExtendTrialDays = (userObj, daysToAdd) => {
    const updatedUser = extendUserTrial(userObj, daysToAdd);
    onUpdateAllowedUsers(
      allowedUsers.map((u) => {
        const isMatch = (u.id && userObj.id && u.id === userObj.id) ||
          ((u.email || '').toLowerCase() === (userObj.email || '').toLowerCase());
        return isMatch ? updatedUser : u;
      })
    );
    setInviteStatusBanner(`✅ תקופת הניסיון של ${userObj.name} הוארכה ב-${daysToAdd} ימים בהצלחה!`);
    setTimeout(() => setInviteStatusBanner(''), 4000);
  };

  const handleUpgradeToPaid = (userObj) => {
    const updatedUser = upgradeUserToAnnualPaid(userObj);
    onUpdateAllowedUsers(
      allowedUsers.map((u) => {
        const isMatch = (u.id && userObj.id && u.id === userObj.id) ||
          ((u.email || '').toLowerCase() === (userObj.email || '').toLowerCase());
        return isMatch ? updatedUser : u;
      })
    );
    setInviteStatusBanner(`🎉 ${userObj.name} שודרג/ה בהצלחה למנוי שנתי פעיל (365 ימים)!`);
    setTimeout(() => setInviteStatusBanner(''), 4000);
  };

  const handleQuickResetPasswordAndEmail = async (userObj) => {
    const freshTempPassword = generateRandomTempPassword();
    const creds = createPasswordCredentials(freshTempPassword);

    onUpdateAllowedUsers(
      allowedUsers.map((u) => {
        if (u.id !== userObj.id) return u;
        const { accessCode: _removed, ...rest } = u;
        return {
          ...rest,
          ...creds,
          mustChangePassword: true,
          active: true,
          lockedOut: false,
          failedLoginAttempts: 0
        };
      })
    );

    setSendingInviteForUserId(userObj.id);
    try {
      await sendUserInvitationEmailInBackground({
        config: emailEngineConfig,
        userName: userObj.name,
        userEmail: userObj.email,
        userTitle: userObj.title,
        tempPassword: freshTempPassword,
        siteUrl: 'https://zivitreshef.github.io/TALA/'
      });
      setPasswordSavedToastId(userObj.id);
      setInviteStatusBanner(
        `📨 סיסמה זמנית חדשה (${freshTempPassword}) הונפקה ונשלחה במייל אל ${userObj.name} (${userObj.email})!`
      );
      setTimeout(() => setPasswordSavedToastId(null), 3500);
    } catch (err) {
      console.error('Failed to send reset email:', err);
      alert(`הסיסמה אופסה ל-"${freshTempPassword}", אך חלה שגיאה בשליחת המייל: ${err.message}`);
    } finally {
      setSendingInviteForUserId(null);
    }
  };

  const handleSaveBulkGroupRename = () => {
    if (!renamingGroup || !newGroupNameInput.trim()) return;
    const nextList = renameUserGroupInList(allowedUsers, renamingGroup, newGroupNameInput.trim());
    onUpdateAllowedUsers(nextList);
    setInviteStatusBanner(
      `✅ שם הצוות/מתי"א "${renamingGroup}" עודכן בהצלחה ל-"${newGroupNameInput.trim()}" בכל המשתמשים!`
    );
    setRenamingGroup(null);
    setNewGroupNameInput('');
    setTimeout(() => setInviteStatusBanner(''), 4000);
  };

  const handleUnlockUser = (userId) => {
    onUpdateAllowedUsers(
      allowedUsers.map((u) =>
        u.id === userId
          ? {
              ...u,
              active: true,
              lockedOut: false,
              failedLoginAttempts: 0
            }
          : u
      )
    );
  };

  const handleToggleActive = (userObj) => {
    if (userObj.email?.toLowerCase() === 'zivit.reshef@gmail.com' && userObj.active && !userObj.lockedOut) {
      alert('לא ניתן להשבית את מנהל/ת המערכת הראשי/ת.');
      return;
    }
    onUpdateAllowedUsers(
      allowedUsers.map((u) => {
        if (u.id !== userObj.id) return u;
        const nextActive = !u.active;
        return {
          ...u,
          active: nextActive,
          lockedOut: nextActive ? false : u.lockedOut,
          failedLoginAttempts: nextActive ? 0 : u.failedLoginAttempts
        };
      })
    );
  };

  const handleDeleteUser = (id, emailStr) => {
    if (emailStr === 'zivit.reshef@gmail.com') {
      alert('לא ניתן למחוק את מנהל/ת המערכת הראשי/ת.');
      return;
    }
    if (window.confirm('האם להסיר משתמש זה לצמיתות מרשימת המורשים? (ניתן גם להשבית זמנית במקום למחוק)')) {
      onUpdateAllowedUsers(allowedUsers.filter((u) => u.id !== id));
    }
  };

  const handleStartEditUserDetails = (userObj) => {
    setEditUserError('');
    setEditingDetailsUserId(userObj.id);
    setEditUserForm({
      name: userObj.name || '',
      email: userObj.email || '',
      title: userObj.title || 'גננת / מורה להוראה מותאמת',
      group: userObj.group || '',
      role: userObj.role || 'teacher',
      isTrialUser: Boolean(userObj.isTrialUser),
      trialDays: userObj.trialDays || DEFAULT_TRIAL_DAYS
    });
  };

  const handleSaveEditUserDetails = (userObj) => {
    setEditUserError('');
    const isMainAdmin = userObj.email?.toLowerCase() === 'zivit.reshef@gmail.com';
    const cleanName = (editUserForm.name || '').trim();
    const cleanEmail = isMainAdmin
      ? 'zivit.reshef@gmail.com'
      : (editUserForm.email || '').trim().toLowerCase();
    const cleanTitle = (editUserForm.title || '').trim() || 'צוות חינוכי';
    const cleanGroup = (editUserForm.group || '').trim();
    const nextRole = isMainAdmin ? 'admin' : editUserForm.role === 'admin' ? 'admin' : 'teacher';

    if (!cleanName || !cleanEmail) {
      setEditUserError('נא להזין שם מלא וכתובת אימייל תקינה.');
      return;
    }

    const emailCollision = (allowedUsers || []).some(
      (other) => other.id !== userObj.id && (other.email || '').trim().toLowerCase() === cleanEmail
    );
    if (emailCollision) {
      setEditUserError('כתובת האימייל הזו כבר משויכת למשתמש אחר במערכת.');
      return;
    }

    const isTrial = isMainAdmin ? false : Boolean(editUserForm.isTrialUser);
    const parsedTrialDays = Math.max(
      1,
      Math.min(365, parseInt(editUserForm.trialDays, 10) || DEFAULT_TRIAL_DAYS)
    );

    let updatedUserRef = null;
    const updatedList = (allowedUsers || []).map((u) => {
      if (u.id !== userObj.id) return u;
      const trialDaysChanged = parsedTrialDays !== (u.trialDays || DEFAULT_TRIAL_DAYS);
      const nextUser = {
        ...u,
        name: cleanName,
        email: cleanEmail,
        title: cleanTitle,
        group: cleanGroup,
        role: nextRole,
        isTrialUser: isTrial,
        trialDays: isTrial ? parsedTrialDays : null,
        trialStartedAt: isTrial
          ? trialDaysChanged || !u.trialStartedAt
            ? new Date().toISOString()
            : u.trialStartedAt
          : null,
        trialExpiresAt: isTrial
          ? trialDaysChanged || !u.trialExpiresAt
            ? computeTrialExpirationIso(parsedTrialDays)
            : u.trialExpiresAt
          : null,
        mustSignNda: isTrial ? !u.ndaSigned : false
      };
      updatedUserRef = nextUser;
      return nextUser;
    });

    onUpdateAllowedUsers(updatedList, {
      oldEmail: (userObj.email || '').trim().toLowerCase(),
      newEmail: cleanEmail,
      updatedUser: updatedUserRef
    });

    setEditingDetailsUserId(null);
    setDetailsSavedToastId(userObj.id);
    setInviteStatusBanner(`✅ פרטי המורה "${cleanName}" עודכנו בהצלחה!`);
    setTimeout(() => setDetailsSavedToastId(null), 3000);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserError('');
    setInviteStatusBanner('');
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.accessCode.trim()) return;

    const exists = allowedUsers.some(
      (u) => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase()
    );
    if (exists) {
      setAddUserError('כתובת אימייל זו כבר קיימת ברשימת המורשים.');
      return;
    }

    if (enforcePasswordPolicy) {
      const validation = validatePasswordPolicy(newUser.accessCode.trim());
      if (!validation.valid) {
        setAddUserError(validation.errorMessage);
        return;
      }
    }

    const tempPassword = newUser.accessCode.trim();
    const creds = createPasswordCredentials(tempPassword);
    const isTrial = Boolean(newUser.isTrialUser);
    const normalizedTrialDays = Math.max(1, Math.min(365, parseInt(newUser.trialDays, 10) || DEFAULT_TRIAL_DAYS));
    const created = {
      id: 'u_' + Date.now(),
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      title: newUser.title.trim() || 'צוות חינוכי',
      group: (newUser.group || '').trim(),
      role: newUser.role,
      ...creds,
      active: true,
      failedLoginAttempts: 0,
      lockedOut: false,
      mustChangePassword: true,
      isTrialUser: isTrial,
      trialDays: isTrial ? normalizedTrialDays : null,
      trialStartedAt: isTrial ? new Date().toISOString() : null,
      trialExpiresAt: isTrial ? computeTrialExpirationIso(normalizedTrialDays) : null,
      mustSignNda: isTrial ? true : false,
      ndaSigned: false
    };

    onUpdateAllowedUsers([...allowedUsers, created]);
    setNewUser({
      name: '',
      email: '',
      title: 'גננת / מורה להוראה מותאמת',
      group: newUser.group || '',
      role: 'teacher',
      accessCode: '',
      isTrialUser: false,
      trialDays: DEFAULT_TRIAL_DAYS
    });
    setShowNewUserPassword(false);
    setShowAddUserForm(false);

    if (sendInviteEmailOnCreate) {
      setIsSendingInvite(true);
      try {
        await sendUserInvitationEmailInBackground({
          config: emailEngineConfig,
          userName: created.name,
          userEmail: created.email,
          userTitle: created.title,
          tempPassword,
          siteUrl: 'https://zivitreshef.github.io/TALA/'
        });
        setInviteStatusBanner(
          `✅ המשתמש/ת "${created.name}" נוסף/ה בהצלחה ונשלח מייל הזמנה עם סיסמה זמנית!`
        );
      } catch (err) {
        console.error('Failed to send onboarding invite email:', err);
        setAddUserError(`המשתמש נוסף למערכת, אך שליחת מייל ההזמנה נכשלה: ${err.message || ''}`);
      } finally {
        setIsSendingInvite(false);
      }
    }
  };

  const unreviewedHealthEventsCount = countUnreviewedHealthEvents(healthEvents, healthReviewedMs);
  const userAlertsCount = lockedOutUsers.length + unreadInquiriesCount;

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl" style={{ zIndex: 2500, padding: '16px' }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1080px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'none',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                ניהול מורשים ובקרת מערכת TALA (Admin Control Center)
              </h3>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>
                ניהול מורים, מנויים, צוותים ומתי"אות, מדדי פעילות והגדרות אבטחה
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Cloud Sync Status Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 600
              }}
            >
              <span>{cloudSyncState?.connected ? '☁️ ענן מחובר' : '💾 מקומי'}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 16px',
            gap: '8px',
            overflowX: 'auto',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'users' ? 800 : 600,
              color: activeTab === 'users' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'users' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <Users size={16} />
            <span>משתמשים ומנויים ({allowedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'groups' ? 800 : 600,
              color: activeTab === 'groups' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'groups' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <Building2 size={16} />
            <span>צוותים ומתי"אות ({groupStats.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'analytics' ? 800 : 600,
              color: activeTab === 'analytics' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'analytics' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <BarChart3 size={16} />
            <span>עלויות, שימוש ואבטחה</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'requests' ? 800 : 600,
              color: activeTab === 'requests' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'requests' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              position: 'relative'
            }}
          >
            <Bell size={16} />
            <span>פניות והתראות</span>
            {userAlertsCount > 0 && (
              <span
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  marginRight: '2px'
                }}
              >
                {userAlertsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'health' ? 800 : 600,
              color: activeTab === 'health' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'health' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              position: 'relative'
            }}
          >
            <Activity size={16} />
            <span>בריאות המערכת</span>
            {unreviewedHealthEventsCount > 0 && (
              <span
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  marginRight: '2px'
                }}
              >
                {unreviewedHealthEventsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '13.5px',
              fontWeight: activeTab === 'settings' ? 800 : 600,
              color: activeTab === 'settings' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'settings' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <Settings size={16} />
            <span>הגדרות API ואבטחה</span>
          </button>
        </div>

        {/* Global Banner Toast */}
        {inviteStatusBanner && (
          <div
            style={{
              background: '#ecfdf5',
              borderBottom: '1px solid #a7f3d0',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <span>{inviteStatusBanner}</span>
            <button
              type="button"
              onClick={() => setInviteStatusBanner('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* TAB 1: USERS & LICENSES */}
          {activeTab === 'users' && (
            <>
              {/* Filter and Search Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} style={{ position: 'absolute', right: '10px', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="חיפוש מורה לפי שם, אימייל או תפקיד..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: '6px 30px 6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        width: '230px'
                      }}
                    />
                  </div>

                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      background: '#ffffff',
                      color: '#1e293b'
                    }}
                  >
                    <option value="all">כל המתי"אות והצוותים</option>
                    {existingGroups.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>

                  {/* Status Chips */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { id: 'all', label: 'הכל' },
                      { id: 'paid', label: 'מנוי משלם' },
                      { id: 'trial_active', label: 'ניסיון פעיל' },
                      { id: 'trial_expired', label: 'ניסיון שפג' },
                      { id: 'disabled', label: 'מושבת/חסום' }
                    ].map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setStatusFilter(chip.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '11.5px',
                          fontWeight: statusFilter === chip.id ? 700 : 500,
                          border: statusFilter === chip.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                          background: statusFilter === chip.id ? '#eff6ff' : '#ffffff',
                          color: statusFilter === chip.id ? '#1d4ed8' : '#64748b',
                          cursor: 'pointer'
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserForm((prev) => !prev)}
                  className="btn-primary-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>{showAddUserForm ? 'סגור טופס הוספה' : 'הוסף מורה חדש/ה'}</span>
                </button>
              </div>

              {/* Collapsible Add User Form */}
              {showAddUserForm && (
                <form
                  onSubmit={handleAddUser}
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <strong style={{ fontSize: '13.5px', color: '#166534' }}>
                    ➕ הוספת משתמש/ת חדש/ה לרשימת המורשים:
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="שם מלא *"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="אימייל (teacher@gmail.com) *"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                    <input
                      type="text"
                      placeholder="תפקיד (גננת שילוב / מורת מתי״א)"
                      value={newUser.title}
                      onChange={(e) => setNewUser({ ...newUser, title: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                    <input
                      type="text"
                      list="admin-groups-datalist"
                      placeholder="צוות / מתי״א (למשל: מתי״א מרכז)"
                      value={newUser.group}
                      onChange={(e) => setNewUser({ ...newUser, group: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type={showNewUserPassword ? 'text' : 'password'}
                        placeholder="סיסמה זמנית *"
                        value={newUser.accessCode}
                        onChange={(e) => setNewUser({ ...newUser, accessCode: e.target.value })}
                        required
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', width: '150px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        {showNewUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pwd = generateRandomTempPassword();
                          setNewUser({ ...newUser, accessCode: pwd });
                          setShowNewUserPassword(true);
                        }}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        צור סיסמה אקראית
                      </button>
                    </div>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newUser.isTrialUser}
                        onChange={(e) => setNewUser({ ...newUser, isTrialUser: e.target.checked })}
                      />
                      <span>משתמש ניסיון (Trial + NDA)</span>
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={sendInviteEmailOnCreate}
                        onChange={(e) => setSendInviteEmailOnCreate(e.target.checked)}
                      />
                      <span>שלח מייל הזמנה והדרכה מעוצב</span>
                    </label>

                    <button type="submit" className="btn-primary-sm" disabled={isSendingInvite} style={{ marginRight: 'auto' }}>
                      {isSendingInvite ? 'שולח הזמנה...' : 'הוסף משתמש/ת'}
                    </button>
                  </div>
                  {addUserError && <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 700 }}>{addUserError}</span>}
                </form>
              )}

              {/* Users Directory Table */}
              <div className="allowed-users-table-wrap">
                <table className="allowed-users-table">
                  <thead>
                    <tr>
                      <th>שם ומזהה</th>
                      <th>אימייל</th>
                      <th>צוות / מתי"א</th>
                      <th>סטטוס ומנוי</th>
                      <th>פעילות (Capacity)</th>
                      <th>סיסמה</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isMainAdmin = u.email?.toLowerCase() === 'zivit.reshef@gmail.com';
                      const userStatus = getUserSubscriptionStatus(u);
                      const remainingDays = getTrialRemainingDays(u);
                      const isEditingThisUser = editingDetailsUserId === u.id;
                      const studentCount = studentCountByEmail.get((u.email || '').toLowerCase()) || 0;
                      const aiCalls = Number(u.aiUsageCount) || 0;

                      return (
                        <tr
                          key={u.id}
                          style={{
                            background: isEditingThisUser ? '#f0f7ff' : undefined,
                            opacity: !u.active || userStatus === 'trial_expired' ? 0.75 : 1
                          }}
                        >
                          {/* Name & Badges */}
                          <td>
                            {isEditingThisUser ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <input
                                  type="text"
                                  value={editUserForm.name}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #2563eb', fontSize: '12px', fontWeight: 700 }}
                                />
                                {!isMainAdmin && (
                                  <select
                                    value={editUserForm.role}
                                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                                    style={{ padding: '3px 6px', borderRadius: '6px', fontSize: '11px' }}
                                  >
                                    <option value="teacher">מורה / גננת</option>
                                    <option value="admin">מנהל מערכת</option>
                                  </select>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                                  <strong>{u.name}</strong>
                                  {u.role === 'admin' && <span className="badge-admin">Admin</span>}
                                  {getUserPresenceBadge(u.email)}
                                  {detailsSavedToastId === u.id && (
                                    <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>✓ נשמר</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  {u.title || 'צוות חינוכי'}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Email */}
                          <td dir="ltr" style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                            {isEditingThisUser && !isMainAdmin ? (
                              <input
                                type="email"
                                dir="ltr"
                                value={editUserForm.email}
                                onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #2563eb', fontSize: '12px' }}
                              />
                            ) : (
                              u.email
                            )}
                          </td>

                          {/* Group / Matya */}
                          <td>
                            {isEditingThisUser ? (
                              <input
                                type="text"
                                list="admin-groups-datalist"
                                value={editUserForm.group}
                                onChange={(e) => setEditUserForm({ ...editUserForm, group: e.target.value })}
                                placeholder="ללא שיוך..."
                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #2563eb', fontSize: '12px' }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: '#1e3a5f', fontSize: '12px' }}>
                                {u.group || '—'}
                              </span>
                            )}
                          </td>

                          {/* Subscription Status & Quick Extension */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                {(userStatus === 'admin' || u.role === 'admin') && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a8a', background: '#dbeafe', padding: '1px 7px', borderRadius: '999px' }}>
                                    מנהל מערכת (גישה מלאה)
                                  </span>
                                )}
                                {userStatus === 'paid_active' && u.role !== 'admin' && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '1px 7px', borderRadius: '999px' }}>
                                    ✓ מנוי שנתי פעיל
                                    {u.paidExpiresAt && (
                                      <span style={{ fontSize: '10px', opacity: 0.9, marginRight: '4px' }}>
                                        (עד {new Date(u.paidExpiresAt).toLocaleDateString('he-IL')})
                                      </span>
                                    )}
                                  </span>
                                )}
                                {userStatus === 'trial_active' && u.role !== 'admin' && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#5b21b6', background: '#ede9fe', padding: '1px 7px', borderRadius: '999px' }}>
                                    ⏳ ניסיון ({remainingDays} ימים)
                                  </span>
                                )}
                                {userStatus === 'trial_expired' && u.role !== 'admin' && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '1px 7px', borderRadius: '999px' }}>
                                    ⏰ פג תוקף הניסיון
                                  </span>
                                )}
                                {userStatus === 'paid_expired' && u.role !== 'admin' && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '1px 7px', borderRadius: '999px' }}>
                                    ⏰ פג תוקף המנוי
                                  </span>
                                )}
                              </div>

                              {/* Quick Action: Extend / Upgrade (Only for non-admin users) */}
                              {!isMainAdmin && u.role !== 'admin' && userStatus !== 'admin' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                                  {u.isTrialUser ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleExtendTrialDays(u, 7)}
                                        className="btn-secondary-sm"
                                        style={{ fontSize: '10px', padding: '2px 5px' }}
                                        title="הארך את תקופת הניסיון ב-7 ימים"
                                      >
                                        +7 ימים
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleExtendTrialDays(u, 14)}
                                        className="btn-secondary-sm"
                                        style={{ fontSize: '10px', padding: '2px 5px' }}
                                        title="הארך את תקופת הניסיון ב-14 ימים"
                                      >
                                        +14 ימים
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpgradeToPaid(u)}
                                        className="btn-secondary-sm"
                                        style={{
                                          fontSize: '10px',
                                          padding: '2px 6px',
                                          background: '#f0fdf4',
                                          color: '#15803d',
                                          borderColor: '#86efac',
                                          fontWeight: 700
                                        }}
                                        title="המר למנוי שנתי מלא (365 ימים)"
                                      >
                                        שדרג למנוי
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleUpgradeToPaid(u)}
                                      className="btn-secondary-sm"
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        background: '#f8fafc',
                                        color: '#334155',
                                        borderColor: '#cbd5e1'
                                      }}
                                      title="הארך את המנוי ב-365 ימים נוספים"
                                    >
                                      הארך בשנה (+365)
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Capacity Metrics */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11.5px' }}>
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                🎒 {studentCount} תלמידים
                              </span>
                              <span style={{ color: '#6d28d9', fontWeight: 600 }}>
                                🤖 {aiCalls} פניות AI
                              </span>
                            </div>
                          </td>

                          {/* Password Management */}
                          <td>
                            {editingPasswordUserId === u.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type={showEditingPassword ? 'text' : 'password'}
                                    value={newPasswordValue}
                                    onChange={(e) => setNewPasswordValue(e.target.value)}
                                    placeholder="סיסמה חדשה..."
                                    style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #2563eb', fontSize: '11.5px', width: '95px' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!newPasswordValue.trim()) return;
                                      const creds = createPasswordCredentials(newPasswordValue.trim());
                                      onUpdateAllowedUsers(
                                        allowedUsers.map((item) =>
                                          item.id === u.id
                                            ? { ...item, ...creds, mustChangePassword: true, active: true, lockedOut: false }
                                            : item
                                        )
                                      );
                                      setEditingPasswordUserId(null);
                                      setPasswordSavedToastId(u.id);
                                    }}
                                    className="btn-primary-sm"
                                    style={{ padding: '3px 6px' }}
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPasswordUserId(null)}
                                    className="btn-secondary-sm"
                                    style={{ padding: '3px 6px' }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleQuickResetPasswordAndEmail(u)}
                                  disabled={sendingInviteForUserId === u.id}
                                  className="btn-secondary-sm"
                                  style={{
                                    fontSize: '10.5px',
                                    padding: '3px 6px',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    borderColor: '#bfdbfe',
                                    fontWeight: 700
                                  }}
                                  title="מייצר סיסמה זמנית אקראית ושולח אותה במייל למורה"
                                >
                                  <Send size={11} />
                                  <span>{sendingInviteForUserId === u.id ? 'שולח...' : 'אפס ושלח במייל'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPasswordUserId(u.id);
                                    setNewPasswordValue('');
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '10px', cursor: 'pointer', textAlign: 'right' }}
                                >
                                  ערוך ידנית...
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Row Actions */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              {isEditingThisUser ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditUserDetails(u)}
                                    className="btn-primary-sm"
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                  >
                                    <Check size={12} />
                                    <span>שמור</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDetailsUserId(null)}
                                    className="btn-secondary-sm"
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                  >
                                    <X size={12} />
                                    <span>ביטול</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditUserDetails(u)}
                                    className="btn-secondary-sm"
                                    style={{ padding: '3px 7px', fontSize: '11px' }}
                                    title="ערוך פרטי מורה"
                                  >
                                    <Edit2 size={12} />
                                  </button>

                                  {(!isMainAdmin || u.lockedOut) && (
                                    <button
                                      type="button"
                                      onClick={() => (u.lockedOut ? handleUnlockUser(u.id) : handleToggleActive(u))}
                                      className="btn-secondary-sm"
                                      style={{
                                        padding: '3px 7px',
                                        fontSize: '11px',
                                        background: u.lockedOut ? '#ecfdf5' : u.active ? '#fff7ed' : '#ecfdf5',
                                        color: u.lockedOut ? '#047857' : u.active ? '#c2410c' : '#047857'
                                      }}
                                      title={u.lockedOut ? 'שחרר חסימה' : u.active ? 'השבת משתמש/ת' : 'הפעל מחדש'}
                                    >
                                      {u.lockedOut ? <Unlock size={12} /> : u.active ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                                    </button>
                                  )}

                                  {!isMainAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.id, u.email)}
                                      className="btn-danger-icon"
                                      style={{ padding: '4px' }}
                                      title="מחק לצמיתות"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 2: GROUPS & MATYA HUB */}
          {activeTab === 'groups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '14px', color: '#1e3a5f' }}>
                    🏫 ניהול מרוכז של מתי"אות, צוותים ובתי ספר
                  </strong>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    צפייה בנפח הפעילות של כל מתי"א, ואפשרות לשינוי שם גורף לכל המורות המשויכות בלחיצת כפתור אחת.
                  </div>
                </div>
              </div>

              {/* Group Rename Dialog */}
              {renamingGroup && (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1.5px solid #93c5fd',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <strong style={{ fontSize: '13px', color: '#1d4ed8' }}>
                    שינוי שם המתי"א "{renamingGroup}" לכל המורות המשויכות:
                  </strong>
                  <input
                    type="text"
                    value={newGroupNameInput}
                    onChange={(e) => setNewGroupNameInput(e.target.value)}
                    placeholder="שם חדש ומדויק..."
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #60a5fa', fontSize: '13px', width: '220px' }}
                  />
                  <button type="button" onClick={handleSaveBulkGroupRename} className="btn-primary-sm">
                    שמור שינוי גורף
                  </button>
                  <button type="button" onClick={() => setRenamingGroup(null)} className="btn-secondary-sm">
                    ביטול
                  </button>
                </div>
              )}

              {/* Groups Table */}
              <div className="allowed-users-table-wrap">
                <table className="allowed-users-table">
                  <thead>
                    <tr>
                      <th>שם המתי"א / צוות</th>
                      <th>מספר מורות</th>
                      <th>סה"כ תלמידים</th>
                      <th title="סה״כ פעולות AI של כלל המורות במתי״א זו מאז תחילת המעקב">שימושי AI (מצטבר)</th>
                      <th>מנויים משלמים</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.map((grp) => (
                      <tr key={grp.name}>
                        <td>
                          <strong>{grp.name}</strong>
                        </td>
                        <td>{grp.teachersCount} מורות</td>
                        <td>🎒 {grp.studentsCount} תלמידים</td>
                        <td>🤖 {grp.aiUsageTotal} פעולות</td>
                        <td>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803d' }}>
                            {grp.payingCount} משלמים / {grp.trialCount} ניסיון
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingGroup(grp.name);
                                setNewGroupNameInput(grp.name);
                              }}
                              className="btn-secondary-sm"
                              style={{ padding: '3px 8px', fontSize: '11.5px' }}
                              title="שנה שם לכל המורות המשויכות למתי״א זו"
                            >
                              <Edit2 size={12} />
                              <span>שנה שם גורף</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGroupFilter(grp.name);
                                setActiveTab('users');
                              }}
                              className="btn-secondary-sm"
                              style={{ padding: '3px 8px', fontSize: '11.5px' }}
                            >
                              הצג מורות
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CAPACITY & ANALYTICS */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <AdminUsageAndSecurityDashboard
                students={students}
                settings={{ aiFreeze }}
                onSettingsChange={(s) => onUpdateAiFreeze && onUpdateAiFreeze(s.aiFreeze)}
                onTelemetryUpdated={(snap) => {
                  const agg = aggregateTelemetryData({
                    aiLogs: snap.aiLogs,
                    emailLogs: snap.emailLogs,
                    students,
                    settings: { aiFreeze },
                    now: new Date()
                  });
                  setCloudTelemetry(agg);
                }}
              />
              {/* KPI Cards Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '1px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e40af' }}>🎒 סה"כ תלמידים במערכת</span>
                  <strong style={{ fontSize: '26px', color: '#1e3a8a' }}>{students.length}</strong>
                  <span style={{ fontSize: '11.5px', color: '#3b82f6' }}>בכלל המתי"אות והמסגרות</span>
                </div>

                <div
                  style={{
                    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                    border: '1px solid #ddd6fe',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#5b21b6' }}>🤖 סה"כ שאילתות AI (מצטבר)</span>
                  <strong style={{ fontSize: '26px', color: '#4c1d95' }}>
                    {allowedUsers.reduce((sum, u) => sum + (Number(u.aiUsageCount) || 0), 0)}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#7c3aed' }}>
                    היום: <strong>{effectiveAiCount}</strong> מתוך {DAILY_AI_QUOTA_LIMIT} | ניסוח יעדים
                  </span>
                </div>

                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#166534' }}>👥 סה"כ מורות וגננות</span>
                  <strong style={{ fontSize: '26px', color: '#14532d' }}>{allowedUsers.length}</strong>
                  <span style={{ fontSize: '11.5px', color: '#16a34a' }}>
                    {allowedUsers.filter((u) => !u.isTrialUser).length} משלמים | {allowedUsers.filter((u) => u.isTrialUser).length} ניסיון
                  </span>
                </div>

                <div
                  style={{
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1px solid #fde68a',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#92400e' }}>✍️ חתימות NDA ומשוב</span>
                  <strong style={{ fontSize: '26px', color: '#78350f' }}>
                    {allowedUsers.filter((u) => u.ndaSigned).length} / {allowedUsers.filter((u) => u.surveyCompleted).length}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#b45309' }}>חתימות NDA / משובים שנשלחו</span>
                </div>
              </div>

              {/* Capacity Ranking Table */}
              <div>
                <strong style={{ fontSize: '14px', color: '#1e3a5f', display: 'block', marginBottom: '8px' }}>
                  📊 דירוג פעילות וקיבולת לפי מורה (Top Capacity Users):
                </strong>
                <div className="allowed-users-table-wrap">
                  <table className="allowed-users-table">
                    <thead>
                      <tr>
                        <th>שם המורה</th>
                        <th>צוות / מתי"א</th>
                        <th>תלמידים שנוצרו</th>
                        <th title="סה״כ שימושי AI של המורה מאז תחילת המעקב">שימושי AI (מצטבר)</th>
                        <th>סטטוס מנוי</th>
                        <th>שימוש אחרון ב-AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...allowedUsers]
                        .sort((a, b) => {
                          const aCount = studentCountByEmail.get((a.email || '').toLowerCase()) || 0;
                          const bCount = studentCountByEmail.get((b.email || '').toLowerCase()) || 0;
                          return bCount - aCount;
                        })
                        .map((u) => {
                          const count = studentCountByEmail.get((u.email || '').toLowerCase()) || 0;
                          return (
                            <tr key={u.id}>
                              <td><strong>{u.name}</strong></td>
                              <td>{u.group || '—'}</td>
                              <td>🎒 <strong>{count} תלמידים</strong></td>
                              <td>🤖 {u.aiUsageCount || 0}</td>
                              <td>
                                <span style={{ fontSize: '11px', fontWeight: 700 }}>
                                  {u.isTrialUser ? 'ניסיון' : 'מנוי שנתי'}
                                </span>
                              </td>
                              <td style={{ fontSize: '11px', color: '#64748b' }}>
                                {u.lastAiUsedAt ? new Date(u.lastAiUsedAt).toLocaleDateString('he-IL') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REQUESTS & ALERTS */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Security Lockout Section */}
              {lockedOutUsers.length > 0 && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #f87171',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <strong style={{ color: '#991b1b', fontSize: '13.5px' }}>
                    🔒 חשבונות שנחסמו עקב הזנת סיסמה שגויה 5 פעמים ({lockedOutUsers.length}):
                  </strong>
                  {lockedOutUsers.map((lu) => (
                    <div
                      key={lu.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <strong>{lu.name}</strong> ({lu.email}) {lu.lockedOutAt ? `– נחסם/ה בתאריך ${lu.lockedOutAt}` : ''}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlockUser(lu.id)}
                        className="btn-primary-sm"
                        style={{ background: '#059669', fontSize: '11.5px', padding: '4px 10px' }}
                      >
                        <Unlock size={13} />
                        <span>שחרר חסימה</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Admin Contact Requests & Bi-directional Chat */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Header with Title, Status & Notification Channels */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14.5px', color: '#1e3a5f' }}>
                      📩 תיבת פניות וצ'אט תמיכה ישיר מול מורות ({unifiedInquiries.length}):
                    </strong>
                    {countPending > 0 && (
                      <span
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '1px 7px',
                          borderRadius: '999px'
                        }}
                      >
                        {countPending} ממתינות למענה
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {replySuccessMsg && (
                      <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
                        {replySuccessMsg}
                      </span>
                    )}
                    {/* Live notification channels badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: '#475569',
                        background: '#f1f5f9',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}
                      title="ערוצי התראה מוגדרים עבור מנהלות המערכת"
                    >
                      <span style={{ fontWeight: 600 }}>ערוצי התראה:</span>
                      <span style={{ color: alertChannelsSummary.hasWhatsapp ? '#15803d' : '#94a3b8' }}>
                        {alertChannelsSummary.hasWhatsapp ? '✓' : '✗'} וואטסאפ
                      </span>
                      <span>•</span>
                      <span style={{ color: alertChannelsSummary.hasTelegram ? '#15803d' : '#94a3b8' }}>
                        {alertChannelsSummary.hasTelegram ? '✓' : '✗'} טלגרם
                      </span>
                      <span>•</span>
                      <span style={{ color: alertChannelsSummary.hasEmail ? '#15803d' : '#94a3b8' }}>
                        {alertChannelsSummary.hasEmail ? '✓' : '✗'} דוא"ל
                      </span>
                    </div>
                  </div>
                </div>

                {/* Segmentation Filter Tabs & Search Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setInquiriesFilter('pending')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: inquiriesFilter === 'pending' ? 800 : 600,
                          background: inquiriesFilter === 'pending' ? '#fef2f2' : '#ffffff',
                          color: inquiriesFilter === 'pending' ? '#b91c1c' : '#475569',
                          border: inquiriesFilter === 'pending' ? '1.5px solid #f87171' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Bell size={12} />
                        <span>ממתינות למענה</span>
                        <span style={{ background: inquiriesFilter === 'pending' ? '#dc2626' : '#94a3b8', color: '#ffffff', borderRadius: '999px', padding: '0 5px', fontSize: '10.5px' }}>
                          {countPending}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInquiriesFilter('active')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: inquiriesFilter === 'active' ? 800 : 600,
                          background: inquiriesFilter === 'active' ? '#eff6ff' : '#ffffff',
                          color: inquiriesFilter === 'active' ? '#1d4ed8' : '#475569',
                          border: inquiriesFilter === 'active' ? '1.5px solid #60a5fa' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Clock size={12} />
                        <span>בטיפול / פעילות</span>
                        <span style={{ background: inquiriesFilter === 'active' ? '#2563eb' : '#94a3b8', color: '#ffffff', borderRadius: '999px', padding: '0 5px', fontSize: '10.5px' }}>
                          {countActive}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInquiriesFilter('resolved')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: inquiriesFilter === 'resolved' ? 800 : 600,
                          background: inquiriesFilter === 'resolved' ? '#ecfdf5' : '#ffffff',
                          color: inquiriesFilter === 'resolved' ? '#047857' : '#475569',
                          border: inquiriesFilter === 'resolved' ? '1.5px solid #34d399' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>טופלו ונסגרו</span>
                        <span style={{ background: inquiriesFilter === 'resolved' ? '#059669' : '#94a3b8', color: '#ffffff', borderRadius: '999px', padding: '0 5px', fontSize: '10.5px' }}>
                          {countResolved}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInquiriesFilter('all')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: inquiriesFilter === 'all' ? 800 : 600,
                          background: inquiriesFilter === 'all' ? '#e2e8f0' : '#ffffff',
                          color: inquiriesFilter === 'all' ? '#0f172a' : '#475569',
                          border: inquiriesFilter === 'all' ? '1.5px solid #64748b' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>כל הפניות</span>
                        <span style={{ background: inquiriesFilter === 'all' ? '#334155' : '#94a3b8', color: '#ffffff', borderRadius: '999px', padding: '0 5px', fontSize: '10.5px' }}>
                          {unifiedInquiries.length}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px' }} />
                    <input
                      type="text"
                      value={inquiriesSearch}
                      onChange={(e) => setInquiriesSearch(e.target.value)}
                      placeholder="חיפוש לפי שם מורה, מייל, בית ספר או תוכן הפנייה..."
                      style={{
                        width: '100%',
                        padding: '6px 32px 6px 28px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        background: '#ffffff'
                      }}
                    />
                    {inquiriesSearch && (
                      <button
                        type="button"
                        onClick={() => setInquiriesSearch('')}
                        style={{
                          position: 'absolute',
                          left: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        title="נקה חיפוש"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {displayedInquiries.length === 0 ? (
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    {inquiriesSearch.trim()
                      ? `לא נמצאו פניות התואמות את החיפוש "${inquiriesSearch}".`
                      : inquiriesFilter === 'resolved'
                      ? 'אין פניות שסומנו כטופלו עדיין.'
                      : 'אין פניות ממתינות כרגע.'}
                  </div>
                ) : (
                  displayedInquiries.map((inq) => {
                    const isChatExpanded =
                      activeChatReqId === inq.id ||
                      activeChatReqId === inq.threadKey ||
                      activeChatReqId === sanitizeThreadKey(inq.email) ||
                      (Boolean(activeChatReqId) && activeChatReqId?.toLowerCase() === inq.email?.toLowerCase());
                    const matchedThread = supportThreads.find(
                      (t) =>
                        t.userEmail?.toLowerCase() === inq.email?.toLowerCase() ||
                        t.id === inq.threadKey ||
                        t.id === sanitizeThreadKey(inq.email)
                    );
                    const messages = matchedThread?.messages || inq.messages || [];

                    return (
                      <div
                        key={inq.id}
                        style={{
                          background: isChatExpanded ? '#ffffff' : inq.unreadByAdmin ? '#fffbeb' : '#f8fafc',
                          border: isChatExpanded
                            ? '1.5px solid #2563eb'
                            : inq.unreadByAdmin
                            ? '1.5px solid #f59e0b'
                            : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.2s ease',
                          boxShadow: isChatExpanded
                            ? '0 4px 14px rgba(37, 99, 235, 0.12)'
                            : inq.unreadByAdmin
                            ? '0 2px 6px rgba(245, 158, 11, 0.15)'
                            : 'none'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                              <strong style={{ color: inq.unreadByAdmin ? '#b45309' : '#1e3a5f' }}>{inq.topic}</strong>

                              {/* Rich Status Badges */}
                              {inq.unreadByAdmin ? (
                                <span
                                  style={{
                                    background: '#dc2626',
                                    color: '#ffffff',
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    padding: '1px 7px',
                                    borderRadius: '999px'
                                  }}
                                >
                                  🔴 חדש
                                </span>
                              ) : inq.status === 'needs_attention' || inq.lastFeedback === 'needs_help' ? (
                                <span
                                  style={{
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <AlertTriangle size={11} />
                                  <span>⚠️ דורשת המשך מענה</span>
                                </span>
                              ) : inq.status === 'resolved' && inq.resolutionFeedback === 'thumbs_up' ? (
                                <span
                                  style={{
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    fontSize: '10.5px',
                                    fontWeight: 800,
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <ThumbsUp size={11} />
                                  <span>👍 נסגר ע"י המורה</span>
                                </span>
                              ) : inq.status === 'resolved' ? (
                                <span
                                  style={{
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <CheckCircle2 size={11} />
                                  <span>✓ סומן כטופל</span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <Clock size={11} />
                                  <span>ממתין למורה</span>
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <span>מאת <strong>{inq.name}</strong> ({inq.email})</span>
                              {inq.schoolGroup && (
                                <span
                                  style={{
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    padding: '0 6px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600
                                  }}
                                >
                                  🏫 {inq.schoolGroup}
                                </span>
                              )}
                              {inq.createdAt ? <span style={{ color: '#64748b' }}>[{inq.createdAt}]</span> : null}
                              {inq.notes ? <span>— "{inq.notes}"</span> : null}
                            </div>

                            {inq.feedbackNote && (
                              <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '3px', fontWeight: 600 }}>
                                הערת מורה: "{inq.feedbackNote}"
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const nextExpanded = isChatExpanded ? null : inq.id;
                                setActiveChatReqId(nextExpanded);
                                if (!isChatExpanded && inq.unreadByAdmin && inq.threadKey) {
                                  markThreadReadInCloud(inq.threadKey, SENDER_ROLES.ADMIN).catch(() => {});
                                }
                              }}
                              className="btn-primary-sm"
                              style={{
                                background: isChatExpanded ? '#1e3a5f' : inq.unreadByAdmin ? '#2563eb' : '#475569',
                                fontSize: '12px',
                                padding: '5px 11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <MessageCircle size={13} />
                              <span>{isChatExpanded ? "סגור צ'אט" : "מענה למורה (צ'אט)"}</span>
                              {messages.length > 0 && (
                                <span style={{ background: 'rgba(255,255,255,0.25)', padding: '1px 5px', borderRadius: '10px', fontSize: '10.5px' }}>
                                  {messages.length}
                                </span>
                              )}
                            </button>

                            {inq.status === 'resolved' || inq.resolutionFeedback === 'thumbs_up' ? (
                              <button
                                type="button"
                                onClick={() => handleReopenInquiry(inq)}
                                className="btn-secondary-sm"
                                style={{ padding: '4px 9px', fontSize: '11.5px', color: '#b45309', borderColor: '#fde68a' }}
                                title="פתח פנייה זו מחדש"
                              >
                                <Clock size={13} />
                                <span>פתח מחדש</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDismissInquiry(inq)}
                                className="btn-secondary-sm"
                                style={{ padding: '4px 9px', fontSize: '11.5px' }}
                                title="סמן פנייה זו כטופלה"
                              >
                                <Check size={13} />
                                <span>סמן כטופל</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Live Chat Panel */}
                        {isChatExpanded && (
                          <div
                            style={{
                              borderTop: '1px solid #e2e8f0',
                              paddingTop: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            <div
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '10px',
                                maxHeight: '260px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              {messages.length === 0 ? (
                                <div style={{ fontSize: '12.5px', color: '#64748b', textAlign: 'center', padding: '10px' }}>
                                  עדיין אין הודעות קודמות בשרשור זה. ההודעה המקורית של המורה: "{inq.notes || inq.topic}".
                                </div>
                              ) : (
                                messages.map((m) => {
                                  const isAdmin = m.senderRole === SENDER_ROLES.ADMIN;
                                  const hasAttachment = Boolean(m.attachment?.url);
                                  return (
                                    <div
                                      key={m.id}
                                      style={{
                                        alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                                        background: isAdmin ? '#dbeafe' : '#ffffff',
                                        border: isAdmin ? '1.5px solid #93c5fd' : '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '7px 10px',
                                        maxWidth: '85%',
                                        fontSize: '12.5px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                      }}
                                    >
                                      <div style={{ fontSize: '10.5px', color: isAdmin ? '#1e40af' : '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                                        {isAdmin ? '🎧 מנהלת המערכת' : `👤 ${m.senderName || inq.name}`} • {m.createdAt}
                                      </div>
                                      {m.text && m.text !== '📷 [צילום מסך מצורף]' && (
                                        <div style={{ color: '#1e293b', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                                      )}
                                      {hasAttachment && (
                                        <div style={{ marginTop: '6px' }}>
                                          <img
                                            src={m.attachment.url}
                                            alt={m.attachment.name || 'צילום מסך'}
                                            onClick={() => setAdminPreviewImgUrl(m.attachment.url)}
                                            style={{
                                              maxWidth: '100%',
                                              maxHeight: '180px',
                                              borderRadius: '6px',
                                              border: '1px solid #94a3b8',
                                              cursor: 'pointer',
                                              objectFit: 'contain',
                                              background: '#0f172a',
                                              display: 'block'
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setAdminPreviewImgUrl(m.attachment.url)}
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              padding: '3px 0',
                                              fontSize: '11px',
                                              color: '#2563eb',
                                              cursor: 'pointer',
                                              fontWeight: 600,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              marginTop: '2px'
                                            }}
                                          >
                                            <span>📷 {m.attachment.name || 'צילום מסך'} ({m.attachment.sizeKb || Math.round((m.attachment.url.length * 0.75) / 1024)}KB) • לחץ/י להגדלה</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Quick response chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {[
                                'שלום, בדקתי והעניין סודר. תוכלי לרענן את העמוד ולבדוק שוב.',
                                'הסיסמה הזמנית נשלחה למייל שלך. אנא נסי להתחבר כעת.',
                                'שחררתי את חסימת החשבון. תוכלי להתחבר שוב עם הסיסמה שלך.',
                                'אשמח לעזור! מה בדיוק התקלה שמופיעה אצלך?'
                              ].map((chip, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setAdminReplyText(chip)}
                                  style={{
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    color: '#334155',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>

                            {/* Reply Input */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <textarea
                                rows={2}
                                value={adminReplyText}
                                onChange={(e) => setAdminReplyText(e.target.value)}
                                placeholder={`כתוב/י מענה ישיר ל-${inq.name}...`}
                                style={{
                                  flex: 1,
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '12.5px',
                                  resize: 'vertical'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSendAdminReply(inq)}
                                disabled={!adminReplyText.trim() || isSendingReply}
                                className="btn-primary-sm"
                                style={{
                                  background: !adminReplyText.trim() || isSendingReply ? '#cbd5e1' : '#15803d',
                                  padding: '0 14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                              >
                                <Send size={13} style={{ transform: 'rotate(180deg)' }} />
                                <span>{isSendingReply ? 'שולח...' : 'שלח תגובה'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM HEALTH */}
          {activeTab === 'health' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <SystemHealthPanel
                healthEvents={healthEvents}
                healthReviewedMs={healthReviewedMs}
                onMarkHealthReviewed={onMarkHealthReviewed}
                onClearHealthEvents={onClearHealthEvents}
                cloudSyncState={cloudSyncState}
              />
              <AdminAlertsPanel
                allowedUsers={allowedUsers}
                onUpdateAllowedUsers={onUpdateAllowedUsers}
                emailEngineConfig={emailEngineConfig}
              />
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Upgrade & Deployment Warning Banner Control */}
              <div
                style={{
                  background: upgradeBanner?.active
                    ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                    : '#f8fafc',
                  border: `1.5px solid ${upgradeBanner?.active ? '#f87171' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} style={{ color: upgradeBanner?.active ? '#dc2626' : '#64748b' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: upgradeBanner?.active ? '#991b1b' : '#1e3a5f' }}>
                      התרעת שדרוג מערכת פעיל (PR + Deploy)
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: upgradeBanner?.active ? '#fee2e2' : '#f1f5f9',
                      color: upgradeBanner?.active ? '#b91c1c' : '#64748b',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: `1px solid ${upgradeBanner?.active ? '#fca5a5' : '#cbd5e1'}`
                    }}
                  >
                    <span>{upgradeBanner?.active ? '🔴 פעיל – משודר לכל המשתמשים' : '⚪ כבוי (שגרה)'}</span>
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  מציג פס אדום בולט בראש האתר לכל המשתמשים המחוברים כדי להנחות אותם לשמור את עבודתם מיד למניעת איבוד נתונים, ולאחר מכן לרענן את האתר בסיום הפריסה.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = {
                        active: !upgradeBanner?.active,
                        message: upgradeBanner?.message || DEFAULT_UPGRADE_BANNER_MESSAGE,
                        startedAt: !upgradeBanner?.active ? new Date().toISOString() : '',
                        updatedAt: new Date().toISOString()
                      };
                      onUpdateUpgradeBanner && onUpdateUpgradeBanner(nextState);
                    }}
                    className="btn-primary-sm"
                    style={{
                      background: upgradeBanner?.active ? '#475569' : '#dc2626',
                      color: '#ffffff',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    {upgradeBanner?.active ? '⏹️ כבה התרעת שדרוג (חזרה לשגרה)' : '🚀 הפעל התרעת שדרוג ופריסה (הצג פס אדום)'}
                  </button>
                </div>
              </div>

              {/* Cloud AI Backend Status Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={20} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#14532d' }}>
                      שרת AI ענן מאובטח (Google Cloud Functions v2)
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: '1px solid #bbf7d0'
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>פעיל ומחובר • Blaze Plan</span>
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
                  כל בקשות ה-AI מנותבות דרך שרת ה-Proxy המאובטח של TALA המצויד במפתח GCP משולם (Enterprise Quota), סינון PII אוטומטי והגנת הזרקת פקודות.
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '11px',
                    color: '#15803d',
                    paddingTop: '4px',
                    borderTop: '1px dashed #bbf7d0'
                  }}
                >
                  <span>• גרסת שרת: <strong>Node.js 22 LTS</strong></span>
                  <span>• שרת מארח: <strong>us-central1 (Cloud Run v2)</strong></span>
                  <span>• סטטוס מכסות: <strong>ללא הגבלת חינמי (1,000+ RPM)</strong></span>
                </div>
              </div>

              {/* Gemini Fallback Key */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #eaf3fc 0%, #f3eefc 100%)',
                  border: '1.5px solid #bfa8e8',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} style={{ color: '#6d28d9' }} />
                  <span>מפתח גיבוי מקומי לדפדפן (אופציונלי):</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiApiKey || ''}
                    onChange={(e) => onChangeGeminiApiKey && onChangeGeminiApiKey(e.target.value)}
                    placeholder="הזן מפתח גיבוי מקומי (AI Studio)..."
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    style={{ padding: '4px 10px' }}
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  מפתח זה נשמר מקומית בלבד בדפדפן ומשמש כגיבוי חירום בלבד אם שרת הענן אינו זמין. בפעילות רגילה המערכת משתמשת אוטומטית בשרת הענן המאובטח שלמעלה.
                </span>
              </div>

              {/* Password Policy */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(enforcePasswordPolicy)}
                    onChange={(e) => onChangeEnforcePasswordPolicy && onChangeEnforcePasswordPolicy(e.target.checked)}
                  />
                  <span>אכוף מדיניות סיסמאות מאובטחת לכל המשתמשים (8+ תווים, אות גדולה, ספרה ותו מיוחד)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            סה"כ רשומים במערכת: <strong>{allowedUsers.length}</strong> מורים | תלמידים פעילים: <strong>{students.length}</strong>
          </div>
          <button type="button" className="btn-primary-sm" onClick={onClose}>
            סגור ושמור
          </button>
        </div>

        {/* Groups Datalist */}
        <datalist id="admin-groups-datalist">
          {existingGroups.map((grp) => (
            <option key={grp} value={grp} />
          ))}
        </datalist>
      </div>

      {/* Admin Screenshot Lightbox */}
      {adminPreviewImgUrl && (
        <div
          onClick={() => setAdminPreviewImgUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: '#1e293b',
                color: '#ffffff'
              }}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>צילום מסך שהתקבל מהמורה</span>
              <button
                type="button"
                onClick={() => setAdminPreviewImgUrl(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="סגור תצוגה מקדימה"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '10px', overflow: 'auto', textAlign: 'center', background: '#0f172a' }}>
              <img
                src={adminPreviewImgUrl}
                alt="צילום מסך מוגדל"
                style={{
                  maxWidth: '100%',
                  maxHeight: '78vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
