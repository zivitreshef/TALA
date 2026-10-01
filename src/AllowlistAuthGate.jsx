import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, AlertTriangle, Sparkles, UserCheck, Plus, Trash2, Copy, Check, X } from 'lucide-react';
import { verifyAllowedUser } from './allowedUsers';

export function AllowlistAuthGate({ allowedUsers, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
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

  const handleQuickDemoFill = (user) => {
    setEmail(user.email);
    setAccessCode(user.accessCode);
    setErrorMsg('');
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
            <div className="input-with-icon">
              <KeyRound size={16} className="field-icon" />
              <input
                type="password"
                required
                placeholder="הזן קוד גישה..."
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-submit">
            <UserCheck size={18} />
            <span>כניסה למערכת</span>
          </button>
        </form>

        <div className="auth-quick-access">
          <span className="quick-access-label">כניסה מהירה לחשבונות מוגדרים (לבדיקה):</span>
          <div className="quick-access-chips">
            {allowedUsers.filter(u => u.active).map((u) => (
              <button
                key={u.id}
                type="button"
                className="quick-chip"
                onClick={() => handleQuickDemoFill(u)}
              >
                <strong>{u.name}</strong>
                <small>({u.role === 'admin' ? 'מנהלת מערכת' : 'מורה מורשית'})</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminAllowlistModal({ isOpen, onClose, allowedUsers, onUpdateAllowedUsers }) {
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    title: 'גננת / מורה להוראה מותאמת',
    role: 'teacher',
    accessCode: '1234'
  });
  const [copiedConfig, setCopiedConfig] = useState(false);

  if (!isOpen) return null;

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) return;

    const exists = allowedUsers.some(
      (u) => u.email.trim().toLowerCase() === newUser.email.trim().toLowerCase()
    );
    if (exists) {
      alert('כתובת אימייל זו כבר קיימת ברשימת המורשים.');
      return;
    }

    const created = {
      id: 'u_' + Date.now(),
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      title: newUser.title.trim() || 'צוות חינוכי',
      role: newUser.role,
      accessCode: newUser.accessCode.trim() || '1234',
      active: true
    };

    onUpdateAllowedUsers([...allowedUsers, created]);
    setNewUser({
      name: '',
      email: '',
      title: 'גננת / מורה להוראה מותאמת',
      role: 'teacher',
      accessCode: '1234'
    });
  };

  const handleToggleActive = (id) => {
    onUpdateAllowedUsers(
      allowedUsers.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
    );
  };

  const handleDeleteUser = (id, emailStr) => {
    if (emailStr === 'zivit.reshef@gmail.com') {
      alert('לא ניתן למחוק את מנהל/ת המערכת הראשי/ת.');
      return;
    }
    if (window.confirm('האם להסיר משתמש זה מרשימת המורשים?')) {
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
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <div className="modal-header-title">
            <ShieldCheck size={22} className="text-primary" />
            <h3>ניהול רשימת משתמשים מורשים (Allowed Users List)</h3>
          </div>
          <button className="btn-icon-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '13px', color: '#475569', marginTop: 0 }}>
            רק משתמשים המופיעים ברשימה זו ומסומנים כ"פעילים" מורשים להתחבר לאתר ולצפות בתכניות העבודה.
          </p>

          <form onSubmit={handleAddUser} className="add-allowed-user-box">
            <h4>➕ הוספת משתמש/ת מורשה חדש/ה:</h4>
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
              <input
                type="text"
                required
                placeholder="קוד גישה אישי"
                value={newUser.accessCode}
                onChange={(e) => setNewUser({ ...newUser, accessCode: e.target.value })}
              />
            </div>
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
                  <th>קוד גישה</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {allowedUsers.map((u) => (
                  <tr key={u.id} style={{ opacity: u.active ? 1 : 0.55 }}>
                    <td>
                      <strong>{u.name}</strong>
                      {u.role === 'admin' && <span className="badge-admin">Admin</span>}
                    </td>
                    <td dir="ltr" style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>{u.email}</td>
                    <td>{u.title}</td>
                    <td><code>{u.accessCode}</code></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u.id)}
                        className={`status-pill ${u.active ? 'active' : 'suspended'}`}
                      >
                        {u.active ? '✓ מורשה פעיל' : '✕ מושהה'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="btn-danger-icon"
                        title="הסר מרשימת המורשים"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
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
