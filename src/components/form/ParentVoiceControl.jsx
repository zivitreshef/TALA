import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  MessageSquareHeart,
  X,
  Copy,
  Check,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  History,
  RotateCcw
} from 'lucide-react';
import { getFirebaseAuth } from '../../firebaseBackend';
import {
  buildInviteUrl,
  buildVoiceMergeText,
  buildWhatsAppShareUrl,
  getDefaultQuestions,
  getInviteQuestions,
  sanitizeResponses,
  summarizeInvites,
  toMillis
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
export default function ParentVoiceControl({
  student,
  currentUser,
  disabled,
  onMerge,
  initialOpen = false,
  initialInvites = null
}) {
  const [invites, setInvites] = useState(() => initialInvites || []);
  const [open, setOpen] = useState(initialOpen);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [questionsList, setQuestionsList] = useState(null);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

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
    if (initialInvites) return undefined;
    setInvites([]);
    return subscribeToStudentInvites(ownerEmail, studentId, setInvites, () => {});
  }, [ownerEmail, studentId, authedEmail, initialInvites]);

  const summary = summarizeInvites(invites);
  const childFirstName = getFirstName(student?.name);
  const gender = student?.gender === 'girl' ? 'girl' : 'boy';
  const pending = summary.pending;
  const url = pending ? buildInviteUrl(window.location.href, pending.token) : '';

  const defaultQuestions = getDefaultQuestions({ childName: childFirstName, gender });
  const activeQuestions = questionsList !== null ? questionsList : defaultQuestions;

  const handleQuestionChange = (idx, val) => {
    const next = [...activeQuestions];
    next[idx] = val;
    setQuestionsList(next);
  };

  const handleQuestionDelete = (idx) => {
    const next = activeQuestions.filter((_, i) => i !== idx);
    setQuestionsList(next);
  };

  const handleQuestionAdd = () => {
    if (activeQuestions.length < 5) {
      setQuestionsList([...activeQuestions, '']);
    }
  };

  const handleResetQuestions = () => {
    setQuestionsList(null);
  };

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

  const handleCreate = () => {
    const isCustomized = questionsList !== null;
    const finalQuestions = (isCustomized ? questionsList : defaultQuestions)
      .map((q) => q.trim())
      .filter(Boolean);

    if (finalQuestions.length === 0) {
      setError('יש להגדיר לפחות שאלה אחת עבור ההורים.');
      return;
    }

    run('create', async () => {
      await createInvite({
        ownerEmail,
        studentId,
        childFirstName,
        gender,
        customQuestions: isCustomized ? finalQuestions : [],
        overrideDefaults: isCustomized
      });
      setQuestionsList(null);
      setIsCustomExpanded(false);
    });
  };

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
                const responses = sanitizeResponses(invite.responses, invite.customQuestions);
                const questions = getInviteQuestions({
                  childName: childFirstName,
                  gender,
                  customQuestions: invite.customQuestions,
                  overrideDefaults: !!invite.overrideDefaults
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
                        העברה לארכיון בלבד
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
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !isCustomExpanded;
                          setIsCustomExpanded(nextState);
                          if (nextState && questionsList === null) {
                            setQuestionsList([...defaultQuestions]);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4338ca',
                          cursor: 'pointer',
                          padding: '4px 0',
                          fontSize: '13px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {isCustomExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>
                          התאמת שאלות השאלון להורים{' '}
                          {questionsList !== null
                            ? `(${activeQuestions.filter((q) => q && q.trim()).length} שאלות)`
                            : '(צפייה ועריכה)'}
                        </span>
                      </button>

                      {isCustomExpanded && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '8px'
                            }}
                          >
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              שאלות השאלון (תוכלי לערוך ניסוח, למחוק או להוסיף עד 5 שאלות):
                            </span>
                            {questionsList !== null && (
                              <button
                                type="button"
                                onClick={handleResetQuestions}
                                title="שחזור 3 שאלות ברירת המחדל"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#4f46e5',
                                  cursor: 'pointer',
                                  fontSize: '11.5px',
                                  textDecoration: 'underline',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <RotateCcw size={12} />
                                <span>שחזור ברירת מחדל</span>
                              </button>
                            )}
                          </div>

                          {activeQuestions.map((q, idx) => (
                            <div
                              key={idx}
                              style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}
                            >
                              <span
                                style={{
                                  width: '20px',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#64748b',
                                  textAlign: 'center'
                                }}
                              >
                                {idx + 1}.
                              </span>
                              <input
                                type="text"
                                placeholder={`שאלה ${idx + 1}...`}
                                value={q}
                                maxLength={150}
                                onChange={(e) => handleQuestionChange(idx, e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '7px 10px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '13px'
                                }}
                              />
                              <button
                                type="button"
                                title="מחיקת שאלה"
                                onClick={() => handleQuestionDelete(idx)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#fff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}

                          {activeQuestions.length < 5 && (
                            <button
                              type="button"
                              onClick={handleQuestionAdd}
                              style={{
                                background: '#fff',
                                border: '1px dashed #a5b4fc',
                                color: '#4f46e5',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px'
                              }}
                            >
                              <Plus size={13} />
                              <span>הוספת שאלה</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-submit-email"
                      disabled={busyKey === 'create'}
                      onClick={handleCreate}
                    >
                      <span>{busyKey === 'create' ? 'יוצרת קישור…' : 'יצירת קישור להורים'}</span>
                    </button>
                  </div>
                )}
              </div>

              {summary.history && summary.history.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '16px', paddingTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryExpanded((v) => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <History size={16} color="#64748b" />
                      <span>מענים קודמים מההורים ({summary.history.length})</span>
                    </div>
                    {historyExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {historyExpanded && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {summary.history.map((inv) => {
                        const responses = sanitizeResponses(inv.responses, inv.customQuestions);
                        const questions = getInviteQuestions({
                          childName: childFirstName,
                          gender,
                          customQuestions: inv.customQuestions,
                          overrideDefaults: !!inv.overrideDefaults
                        });
                        const rawDate = inv.submittedAt || inv.createdAt;
                        const dateMs = toMillis(rawDate);
                        const dateStr = !Number.isNaN(dateMs)
                          ? new Date(dateMs).toLocaleDateString('he-IL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : '';
                        const wasMerged = inv.reviewedAction === 'merged';

                        return (
                          <div
                            key={inv.token}
                            style={{
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              borderRadius: '8px',
                              padding: '10px 12px'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px',
                                borderBottom: '1px solid #f1f5f9',
                                paddingBottom: '4px'
                              }}
                            >
                              <span style={{ fontSize: '12px', color: '#64748b' }}>
                                מענה {dateStr ? `מיום ${dateStr}` : 'קודם'}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: wasMerged ? '#dcfce7' : '#f1f5f9',
                                  color: wasMerged ? '#166534' : '#475569'
                                }}
                              >
                                {wasMerged ? 'שולב בטופס' : 'נשמר בארכיון'}
                              </span>
                            </div>

                            {questions
                              .filter((q) => responses[q.key])
                              .map((q) => (
                                <div key={q.key} style={{ marginBottom: '6px', fontSize: '13px' }}>
                                  <div style={{ color: '#475569', fontWeight: 600 }}>{q.label}</div>
                                  <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>
                                    {responses[q.key]}
                                  </div>
                                </div>
                              ))}

                            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-start' }}>
                              <button
                                type="button"
                                className="btn-submit-email"
                                disabled={busyKey === inv.token}
                                onClick={() => handleMerge(inv)}
                                style={{ fontSize: '12px', padding: '4px 10px' }}
                              >
                                <span>שלבי שוב בתיאור החופשי</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p role="alert" style={{ color: '#b91c1c', fontSize: '13px', marginTop: '10px' }}>
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
