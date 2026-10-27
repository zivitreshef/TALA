import React, { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Save,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import {
  ALERT_CHANNELS,
  normalizeAdminAlerts,
  validateAlertChannel
} from '../../domain/adminAlerts.js';
import { sendTestAdminAlert } from '../../services/alertDispatcher.js';

export default function AdminAlertsPanel({
  allowedUsers = [],
  onUpdateAllowedUsers,
  emailEngineConfig = null
}) {
  const admins = (allowedUsers || []).filter((u) => u && u.role === 'admin' && u.active !== false);

  // Local state for each admin's alert preferences while editing
  const [alertsState, setAlertsState] = useState(() => {
    const initial = {};
    admins.forEach((admin) => {
      initial[admin.id || admin.email] = normalizeAdminAlerts(admin.adminAlerts, admin.email);
    });
    return initial;
  });

  const [expandedAdminId, setExpandedAdminId] = useState(() => (admins[0]?.id || admins[0]?.email || null));
  const [showGuide, setShowGuide] = useState(false);
  const [testingChannel, setTestingChannel] = useState(null); // { adminId, channel }
  const [testResult, setTestResult] = useState(null); // { adminId, channel, ok: boolean, message: string }
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if admins list changes
  React.useEffect(() => {
    setAlertsState((prev) => {
      const updated = { ...prev };
      admins.forEach((admin) => {
        const key = admin.id || admin.email;
        if (!updated[key]) {
          updated[key] = normalizeAdminAlerts(admin.adminAlerts, admin.email);
        }
      });
      return updated;
    });
  }, [allowedUsers]);

  const handleToggleChatNotification = (adminKey, enabled) => {
    setAlertsState((prev) => {
      const current = prev[adminKey] || normalizeAdminAlerts({});
      return {
        ...prev,
        [adminKey]: {
          ...current,
          notifyOnChat: enabled
        }
      };
    });
    setSaveSuccess(false);
  };

  const handleToggleHealthNotification = (adminKey, enabled) => {
    setAlertsState((prev) => {
      const current = prev[adminKey] || normalizeAdminAlerts({});
      return {
        ...prev,
        [adminKey]: {
          ...current,
          notifyOnHealth: enabled
        }
      };
    });
    setSaveSuccess(false);
  };

  const handleToggleChannel = (adminKey, channel) => {
    setAlertsState((prev) => {
      const currentAdmin = prev[adminKey] || normalizeAdminAlerts({});
      return {
        ...prev,
        [adminKey]: {
          ...currentAdmin,
          [channel]: {
            ...currentAdmin[channel],
            enabled: !currentAdmin[channel]?.enabled
          }
        }
      };
    });
    setSaveSuccess(false);
  };

  const handleFieldChange = (adminKey, channel, field, value) => {
    setAlertsState((prev) => {
      const currentAdmin = prev[adminKey] || normalizeAdminAlerts({});
      return {
        ...prev,
        [adminKey]: {
          ...currentAdmin,
          [channel]: {
            ...currentAdmin[channel],
            [field]: value
          }
        }
      };
    });
    setSaveSuccess(false);
  };

  const handleSaveAll = () => {
    if (!onUpdateAllowedUsers) return;

    const nextUsers = (allowedUsers || []).map((user) => {
      if (user.role !== 'admin') return user;
      const key = user.id || user.email;
      const adminAlerts = alertsState[key];
      if (!adminAlerts) return user;
      return {
        ...user,
        adminAlerts: normalizeAdminAlerts(adminAlerts, user.email)
      };
    });

    onUpdateAllowedUsers(nextUsers);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handleSendTest = async (admin, channel) => {
    const adminKey = admin.id || admin.email;
    const config = alertsState[adminKey]?.[channel];
    const validation = validateAlertChannel(channel, config);

    if (!validation.valid) {
      setTestResult({
        adminKey,
        channel,
        ok: false,
        message: validation.error
      });
      return;
    }

    setTestingChannel({ adminKey, channel });
    setTestResult(null);

    try {
      await sendTestAdminAlert({
        channel,
        config,
        adminName: admin.name || 'מנהל/ת',
        emailConfig: emailEngineConfig
      });
      setTestResult({
        adminKey,
        channel,
        ok: true,
        message: 'הודעת בדיקה נשלחה בהצלחה!'
      });
    } catch (err) {
      setTestResult({
        adminKey,
        channel,
        ok: false,
        message: err.message || 'שליחת הודעת בדיקה נכשלה'
      });
    } finally {
      setTestingChannel(null);
    }
  };

  if (!admins.length) {
    return (
      <div dir="rtl" align="right" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
        לא נמצאו משתמשים בעלי הרשאת מנהל מערכת (Admin) להגדרת התראות.
      </div>
    );
  }

  return (
    <div dir="rtl" align="right" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e3a8a' }}>
              התרעות מנהל בזמן אמת (Real-Time Push Alerts)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#3b82f6' }}>
              קבלת התרעה מיידית למייל, ל-WhatsApp או ל-Telegram בכל פעם שמתרחשת תקלת מערכת או חריגת מכסה
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <HelpCircle size={15} />
          {showGuide ? 'הסתר מדריך התחברות' : 'מדריך חיבור מהיר (100% חינם)'}
        </button>
      </div>

      {/* Quick Setup Guide (Collapsible) */}
      {showGuide && (
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            fontSize: '13px',
            color: '#334155',
            lineHeight: 1.6
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', color: '#0f172a' }}>
            🛠️ איך להגדיר קבלת התראות חינמיות ב-60 שניות:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>✉️ 1. אימייל (חינם לחלוטין)</div>
              <div>מופעל אוטומטית דרך מנוע המייל של TALA. פשוט ודאו שכתובת המייל מעודכנת והמתג דולק.</div>
            </div>
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: '4px' }}>💬 2. וואטסאפ (CallMeBot חינם)</div>
              <div>
                שלחו מטלפונכם בוואטסאפ את ההודעה: <code>I allow callmebot to send me messages</code> למספר{' '}
                <strong>+34 911 06 16 54</strong>. תקבלו מפתח (API Key) תוך שניות — הדביקו אותו כאן!
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>📱 3. טלגרם (הכי מהיר ואמין)</div>
              <div>
                הורידו Telegram, פתחו את הבוט <code>@userinfobot</code> וקבלו את ה-Id שלכם (Chat ID). מומלץ מאוד: פוש חינמי וללא מגבלות!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {admins.map((admin) => {
          const adminKey = admin.id || admin.email;
          const alerts = alertsState[adminKey] || normalizeAdminAlerts({}, admin.email);
          const isExpanded = expandedAdminId === adminKey;

          const anyEnabled = alerts.email?.enabled || alerts.whatsapp?.enabled || alerts.telegram?.enabled;

          return (
            <div
              key={adminKey}
              style={{
                background: '#ffffff',
                border: isExpanded ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: isExpanded ? '0 4px 12px rgba(37, 99, 235, 0.05)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Admin Card Header */}
              <div
                onClick={() => setExpandedAdminId(isExpanded ? null : adminKey)}
                style={{
                  padding: '14px 18px',
                  background: isExpanded ? '#f8fafc' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '14px'
                    }}
                  >
                    {admin.name ? admin.name[0] : 'A'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#1e293b' }}>
                        {admin.name || 'מנהל/ת מערכת'}
                      </span>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px'
                        }}
                      >
                        Admin
                      </span>
                      {anyEnabled && (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ShieldCheck size={12} />
                          התראות פעילות
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>{admin.email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {alerts.email?.enabled && (
                      <span title="אימייל פעיל" style={{ color: '#2563eb', fontSize: '14px' }}>✉️</span>
                    )}
                    {alerts.whatsapp?.enabled && (
                      <span title="וואטסאפ פעיל" style={{ color: '#16a34a', fontSize: '14px' }}>💬</span>
                    )}
                    {alerts.telegram?.enabled && (
                      <span title="טלגרם פעיל" style={{ color: '#0284c7', fontSize: '14px' }}>📱</span>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Channels Configuration (Collapsible) */}
              {isExpanded && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Notification Event Types Selector */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <strong style={{ fontSize: '13.5px', color: '#1e3a5f' }}>
                      סוגי ההתרעות שיועברו לערוצים המסומנים של חשבון זה:
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '4px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                        <input
                          type="checkbox"
                          checked={alerts.notifyOnChat !== false}
                          onChange={(e) => handleToggleChatNotification(adminKey, e.target.checked)}
                          style={{ width: '17px', height: '17px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span>💬 <strong>פניות צ'אט והודעות ממורות</strong></span>
                      </label>

                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
                        <input
                          type="checkbox"
                          checked={alerts.notifyOnHealth !== false}
                          onChange={(e) => handleToggleHealthNotification(adminKey, e.target.checked)}
                          style={{ width: '17px', height: '17px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span>🚨 <strong>תקלות מערכת, שגיאות AI וחריגת מכסה</strong></span>
                      </label>
                    </div>
                  </div>

                  {/* Channel 1: Email */}
                  <div
                    style={{
                      border: `1.5px solid ${alerts.email?.enabled ? '#bfdbfe' : '#e2e8f0'}`,
                      background: alerts.email?.enabled ? '#f0f9ff' : '#fafafa',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={18} color="#2563eb" />
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e3a8a' }}>
                          התרעות באימייל (Email Push)
                        </span>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: alerts.email?.enabled ? '#15803d' : '#64748b' }}>
                          {alerts.email?.enabled ? 'מופעל' : 'כבוי'}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(alerts.email?.enabled)}
                          onChange={() => handleToggleChannel(adminKey, ALERT_CHANNELS.EMAIL)}
                          style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {alerts.email?.enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '220px' }}>
                          <input
                            type="email"
                            dir="ltr"
                            placeholder="user@example.com"
                            value={alerts.email?.address || ''}
                            onChange={(e) => handleFieldChange(adminKey, ALERT_CHANNELS.EMAIL, 'address', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              outline: 'none',
                              background: '#ffffff'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSendTest(admin, ALERT_CHANNELS.EMAIL)}
                          disabled={testingChannel?.adminKey === adminKey && testingChannel?.channel === ALERT_CHANNELS.EMAIL}
                          style={{
                            height: '34px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid #bfdbfe',
                            background: '#ffffff',
                            color: '#1d4ed8',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Send size={13} />
                          {testingChannel?.adminKey === adminKey && testingChannel?.channel === ALERT_CHANNELS.EMAIL
                            ? 'שולח...'
                            : 'שלח בדיקה'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Channel 2: WhatsApp */}
                  <div
                    style={{
                      border: `1.5px solid ${alerts.whatsapp?.enabled ? '#bbf7d0' : '#e2e8f0'}`,
                      background: alerts.whatsapp?.enabled ? '#f0fdf4' : '#fafafa',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={18} color="#16a34a" />
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#14532d' }}>
                          התרעות בוואטסאפ (WhatsApp via CallMeBot)
                        </span>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: alerts.whatsapp?.enabled ? '#15803d' : '#64748b' }}>
                          {alerts.whatsapp?.enabled ? 'מופעל' : 'כבוי'}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(alerts.whatsapp?.enabled)}
                          onChange={() => handleToggleChannel(adminKey, ALERT_CHANNELS.WHATSAPP)}
                          style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {alerts.whatsapp?.enabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1', minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                              מספר טלפון (עם קידומת בינלאומית, ללא פלוס):
                            </label>
                            <input
                              type="tel"
                              dir="ltr"
                              placeholder="972501234567"
                              value={alerts.whatsapp?.phone || ''}
                              onChange={(e) => handleFieldChange(adminKey, ALERT_CHANNELS.WHATSAPP, 'phone', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                outline: 'none',
                                background: '#ffffff'
                              }}
                            />
                          </div>
                          <div style={{ flex: '1', minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                              מפתח CallMeBot API Key:
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder="123456"
                              value={alerts.whatsapp?.apiKey || ''}
                              onChange={(e) => handleFieldChange(adminKey, ALERT_CHANNELS.WHATSAPP, 'apiKey', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                outline: 'none',
                                background: '#ffffff'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleSendTest(admin, ALERT_CHANNELS.WHATSAPP)}
                              disabled={testingChannel?.adminKey === adminKey && testingChannel?.channel === ALERT_CHANNELS.WHATSAPP}
                              style={{
                                height: '36px',
                                padding: '0 12px',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0',
                                background: '#ffffff',
                                color: '#15803d',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <Send size={13} />
                              {testingChannel?.adminKey === adminKey && testingChannel?.channel === ALERT_CHANNELS.WHATSAPP
                                ? 'שולח...'
                                : 'שלח בדיקה'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Channel 3: Telegram */}
                  <div
                    style={{
                      border: `1.5px solid ${alerts.telegram?.enabled ? '#bae6fd' : '#e2e8f0'}`,
                      background: alerts.telegram?.enabled ? '#f0f9ff' : '#fafafa',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Smartphone size={18} color="#0284c7" />
                        <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#075985' }}>
                          התרעות בטלגרם (Telegram Push Bot)
                        </span>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: alerts.telegram?.enabled ? '#15803d' : '#64748b' }}>
                          {alerts.telegram?.enabled ? 'מופעל' : 'כבוי'}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(alerts.telegram?.enabled)}
                          onChange={() => handleToggleChannel(adminKey, ALERT_CHANNELS.TELEGRAM)}
                          style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {alerts.telegram?.enabled && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '180px' }}>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                            מזהה צ׳אט (Telegram Chat ID):
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            placeholder="למשל 123456789"
                            value={alerts.telegram?.chatId || ''}
                            onChange={(e) => handleFieldChange(adminKey, ALERT_CHANNELS.TELEGRAM, 'chatId', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              outline: 'none',
                              background: '#ffffff'
                            }}
                          />
                        </div>
                        <div style={{ flex: '1', minWidth: '180px' }}>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                            טוקן בוט (אופציונלי — משתמש בבוט ברירת המחדל אם ריק):
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            placeholder="ברירת מחדל של מערכת TALA"
                            value={alerts.telegram?.botToken || ''}
                            onChange={(e) => handleFieldChange(adminKey, ALERT_CHANNELS.TELEGRAM, 'botToken', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              outline: 'none',
                              background: '#ffffff'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleSendTest(admin, ALERT_CHANNELS.TELEGRAM)}
                            disabled={testingChannel?.adminKey === adminKey && testingChannel?.channel === ALERT_CHANNELS.TELEGRAM}
                            style={{
                              height: '36px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              border: '1px solid #bae6fd',
                              background: '#ffffff',
                              color: '#0369a1',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Send size={13} />
                            {testingChannel?.adminKey === adminKey && testingChannel?.channel === ALERT_CHANNELS.TELEGRAM
                              ? 'שולח...'
                              : 'שלח בדיקה'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Test Feedback Toast / Alert */}
                  {testResult && testResult.adminKey === adminKey && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: testResult.ok ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${testResult.ok ? '#bbf7d0' : '#fecaca'}`,
                        color: testResult.ok ? '#15803d' : '#b91c1c'
                      }}
                    >
                      {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', marginTop: '4px' }}>
        <button
          type="button"
          onClick={handleSaveAll}
          style={{
            height: '40px',
            padding: '0 20px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            borderRadius: '10px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.15s ease'
          }}
        >
          <Save size={16} />
          שמור הגדרות התראות
        </button>

        {saveSuccess && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#15803d',
              fontWeight: 700,
              fontSize: '13px'
            }}
          >
            <CheckCircle2 size={16} />
            ההגדרות נשמרו בהצלחה!
          </span>
        )}
      </div>
    </div>
  );
}
