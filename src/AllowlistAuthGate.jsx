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
  Bell,
  Clock,
  FileSignature
} from 'lucide-react';
import {
  verifyAllowedUser,
  validatePasswordPolicy,
  MAX_FAILED_LOGIN_ATTEMPTS,
  DEFAULT_TRIAL_DAYS,
  computeTrialExpirationIso,
  isTrialUserExpired,
  getTrialRemainingDays,
  createPasswordCredentials,
  verifyUserPassword
} from './allowedUsers';
import { sendUserInvitationEmailInBackground } from './emailService';
import { fetchAllowedUsersFromCloud } from './firebaseBackend';

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
        background: 'var(--bg-warm-subtle)',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsAccountLockedError(false);

    // Ensure we always verify against the latest cloud allowed_users merged with any local users
    const latestCloudUsers = await fetchAllowedUsersFromCloud();
    let effectiveUsersList = allowedUsers;
    let needsCloudSync = false;

    if (Array.isArray(latestCloudUsers) && latestCloudUsers.length > 0) {
      const cloudByEmail = new Map(
        latestCloudUsers.map((cu) => [(cu.email || '').trim().toLowerCase(), cu])
      );
      const merged = [...latestCloudUsers];
      (allowedUsers || []).forEach((lu) => {
        const key = (lu.email || '').trim().toLowerCase();
        if (key && !cloudByEmail.has(key)) {
          merged.push(lu);
          needsCloudSync = true;
        }
      });
      effectiveUsersList = merged;
    }

    let result = verifyAllowedUser(email, accessCode, effectiveUsersList);

    // If cloud verification failed due to stale password on cloud, check if local allowedUsers has the updated password
    if (!result.allowed && Array.isArray(allowedUsers) && allowedUsers.length > 0) {
      const localCheck = verifyAllowedUser(email, accessCode, allowedUsers);
      if (localCheck.allowed && localCheck.user) {
        const healedList = effectiveUsersList.map((u) =>
          (u.email || '').trim().toLowerCase() === (localCheck.user.email || '').trim().toLowerCase()
            ? { ...u, ...localCheck.user, failedLoginAttempts: 0, lockedOut: false }
            : u
        );
        result = {
          allowed: true,
          user: localCheck.user,
          updatedUsersList: healedList
        };
        needsCloudSync = true;
      }
    }

    if (onUpdateAllowedUsers) {
      if (result.updatedUsersList && (Array.isArray(latestCloudUsers) || result.allowed)) {
        onUpdateAllowedUsers(result.updatedUsersList);
      } else if (needsCloudSync && result.allowed) {
        onUpdateAllowedUsers(effectiveUsersList);
      }
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
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
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
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
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
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

    if (isMandatoryFirstLogin && verifyUserPassword(currentUser, trimmed)) {
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
                    color: 'var(--text-muted)',
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


