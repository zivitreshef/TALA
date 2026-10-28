import React from 'react';
import { Users, X, ShieldAlert, Lock } from 'lucide-react';
import { getShareableColleagues, getUserGroup } from '../../domain/permissions';

const QUICK_CHIPS = [
  'נא להוסיף מטרות טיפוליות',
  'לעיונך והערות לקראת ועדה',
  'בדיקת סטטוס והתייעצות'
];

const LOCKED_QUICK_CHIPS = [
  'לעיון בלבד (התוכנית נעולה)',
  'לעיונך והערות לקראת ועדה',
  'בדיקת סטטוס והתייעצות'
];

export default function ShareTeamModal({
  isOpen,
  onClose,
  formData,
  currentUser,
  allowedUsers,
  onSaveShareSettings,
  onToggleShareColleague
}) {
  const [selectedEmails, setSelectedEmails] = React.useState(() =>
    (formData?.sharedWith || []).map((e) => String(e || '').trim().toLowerCase())
  );
  const [handoffNote, setHandoffNote] = React.useState('');

  React.useEffect(() => {
    if (isOpen && formData) {
      const current = (formData.sharedWith || []).map((e) =>
        String(e || '').trim().toLowerCase()
      );
      setSelectedEmails(current);
      setHandoffNote('');
    }
  }, [isOpen, formData?.id]);

  if (!isOpen) return null;

  const isLocked = Boolean(formData?.isLocked);
  const activeChips = isLocked ? LOCKED_QUICK_CHIPS : QUICK_CHIPS;
  const myGroup = getUserGroup(currentUser, allowedUsers);
  const visibleUsers = getShareableColleagues(currentUser, allowedUsers);

  const handleToggleColleague = (colEmail) => {
    setSelectedEmails((prev) =>
      prev.includes(colEmail)
        ? prev.filter((e) => e !== colEmail)
        : [...prev, colEmail]
    );
  };

  const handleFinish = () => {
    const initialShared = (formData?.sharedWith || []).map((e) =>
      String(e || '').trim().toLowerCase()
    );
    const cleanNote = handoffNote.trim();
    const hasChanges =
      selectedEmails.length !== initialShared.length ||
      selectedEmails.some((e) => !initialShared.includes(e)) ||
      initialShared.some((e) => !selectedEmails.includes(e));

    if (hasChanges || cleanNote) {
      if (onSaveShareSettings) {
        onSaveShareSettings({
          selectedEmails,
          handoffNote: cleanNote
        });
      } else if (onToggleShareColleague) {
        const newlyAdded = selectedEmails.filter((e) => !initialShared.includes(e));
        const removed = initialShared.filter((e) => !selectedEmails.includes(e));
        removed.forEach((e) => onToggleShareColleague(e));
        newlyAdded.forEach((e) => onToggleShareColleague(e, cleanNote));
      }
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card email-report-modal"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header email-modal-header">
          <div className="modal-title-row">
            <Users size={22} />
            <div>
              <h3>שיתוף תוכנית עם צוות / מתי"א</h3>
              <p className="modal-subtitle">
                בחרי אנשי צוות שיוכלו לצפות ולעבוד על התוכנית של{' '}
                <strong>{formData?.name || 'התלמיד/ה'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="סגור"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body email-modal-body">
          {isLocked && (
            <div
              data-testid="locked-plan-warning"
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: '#92400e',
                fontSize: '12.5px',
                fontWeight: 600,
                lineHeight: 1.4
              }}
            >
              <Lock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
              <span>
                שימי לב: תוכנית העבודה נעולה לעריכה. אנשי הצוות שישותפו יוכלו לצפות בתוכנית במצב קריאה בלבד ולא יוכלו לערוך או להוסיף מטרות.
              </span>
            </div>
          )}

          {!myGroup ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '24px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#991b1b',
                gap: '10px'
              }}
            >
              <ShieldAlert size={36} color="#dc2626" />
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                אינך משויך/ת לצוות או מתי"א
              </div>
              <p style={{ fontSize: '13px', margin: 0, color: '#7f1d1d', lineHeight: 1.5 }}>
                מטעמי אבטחת מידע והגנת פרטיות התלמידים, שיתוף תוכניות עבודה מתאפשר אך ורק בין אנשי צוות השייכים לאותו צוות או מתי"א.
              </p>
              <p style={{ fontSize: '12px', margin: 0, color: '#991b1b', fontWeight: 500 }}>
                כדי לשתף תוכניות עבודה, יש להגדיר שיוך צוות/מתי"א בפרופיל המשתמש דרך מנהלת המערכת.
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                  חברי צוות: <strong>{myGroup}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  ({visibleUsers.length} אנשי צוות)
                </span>
              </div>

              {visibleUsers.length === 0 ? (
                <p
                  style={{
                    fontSize: '13.5px',
                    color: '#64748b',
                    textAlign: 'center',
                    padding: '20px 0',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1'
                  }}
                >
                  לא נמצאו אנשי צוות נוספים הרשומים ב<strong>{myGroup}</strong> לשיתוף.
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    paddingLeft: '4px'
                  }}
                >
                  {visibleUsers.map((colleague) => {
                    const colEmail = (colleague.email || '').trim().toLowerCase();
                    const isShared = selectedEmails.includes(colEmail);
                    return (
                      <label
                        key={colEmail}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: isShared ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                          background: isShared ? '#f5f3ff' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isShared}
                            onChange={() => handleToggleColleague(colEmail)}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                              {colleague.name || colleague.email}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {colleague.role || 'איש/אשת צוות'}
                              {colleague.title ? ` • ${colleague.title}` : ''}
                            </div>
                          </div>
                        </div>
                        {isShared && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#6d28d9',
                              background: '#ede9fe',
                              padding: '2px 8px',
                              borderRadius: '999px'
                            }}
                          >
                            משותף
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {visibleUsers.length > 0 && (
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                      ✉️ הודעת פתיחה והנחיות לשיתוף (אופציונלי)
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>יישמר בשיח הצוות ויישלח בלחיצה על סיום</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {activeChips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setHandoffNote(chip)}
                        style={{
                          background: handoffNote === chip ? '#ede9fe' : '#f8fafc',
                          border: handoffNote === chip ? '1px solid #a78bfa' : '1px solid #cbd5e1',
                          color: handoffNote === chip ? '#5b21b6' : '#475569',
                          borderRadius: '999px',
                          padding: '3px 9px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={handoffNote}
                    onChange={(e) => setHandoffNote(e.target.value)}
                    placeholder={
                      isLocked
                        ? 'לדוגמה: היי, משתפת לעיונך בלבד (התוכנית נעולה לקראת ועדה)...'
                        : 'לדוגמה: היי, שיתפתי איתך את התוכנית לקראת הוועדה. אנא הוסיפי מטרות...'
                    }
                    maxLength={800}
                    rows={2}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      fontSize: '12.5px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      resize: 'none',
                      fontFamily: 'inherit',
                      color: '#1e293b'
                    }}
                  />
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="btn-submit-email" onClick={handleFinish}>
              <span>סיום</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
