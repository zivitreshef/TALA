import { useState } from 'react';
import { X, Send, Eye, Edit3, AlertTriangle, Users } from 'lucide-react';
import {
  buildAdminOutreachEmailHtml,
  sendAdminOutreachEmailInBackground
} from '../../emailService';
import { getTrialRemainingDays, AllowedUserRecord } from '../../allowedUsers';

export interface AdminOutreachEmailModalProps {
  isOpen: boolean;
  recipients: AllowedUserRecord[];
  onClose: () => void;
  onRemoveRecipient?: (userId: string) => void;
  onSuccess?: (message: string) => void;
}

export interface OutreachTemplateDefinition {
  key: string;
  name: string;
  subject: string;
  body: string;
}

export const OUTREACH_TEMPLATES: OutreachTemplateDefinition[] = [
  {
    key: 'trial_ending',
    name: 'סיום תקופת ניסיון והצעת סיוע',
    subject: 'מערכת TALA – בדיקת קשר וסיוע לקראת סיום תקופת הניסיון',
    body: `שלום {name},

ראיתי שתקופת הניסיון שלך במערכת TALA עומדת להסתיים בעוד {remainingDays} ימים.

רציתי לבדוק באופן אישי כיצד מתקדמת ההתנסות שלך במערכת, האם הכל ברור או שאולי נתקלת בקשיים או שאלות שאוכל לסייע בהם?

המטרה שלי היא להבטיח שתוכלי להפיק את המרב מבניית תוכניות העבודה השנתיות (תל"א/תח"י) בגישה האקולוגית בצורה הפשוטה, המהירה והמקצועית ביותר.

אשמח מאוד לשמוע ממך – אפשר פשוט להשיב למייל זה או ליצור איתי קשר בכל שאלה.`
  },
  {
    key: 'check_in',
    name: 'בדיקת שביעות רצון וקשר שוטף',
    subject: 'מערכת TALA – מה שלומך? נשמח לסייע ולהתעדכן',
    body: `שלום {name},

פונה אליך כדי להתעדכן כיצד מתקדמת העבודה שלך במערכת TALA בימים אלו.

האם יש חלק בבניית תוכנית העבודה שהיית רוצה לקבל בו סיוע נוסף, הכוונה פדגוגית או מענה טכני?

אנו כאן תמיד כדי ללוות אותך ולדייק את הכלים לפי הצרכים של הכיתה והתלמידים שלך.`
  },
  {
    key: 'custom',
    name: 'הודעה מותאמת אישית',
    subject: 'הודעה אישית מהנהלת מערכת TALA',
    body: `שלום {name},

רציתי לפנות אליך בנושא...`
  }
];

/**
 * Interpolates template placeholders safely.
 */
export function interpolateOutreachTemplate(
  template: string,
  context: { name?: string; remainingDays?: number | null; group?: string }
): string {
  const safeName = context.name?.trim() || 'מורה';
  const safeDays = context.remainingDays !== undefined && context.remainingDays !== null
    ? String(context.remainingDays)
    : '0';
  const safeGroup = context.group?.trim() || 'ללא שיוך';

  return (template || '')
    .replace(/\{name\}/g, safeName)
    .replace(/\{remainingDays\}/g, safeDays)
    .replace(/\{group\}/g, safeGroup);
}

export default function AdminOutreachEmailModal({
  isOpen,
  recipients,
  onClose,
  onRemoveRecipient,
  onSuccess
}: AdminOutreachEmailModalProps) {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('trial_ending');
  const [subjectTemplate, setSubjectTemplate] = useState<string>(OUTREACH_TEMPLATES[0].subject);
  const [bodyTemplate, setBodyTemplate] = useState<string>(OUTREACH_TEMPLATES[0].body);
  const [activeViewTab, setActiveViewTab] = useState<'edit' | 'preview'>('edit');
  const [previewRecipientId, setPreviewRecipientId] = useState<string>(recipients[0]?.id || '');

  // Dispatch state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [sendError, setSendError] = useState<string>('');

  if (!isOpen) return null;

  const activePreviewRecipient = recipients.find((r) => r.id === previewRecipientId) || recipients[0];
  const previewRemainingDays = activePreviewRecipient ? getTrialRemainingDays(activePreviewRecipient) : null;

  const interpolatedPreviewSubject = activePreviewRecipient
    ? interpolateOutreachTemplate(subjectTemplate, {
        name: activePreviewRecipient.name,
        remainingDays: previewRemainingDays,
        group: activePreviewRecipient.group
      })
    : subjectTemplate;

  const interpolatedPreviewBody = activePreviewRecipient
    ? interpolateOutreachTemplate(bodyTemplate, {
        name: activePreviewRecipient.name,
        remainingDays: previewRemainingDays,
        group: activePreviewRecipient.group
      })
    : bodyTemplate;

  const handleSelectTemplate = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    const tmpl = OUTREACH_TEMPLATES.find((t) => t.key === templateKey);
    if (tmpl) {
      setSubjectTemplate(tmpl.subject);
      setBodyTemplate(tmpl.body);
    }
  };

  const handleStartBatchSend = async () => {
    if (!recipients.length) {
      setSendError('לא נבחרו נמענים לשליחה.');
      return;
    }
    if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
      setSendError('נא למלא נושא ותוכן הודעה לפני השליחה.');
      return;
    }

    setSendError('');
    setIsSending(true);
    let successCount = 0;
    const failures: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const user = recipients[i];
      const remainingDays = getTrialRemainingDays(user);
      setSendProgress({
        current: i + 1,
        total: recipients.length,
        currentName: user.name || user.email
      });

      const userSubject = interpolateOutreachTemplate(subjectTemplate, {
        name: user.name,
        remainingDays,
        group: user.group
      });

      const userMessage = interpolateOutreachTemplate(bodyTemplate, {
        name: user.name,
        remainingDays,
        group: user.group
      });

      try {
        await sendAdminOutreachEmailInBackground({
          teacherName: user.name,
          teacherEmail: user.email,
          remainingDays,
          group: user.group,
          subject: userSubject,
          messageContent: userMessage
        });
        successCount++;
      } catch (err: any) {
        console.error(`Failed to send outreach email to ${user.email}:`, err);
        failures.push(`${user.name || user.email}: ${err.message || 'שגיאת שליחה'}`);
      }

      // Small 250ms spacing between emails to avoid hitting Apps Script rate triggers
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    setIsSending(false);
    setSendProgress(null);

    if (failures.length === 0) {
      onSuccess?.(`נשלחו בהצלחה ${successCount} מתוך ${recipients.length} מיילים!`);
      onClose();
    } else {
      setSendError(`השליחה הסתיימה: ${successCount} נשלחו בהצלחה, ${failures.length} נכשלו.\n${failures.join('\n')}`);
    }
  };

  return (
    <div
      dir="rtl"
      className="modal-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !isSending) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* Header Strip */}
        <div style={{ height: '6px', background: 'linear-gradient(90deg, #7ec8e3 0%, #64a8e0 25%, #8b80d6 50%, #a98eda 75%, #c5aef2 100%)' }} />

        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1b365d 0%, #3b6ea5 55%, #6b46c1 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>שליחת מייל יזום למורים</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#e2e8f0' }}>
              שמירה על קשר, מענה לקשיים והצעת סיוע אישי בבניית תוכניות העבודה
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: isSending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Recipient Chips Strip */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            maxHeight: '110px',
            overflowY: 'auto'
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} />
            <span>נמענים ({recipients.length}):</span>
          </span>
          {recipients.map((user) => {
            const days = getTrialRemainingDays(user);
            return (
              <span
                key={user.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '999px',
                  padding: '2px 8px 2px 10px',
                  fontSize: '11.5px',
                  color: '#1e293b'
                }}
              >
                <strong>{user.name}</strong>
                {days !== null && <span style={{ color: '#6d28d9', fontSize: '10.5px' }}>({days} ימים)</span>}
                {onRemoveRecipient && recipients.length > 1 && !isSending && (
                  <button
                    type="button"
                    onClick={() => onRemoveRecipient(user.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '1px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="הסר מהשליחה"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })}
        </div>

        {/* View Switcher: Edit vs Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 16px',
            background: '#ffffff',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveViewTab('edit');
            }}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeViewTab === 'edit' ? 800 : 600,
              color: activeViewTab === 'edit' ? '#2563eb' : '#64748b',
              borderBottom: activeViewTab === 'edit' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Edit3 size={15} />
            <span>עריכת הודעה ותבניות</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveViewTab('preview');
            }}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeViewTab === 'preview' ? 800 : 600,
              color: activeViewTab === 'preview' ? '#2563eb' : '#64748b',
              borderBottom: activeViewTab === 'preview' ? '2.5px solid #2563eb' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Eye size={15} />
            <span>תצוגה מקדימה מעוצבת</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {sendError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#b91c1c',
                fontSize: '12.5px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span style={{ whiteSpace: 'pre-line' }}>{sendError}</span>
            </div>
          )}

          {activeViewTab === 'edit' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Template Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  בחר תבנית מוכנה:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {OUTREACH_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.key}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(tmpl.key);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: selectedTemplateKey === tmpl.key ? 700 : 500,
                        border: selectedTemplateKey === tmpl.key ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: selectedTemplateKey === tmpl.key ? '#eff6ff' : '#ffffff',
                        color: selectedTemplateKey === tmpl.key ? '#1d4ed8' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  נושא ההודעה:
                </label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Body */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    תוכן ההודעה:
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    משתנים זמינים: <code style={{ color: '#2563eb' }}>{'{name}'}</code>, <code style={{ color: '#2563eb' }}>{'{remainingDays}'}</code>, <code style={{ color: '#2563eb' }}>{'{group}'}</code>
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          ) : (
            /* Live Preview */
            <div>
              {recipients.length > 1 && (
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>הצג תצוגה מקדימה עבור:</span>
                  <select
                    value={previewRecipientId}
                    onChange={(e) => setPreviewRecipientId(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  >
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <iframe
                  title="תצוגה מקדימה של המייל"
                  srcDoc={buildAdminOutreachEmailHtml({
                    teacherName: activePreviewRecipient?.name || 'צוות חינוכי',
                    teacherEmail: activePreviewRecipient?.email || '',
                    remainingDays: previewRemainingDays,
                    group: activePreviewRecipient?.group,
                    subject: interpolatedPreviewSubject,
                    messageContent: interpolatedPreviewBody
                  })}
                  style={{
                    width: '100%',
                    height: '380px',
                    border: 'none',
                    display: 'block',
                    background: '#f0f4fa'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with Batch Progress and Send Action */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {sendProgress && (
              <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>שולח {sendProgress.current} מתוך {sendProgress.total}: {sendProgress.currentName}...</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSending ? 'not-allowed' : 'pointer'
              }}
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleStartBatchSend}
              disabled={isSending || !recipients.length}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isSending || !recipients.length ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #6b46c1 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSending || !recipients.length ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
              }}
            >
              <Send size={14} />
              <span>{isSending ? 'שולח מיילים...' : `שלח מייל מעוצב (${recipients.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
