import React, { useState } from 'react';
import { ClipboardList, Check, Plus, Trash2, X } from 'lucide-react';
import {
  SUPPORT_LEVEL_OPTIONS,
  formatObservationLine
} from '../../domain/goalObservations';

export default function QuickObservationModal({
  goalRow,
  authorName = '',
  onAddObservation,
  onDeleteObservation,
  onClose
}) {
  const [supportLevel, setSupportLevel] = useState('תיווך חלקי');
  const [note, setNote] = useState('');
  const [targetEvalField, setTargetEvalField] = useState('midYearEvaluation');
  const [savedToast, setSavedToast] = useState(false);

  const observations = Array.isArray(goalRow?.observations) ? goalRow.observations : [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddObservation?.({
      supportLevel,
      note,
      authorName,
      targetEvalField
    });
    setNote('');
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card email-report-modal"
        dir="rtl"
        style={{ maxWidth: '520px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header email-modal-header">
          <div className="modal-title-row">
            <ClipboardList size={22} />
            <div>
              <h3>תיעוד תצפית מהירה בשטח</h3>
              <p className="modal-subtitle">
                {goalRow?.environment || 'מטרה'}{' '}
                {goalRow?.title ? `• ${goalRow.title.slice(0, 48)}${goalRow.title.length > 48 ? '…' : ''}` : ''}
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

        <form className="modal-body email-modal-body" onSubmit={handleSubmit}>
          <div className="email-modal-field">
            <label className="email-modal-label">1. רמת תפקוד / תיווך שנצפתה:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {SUPPORT_LEVEL_OPTIONS.map((lvl) => {
                const active = supportLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSupportLevel(lvl)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: active ? '#eff6ff' : '#ffffff',
                      color: active ? '#1d4ed8' : '#334155',
                      textAlign: 'center'
                    }}
                  >
                    {active ? `✓ ${lvl}` : lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="email-modal-field">
            <label className="email-modal-label">2. הערה קצרה מהשטח (אופציונלי):</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="למשל: השתתף/ה במשחק שולחן 10 דקות עם תזכורת אחת..."
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '8px 10px',
                fontFamily: 'inherit',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div className="email-modal-field">
            <label className="email-modal-label">3. שילוב אוטומטי בהערכה תקופתית:</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'midYearEvaluation', label: 'הוסף להערכת מחצית' },
                { id: 'endYearEvaluation', label: 'הוסף להערכת סוף שנה' },
                { id: 'none', label: 'יומן בלבד' }
              ].map((opt) => {
                const active = targetEvalField === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTargetEvalField(opt.id)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: active ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      background: active ? '#e0f2fe' : '#f8fafc',
                      color: active ? '#0369a1' : '#475569'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {savedToast && (
            <div className="email-modal-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} />
              <span>התצפית נשמרה ושולבה במטרה!</span>
            </div>
          )}

          <div className="email-modal-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn-cancel-modal" onClick={onClose}>
              סגור
            </button>
            <button type="submit" className="btn-submit-email">
              <Plus size={16} />
              <span>שמור תצפית</span>
            </button>
          </div>

          {observations.length > 0 && (
            <div
              style={{
                marginTop: '14px',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '10px',
                maxHeight: '160px',
                overflowY: 'auto'
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                יומן תצפיות למטרה זו ({observations.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[...observations].reverse().map((obs) => (
                  <div
                    key={obs.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      fontSize: '0.82rem',
                      color: '#1e293b'
                    }}
                  >
                    <span>{formatObservationLine(obs)}</span>
                    {onDeleteObservation && (
                      <button
                        type="button"
                        onClick={() => onDeleteObservation(obs.id)}
                        title="מחק תצפית"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
