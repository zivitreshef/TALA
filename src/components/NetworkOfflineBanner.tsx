import React, { useState } from 'react';
import { WifiOff, Wifi, Save, CheckCircle2 } from 'lucide-react';

export interface NetworkOfflineBannerProps {
  isOnline: boolean;
  justReconnected?: boolean;
  onSaveCurrentWork?: () => void;
  isDirty?: boolean;
}

export default function NetworkOfflineBanner({
  isOnline,
  justReconnected = false,
  onSaveCurrentWork,
  isDirty = false
}: NetworkOfflineBannerProps): React.JSX.Element | null {
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = (): void => {
    if (onSaveCurrentWork) {
      onSaveCurrentWork();
    }
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 4000);
  };

  if (justReconnected) {
    return (
      <aside
        className="tala-network-reconnected-banner"
        role="status"
        aria-live="polite"
        dir="rtl"
        data-testid="network-reconnected-banner"
      >
        <div className="tala-upgrade-banner-content">
          <div className="tala-upgrade-banner-msg-row">
            <div className="tala-upgrade-banner-icon-box" aria-hidden="true" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
              <Wifi size={18} color="#ffffff" />
            </div>
            <div className="tala-upgrade-banner-text">
              <span className="tala-upgrade-banner-title">
                חיבור האינטרנט חודש
              </span>{' '}
              <span className="tala-upgrade-banner-desc">
                הנתונים והשינויים מסונכרנים כעת לענן באופן אוטומטי.
              </span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  if (!isOnline) {
    return (
      <aside
        className="tala-network-offline-banner"
        role="alert"
        aria-live="assertive"
        dir="rtl"
        data-testid="network-offline-banner"
      >
        <div className="tala-upgrade-banner-content">
          <div className="tala-upgrade-banner-msg-row">
            <div className="tala-upgrade-banner-icon-box" aria-hidden="true" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
              <WifiOff size={18} color="#ffffff" />
            </div>
            <div className="tala-upgrade-banner-text">
              <span className="tala-upgrade-banner-title">
                אין חיבור לאינטרנט – הנתונים נשמרים במכשירך
              </span>{' '}
              <span className="tala-upgrade-banner-desc">
                תוכלי להמשיך להקליד ולשמור כרגיל. כל הנתונים יסונכרנו אוטומטית לענן ברגע שהחיבור יתחדש. פעולות בינה מלאכותית מושהות עד לחזרת הרשת.
                {isDirty && (
                  <span style={{ fontWeight: 700, marginRight: '6px' }}>
                    (ישנם שינויים חדשים שניתן לשמור במכשיר)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="tala-upgrade-banner-actions">
            {onSaveCurrentWork && (
              <button
                type="button"
                onClick={handleSave}
                className="btn-banner-action btn-save-action"
                style={{
                  background: '#ffffff',
                  color: '#9a3412',
                  border: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="שמור את השינויים במכשיר"
              >
                {savedFeedback ? (
                  <>
                    <CheckCircle2 size={15} color="#16a34a" />
                    <span>נשמר במכשיר!</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>שמור במכשיר כעת</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  return null;
}
