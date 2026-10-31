import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  Sparkles,
  MessageSquare,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  EyeOff,
  Filter,
  Activity,
  Award,
  Download,
  AlertCircle,
  HelpCircle,
  Laptop,
  Smartphone,
  Tablet,
  Mic,
  FileText,
  ChevronDown
} from 'lucide-react';
import { fetchTelemetryEvents } from '../../services/telemetryStorage.js';
import { computeTelemetryAnalytics } from '../../domain/telemetryAggregator.js';

export function isUserAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'superadmin' || user.isAdmin === true) return true;
  const email = (user.email || '').trim().toLowerCase();
  const primaryAdmins = [
    'zivit.reshef@gmail.com',
    'moti.reshef@gmail.com',
    'moti_reshef@bmc.com',
    'admin@tala.education'
  ];
  return primaryAdmins.includes(email);
}

export default function AdminAnalyticsDashboard({
  currentUser = null,
  initialTimeRange = '30d',
  initialEvents = null,
  onExport = null
}) {
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [activeTab, setActiveTab] = useState('overview');
  const [excludeInternal, setExcludeInternal] = useState(true);
  const [samplingMode, setSamplingMode] = useState(false);
  const [events, setEvents] = useState(initialEvents || []);
  const [isLoading, setIsLoading] = useState(!initialEvents);
  const [retentionPeriod, setRetentionPeriod] = useState('90');

  const isAdmin = useMemo(() => isUserAdmin(currentUser), [currentUser]);

  const loadEvents = useCallback(async () => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const fetched = await fetchTelemetryEvents({
        timeRange,
        excludeInternal
      });
      setEvents(fetched || []);
    } catch (err) {
      console.warn('[AdminAnalyticsDashboard] Error loading telemetry events:', err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, excludeInternal, initialEvents]);

  useEffect(() => {
    if (isAdmin) {
      loadEvents();
    }
  }, [isAdmin, loadEvents]);

  // Compute live analytics from events
  const analytics = useMemo(() => {
    return computeTelemetryAnalytics(events, { timeRange });
  }, [events, timeRange]);

  // Export dataset to CSV
  const handleExportCsv = () => {
    if (typeof onExport === 'function') {
      onExport(events, analytics);
      return;
    }

    if (!events || events.length === 0) {
      alert('אין נתונים זמינים לייצוא בטווח שנבחר.');
      return;
    }

    const headers = ['EventID', 'EventName', 'Category', 'AnonUserId', 'SessionId', 'AccountType', 'TimestampMs', 'DateIso'];
    const rows = events.map((e) => [
      e.eventId || '',
      e.eventName || '',
      e.category || '',
      e.anonUserId || '',
      e.sessionId || '',
      e.accountType || '',
      e.timestampMs || 0,
      e.timestampMs ? new Date(e.timestampMs).toISOString() : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tala_telemetry_${timeRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Strict Access Control Guard
  if (!isAdmin) {
    return (
      <div
        dir="rtl"
        data-testid="admin-access-denied"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          background: 'var(--bg-page, #f8fafc)',
          borderRadius: '16px',
          border: '1.5px solid #fecaca',
          margin: '20px auto',
          maxWidth: '650px',
          color: '#991b1b',
          fontFamily: 'Rubik, sans-serif'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          גישה חסומה — נדרשות הרשאות ניהול
        </h2>
        <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: 1.6 }}>
          לוח בינת המשתמש ומדדי הטלמטריה מיועד אך ורק למנהלי מערכת מורשים של תל"א.
          פרטי החשבון הנוכחי אינם כוללים הרשאת מנהל.
        </p>
      </div>
    );
  }

  const {
    overview,
    cohorts,
    dailyTracking,
    staffReadiness,
    sharingAndChat,
    featureAdoption,
    userJourneys,
    uxFriction,
    technicalHealth
  } = analytics;

  return (
    <div
      dir="rtl"
      data-testid="admin-analytics-dashboard"
      style={{
        fontFamily: 'Rubik, system-ui, -apple-system, sans-serif',
        background: 'var(--bg-card, #ffffff)',
        color: 'var(--text-main, #24344d)',
        borderRadius: '16px',
        border: '1px solid var(--border, #d3dff0)',
        boxShadow: '0 4px 16px rgba(36, 52, 77, 0.08)',
        overflow: 'hidden',
        margin: '0 auto',
        width: '100%',
        maxWidth: '1320px'
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'var(--stained-glass-gradient, linear-gradient(135deg, #4a88c7 0%, #6879d0 50%, #8b6fc0 100%))',
          color: '#ffffff',
          padding: '22px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <span>📊</span> לוח בינת חוויית משתמש וטלמטריה — TALA
          </h1>
          <p style={{ fontSize: '13.5px', opacity: 0.9, marginTop: '4px', marginBottom: 0 }}>
            ניטור רציף של שגרת המורים, מעקב יומי, מוכנות לישיבות צוות, שיתוף מסמכים וצ'אט פדגוגי
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🛡️ 0% PII — אפס חשיפת פרטי תלמיד
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔒 מנהל מאומת
          </div>
          <button
            type="button"
            data-testid="btn-refresh-telemetry"
            onClick={loadEvents}
            title="רענן נתוני טלמטריה"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Controls Bar */}
      <div
        style={{
          padding: '14px 28px',
          background: '#fafcff',
          borderBottom: '1px solid var(--border, #d3dff0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        {/* Time Filter Group */}
        <div
          style={{
            display: 'flex',
            background: '#edf3fa',
            padding: '3px',
            borderRadius: '8px',
            gap: '3px'
          }}
        >
          {[
            { id: '24h', label: '24 שעות' },
            { id: '7d', label: '7 ימים' },
            { id: '30d', label: '30 יום' },
            { id: '90d', label: '90 יום' },
            { id: 'custom', label: 'מותאם אישית' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`time-btn-${t.id}`}
              onClick={() => setTimeRange(t.id)}
              style={{
                border: 'none',
                background: timeRange === t.id ? '#ffffff' : 'transparent',
                color: timeRange === t.id ? 'var(--primary, #4a88c7)' : 'var(--text-muted, #5e718d)',
                boxShadow: timeRange === t.id ? '0 1px 3px rgba(36, 52, 77, 0.08)' : 'none',
                fontWeight: timeRange === t.id ? 700 : 500,
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters and Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              color: 'var(--text-main, #24344d)'
            }}
          >
            <input
              type="checkbox"
              data-testid="toggle-exclude-internal"
              checked={excludeInternal}
              onChange={(e) => setExcludeInternal(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #4a88c7)', cursor: 'pointer' }}
            />
            <span>סנן חשבונות בדיקה ומנהלים</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              color: 'var(--text-main, #24344d)'
            }}
          >
            <input
              type="checkbox"
              data-testid="toggle-sampling-mode"
              checked={samplingMode}
              onChange={(e) => setSamplingMode(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2db39b', cursor: 'pointer' }}
            />
            <span>דגימת אירועים (חסכון במכסות)</span>
          </label>

          <button
            type="button"
            data-testid="btn-export-csv"
            onClick={handleExportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ffffff',
              border: '1px solid var(--border, #d3dff0)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--text-main, #24344d)',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            <Download size={14} />
            ייצוא CSV
          </button>
        </div>
      </div>

      {/* Navigation Tabs (8 Prominent Tabs) */}
      <nav
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--border-subtle, #e5edf7)',
          padding: '0 24px',
          background: '#ffffff',
          gap: '4px',
          overflowX: 'auto'
        }}
      >
        {[
          { id: 'overview', label: '📈 סקירה כללית' },
          { id: 'daily', label: '📝 מעקב פדגוגי יומי', badge: 'מודגש' },
          { id: 'staff', label: '👥 מוכנות לישיבות צוות', badge: 'מודגש' },
          { id: 'sharing', label: '📤 שיתוף וצ\'אט', badge: 'מודגש' },
          { id: 'features', label: '🧩 מודולים ואימוץ' },
          { id: 'journeys', label: '🗺️ מסעות מורה ו-Onboarding' },
          { id: 'friction', label: '⚠️ חיכוך וחוויית שימוש' },
          { id: 'health', label: '🛠️ בריאות טכנית והגדרות' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '12px 16px',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--primary, #4a88c7)' : 'var(--text-muted, #5e718d)',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary, #4a88c7)' : '3px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                style={{
                  background: activeTab === tab.id ? 'var(--primary-light, #eef5fc)' : '#f1f5f9',
                  color: activeTab === tab.id ? 'var(--primary, #4a88c7)' : '#64748b',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10.5px',
                  fontWeight: 700
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Tab Content */}
      <div style={{ padding: '24px 28px' }}>
        {/* Zero-Trust Privacy Banner */}
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#1e40af'
          }}
        >
          <span style={{ fontSize: '18px' }}>🛡️</span>
          <div>
            <strong>הגנת פרטיות קפדנית (Zero-Trust):</strong> כל הנתונים המוצגים להלן הינם מזהים אנונימיים
            לחלוטין (Pseudonymous IDs) ואינם כוללים שמות תלמידים, תעודות זהות, אבחונים, הערכות קליניות או תוכן
            הודעות חופשי של המורים.
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div data-testid="tab-content-overview" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI Cards Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>משתמשים פעילים חודשיים (MAU)</span>
                  <span style={{ ...cardIconStyle, background: '#eef5fc', color: '#4a88c7' }}>👥</span>
                </div>
                <div style={cardValueStyle}>{overview.mau} מורים</div>
                <div style={{ fontSize: '12px', color: overview.mauTrendPct >= 0 ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                  {overview.mauTrendPct >= 0 ? `↑ +${overview.mauTrendPct}%` : `↓ ${overview.mauTrendPct}%`} לעומת חודש קודם
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>משתמשים פעילים יומיים (DAU)</span>
                  <span style={{ ...cardIconStyle, background: '#eefbf7', color: '#2db39b' }}>⚡</span>
                </div>
                <div style={cardValueStyle}>{overview.dau} מורים</div>
                <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>
                  יחס DAU/MAU בריא של {overview.dauMauRatio}%
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>שיעור השלמת Onboarding</span>
                  <span style={{ ...cardIconStyle, background: '#fbf5ee', color: '#f59e0b' }}>🎓</span>
                </div>
                <div style={cardValueStyle}>{userJourneys.completionRate}%</div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  {userJourneys.completed} מתוך {userJourneys.started} מורים השלימו בהצלחה
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>פעולות ממוצעות למורה</span>
                  <span style={{ ...cardIconStyle, background: '#fbf0f0', color: '#ef4444' }}>⏱️</span>
                </div>
                <div style={cardValueStyle}>{overview.avgEventsPerActiveUser}</div>
                <div style={{ fontSize: '12px', color: '#5e718d', fontWeight: 500 }}>
                  מתוך {overview.eventsIn30d} אירועים ב-30 הימים האחרונים
                </div>
              </div>
            </div>

            {/* Cohorts & Module Activity Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
              {/* Cohort Matrix */}
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>📅 מטריצת שימור שבועי (Weekly Cohorts):</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={thStyle}>מחזור</th>
                        <th style={thStyle}>גודל</th>
                        <th style={thStyle}>שבוע 1</th>
                        <th style={thStyle}>שבוע 2</th>
                        <th style={thStyle}>שבוע 3</th>
                        <th style={thStyle}>שבוע 4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={tdStyle}><strong>{c.cohort}</strong></td>
                          <td style={tdStyle}>{c.size} מורים</td>
                          <td style={{ ...tdStyle, color: '#15803d', fontWeight: 700 }}>{c.week1}%</td>
                          <td style={{ ...tdStyle, color: c.week2 > 50 ? '#15803d' : '#b45309', fontWeight: 600 }}>{c.week2}%</td>
                          <td style={{ ...tdStyle, color: c.week3 > 40 ? '#15803d' : '#b45309', fontWeight: 600 }}>{c.week3}%</td>
                          <td style={{ ...tdStyle, color: c.week4 > 30 ? '#15803d' : '#64748b', fontWeight: 600 }}>{c.week4}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Module Activity Breakdown */}
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>📊 התפלגות פעילות לפי מודול:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {featureAdoption.modules.slice(0, 5).map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '140px', fontSize: '13px', fontWeight: 500 }}>{m.name}</span>
                      <div style={{ flex: 1, height: '10px', background: '#e9f0f8', borderRadius: '5px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${m.pct}%`,
                            background: idx === 0 ? '#4a88c7' : idx === 1 ? '#2db39b' : '#8b6fc0',
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                      <span style={{ width: '60px', fontSize: '12px', fontWeight: 600, textAlign: 'left', color: '#5e718d' }}>
                        {m.count} ({m.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DAILY PEDAGOGICAL TRACKING */}
        {activeTab === 'daily' && (
          <div data-testid="tab-content-daily" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={calloutBoxStyle}>
              <span>💡</span>
              <div>
                <strong>מדדי מעקב פדגוגי יומי (Daily Tracking Routine):</strong> מורים העושים שימוש קבוע במעקב
                יומי מדווחים על פחות שחיקה לקראת ישיבות הצוות. להלן ניתוח עומק של העקביות, אופן התיעוד ושיעורי הנטישה.
              </div>
            </div>

            {/* Daily KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>סה"כ רשומות מעקב</span>
                  <span style={{ ...cardIconStyle, background: '#eef5fc', color: '#4a88c7' }}>📝</span>
                </div>
                <div style={cardValueStyle}>{dailyTracking.completed}</div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  שיעור השלמה של {dailyTracking.completionRate}%
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>רצף מקסימלי (Streak)</span>
                  <span style={{ ...cardIconStyle, background: '#fef3c7', color: '#b45309' }}>🔥</span>
                </div>
                <div style={cardValueStyle}>{dailyTracking.maxStreak} ימים</div>
                <div style={{ fontSize: '12px', color: '#5e718d', fontWeight: 500 }}>
                  ממוצע רצף עקביות: {dailyTracking.avgStreak} ימים
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>זמן ממוצע לרשומה</span>
                  <span style={{ ...cardIconStyle, background: '#e0f2fe', color: '#0369a1' }}>⏱️</span>
                </div>
                <div style={cardValueStyle}>{dailyTracking.avgDurationSec} שניות</div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  תיעוד ממוקד ומהיר בפחות מדקה
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>שיעור נטישה ללא שמירה</span>
                  <span style={{ ...cardIconStyle, background: '#fee2e2', color: '#b91c1c' }}>🚪</span>
                </div>
                <div style={cardValueStyle}>{dailyTracking.abandonmentRate}%</div>
                <div style={{ fontSize: '12px', color: '#7f1d1d', fontWeight: 500 }}>
                  {dailyTracking.abandoned} יציאות לאחר כ-{dailyTracking.avgAbandonTimeSec} שניות בממוצע
                </div>
              </div>
            </div>

            {/* Breakdown Panels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              {/* Voice vs Text Logging */}
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>🎙️ אופן התיעוד: קולי (Voice) לעומת טקסטואלי:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mic size={15} color="#8b6fc0" /> הקלטה קולית חכמה:
                    </span>
                    <strong>{dailyTracking.voiceCount} ({dailyTracking.voicePct}%)</strong>
                  </div>
                  <div style={{ height: '8px', background: '#e9f0f8', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${dailyTracking.voicePct}%`, background: '#8b6fc0', borderRadius: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={15} color="#4a88c7" /> הקלדת טקסט:
                    </span>
                    <strong>{dailyTracking.textCount} ({dailyTracking.textPct}%)</strong>
                  </div>
                  <div style={{ height: '8px', background: '#e9f0f8', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${dailyTracking.textPct}%`, background: '#4a88c7', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>

              {/* Consistency Streaks Distribution */}
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>📈 התפלגות רצפי עקביות (Streaks):</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  {dailyTracking.streakDistribution.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '160px', fontSize: '12.5px', fontWeight: 500 }}>{s.range}</span>
                      <div style={{ flex: 1, height: '8px', background: '#e9f0f8', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.pct}%`, background: '#2db39b', borderRadius: '4px' }} />
                      </div>
                      <span style={{ width: '50px', fontSize: '12px', fontWeight: 600, textAlign: 'left', color: '#5e718d' }}>
                        {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF READINESS & SUMMARIES */}
        {activeTab === 'staff' && (
          <div data-testid="tab-content-staff" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={calloutBoxStyle}>
              <span>👥</span>
              <div>
                <strong>מוכנות לישיבות צוות וסיכומים פדגוגיים:</strong> מעקב אחר אימוץ כלי הסיכום האוטומטי
                ושימוש ברשימות התיוג של הצוות הרב-מקצועי.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>סיכומים פדגוגיים שהופקו</span>
                  <span style={{ ...cardIconStyle, background: '#eef5fc', color: '#4a88c7' }}>📄</span>
                </div>
                <div style={cardValueStyle}>{staffReadiness.summariesGenerated}</div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  {staffReadiness.staffMeetingSummaries} לישיבות צוות | {staffReadiness.periodicReviewSummaries} תקופתיים
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>שיעור אימוץ בקרב מורות</span>
                  <span style={{ ...cardIconStyle, background: '#f5f3ff', color: '#8b6fc0' }}>👩‍🏫</span>
                </div>
                <div style={cardValueStyle}>{staffReadiness.teacherAdoptionRate}%</div>
                <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>
                  {staffReadiness.teacherAdoptionCount} מורות הפיקו סיכום לקראת ישיבה
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>בדיקות מוכנות (Checklists)</span>
                  <span style={{ ...cardIconStyle, background: '#eefbf7', color: '#2db39b' }}>✔️</span>
                </div>
                <div style={cardValueStyle}>{staffReadiness.readinessChecksCount}</div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  ממוצע {staffReadiness.avgItemsCompleted} פריטים נבדקו
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>מוכנות מלאה לישיבה</span>
                  <span style={{ ...cardIconStyle, background: '#fffbeb', color: '#f59e0b' }}>🏆</span>
                </div>
                <div style={cardValueStyle}>{staffReadiness.fullyReadyRate}%</div>
                <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                  {staffReadiness.fullyReadyCount} מקרים של 100% מוכנות טרם המפגש
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>📊 חלוקה לפי קבוצות גודל כיתה/תלמידים:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>קבוצה קטנה (1-5 תלמידים):</span>
                    <strong>{staffReadiness.band1To5} סיכומים</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>קבוצה בינונית (6-15 תלמידים):</span>
                    <strong>{staffReadiness.band6To15} סיכומים</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>מסגרת רחבה (16+ תלמידים):</span>
                    <strong>{staffReadiness.band16Plus} סיכומים</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SHARING AND CHAT */}
        {activeTab === 'sharing' && (
          <div data-testid="tab-content-sharing" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={calloutBoxStyle}>
              <span>💬</span>
              <div>
                <strong>שיתוף מסמכים וצ'אט פדגוגי מונחה:</strong> בדיקת ערוצי שיתוף התל"א (PDF, Word, WhatsApp)
                ותדירות השימוש בצ'אט הפדגוגי — תוך שמירה מלאה על פרטיות (אפס תוכן הודעות נשמר).
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>מסמכים ששותפו</span>
                  <span style={{ ...cardIconStyle, background: '#eef5fc', color: '#4a88c7' }}>📤</span>
                </div>
                <div style={cardValueStyle}>{sharingAndChat.totalDocsShared}</div>
                <div style={{ fontSize: '12px', color: '#5e718d' }}>
                  PDF, DOCX והדפסה ישירה
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>ססיות צ'אט פדגוגי</span>
                  <span style={{ ...cardIconStyle, background: '#f5f3ff', color: '#8b6fc0' }}>💬</span>
                </div>
                <div style={cardValueStyle}>{sharingAndChat.chatSessionsStarted}</div>
                <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>
                  ממוצע {sharingAndChat.avgTurnsPerSession} אינטראקציות לססיה
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>משך שיחה ממוצע</span>
                  <span style={{ ...cardIconStyle, background: '#eefbf7', color: '#2db39b' }}>⏱️</span>
                </div>
                <div style={cardValueStyle}>{sharingAndChat.avgChatDurationSec} שניות</div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 500 }}>
                  מענה ממוקד ומהיר לשאלות המורה
                </div>
              </div>
            </div>

            {/* Channels & Tools Discovery */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>📤 ערוצי ייצוא ושיתוף מסמכים:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>הורדת PDF ישירה:</span>
                    <strong>{sharingAndChat.formats.pdf}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>קובץ Word (DOCX):</span>
                    <strong>{sharingAndChat.formats.docx}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>קישור WhatsApp:</span>
                    <strong>{sharingAndChat.channels.whatsapp_link}</strong>
                  </div>
                </div>
              </div>

              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>🔍 גילוי כלי עזר בצ'אט (Tool Discovery):</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {Object.entries(sharingAndChat.toolDiscoveryCounts).length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#8a9bb3' }}>טרם תועדו כלי עזר בצ'אט בטווח זה</div>
                  ) : (
                    Object.entries(sharingAndChat.toolDiscoveryCounts).map(([tool, count], idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>{tool}:</span>
                        <strong>{count} שימושים</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MODULES & FEATURE ADOPTION */}
        {activeTab === 'features' && (
          <div data-testid="tab-content-features" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>🧩 מפת אימוץ מודולים מלאה במערכת:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                {featureAdoption.modules.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ width: '180px', fontSize: '13.5px', fontWeight: 600 }}>{m.name}</span>
                    <div style={{ flex: 1, height: '12px', background: '#e9f0f8', borderRadius: '6px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${m.pct}%`,
                          background: `hsl(${210 + idx * 25}, 70%, 55%)`,
                          borderRadius: '6px'
                        }}
                      />
                    </div>
                    <span style={{ width: '80px', fontSize: '13px', fontWeight: 700, color: '#334155', textAlign: 'left' }}>
                      {m.count} ({m.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: USER JOURNEYS & ONBOARDING */}
        {activeTab === 'journeys' && (
          <div data-testid="tab-content-journeys" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>🗺️ משפך Onboarding ב-10 שלבים (Step-by-Step Funnel):</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                {userJourneys.steps.map((st) => (
                  <div
                    key={st.stepNumber}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#eef5fc',
                          color: '#4a88c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px'
                        }}
                      >
                        {st.stepNumber}
                      </div>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>{st.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        מורים שהשלימו: <strong>{st.count}</strong>
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                        {st.conversionPct}% המרה
                      </span>
                      {st.dropOffPct > 0 && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>
                          ↓ {st.dropOffPct}% נשירה
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: UX FRICTION */}
        {activeTab === 'friction' && (
          <div data-testid="tab-content-friction" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>יציאות מטפסים ללא שמירה</span>
                  <span style={{ ...cardIconStyle, background: '#fee2e2', color: '#b91c1c' }}>🚪</span>
                </div>
                <div style={cardValueStyle}>{uxFriction.dirtyExits}</div>
                <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 500 }}>
                  נטישת טופס עם שינויים לא שמורים
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>פעולות שנכשלו שוב ושוב</span>
                  <span style={{ ...cardIconStyle, background: '#fef3c7', color: '#b45309' }}>⚠️</span>
                </div>
                <div style={cardValueStyle}>{uxFriction.repeatedFailures}</div>
                <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>
                  לחיצות חוזרות או שגיאות ולידציה
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>פערי תצפית (Observation Gaps)</span>
                  <span style={{ ...cardIconStyle, background: '#e0f2fe', color: '#0369a1' }}>📅</span>
                </div>
                <div style={cardValueStyle}>{uxFriction.observationGaps}</div>
                <div style={{ fontSize: '12px', color: '#075985', fontWeight: 500 }}>
                  תלמידים ללא תיעוד מעל שבועיים
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>זמני תגובה של ה-AI</span>
                  <span style={{ ...cardIconStyle, background: '#f5f3ff', color: '#8b6fc0' }}>⚡</span>
                </div>
                <div style={cardValueStyle}>{uxFriction.p50}ms</div>
                <div style={{ fontSize: '12px', color: '#6b21a8', fontWeight: 600 }}>
                  p50: {uxFriction.p50}ms | p95: {uxFriction.p95}ms
                </div>
              </div>
            </div>

            {/* Latency Bands */}
            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>⚡ התפלגות זמני שהייה וביצועי AI:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>מהיר (&lt; 1 שנייה):</span>
                  <strong style={{ color: '#15803d' }}>{uxFriction.fastPct}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>סביר (1-3 שניות):</span>
                  <strong style={{ color: '#0369a1' }}>{uxFriction.mediumPct}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>איטי (&gt; 3 שניות):</span>
                  <strong style={{ color: '#b91c1c' }}>{uxFriction.slowPct}%</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: TECHNICAL HEALTH & CONTROLS */}
        {activeTab === 'health' && (
          <div data-testid="tab-content-health" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>שגיאות לקוח (JS Errors)</span>
                  <span style={{ ...cardIconStyle, background: '#fee2e2', color: '#b91c1c' }}>🐞</span>
                </div>
                <div style={cardValueStyle}>{technicalHealth.jsErrorsCount}</div>
                <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: 500 }}>
                  שגיאות דפדפן שנתפסו ב-ErrorBoundary
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>כשלונות פעולות ענן</span>
                  <span style={{ ...cardIconStyle, background: '#fef3c7', color: '#b45309' }}>☁️</span>
                </div>
                <div style={cardValueStyle}>{technicalHealth.apiFailuresCount}</div>
                <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 500 }}>
                  שגיאות רשת או גישה לפיירבייס
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>זמן טעינת עמוד</span>
                  <span style={{ ...cardIconStyle, background: '#e0f2fe', color: '#0369a1' }}>🏎️</span>
                </div>
                <div style={cardValueStyle}>{technicalHealth.avgPageLoadMs}ms</div>
                <div style={{ fontSize: '12px', color: '#075985', fontWeight: 500 }}>
                  זמן טעינה ממוצע של ה-SPA
                </div>
              </div>
            </div>

            {/* Top Errors & Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>🐞 שגיאות לקוח נפוצות:</h3>
                {technicalHealth.topErrors.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600, padding: '10px 0' }}>
                    ✓ לא נרשמו שגיאות לקוח בטווח זה!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {technicalHealth.topErrors.map((err, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                        <span style={{ color: '#b91c1c', fontWeight: 500 }}>{err.message}</span>
                        <strong>{err.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Administrative Retention Controls */}
              <div style={panelStyle}>
                <h3 style={panelTitleStyle}>⚙️ הגדרות שמירת נתונים ומחיקה (Retention):</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      תקופת שמירת אירועי טלמטריה בענן:
                    </label>
                    <select
                      value={retentionPeriod}
                      onChange={(e) => setRetentionPeriod(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontFamily: 'inherit',
                        fontSize: '13px'
                      }}
                    >
                      <option value="30">30 יום (מומלץ לחיסכון במכסה)</option>
                      <option value="90">90 יום (רבעון מלא)</option>
                      <option value="180">180 יום (חצי שנה)</option>
                      <option value="365">365 יום (שנה מלאה)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert(`הגדרת שמירת הנתונים נשמרה: ${retentionPeriod} יום.`)}
                    style={{
                      background: 'var(--primary, #4a88c7)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      alignSelf: 'flex-start'
                    }}
                  >
                    שמור הגדרות שמירה
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable styling objects
const cardStyle = {
  background: '#ffffff',
  border: '1px solid var(--border, #d3dff0)',
  borderRadius: '12px',
  padding: '16px 20px',
  boxShadow: '0 1px 3px rgba(36, 52, 77, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const cardHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const cardTitleStyle = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--text-muted, #5e718d)'
};

const cardIconStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px'
};

const cardValueStyle = {
  fontSize: '24px',
  fontWeight: 700,
  color: 'var(--text-main, #24344d)'
};

const panelStyle = {
  background: '#ffffff',
  border: '1px solid var(--border, #d3dff0)',
  borderRadius: '12px',
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(36, 52, 77, 0.04)'
};

const panelTitleStyle = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-main, #24344d)',
  margin: 0,
  marginBottom: '14px'
};

const calloutBoxStyle = {
  background: '#fdfbf7',
  border: '1px solid #fde68a',
  borderRadius: '10px',
  padding: '14px 18px',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  fontSize: '13px',
  color: '#92400e'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px'
};

const thStyle = {
  padding: '10px 12px',
  textAlign: 'right',
  color: '#475569',
  fontWeight: 600
};

const tdStyle = {
  padding: '10px 12px'
};
