import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Printer,
  Share2,
  Mic,
  Edit3,
  X,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import VoiceObservationRecorder from '../voice/VoiceObservationRecorder';
import { buildStatusReportPrintHtml, openHtmlPrintWindow } from '../../export/wordAndPrintBuilders';
import { buildAiGoalMatchPrompt, parseAiGoalMultiMatchResponse } from '../../domain/dailyPedagogicalTracking';
import { callAiProxyEndpoint } from '../../services/aiProxyClient';
import { maskPromptForAi } from '../../goalBankData';
import { saveAudioRecordBlob, uploadAudioRecordToCloud } from '../../services/dossierFileStorage';
import { transcribeAudioWithGemini } from '../../services/audioTranscriptionService';
import './MobileQuickActionsModal.css';

export interface MobileQuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  selectedStudentId?: string;
  onSelectStudent?: (studentId: string) => void;
  currentUser?: any;
  onUpdateStudent?: (updatedStudent: any) => void;
}

export default function MobileQuickActionsModal({
  isOpen,
  onClose,
  students = [],
  selectedStudentId = '',
  onSelectStudent,
  currentUser = {},
  onUpdateStudent
}: MobileQuickActionsModalProps) {
  // Active Student State
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    return selectedStudentId || students[0]?.id || '';
  });

  useEffect(() => {
    if (selectedStudentId) {
      setActiveStudentId(selectedStudentId);
    } else if (!activeStudentId && students[0]?.id) {
      setActiveStudentId(students[0].id);
    }
  }, [selectedStudentId, students]);

  const targetStudent = useMemo(() => {
    return students.find((s) => s.id === activeStudentId) || students[0] || null;
  }, [students, activeStudentId]);

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const framework = (s.educationalFramework || '').toLowerCase();
      return name.includes(q) || framework.includes(q);
    });
  }, [students, searchQuery]);

  // Observation Mode: Voice vs Text
  const [obsMode, setObsMode] = useState<'voice' | 'text'>('voice');
  const [noteText, setNoteText] = useState('');
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formatted Today Date in Hebrew
  const formattedToday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('he-IL', { dateStyle: 'full' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, []);

  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (!isOpen) return null;

  // Handle Student Selection
  const handleSelectStudent = (id: string) => {
    setActiveStudentId(id);
    onSelectStudent?.(id);
    setFeedback(null);
  };

  // Handle Print Report
  const handlePrintReport = () => {
    if (!targetStudent) return;
    try {
      const logoUrl = typeof window !== 'undefined'
        ? new URL('./tala-logo.png', window.location.href).href
        : '';
      const html = buildStatusReportPrintHtml(targetStudent, false, logoUrl);
      openHtmlPrintWindow(html);
    } catch {
      window.print();
    }
  };

  // Handle Share / Email Report
  const handleShareReport = async () => {
    if (!targetStudent) return;
    const studentName = targetStudent.name || 'תלמיד/ה';
    const shareTitle = `דוח מעקב - ${studentName}`;
    const shareText = `מערכת תל"א: דוח מעקב פדגוגי עבור ${studentName}. מסגרת: ${targetStudent.educationalFramework || 'כללית'}.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback to mailto
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\nנשלח ממערכת תל"א:\n${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Handle AI Analysis & Observation Save
  const handleAnalyzeAndSave = async () => {
    setFeedback(null);
    let noteToAnalyze = noteText.trim();

    // If audio recorded but not transcribed yet
    if (!noteToAnalyze && pendingAudioBlob) {
      setIsAnalyzing(true);
      try {
        const transcript = await transcribeAudioWithGemini(pendingAudioBlob);
        if (transcript) {
          noteToAnalyze = transcript;
          setNoteText(transcript);
        } else {
          setFeedback({ type: 'error', text: 'לא זוהה דיבור ברור בהקלטה. ניתן להקליד תצפית ידנית.' });
          setIsAnalyzing(false);
          return;
        }
      } catch {
        setFeedback({ type: 'error', text: 'שגיאה בתמלול ההקלטה בבינה מלאכותית. יש לוודא חיבור רשת.' });
        setIsAnalyzing(false);
        return;
      }
    }

    if (!noteToAnalyze) {
      setFeedback({ type: 'error', text: 'נא להקליט או להקליד הערת תצפית לפני השמירה.' });
      return;
    }

    if (!targetStudent) {
      setFeedback({ type: 'error', text: 'נא לבחור תלמיד/ה לעדכון.' });
      return;
    }

    setIsAnalyzing(true);
    const baseTimestamp = Date.now();
    const obsId = `obs_${baseTimestamp}`;
    const newObs: any = {
      id: obsId,
      timestamp: new Date().toISOString(),
      date: todayIsoDate,
      authorName: currentUser?.name || 'מורה משלבת',
      supportLevel: 'תיווך חלקי',
      note: noteToAnalyze,
      source: 'mobile_quick_hub'
    };

    if (pendingAudioBlob) {
      newObs.hasAudio = true;
      saveAudioRecordBlob(obsId, pendingAudioBlob).catch(() => {});
      if (targetStudent.id) {
        uploadAudioRecordToCloud(obsId, pendingAudioBlob, targetStudent.id).catch(() => {});
      }
    }

    const activeGoals = (targetStudent.goals || []).filter((g: any) => g.title || g.description);

    // If student has no goals, save directly to daily observations
    if (activeGoals.length === 0) {
      const existingEntries = Array.isArray(targetStudent.dailyPedagogicalEntries)
        ? targetStudent.dailyPedagogicalEntries
        : [];
      const updatedStudent = {
        ...targetStudent,
        dailyPedagogicalEntries: [newObs, ...existingEntries]
      };
      onUpdateStudent?.(updatedStudent);
      setIsAnalyzing(false);
      setFeedback({ type: 'success', text: 'התצפית נשמרה בהצלחה בתיעוד השוטף של התלמיד/ה!' });
      setNoteText('');
      setPendingAudioBlob(null);
      return;
    }

    // Run AI Goal Matching
    try {
      const prompt = buildAiGoalMatchPrompt({ note: noteToAnalyze, student: targetStudent });
      const maskedPrompt = maskPromptForAi(prompt, targetStudent);

      const response = await callAiProxyEndpoint({
        operation: 'goalMatch',
        payload: { prompt: maskedPrompt },
        hints: { gender: targetStudent?.gender || 'boy', name: targetStudent?.name, model: 'gemini-2.5-flash' }
      });

      const parsedMatches: any[] = parseAiGoalMultiMatchResponse(response);
      const validMatches = (parsedMatches || []).filter((m) =>
        m.matchedGoalId && activeGoals.some((g: any) => g.id === m.matchedGoalId)
      );

      if (validMatches.length > 0) {
        const matchMap = new Map<string, { note: string; delta: number; supportLevel: string }>();
        validMatches.forEach((m) => {
          matchMap.set(m.matchedGoalId, {
            note: m.conciseObservationNote || noteToAnalyze,
            delta: m.suggestedProgressDelta || 0,
            supportLevel: m.observedSupportLevel || 'תיווך חלקי'
          });
        });

        const updatedGoals = (targetStudent.goals || []).map((g: any) => {
          const matchData = matchMap.get(g.id);
          if (matchData) {
            const currentP = Number(g.currentProgress) || 0;
            const newP = Math.min(100, currentP + matchData.delta);
            const goalObs = {
              ...newObs,
              supportLevel: matchData.supportLevel,
              note: matchData.note
            };
            const existingObs = Array.isArray(g.observations) ? g.observations : [];
            return {
              ...g,
              currentProgress: newP,
              observations: [goalObs, ...existingObs]
            };
          }
          return g;
        });

        const updatedStudent = {
          ...targetStudent,
          goals: updatedGoals
        };
        onUpdateStudent?.(updatedStudent);
        setFeedback({
          type: 'success',
          text: `התצפית נותחה ושויכה בהצלחה ל-${validMatches.length} יעדים בתוכנית!`
        });
      } else {
        // No strict match found: save to general entries so teacher's observation is safe
        const existingEntries = Array.isArray(targetStudent.dailyPedagogicalEntries)
          ? targetStudent.dailyPedagogicalEntries
          : [];
        const updatedStudent = {
          ...targetStudent,
          dailyPedagogicalEntries: [newObs, ...existingEntries]
        };
        onUpdateStudent?.(updatedStudent);
        setFeedback({
          type: 'success',
          text: 'לא זוהתה התאמה מובהקת ליעד ספציפי. התצפית נשמרה בתיעוד השוטף של התלמיד/ה!'
        });
      }

      setNoteText('');
      setPendingAudioBlob(null);
    } catch {
      setFeedback({ type: 'error', text: 'שגיאה בחיבור לבינה מלאכותית. התצפית לא נשמרה, נא לנסות שוב.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mobile-quick-backdrop" onClick={onClose}>
      <div
        className="mobile-quick-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="מוקד פעולות מהיר לתלמיד"
      >
        <div className="mobile-quick-handle" />

        {/* Header */}
        <div className="mobile-quick-header">
          <div>
            <h3 className="mobile-quick-title">מוקד פעולות מהיר לתלמיד</h3>
            <p className="mobile-quick-subtitle">חיפוש, שיתוף דוחות ותיעוד יומי בקליק אחד</p>
          </div>
          <button
            type="button"
            className="mobile-quick-close-btn"
            onClick={onClose}
            aria-label="סגירה"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="mobile-quick-body">
          {/* Instant Search Bar */}
          <div className="mobile-quick-search-box">
            <Search size={18} className="mobile-quick-search-icon" />
            <input
              type="text"
              className="mobile-quick-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש תלמיד/ה לפי שם..."
              aria-label="חיפוש תלמיד"
            />
            {searchQuery && (
              <button
                type="button"
                className="mobile-quick-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="נקה חיפוש"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Student Chips Horizontal Bar */}
          <div className="mobile-quick-chips-bar" role="tablist" aria-label="רשימת תלמידים">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((st) => {
                const isSelected = st.id === activeStudentId;
                const initials = (st.name || 'ת').slice(0, 1);
                return (
                  <button
                    key={st.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`mobile-quick-student-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectStudent(st.id)}
                  >
                    <span className="mobile-quick-chip-avatar">
                      {isSelected ? <Check size={12} /> : initials}
                    </span>
                    <span>{st.name || 'תלמיד'}</span>
                  </button>
                );
              })
            ) : (
              <div style={{ fontSize: '12px', color: '#64748b', padding: '6px 0' }}>
                לא נמצאו תלמידים התואמים לחיפוש
              </div>
            )}
          </div>

          {/* Quick Actions (Print & Share) */}
          <div className="mobile-quick-actions-row">
            <button
              type="button"
              className="mobile-quick-action-btn print-btn"
              onClick={handlePrintReport}
            >
              <Printer size={16} />
              <span>הדפסת דוח</span>
            </button>
            <button
              type="button"
              className="mobile-quick-action-btn share-btn"
              onClick={handleShareReport}
            >
              <Share2 size={16} />
              <span>שיתוף דוח</span>
            </button>
          </div>

          {/* Today's Observation Card */}
          <div className="mobile-quick-observation-card">
            <div className="mobile-quick-obs-header">
              <div className="mobile-quick-obs-title">
                <span>תיעוד למפגש היום</span>
                {targetStudent && (
                  <span style={{ color: '#2563eb', fontWeight: 600 }}>• {targetStudent.name}</span>
                )}
              </div>
              <span className="mobile-quick-obs-date">{formattedToday}</span>
            </div>

            {/* Mode Switch Tabs */}
            <div className="mobile-quick-mode-tabs">
              <button
                type="button"
                className={`mobile-quick-mode-tab ${obsMode === 'voice' ? 'active' : ''}`}
                onClick={() => setObsMode('voice')}
              >
                <Mic size={14} />
                <span>הקלטה קולית</span>
              </button>
              <button
                type="button"
                className={`mobile-quick-mode-tab ${obsMode === 'text' ? 'active' : ''}`}
                onClick={() => setObsMode('text')}
              >
                <Edit3 size={14} />
                <span>כתיבת הערה</span>
              </button>
            </div>

            {/* Voice Recorder Component (When Voice Mode Active) */}
            {obsMode === 'voice' && (
              <div className="mobile-quick-voice-wrap">
                <VoiceObservationRecorder
                  disabled={isAnalyzing}
                  baseText={noteText}
                  onTranscript={(text) => setNoteText(text)}
                  onAudioReady={(blob) => setPendingAudioBlob(blob)}
                  onClearAudio={() => setPendingAudioBlob(null)}
                />
              </div>
            )}

            {/* Observation Textarea */}
            <textarea
              className="mobile-quick-textarea"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="הקלידי או תמללי את התצפית מהמפגש..."
              aria-label="תוכן תצפית"
            />

            {/* Status / Feedback Alert */}
            {feedback && (
              <div className={`mobile-quick-alert ${feedback.type}`}>
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Submit & Save via AI */}
            <button
              type="button"
              className="mobile-quick-submit-btn"
              onClick={handleAnalyzeAndSave}
              disabled={isAnalyzing || (!noteText.trim() && !pendingAudioBlob)}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>מעבד ומשייך בבינה מלאכותית...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>ניתוח בבינה מלאכותית ושמירה</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
