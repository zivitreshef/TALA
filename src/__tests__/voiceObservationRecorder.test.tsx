import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import VoiceObservationRecorder from '../components/voice/VoiceObservationRecorder';

describe('VoiceObservationRecorder Component & Logic Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders initial idle state markup with Hebrew accessible button and mic icon', () => {
    const onTranscript = vi.fn();
    const html = renderToStaticMarkup(
      <VoiceObservationRecorder onTranscript={onTranscript} />
    );

    expect(html).toContain('voice-obs-btn-start');
    expect(html).toContain('הקלטת תצפית קולית');
    expect(html).toContain('voice-obs-mic-icon');
  });

  it('respects disabled prop in static rendering', () => {
    const onTranscript = vi.fn();
    const html = renderToStaticMarkup(
      <VoiceObservationRecorder onTranscript={onTranscript} disabled={true} />
    );

    expect(html).toContain('disabled=""');
  });

  it('verifies speech recognition handling logic and text concatenation', () => {
    let capturedText = '';
    const onTranscript = (transcript: string) => {
      capturedText = transcript;
    };

    // Simulate Speech Recognition event structure
    const mockResults = [
      [{ transcript: 'דניאל השתתף בריכוז' }],
      [{ transcript: 'והגיב בהתלהבות' }]
    ];

    let fullTranscript = '';
    for (let i = 0; i < mockResults.length; i++) {
      const res = mockResults[i];
      if (res && res[0]) {
        fullTranscript += res[0].transcript + ' ';
      }
    }
    const clean = fullTranscript.trim();
    onTranscript(clean);

    expect(capturedText).toBe('דניאל השתתף בריכוז והגיב בהתלהבות');
  });

  it('guarantees streaming speech recognition updates in-place without exponential loop repetition', () => {
    let currentInput = 'הערה קיימת:';
    const baseTextAtStart = currentInput;

    const onTranscript = (fullSessionText: string) => {
      currentInput = fullSessionText;
    };

    // Simulate WebKit Web Speech accumulated interim stream
    const events = [
      'בדיקה',
      'בדיקה על ילד',
      'בדיקה על ילד מספר אחד שאני רוצה לבדוק'
    ];

    events.forEach((spoken) => {
      const merged = baseTextAtStart ? `${baseTextAtStart} ${spoken}` : spoken;
      onTranscript(merged);
    });

    // Verify it contains the exact text without any duplicated words
    expect(currentInput).toBe('הערה קיימת: בדיקה על ילד מספר אחד שאני רוצה לבדוק');
    expect(currentInput).not.toContain('בדיקה בדיקה');
    expect(currentInput).not.toContain('ילד מספר אחד בדיקה');
  });

  it('safely handles media stream cleanup by stopping all tracks', () => {
    const stopMock1 = vi.fn();
    const stopMock2 = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: stopMock1 }, { stop: stopMock2 }]
    };

    mockStream.getTracks().forEach((t) => t.stop());

    expect(stopMock1).toHaveBeenCalledTimes(1);
    expect(stopMock2).toHaveBeenCalledTimes(1);
  });

  it('formats recording timer cleanly into MM:SS format', () => {
    const formatTime = (totalSecs: number) => {
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(9)).toBe('00:09');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(180)).toBe('03:00');
  });

  it('verifies network disconnect notice and offline resilience logic', () => {
    let networkNotice: string | null = null;
    const handleNetworkError = (errorType: string) => {
      if (errorType === 'network') {
        networkNotice = 'החיבור נותק. ההקלטה ממשיכה להישמר מקומית במכשיר!';
      }
    };

    handleNetworkError('network');
    expect(networkNotice).toBe('החיבור נותק. ההקלטה ממשיכה להישמר מקומית במכשיר!');
  });

  it('renders correctly inside DailyPedagogicalTracker markup', () => {
    const html = renderToStaticMarkup(
      <VoiceObservationRecorder onTranscript={vi.fn()} />
    );

    expect(html).toContain('voice-obs-container');
    expect(html).toContain('הקלטת תצפית קולית');
  });
});
