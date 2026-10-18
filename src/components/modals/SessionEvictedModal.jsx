import React from 'react';
import { LogOut, AlertTriangle, ShieldOff } from 'lucide-react';

export default function SessionEvictedModal({ evictionInfo, onAcknowledge }) {
  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        direction: 'rtl',
        textAlign: 'right'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '460px',
          width: '90%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #fed7aa'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              backgroundColor: '#ffedd5',
              color: '#ea580c',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex'
            }}
          >
            <ShieldOff size={28} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>
              החיבור למערכת נותק
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              התחברות זוהתה ממכשיר/דפדפן אחר
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#9a3412',
            lineHeight: 1.6
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              חשבונך חובר זה עתה ממכשיר או מיקום אחר
              {evictionInfo?.newIp && (
                <span> (כתובת IP: <strong style={{ direction: 'ltr' }}>{evictionInfo.newIp}</strong>)</span>
              )}.
              <div style={{ marginTop: '6px' }}>
                בהתאם להגדרות האבטחה של TALA, מותר חיבור פעיל יחיד בלבד. נותקת ממכשיר זה כדי למנוע שימוש כפול בו-זמני.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onAcknowledge}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)'
            }}
          >
            <LogOut size={16} />
            חזור למסך ההתחברות
          </button>
        </div>
      </div>
    </div>
  );
}
