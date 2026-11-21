import React, { useState, useRef, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  AlertTriangle,
  RefreshCw,
  Bell,
  Sparkles,
  Save,
  X
} from 'lucide-react';

export interface SmartAlertItem {
  id: string;
  severity: 'blocking' | 'info';
  kind: 'offline' | 'reconnected' | 'upgrade' | 'security' | 'version' | 'whats_new';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onDismiss?: () => void;
}

export interface SmartAlertSlotProps {
  isOnline: boolean;
  justReconnected: boolean;
  isDirty: boolean;
  onSaveCurrentWork?: () => void;
  upgradeBanner?: { active?: boolean; message?: string; etaMinutes?: number } | null;
  lockedOutUsersCount?: number;
  lockedOutUsersNames?: string[];
  onOpenAdminRequests?: () => void;
  hasAppUpdate?: boolean;
  newPublishedVersion?: string | null;
  isAppUpdateDismissed?: boolean;
  onRefreshApp?: () => void;
  onDismissAppUpdate?: () => void;
  showWhatsNew?: boolean;
  onStartTour?: () => void;
  onOpenHelpCenter?: () => void;
  onDismissWhatsNew?: () => void;
}

/**
 * Computes the prioritized list of active alerts, strictly separating
 * non-dismissible blocking alerts from dismissible informational notices.
 */
export function buildSmartAlerts(props: SmartAlertSlotProps): {
  blocking: SmartAlertItem[];
  informational: SmartAlertItem[];
  dismissedDiscoverable: SmartAlertItem[];
} {
  const blocking: SmartAlertItem[] = [];
  const informational: SmartAlertItem[] = [];
  const dismissedDiscoverable: SmartAlertItem[] = [];

  if (!props.isOnline) {
    blocking.push({
      id: 'offline',
      severity: 'blocking',
      kind: 'offline',
      title: 'אין חיבור לרשת',
      message: props.isDirty
        ? 'קיימים שינויים שטרם נשמרו בענן. העבודה נשמרת מקומית ותסונכרן עם חזרת החיבור.'
        : 'המערכת במצב לא מקוון. חלק מהפעולות יסונכרנו עם חזרת החיבור.',
      actionLabel: props.isDirty && props.onSaveCurrentWork ? 'שמירה מקומית עכשיו' : undefined,
      onAction: props.isDirty ? props.onSaveCurrentWork : undefined
    });
  }

  if (props.upgradeBanner?.active) {
    blocking.push({
      id: 'upgrade',
      severity: 'blocking',
      kind: 'upgrade',
      title: 'תחזוקת מערכת מתוכננת',
      message:
        props.upgradeBanner.message ||
        'מתבצע עדכון מערכת חשוב. מומלץ לשמור את העבודה הפעילה מיד.',
      actionLabel: props.isDirty && props.onSaveCurrentWork ? 'שמירת עבודה עכשיו' : undefined,
      onAction: props.isDirty ? props.onSaveCurrentWork : undefined
    });
  }

  if ((props.lockedOutUsersCount || 0) > 0) {
    const names = (props.lockedOutUsersNames || []).join(', ');
    blocking.push({
      id: 'security_lockout',
      severity: 'blocking',
      kind: 'security',
      title: 'התראת אבטחה למנהל המערכת',
      message: `${props.lockedOutUsersCount} משתמשים נחסמו אוטומטית לאחר ניסיונות כניסה שגויים${names ? ` (${names})` : ''}.`,
      actionLabel: props.onOpenAdminRequests ? 'לצפייה ושחרור חסימה' : undefined,
      onAction: props.onOpenAdminRequests
    });
  }

  if (props.isOnline && props.justReconnected) {
    informational.push({
      id: 'reconnected',
      severity: 'info',
      kind: 'reconnected',
      title: 'החיבור לרשת חזר',
      message: 'ניתן להמשיך בעבודה כרגיל ולשמור לענן.',
      actionLabel: props.isDirty && props.onSaveCurrentWork ? 'שמירה לענן' : undefined,
      onAction: props.isDirty ? props.onSaveCurrentWork : undefined
    });
  }

  if (props.hasAppUpdate) {
    const versionAlert: SmartAlertItem = {
      id: 'app_update',
      severity: 'info',
      kind: 'version',
      title: `גרסה חדשה זמינה${props.newPublishedVersion ? ` ${props.newPublishedVersion}` : ''}`,
      message: props.isDirty
        ? 'שמרי את השינויים הפתוחים לפני רענון המערכת.'
        : 'מומלץ לרענן כדי לקבל את השיפורים האחרונים.',
      actionLabel: props.onRefreshApp ? 'רענון עכשיו' : undefined,
      onAction: props.onRefreshApp,
      onDismiss: props.onDismissAppUpdate
    };
    if (props.isAppUpdateDismissed) {
      dismissedDiscoverable.push(versionAlert);
    } else {
      informational.push(versionAlert);
    }
  }

  if (props.showWhatsNew) {
    informational.push({
      id: 'whats_new',
      severity: 'info',
      kind: 'whats_new',
      title: 'סביבת העבודה המשודרגת זמינה',
      message: 'ניתן לצפות בסיור מודרך קצר או לפתוח את מרכז העזרה בכל עת.',
      actionLabel: props.onStartTour ? 'פתיחת סיור מודרך' : undefined,
      onAction: props.onStartTour,
      secondaryActionLabel: props.onOpenHelpCenter ? 'מרכז העזרה' : undefined,
      onSecondaryAction: props.onOpenHelpCenter,
      onDismiss: props.onDismissWhatsNew
    });
  }

  return { blocking, informational, dismissedDiscoverable };
}

export const SmartAlertSlot: React.FC<SmartAlertSlotProps> = (props) => {
  const { blocking, informational } = buildSmartAlerts(props);

  // Blocking alerts ALWAYS render and can NEVER be dismissed.
  if (blocking.length > 0) {
    return (
      <div
        className="v4-smart-alert-stack"
        role="alert"
        aria-live="assertive"
        data-testid="v4-blocking-alert-slot"
      >
        {blocking.map((item) => (
          <div
            key={item.id}
            className={`v4-alert-bar v4-alert-blocking v4-alert-${item.kind}`}
            data-testid={`v4-alert-${item.id}`}
          >
            <div className="v4-alert-content">
              {item.kind === 'offline' ? (
                <WifiOff size={16} aria-hidden="true" />
              ) : (
                <AlertTriangle size={16} aria-hidden="true" />
              )}
              <strong className="v4-alert-title">{item.title}:</strong>
              <span className="v4-alert-message">{item.message}</span>
            </div>
            <div className="v4-alert-actions">
              {item.actionLabel && item.onAction && (
                <button
                  type="button"
                  className="v4-alert-btn-primary"
                  onClick={item.onAction}
                >
                  {item.kind === 'offline' || item.kind === 'upgrade' ? (
                    <Save size={14} aria-hidden="true" />
                  ) : null}
                  <span>{item.actionLabel}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Only show the single highest-priority informational alert when no blocking alert exists.
  const topInfo = informational[0];
  if (!topInfo) return null;

  return (
    <div
      className={`v4-alert-bar v4-alert-info v4-alert-${topInfo.kind}`}
      role="status"
      aria-live="polite"
      data-testid="v4-info-alert-slot"
    >
      <div className="v4-alert-content">
        {topInfo.kind === 'reconnected' ? (
          <Wifi size={15} aria-hidden="true" />
        ) : topInfo.kind === 'version' ? (
          <RefreshCw size={15} aria-hidden="true" />
        ) : (
          <Sparkles size={15} aria-hidden="true" />
        )}
        <strong className="v4-alert-title">{topInfo.title}:</strong>
        <span className="v4-alert-message">{topInfo.message}</span>
      </div>
      <div className="v4-alert-actions">
        {topInfo.actionLabel && topInfo.onAction && (
          <button
            type="button"
            className="v4-alert-btn-info"
            onClick={topInfo.onAction}
          >
            {topInfo.actionLabel}
          </button>
        )}
        {topInfo.secondaryActionLabel && topInfo.onSecondaryAction && (
          <button
            type="button"
            className="v4-alert-btn-ghost"
            onClick={topInfo.onSecondaryAction}
          >
            {topInfo.secondaryActionLabel}
          </button>
        )}
        {topInfo.onDismiss && (
          <button
            type="button"
            className="v4-alert-dismiss-btn"
            onClick={topInfo.onDismiss}
            aria-label="סגירת הודעה"
            title="סגירת הודעה"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export interface SmartAlertBellProps {
  alertsProps: SmartAlertSlotProps;
}

/**
 * Header bell button keeping lower-priority & dismissed informational
 * notifications discoverable without cluttering the main canvas.
 */
export const SmartAlertBell: React.FC<SmartAlertBellProps> = ({ alertsProps }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { blocking, informational, dismissedDiscoverable } = buildSmartAlerts(alertsProps);

  const discoverableItems = [...blocking, ...informational, ...dismissedDiscoverable];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (discoverableItems.length === 0) return null;

  return (
    <div className="v4-bell-wrapper" ref={containerRef}>
      <button
        type="button"
        className="v4-header-icon-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="התראות ועדכוני מערכת"
        aria-expanded={open}
        title="התראות ועדכוני מערכת"
        data-testid="v4-alert-bell-btn"
      >
        <Bell size={16} aria-hidden="true" />
        <span className="v4-bell-badge" data-testid="v4-alert-bell-count">
          {discoverableItems.length}
        </span>
      </button>

      {open && (
        <div
          className="v4-bell-popover"
          role="dialog"
          aria-label="התראות מערכת"
          data-testid="v4-alert-bell-popover"
        >
          <div className="v4-bell-popover-header">
            <strong>התראות ועדכונים</strong>
            <button
              type="button"
              className="v4-bell-close-btn"
              onClick={() => setOpen(false)}
              aria-label="סגירת חלון התראות"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="v4-bell-popover-list">
            {discoverableItems.map((item) => (
              <div
                key={item.id}
                className={`v4-bell-item ${item.severity === 'blocking' ? 'is-blocking' : ''}`}
              >
                <div className="v4-bell-item-title">{item.title}</div>
                <div className="v4-bell-item-msg">{item.message}</div>
                {item.actionLabel && item.onAction && (
                  <button
                    type="button"
                    className="v4-bell-item-action"
                    onClick={() => {
                      setOpen(false);
                      item.onAction?.();
                    }}
                  >
                    {item.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
