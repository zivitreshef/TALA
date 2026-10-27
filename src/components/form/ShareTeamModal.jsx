import React from 'react';
import { Users, X, ShieldAlert } from 'lucide-react';
import { getShareableColleagues, getUserGroup } from '../../domain/permissions';

const QUICK_CHIPS = [
  'נא להוסיף מטרות טיפוליות',
  'לעיונך והערות לקראת ועדה',
  'בדיקת סטטוס והתייעצות'
];

export default function ShareTeamModal({
  isOpen,
  onClose,
  formData,
  currentUser,
  allowedUsers,
  onToggleShareColleague
}) {
  const [handoffNote, setHandoffNote] = React.useState('');

  if (!isOpen) return null;

  const myGroup = getUserGroup(currentUser, allowedUsers);
  const visibleUsers = getShareableColleagues(currentUser, allowedUsers);
  const currentShared = (formData.sharedWith || []).map((e) =>
    String(e || '').trim().toLowerCase()
  );

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
                <strong>{formData.name || 'התלמיד/ה'}</strong>
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
                    const isShared = currentShared.includes(colEmail);
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
                            onChange={() => {
                              if (isShared) {
                                onToggleShareColleague(colEmail);
                              } else {
                                onToggleShareColleague(colEmail, handoffNote);
                              }
                            }}
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
                    <span style={{ fontSize: '11px', color: '#64748b' }}>יישמר בשיח הצוות</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {QUICK_CHIPS.map((chip) => (
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
                    placeholder="לדוגמה: היי, שיתפתי איתך את התוכנית לקראת הוועדה. אנא הוסיפי מטרות..."
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
            <button type="button" className="btn-submit-email" onClick={onClose}>
              <span>סיום</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
