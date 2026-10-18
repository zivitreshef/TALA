import React from 'react';
import { ShieldAlert, LogOut, XCircle, Clock, Globe } from 'lucide-react';

export default function TakeoverModal({
  existingSession,
  onConfirmTakeover,
  onCancel,
  loading = false
}) {
  const formattedTime = existingSession?.lastActiveIso
    ? new Date(existingSession.lastActiveIso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : 'לאחרונה';

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        direction: 'rtl',
        textAlign: 'right'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '90%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #fee2e2'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex'
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>
              החשבון מחובר כעת במכשיר אחר
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              אבטחת TALA: מותר חיבור פעיל יחיד בלבד
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', marginBottom: '8px' }}>
            <Globe size={16} color="#64748b" />
            <span>כתובת IP מחוברת:</span>
            <strong style={{ direction: 'ltr' }}>{existingSession?.ipAddress || 'לא ידועה'}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}>
            <Clock size={16} color="#64748b" />
            <span>פעילות אחרונה:</span>
            <strong>{formattedTime}</strong>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
          האם ברצונך <strong>לנתק את המכשיר האחר</strong> ולהתחבר כעת ממכשיר זה?
          (המכשיר הקודם יינעל ויידרש להתחבר מחדש).
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <XCircle size={16} />
            ביטול
          </button>

          <button
            type="button"
            onClick={onConfirmTakeover}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)'
            }}
          >
            <LogOut size={16} />
            {loading ? 'מנתק ומתחבר...' : 'נתק מכשיר אחר והתחבר כאן'}
          </button>
        </div>
      </div>
    </div>
  );
}
