import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Trash2, Check } from 'lucide-react';
import {
  HEALTH_CATEGORY_LABELS_HE,
  HEALTH_KIND_LABELS_HE,
  summarizeHealthEvents,
  normalizeHealthEvents,
  countUnreviewedHealthEvents
} from '../../domain/healthEvents.js';
import { pingAiProxy } from '../../services/aiProxyClient';
import { pingFirestore } from '../../firebaseBackend';

const SEVERITY_STYLE = {
  ok: { bg: '#f0fdf4', border: '#86efac', color: '#14532d', label: '🟢 תקין – לא נרשמו תקלות ב-24 השעות האחרונות' },
  warn: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', label: '🟠 נרשמו תקלות בודדות ב-24 השעות האחרונות' },
  critical: {
    bg: '#fef2f2',
    border: '#f87171',
    color: '#991b1b',
    label: '🔴 דורש בדיקה – מורים קיבלו תוצאה ממנוע מקומי או שנרשמו תקלות חוזרות'
  }
};

const formatTime = (ms) =>
  new Date(ms).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'medium' });

export default function SystemHealthPanel({
  healthEvents = [],
  healthReviewedMs = 0,
  onMarkHealthReviewed,
  onClearHealthEvents,
  cloudSyncState
}) {
  const [pingResults, setPingResults] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const events = useMemo(() => normalizeHealthEvents(healthEvents), [healthEvents]);
  const summary = useMemo(() => summarizeHealthEvents(events), [events]);
  const unreviewed = countUnreviewedHealthEvents(events, healthReviewedMs);
  const sev = SEVERITY_STYLE[summary.severity];

  const runPing = async () => {
    setIsPinging(true);
    setPingResults(null);
    const [ai, db] = await Promise.all([pingAiProxy(), pingFirestore()]);
    setPingResults([
      {
        key: 'ai',
        title: 'שרת AI (Cloud Functions + Gemini)',
        ok: ai.ok,
        latencyMs: ai.latencyMs,
        detail: ai.ok
          ? ''
          : `${HEALTH_CATEGORY_LABELS_HE[ai.category] || ai.category}${ai.status ? ` (HTTP ${ai.status})` : ''}${
              ai.message ? ` – ${ai.message}` : ''
            }`
      },
      {
        key: 'db',
        title: 'מסד נתונים (Firestore)',
        ok: db.ok,
        latencyMs: db.latencyMs,
        detail: db.ok ? '' : db.message
      },
      {
        key: 'sync',
        title: 'סנכרון ענן בדפדפן זה',
        ok: Boolean(cloudSyncState?.connected),
        latencyMs: null,
        detail: cloudSyncState?.connected ? '' : 'הדפדפן עובד במצב מקומי – אין סנכרון ענן'
      }
    ]);
    setIsPinging(false);
  };

  const handleClear = async () => {
    if (!window.confirm('למחוק את כל יומן אירועי הבריאות? לא ניתן לשחזר.')) return;
    setIsClearing(true);
    await onClearHealthEvents?.();
    setIsClearing(false);
  };

  return (
    <div
      style={{
        background: sev.bg,
        border: `1.5px solid ${sev.border}`,
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
      data-testid="system-health-panel"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <strong style={{ color: sev.color, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={17} /> בריאות המערכת ומעקב תקלות AI
        </strong>
        <button
          type="button"
          className="btn-primary-sm"
          onClick={runPing}
          disabled={isPinging}
          style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <RefreshCw size={13} />
          <span>{isPinging ? 'בודק…' : 'בדיקת תקינות עכשיו'}</span>
        </button>
      </div>

      <div style={{ fontSize: '12.5px', color: sev.color, fontWeight: 700 }}>{sev.label}</div>

      {pingResults && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
          {pingResults.map((r) => (
            <div
              key={r.key}
              style={{
                background: '#ffffff',
                border: `1px solid ${r.ok ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: r.ok ? '#15803d' : '#b91c1c' }}>
                {r.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{r.title}</span>
              </div>
              <div style={{ color: '#475569', marginTop: '3px' }}>
                {r.ok ? 'תקין' : 'תקלה'}
                {typeof r.latencyMs === 'number' ? ` • ${r.latencyMs}ms` : ''}
              </div>
              {r.detail && <div style={{ color: '#b91c1c', marginTop: '3px' }}>{r.detail}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
        <span style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '2px 10px' }}>
          אירועים ב-24 שעות: <strong>{summary.total}</strong>
        </span>
        <span style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '2px 10px' }}>
          מעברים למנוע מקומי: <strong>{summary.fallbackCount}</strong>
        </span>
        <span style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '2px 10px' }}>
          משתמשים שנפגעו: <strong>{summary.affectedUsers}</strong>
        </span>
        {Object.entries(summary.byCategory).map(([cat, count]) => (
          <span key={cat} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '2px 10px' }}>
            {HEALTH_CATEGORY_LABELS_HE[cat] || cat}: <strong>{count}</strong>
          </span>
        ))}
      </div>

      {events.length > 0 && (
        <>
          <div style={{ maxHeight: '260px', overflow: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'right' }}>
                  <th style={{ padding: '6px 8px' }}>זמן</th>
                  <th style={{ padding: '6px 8px' }}>משתמש</th>
                  <th style={{ padding: '6px 8px' }}>אירוע</th>
                  <th style={{ padding: '6px 8px' }}>סיבה</th>
                  <th style={{ padding: '6px 8px' }}>פירוט</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 25).map((e) => (
                  <tr
                    key={e.id || `${e.createdAtMs}-${e.kind}`}
                    style={{ borderTop: '1px solid #f1f5f9', background: e.createdAtMs > healthReviewedMs ? '#fff7ed' : 'transparent' }}
                  >
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{formatTime(e.createdAtMs)}</td>
                    <td style={{ padding: '6px 8px' }}>{e.userEmail || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{HEALTH_KIND_LABELS_HE[e.kind] || e.kind}</td>
                    <td style={{ padding: '6px 8px' }}>{HEALTH_CATEGORY_LABELS_HE[e.category] || e.category}</td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>
                      {[e.status ? `HTTP ${e.status}` : '', e.stage ? `שלב: ${e.stage}` : '', e.reason || '', e.message || '']
                        .filter(Boolean)
                        .join(' • ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onMarkHealthReviewed}
              disabled={unreviewed === 0}
              style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Check size={13} />
              <span>סמן כנסקר ({unreviewed})</span>
            </button>
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={handleClear}
              disabled={isClearing}
              style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Trash2 size={13} />
              <span>{isClearing ? 'מוחק…' : 'נקה יומן'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
