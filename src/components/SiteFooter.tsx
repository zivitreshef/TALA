import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';
import './SiteFooter.css';

export interface SiteFooterProps {
  siteVersion?: string;
  className?: string;
}

export default function SiteFooter({ siteVersion, className = '' }: SiteFooterProps) {
  const displayVersion = siteVersion || CURRENT_APP_VERSION;

  return (
    <footer className={`tala-site-footer ${className}`} role="contentinfo" aria-label="שורת תחתית ומיתוג">
      <div className="tala-site-footer-inner">
        <div className="tala-site-footer-brand">
          <img
            src="./rgm-logo.png"
            alt="לוגו RgM"
            className="tala-site-footer-logo"
            width={26}
            height={22}
            loading="lazy"
          />
          <span className="tala-site-footer-text">
            פותח ומתוחזק על ידי <strong className="rgm-brand-highlight">RgM</strong>
          </span>
        </div>

        <div className="tala-site-footer-meta">
          <span className="tala-site-footer-version" dir="ltr" title={`גרסה פעילה: ver. ${displayVersion}`}>
            ver. {displayVersion}
          </span>
          <span className="tala-site-footer-separator" aria-hidden="true">•</span>
          <span className="tala-site-footer-copyright">
            כל הזכויות שמורות למערכת תל״א
          </span>
        </div>
      </div>
    </footer>
  );
}
