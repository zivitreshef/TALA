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
  Copy,
  Check,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Ban,
  CheckCircle2
} from 'lucide-react';
import { verifyAllowedUser, validatePasswordPolicy } from './allowedUsers';

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

export function AllowlistAuthGate({ allowedUsers, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const result = verifyAllowedUser(email, accessCode, allowedUsers);
    if (!result.allowed) {
      setErrorMsg(result.reason);
      return;
    }

    onLoginSuccess(result.user);
  };

  return (
    <div className="auth-page-wrapper" dir="rtl">
      <div className="auth-card">
        <div className="auth-stained-glass-bar" />
        <div className="auth-logo-frame">
          <img src="./tala-logo.png" alt="TALA Logo" className="auth-logo-img" />
        </div>
        <h1 className="auth-title">מערכת TALA</h1>
        <p className="auth-subtitle">
          תוכנית עבודה שנתית – תל"א (תוכנית לימודים אישית) / תח"י (תוכנית חינוכית יחידנית)
        </p>

        <div className="auth-security-notice">
          <Lock size={15} />
          <span>הגישה למערכת מוגבלת לרשימת משתמשים מורשים בלבד (Allowed Users List)</span>
        </div>

        {errorMsg && (
          <div className="auth-error-banner">
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>כתובת דואר אלקטרוני מורשית:</label>
            <div className="input-with-icon">
              <Mail size={16} className="field-icon" />
              <input
                type="email"
                required
                placeholder="name@example.com"
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
                placeholder="הזן סיסמה אישית..."
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                title={showLoginPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                aria-label={showLoginPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-auth-submit">
            <UserCheck size={18} />
            <span>כניסה למערכת</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function UserSelfPasswordModal({
  isOpen,
  onClose,
  currentUser,
  enforcePasswordPolicy,
  onChangeOwnPassword
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
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl">
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px' }}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <KeyRound size={20} className="text-primary" />
            <h3>שינוי סיסמה אישית – {currentUser.name}</h3>
          </div>
          <button className="btn-icon-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                ✓ הסיסמה שלך עודכנה בהצלחה!
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                סיסמה חדשה:
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
            <button type="button" className="btn-secondary-sm" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="btn-primary-sm">
              <Check size={15} />
              <span>שמור סיסמה</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminAllowlistModal({
  isOpen,
  onClose,
  allowedUsers,
  onUpdateAllowedUsers,
  geminiApiKey,
  onChangeGeminiApiKey,
  enforcePasswordPolicy,
  onChangeEnforcePasswordPolicy,
  cloudSyncState
}) {
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    title: 'גננת / מורה להוראה מותאמת',
    role: 'teacher',
    accessCode: ''
  });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [addUserError, setAddUserError] = useState('');

  const [editingPasswordUserId, setEditingPasswordUserId] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showEditingPassword, setShowEditingPassword] = useState(false);
  const [rowPasswordError, setRowPasswordError] = useState('');
  const [passwordSavedToastId, setPasswordSavedToastId] = useState(null);
  const [copiedConfig, setCopiedConfig] = useState(false);

  if (!isOpen) return null;

  const handleAddUser = (e) => {
    e.preventDefault();
    setAddUserError('');
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

    const created = {
      id: 'u_' + Date.now(),
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      title: newUser.title.trim() || 'צוות חינוכי',
      role: newUser.role,
      accessCode: newUser.accessCode.trim(),
      active: true
    };

    onUpdateAllowedUsers([...allowedUsers, created]);
    setNewUser({
      name: '',
      email: '',
      title: 'גננת / מורה להוראה מותאמת',
      role: 'teacher',
      accessCode: ''
    });
    setShowNewUserPassword(false);
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
      allowedUsers.map((u) => (u.id === userId ? { ...u, accessCode: trimmed } : u))
    );
    setEditingPasswordUserId(null);
    setNewPasswordValue('');
    setShowEditingPassword(false);
    setPasswordSavedToastId(userId);
    setTimeout(() => setPasswordSavedToastId(null), 2500);
  };

  const handleToggleActive = (userObj) => {
    if (
      userObj.email?.toLowerCase() === 'zivit.reshef@gmail.com' &&
      userObj.active
    ) {
      alert('לא ניתן להשבית את מנהל/ת המערכת הראשי/ת.');
      return;
    }
    onUpdateAllowedUsers(
      allowedUsers.map((u) => (u.id === userObj.id ? { ...u, active: !u.active } : u))
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

  const handleCopyConfigCode = () => {
    const code = `export const DEFAULT_ALLOWED_USERS = ${JSON.stringify(allowedUsers, null, 2)};`;
    navigator.clipboard.writeText(code);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px' }}>
        <div className="modal-header">
          <div className="modal-header-title">
            <ShieldCheck size={22} className="text-primary" />
            <h3>ניהול רשימת משתמשים מורשים והגדרות אבטחה (Admin Settings)</h3>
          </div>
          <button className="btn-icon-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
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
                ? '☁️ מחובר לענן Firebase Firestore — משתמשים, סיסמאות, תלמידים, דוחות ומאגר המטרות נשמרים אוטומטית בענן ואינם מושפעים מעדכוני קוד / PR.'
                : '⚠️ מצב שמירה מקומי (ממתין להגדרת מפתחות Firebase Firestore).'}
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
                <span>מפתח Gemini AI (מוגדר ברמת מערכת למנהל בלבד):</span>
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
                  אכיפת מדיניות סיסמאות חזקה לפי תקן אבטחה (לפחות 8 תווים, אות גדולה A-Z, אות קטנה a-z, ספרה 0-9 ותו מיוחד)
                </span>
              </label>
              <span style={{ fontSize: '11.5px', color: '#475569', paddingRight: '24px' }}>
                ללא פקיעת תוקף או שמירת היסטוריית סיסמאות (No Password Retention). חל בעת יצירת משתמש חדש או שינוי סיסמה.
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', marginTop: 0 }}>
            רק משתמשים המופיעים ברשימה זו ומסומנים כ"פעילים" מורשים להתחבר לאתר ולצפות בתכניות העבודה. ניתן להשבית משתמש זמנית או להפעילו מחדש בכל עת ללא צורך במחיקתו.
          </p>

          <form onSubmit={handleAddUser} className="add-allowed-user-box">
            <h4>➕ הוספת משתמש/ת מורשה חדש/ה:</h4>
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
            <div className="form-grid-4">
              <input
                type="text"
                required
                placeholder="שם מלא (למשל: דנה לוי)"
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
                placeholder="תפקיד (למשל: גננת שילוב)"
                value={newUser.title}
                onChange={(e) => setNewUser({ ...newUser, title: e.target.value })}
              />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showNewUserPassword ? 'text' : 'password'}
                  required
                  placeholder="הגדר סיסמה אישית..."
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

            {enforcePasswordPolicy && newUser.accessCode && (
              <PasswordPolicyChecklist password={newUser.accessCode} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>הרשאה:</span>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="teacher">מורה / גננת</option>
                  <option value="admin">מנהל/ת מערכת (Admin)</option>
                </select>
              </label>
              <button type="submit" className="btn-primary-sm">
                <Plus size={15} />
                <span>הוסף לרשימת המורשים</span>
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
                  <th>סיסמה / קוד גישה</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {allowedUsers.map((u) => {
                  const isMainAdmin = u.email?.toLowerCase() === 'zivit.reshef@gmail.com';
                  return (
                    <tr key={u.id} style={{ opacity: u.active ? 1 : 0.55 }}>
                      <td>
                        <strong>{u.name}</strong>
                        {u.role === 'admin' && <span className="badge-admin">Admin</span>}
                      </td>
                      <td dir="ltr" style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                        {u.email}
                      </td>
                      <td>{u.title}</td>
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
                          className={`status-pill ${u.active ? 'active' : 'suspended'}`}
                          title={u.active ? 'לחץ להשבתת המשתמש' : 'לחץ להפעלת המשתמש מחדש'}
                        >
                          {u.active ? '✓ פעיל' : '✕ מושבת'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!isMainAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="btn-secondary-sm"
                              style={{
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                background: u.active ? '#fff7ed' : '#ecfdf5',
                                color: u.active ? '#c2410c' : '#047857',
                                borderColor: u.active ? '#fed7aa' : '#a7f3d0'
                              }}
                              title={u.active ? 'השבת משתמש זמנית (ללא מחיקה)' : 'הפעל משתמש מחדש'}
                            >
                              {u.active ? (
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

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn-secondary-sm" onClick={handleCopyConfigCode}>
            {copiedConfig ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedConfig ? 'הועתק לקליפבורד!' : 'העתק קוד הגדרת מורשים ל-GitHub'}</span>
          </button>
          <button type="button" className="btn-primary-sm" onClick={onClose}>
            סגור ושמור
          </button>
        </div>
      </div>
    </div>
  );
}
