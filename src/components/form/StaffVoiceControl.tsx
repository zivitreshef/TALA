import React, { useEffect, useState, useMemo, type CSSProperties } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Users,
  X,
  Copy,
  Check,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  History,
  RotateCcw,
  UserPlus,
  Sparkles
} from 'lucide-react';
import { getFirebaseAuth } from '../../firebaseBackend';
import { usageTelemetryService } from '../../services/usageTelemetryService';
import { TELEMETRY_EVENTS } from '../../domain/telemetryTaxonomy';
import {
  PREDEFINED_STAFF_ROLES,
  buildInviteUrl,
  buildStaffObservationNote,
  buildVoiceMergeText,
  buildWhatsAppShareUrl,
  extractStaffRecipientsFromStudent,
  getDefaultStaffQuestions,
  getInviteQuestions,
  getInviteState,
  sanitizeResponses,
  summarizeInvites,
  type InviteDoc
} from '../../domain/parentInvite';
import {
  createInvite,
  deleteInvite,
  ensureTeacherSession,
  markInviteReviewed,
  subscribeToStudentInvites
} from '../../services/inviteService';

const PILL_STYLES: Record<'none' | 'waiting' | 'received', CSSProperties> = {
  none: { background: '#f5f3ff', color: '#4c1d95', border: '1px solid #c4b5fd' },
  waiting: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  received: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }
};

function getFirstName(name?: string | null): string {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

export type StoredStaffInvite = Partial<InviteDoc> & {
  token: string;
  [key: string]: unknown;
};

export interface StaffMergePayload {
  mergedText: string;
  authorName: string;
  recipientRole: string;
  observationNote: string;
  invite: StoredStaffInvite;
}

export interface StaffVoiceControlProps {
  student?: Record<string, unknown> | null;
  currentUser?: { email?: string | null; [key: string]: unknown } | null;
  disabled?: boolean;
  isKindergarten?: boolean;
  onMergeStaffFeedback?: (payload: StaffMergePayload) => void;
  onAddPartnerToStudentCard?: (role: string, name: string) => void;
  initialOpen?: boolean;
  initialInvites?: StoredStaffInvite[] | null;
}

export default function StaffVoiceControl({
  student,
  currentUser,
  disabled = false,
  isKindergarten = false,
  onMergeStaffFeedback,
  onAddPartnerToStudentCard,
  initialOpen = false,
  initialInvites = null
}: StaffVoiceControlProps): React.JSX.Element {
  const [invites, setInvites] = useState<StoredStaffInvite[]>(() => initialInvites || []);
  const [open, setOpen] = useState<boolean>(initialOpen);
  const [busyKey, setBusyKey] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string>('');
  const [questionsList, setQuestionsList] = useState<string[] | null>(null);
  const [isCustomExpanded, setIsCustomExpanded] = useState<boolean>(false);
  const [historyExpanded, setHistoryExpanded] = useState<boolean>(false);

  // Selection from student card or quick-add
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [quickAddRole, setQuickAddRole] = useState<string>(PREDEFINED_STAFF_ROLES[0]);
  const [quickAddName, setQuickAddName] = useState<string>('');
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);

  const ownerEmail = String(currentUser?.email || '').trim().toLowerCase();
  const studentId = String(student?.id || '');

  const [authedEmail, setAuthedEmail] = useState<string>(() => getFirebaseAuth()?.currentUser?.email || '');
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (user: User | null) => setAuthedEmail(user?.email || ''));
  }, []);

  useEffect(() => {
    if (initialInvites) return undefined;
    setInvites([]);
    if (!ownerEmail || !studentId) return undefined;
    return subscribeToStudentInvites(
      ownerEmail,
      studentId,
      (incoming) => setInvites(incoming as StoredStaffInvite[]),
      () => {}
    );
  }, [ownerEmail, studentId, authedEmail, initialInvites]);

  const candidates = useMemo(
    () => extractStaffRecipientsFromStudent(student || {}, isKindergarten),
    [student, isKindergarten]
  );

  // Automatically select first candidate if none selected
  useEffect(() => {
    if (candidates.length > 0 && !candidates.some((c) => c.id === selectedCandidateId)) {
      setSelectedCandidateId(candidates[0].id);
    } else if (candidates.length === 0) {
      setSelectedCandidateId('');
    }
  }, [candidates, selectedCandidateId]);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) || null;

  const summary = summarizeInvites(invites as InviteDoc[], Date.now(), 'staff');
  const pendingStaffInvites = useMemo(
    () =>
      invites.filter(
        (i) => i.inviteType === 'staff' && getInviteState(i as InviteDoc) === 'pending'
      ),
    [invites]
  );

  const childFirstName = getFirstName(String(student?.name || ''));
  const gender: 'boy' | 'girl' = student?.gender === 'girl' ? 'girl' : 'boy';
  const currentHref = typeof window !== 'undefined' ? window.location.href : 'http://localhost';

  const defaultQuestions = getDefaultStaffQuestions({
    childName: childFirstName,
    gender,
    recipientRole: selectedCandidate?.role || ''
  });
  const activeQuestions = questionsList !== null ? questionsList : defaultQuestions;

  const handleQuestionChange = (idx: number, val: string): void => {
    const next = [...activeQuestions];
    next[idx] = val;
    setQuestionsList(next);
  };

  const handleQuestionDelete = (idx: number): void => {
    const next = activeQuestions.filter((_, i) => i !== idx);
    setQuestionsList(next);
  };

  const handleQuestionAdd = (): void => {
    if (activeQuestions.length < 5) {
      setQuestionsList([...activeQuestions, '']);
    }
  };

  const handleResetQuestions = (): void => {
    setQuestionsList(null);
  };

  const run = async (key: string, action: () => Promise<unknown>): Promise<void> => {
    setBusyKey(key);
    setError('');
    try {
      await ensureTeacherSession(ownerEmail);
      await action();
    } catch (err: unknown) {
      console.error('[StaffVoiceControl]', err);
      const fbErr = err as { code?: string; message?: string };
      const reason =
        fbErr?.code === 'permission-denied'
          ? 'אין הרשאה (ייתכן שהחיבור ל-Firebase לא פעיל)'
          : fbErr?.code || fbErr?.message || '';
      setError(`הפעולה נכשלה${reason ? `: ${reason}` : ''}. נסי שוב.`);
    } finally {
      setBusyKey('');
    }
  };

  const handleQuickAddConfirm = (): void => {
    const cleanName = quickAddName.trim();
    if (!cleanName) {
      setError('יש להזין את שם איש/אשת המקצוע.');
      return;
    }
    onAddPartnerToStudentCard?.(quickAddRole, cleanName);
    setQuickAddName('');
    setShowQuickAdd(false);
    setError('');
  };

  const handleCreateForCandidate = (): void => {
    if (!selectedCandidate) {
      setError('בחרי איש/אשת צוות מהרשימה או הוסיפי איש מקצוע חדש לכרטיס.');
      return;
    }

    const isCustomized = questionsList !== null;
    const finalQuestions = (isCustomized ? questionsList : defaultQuestions)
      .map((q) => q.trim())
      .filter(Boolean);

    if (finalQuestions.length === 0) {
      setError('יש להגדיר לפחות שאלה אחת.');
      return;
    }

    if (!studentId) {
      setError('לא נבחר תלמיד.');
      return;
    }

    void run('create', async () => {
      await createInvite({
        ownerEmail,
        studentId,
        childFirstName,
        gender,
        inviteType: 'staff',
        recipientRole: selectedCandidate.role,
        recipientName: selectedCandidate.name,
        customQuestions: isCustomized ? finalQuestions : [],
        overrideDefaults: isCustomized
      });
      try {
        usageTelemetryService.track(
          TELEMETRY_EVENTS.PARENT_VOICE_LINK_CREATED,
          { isCustomized },
          ownerEmail ? { userContext: { email: ownerEmail } } : {}
        );
      } catch (_) {}
      setQuestionsList(null);
      setIsCustomExpanded(false);
    });
  };

  const handleCopy = async (token: string, copyUrl: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(''), 2000);
    } catch {
      setError('לא ניתן להעתיק אוטומטית. סמני את הקישור והעתיקי ידנית.');
    }
  };

  const handleMerge = (invite: StoredStaffInvite): Promise<void> => {
    const token = String(invite.token || '');
    return run(token, async () => {
      await markInviteReviewed(token, 'merged');
      const mergedText = buildVoiceMergeText(invite as InviteDoc);
      const { authorName, note } = buildStaffObservationNote(invite as InviteDoc);
      onMergeStaffFeedback?.({
        mergedText,
        authorName,
        recipientRole: String(invite.recipientRole || ''),
        observationNote: note,
        invite
      });
      setOpen(false);
    });
  };

  const pillLabel = {
    none: 'איסוף משוב מצוות התלמיד',
    waiting: `ממתינים למענה מהצוות (${pendingStaffInvites.length})`,
    received: `התקבל משוב מהצוות${summary.unreviewed.length > 1 ? ` • ${summary.unreviewed.length}` : ''}`
  }[summary.status];

  return (
    <>
      <button
        type="button"
        disabled={disabled || !studentId || !ownerEmail}
        onClick={() => setOpen(true)}
        title="שליחת קישור קצר לאיסוף התייחסות ממורים מקצועיים, מטפלים ואנשי צוות המוגדרים בכרטיס"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          borderRadius: '8px',
          padding: '7px 14px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          ...PILL_STYLES[summary.status]
        }}
      >
        <Users size={15} />
        <span>{pillLabel}</span>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal-card email-report-modal"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', width: '95%' }}
          >
            <div className="modal-header email-modal-header">
              <div className="modal-title-row">
                <Users size={22} />
                <div>
                  <h3>קול הצוות הרב-מקצועי</h3>
                  <p className="modal-subtitle">
                    {childFirstName
                      ? `איסוף התייחסות מהצוות החינוכי והטיפולי של ${childFirstName}`
                      : 'שאלון קצר בקישור אישי לכל איש צוות'}
                  </p>
                </div>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setOpen(false)} title="סגור">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body email-modal-body">
              {/* 1. Unreviewed Submitted Responses */}
              {summary.unreviewed.map((invite) => {
                const stored = invite as StoredStaffInvite;
                const token = String(stored.token || '');
                const responses = sanitizeResponses(stored.responses, stored.customQuestions);
                const questions = getInviteQuestions({
                  childName: childFirstName,
                  gender,
                  inviteType: 'staff',
                  recipientRole: String(stored.recipientRole || ''),
                  customQuestions: stored.customQuestions,
                  overrideDefaults: Boolean(stored.overrideDefaults)
                });
                const senderBadge = [stored.recipientName, stored.recipientRole].filter(Boolean).join(' · ') || 'איש/אשת צוות';

                return (
                  <div
                    key={token}
                    style={{
                      border: '1px solid #86efac',
                      background: '#f0fdf4',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '14px'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#166534', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>התקבל משוב מ: {senderBadge}</span>
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
                        disabled={busyKey === token}
                        onClick={() => void handleMerge(stored)}
                      >
                        <Sparkles size={15} />
                        <span>שלבי בתיק התלמיד, במטרות וביומן התצפיות</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === token}
                        onClick={() => void run(token, () => markInviteReviewed(token, 'archived'))}
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

              {/* 2. Selection of Staff Member from Student Card */}
              <div style={{ borderTop: summary.unreviewed.length > 0 ? '1px dashed #cbd5e1' : 'none', paddingTop: summary.unreviewed.length > 0 ? '12px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                    1. בחרי איש/אשת צוות מתוך כרטיס התלמיד:
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd((v) => !v)}
                    style={{
                      background: '#ede9fe',
                      color: '#5b21b6',
                      border: '1px solid #c4b5fd',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <UserPlus size={13} />
                    <span>הוספת איש צוות נוסף לכרטיס</span>
                  </button>
                </div>

                {showQuickAdd && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px',
                      marginBottom: '12px',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}
                  >
                    <select
                      value={quickAddRole}
                      onChange={(e) => setQuickAddRole(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        background: '#ffffff'
                      }}
                    >
                      {PREDEFINED_STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="שם איש/אשת המקצוע..."
                      value={quickAddName}
                      onChange={(e) => setQuickAddName(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: '150px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddConfirm}
                      style={{
                        background: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      הוסף לבחירה
                    </button>
                  </div>
                )}

                {candidates.length === 0 ? (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '13px',
                      color: '#475569',
                      marginBottom: '12px'
                    }}
                  >
                    טרם הוזנו שמות אנשי צוות בכרטיס התלמיד. לחצי על <strong>&quot;הוספת איש צוות נוסף לכרטיס&quot;</strong> למעלה או מלאי את השדות בתיבת הצוות.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {candidates.map((cand) => {
                      const isSelected = cand.id === selectedCandidateId;
                      const hasPending = pendingStaffInvites.some(
                        (p) => p.recipientName === cand.name && p.recipientRole === cand.role
                      );
                      const hasSubmitted = summary.unreviewed.some(
                        (u) => u.recipientName === cand.name && u.recipientRole === cand.role
                      );
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => setSelectedCandidateId(cand.id)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '999px',
                            fontSize: '13px',
                            fontWeight: isSelected ? 700 : 600,
                            cursor: 'pointer',
                            border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                            background: isSelected ? '#eef2ff' : '#ffffff',
                            color: isSelected ? '#312e81' : '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>{isSelected ? `✓ ${cand.label}` : cand.label}</span>
                          {hasSubmitted && (
                            <span style={{ background: '#16a34a', color: '#fff', borderRadius: '999px', padding: '1px 6px', fontSize: '10.5px' }}>
                              התקבל
                            </span>
                          )}
                          {!hasSubmitted && hasPending && (
                            <span style={{ background: '#d97706', color: '#fff', borderRadius: '999px', padding: '1px 6px', fontSize: '10.5px' }}>
                              ממתין
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Question customization */}
                {selectedCandidate && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ marginBottom: '8px' }}>
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
                          התאמת שאלות השאלון עבור {selectedCandidate.name} ({selectedCandidate.role})
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              שאלות השאלון לאיש הצוות (עד 5 שאלות):
                            </span>
                            {questionsList !== null && (
                              <button
                                type="button"
                                onClick={handleResetQuestions}
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
                            <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                              <span style={{ width: '20px', fontSize: '13px', fontWeight: 700, color: '#64748b', textAlign: 'center' }}>
                                {idx + 1}.
                              </span>
                              <input
                                type="text"
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
                                gap: '4px'
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
                      onClick={handleCreateForCandidate}
                    >
                      <span>
                        {busyKey === 'create'
                          ? 'יוצרת קישור אישי…'
                          : `יצירת קישור עבור ${selectedCandidate.name} (${selectedCandidate.role})`}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Active Pending Links per Staff Member */}
              {pendingStaffInvites.length > 0 && (
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '10px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '13.5px', color: '#1e293b' }}>
                    קישורים פעילים שממתינים למענה ({pendingStaffInvites.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingStaffInvites.map((pend) => {
                      const pUrl = buildInviteUrl(currentHref, pend.token);
                      const who = [pend.recipientName, pend.recipientRole].filter(Boolean).join(' · ') || 'איש/אשת צוות';
                      return (
                        <div
                          key={pend.token}
                          style={{
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderRadius: '8px',
                            padding: '10px'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400e', marginBottom: '6px' }}>
                            קישור עבור: {who}
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={pUrl}
                            onFocus={(e) => (e.target as HTMLInputElement).select()}
                            style={{ width: '100%', direction: 'ltr', marginBottom: '8px', fontSize: '12px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-send-email-doc"
                              onClick={() => void handleCopy(pend.token, pUrl)}
                            >
                              {copiedToken === pend.token ? <Check size={15} /> : <Copy size={15} />}
                              <span>{copiedToken === pend.token ? 'הועתק' : 'העתקי קישור'}</span>
                            </button>
                            <a
                              className="btn-send-email-doc"
                              href={buildWhatsAppShareUrl(pUrl, {
                                childFirstName,
                                inviteType: 'staff',
                                recipientName: String(pend.recipientName || ''),
                                recipientRole: String(pend.recipientRole || '')
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none' }}
                            >
                              <Send size={15} />
                              <span>שליחה בוואטסאפ</span>
                            </a>
                            <button
                              type="button"
                              disabled={busyKey === pend.token}
                              onClick={() => void run(pend.token, () => deleteInvite(pend.token))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: '12.5px'
                              }}
                            >
                              ביטול קישור
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. History of Reviewed Staff Feedback */}
              {summary.history && summary.history.length > 0 && (
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '14px', paddingTop: '12px' }}>
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
                      <span>משובים קודמים מהצוות ({summary.history.length})</span>
                    </div>
                    {historyExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {historyExpanded && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {summary.history.map((inv) => {
                        const stored = inv as StoredStaffInvite;
                        const token = String(stored.token || '');
                        const responses = sanitizeResponses(stored.responses, stored.customQuestions);
                        const questions = getInviteQuestions({
                          childName: childFirstName,
                          gender,
                          inviteType: 'staff',
                          recipientRole: String(stored.recipientRole || ''),
                          customQuestions: stored.customQuestions,
                          overrideDefaults: Boolean(stored.overrideDefaults)
                        });
                        const who = [stored.recipientName, stored.recipientRole].filter(Boolean).join(' · ') || 'איש/אשת צוות';

                        return (
                          <div
                            key={token}
                            style={{
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              borderRadius: '8px',
                              padding: '10px 12px'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#334155', marginBottom: '6px' }}>
                              {who}
                            </div>
                            {questions
                              .filter((q) => responses[q.key])
                              .map((q) => (
                                <div key={q.key} style={{ marginBottom: '6px', fontSize: '13px' }}>
                                  <div style={{ color: '#475569', fontWeight: 600 }}>{q.label}</div>
                                  <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>{responses[q.key]}</div>
                                </div>
                              ))}
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
