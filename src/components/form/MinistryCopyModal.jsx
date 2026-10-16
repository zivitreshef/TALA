import React, { useState, useMemo } from 'react';
import { ClipboardCopy, Check, X, Eye, EyeOff } from 'lucide-react';
import {
  buildMinistryCopyBlocks,
  formatAllMinistryBlocks
} from '../../domain/ministryCopyFormatter';

export default function MinistryCopyModal({
  formData,
  hideDetails,
  onToggleHideDetails,
  onClose
}) {
  const [copiedId, setCopiedId] = useState(null);

  const blocks = useMemo(
    () => buildMinistryCopyBlocks(formData, hideDetails),
    [formData, hideDetails]
  );

  const handleCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card email-report-modal"
        dir="rtl"
        style={{ maxWidth: '680px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header email-modal-header">
          <div className="modal-title-row">
            <ClipboardCopy size={22} />
            <div>
              <h3>העתקה למנב&quot;ס / משרד החינוך</h3>
              <p className="modal-subtitle">
                טקסט נקי ללא טבלאות, מוכן להדבקה ישירה במנב&quot;סנט, משו&quot;ב או טפסי ועדה
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

        <div className="modal-body email-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '12px'
            }}
          >
            <label className="email-privacy-toggle" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={Boolean(hideDetails)}
                onChange={(e) => onToggleHideDetails?.(e.target.checked)}
              />
              {hideDetails ? <EyeOff size={16} /> : <Eye size={16} />}
              <span>הגנת פרטיות (ראשי תיבות והסתרת ת.ז/מסגרת)</span>
            </label>

            <button
              type="button"
              className="btn-submit-email"
              style={{ padding: '7px 14px', fontSize: '0.88rem' }}
              onClick={() => handleCopy('all', formatAllMinistryBlocks(blocks))}
            >
              {copiedId === 'all' ? <Check size={16} /> : <ClipboardCopy size={16} />}
              <span>{copiedId === 'all' ? 'הכל הועתק ללוח!' : 'העתק את כל התוכנית'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {blocks.map((block) => {
              const isCopied = copiedId === block.id;
              return (
                <div
                  key={block.id}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    padding: '10px 12px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px'
                    }}
                  >
                    <strong style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>
                      {block.title}{' '}
                      <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#64748b' }}>
                        ({block.content.length} תווים)
                      </span>
                    </strong>
                    <button
                      type="button"
                      className="btn-download-only"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.82rem',
                        background: isCopied ? '#dcfce7' : undefined,
                        borderColor: isCopied ? '#16a34a' : undefined,
                        color: isCopied ? '#15803d' : undefined
                      }}
                      onClick={() => handleCopy(block.id, block.content)}
                    >
                      {isCopied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                      <span>{isCopied ? 'הועתק!' : 'העתק סעיף'}</span>
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      color: '#1e293b',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      maxHeight: '160px',
                      overflowY: 'auto'
                    }}
                  >
                    {block.content}
                  </pre>
                </div>
              );
            })}
          </div>

          <div className="email-modal-actions" style={{ marginTop: '14px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-cancel-modal" onClick={onClose}>
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
