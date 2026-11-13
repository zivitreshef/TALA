import { useCallback, useEffect, useRef } from 'react';
import { trackCaptureEvent, type CaptureSurface } from '../domain/observationCapture';

/**
 * Daily-tracking telemetry for a quick-capture surface.
 * Abandonment fires ONLY on unmount with unsaved text (never on keystrokes).
 */
export function useCaptureTelemetry(
  surface: CaptureSurface,
  email: string | undefined,
  getHasUnsavedText: () => boolean,
  getMode: () => 'text' | 'voice'
) {
  const startedAtRef = useRef<number | null>(null);
  const emailRef = useRef(email);
  emailRef.current = email;
  const hasTextRef = useRef(getHasUnsavedText);
  hasTextRef.current = getHasUnsavedText;
  const modeRef = useRef(getMode);
  modeRef.current = getMode;

  const markStarted = useCallback(
    (mode: 'text' | 'voice') => {
      if (startedAtRef.current !== null) return;
      startedAtRef.current = Date.now();
      trackCaptureEvent('started', { mode, isEdit: false, surface }, emailRef.current);
    },
    [surface]
  );

  const markCompleted = useCallback(
    (mode: 'text' | 'voice', streakDays: number) => {
      const durationSec =
        startedAtRef.current !== null ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)) : 10;
      trackCaptureEvent('completed', { mode, durationSec, isEdit: false, streakDays, surface }, emailRef.current);
      trackCaptureEvent('streak', { currentStreakDays: streakDays }, emailRef.current);
      startedAtRef.current = null;
    },
    [surface]
  );

  useEffect(() => {
    return () => {
      if (startedAtRef.current !== null && hasTextRef.current()) {
        const timeSpentSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        trackCaptureEvent('abandoned', { mode: modeRef.current(), timeSpentSec, surface }, emailRef.current);
      }
    };
    // unmount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { markStarted, markCompleted };
}
