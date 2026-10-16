import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { MessageSquareHeart, X, Copy, Check, Send } from 'lucide-react';
import { getFirebaseAuth } from '../../firebaseBackend';
import {
  buildInviteUrl,
  buildVoiceMergeText,
  buildWhatsAppShareUrl,
  getInviteQuestions,
  sanitizeResponses,
  summarizeInvites
} from '../../domain/parentInvite';
import {
  createInvite,
  deleteInvite,
  ensureTeacherSession,
  markInviteReviewed,
  subscribeToStudentInvites
} from '../../services/inviteService';

const PILL_STYLES = {
  none: { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' },
  waiting: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  received: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
};

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

/**
 * Single header pill + one modal. Adds no fields to the student form:
 * answers are merged into the existing teacher free-text via `onMerge`.
 */
export default function ParentVoiceControl({ student, currentUser, disabled, onMerge }) {
  const [invites, setInvites] = useState([]);
  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  const ownerEmail = String(currentUser?.email || '').trim().toLowerCase();
  const studentId = student?.id;

  // Re-subscribe once Firebase sign-in completes: a listener opened before sign-in is denied for good.
  const [authedEmail, setAuthedEmail] = useState(() => getFirebaseAuth()?.currentUser?.email || '');
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user) => setAuthedEmail(user?.email || ''));
  }, []);

  useEffect(() => {
    setInvites([]);
    return subscribeToStudentInvites(ownerEmail, studentId, setInvites, () => {});
  }, [ownerEmail, studentId, authedEmail]);

  const summary = summarizeInvites(invites);
  const childFirstName = getFirstName(student?.name);
  const gender = student?.gender === 'girl' ? 'girl' : 'boy';
  const pending = summary.pending;
  const url = pending ? buildInviteUrl(window.location.href, pending.token) : '';

  const run = async (key, action) => {
    setBusyKey(key);
    setError('');
    try {
      await ensureTeacherSession(ownerEmail);
      await action();
    } catch (err) {
      console.error('[ParentVoiceControl]', err);
      const reason =
        err?.code === 'permission-denied'
          ? 'אין הרשאה (ייתכן שהחיבור ל-Firebase לא פעיל או שכללי האבטחה טרם עודכנו)'
          : err?.code || err?.message || '';
      setError(`הפעולה נכשלה${reason ? `: ${reason}` : ''}. נסי שוב.`);
    } finally {
      setBusyKey('');
    }
  };

  const handleCreate = () =>
    run('create', () => createInvite({ ownerEmail, studentId, childFirstName, gender }));

  const handleCopy = async (token, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(''), 2000);
    } catch (_) {
      setError('לא ניתן להעתיק אוטומטית. סמני את הקישור והעתיקי ידנית.');
    }
  };

  const handleMerge = (invite) =>
    run(invite.token, async () => {
      await markInviteReviewed(invite.token, 'merged');
      onMerge(buildVoiceMergeText(invite));
      setOpen(false);
    });

  const pillLabel = {
    none: 'קול ההורים',
    waiting: 'ממתינים למענה',
    received: `התקבל מענה${summary.unreviewed.length > 1 ? ` • ${summary.unreviewed.length}` : ''}`
  }[summary.status];

  return (
    <>
      <button
        type="button"
        disabled={disabled || !studentId || !ownerEmail}
        onClick={() => setOpen(true)}
        title="איסוף דעת ההורים בקישור קצר"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          ...PILL_STYLES[summary.status]
        }}
      >
        <MessageSquareHeart size={15} />
        <span>{pillLabel}</span>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal-card email-report-modal"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px' }}
          >
            <div className="modal-header email-modal-header">
              <div className="modal-title-row">
                <MessageSquareHeart size={22} />
                <div>
                  <h3>קול ההורים</h3>
                  <p className="modal-subtitle">
                    {childFirstName ? `עבור ${childFirstName}` : 'שאלון קצר בקישור אישי'}
                  </p>
                </div>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setOpen(false)} title="סגור">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body email-modal-body">
              {summary.unreviewed.map((invite) => {
                const responses = sanitizeResponses(invite.responses);
                const questions = getInviteQuestions({
                  childName: childFirstName,
                  gender
                });
                return (
                  <div
                    key={invite.token}
                    style={{
                      border: '1px solid #86efac',
                      background: '#f0fdf4',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '14px'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
                      התקבל מענה מההורים
                    </div>
                    {questions
                      .filter((q) => responses[q.key])
                      .map((q) => (
                        <div key={q.key} style={{ marginBottom: '8px', fontSize: '13.5px' }}>
                          <div style={{ color: '#475569', fontWeight: 600 }}>{q.label}</div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{responses[q.key]}</div>
                        </div>
                      ))}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn-submit-email"
                        disabled={busyKey === invite.token}
                        onClick={() => handleMerge(invite)}
                      >
                        <span>שלבי בתיאור החופשי של המורה</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === invite.token}
                        onClick={() =>
                          run(invite.token, () => markInviteReviewed(invite.token, 'archived'))
                        }
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        ארכבי ללא שילוב
                      </button>
                    </div>
                  </div>
                );
              })}

                  <div style={{ borderTop: '1px dashed #cbd5e1', padding: '12px 0' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>קישור להורים</div>
                    {pending ? (
                      <>
                        <input
                          type="text"
                          readOnly
                          value={url}
                          onFocus={(e) => e.target.select()}
                          style={{ width: '100%', direction: 'ltr', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-send-email-doc"
                            onClick={() => handleCopy(pending.token, url)}
                          >
                            {copiedToken === pending.token ? <Check size={16} /> : <Copy size={16} />}
                            <span>{copiedToken === pending.token ? 'הועתק' : 'העתקי קישור'}</span>
                          </button>
                          <a
                            className="btn-send-email-doc"
                            href={buildWhatsAppShareUrl(url, { childFirstName })}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <Send size={16} />
                            <span>שליחה בוואטסאפ</span>
                          </a>
                          <button
                            type="button"
                            disabled={busyKey === pending.token}
                            onClick={() => run(pending.token, () => deleteInvite(pending.token))}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#b91c1c',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            ביטול הקישור
                          </button>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                          הקישור חד-פעמי ותקף 7 ימים.
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-submit-email"
                        disabled={busyKey === 'create'}
                        onClick={handleCreate}
                      >
                        <span>{busyKey === 'create' ? 'יוצרת קישור…' : 'יצירת קישור'}</span>
                      </button>
                    )}
                  </div>

              {error && (
                <p role="alert" style={{ color: '#b91c1c', fontSize: '13px' }}>
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
