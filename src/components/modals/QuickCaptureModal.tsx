import React, { useState } from 'react';
import {
  Mic,
  Edit3,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import VoiceObservationRecorder from '../voice/VoiceObservationRecorder';
import { captureObservation, getActiveGoals } from '../../domain/observationCapture';
import { useCaptureTelemetry } from '../../hooks/useCaptureTelemetry';
import { calculateCurrentStreak } from '../../domain/studentPulse';
import './QuickCaptureModal.css';

export interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onStudentUpdated: (updatedStudent: any) => void;
  teacherEmail: string;
  authorName?: string;
  allStudents?: any[];
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  student,
  onStudentUpdated,
  teacherEmail,
  authorName,
  allStudents = []
}) => {
  const [obsMode, setObsMode] = useState<'voice' | 'text'>('voice');
  const [noteText, setNoteText] = useState('');
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { markStarted, markCompleted } = useCaptureTelemetry(
    'quick_capture',
    teacherEmail,
    () => Boolean(noteText.trim() || pendingAudioBlob),
    () => obsMode
  );

  if (!isOpen || !student) {
    return null;
  }

  const handleClose = () => {
    if (isAnalyzing) return;
    setNoteText('');
    setPendingAudioBlob(null);
    setFeedback(null);
    onClose();
  };

  const handleSave = () => {
    const trimmed = noteText.trim();
    if (!trimmed && !pendingAudioBlob) {
      setFeedback({ type: 'error', text: 'נא להקליט או להקליד תוכן לתצפית' });
      return;
    }

    setIsAnalyzing(true);
    setFeedback(null);

    const hasGoals = getActiveGoals(student).length > 0;
    const usedVoice = Boolean(pendingAudioBlob);

    captureObservation({
      student,
      note: trimmed,
      author: authorName || 'מורה משלבת',
      surface: 'quick_capture',
      audioBlob: pendingAudioBlob,
      onUpdateStudent: (updated) => {
        onStudentUpdated(updated);
      },
      onMatchSettled: ({ matchedCount, failed }) => {
        if (failed) {
          setFeedback({
            type: 'success',
            text: 'התצפית נשמרה בתיעוד השוטף. השיוך האוטומטי ליעד לא הושלם.'
          });
        } else if (matchedCount > 0) {
          setFeedback({
            type: 'success',
            text: `התצפית נותחה ושויכה בהצלחה ל-${matchedCount} יעדים!`
          });
        } else if (hasGoals) {
          setFeedback({
            type: 'success',
            text: 'לא זוהתה התאמה מובהקת ליעד ספציפי. התצפית נשמרה בתיעוד השוטף של התלמיד/ה!'
          });
        }
      }
    });

    markCompleted(usedVoice ? 'voice' : 'text', calculateCurrentStreak(allStudents.length > 0 ? allStudents : [student]));
    setIsAnalyzing(false);
    setFeedback({
      type: 'success',
      text: hasGoals
        ? 'התצפית נשמרה. משייכת ליעדים ברקע...'
        : 'התצפית נשמרה בהצלחה בתיעוד השוטף של התלמיד/ה!'
    });

    setTimeout(() => {
      handleClose();
    }, 1200);
  };

  return (
    <div
      className="quick-capture-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-capture-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="quick-capture-card" dir="rtl">
        {/* Header */}
        <div className="quick-capture-header">
          <div className="quick-capture-title-group">
            <h3 id="quick-capture-title" className="quick-capture-title">
              תיעוד מהיר
            </h3>
            <span className="quick-capture-student-name">
              עבור {student.name || 'תלמיד/ה'}
            </span>
          </div>
          <button
            type="button"
            className="quick-capture-close-btn"
            onClick={handleClose}
            disabled={isAnalyzing}
            aria-label="סגירה"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="quick-capture-mode-toggle" role="tablist" aria-label="אופן הזנת תצפית">
          <button
            type="button"
            role="tab"
            aria-selected={obsMode === 'voice'}
            className={`quick-capture-tab ${obsMode === 'voice' ? 'active' : ''}`}
            onClick={() => setObsMode('voice')}
          >
            <Mic size={15} />
            <span>הקלטה קולית</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={obsMode === 'text'}
            className={`quick-capture-tab ${obsMode === 'text' ? 'active' : ''}`}
            onClick={() => setObsMode('text')}
          >
            <Edit3 size={15} />
            <span>הקלדה חופשית</span>
          </button>
        </div>

        {/* Voice Recorder Body */}
        {obsMode === 'voice' && (
          <div className="quick-capture-voice-area">
            <VoiceObservationRecorder
              disabled={isAnalyzing}
              baseText={noteText}
              onRecordingStart={() => markStarted('voice')}
              onTranscript={(text) => {
                setNoteText(text);
              }}
              onAudioReady={(blob) => setPendingAudioBlob(blob)}
              onClearAudio={() => setPendingAudioBlob(null)}
            />
          </div>
        )}

        {/* Text Area */}
        <div className="quick-capture-input-area">
          <textarea
            className="quick-capture-textarea"
            rows={obsMode === 'voice' ? 3 : 5}
            value={noteText}
            onChange={(e) => {
              markStarted('text');
              setNoteText(e.target.value);
            }}
            placeholder="מה ראית או מה קרה במפגש? (למשל: תרגול קריאה, הצלחה בהתמודדות עם תסכול...)"
            aria-label="תוכן תצפית"
          />
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`quick-capture-feedback ${feedback.type}`}
            role="status"
            aria-live="polite"
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="quick-capture-footer">
          <button
            type="button"
            className="quick-capture-save-btn"
            onClick={handleSave}
            disabled={isAnalyzing || (!noteText.trim() && !pendingAudioBlob)}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>שומר ומנתח...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>שמירה מהירה וחיבור למטרות</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickCaptureModal;
