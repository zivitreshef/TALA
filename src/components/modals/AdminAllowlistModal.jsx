import React, { useState, useEffect } from 'react';
import {
  X, ShieldAlert, Check, Plus, Trash2, Mail, RefreshCw, KeyRound, Globe, Save, UserCheck, AlertTriangle, ChevronRight, Lock, Unlock, Shield, Edit
} from 'lucide-react';
import { DEFAULT_ROLES, PRIMARY_ADMIN_EMAIL, shareCommonGroup } from '../../domain/permissions';
import { sendWelcomeEmailToUser, sendReportEmailInBackground } from '../../emailService';
import { createPasswordCredentials } from '../../allowedUsers';

const VENDORS = [
  { id: 'google', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI (GPT-4o)' },
  { id: 'github', label: 'GitHub Copilot (Models)' },
  { id: 'azure', label: 'Azure OpenAI' },
  { id: 'anthropic', label: 'Anthropic Claude' }
];

export default function AdminAllowlistModal({
  currentUser,
  isOpen,
  onClose,
  allowedUsers,
  onUpdateAllowedUsers,
  geminiApiKey,
  onChangeGeminiApiKey,
  enforcePasswordPolicy,
  onChangeEnforcePasswordPolicy,
  sessionTimeout,
  onChangeSessionTimeout,
  dataRetention,
  onChangeDataRetention,
  enforceTrialNda,
  onChangeEnforceTrialNda,
  adminRequests = [],
  onDismissAdminRequest,
  cloudSyncState,
  emailEngineConfig,
  onUpdateEmailEngineConfig
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'general' : 'sites'); // 'general', 'sites', 'surveys'

  const [localAiConfig, setLocalAiConfig] = useState({ vendor: 'google', apiKey: geminiApiKey || '' });
  const [localEmailConfig, setLocalEmailConfig] = useState(emailEngineConfig || { provider: 'apps_script', appsScriptUrl: '', senderName: '' });

  useEffect(() => {
    if (emailEngineConfig) setLocalEmailConfig(emailEngineConfig);
  }, [emailEngineConfig]);


  const handleSaveEmailConfig = () => {
    onUpdateEmailEngineConfig(localEmailConfig);
    alert('הגדרות שרת דואר עודכנו בהצלחה.');
  };

  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const handleTestEmail = async () => {
    if (!currentUser || !currentUser.email) return;
    try {
      setIsSendingTestEmail(true);
      await sendReportEmailInBackground({
        config: localEmailConfig,
        toEmail: currentUser.email,
        subject: 'TALA - בדיקת תקינות שרת דואר',
        htmlBody: `
          <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right; padding: 20px;">
            <h2 style="color: #4f46e5;">בדיקת חיבור דואר מערכת TALA</h2>
            <p>שלום ${currentUser.name},</p>
            <p>מייל זה נשלח כדי לאשר שחיבור ה-SMTP / Email Engine מוגדר ופועל בהצלחה.</p>
            <p>אם אתה רואה את המייל הזה, ההגדרות תקינות לחלוטין!</p>
          </div>
        `,
        textBody: 'מייל בדיקה - אם אתה רואה את זה, ההגדרות תקינות.',
        senderName: localEmailConfig.senderName || 'הנהלת TALA'
      });
      alert('מייל בדיקה נשלח בהצלחה לכתובת ' + currentUser.email + ' - אנא בדוק את תיבת הדואר הנכנס.');
    } catch (e) {
      alert('שגיאה בשליחת מייל הבדיקה: ' + e.message);
    } finally {
      setIsSendingTestEmail(false);
    }
  };


  const [newUser, setNewUser] = useState({ name: '', email: '', groups: [], role: 'teacher', active: true });
  const [editingUserId, setEditingUserId] = useState(null);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [addUserError, setAddUserError] = useState('');

  useEffect(() => {
    if (geminiApiKey) setLocalAiConfig({ vendor: 'google', apiKey: geminiApiKey });
  }, [geminiApiKey]);

  if (!isOpen) return null;

  // Filter visible users and sites for coordinators
  const displayedUsers = isAdmin 
    ? allowedUsers 
    : allowedUsers.filter(u => shareCommonGroup(currentUser, u));
  
  const allSites = isAdmin 
    ? Array.from(new Set(allowedUsers.flatMap(u => Array.isArray(u.groups) ? u.groups : (u.group ? [u.group] : []))))
    : (Array.isArray(currentUser.groups) ? currentUser.groups : (currentUser.group ? [currentUser.group] : []));

  // Filter roles a coordinator can assign
  const assignableRoles = isAdmin 
    ? DEFAULT_ROLES 
    : Object.fromEntries(Object.entries(DEFAULT_ROLES).filter(([id]) => id === 'teacher' || id === 'therapist'));

  const handleSaveAiConfig = () => {
    onChangeGeminiApiKey(localAiConfig.apiKey);
    alert('הגדרות בינה מלאכותית נשמרו והוחלו במערכת.');
  };

  const handleAddGroup = () => {
    const val = newGroupInput.trim();
    if (val && !newUser.groups.includes(val)) {
      // If not admin, verify they are only adding sites they are allowed to manage
      if (!isAdmin && !allSites.includes(val)) {
        setAddUserError('אינך מורשה לשייך לאתר זה.');
        return;
      }
      setNewUser({ ...newUser, groups: [...newUser.groups, val] });
    }
    setNewGroupInput('');
  };

  const handleRemoveGroup = (g) => {
    setNewUser({ ...newUser, groups: newUser.groups.filter(x => x !== g) });
  };

  const handleEditUser = (u) => {
    setEditingUserId(u.id);
    setNewUser({ name: u.name, email: u.email, groups: u.groups || [], role: u.role, active: u.active });
    setAddUserError('');
    setTimeout(() => {
      const formElement = document.getElementById('user-form-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setNewUser({ name: '', email: '', groups: [], role: 'teacher', active: true });
    setAddUserError('');
  };

  const handleSaveUser = () => {
    if (!newUser.email || !newUser.name) {
      setAddUserError('יש להזין שם וכתובת דוא"ל.');
      return;
    }

    if (!isAdmin && !assignableRoles[newUser.role]) {
      setAddUserError('אינך מורשה להקצות תפקיד זה.');
      return;
    }

    if (editingUserId) {
      // Check if email changed to an existing one (unlikely since we probably disable it, but just in case)
      const exists = allowedUsers.some(u => u.id !== editingUserId && u.email.toLowerCase() === newUser.email.toLowerCase());
      if (exists) {
        setAddUserError('משתמש עם דוא"ל זה כבר קיים במערכת.');
        return;
      }
      
      onUpdateAllowedUsers(allowedUsers.map(u => u.id === editingUserId ? { ...u, ...newUser } : u));
      handleCancelEdit();
    } else {
      const exists = allowedUsers.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (exists) {
        setAddUserError('משתמש עם דוא"ל זה כבר קיים במערכת.');
        return;
      }

      const tempPassword = Array.from({length: 8}, () => Math.random().toString(36).charAt(2)).join('');
      const creds = createPasswordCredentials(tempPassword);

      const newUserObj = {
        ...newUser,
        ...creds,
        mustChangePassword: true,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };

      onUpdateAllowedUsers([...allowedUsers, newUserObj]);

      // Send welcome email in background
      sendWelcomeEmailToUser({
        config: emailEngineConfig,
        userEmail: newUser.email,
        userName: newUser.name,
        userRoleName: DEFAULT_ROLES[newUser.role]?.name || newUser.role,
        tempPassword,
        loginUrl: window.location.origin
      }).catch(e => console.error('Failed to send welcome email', e));

      setNewUser({ name: '', email: '', groups: [], role: 'teacher', active: true });
      setAddUserError('');
    }
  };

  const handleDeleteUser = (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משתמש זה לצמיתות?')) {
      onUpdateAllowedUsers(allowedUsers.filter(u => u.id !== id));
    }
  };

  const handleToggleUserActive = (id, currentStatus) => {
    onUpdateAllowedUsers(allowedUsers.map(u => u.id === id ? { ...u, active: !currentStatus } : u));
  };

  const tabStyle = (tabId) => ({
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === tabId ? '3px solid #4f46e5' : '3px solid transparent',
    color: activeTab === tabId ? '#4f46e5' : '#64748b',
    fontWeight: activeTab === tabId ? 'bold' : 'normal',
    cursor: 'pointer',
    fontSize: '15px'
  });

  const cardStyle = {
    background: 'var(--bg-card)',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '6px',
    boxSizing: 'border-box'
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '1000px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-warm-subtle)', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div className="modal-header-title" style={{ display: 'flex', alignItems: 'center' }}>
            <Globe size={24} style={{ color: '#4f46e5', marginLeft: '10px' }} />
            <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold' }}>{isAdmin ? 'הגדרות מערכת' : 'ניהול צוות ומורשים'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: 'var(--bg-card)' }}>
          {isAdmin && (
            <button style={tabStyle('general')} onClick={() => setActiveTab('general')}>
              הגדרות כלליות
            </button>
          )}
          <button style={tabStyle('sites')} onClick={() => setActiveTab('sites')}>
            ניהול צוותים ואתרים
          </button>
          {isAdmin && (
            <button style={tabStyle('surveys')} onClick={() => setActiveTab('surveys')}>
              ניהול משובים
            </button>
          )}
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-warm-subtle)', padding: '24px' }}>
          
          {activeTab === 'general' && isAdmin && (
            <div>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 15px 0', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={18} /> תקינות המערכת
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-warm-subtle)', padding: '16px', borderRadius: '6px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>סטטוס חיבור ענן (Firestore):</span>
                  {cloudSyncState?.connected ? (
                    <span style={{ color: '#059669', background: '#d1fae5', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> מחובר ומסונכרן
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', background: '#fef3c7', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={14} /> ממתין לסנכרון...
                    </span>
                  )}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 15px 0', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} /> אכיפת מדיניות וניהול מידע
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'var(--bg-card)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>אכיפת סיסמאות מורכבות</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>חיוב המשתמשים בסיסמה חזקה (מינימום 8 תווים, אותיות, מספרים ותווים מיוחדים)</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={enforcePasswordPolicy} onChange={e => onChangeEnforcePasswordPolicy(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'var(--bg-warm-subtle)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>זמן התנתקות אוטומטי</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ניתוק משתמשים בעקבות חוסר פעילות (מומלץ לבטיחות מידע)</span>
                    </div>
                    <select style={{ ...inputStyle, width: '150px', marginTop: 0 }} value={sessionTimeout} onChange={(e) => onChangeSessionTimeout(e.target.value)}>
                      <option value="30m">30 דקות</option>
                      <option value="1h">שעה</option>
                      <option value="4h">4 שעות</option>
                      <option value="1d">יום אחד</option>
                      <option value="never">ללא ניתוק אוטומטי</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'var(--bg-warm-subtle)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>שמירת נתונים בארכיון</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>מחיקה קבועה (Hard Delete) של נתונים שישבו בארכיון זמן רב</span>
                    </div>
                    <select style={{ ...inputStyle, width: '150px', marginTop: 0 }} value={dataRetention} onChange={(e) => onChangeDataRetention(e.target.value)}>
                      <option value="6m">אחרי 6 חודשים</option>
                      <option value="12m">אחרי 12 חודשים</option>
                      <option value="3y">עד 3 שנים</option>
                      <option value="7y">עד 7 שנים</option>
                      <option value="forever">שמור לנצח</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'var(--bg-warm-subtle)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px' }}>אכיפת תנאי שימוש למתנסים (SaaS Trial NDA)</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>חיוב משתמשי התנסות (Trial) לאשר תנאי שימוש והסכם סודיות בכניסה הראשונה</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={enforceTrialNda} onChange={(e) => onChangeEnforceTrialNda(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    </label>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 15px 0', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} /> הגדרת מנוע בינה מלאכותית
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '13px' }}>ספק AI (Vendor)</label>
                    <select style={inputStyle} value={localAiConfig.vendor} onChange={e => setLocalAiConfig({...localAiConfig, vendor: e.target.value})}>
                      {VENDORS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: 'bold', fontSize: '13px' }}>מפתח API (API Key)</label>
                    <input type="password" style={inputStyle} value={localAiConfig.apiKey || ''} onChange={e => setLocalAiConfig({...localAiConfig, apiKey: e.target.value})} placeholder="הזן מפתח API..." />
                  </div>
                  {(localAiConfig.vendor === 'azure' || localAiConfig.vendor === 'openai') && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>מודל (Model) / Endpoint (עבור Azure)</label>
                      <input type="text" style={inputStyle} value={localAiConfig.model || ''} onChange={e => setLocalAiConfig({...localAiConfig, model: e.target.value})} placeholder="gpt-4o-mini / https://my-azure-resource.openai.azure.com/" />
                    </div>
                  )}
                </div>
                                  <div style={{ marginTop: '20px', textAlign: 'left' }}>
                    <button onClick={handleSaveAiConfig} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      שמור הגדרות AI
                    </button>
                  </div>
                </div>

                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={18} /> הגדרות שרת דואר
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>מנוע שילוח</label>
                      <select style={inputStyle} value={localEmailConfig.provider} onChange={e => setLocalEmailConfig({...localEmailConfig, provider: e.target.value})}>
                        <option value="apps_script">Google Apps Script</option>
                        <option value="emailjs">EmailJS</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>שם השולח</label>
                      <input type="text" style={inputStyle} value={localEmailConfig.senderName || ''} onChange={e => setLocalEmailConfig({...localEmailConfig, senderName: e.target.value})} placeholder="למשל: הנהלת בית הספר" />
                    </div>
                    {localEmailConfig.provider === 'apps_script' && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '13px' }}>כתובת Apps Script Web App URL</label>
                        <input type="text" style={inputStyle} value={localEmailConfig.appsScriptUrl || ''} onChange={e => setLocalEmailConfig({...localEmailConfig, appsScriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/..." />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>שירות חינמי של גוגל לשליחת מיילים אוטומטיים (תומך בקבצים מצורפים גדולים)</span>
                      </div>
                    )}
                    {localEmailConfig.provider === 'emailjs' && (
                      <>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Service ID</label>
                          <input type="text" style={inputStyle} value={localEmailConfig.emailjsServiceId || ''} onChange={e => setLocalEmailConfig({...localEmailConfig, emailjsServiceId: e.target.value})} placeholder="service_..." />
                        </div>
                        <div>
                          <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Template ID</label>
                          <input type="text" style={inputStyle} value={localEmailConfig.emailjsTemplateId || ''} onChange={e => setLocalEmailConfig({...localEmailConfig, emailjsTemplateId: e.target.value})} placeholder="template_..." />
                        </div>
                        <div>
                          <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Public Key</label>
                          <input type="text" style={inputStyle} value={localEmailConfig.emailjsPublicKey || ''} onChange={e => setLocalEmailConfig({...localEmailConfig, emailjsPublicKey: e.target.value})} placeholder="..." />
                        </div>
                      </>
                    )}
                  </div>
                                      <div style={{ marginTop: '20px', textAlign: 'left', display: 'flex', gap: '10px' }}>
                      <button onClick={handleSaveEmailConfig} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        שמור הגדרות שרת דואר
                      </button>
                      <button onClick={handleTestEmail} disabled={isSendingTestEmail} style={{ background: 'var(--bg-warm-subtle)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '10px 20px', borderRadius: '6px', cursor: isSendingTestEmail ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                        {isSendingTestEmail ? 'שולח...' : 'שלח מייל בדיקה אליי'}
                      </button>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'sites' && (
            <div>
              <div id="user-form-container" style={cardStyle}>
                <h3 style={{ margin: '0 0 15px 0' }}>{editingUserId ? 'עריכת פרטי משתמש' : 'הוספת משתמש חדש לצוות'}</h3>
                {addUserError && <div style={{ color: '#dc2626', background: '#fee2e2', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', fontWeight: 'bold' }}>{addUserError}</div>}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', alignItems: 'start' }}>
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>שם מלא</label>
                    <input type="text" style={inputStyle} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="ישראל ישראלי" />
                  </div>
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>אימייל</label>
                    <input type="email" style={{ ...inputStyle, background: editingUserId ? 'var(--bg-warm-subtle)' : 'white', cursor: editingUserId ? 'not-allowed' : 'text' }} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="israel@..." disabled={!!editingUserId} />
                  </div>
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>תפקיד</label>
                    <select style={inputStyle} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      {Object.entries(assignableRoles).map(([id, def]) => (
                        <option key={id} value={id}>{def.name}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                      {DEFAULT_ROLES[newUser.role]?.description}
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 1', paddingTop: '22px', display: 'flex', gap: '8px' }}>
                    <button onClick={handleSaveUser} style={{ flex: 1, background: editingUserId ? '#4f46e5' : '#059669', color: 'white', padding: '0 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '37px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {editingUserId ? <Save size={16} style={{ marginLeft: '6px' }} /> : <Plus size={16} style={{ marginLeft: '6px' }} />}
                      {editingUserId ? 'שמור שינויים' : 'הוסף'}
                    </button>
                    {editingUserId && (
                      <button onClick={handleCancelEdit} style={{ flex: 1, background: 'var(--bg-warm-subtle)', color: 'var(--text-muted)', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', height: '37px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        ביטול
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>שיוך לצוותים/אתרים (תגיות):</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    {newUser.groups.length === 0 && <span style={{ color: '#94a3b8', fontSize: '13px' }}>אין שיוכים. המשתמש ישויך להכל או לכלום בהתאם להרשאותיו.</span>}
                    {newUser.groups.map(g => (
                      <span key={g} style={{ background: '#e0e7ff', color: '#3730a3', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                        {g} <X size={14} style={{ cursor: 'pointer' }} onClick={() => handleRemoveGroup(g)} />
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" style={{ ...inputStyle, marginTop: 0, flex: 1 }} value={newGroupInput} onChange={e => setNewGroupInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddGroup()} placeholder='שם צוות / מתי"א...' list="site-suggestions" />
                    <datalist id="site-suggestions">
                      {allSites.map(s => <option key={s} value={s} />)}
                    </datalist>
                    <button onClick={handleAddGroup} style={{ background: 'var(--bg-warm-subtle)', color: 'var(--text-main)', border: '1px solid #cbd5e1', padding: '0 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>שייך צוות</button>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 15px 0' }}>משתמשים מורשים בצוותים שלך ({displayedUsers.length})</h3>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-warm-subtle)', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px' }}>שם מלא</th>
                        <th style={{ padding: '12px' }}>אימייל</th>
                        <th style={{ padding: '12px' }}>תפקיד במערכת</th>
                        <th style={{ padding: '12px' }}>שיוך לאתרים</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>סטטוס גישה</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.name}</td>
                          <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                          <td style={{ padding: '12px' }}>
                            <span title={DEFAULT_ROLES[u.role]?.description} style={{ background: 'var(--bg-warm-subtle)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', cursor: 'help' }}>
                              {DEFAULT_ROLES[u.role]?.name || u.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(Array.isArray(u.groups) ? u.groups : (u.group ? [u.group] : [])).map(g => (
                                <span key={g} style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{g}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {u.email !== PRIMARY_ADMIN_EMAIL && u.email !== currentUser.email && (
                              <button 
                                onClick={() => handleToggleUserActive(u.id, u.active !== false)} 
                                style={{ 
                                  background: u.active !== false ? '#d1fae5' : '#fee2e2', 
                                  color: u.active !== false ? '#059669' : '#dc2626',
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  padding: '4px 10px', 
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  margin: '0 auto'
                                }}
                              >
                                {u.active !== false ? <><Unlock size={12}/> פעיל</> : <><Lock size={12}/> נחסם</>}
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              {u.email !== PRIMARY_ADMIN_EMAIL && (
                                <button onClick={() => handleEditUser(u)} title="ערוך משתמש" style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                                  <Edit size={18} />
                                </button>
                              )}
                              {isAdmin && u.email !== PRIMARY_ADMIN_EMAIL && u.email !== currentUser.email && (
                                <button onClick={() => handleDeleteUser(u.id)} title="מחק לצמיתות" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'surveys' && isAdmin && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'var(--bg-warm-subtle)', padding: '20px', borderRadius: '50%', marginBottom: '20px' }}>
                <Mail size={48} style={{ color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: '20px', margin: '0 0 10px 0', color: 'var(--text-main)' }}>ניהול משובים וסקרים</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto', lineHeight: '1.6' }}>
                מודול זה יאפשר לך לצפות בסטטיסטיקות אודות המשובים שהוזנו על ידי משתמשי המערכת, וכן ליצור ולשלוח סקרים חדשים למורים ואנשי צוות.
              </p>
              <button disabled style={{ marginTop: '25px', background: '#e2e8f0', color: '#94a3b8', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'not-allowed' }}>
                בקרוב
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
