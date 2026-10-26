import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Mail,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Lock,
  Ban,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers
} from 'lucide-react';
import {
  aggregateTelemetryData,
  generateTelemetryCsv,
  DAILY_AI_QUOTA_LIMIT,
  DAILY_EMAIL_QUOTA_LIMIT
} from '../../domain/telemetry.js';
import {
  fetchTelemetrySnapshot,
  setEmergencyAiFreeze
} from '../../services/telemetryService.js';

export default function AdminUsageAndSecurityDashboard({
  students = [],
  settings = {},
  onSettingsChange,
  onTelemetryUpdated
}) {
  const [loading, setLoading] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [rawAiLogs, setRawAiLogs] = useState([]);
  const [rawEmailLogs, setRawEmailLogs] = useState([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [showBlazeBreakdown, setShowBlazeBreakdown] = useState(false);
  const [showLargestFiles, setShowLargestFiles] = useState(false);

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const snap = await fetchTelemetrySnapshot({ maxAiLogs: 300, maxEmailLogs: 300 });
      setRawAiLogs(snap.aiLogs || []);
      setRawEmailLogs(snap.emailLogs || []);
      setLastRefreshedAt(new Date());
      if (onTelemetryUpdated) {
        onTelemetryUpdated(snap);
      }
    } catch (err) {
      console.warn('[AdminUsageAndSecurityDashboard] Refresh failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  const data = useMemo(() => {
    return aggregateTelemetryData({
      aiLogs: rawAiLogs,
      emailLogs: rawEmailLogs,
      students,
      settings,
      now: new Date()
    });
  }, [rawAiLogs, rawEmailLogs, students, settings]);

  const handleToggleAiFreeze = async () => {
    const nextFreeze = !data.isAiFrozen;
    const confirmMsg = nextFreeze
      ? 'האם אתה בטוח שברצונך להקפיא מיידית את כל שירותי ה-AI במערכת?\n\nפעולה זו תחסום כל פנייה למודל Gemini של כל המורות עד לביטול ההקפאה.'
      : 'האם לבטל את הקפאת ה-AI ולהחזיר את המערכת לפעילות שגרתית מלאה?';

    if (!window.confirm(confirmMsg)) return;

    setFreezeLoading(true);
    try {
      await setEmergencyAiFreeze(nextFreeze);
      if (onSettingsChange) {
        onSettingsChange({ ...settings, aiFreeze: nextFreeze });
      }
    } catch (err) {
      alert('שגיאה בעדכון מצב הקפאת AI: ' + err.message);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleExportCsv = () => {
    try {
      const csvContent = generateTelemetryCsv({
        aiLogs: rawAiLogs,
        emailLogs: rawEmailLogs
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tala_telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('שגיאה ביצוא קובץ CSV: ' + err.message);
    }
  };

  // Find max value in last 7 days for bar chart scale
  const maxBarValue = useMemo(() => {
    const maxVal = Math.max(
      1,
      ...data.last7Days.map((d) => Math.max(d.aiCount, d.emailCount))
    );
    return maxVal;
  }, [data.last7Days]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Circuit Breaker Emergency Banner (if active) */}
      {data.isAiFrozen && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Ban size={24} style={{ color: '#dc2626' }} />
            <div>
              <strong style={{ fontSize: '15px', color: '#991b1b', display: 'block' }}>
                מתג חירום פעיל: שירותי ה-AI מוקפאים כעת לכל המשתמשים!
              </strong>
              <span style={{ fontSize: '12px', color: '#b91c1c' }}>
                כל שאילתת AI נחסמת באופן מיידי כדי למנוע חריגת עלויות או שימוש לרעה.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAiFreeze}
            disabled={freezeLoading}
            className="btn-primary-sm"
            style={{
              background: '#dc2626',
              color: '#ffffff',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {freezeLoading ? 'מעדכן...' : '🔓 בטל הקפאת חירום (החזר לפעילות)'}
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px'
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e3a5f' }}>
            📊 לוח בקרה פיננסי, ניטור שימוש ואבטחה בזמן אמת
          </h4>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {lastRefreshedAt
              ? `עודכן לאחרונה: ${lastRefreshedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (מתוך נתוני הענן)`
              : 'טוען נתוני ענן...'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={rawAiLogs.length === 0 && rawEmailLogs.length === 0}
            title="יצוא יומן פעילות מלא לקובץ CSV"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f766e',
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>יצוא ל-CSV</span>
          </button>

          <button
            type="button"
            onClick={loadSnapshot}
            disabled={loading}
            title="רענן נתוני ענן עכשיו"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#1e40af',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'מרענן...' : 'רענן נתונים'}</span>
          </button>

          {!data.isAiFrozen && (
            <button
              type="button"
              onClick={handleToggleAiFreeze}
              disabled={freezeLoading}
              title="הקפאת שירות AI מיידית במקרה של מתקפה או חריגת עלות"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#991b1b',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                cursor: freezeLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <Lock size={14} />
              <span>הקפאת AI בחירום</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 1: KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}
      >
        {/* Card 1: AI Queries */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border: '1px solid #ddd6fe',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#5b21b6' }}>
              🤖 שאילתות AI (Gemini)
            </span>
            <Zap size={18} style={{ color: '#7c3aed' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <strong style={{ fontSize: '26px', color: '#4c1d95', lineHeight: 1 }}>
              {data.aiTodayCount}
            </strong>
            <span style={{ fontSize: '12.5px', color: '#6d28d9' }}>
              / {data.aiQuotaLimit} היום
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: '#ddd6fe', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, data.aiUsageRatio * 100)}%`,
                height: '100%',
                background: data.aiUsageRatio > 0.85 ? '#dc2626' : '#7c3aed',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6d28d9', marginTop: '2px' }}>
            <span>חודשי: <strong>{data.aiMonthCount}</strong></span>
            <span>עלות משוערת: <strong>~{data.estimatedAiCostIls} ₪</strong></span>
          </div>
        </div>

        {/* Card 2: Email Sending */}
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e40af' }}>
              ✉️ משלוח מיילים (Apps Script)
            </span>
            <Mail size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <strong style={{ fontSize: '26px', color: '#1e3a8a', lineHeight: 1 }}>
              {data.emailTodayCount}
            </strong>
            <span style={{ fontSize: '12.5px', color: '#2563eb' }}>
              / {data.emailQuotaLimit} היום
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#bfdbfe', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, data.emailUsageRatio * 100)}%`,
                height: '100%',
                background: data.emailUsageRatio > 0.85 ? '#ea580c' : '#2563eb',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#1e40af', marginTop: '2px' }}>
            <span>נותרו היום: <strong>{data.emailRemainingToday}</strong></span>
            <span>מצטבר החודש: <strong>{data.emailMonthCount}</strong></span>
          </div>
        </div>

        {/* Card 3: Cloud Storage Footprint */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534' }}>
              💾 אחסון תיקי אבחון (Storage)
            </span>
            <HardDrive size={18} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <strong style={{ fontSize: '26px', color: '#14532d', lineHeight: 1 }}>
              {data.storage.formattedMb}
            </strong>
            <span style={{ fontSize: '12px', color: '#166534' }}>
              / 5,120 MB
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#bbf7d0', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(1, data.storage.usagePercent))}%`,
                height: '100%',
                background: '#16a34a',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#166534', marginTop: '2px' }}>
            <span>סה"כ קבצים: <strong>{data.storage.totalFiles}</strong></span>
            <span>שימוש: <strong>{data.storage.usagePercent}% (חינמי)</strong></span>
          </div>
        </div>

        {/* Card 4: Security Threat Level */}
        <div
          style={{
            background:
              data.threatLevel === 'critical'
                ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                : data.threatLevel === 'warning'
                ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: `1px solid ${
              data.threatLevel === 'critical'
                ? '#fca5a5'
                : data.threatLevel === 'warning'
                ? '#fde68a'
                : '#cbd5e1'
            }`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color:
                  data.threatLevel === 'critical'
                    ? '#991b1b'
                    : data.threatLevel === 'warning'
                    ? '#92400e'
                    : '#334155'
              }}
            >
              🛡️ סטטוס אבטחה וחסימת תקיפות
            </span>
            {data.threatLevel === 'safe' ? (
              <ShieldCheck size={18} style={{ color: '#16a34a' }} />
            ) : (
              <ShieldAlert
                size={18}
                style={{ color: data.threatLevel === 'critical' ? '#dc2626' : '#d97706' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <strong
              style={{
                fontSize: '24px',
                color:
                  data.threatLevel === 'critical'
                    ? '#991b1b'
                    : data.threatLevel === 'warning'
                    ? '#92400e'
                    : '#15803d',
                lineHeight: 1
              }}
            >
              {data.threatLevel === 'safe' ? 'תקין ומאובטח' : 'זוהו חריגות'}
            </strong>
          </div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px', lineHeight: 1.4 }}>
            {data.threatLevel === 'safe' ? (
              <span>לא נרשמו ניסיונות הזרקה או חריגות קצב ב-24 שעות אחרונות.</span>
            ) : (
              <span style={{ color: '#991b1b', fontWeight: 600 }}>
                {data.recentInjectionsCount > 0 && `נחסמו ${data.recentInjectionsCount} ניסיונות הזרקה. `}
                {data.recentRateLimitsCount > 0 && `נרשמו ${data.recentRateLimitsCount} חריגות קצב (429).`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: 7-Day Usage Activity Trend & Peaks */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: '#2563eb' }} />
            <strong style={{ fontSize: '14px', color: '#1e3a5f' }}>
              📈 מגמת שימוש יומית ושיאים (7 ימים אחרונים):
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', color: '#64748b' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', background: '#7c3aed', borderRadius: '2px' }} />
              שאילתות AI
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px' }} />
              מיילים
            </span>
          </div>
        </div>

        {/* Bar Chart Visualizer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            alignItems: 'end',
            minHeight: '110px',
            paddingTop: '20px',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          {data.last7Days.map((d) => {
            const aiHeight = Math.max(4, (d.aiCount / maxBarValue) * 80);
            const emailHeight = Math.max(4, (d.emailCount / maxBarValue) * 80);
            const isToday = d.key === data.last7Days[data.last7Days.length - 1].key;

            return (
              <div
                key={d.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '3px',
                    height: '80px',
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <div
                    title={`AI: ${d.aiCount}`}
                    style={{
                      width: '14px',
                      height: `${aiHeight}px`,
                      background: isToday ? '#6d28d9' : '#8b5cf6',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                  />
                  <div
                    title={`מיילים: ${d.emailCount}`}
                    style={{
                      width: '14px',
                      height: `${emailHeight}px`,
                      background: isToday ? '#1d4ed8' : '#60a5fa',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#1e3a8a' : '#64748b',
                      display: 'block'
                    }}
                  >
                    {d.dayName}
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                    {d.dateShort}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Firebase Blaze Services Cost Simulator */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div
          onClick={() => setShowBlazeBreakdown(!showBlazeBreakdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: '#0f766e' }} />
            <strong style={{ fontSize: '14px', color: '#134e4a' }}>
              💰 פירוט שירותי ענן ומחשבון עלויות Blaze (סך עלות נוכחית: 0.00 ₪)
            </strong>
          </div>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#0f766e'
            }}
          >
            {showBlazeBreakdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showBlazeBreakdown && (
          <div className="allowed-users-table-wrap" style={{ marginTop: '6px' }}>
            <table className="allowed-users-table">
              <thead>
                <tr>
                  <th>שירות ענן</th>
                  <th>מסגרת חינמית (Free Tier)</th>
                  <th>צריכה נוכחית</th>
                  <th>סטטוס חיוב</th>
                  <th>עלות משוערת</th>
                </tr>
              </thead>
              <tbody>
                {data.blazeBreakdown.map((row) => (
                  <tr key={row.service}>
                    <td style={{ fontWeight: 600 }}>{row.service}</td>
                    <td style={{ fontSize: '11.5px', color: '#475569' }}>{row.freeTier}</td>
                    <td style={{ fontWeight: 600, color: '#1e3a8a' }}>{row.currentUsage}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#15803d',
                          background: '#dcfce7',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid #86efac'
                        }}
                      >
                        ✅ כלול בחינם
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#15803d' }}>
                      {row.estimatedCostIls}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 4: Storage Inspector (Largest Dossier Files) */}
      {data.storage.largestFiles.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div
            onClick={() => setShowLargestFiles(!showLargestFiles)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#16a34a' }} />
              <strong style={{ fontSize: '14px', color: '#14532d' }}>
                📁 קבצי אבחון כבדים ביותר ב-Storage (Top 5 Files)
              </strong>
            </div>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#16a34a'
              }}
            >
              {showLargestFiles ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {showLargestFiles && (
            <div className="allowed-users-table-wrap" style={{ marginTop: '6px' }}>
              <table className="allowed-users-table">
                <thead>
                  <tr>
                    <th>שם הקובץ</th>
                    <th>משויך לתלמיד/ה</th>
                    <th>נפח קובץ</th>
                    <th>תאריך העלאה</th>
                  </tr>
                </thead>
                <tbody>
                  {data.storage.largestFiles.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.fileName}</td>
                      <td>{f.studentName}</td>
                      <td>
                        <strong style={{ color: '#16a34a' }}>{f.formattedSize}</strong>
                      </td>
                      <td style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString('he-IL') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Row 5: Security Threat Watchdog (Injections & Rate Limits) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: '#dc2626' }} />
            <strong style={{ fontSize: '14px', color: '#991b1b' }}>
              🛡️ יומן חסימות אבטחה, הזרקות וחריגות קצב (Security & Abuse Watchdog):
            </strong>
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            הזרקות: {data.blockedInjections.length} | חריגות קצב: {data.rateLimitEvents.length}
          </span>
        </div>

        {data.blockedInjections.length === 0 && data.rateLimitEvents.length === 0 ? (
          <div
            style={{
              padding: '14px',
              textAlign: 'center',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              fontSize: '12.5px',
              color: '#166534'
            }}
          >
            ✅ לא אותרו ניסיונות הזרקת פרומפטים או חריגות קצב (429) ביומן. המערכת מוגנת.
          </div>
        ) : (
          <div className="allowed-users-table-wrap" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <table className="allowed-users-table">
              <thead>
                <tr>
                  <th>זמן</th>
                  <th>סוג אירוע</th>
                  <th>משתמש / יוזם</th>
                  <th>פעולה שנחסמה</th>
                  <th>פרטים</th>
                  <th>סטטוס הגנה</th>
                </tr>
              </thead>
              <tbody>
                {data.blockedInjections.map((inj) => (
                  <tr key={inj.id}>
                    <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(inj.createdAtMs).toLocaleString('he-IL', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>
                    <td>
                      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '11px' }}>
                        Prompt Injection
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#991b1b' }}>
                      {inj.email}
                    </td>
                    <td>
                      <code style={{ fontSize: '11px', background: '#fee2e2', padding: '2px 5px', borderRadius: '4px' }}>
                        {inj.operation}
                      </code>
                    </td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>
                      {inj.model || 'gemini-2.5-flash'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#dc2626',
                          background: '#fef2f2',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid #fca5a5'
                        }}
                      >
                        ⛔ נחסם מיידית
                      </span>
                    </td>
                  </tr>
                ))}
                {data.rateLimitEvents.map((rl) => (
                  <tr key={rl.id}>
                    <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(rl.createdAtMs).toLocaleString('he-IL', {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>
                    <td>
                      <span style={{ color: '#d97706', fontWeight: 700, fontSize: '11px' }}>
                        Rate Limit 429
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#92400e' }}>
                      {rl.email}
                    </td>
                    <td>
                      <code style={{ fontSize: '11px', background: '#fef3c7', padding: '2px 5px', borderRadius: '4px' }}>
                        {rl.operation}
                      </code>
                    </td>
                    <td style={{ fontSize: '11px', color: '#64748b' }}>
                      חלון חריגה: {rl.limitedWindow}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#d97706',
                          background: '#fffbeb',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid #fde68a'
                        }}
                      >
                        ⚠️ הוגבל קצב
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 6: Top Active Consumers (Real Activity Breakdown) */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <strong style={{ fontSize: '14px', color: '#1e3a5f' }}>
          👥 דירוג משתמשות פעילות (Real Cloud Consumer Ranking):
        </strong>

        {data.topActiveTeachers.length === 0 ? (
          <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            טרם תועדה פעילות ביומן הענן.
          </div>
        ) : (
          <div className="allowed-users-table-wrap">
            <table className="allowed-users-table">
              <thead>
                <tr>
                  <th>כתובת מייל</th>
                  <th>שאילתות AI מתועדות</th>
                  <th>מיילים שנשלחו</th>
                  <th>פעילות אחרונה</th>
                </tr>
              </thead>
              <tbody>
                {data.topActiveTeachers.map((teacher) => (
                  <tr key={teacher.email}>
                    <td style={{ fontWeight: 600, color: '#1e3a8a' }}>
                      {teacher.email}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#6d28d9' }}>{teacher.aiCount}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#2563eb' }}>{teacher.emailCount}</span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {teacher.lastActiveMs
                        ? new Date(teacher.lastActiveMs).toLocaleString('he-IL', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
