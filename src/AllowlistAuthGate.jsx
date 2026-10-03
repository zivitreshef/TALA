import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  AlertTriangle,
  UserCheck,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Ban,
  CheckCircle2,
  Send,
  MessageSquare,
  TrendingUp,
  BookOpen,
  Unlock,
  Bell
} from 'lucide-react';
import {
  verifyAllowedUser,
  validatePasswordPolicy,
  MAX_FAILED_LOGIN_ATTEMPTS
} from './allowedUsers';
import { sendUserInvitationEmailInBackground } from './emailService';

function PasswordPolicyChecklist({ password }) {
  const { checks } = validatePasswordPolicy(password);
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '6px',
        padding: '6px 8px',
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        fontSize: '11px'
      }}
    >
      {checks.map((c) => (
        <span
          key={c.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 6px',
            borderRadius: '999px',
            fontWeight: 600,
            background: c.passed ? '#dcfce7' : '#f1f5f9',
            color: c.passed ? '#166534' : '#64748b',
            border: `1px solid ${c.passed ? '#86efac' : '#e2e8f0'}`
          }}
        >
          <span>{c.passed ? '✓' : '○'}</span>
          <span>{c.label}</span>
        </span>
      ))}
    </div>
  );
}

export function AllowlistAuthGate({
  allowedUsers,
  onLoginSuccess,
  onUpdateAllowedUsers,
  onSubmitAdminRequest
}) {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAccountLockedError, setIsAccountLockedError] = useState(false);

  // Contact Admin modal / drawer state on landing page
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('שחרור חסימה / איפוס סיסמה');
  const [contactNotes, setContactNotes] = useState('');
  const [contactSentSuccess, setContactSentSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsAccountLockedError(false);

    const result = verifyAllowedUser(email, accessCode, allowedUsers);

    // If login attempt updated failedLoginAttempts or locked the user, persist immediately
    if (result.updatedUsersList && onUpdateAllowedUsers) {
      onUpdateAllowedUsers(result.updatedUsersList);
    }

    if (!result.allowed) {
      setErrorMsg(result.reason);
      if (result.isLockedOut || result.isDisabled) {
        setIsAccountLockedError(true);
      }
      return;
    }

    onLoginSuccess(result.user);
  };

  const handleOpenContactAdmin = (defaultTopic = 'שחרור חסימה / איפוס סיסמה') => {
    setContactEmail(email || '');
    setContactTopic(defaultTopic);
    setContactSentSuccess(false);
    setShowContactAdmin(true);
  };

  const handleSendContactRequest = (e) => {
    e.preventDefault();
    if (!contactEmail.trim() && !contactName.trim()) return;

    const reqItem = {
      id: 'req_' + Date.now(),
      name: contactName.trim() || 'משתמש/ת',
      email: contactEmail.trim().toLowerCase(),
      topic: contactTopic,
      notes: contactNotes.trim(),
      createdAt: new Date().toLocaleString('he-IL', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    };

    if (onSubmitAdminRequest) {
      onSubmitAdminRequest(reqItem);
    }
    setContactSentSuccess(true);
    setTimeout(() => {
      setShowContactAdmin(false);
      setContactSentSuccess(false);
      setContactNotes('');
    }, 1800);
  };

  return (
    <div className="auth-page-wrapper" dir="rtl">
      <div className="auth-landing-shell">
        <div className="auth-stained-glass-bar" />

        {/* Right Column: Rich Pedagogical Brand Showcase */}
        <div className="auth-showcase-panel">
          <div className="auth-showcase-top">
            <div className="auth-badge-pill">
              <Sparkles size={13} />
              <span>פלטפורמה פדגוגית מבוססת ענן ו-AI</span>
            </div>

            <div className="auth-logo-frame">
              <img src="./tala-logo.png" alt="TALA Logo" className="auth-logo-img" />
            </div>

            <h1 className="auth-title">מערכת TALA</h1>
            <p className="auth-subtitle">
              תוכנית עבודה שנתית – תל"א (תוכנית לימודים אישית) / תח"י (תוכנית חינוכית יחידנית) ברוח הגישה האקולוגית
            </p>
          </div>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <TrendingUp size={18} />
              </div>
              <div className="auth-feature-text">
                <strong>מאגר מטרות ויעדים אקולוגי חכם</strong>
                <span>מותאם לסביבות ההשתתפות בגן ובבית הספר ומדורג אוטומטית לפי שכיחות צוותית.</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Sparkles size={18} />
              </div>
              <div className="auth-feature-text">
                <strong>בינה מלאכותית ושאלות מנחות</strong>
                <span>הפקת תקציר מנהלים מקצועי וניסוח מטרות מותאם מגדרית מתוך תיאור תפקוד חופשי.</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <BookOpen size={18} />
              </div>
              <div className="auth-feature-text">
                <strong>הגנת פרטיות וארכיון רב-שנתי בענן</strong>
                <span>הפקת דוחות רשמיים להדפסה עם השחרת פרטים מזהים וראשי תיבות, ושמירה מאובטחת.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Column: Clean, Elevated Login Card */}
        <div className="auth-login-panel">
          <div className="auth-login-header">
            <h2>כניסה למערכת</h2>
            <p>הזינו את כתובת הדוא"ל וקוד הגישה האישי שלכם</p>
          </div>

          {errorMsg && (
            <div
              className="auth-error-banner"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
              {isAccountLockedError && (
                <button
                  type="button"
                  onClick={() => handleOpenContactAdmin('שחרור חסימת חשבון')}
                  style={{
                    alignSelf: 'flex-end',
                    background: '#991b1b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 11px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <MessageSquare size={13} />
                  <span>פנייה למנהל/ת המערכת לשחרור החסימה</span>
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label>כתובת דואר אלקטרוני:</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="form-field">
              <label>קוד גישה אישי / סיסמה:</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <KeyRound size={16} className="field-icon" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  style={{ paddingLeft: '40px', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  title={showLoginPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  aria-label={showLoginPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  className="password-eye-toggle-btn"
                >
                  {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-auth-submit">
              <UserCheck size={18} />
              <span>כניסה למערכת TALA</span>
            </button>
          </form>

          {/* Contact Admin Footer Link */}
          <div className="auth-contact-admin-footer">
            <span>נתקלת בבעיה בכניסה או שהחשבון נחסם?</span>
            <button
              type="button"
              className="btn-link-contact-admin"
              onClick={() => handleOpenContactAdmin('שחרור חסימה / איפוס סיסמה')}
            >
              <MessageSquare size={14} />
              <span>פנייה למנהל/ת המערכת</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contact Admin Modal on Landing Page */}
      {showContactAdmin && (
        <div
          className="modal-backdrop"
          onClick={() => setShowContactAdmin(false)}
          dir="rtl"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <MessageSquare size={20} className="text-primary" />
                <h3>פנייה למנהל/ת המערכת</h3>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setShowContactAdmin(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendContactRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  באפשרותך לשלוח הודעה ישירה שתופיע אצל מנהל/ת המערכת באתר או לשלוח אימייל ישיר.
                </p>

                {contactSentSuccess && (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #6ee7b7',
                      color: '#065f46',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    ✓ פנייתך נשלחה בהצלחה ותוצג למנהל/ת המערכת!
                  </div>
                )}

                <div className="form-field">
                  <label>שם מלא:</label>
                  <input
                    type="text"
                    required
                    placeholder="הזן את שמך המלא..."
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>כתובת דוא"ל שלך:</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div className="form-field">
                  <label>נושא הפנייה:</label>
                  <select
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                  >
                    <option value="שחרור חסימת חשבון">
                      שחרור חסימת חשבון
                    </option>
                    <option value="שחרור חסימה / איפוס סיסמה">
                      שכחתי סיסמה / בקשה לאיפוס סיסמה
                    </option>
                    <option value="בקשת הרשאת גישה למערכת">
                      בקשת הרשאת גישה למשתמש/ת חדש/ה
                    </option>
                    <option value="פנייה כללית למנהל/ת המערכת">
                      פנייה כללית למנהל/ת המערכת
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label>הודעה / פרטים נוספים:</label>
                  <textarea
                    rows={2}
                    placeholder="פרטים נוספים למנהל/ת המערכת..."
                    value={contactNotes}
                    onChange={(e) => setContactNotes(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <a
                  href={`mailto:zivit.reshef@gmail.com?subject=${encodeURIComponent(
                    `פנייה ממערכת TALA: ${contactTopic}`
                  )}&body=${encodeURIComponent(
                    `שלום,\nשמי: ${contactName}\nאימייל: ${contactEmail}\nנושא: ${contactTopic}\n\n${contactNotes}`
                  )}`}
                  className="btn-secondary-sm"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Mail size={14} />
                  <span>שליחת אימייל ישיר</span>
                </a>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => setShowContactAdmin(false)}
                  >
                    ביטול
                  </button>
                  <button type="submit" className="btn-primary-sm">
                    <Send size={14} />
                    <span>שלח פנייה למנהל/ת</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function UserSelfPasswordModal({
  isOpen,
  onClose,
  currentUser,
  enforcePasswordPolicy,
  onChangeOwnPassword,
  isMandatoryFirstLogin = false
}) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newPassword.trim();
    if (!trimmed) {
      setErrorMsg('נא להזין סיסמה חדשה.');
      return;
    }

    if (isMandatoryFirstLogin && trimmed === currentUser.accessCode) {
      setErrorMsg('נא לבחור סיסמה חדשה השונה מהסיסמה הזמנית שקיבלת במייל.');
      return;
    }

    if (enforcePasswordPolicy) {
      const check = validatePasswordPolicy(trimmed);
      if (!check.valid) {
        setErrorMsg(check.errorMessage);
        return;
      }
    }

    onChangeOwnPassword(trimmed);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setNewPassword('');
      if (onClose) onClose();
    }, 1000);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!isMandatoryFirstLogin && onClose) onClose();
      }}
      dir="rtl"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          borderTop: isMandatoryFirstLogin ? '5px solid #6b46c1' : undefined
        }}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <KeyRound size={20} className="text-primary" />
            <h3>
              {isMandatoryFirstLogin
                ? `ברוכים הבאים, ${currentUser.name}! הגדרת סיסמה אישית`
                : `שינוי סיסמה אישית – ${currentUser.name}`}
            </h3>
          </div>
          {!isMandatoryFirstLogin && (
            <button className="btn-icon-close" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isMandatoryFirstLogin && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #eef3fb 0%, #f3eefc 100%)',
                  border: '1.5px solid #8b6fc0',
                  color: '#1e3a5f',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  lineHeight: 1.55
                }}
              >
                <strong>🔒 כניסה ראשונה באמצעות סיסמה זמנית:</strong>
                <br />
                לצורך שמירה על אבטחת המידע שלך ושל התלמידים, נא לבחור כעת <strong>סיסמה אישית קבועה</strong>. מיד לאחר השמירה תועבר/י להמשך עבודה במערכת.
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                {errorMsg}
              </div>
            )}

            {savedSuccess && (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #6ee7b7',
                  color: '#065f46',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700
                }}
              >
                ✓ הסיסמה האישית נשמרה בהצלחה! מעביר אותך למערכת...
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                {isMandatoryFirstLogin ? 'בחר/י סיסמה אישית חדשה:' : 'סיסמה חדשה:'}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="הזן סיסמה חדשה..."
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '8px',
                    border: '1.5px solid #4a859e',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {enforcePasswordPolicy && <PasswordPolicyChecklist password={newPassword} />}
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {!isMandatoryFirstLogin && (
              <button type="button" className="btn-secondary-sm" onClick={onClose}>
                ביטול
              </button>
            )}
            <button type="submit" className="btn-primary-sm">
              <Check size={15} />
              <span>{isMandatoryFirstLogin ? 'שמור סיסמה אישית והמשך למערכת' : 'שמור סיסמה'}</span>
            </button>
          </div>
        </form>
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

export function AdminAllowlistModal({
  isOpen,
  onClose,
  allowedUsers,
  onUpdateAllowedUsers,
  geminiApiKey,
  onChangeGeminiApiKey,
  enforcePasswordPolicy,
  onChangeEnforcePasswordPolicy,
  adminRequests = [],
  onDismissAdminRequest,
  cloudSyncState,
  emailEngineConfig
}) {
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    title: 'גננת / מורה להוראה מותאמת',
    group: '',
    role: 'teacher',
    accessCode: ''
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

  if (!isOpen) return null;

  const lockedOutUsers = (allowedUsers || []).filter((u) => Boolean(u.lockedOut));
  const existingGroups = Array.from(
    new Set(
      (allowedUsers || [])
        .map((u) => (u.group || '').trim())
        .filter(Boolean)
    )
  );

  const handleUpdateUserGroup = (userId, nextGroup) => {
    onUpdateAllowedUsers(
      allowedUsers.map((u) => (u.id === userId ? { ...u, group: nextGroup } : u))
    );
  };

  const handleGenerateTempPasswordForNewUser = () => {
    const generated = generateRandomTempPassword();
    setNewUser((prev) => ({ ...prev, accessCode: generated }));
    setShowNewUserPassword(true);
    setAddUserError('');
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
    const created = {
      id: 'u_' + Date.now(),
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      title: newUser.title.trim() || 'צוות חינוכי',
      group: (newUser.group || '').trim(),
      role: newUser.role,
      accessCode: tempPassword,
      active: true,
      failedLoginAttempts: 0,
      lockedOut: false,
      mustChangePassword: true // Require password change on first login!
    };

    onUpdateAllowedUsers([...allowedUsers, created]);
    setNewUser({
      name: '',
      email: '',
      title: 'גננת / מורה להוראה מותאמת',
      group: newUser.group || '',
      role: 'teacher',
      accessCode: ''
    });
    setShowNewUserPassword(false);

    if (sendInviteEmailOnCreate) {
      setIsSendingInvite(true);
      try {
        await sendUserInvitationEmailInBackground({
          config: emailEngineConfig,
          userName: created.name,
          userEmail: created.email,
          userTitle: created.title,
          tempPassword: created.accessCode,
          siteUrl: 'https://zivitreshef.github.io/TALA/'
        });
        setInviteStatusBanner(
          `✅ המשתמש/ת "${created.name}" נוסף/ה בהצלחה ונשלחה אליו/ה הזמנה מעוצבת במייל (${created.email}) עם סיסמה זמנית ודרישה להחלפת סיסמה בכניסה הראשונה!`
        );
      } catch (err) {
        console.error('Failed to send onboarding invite email:', err);
        setAddUserError(
          `המשתמש נוסף למערכת, אך שליחת מייל ההזמנה נכשלה: ${err?.message || 'שגיאת תקשורת'}`
        );
      } finally {
        setIsSendingInvite(false);
      }
    } else {
      setInviteStatusBanner(
        `✅ המשתמש/ת "${created.name}" נוסף/ה בהצלחה (בכניסה הראשונה יידרש להחליף את הסיסמה הזמנית).`
      );
    }
  };

  const handleResendInvitationEmail = async (userObj) => {
    setAddUserError('');
    setInviteStatusBanner('');
    setSendingInviteForUserId(userObj.id);
    try {
      // Mark user as mustChangePassword: true if sending onboarding invitation with their current temp password
      onUpdateAllowedUsers(
        allowedUsers.map((u) =>
          u.id === userObj.id
            ? {
                ...u,
                mustChangePassword: true,
                active: true,
                lockedOut: false,
                failedLoginAttempts: 0
              }
            : u
        )
      );

      await sendUserInvitationEmailInBackground({
        config: emailEngineConfig,
        userName: userObj.name,
        userEmail: userObj.email,
        userTitle: userObj.title,
        tempPassword: userObj.accessCode,
        siteUrl: 'https://zivitreshef.github.io/TALA/'
      });

      setInviteStatusBanner(
        `📨 מייל הזמנה והדרכה נשלח בהצלחה אל ${userObj.name} (${userObj.email}) עם הסיסמה הזמנית!`
      );
    } catch (err) {
      console.error('Error resending invite:', err);
      setAddUserError(`שגיאה בשליחת מייל הזמנה אל ${userObj.email}: ${err?.message || ''}`);
    } finally {
      setSendingInviteForUserId(null);
    }
  };

  const handleStartChangePassword = (user) => {
    setEditingPasswordUserId(user.id);
    setNewPasswordValue('');
    setShowEditingPassword(false);
    setRowPasswordError('');
  };

  const handleSaveNewPassword = (userId) => {
    setRowPasswordError('');
    const trimmed = newPasswordValue.trim();
    if (!trimmed) {
      setRowPasswordError('נא להזין סיסמה חדשה.');
      return;
    }

    if (enforcePasswordPolicy) {
      const validation = validatePasswordPolicy(trimmed);
      if (!validation.valid) {
        setRowPasswordError(validation.errorMessage);
        return;
      }
    }

    onUpdateAllowedUsers(
      allowedUsers.map((u) =>
        u.id === userId
          ? {
              ...u,
              accessCode: trimmed,
              failedLoginAttempts: 0,
              lockedOut: false,
              active: true,
              mustChangePassword: true
            }
          : u
      )
    );
    setEditingPasswordUserId(null);
    setNewPasswordValue('');
    setShowEditingPassword(false);
    setPasswordSavedToastId(userId);
    setTimeout(() => setPasswordSavedToastId(null), 2500);
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
    if (
      userObj.email?.toLowerCase() === 'zivit.reshef@gmail.com' &&
      userObj.active &&
      !userObj.lockedOut
    ) {
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

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '880px' }}>
        <div className="modal-header">
          <div className="modal-header-title">
            <ShieldCheck size={22} className="text-primary" />
            <h3>ניהול רשימת משתמשים מורשים והגדרות אבטחה</h3>
          </div>
          <button className="btn-icon-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Security Lockout Alerts & Contact Admin Requests Under Site ADMIN */}
          {(lockedOutUsers.length > 0 || adminRequests.length > 0) && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#991b1b',
                  fontWeight: 700,
                  fontSize: '13.5px'
                }}
              >
                <Bell size={17} />
                <span>
                  התראות אבטחה ופניות למנהל/ת המערכת ({lockedOutUsers.length + adminRequests.length})
                </span>
              </div>

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
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '12.5px'
                  }}
                >
                  <div>
                    <strong style={{ color: '#b91c1c' }}>
                      🔒 חסימה אוטומטית עקב {MAX_FAILED_LOGIN_ATTEMPTS} ניסיונות סיסמה שגויים:
                    </strong>{' '}
                    <span>
                      המשתמש/ת <strong>{lu.name}</strong> ({lu.email}) נחסם/ה אוטומטית
                      {lu.lockedOutAt ? ` בתאריך ${lu.lockedOutAt}` : ''}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlockUser(lu.id)}
                    className="btn-primary-sm"
                    style={{
                      background: '#059669',
                      padding: '5px 10px',
                      fontSize: '12px'
                    }}
                  >
                    <Unlock size={13} />
                    <span>שחרר חסימה והפעל מחדש</span>
                  </button>
                </div>
              ))}

              {adminRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    fontSize: '12.5px',
                    color: '#92400e'
                  }}
                >
                  <div>
                    <strong>📩 פנייה מדף הכניסה — {req.topic}:</strong>{' '}
                    <span>
                      מאת <strong>{req.name}</strong> ({req.email})
                      {req.createdAt ? ` [${req.createdAt}]` : ''}
                      {req.notes ? ` — "${req.notes}"` : ''}
                    </span>
                  </div>
                  {onDismissAdminRequest && (
                    <button
                      type="button"
                      onClick={() => onDismissAdminRequest(req.id)}
                      className="btn-secondary-sm"
                      style={{ padding: '4px 9px', fontSize: '11.5px' }}
                    >
                      <Check size={13} />
                      <span>סמן כטופל</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Cloud Backend Sync Status Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              background: cloudSyncState?.connected ? '#ecfdf5' : '#fffbeb',
              border: `1.5px solid ${cloudSyncState?.connected ? '#6ee7b7' : '#fcd34d'}`,
              borderRadius: '10px',
              padding: '9px 14px',
              marginBottom: '10px',
              fontSize: '12.5px',
              color: cloudSyncState?.connected ? '#065f46' : '#92400e',
              fontWeight: 600
            }}
          >
            <span>
              {cloudSyncState?.connected
                ? '☁️ מחובר לענן Firebase Firestore — משתמשים, סיסמאות, תלמידים, דוחות ומאגר המטרות נשמרים אוטומטית בענן ואינם מושפעים מעדכוני קוד.'
                : '⚠️ מצב שמירה מקומי.'}
            </span>
          </div>

          {/* Admin Settings Box: Gemini Key + Password Policy Checkbox */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'linear-gradient(135deg, #eaf3fc 0%, #f3eefc 100%)',
              border: '1.5px solid #bfa8e8',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '14px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2b4c73', fontWeight: 700, fontSize: '13.5px' }}>
                <Sparkles size={16} style={{ color: '#8b6fc0' }} />
                <span>מפתח Gemini AI:</span>
              </div>
              <input
                type="password"
                placeholder="הזן מפתח Gemini AI..."
                value={geminiApiKey || ''}
                onChange={(e) => onChangeGeminiApiKey && onChangeGeminiApiKey(e.target.value)}
                dir="ltr"
                style={{
                  flex: '1 1 240px',
                  maxWidth: '340px',
                  padding: '7px 11px',
                  borderRadius: '8px',
                  border: '1.5px solid #8b6fc0',
                  background: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(139, 111, 192, 0.25)',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#1e3a5f'
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(enforcePasswordPolicy)}
                  onChange={(e) =>
                    onChangeEnforcePasswordPolicy &&
                    onChangeEnforcePasswordPolicy(e.target.checked)
                  }
                  style={{ width: '16px', height: '16px', accentColor: '#4c1d95', cursor: 'pointer' }}
                />
                <span>
                  אכיפת מדיניות סיסמאות חזקה לפי תקן אבטחה
                </span>
              </label>
              <span style={{ fontSize: '11.5px', color: '#475569', paddingRight: '24px' }}>
                ללא פקיעת תוקף או שמירת היסטוריית סיסמאות. כמו כן, חשבון משתמש נחסם אוטומטית לאחר {MAX_FAILED_LOGIN_ATTEMPTS} ניסיונות כניסה שגויים ברציפות.
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', marginTop: 0 }}>
            רק משתמשים המופיעים ברשימה זו ומסומנים כ"פעילים" מורשים להתחבר לאתר ולצפות בתכניות העבודה. ניתן להשבית משתמש זמנית או לשחרר חסימה בכל עת ללא צורך במחיקתו.
          </p>

          <form onSubmit={handleAddUser} className="add-allowed-user-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <h4 style={{ margin: 0 }}>➕ הוספת משתמש/ת מורשה חדש/ה:</h4>
              <button
                type="button"
                onClick={handleGenerateTempPasswordForNewUser}
                style={{
                  background: '#f3eefc',
                  color: '#4c1d95',
                  border: '1px solid #c4b5fd',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Sparkles size={13} />
                <span>חולל סיסמה זמנית אוטומטית</span>
              </button>
            </div>

            {addUserError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px'
                }}
              >
                ⚠️ {addUserError}
              </div>
            )}

            {inviteStatusBanner && (
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #6ee7b7',
                  color: '#065f46',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  marginBottom: '8px'
                }}
              >
                {inviteStatusBanner}
              </div>
            )}

            <div className="form-grid-4">
              <input
                type="text"
                required
                placeholder="שם מלא..."
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
              <input
                type="email"
                required
                placeholder="אימייל מורשה..."
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
              <input
                type="text"
                placeholder="תפקיד..."
                value={newUser.title}
                onChange={(e) => setNewUser({ ...newUser, title: e.target.value })}
              />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showNewUserPassword ? 'text' : 'password'}
                  required
                  placeholder="סיסמה זמנית ראשונית..."
                  value={newUser.accessCode}
                  onChange={(e) => {
                    setNewUser({ ...newUser, accessCode: e.target.value });
                    setAddUserError('');
                  }}
                  style={{ width: '100%', paddingLeft: '32px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPassword((prev) => !prev)}
                  title={showNewUserPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  aria-label={showNewUserPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  style={{
                    position: 'absolute',
                    left: '6px',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '3px'
                  }}
                >
                  {showNewUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <datalist id="tala-admin-groups-datalist">
              {existingGroups.map((grp) => (
                <option key={grp} value={grp} />
              ))}
            </datalist>

            {enforcePasswordPolicy && newUser.accessCode && (
              <PasswordPolicyChecklist password={newUser.accessCode} />
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px dashed #cbd5e1'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>צוות / מתי"א:</span>
                  <input
                    type="text"
                    list="tala-admin-groups-datalist"
                    placeholder="למשל: מתי״א מרכז"
                    value={newUser.group || ''}
                    onChange={(e) => setNewUser({ ...newUser, group: e.target.value })}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      width: '135px'
                    }}
                  />
                </label>

                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>הרשאה:</span>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="teacher">מורה / גננת</option>
                    <option value="admin">מנהל/ת מערכת</option>
                  </select>
                </label>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#1e3a8a',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sendInviteEmailOnCreate}
                    onChange={(e) => setSendInviteEmailOnCreate(e.target.checked)}
                    style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <Mail size={14} />
                  <span>שלח מייל הזמנה עם הסבר על המערכת וסיסמה זמנית</span>
                </label>
              </div>

              <button type="submit" className="btn-primary-sm" disabled={isSendingInvite}>
                {sendInviteEmailOnCreate ? <Send size={15} /> : <Plus size={15} />}
                <span>
                  {isSendingInvite
                    ? 'מוסיף ושולח מייל הזמנה...'
                    : sendInviteEmailOnCreate
                    ? 'הוסף משתמש ושלח מייל הזמנה'
                    : 'הוסף לרשימת המורשים'}
                </span>
              </button>
            </div>
          </form>

          <div className="allowed-users-table-wrap">
            <table className="allowed-users-table">
              <thead>
                <tr>
                  <th>שם מלא</th>
                  <th>אימייל</th>
                  <th>תפקיד</th>
                  <th>צוות / מתי"א</th>
                  <th>סיסמה / קוד גישה</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {allowedUsers.map((u) => {
                  const isMainAdmin = u.email?.toLowerCase() === 'zivit.reshef@gmail.com';
                  return (
                    <tr key={u.id} style={{ opacity: u.active ? 1 : 0.6 }}>
                      <td>
                        <strong>{u.name}</strong>
                        {u.role === 'admin' && <span className="badge-admin">Admin</span>}
                        {u.mustChangePassword && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginRight: '6px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              padding: '1px 6px',
                              borderRadius: '999px'
                            }}
                            title="המשתמש נדרש להחליף את הסיסמה הזמנית בכניסתו הראשונה"
                          >
                            סיסמה זמנית
                          </span>
                        )}
                      </td>
                      <td dir="ltr" style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                        {u.email}
                      </td>
                      <td>{u.title}</td>
                      <td>
                        <input
                          type="text"
                          list="tala-admin-groups-datalist"
                          placeholder="ללא שיוך..."
                          value={u.group || ''}
                          onChange={(e) => handleUpdateUserGroup(u.id, e.target.value)}
                          style={{
                            padding: '4px 7px',
                            borderRadius: '6px',
                            border: '1px solid #d3dff0',
                            background: '#f8faff',
                            fontSize: '12px',
                            width: '115px',
                            color: '#2b4c73',
                            fontWeight: 600
                          }}
                        />
                      </td>
                      <td>
                        {editingPasswordUserId === u.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                <input
                                  type={showEditingPassword ? 'text' : 'password'}
                                  placeholder="סיסמה חדשה..."
                                  value={newPasswordValue}
                                  onChange={(e) => {
                                    setNewPasswordValue(e.target.value);
                                    setRowPasswordError('');
                                  }}
                                  autoFocus
                                  style={{
                                    padding: '5px 8px 5px 28px',
                                    border: '1.5px solid #4a859e',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    width: '145px'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEditingPassword((prev) => !prev)}
                                  title={showEditingPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                                  aria-label={showEditingPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                                  style={{
                                    position: 'absolute',
                                    left: '5px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '2px'
                                  }}
                                >
                                  {showEditingPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                              <button
                                type="button"
                                className="btn-primary-sm"
                                style={{ padding: '5px 8px', fontSize: '11.5px' }}
                                onClick={() => handleSaveNewPassword(u.id)}
                                title="שמור סיסמה חדשה"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn-secondary-sm"
                                style={{ padding: '5px 8px', fontSize: '11.5px' }}
                                onClick={() => {
                                  setEditingPasswordUserId(null);
                                  setNewPasswordValue('');
                                  setShowEditingPassword(false);
                                  setRowPasswordError('');
                                }}
                                title="ביטול"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            {rowPasswordError && (
                              <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 600 }}>
                                {rowPasswordError}
                              </span>
                            )}
                            {enforcePasswordPolicy && newPasswordValue && (
                              <PasswordPolicyChecklist password={newPasswordValue} />
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ letterSpacing: '2px', color: '#5a717d', fontWeight: 700 }}>
                              ••••••••
                            </span>
                            <button
                              type="button"
                              className="btn-secondary-sm"
                              style={{ padding: '3px 9px', fontSize: '11.5px' }}
                              onClick={() => handleStartChangePassword(u)}
                            >
                              <KeyRound size={12} />
                              <span>שנה סיסמה</span>
                            </button>
                            {passwordSavedToastId === u.id && (
                              <span style={{ color: '#56997b', fontSize: '11.5px', fontWeight: 700 }}>
                                ✓ עודכן
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`status-pill ${u.active && !u.lockedOut ? 'active' : 'suspended'}`}
                          title={
                            u.lockedOut
                              ? `נחסם אוטומטית עקב ${MAX_FAILED_LOGIN_ATTEMPTS} ניסיונות כושלים – לחץ לשחרור`
                              : u.active
                              ? 'לחץ להשבתת המשתמש'
                              : 'לחץ להפעלת המשתמש מחדש'
                          }
                        >
                          {u.lockedOut
                            ? '🔒 נחסם'
                            : u.active
                            ? '✓ פעיל'
                            : '✕ מושבת'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleResendInvitationEmail(u)}
                            disabled={sendingInviteForUserId === u.id}
                            className="btn-secondary-sm"
                            style={{
                              padding: '4px 8px',
                              fontSize: '11.5px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              borderColor: '#bfdbfe'
                            }}
                            title="שלח מייל הזמנה והדרכה (Onboarding) עם סיסמה זמנית למשתמש זה"
                          >
                            <Mail size={13} />
                            <span>
                              {sendingInviteForUserId === u.id ? 'שולח...' : 'שלח מייל הזמנה'}
                            </span>
                          </button>

                          {(!isMainAdmin || u.lockedOut) && (
                            <button
                              type="button"
                              onClick={() =>
                                u.lockedOut ? handleUnlockUser(u.id) : handleToggleActive(u)
                              }
                              className="btn-secondary-sm"
                              style={{
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                background: u.active && !u.lockedOut ? '#fff7ed' : '#ecfdf5',
                                color: u.active && !u.lockedOut ? '#c2410c' : '#047857',
                                borderColor: u.active && !u.lockedOut ? '#fed7aa' : '#a7f3d0'
                              }}
                              title={
                                u.lockedOut
                                  ? 'שחרר חסימה אוטומטית והפעל מחדש'
                                  : u.active
                                  ? 'השבת משתמש זמנית (ללא מחיקה)'
                                  : 'הפעל משתמש מחדש'
                              }
                            >
                              {u.lockedOut ? (
                                <>
                                  <Unlock size={13} />
                                  <span>שחרר חסימה</span>
                                </>
                              ) : u.active ? (
                                <>
                                  <Ban size={13} />
                                  <span>השבת</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>הפעל</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="btn-danger-icon"
                            title="מחק משתמש לצמיתות מרשימת המורשים"
                            disabled={isMainAdmin}
                            style={{ opacity: isMainAdmin ? 0.35 : 1 }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button type="button" className="btn-primary-sm" onClick={onClose}>
            סגור ושמור
          </button>
        </div>
      </div>
    </div>
  );
}
