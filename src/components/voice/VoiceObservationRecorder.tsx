import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Volume2,
  AlertCircle,
  WifiOff
} from 'lucide-react';
import './VoiceObservationRecorder.css';

export interface VoiceObservationRecorderProps {
  onTranscript: (text: string) => void;
  baseText?: string;
  onAudioReady?: (audioBlob: Blob, audioUrl: string) => void;
  onClearAudio?: () => void;
  disabled?: boolean;
}

// Window declaration for cross-browser SpeechRecognition
interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
      length: number;
    };
    length: number;
  };
  resultIndex: number;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

export const VoiceObservationRecorder: React.FC<VoiceObservationRecorderProps> = ({
  onTranscript,
  baseText = '',
  onAudioReady,
  onClearAudio,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const initialBaseTextRef = useRef('');

  // Monitor network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setNetworkNotice(null);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setNetworkNotice('אין חיבור רשת כרגע. ההקלטה נשמרת מקומית בבטחה במכשיר!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keep track of audioUrl in ref for safe cleanup
  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopAllTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    setErrorMessage(null);
    initialBaseTextRef.current = (baseText || '').trim();
    setNetworkNotice(null);
    if (disabled) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('הדפדפן אינו תומך בהקלטת קול');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Determine supported MIME type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      if (typeof MediaRecorder !== 'undefined') {
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            if (audioUrlRef.current) {
              URL.revokeObjectURL(audioUrlRef.current);
            }
            setAudioUrl(url);
            setHasAudio(true);
            if (onAudioReady) {
              onAudioReady(blob, url);
            }
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
      }

      // Initialize Speech Recognition if supported and online
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionConstructor) {
        try {
          const recognition: SpeechRecognitionLike = new SpeechRecognitionConstructor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'he-IL';

          recognition.onresult = (event: SpeechRecognitionEventLike) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i];
              if (res && res[0]) {
                fullTranscript += res[0].transcript + ' ';
              }
            }
            const clean = fullTranscript.trim();
            if (clean) {
              const merged = initialBaseTextRef.current
                ? `${initialBaseTextRef.current} ${clean}`
                : clean;
              onTranscript(merged);
            }
          };

          recognition.onerror = (event: any) => {
            // If offline or network error, inform the user while audio recording continues safely!
            if (event && (event.error === 'network' || !navigator.onLine)) {
              setNetworkNotice('החיבור נותק. ההקלטה ממשיכה להישמר מקומית במכשיר!');
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (_) {}
      } else if (!navigator.onLine) {
        setNetworkNotice('מצב לא מקוון. ההקלטה תישמר מקומית במכשיר.');
      }

      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) {
            // Auto-stop at 3 minutes for safety
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      stopAllTracks();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('הגישה למיקרופון נחסמה. יש לאפשר גישה בהגדרות הדפדפן.');
      } else {
        setErrorMessage('לא ניתן להפעיל את המיקרופון כעת.');
      }
    }
  };

  const handleStopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    stopAllTracks();
    setIsRecording(false);
  }, []);

  const handleTogglePlay = () => {
    if (!audioUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audioElementRef.current = audio;
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleClearAudio = () => {
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
    audioElementRef.current = null;

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setHasAudio(false);
    setRecordingSeconds(0);
    setNetworkNotice(null);
    if (onClearAudio) {
      onClearAudio();
    }
  };

  return (
    <div className="voice-obs-container" dir="rtl">
      {errorMessage && (
        <div className="voice-obs-error" role="alert">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {networkNotice && (
        <div className="voice-obs-network-notice" role="status">
          <WifiOff size={14} />
          <span>{networkNotice}</span>
        </div>
      )}

      {/* IDLE STATE: START RECORDING BUTTON */}
      {!isRecording && !hasAudio && (
        <button
          type="button"
          onClick={handleStartRecording}
          disabled={disabled}
          className="voice-obs-btn-start"
          title="הקלטת תצפית קולית"
          aria-label="הקלטת תצפית קולית"
        >
          <Mic size={15} className="voice-obs-mic-icon" />
          <span>הקלטת תצפית קולית</span>
        </button>
      )}

      {/* RECORDING STATE: PULSE & STOP */}
      {isRecording && (
        <div className="voice-obs-active-bar">
          <div className="voice-obs-recording-badge">
            <span className="voice-obs-pulse-dot" />
            <span className="voice-obs-timer">{formatTime(recordingSeconds)}</span>
            <span className="voice-obs-status-text">מקליט... דברי עכשיו</span>
          </div>

          <button
            type="button"
            onClick={handleStopRecording}
            className="voice-obs-btn-stop"
            title="עצירת הקלטה"
            aria-label="עצירת הקלטה"
          >
            <Square size={14} />
            <span>סיום הקלטה</span>
          </button>
        </div>
      )}

      {/* COMPLETED STATE: PLAYBACK & ACTIONS */}
      {!isRecording && hasAudio && audioUrl && (
        <div className="voice-obs-playback-bar">
          <div className="voice-obs-player-info">
            <Volume2 size={15} style={{ color: '#16a34a' }} />
            <span className="voice-obs-saved-badge">
              הקלטה שמורה ({formatTime(recordingSeconds)})
              {isOffline ? ' • נשמר מקומית' : ''}
            </span>
          </div>

          <div className="voice-obs-player-controls">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="voice-obs-btn-playback"
              title={isPlaying ? 'עצירת השמעה' : 'השמעת הקלטה'}
              aria-label={isPlaying ? 'עצירת השמעה' : 'השמעת הקלטה'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'השהה' : 'השמע'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleClearAudio();
                handleStartRecording();
              }}
              className="voice-obs-btn-action"
              title="הקלטה מחדש"
              aria-label="הקלטה מחדש"
            >
              <RotateCcw size={13} />
              <span>הקלטה מחדש</span>
            </button>

            <button
              type="button"
              onClick={handleClearAudio}
              className="voice-obs-btn-action danger"
              title="מחיקת הקלטה"
              aria-label="מחיקת הקלטה"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceObservationRecorder;
