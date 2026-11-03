import type { JSX } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export interface NewVersionBannerProps {
  latestVersion?: string | null;
  hasUpdate?: boolean;
  dismissed?: boolean;
  onRefresh?: () => void;
  onDismiss?: () => void;
  isDirty?: boolean;
}

export default function NewVersionBanner({
  latestVersion,
  hasUpdate = false,
  dismissed = false,
  onRefresh,
  onDismiss,
  isDirty = false
}: NewVersionBannerProps): JSX.Element | null {
  if (!hasUpdate || dismissed || !latestVersion) {
    return null;
  }

  const handleRefresh = (): void => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleDismiss = (): void => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <aside
      className="tala-new-version-banner"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <div className="tala-new-version-banner-content">
        <div className="tala-new-version-msg-row">
          <div className="tala-new-version-icon-box" aria-hidden="true">
            <Sparkles className="tala-new-version-sparkle-icon" size={18} />
          </div>

          <div className="tala-new-version-text">
            <span className="tala-new-version-title">
              גרסה חדשה של טל״א זמינה ({latestVersion})!
            </span>{' '}
            <span className="tala-new-version-desc">
              הגרסה העדכנית כוללת שיפורים ותיקונים. מומלץ לרענן את העמוד כדי להחיל את השינויים.
              {isDirty && (
                <span className="tala-new-version-dirty-hint">
                  {' '}(שימו לב: מומלץ לשמור את השינויים לפני הרענון)
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="tala-new-version-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn-banner-action btn-version-refresh"
            title="רענן את האתר כעת לקבלת הגרסה החדשה"
          >
            <RefreshCw size={14} />
            <span>רענן כעת</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="btn-banner-dismiss btn-version-dismiss"
            aria-label="סגור הודעת עדכון"
            title="סגור"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
