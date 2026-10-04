import React from 'react';
import {
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  ChevronLeft,
  Trash2,
  Printer,
  Download,
  Mail
} from 'lucide-react';
import { STATUS_REPORT_SECTIONS_SCHEMA } from '../../domain/statusReportGenerator';

export default function StatusReportPanel({
  statusReportSectionRef,
  formData,
  isGeneratingStatusReport,
  statusReportBanner,
  onGenerateStatusReport,
  onClose,
  onRemoveStatusSection,
  onUpdateStatusSectionContent,
  onAddManualStatusSection,
  onTextareaAutoResize,
  onPrintStatusReport,
  onDownloadWordStatusReport,
  onOpenEmailStatusReport
}) {
  const currentSections = Array.isArray(formData.statusReportSections)
    ? formData.statusReportSections
    : [];
  const usedNums = new Set(currentSections.map((s) => Number(s.sectionNumber)));
  const availableToAdd = STATUS_REPORT_SECTIONS_SCHEMA.filter(
    (s) => !usedNums.has(s.sectionNumber)
  );

  return (
    <section
      ref={statusReportSectionRef}
      className="form-section-card highlight-summary-section"
      style={{ borderTop: '4px solid #1d4ed8' }}
    >
      <div
        className="section-header-line"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div>
          <h3>דו"ח מצב חינוכי-תפקודי עדכני</h3>
          <p className="section-sub-desc">
            מבוסס אך ורק על המידע הקיים בכרטיס התלמיד/ה, במטרות שהוגדרו, ובהערכת מחצית / סוף שנה
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-submit-generate-summary"
            onClick={onGenerateStatusReport}
            disabled={isGeneratingStatusReport}
          >
            {isGeneratingStatusReport ? (
              <Loader2 size={16} className="tala-spin-icon" />
            ) : (
              <Sparkles size={16} />
            )}
            <span>
              {isGeneratingStatusReport
                ? 'מפיק ומעדכן דו"ח מצב...'
                : currentSections.length > 0
                  ? 'הפק / עדכן דו"ח מצב מחדש'
                  : 'הפק דו"ח מצב ב-AI'}
            </span>
          </button>
          <button type="button" className="btn-preview-doc" onClick={onClose}>
            <X size={15} />
            <span>סגור דו"ח מצב</span>
          </button>
        </div>
      </div>

      {isGeneratingStatusReport && (
        <div
          className="ai-busy-indicator-card"
          role="status"
          aria-live="polite"
          style={{ marginBottom: '16px' }}
        >
          <div className="ai-busy-indicator-header">
            <Loader2 size={19} className="tala-spin-icon" />
            <Sparkles size={16} />
            <span>
              המערכת מנתחת את כרטיס התלמיד/ה, המטרות והערכת מחצית/סוף שנה ומפיקה דו"ח מצב מקצועי... (נא להמתין מספר שניות)
            </span>
          </div>
          <p className="ai-busy-indicator-sub">
            נכללים אך ורק סעיפים שלגביהם קיים מידע מתועד — ללא השלמות או הנחות וללא ציון "לא ידוע".
          </p>
          <div className="ai-busy-progress-track">
            <div className="ai-busy-progress-bar" />
          </div>
        </div>
      )}

      {statusReportBanner && !isGeneratingStatusReport && (
        <div className="reverse-engineer-success-banner" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={18} />
          <span>{statusReportBanner}</span>
        </div>
      )}

      {currentSections.length === 0 && !isGeneratingStatusReport ? (
        <div
          style={{
            background: 'var(--bg-warm-subtle)',
            border: '1px dashed #94a3b8',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            marginBottom: '16px'
          }}
        >
          <p style={{ margin: '0 0 10px 0', fontWeight: 600 }}>
            טרם הופק דו"ח מצב עבור התלמיד/ה או שטרם הוזן מידע בכרטיס.
          </p>
          <button
            type="button"
            className="btn-submit-generate-summary"
            onClick={onGenerateStatusReport}
            disabled={isGeneratingStatusReport}
          >
            <Sparkles size={16} />
            <span>הפק דו"ח מצב מתוך נתוני הכרטיס כעת</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentSections.map((sec) => (
            <div
              key={sec.id || `status_sec_${sec.sectionNumber}`}
              style={{
                background: 'var(--bg-card)',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px 16px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '8px'
                }}
              >
                <strong style={{ color: '#1e3a5f', fontSize: '14.5px' }}>
                  <ChevronLeft size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} /> {sec.title}
                </strong>
                <button
                  type="button"
                  onClick={() => onRemoveStatusSection(sec.sectionNumber)}
                  title="השמט סעיף זה מהדו״ח"
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} />
                  <span>השמט סעיף</span>
                </button>
              </div>
              <textarea
                rows={Math.max(2, Math.min(7, Math.ceil((sec.content || '').length / 110)))}
                value={sec.content || ''}
                onInput={onTextareaAutoResize}
                onChange={(e) => onUpdateStatusSectionContent(sec.sectionNumber, e.target.value)}
                placeholder={`תוכן מקצועי עבור סעיף "${sec.title}"... (אם הסעיף ריק הוא יושמט מההדפסה ומקובץ ה-Word)`}
                style={{
                  width: '100%',
                  lineHeight: 1.65,
                  fontSize: '13.5px'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {availableToAdd.length > 0 && (
        <div
          style={{
            marginTop: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            background: 'var(--bg-warm-subtle)',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}
        >
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
            הוספת סעיף מהמבנה המוגדר (רק אם קיים מידע רלוונטי להזנה ידנית):
          </span>
          <select
            defaultValue=""
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val) {
                onAddManualStatusSection(val);
                e.target.value = '';
              }
            }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: 'var(--bg-card)'
            }}
          >
            <option value="">+ בחר סעיף להוספה...</option>
            {availableToAdd.map((schemaSec) => (
              <option key={schemaSec.sectionNumber} value={schemaSec.sectionNumber}>
                • {schemaSec.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Report Actions Bar */}
      <div
        className="bottom-final-actions"
        style={{ marginTop: '18px', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <button type="button" className="btn-print-doc" onClick={onPrintStatusReport}>
          <Printer size={18} />
          <span>הדפס דו"ח מצב</span>
        </button>

        <button type="button" className="btn-print-doc" onClick={onDownloadWordStatusReport}>
          <Download size={18} />
          <span>הורד קובץ Word – דו"ח מצב</span>
        </button>

        <button type="button" className="btn-send-email-doc" onClick={onOpenEmailStatusReport}>
          <Mail size={18} />
          <span>שלח דו"ח מצב למייל</span>
        </button>
      </div>
    </section>
  );
}
