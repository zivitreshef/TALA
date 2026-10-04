import React from 'react';
import { Users, X } from 'lucide-react';
import { getUserGroups, shareCommonGroup } from '../../domain/permissions';

export default function ShareTeamModal({
  isOpen,
  onClose,
  formData,
  currentUser,
  allowedUsers,
  showAllShareUsers,
  setShowAllShareUsers,
  onToggleShareColleague
}) {
  if (!isOpen) return null;

  const myEmail = (currentUser?.email || '').trim().toLowerCase();
  const myUserRecord = (allowedUsers || []).find(
    (u) => (u.email || '').trim().toLowerCase() === myEmail
  );
  
  const myGroups = getUserGroups(myUserRecord || currentUser);
  const myGroupsLabel = myGroups.length > 0 ? myGroups.join(', ') : '';
  
  const otherUsers = (allowedUsers || []).filter(
    (u) => u.active !== false && (u.email || '').trim().toLowerCase() !== myEmail
  );
  
  const sameGroupUsers = myGroups.length > 0
    ? otherUsers.filter((u) => shareCommonGroup(u, myUserRecord || currentUser))
    : [];
    
  const visibleUsers =
    myGroups.length > 0 && sameGroupUsers.length > 0 && !showAllShareUsers
      ? sameGroupUsers
      : otherUsers;
      
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
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {myGroups.length > 0 && sameGroupUsers.length > 0 && !showAllShareUsers
                ? `חברי צוות: ${myGroupsLabel}`
                : 'כל אנשי הצוות במערכת'}
            </span>
            {myGroups.length > 0 &&
              sameGroupUsers.length > 0 &&
              otherUsers.length > sameGroupUsers.length && (
                <button
                  type="button"
                  onClick={() => setShowAllShareUsers(!showAllShareUsers)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showAllShareUsers ? `הצג רק את ${myGroupsLabel}` : 'הצג את כל הצוותים'}
                </button>
              )}
          </div>

          {visibleUsers.length === 0 ? (
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                padding: '16px 0'
              }}
            >
              לא נמצאו אנשי צוות נוספים לשיתוף.
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
                const colGroups = getUserGroups(colleague);
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
                        onChange={() => onToggleShareColleague(colEmail)}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-main)' }}>
                          {colleague.name || colleague.email}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {colleague.role || 'איש/אשת צוות'}
                          {colGroups.length > 0 ? ` • ${colGroups.join(', ')}` : ''}
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
