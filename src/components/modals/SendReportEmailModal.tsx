import React, { useState } from 'react';
import { Mail, X, Download, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  sendReportEmailInBackground,
  loadEmailEngineConfig,
  isDirectEmailEngineConfigured
} from '../../emailService';

export interface SendReportEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  studentName: string;
  schoolYear?: string;
  currentUser?: {
    name?: string;
    email?: string;
    title?: string;
    group?: string;
    [key: string]: unknown;
  } | null;
  userPreferences?: {
    fullName?: string;
    professionalTitle?: string;
    institutionalAffiliation?: string;
    [key: string]: unknown;
  } | null;
  hideDetails: boolean;
  onToggleHideDetails: (hide: boolean) => void;
  getWordAttachment: () => {
    blob: Blob;
    filename: string;
    mimeType: string;
    htmlContent: string;
  };
  getPdfAttachment: () => Promise<{
    blob: Blob;
    filename: string;
    mimeType: string;
    htmlContent: string;
  }>;
}

export default function SendReportEmailModal({
  isOpen,
  onClose,
  reportTitle,
  studentName,
  schoolYear = '',
  currentUser,
  userPreferences,
  hideDetails,
  onToggleHideDetails,
  getWordAttachment,
  getPdfAttachment
}: SendReportEmailModalProps): React.JSX.Element | null {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [format, setFormat] = useState<'docx' | 'pdf'>('pdf');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');

    const trimmedEmail = recipientEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('נא להזין כתובת אימייל תקינה של הנמען (למשל: name@example.com).');
      return;
    }

    const engineCfg = loadEmailEngineConfig();
    if (!isDirectEmailEngineConfigured(engineCfg)) {
      setErrorMsg(
        'כדי לשלוח את המייל והקובץ המצורף ישירות ברקע, יש להגדיר את מנוע השליחה בהגדרות המערכת.'
      );
      return;
    }

    setIsSending(true);
    try {
      const formatLabel = format === 'docx' ? 'Word (DOCX/DOC)' : 'PDF';
      const subject = `${reportTitle} – ${studentName} (${schoolYear})`;

      const attachmentInfo =
        format === 'docx' ? getWordAttachment() : await getPdfAttachment();

      const senderSignOff = [
        userPreferences?.fullName || currentUser?.name || engineCfg.senderName || 'מערכת TALA',
        [
          userPreferences?.professionalTitle || currentUser?.title,
          userPreferences?.institutionalAffiliation || currentUser?.group
        ]
          .filter(Boolean)
          .join(' • ')
      ]
        .filter(Boolean)
        .join('\r\n');

      const textBody = [
        'שלום רב,',
        '',
        `מצורף ${reportTitle} עבור ${studentName} לשנת הלימודים ${schoolYear} בפורמט ${formatLabel}.`,
        hideDetails ? '(המסמך הופק במצב הגנת פרטיות – ראשי תיבות והשחרת פרטים מזהים).' : '',
        '',
        'בברכה,',
        senderSignOff
      ]
        .filter(Boolean)
        .join('\r\n');

      const emailHtmlWrapper = `
        <div dir="rtl" style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; text-align: right;">
          <p>שלום רב,</p>
          <p>מצורף <strong>${reportTitle}</strong> עבור <strong>${studentName}</strong> לשנת הלימודים <strong>${schoolYear}</strong> בקובץ מצורף (<strong>${attachmentInfo.filename}</strong>).</p>
          ${
            hideDetails
              ? '<p style="color: #4c1d95; font-size: 12px;">🔒 המסמך הופק במצב הגנת פרטיות (ראשי תיבות והשחרת פרטים מזהים).</p>'
              : ''
          }
          <div style="margin: 14px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="font-weight: 700; color: #1e3a5f;">בברכה, ${userPreferences?.fullName || currentUser?.name || 'צוות חינוכי'}</div>
            ${userPreferences?.professionalTitle || currentUser?.title ? `<div style="font-size: 12px; color: #475569;">${userPreferences?.professionalTitle || currentUser?.title}</div>` : ''}
            ${userPreferences?.institutionalAffiliation || currentUser?.group ? `<div style="font-size: 12px; color: #64748b;">${userPreferences?.institutionalAffiliation || currentUser?.group}</div>` : ''}
          </div>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 16px 0;" />
          ${attachmentInfo.htmlContent}
        </div>
      `;

      await sendReportEmailInBackground({
        config: engineCfg,
        toEmail: trimmedEmail,
        subject,
        htmlBody: emailHtmlWrapper,
        textBody,
        attachmentBlob: attachmentInfo.blob,
        filename: attachmentInfo.filename,
        mimeType: attachmentInfo.mimeType
      });

      setStatusMsg(
        `✅ המייל נשלח בהצלחה ברקע אל ${trimmedEmail} יחד עם הקובץ המצורף (${attachmentInfo.filename})!`
      );
    } catch (err: any) {
      console.error('Email sending error:', err);
      setErrorMsg(
        `שגיאה בשליחת המייל: ${err?.message || 'בדוק את חיבור האינטרנט או את הגדרות מנוע המייל.'}`
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleDownloadOnly = async () => {
    try {
      const attachmentInfo =
        format === 'docx' ? getWordAttachment() : await getPdfAttachment();
      const url = URL.createObjectURL(attachmentInfo.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachmentInfo.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err: any) {
      setErrorMsg(`שגיאה בהורדת הקובץ: ${err?.message || ''}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl">
      <div
        className="modal-card email-report-modal"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '92%' }}
      >
        <div className="modal-header email-modal-header">
          <div className="modal-title-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                שליחת {reportTitle} במייל
              </h3>
              <p className="modal-subtitle" style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                {reportTitle} • <strong>{studentName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="סגור"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form className="modal-body email-modal-body" onSubmit={handleSend}>
          {/* Recipient Email */}
          <div className="email-modal-field" style={{ marginBottom: '14px' }}>
            <label className="email-modal-label" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              שלח אל כתובת אימייל: <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="email"
              required
              dir="ltr"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="email-recipient-input"
              autoFocus
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Format selection */}
          <div className="email-modal-field" style={{ marginBottom: '14px' }}>
            <label className="email-modal-label" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              בחר פורמט קובץ מצורף:
            </label>
            <div className="email-format-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label
                className={`email-format-card ${format === 'pdf' ? 'selected' : ''}`}
                onClick={() => setFormat('pdf')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: format === 'pdf' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: format === 'pdf' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="emailFormat"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    fontSize: '11px',
                    fontWeight: 800
                  }}
                >
                  PDF
                </div>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>מסמך PDF</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>מעוצב לקריאה ולהדפסה</span>
                </div>
              </label>

              <label
                className={`email-format-card ${format === 'docx' ? 'selected' : ''}`}
                onClick={() => setFormat('docx')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: format === 'docx' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: format === 'docx' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="emailFormat"
                  value="docx"
                  checked={format === 'docx'}
                  onChange={() => setFormat('docx')}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#dcfce7',
                    color: '#059669',
                    fontSize: '11px',
                    fontWeight: 800
                  }}
                >
                  DOC
                </div>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>מסמך Word</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>ניתן לעריכה ב-Word</span>
                </div>
              </label>
            </div>
          </div>

          {/* Privacy Toggle */}
          <label
            className="email-privacy-toggle"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: hideDetails ? '#f5f3ff' : '#f8fafc',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              marginBottom: '14px',
              fontSize: '13px',
              color: '#334155'
            }}
          >
            <input
              type="checkbox"
              checked={hideDetails}
              onChange={(e) => onToggleHideDetails(e.target.checked)}
            />
            {hideDetails ? <EyeOff size={16} style={{ color: '#7c3aed' }} /> : <Eye size={16} />}
            <span>הפעל הגנת פרטיות בקובץ המצורף (ראשי תיבות והסתרת מידע מזהה)</span>
          </label>

          {errorMsg && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#fee2e2',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '12px'
              }}
            >
              {errorMsg}
            </div>
          )}

          {statusMsg && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#dcfce7',
                color: '#047857',
                fontSize: '13px',
                marginBottom: '12px'
              }}
            >
              {statusMsg}
            </div>
          )}

          <div
            className="email-modal-actions"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            <button
              type="button"
              className="btn-download-only"
              onClick={handleDownloadOnly}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Download size={15} />
              <span>הורד קובץ בלבד</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                סגור
              </button>

              <button
                type="submit"
                disabled={isSending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1d4ed8',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(29, 78, 216, 0.25)',
                  opacity: isSending ? 0.7 : 1
                }}
              >
                {isSending ? <Loader2 size={15} className="spinner" /> : <Mail size={15} />}
                <span>{isSending ? 'שולח...' : 'שלח למייל'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
