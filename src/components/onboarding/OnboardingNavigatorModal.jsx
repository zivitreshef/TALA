import React from 'react';
import {
  Sparkles,
  UserPlus,
  CheckCircle2,
  Circle,
  ArrowLeft,
  RotateCcw,
  X,
  Compass,
  BookOpen,
  Calendar,
  FileText,
  Share2,
  Users,
  Settings,
  HelpCircle
} from 'lucide-react';
import { ONBOARDING_STEPS, ONBOARDING_TOTAL_STEPS } from '../../domain/onboardingJourney';

// Icon mapping per step key for rich visual hierarchy
const STEP_ICONS = {
  getting_started: Sparkles,
  create_student: UserPlus,
  student_profile: BookOpen,
  set_goals: FileText,
  daily_tracking: Calendar,
  ongoing_documentation: FileText,
  parent_voice: Users,
  generating_reports: FileText,
  ai_insights: Sparkles,
  matya_settings: Settings
};

export default function OnboardingNavigatorModal({
  isOpen,
  onClose,
  onboardingState,
  onSelectMode,
  onSelectStep,
  onRestartJourney,
  onResumeJourney
}) {
  if (!isOpen) return null;

  const currentStep = onboardingState?.currentStep || 1;
  const completedSteps = onboardingState?.completedSteps || [];
  const mode = onboardingState?.mode || null;
  const isCompleted = onboardingState?.isCompleted || false;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="מפת מסע ההדרכה במערכת TALA"
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
          border: '1px solid #d3dff0',
          overflow: 'hidden',
          textAlign: 'right'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4a88c7 0%, #2b4c73 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(43, 76, 115, 0.25)'
              }}
            >
              <Compass size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e3a5f' }}>
                מסע ההדרכה הפדגוגי ב-TALA
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                ליווי מקיף ב-10 שלבים: מבניית תוכנית אקולוגית, מעקב יומי ועד שיתוף מתי״א
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="סגירת מפת המסע"
            style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#64748b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Mode Selection Cards (Always visible, highlighted if no mode selected) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#1e3a5f',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={16} color="#4a88c7" />
              <span>בחירת מסלול היכרות עם המערכת:</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Option A: Demo Student */}
              <button
                type="button"
                onClick={() => onSelectMode && onSelectMode('demo')}
                style={{
                  background: mode === 'demo' ? '#eff6ff' : '#ffffff',
                  border: mode === 'demo' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: mode === 'demo' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1e3a5f', fontSize: '14px' }}>
                    <Sparkles size={16} color="#2563eb" />
                    <span>התנסות עם תלמיד לדוגמה</span>
                  </div>
                  <span
                    style={{
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px'
                    }}
                  >
                    מומלץ ביותר ✨
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  הדגמה חיה ומלאה של "יונתן לוי" (כיתה ב׳2, ADHD ושילוב): צפייה במטרות, 4 תצפיות יומיות, קול ההורים ודוחות מחצית ללא צורך בהזנת פרטים.
                </p>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                  <span>{mode === 'demo' ? 'מסלול דמו פעיל כעת ✓' : 'התחל במסלול דמו 👈'}</span>
                </div>
              </button>

              {/* Option B: Real Student */}
              <button
                type="button"
                onClick={() => onSelectMode && onSelectMode('real')}
                style={{
                  background: mode === 'real' ? '#f0fdf4' : '#ffffff',
                  border: mode === 'real' ? '2px solid #22c55e' : '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '14px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: mode === 'real' ? '0 4px 12px rgba(34, 197, 94, 0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#14532d', fontSize: '14px' }}>
                    <UserPlus size={16} color="#16a34a" />
                    <span>יצירת תלמיד/ה ראשונ/ה מהשטח</span>
                  </div>
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px'
                    }}
                  >
                    הזנה עצמאית ✏️
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                  פתיחת כרטיס תלמיד/ה אמיתי/ת ראשונ/ה ומילוי שלב אחר שלב בליווי צמוד, הסברים פדגוגיים מפורטים ודוגמאות ניסוח בכל שדה.
                </p>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                  <span>{mode === 'real' ? 'מסלול תלמיד אמיתי פעיל ✓' : 'התחל עם תלמיד/ה אמיתי/ת 👈'}</span>
                </div>
              </button>
            </div>
          </div>

          {/* 10-Step Interactive Roadmap */}
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#1e3a5f',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>מפת 10 שלבי המסע (לחצי על כל שלב למעבר ישיר):</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                הושלמו {completedSteps.length} מתוך {ONBOARDING_TOTAL_STEPS} שלבים
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ONBOARDING_STEPS.map((step) => {
                const IconComponent = STEP_ICONS[step.key] || Circle;
                const isCurrent = currentStep === step.id;
                const isDone = completedSteps.includes(step.id);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (onSelectStep) onSelectStep(step.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      border: isCurrent
                        ? '1.5px solid #3b82f6'
                        : isDone
                        ? '1px solid #86efac'
                        : '1px solid #e2e8f0',
                      background: isCurrent
                        ? '#eff6ff'
                        : isDone
                        ? '#f0fdf4'
                        : '#ffffff',
                      boxShadow: isCurrent ? '0 2px 8px rgba(59, 130, 246, 0.12)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Step Status Indicator */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isDone ? '#16a34a' : isCurrent ? '#2563eb' : '#f1f5f9',
                        color: isDone || isCurrent ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    >
                      {isDone ? <CheckCircle2 size={16} /> : step.id}
                    </div>

                    {/* Step Title & Guidance */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: isCurrent ? 800 : 700,
                            fontSize: '13.5px',
                            color: isCurrent ? '#1d4ed8' : isDone ? '#15803d' : '#1e3a5f'
                          }}
                        >
                          {step.id}. {step.title}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              background: '#3b82f6',
                              color: '#ffffff',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '999px'
                            }}
                          >
                            שלב פעיל
                          </span>
                        )}
                        {isDone && (
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '1px 7px',
                              borderRadius: '999px'
                            }}
                          >
                            הושלם ✓
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginTop: '3px',
                          lineHeight: 1.45,
                          whiteSpace: 'normal'
                        }}
                      >
                        {step.contextualGuidance}
                      </div>
                    </div>

                    <ArrowLeft size={16} color={isCurrent ? '#2563eb' : '#94a3b8'} style={{ alignSelf: 'center', flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onRestartJourney}
            style={{
              background: '#ffffff',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <RotateCcw size={14} />
            <span>הפעלת המסע מחדש (שלב 1)</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              סגירה
            </button>

            <button
              type="button"
              onClick={() => {
                if (onResumeJourney) onResumeJourney();
                if (onClose) onClose();
              }}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
              }}
            >
              <span>{isCompleted ? 'צפייה בסיכום המסע' : 'המשך בסיור המודרך 👈'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
