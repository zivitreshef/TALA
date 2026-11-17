import React, { useState, useRef } from 'react';
import { ShieldAlert, Download, Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  buildEmergencyBackupPayload,
  downloadEmergencyBackupFile,
  validateEmergencyBackupData,
  EmergencyBackupPayload
} from '../domain/emergencyRescue';

interface EmergencyRescueBarProps {
  students: any[];
  userPreferences?: Record<string, any>;
  currentUserEmail?: string;
  onImport: (data: { students: any[]; userPreferences?: any }) => void;
  onClose?: () => void;
}

export const EmergencyRescueBar: React.FC<EmergencyRescueBarProps> = ({
  students,
  userPreferences,
  currentUserEmail,
  onImport,
  onClose
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNotification = (text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  const handleExport = () => {
    try {
      const payload: EmergencyBackupPayload = buildEmergencyBackupPayload({
        students,
        userPreferences,
        exportedBy: currentUserEmail
      });
      downloadEmergencyBackupFile(payload);
      showNotification(`קובץ הגיבוי הורד בהצלחה (${payload.students.length} תלמידים).`);
    } catch (err) {
      console.error('[EmergencyRescue] Export failed:', err);
      showNotification('שגיאה בעת יצירת קובץ הגיבוי.', true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be chosen again if needed
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const json = JSON.parse(text);
        const result = validateEmergencyBackupData(json);

        if (!result.valid || !result.payload) {
          showNotification(result.error || 'קובץ הגיבוי אינו תקין.', true);
          return;
        }

        const count = result.payload.students.length;
        const hasPrefs = Boolean(result.payload.userPreferences);
        const confirmMsg = `נמצאו ${count} כרטיסי תלמיד${hasPrefs ? ' והגדרות משתמש' : ''} בקובץ הגיבוי.\nהאם לייבא אותם ולעדכן את המערכת בדפדפן זה?`;

        if (window.confirm(confirmMsg)) {
          onImport({
            students: result.payload.students,
            userPreferences: result.payload.userPreferences
          });
          showNotification(`הנתונים יובאו בהצלחה (${count} תלמידים).`);
        }
      } catch (parseErr) {
        console.error('[EmergencyRescue] Parse error:', parseErr);
        showNotification('הקובץ שנבחר אינו קובץ JSON תקין.', true);
      }
    };
    reader.onerror = () => {
      showNotification('שגיאה בקריאת הקובץ מהמחשב.', true);
    };
    reader.readAsText(file);
  };

  return (
    <div
      data-testid="emergency-rescue-bar"
      dir="rtl"
      style={{
        background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
        borderBottom: '2px solid #f59e0b',
        color: '#f8fafc',
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        zIndex: 10000,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        fontSize: '13px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.18)',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24'
          }}
        >
          <ShieldAlert size={18} />
        </div>
        <div>
          <strong style={{ color: '#fbbf24', fontSize: '13.5px' }}>
            מצב חילוץ נתונים במקרי חירום
          </strong>
          <span style={{ color: '#94a3b8', marginRight: '8px', fontSize: '12px' }}>
            גיבוי מקומי מהיר וייבוא שחזור עבור מורות ומנתחות התנהגות
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {feedbackMsg && (
          <span
            data-testid="emergency-rescue-feedback"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              background: feedbackMsg.isError ? '#ef4444' : '#10b981',
              color: '#ffffff'
            }}
          >
            {feedbackMsg.isError ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            {feedbackMsg.text}
          </span>
        )}

        <button
          type="button"
          data-testid="emergency-export-btn"
          onClick={handleExport}
          className="btn-primary-sm"
          style={{
            background: '#f59e0b',
            color: '#0f172a',
            borderColor: '#d97706',
            fontWeight: 700,
            fontSize: '12px',
            padding: '5px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <Download size={14} />
          <span>ייצוא נתונים לקובץ גיבוי</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          data-testid="emergency-import-input"
        />

        <button
          type="button"
          data-testid="emergency-import-btn"
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary-sm"
          style={{
            background: '#334155',
            color: '#f8fafc',
            borderColor: '#475569',
            fontWeight: 600,
            fontSize: '12px',
            padding: '5px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <Upload size={14} />
          <span>ייבוא נתונים מקובץ גיבוי</span>
        </button>

        {onClose && (
          <button
            type="button"
            data-testid="emergency-close-btn"
            onClick={onClose}
            title="סגור סרגל חילוץ"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default EmergencyRescueBar;
