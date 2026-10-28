import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  CheckCheck,
  Lock,
  Users,
  BookOpen,
  Bell,
  KeyRound,
  FileText,
  Bookmark,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  PenTool
} from 'lucide-react';
import {
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
  addPrivateGoal,
  removePrivateGoal
} from '../../domain/userPreferences';
import {
  verifyUserPassword,
  validatePasswordPolicy
} from '../../allowedUsers';

function PasswordPolicyChecklist({ password }) {
  const { checks = [] } = validatePasswordPolicy(password || '');
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

export default function TeacherPreferencesModal({
  isOpen,
  onClose,
  currentUser,
  userPreferences = DEFAULT_USER_PREFERENCES,
  onSavePreferences,
  enforcePasswordPolicy,
  onChangeOwnPassword,
  isMandatoryFirstLogin = false,
  unreadSharedReports = [],
  allowedUsers = [],
  onOpenSharedReportNotification,
  onToggleNotifySharedReport,
  onDismissSharedReportNotification,
  onDismissAllSharedReports
}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (Array.isArray(unreadSharedReports) && unreadSharedReports.length > 0) {
      return 2;
    }
    return 0;
  });

  // Local draft state for preferences
  const [draftPrefs, setDraftPrefs] = useState(() =>
    normalizeUserPreferences(userPreferences)
  );
  const [saveToast, setSaveToast] = useState(false);

  // New private goal draft
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalDomain, setNewGoalDomain] = useState('רגשי-חברתי');
  const [newGoalEnv, setNewGoalEnv] = useState('כללי');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');
  const [passwordSavedSuccess, setPasswordSavedSuccess] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);

  // Sync draft when preferences change or modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftPrefs(normalizeUserPreferences(userPreferences));
      if (unreadSharedReports.length > 0 && !isMandatoryFirstLogin) {
        setActiveTab(2);
      } else {
        setActiveTab(0);
      }
    }
  }, [isOpen, userPreferences, unreadSharedReports.length, isMandatoryFirstLogin]);

  if (!isOpen || !currentUser) return null;

  const notificationsEnabled = currentUser.notifyOnSharedReport !== false;

  const resolveOwnerDisplayName = (studentObj) => {
    if (studentObj?.sharedByName) return studentObj.sharedByName;
    const ownerEmail = (studentObj?.ownerEmail || '').trim().toLowerCase();
    if (!ownerEmail) return 'עמית/ה לצוות';
    const found = (allowedUsers || []).find(
      (u) => (u.email || '').trim().toLowerCase() === ownerEmail
    );
    return found?.name || studentObj.ownerEmail;
  };

  const handleFieldChange = (field, value) => {
    setDraftPrefs((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAllPreferences = () => {
    if (onSavePreferences) {
      onSavePreferences(draftPrefs);
    }
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      if (onClose) onClose();
    }, 800);
  };

  const handleAddGoal = (e) => {
    e?.preventDefault?.();
    if (!newGoalText.trim()) return;
    const updated = addPrivateGoal(draftPrefs, {
      text: newGoalText.trim(),
      domain: newGoalDomain,
      environment: newGoalEnv
    });
    setDraftPrefs(updated);
    if (onSavePreferences) {
      onSavePreferences(updated);
    }
    setNewGoalText('');
  };

  const handleDeleteGoal = (goalId) => {
    const updated = removePrivateGoal(draftPrefs, goalId);
    setDraftPrefs(updated);
    if (onSavePreferences) {
      onSavePreferences(updated);
    }
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('גודל קובץ החתימה חייב להיות עד 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        handleFieldChange('signatureImage', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    const trimmed = newPassword.trim();
    if (!trimmed) {
      setPasswordErrorMsg('נא להזין סיסמה חדשה.');
      return;
    }

    if (isMandatoryFirstLogin && verifyUserPassword(currentUser, trimmed)) {
      setPasswordErrorMsg('נא לבחור סיסמה חדשה השונה מהסיסמה הזמנית שקיבלת במייל.');
      return;
    }

    if (enforcePasswordPolicy) {
      const check = validatePasswordPolicy(trimmed);
      if (!check.valid) {
        setPasswordErrorMsg(check.errorMessage);
        return;
      }
    }

    onChangeOwnPassword(trimmed);
    setPasswordSavedSuccess(true);
    setTimeout(() => {
      setPasswordSavedSuccess(false);
      setNewPassword('');
      if (onClose) onClose();
    }, 1000);
  };

  // -------------------------------------------------------------
  // Mandatory First Login Password Modal (Clean, Non-Tabbed)
  // -------------------------------------------------------------
  if (isMandatoryFirstLogin) {
    return (
      <div
        className="modal-backdrop"
        onClick={() => {}}
        dir="rtl"
      >
        <div
          className="modal-container"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '520px', borderTop: '5px solid #6b46c1' }}
        >
          <div className="modal-header">
            <div className="modal-header-title">
              <KeyRound size={20} className="text-primary" />
              <h3>ברוכים הבאים, {currentUser.name}! הגדרת סיסמה אישית</h3>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                לצורך שמירה על אבטחת המידע שלך ושל התלמידים, נא לבחור כעת <strong>סיסמה אישית קבועה</strong>.
              </div>

              {passwordErrorMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}>
                  {passwordErrorMsg}
                </div>
              )}

              {passwordSavedSuccess && (
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700 }}>
                  ✓ הסיסמה עודכנה בהצלחה!
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  בחר/י סיסמה אישית חדשה:
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
                      setPasswordErrorMsg('');
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
                {enforcePasswordPolicy && newPassword && (
                  <PasswordPolicyChecklist password={newPassword} />
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="submit" className="btn-primary-sm">
                <Check size={15} />
                <span>שמור סיסמה אישית והמשך למערכת</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Full Teacher Personal Preferences Modal (All 4 Tabs rendered with CSS visibility)
  // -------------------------------------------------------------
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderTop: '4px solid #2563eb',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 22px'
          }}
        >
          <div className="modal-header-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} style={{ color: '#ffffff' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                אזור אישי והתראות – {currentUser.name || currentUser.email}
              </h3>
              <div style={{ fontSize: '12px', color: '#bfdbfe', marginTop: '2px' }}>
                {currentUser.title || 'מורת שילוב / גננת'} • {currentUser.group || 'מתי"א מרכז'}
              </div>
            </div>
          </div>
          <button
            className="btn-icon-close"
            onClick={onClose}
            data-testid="user-profile-modal-close-btn"
            style={{ color: '#ffffff' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 16px',
            gap: '6px',
            overflowX: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            data-testid="tab-default-settings"
            style={{
              padding: '12px 14px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 0 ? '#1d4ed8' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 0 ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={16} />
            <span>1. ברירות מחדל לדוחות</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(1)}
            data-testid="tab-private-goals"
            style={{
              padding: '12px 14px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 1 ? '#1d4ed8' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 1 ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Bookmark size={16} />
            <span>2. בנק מטרות אישי ({draftPrefs.privateGoals?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(2)}
            data-testid="tab-notifications"
            style={{
              padding: '12px 14px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 2 ? '#1d4ed8' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 2 ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              position: 'relative'
            }}
          >
            <Bell size={16} />
            <span>3. התראות ותקשורת</span>
            {unreadSharedReports.length > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '999px',
                  padding: '1px 6px',
                  marginRight: '4px'
                }}
              >
                {unreadSharedReports.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(3)}
            data-testid="tab-profile-signature"
            style={{
              padding: '12px 14px',
              fontSize: '13.5px',
              fontWeight: 700,
              color: activeTab === 3 ? '#1d4ed8' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 3 ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <PenTool size={16} />
            <span>4. פרופיל, בס"ד וחתימה</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          
          {/* TAB 0: REPORT DEFAULTS */}
          <div style={{ display: activeTab === 0 ? 'flex' : 'none', flexDirection: 'column', gap: '16px' }}>
            {/* Report Type */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>סוג תוכנית עבודה כברירת מחדל</strong>
                <span style={{ fontSize: '11.5px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  נבחר אוטומטית לתלמיד חדש
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px' }}>
                קובע איזה סוג דו"ח ייפתח עבור תלמידים חדשים שתוסיפי:
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleFieldChange('defaultReportType', 'tala')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: draftPrefs.defaultReportType === 'tala' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: draftPrefs.defaultReportType === 'tala' ? '#eff6ff' : '#ffffff',
                    color: draftPrefs.defaultReportType === 'tala' ? '#1d4ed8' : '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  תל"א (כיתה/בי"ס לחינוך מיוחד)
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('defaultReportType', 'tachi')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: draftPrefs.defaultReportType === 'tachi' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: draftPrefs.defaultReportType === 'tachi' ? '#eff6ff' : '#ffffff',
                    color: draftPrefs.defaultReportType === 'tachi' ? '#1d4ed8' : '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  תח"י (שילוב בגן / כיתה רגילה)
                </button>
              </div>
            </div>

            {/* Date Format */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>פורמט תאריכים בדוחות, הדפסה ומיילים</strong>
                <span style={{ fontSize: '11.5px', background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  ייצוא רשמי
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px' }}>
                בחרי כיצד יוצגו התאריכים בראש הדוח המודפס, קובץ ה-Word והאימיילים:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'both', label: 'משולב (עברי + לועזי)', desc: 'למשל: כ״ח בתשרי תשפ״ז | 28.10.2026' },
                  { id: 'gregorian', label: 'לועזי בלבד', desc: 'למשל: 28.10.2026' },
                  { id: 'hebrew', label: 'עברי בלבד', desc: 'למשל: כ״ח בתשרי תשפ״ז' }
                ].map((df) => (
                  <button
                    key={df.id}
                    type="button"
                    onClick={() => handleFieldChange('reportDateFormat', df.id)}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      padding: '10px',
                      borderRadius: '8px',
                      border: draftPrefs.reportDateFormat === df.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: draftPrefs.reportDateFormat === df.id ? '#eff6ff' : '#ffffff',
                      color: draftPrefs.reportDateFormat === df.id ? '#1d4ed8' : '#334155',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{df.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{df.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Mode & Educational Framework */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                  ברירת מחדל לשם התלמיד/ה
                </strong>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                  מומלץ ראשי תיבות בעבודה מול תלמידים או הורים בכיתה:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('defaultPrivacyMode', 'full_name')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: draftPrefs.defaultPrivacyMode === 'full_name' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: draftPrefs.defaultPrivacyMode === 'full_name' ? '#eff6ff' : '#ffffff',
                      color: draftPrefs.defaultPrivacyMode === 'full_name' ? '#1d4ed8' : '#334155',
                      fontWeight: 600,
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    שם מלא גלוי
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('defaultPrivacyMode', 'acronym')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: draftPrefs.defaultPrivacyMode === 'acronym' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: draftPrefs.defaultPrivacyMode === 'acronym' ? '#eff6ff' : '#ffffff',
                      color: draftPrefs.defaultPrivacyMode === 'acronym' ? '#1d4ed8' : '#334155',
                      fontWeight: 600,
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    ראשי תיבות (ד.כ.)
                  </button>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                  מסגרת חינוכית קבועה (גן / בי"ס)
                </strong>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                  יוזן אוטומטית בכל תלמיד חדש שתפתחי:
                </div>
                <input
                  type="text"
                  value={draftPrefs.defaultEducationalFramework}
                  onChange={(e) => handleFieldChange('defaultEducationalFramework', e.target.value)}
                  placeholder="למשל: גן רקפת / בי״ס רעות"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* AI Writing Tone */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={16} style={{ color: '#2563eb' }} />
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>סגנון ניסוח ה-AI המועדף בסיכומי הערכה</strong>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px' }}>
                קובע כיצד המערכת תציע ניסוחים בסיכום תפקוד ובקשות הערכה:
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleFieldChange('aiWritingTone', 'formal')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: draftPrefs.aiWritingTone === 'formal' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: draftPrefs.aiWritingTone === 'formal' ? '#eff6ff' : '#ffffff',
                    color: draftPrefs.aiWritingTone === 'formal' ? '#1d4ed8' : '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'right'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>סגנון פדגוגי רשמי (חוזר מנכ"ל)</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>שפה מקצועית ומדדים אופרטיביים מובהקים</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('aiWritingTone', 'empathetic')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: draftPrefs.aiWritingTone === 'empathetic' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: draftPrefs.aiWritingTone === 'empathetic' ? '#eff6ff' : '#ffffff',
                    color: draftPrefs.aiWritingTone === 'empathetic' ? '#1d4ed8' : '#334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'right'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>סגנון מעצים ומונגש להורים</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>דגש על מוקדי כוח ושפה חמה ללא ז'רגון מאיים</div>
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: PRIVATE GOAL BANK */}
          <div style={{ display: activeTab === 1 ? 'flex' : 'none', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px 14px' }}>
              <strong style={{ fontSize: '13.5px', color: '#1e3a8a' }}>🔒 בנק המטרות האישי והפרטי שלך:</strong>
              <p style={{ fontSize: '12.5px', color: '#334155', margin: '4px 0 0 0' }}>
                מטרות אלו נשמרות בחשבונך בלבד ואינן משותפות עם שאר המורים או בנק המתי"א הכללי. הן תופענה לבחירה מיידית תחת לשונית "המטרות הפרטיות שלי" בעת עריכת דוח תלמיד/ה.
              </p>
            </div>

            <form onSubmit={handleAddGoal} style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>+ הוספת מטרה פרטית חדשה:</strong>
              <textarea
                rows={2}
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="הקלידי ניסוח מטרה פדגוגית אישית (למשל: התלמיד ישתף פעולה במשחק תורות...)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>תחום:</label>
                  <select
                    value={newGoalDomain}
                    onChange={(e) => setNewGoalDomain(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="רגשי-חברתי">רגשי-חברתי</option>
                    <option value="שפתי-תקשורתי">שפתי-תקשורתי</option>
                    <option value="מוטורי">מוטורי</option>
                    <option value="לימודי">לימודי</option>
                    <option value="התנהגותי">התנהגותי</option>
                    <option value="עצמאות והתארגנות">עצמאות והתארגנות</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>סביבה:</label>
                  <select
                    value={newGoalEnv}
                    onChange={(e) => setNewGoalEnv(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  >
                    <option value="כללי">כללי</option>
                    <option value="חצר / משחק">חצר / משחק</option>
                    <option value="מפגש / מליאה">מפגש / מליאה</option>
                    <option value="עבודה פרטנית">עבודה פרטנית</option>
                    <option value="ארוחה">ארוחה</option>
                    <option value="מעברים">מעברים</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!newGoalText.trim()}
                  style={{
                    marginRight: 'auto',
                    background: newGoalText.trim() ? '#2563eb' : '#cbd5e1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: newGoalText.trim() ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Plus size={14} />
                  <span>הוסף למאגר הפרטי שלי</span>
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {draftPrefs.privateGoals?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
                  טרם נשמרו מטרות פרטיות. הוסיפי מטרות למעלה כדי שיהיו זמינות עבורך בלבד בכל דוח.
                </div>
              ) : (
                draftPrefs.privateGoals.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: 600, lineHeight: 1.45 }}>
                        {g.text}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                        <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          תחום: {g.domain}
                        </span>
                        <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          סביבה: {g.environment}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id)}
                      title="מחק מטרה פרטית"
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        color: '#dc2626',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TAB 2: NOTIFICATIONS & COMMUNICATION */}
          <div style={{ display: activeTab === 2 ? 'flex' : 'none', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                background: unreadSharedReports.length > 0
                  ? 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)'
                  : '#f8fafc',
                border: unreadSharedReports.length > 0 ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Bell size={17} style={{ color: unreadSharedReports.length > 0 ? '#1d4ed8' : '#64748b' }} />
                  <strong style={{ fontSize: '13.5px', color: '#1e3a5f' }}>
                    התראות על דו"חות חדשים ששותפו עמך
                  </strong>
                  {unreadSharedReports.length > 0 && (
                    <span style={{ background: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '1px 8px', borderRadius: '999px' }}>
                      {unreadSharedReports.length} חדשים
                    </span>
                  )}
                </div>

                {onToggleNotifySharedReport && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => onToggleNotifySharedReport(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span>אפשר התראות על דו"ח משותף חדש</span>
                  </label>
                )}
              </div>

              {!notificationsEnabled ? (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  ההתראות על דו"חות משותפים חדשים כבויות כעת. סמן/י את התיבה למעלה כדי להפעילן.
                </div>
              ) : unreadSharedReports.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  אין כעת התראות חדשות על דו"חות או תוכניות עבודה ששותפו עמך.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>
                      לחץ/י על ההתראה כדי לפתוח מיד את הדו"ח, או סמן/י כנקרא להסרת ההתראה:
                    </div>
                    {onDismissAllSharedReports && unreadSharedReports.length > 1 && (
                      <button
                        type="button"
                        data-testid="dismiss-all-shared-reports-btn"
                        onClick={onDismissAllSharedReports}
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="סמן את כל ההתראות כנקראות וכבה את ההתראה"
                      >
                        <CheckCheck size={13} />
                        <span>סמן הכל כנקרא</span>
                      </button>
                    )}
                  </div>
                  {unreadSharedReports.map((st) => {
                    const ownerName = resolveOwnerDisplayName(st);
                    const userEmail = (currentUser?.email || '').trim().toLowerCase();
                    const relevantMessage = Array.isArray(st.teamMessages)
                      ? [...st.teamMessages]
                          .reverse()
                          .find(
                            (m) =>
                              !m.isDeleted &&
                              (m.type === 'share_handoff' ||
                                (m.recipientEmail && m.recipientEmail.toLowerCase() === userEmail))
                          ) || st.teamMessages.filter((m) => !m.isDeleted).slice(-1)[0]
                      : null;
                    return (
                      <div
                        key={st.id}
                        data-testid={`shared-report-notification-card-${st.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          width: '100%',
                          textAlign: 'right',
                          background: '#ffffff',
                          border: '1.5px solid #93c5fd',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
                        }}
                      >
                        <div
                          onClick={() => {
                            if (onOpenSharedReportNotification) {
                              onOpenSharedReportNotification(st);
                            }
                          }}
                          style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <Users size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                            <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                              {st.studentName || 'תלמיד/ה ללא שם'}
                            </strong>
                            {st.educationalFramework && (
                              <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '1px 7px', fontWeight: 600 }}>
                                {st.educationalFramework}
                              </span>
                            )}
                            {st.isLocked && (
                              <span
                                data-testid="locked-shared-report-badge"
                                style={{
                                  fontSize: '11px',
                                  background: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  borderRadius: '999px',
                                  padding: '1px 7px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="התוכנית נעולה לעריכה - קריאה בלבד"
                              >
                                <Lock size={11} style={{ color: '#d97706' }} />
                                <span>קריאה בלבד</span>
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#475569' }}>
                            שותף עמך על ידי: <strong>{ownerName}</strong>
                            {st.schoolYear ? ` • תשפ"ו (${st.schoolYear})` : ''}
                          </span>
                          {relevantMessage && relevantMessage.text && (
                            <div style={{ fontSize: '11.5px', color: '#0369a1', background: '#f0f9ff', padding: '3px 8px', borderRadius: '6px', marginTop: '2px' }}>
                              ✉️ הודעה: {relevantMessage.text}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {onDismissSharedReportNotification && (
                            <button
                              type="button"
                              data-testid={`dismiss-shared-report-btn-${st.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDismissSharedReportNotification(st);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                padding: '6px 9px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              title="סמן כנקרא והסר התראה זו"
                            >
                              <Check size={13} />
                              <span>סמן כנקרא</span>
                            </button>
                          )}
                          <button
                            type="button"
                            data-testid={`open-shared-report-btn-${st.id}`}
                            onClick={() => {
                              if (onOpenSharedReportNotification) {
                                onOpenSharedReportNotification(st);
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '6px 11px',
                              borderRadius: '8px',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer'
                            }}
                          >
                            <BookOpen size={13} />
                            <span>פתח דו"ח</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Email Notifications Settings */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong style={{ fontSize: '14px', color: '#1e293b' }}>התראות דוא"ל ישירות (לכתובת {currentUser.email}):</strong>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draftPrefs.notifyOnTeamMessage}
                  onChange={(e) => handleFieldChange('notifyOnTeamMessage', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span>שלח מייל כאשר איש צוות כותב הודעה חדשה ב-Team Chat (צ'אט צוותי)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={draftPrefs.monthlyPedagogicalReminder}
                  onChange={(e) => handleFieldChange('monthlyPedagogicalReminder', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span>תזכורת חודשית במייל למעקב יעדים (ריכוז תלמידים שלא עודכנו מעל 45 יום)</span>
              </label>

              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  תדירות התראות דוא"ל:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'instant', label: 'מיידי' },
                    { id: 'daily_digest', label: 'סיכום יומי (16:00)' },
                    { id: 'in_app_only', label: 'בתוך המערכת בלבד' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleFieldChange('notificationFrequency', opt.id)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: draftPrefs.notificationFrequency === opt.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: draftPrefs.notificationFrequency === opt.id ? '#eff6ff' : '#ffffff',
                        color: draftPrefs.notificationFrequency === opt.id ? '#1d4ed8' : '#334155',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TAB 3: PROFESSIONAL PROFILE, BESAD & SIGNATURE */}
          <div style={{ display: activeTab === 3 ? 'flex' : 'none', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong style={{ fontSize: '14px', color: '#1e293b' }}>פרטי מורה קבועים בדוחות:</strong>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    שם מלא כפי שיופיע בדוחות:
                  </label>
                  <input
                    type="text"
                    value={draftPrefs.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    placeholder={currentUser.name || 'שם מלא'}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    תואר / תפקיד מקצועי:
                  </label>
                  <input
                    type="text"
                    value={draftPrefs.professionalTitle}
                    onChange={(e) => handleFieldChange('professionalTitle', e.target.value)}
                    placeholder={currentUser.title || 'מורת שילוב / גננת'}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  שיוך מוסדי / מתי"א:
                </label>
                <input
                  type="text"
                  value={draftPrefs.institutionalAffiliation}
                  onChange={(e) => handleFieldChange('institutionalAffiliation', e.target.value)}
                  placeholder={currentUser.group || 'מתי״א מרכז'}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Besad Option */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draftPrefs.showBesad}
                    onChange={(e) => handleFieldChange('showBesad', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                  />
                  <strong style={{ fontSize: '14px', color: '#1e293b' }}>
                    הצג בס"ד בראש כל דוח והדפסה (לציבור הדתי / מסורתי)
                  </strong>
                </label>
                <span style={{ fontSize: '11.5px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  ראש מסמך רשמי
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', paddingRight: '24px' }}>
                יופיע בפינה השמאלית העליונה של כל עמוד בהדפסה, קובץ Word וב-PDF.
              </div>
              {draftPrefs.showBesad && (
                <div style={{ paddingRight: '24px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>נוסח מועדף:</span>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('besadText', 'בס"ד')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: draftPrefs.besadText === 'בס"ד' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: draftPrefs.besadText === 'בס"ד' ? '#eff6ff' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    בס"ד
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('besadText', 'ב"ה')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: draftPrefs.besadText === 'ב"ה' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: draftPrefs.besadText === 'ב"ה' ? '#eff6ff' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ב"ה
                  </button>
                </div>
              )}
            </div>

            {/* Digital Graphical Signature */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#1e293b' }}>חתימה גרפית דיגיטלית להטמעה אוטומטית</strong>
                <span style={{ fontSize: '11.5px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                  מוטמע בסוף הדוח
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                העלי סריקה או צילום של חתימתך (קובץ PNG שקוף מומלץ עד 2MB), והמערכת תטמיע אותה אוטומטית במלבן החתימות בכל הדוחות:
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label
                  style={{
                    border: '2px dashed #93c5fd',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    padding: '12px 18px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1d4ed8'
                  }}
                >
                  <PenTool size={16} />
                  <span>העלאת תמונת חתימה</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleSignatureUpload}
                    style={{ display: 'none' }}
                  />
                </label>

                {draftPrefs.signatureImage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>תצוגה מקדימה:</span>
                    <img
                      src={draftPrefs.signatureImage}
                      alt="חתימה אישית"
                      style={{ maxHeight: '36px', maxWidth: '120px', objectFit: 'contain' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleFieldChange('signatureImage', null)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                    >
                      הסר
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Password Change Sub-section */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
              <button
                type="button"
                data-testid="toggle-change-password-section-btn"
                onClick={() => setIsPasswordSectionOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={16} style={{ color: '#64748b' }} />
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>
                    שינוי סיסמה אישית
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    (אופציונלי)
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                  {isPasswordSectionOpen ? 'סגור עריכה' : 'החלף סיסמה...'}
                </span>
              </button>

              {isPasswordSectionOpen && (
                <form onSubmit={handlePasswordSubmit} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {passwordErrorMsg && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>
                      {passwordErrorMsg}
                    </div>
                  )}
                  {passwordSavedSuccess && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                      ✓ הסיסמה עודכנה בהצלחה!
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="הזן סיסמה חדשה..."
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordErrorMsg('');
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 36px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        style={{ position: 'absolute', left: '8px', top: '7px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      data-testid="save-new-password-inline-btn"
                      disabled={!newPassword.trim()}
                      style={{
                        background: newPassword.trim() ? '#2563eb' : '#cbd5e1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: newPassword.trim() ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      שמור סיסמה
                    </button>
                  </div>
                  {enforcePasswordPolicy && newPassword && (
                    <PasswordPolicyChecklist password={newPassword} />
                  )}
                </form>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 22px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>
            {saveToast ? '✓ ההגדרות נשמרו בהצלחה!' : '● ההגדרות מסונכרנות אוטומטית לענן'}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-primary-sm"
              data-testid="user-profile-modal-close-btn"
              onClick={onClose}
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
            >
              סגור
            </button>
            <button
              type="button"
              className="btn-primary-sm"
              data-testid="save-teacher-preferences-btn"
              onClick={handleSaveAllPreferences}
              style={{ background: '#2563eb', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Check size={15} />
              <span>שמור את כל ההגדרות</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
