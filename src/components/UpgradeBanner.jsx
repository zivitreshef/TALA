import React, { useState } from 'react';
import { AlertTriangle, Save, RefreshCw, X, CheckCircle2 } from 'lucide-react';

export const DEFAULT_UPGRADE_BANNER_MESSAGE =
  'המערכת עוברת כעת שדרוג ועדכון גרסה! אנא שמרו את עבודתכם באופן מיידי כדי למנוע אובדן נתונים ושמירה על תקינות המידע. בסיום העדכון, יש לרענן את האתר (F5 / רענן) כדי ליהנות מהתכונות והשיפורים החדשים.';

export default function UpgradeBanner({
  bannerData,
  onSaveCurrentWork,
  isDirty = false
}) {
  const [dismissed, setDismissed] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // If not active or explicitly dismissed by user in this session, don't show
  if (!bannerData?.active || dismissed) {
    return null;
  }

  const message = (bannerData.message && bannerData.message.trim()) || DEFAULT_UPGRADE_BANNER_MESSAGE;

  const handleSave = () => {
    if (onSaveCurrentWork) {
      onSaveCurrentWork();
    }
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 4500);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <aside
      className="tala-upgrade-banner"
      role="alert"
      aria-live="assertive"
      dir="rtl"
    >
      <div className="tala-upgrade-banner-content">
        <div className="tala-upgrade-banner-msg-row">
          <div className="tala-upgrade-banner-icon-box" aria-hidden="true">
            <AlertTriangle className="tala-upgrade-alert-icon" size={20} />
          </div>

          <div className="tala-upgrade-banner-text">
            <span className="tala-upgrade-banner-title">
              הודעת שדרוג מערכת פעיל (PR + Deploy):
            </span>{' '}
            <span className="tala-upgrade-banner-desc">{message}</span>
          </div>
        </div>

        <div className="tala-upgrade-banner-actions">
          {savedFeedback ? (
            <span className="tala-upgrade-saved-badge">
              <CheckCircle2 size={15} />
              <span>העבודה נשמרה בהצלחה!</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className={`btn-banner-action btn-banner-save ${isDirty ? 'btn-banner-save-urgent' : ''}`}
              title="שמור את השינויים הנוכחיים בענן ובדפדפן"
            >
              <Save size={15} />
              <span>שמור עבודתי כעת</span>
              {isDirty && <span className="banner-dirty-dot" title="ישנם שינויים שטרם נשמרו" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            className="btn-banner-action btn-banner-refresh"
            title="רענן את הדף לטעינת הגרסה החדשה"
          >
            <RefreshCw size={14} />
            <span>רענן דף</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="btn-banner-close"
            title="הסתר התרעה זו זמנית"
            aria-label="סגור התרעה"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
