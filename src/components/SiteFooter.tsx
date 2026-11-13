import './SiteFooter.css';

export interface SiteFooterProps {
  siteVersion?: string;
  className?: string;
}

export default function SiteFooter({ className = '' }: SiteFooterProps) {
  return (
    <aside
      className={`tala-corner-watermark ${className}`}
      aria-label="סימן מים ומיתוג פיתוח"
      role="complementary"
    >
      <img
        src="./rgm-logo.png"
        alt="לוגו RgM"
        className="tala-watermark-logo"
        width={38}
        height={32}
        loading="lazy"
      />
      <span className="tala-watermark-text">
        פותח ומתוחזק על ידי <strong className="rgm-brand-highlight">RgM</strong>
      </span>
    </aside>
  );
}
