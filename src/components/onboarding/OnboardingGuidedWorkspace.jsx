import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Compass,
  Pause,
  Play,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Info,
  Layers,
  ArrowLeft
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
  onOpenNavigator,
  onExecuteAction,
  onToggleCollapse
}) {
  if (!onboardingState) return null;

  const currentStepId = onboardingState.currentStep || 1;
  const currentStep = getStepById(currentStepId) || ONBOARDING_STEPS[0];
  const completedSteps = onboardingState.completedSteps || [];
  const isPaused = Boolean(onboardingState.isPaused);
  const isCollapsed = Boolean(onboardingState.isDockCollapsed);
  const isCompleted = Boolean(onboardingState.isCompleted);
  const isDemo = onboardingState.mode === 'demo';

  // If paused, render non-intrusive top/bottom resume pill
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
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2b4c73 100%)',
          color: '#ffffff',
          borderRadius: '999px',
          padding: '8px 16px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          fontWeight: 600,
          border: '1.5px solid rgba(255, 255, 255, 0.2)'
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
      </aside>
    );
  }

  // Collapsed Minimal Strip
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
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderTop: '1.5px solid #d3dff0',
          boxShadow: '0 -4px 16px rgba(43, 76, 115, 0.08)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="הרחבת סרגל ההדרכה"
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            {currentStepId >= ONBOARDING_TOTAL_STEPS ? 'סיום המסע 🎉' : 'הבא 👈'}
          </button>
        </div>
      </aside>
    );
  }

  // Expanded Full Guided Workspace Dock
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
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        borderTop: '1.5px solid #d3dff0',
        boxShadow: '0 -6px 24px rgba(43, 76, 115, 0.12)',
        padding: '12px 20px',
        maxHeight: '45vh',
        overflowY: 'auto'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Top Control Bar: 10-Step Stepper & Quick Utility Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          {/* 10-Step Compact Horizontal Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflowX: 'auto',
              paddingBottom: '2px',
              maxWidth: '100%'
            }}
          >
            {ONBOARDING_STEPS.map((s) => {
              const isDone = completedSteps.includes(s.id);
              const isCurrent = currentStepId === s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onGoToStep && onGoToStep(s.id)}
                  title={`${s.id}. ${s.title}`}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: isCurrent
                      ? '1.5px solid #2563eb'
                      : isDone
                      ? '1px solid #86efac'
                      : '1px solid #e2e8f0',
                    background: isCurrent
                      ? '#eff6ff'
                      : isDone
                      ? '#f0fdf4'
                      : '#f8fafc',
                    color: isCurrent
                      ? '#1d4ed8'
                      : isDone
                      ? '#15803d'
                      : '#64748b',
                    fontSize: '11.5px',
                    fontWeight: isCurrent ? 800 : 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 size={12} color="#16a34a" />
                  ) : (
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>{s.id}</span>
                  )}
                  <span>{s.shortTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Right Utility Buttons (32x32px standards) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={onOpenNavigator}
              title="פתיחת מפת המסע והחלפת מצב (דמו / אמת)"
              style={{
                background: '#ffffff',
                color: '#2b4c73',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Compass size={14} color="#4a88c7" />
              <span>מפת המסע</span>
            </button>

            <button
              type="button"
              onClick={onPauseJourney}
              title="השהיית הסיור (תוכלי להמשיך בכל עת)"
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
                cursor: 'pointer'
              }}
              aria-label="השהה סיור"
            >
              <Pause size={14} />
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="כיווץ סרגל ההדרכה לרצועה תחתונה"
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
                cursor: 'pointer'
              }}
              aria-label="כיווץ סרגל ההדרכה"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Middle Content Panel: Rationale + Guidance + Examples */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px'
          }}
        >
          {/* Main Contextual Guidance */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span
                style={{
                  background: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: '999px'
                }}
              >
                שלב {currentStepId} מתוך {ONBOARDING_TOTAL_STEPS}
              </span>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e3a5f' }}>
                {currentStep.title}
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
              {currentStep.contextualGuidance}
            </p>
          </div>

          {/* Pedagogical Rationale & Field Examples */}
          <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <Lightbulb size={14} color="#f59e0b" />
              <strong style={{ fontSize: '12px', color: '#92400e' }}>
                למה זה חשוב פדגוגית?
              </strong>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
              {currentStep.pedagogicalRationale}
            </p>
            {currentStep.fieldExamples && (
              <div style={{ fontSize: '11.5px', color: '#64748b', background: '#ffffff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong>דוגמה מהשטח:</strong> {currentStep.fieldExamples}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Row: Previous, Direct Action, Next */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <button
            type="button"
            onClick={onPreviousStep}
            disabled={currentStepId <= 1}
            style={{
              background: '#ffffff',
              color: currentStepId <= 1 ? '#94a3b8' : '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: currentStepId <= 1 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ChevronRight size={16} />
            <span>שלב קודם</span>
          </button>

          {/* Middle Specific Action CTA */}
          {currentStep.actionLabel && (
            <button
              type="button"
              onClick={() => onExecuteAction && onExecuteAction(currentStep)}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              <span>{currentStep.actionLabel}</span>
              <ExternalLink size={14} />
            </button>
          )}

          {/* Forward / Finish Action */}
          <button
            type="button"
            onClick={onNextStep}
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
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
            }}
          >
            <span>{currentStepId >= ONBOARDING_TOTAL_STEPS ? 'סיום מסע ההדרכה 🎉' : 'שלב הבא 👈'}</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
