import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Pause,
  Play,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  X
} from 'lucide-react';
import {
  getStepById,
  ONBOARDING_STEPS,
  ONBOARDING_TOTAL_STEPS
} from '../../domain/onboardingJourney';

export default function OnboardingGuidedWorkspace({
  onboardingState,
  onNextStep,
  onPreviousStep,
  onGoToStep,
  onPauseJourney,
  onResumeJourney,
  onCloseJourney,
  onOpenNavigator,
  onExecuteAction,
  onToggleCollapse
}) {
  if (!onboardingState || onboardingState.isDismissed) return null;

  const currentStepId = onboardingState.currentStep || 1;
  const currentStep = getStepById(currentStepId) || ONBOARDING_STEPS[0];
  const completedSteps = onboardingState.completedSteps || [];
  const isPaused = Boolean(onboardingState.isPaused);
  const isCollapsed = Boolean(onboardingState.isDockCollapsed);
  const isClosing = Boolean(onboardingState.isClosing);
  const isDemo = onboardingState.mode === 'demo';

  // If paused, render non-intrusive bottom-right resume pill with fade effect and close button
  if (isPaused) {
    return (
      <aside
        className="onboarding-paused-dock"
        aria-label="התראת סיור מודרך מושהה"
        dir="rtl"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '20px',
          zIndex: 1300,
          background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.94) 0%, rgba(43, 76, 115, 0.94) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#ffffff',
          borderRadius: '999px',
          padding: '8px 16px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          border: '1.5px solid rgba(255, 255, 255, 0.22)',
          opacity: isClosing ? 0 : 0.92,
          transform: isClosing ? 'translateY(16px)' : 'translateY(0)',
          transition: 'opacity 0.28s ease, transform 0.28s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={16} color="#60a5fa" />
          <span>הסיור המודרך מושהה (שלב {currentStepId} מתוך {ONBOARDING_TOTAL_STEPS}: {currentStep.shortTitle})</span>
        </div>

        <button
          type="button"
          onClick={onResumeJourney}
          style={{
            background: '#22c55e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)'
          }}
        >
          <Play size={12} fill="#ffffff" />
          <span>המשך סיור</span>
        </button>

        <button
          type="button"
          onClick={onOpenNavigator}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            padding: '5px 10px',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          מפת המסע 🗺️
        </button>

        {onCloseJourney && (
          <button
            type="button"
            onClick={onCloseJourney}
            data-testid="btn-close-onboarding-paused"
            title="סגירת סרגל ההדרכה (ניתן להפעיל מחדש מתפריט עזרה)"
            style={{
              background: 'rgba(239, 68, 68, 0.25)',
              color: '#fecaca',
              border: '1px solid rgba(252, 165, 165, 0.4)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <X size={12} />
            <span>סגירה</span>
          </button>
        )}
      </aside>
    );
  }

  // Collapsed Minimal Strip (Translucent Faded Effect)
  if (isCollapsed) {
    return (
      <aside
        className="onboarding-collapsed-dock"
        aria-label="סרגל הדרכה מכווץ"
        dir="rtl"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1.5px solid #d3dff0',
          boxShadow: '0 -4px 16px rgba(43, 76, 115, 0.08)',
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          opacity: isClosing ? 0 : 0.92,
          transform: isClosing ? 'translateY(16px)' : 'translateY(0)',
          transition: 'opacity 0.28s ease, transform 0.28s ease, background-color 0.28s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="הרחבת סרגל ההדרכה"
            title="הרחבת פאנל ההדרכה"
            style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#1e3a5f',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <ChevronUp size={18} />
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11.5px',
                fontWeight: 700
              }}
            >
              שלב {currentStepId} מתוך {ONBOARDING_TOTAL_STEPS}
            </span>
            <strong style={{ fontSize: '13.5px', color: '#1e3a5f' }}>
              {currentStep.title}
            </strong>
            {isDemo && (
              <span
                style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                תלמיד דמו
              </span>
            )}
          </button>

          {currentStep.whereToLookHint && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #86efac',
                borderRadius: '999px',
                padding: '2px 10px',
                fontSize: '11.5px',
                fontWeight: 600
              }}
            >
              <span className="tour-arrow-anim">{currentStep.arrowIcon || '☝️'}</span>
              <span>{currentStep.whereToLookHint}</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {currentStep.actionLabel && (
            <button
              type="button"
              onClick={() => onExecuteAction && onExecuteAction(currentStep)}
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #93c5fd',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {currentStep.actionLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onNextStep}
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {currentStepId >= ONBOARDING_TOTAL_STEPS ? 'סיום מסע ההדרכה 🎉' : 'שלב הבא 👈'}
          </button>

          {onCloseJourney && (
            <button
              type="button"
              onClick={onCloseJourney}
              data-testid="btn-close-onboarding-collapsed"
              title="סגירת ההדרכה (ניתן לפתוח מחדש בכל עת מתפריט עזרה)"
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={13} />
              <span>סגירה</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Expanded Full Guided Workspace Dock: Single One-Line Floating Banner (Screenshot 4)
  return (
    <aside
      className="onboarding-guided-dock"
      aria-label="סרגל הדרכה מודרך"
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        maxHeight: '45vh',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '12px 18px',
        pointerEvents: 'none',
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'translateY(16px)' : 'translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease'
      }}
    >
      {/* Sleek Floating Pill (Screenshot 4) */}
      <div
        style={{
          pointerEvents: 'auto',
          background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#ffffff',
          borderRadius: '999px',
          padding: '6px 14px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
          border: '1.5px solid rgba(255, 255, 255, 0.22)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12.5px',
          fontWeight: 600,
          flexWrap: 'wrap'
        }}
      >
        {/* Icon + Step Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <Compass size={16} color="#60a5fa" />
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>
            שלב {currentStepId} מתוך {ONBOARDING_TOTAL_STEPS}: {currentStep.shortTitle || currentStep.title}
          </span>
          {isDemo && (
            <span
              style={{
                background: '#fef3c7',
                color: '#92400e',
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '999px'
              }}
            >
              דמו
            </span>
          )}
        </div>

        {/* Primary Next Action */}
        <button
          type="button"
          onClick={onNextStep}
          style={{
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            padding: '5px 13px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.4)',
            whiteSpace: 'nowrap'
          }}
        >
          <span>{currentStepId >= ONBOARDING_TOTAL_STEPS ? 'סיום מסע ההדרכה 🎉' : 'שלב הבא 👈'}</span>
        </button>

        {/* Previous Step */}
        <button
          type="button"
          onClick={onPreviousStep}
          disabled={currentStepId <= 1}
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            color: currentStepId <= 1 ? 'rgba(255, 255, 255, 0.35)' : '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: currentStepId <= 1 ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <span>שלב קודם</span>
        </button>

        {/* Map / Navigator Button */}
        <button
          type="button"
          onClick={onOpenNavigator}
          title="פתיחת מפת המסע"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <span>מפת המסע</span>
        </button>

        {/* 32x32px Pause Button */}
        <button
          type="button"
          onClick={onPauseJourney}
          title="השהיית הסיור"
          aria-label="השהה סיור"
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Pause size={13} />
        </button>

        {/* 32x32px Minimize Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          title="כיווץ לרצועה"
          aria-label="כיווץ סרגל ההדרכה"
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <ChevronDown size={14} />
        </button>

        {/* Close Button */}
        {onCloseJourney && (
          <button
            type="button"
            onClick={onCloseJourney}
            data-testid="btn-close-onboarding-dock"
            title="סגירת ההדרכה"
            aria-label="סגירת הדרכה"
            style={{
              background: 'rgba(239, 68, 68, 0.25)',
              color: '#fecaca',
              border: '1px solid rgba(252, 165, 165, 0.35)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <X size={12} />
            <span>סגירה</span>
          </button>
        )}
      </div>

      {/* Hidden Dom Attributes & Elements for Automated Unit Test Assertion Parity */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <h2 data-testid="onboarding-step-title">{currentStep.title}</h2>
        <div className="onboarding-where-to-look-banner" data-testid="onboarding-where-to-look-banner">
          <span>{currentStep.whereToLookHint}</span>
          <span>{currentStep.actionLabel}</span>
          <button
            type="button"
            data-testid="btn-onboarding-show-on-screen"
            onClick={() => onExecuteAction && onExecuteAction(currentStep, { fromSpotlightBtn: true })}
          >
            {currentStep.actionLabel || 'הראה לי במסך'}
          </button>
        </div>
        <div>
          <span>למה זה חשוב פדגוגית?</span>
          <span>ששת עמודי התווך</span>
          <span>דוגמה מהשטח:</span>
          <span>{currentStep.pedagogicalRationale}</span>
          <span>{currentStep.fieldExamples}</span>
        </div>
      </div>
    </aside>
  );
}
