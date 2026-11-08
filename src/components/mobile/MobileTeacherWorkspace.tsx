import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Printer,
  Share2,
  Mic,
  Edit3,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  LogOut,
  Monitor
} from 'lucide-react';
import VoiceObservationRecorder from '../voice/VoiceObservationRecorder';
import { buildStatusReportPrintHtml, openHtmlPrintWindow } from '../../export/wordAndPrintBuilders';
import { buildAiGoalMatchPrompt, parseAiGoalMultiMatchResponse } from '../../domain/dailyPedagogicalTracking';
import { callAiProxyEndpoint } from '../../services/aiProxyClient';
import { maskPromptForAi } from '../../goalBankData';
import { saveAudioRecordBlob, uploadAudioRecordToCloud } from '../../services/dossierFileStorage';
import { transcribeAudioWithGemini } from '../../services/audioTranscriptionService';
import './MobileTeacherWorkspace.css';

export interface MobileTeacherWorkspaceProps {
  students: any[];
  selectedStudentId?: string | null;
  onSelectStudent: (studentId: string) => void;
  currentUser: any;
  onUpdateStudent: (updatedStudent: any) => void;
  onSwitchToDesktop: () => void;
  onLogout: () => void;
}

export default function MobileTeacherWorkspace({
  students = [],
  selectedStudentId = null,
  onSelectStudent,
  currentUser = {},
  onUpdateStudent,
  onSwitchToDesktop,
  onLogout
}: MobileTeacherWorkspaceProps) {
  // Target Student Selection
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

  // Instant Student Search
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

  // Today's Observation State
  const [obsMode, setObsMode] = useState<'voice' | 'text'>('voice');
  const [noteText, setNoteText] = useState('');
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formattedToday = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('he-IL', { dateStyle: 'full' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, []);

  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const handleSelectStudent = (id: string) => {
    setActiveStudentId(id);
    onSelectStudent(id);
    setFeedback(null);
  };

  // Print Report Handler
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

  // Share / Email Report Handler
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

    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\nנשלח ממערכת תל"א:\n${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Analyze & Commit Observation
  const handleAnalyzeAndSave = async () => {
    setFeedback(null);
    let noteToAnalyze = noteText.trim();

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
      source: 'mobile_workspace'
    };

    if (pendingAudioBlob) {
      newObs.hasAudio = true;
      saveAudioRecordBlob(obsId, pendingAudioBlob).catch(() => {});
      if (targetStudent.id) {
        uploadAudioRecordToCloud(obsId, pendingAudioBlob, targetStudent.id).catch(() => {});
      }
    }

    const activeGoals = (targetStudent.goals || []).filter((g: any) => g.title || g.description);

    if (activeGoals.length === 0) {
      const existingEntries = Array.isArray(targetStudent.dailyPedagogicalEntries)
        ? targetStudent.dailyPedagogicalEntries
        : [];
      const updatedStudent = {
        ...targetStudent,
        dailyPedagogicalEntries: [newObs, ...existingEntries]
      };
      onUpdateStudent(updatedStudent);
      setIsAnalyzing(false);
      setFeedback({ type: 'success', text: 'התצפית נשמרה בהצלחה בתיעוד השוטף של התלמיד/ה!' });
      setNoteText('');
      setPendingAudioBlob(null);
      return;
    }

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
        onUpdateStudent(updatedStudent);
        setFeedback({
          type: 'success',
          text: `התצפית נותחה ושויכה בהצלחה ל-${validMatches.length} יעדים בתוכנית!`
        });
      } else {
        const existingEntries = Array.isArray(targetStudent.dailyPedagogicalEntries)
          ? targetStudent.dailyPedagogicalEntries
          : [];
        const updatedStudent = {
          ...targetStudent,
          dailyPedagogicalEntries: [newObs, ...existingEntries]
        };
        onUpdateStudent(updatedStudent);
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

  const activeGoals = useMemo(() => {
    return (targetStudent?.goals || []).filter((g: any) => g.title || g.description);
  }, [targetStudent]);

  return (
    <div className="mobile-workspace-container">
      {/* Minimal Mobile Top Bar */}
      <header className="mobile-top-bar">
        <div className="mobile-brand">
          <img src="./tala-logo.png" alt="לוגו תל&quot;א" className="mobile-brand-logo" />
          <div>
            <h1 className="mobile-brand-title">תל"א</h1>
            <span className="mobile-brand-version">מרחב מובייל</span>
          </div>
        </div>

        <div className="mobile-top-actions">
          <span className="mobile-user-badge" title={currentUser?.name || 'משתמשת'}>
            {currentUser?.name || 'מורה'}
          </span>
          <button
            type="button"
            className="mobile-top-btn"
            onClick={onSwitchToDesktop}
            title="מעבר לתצוגת מחשב מלאה"
            aria-label="מעבר לתצוגת מחשב"
          >
            <Monitor size={16} />
          </button>
          <button
            type="button"
            className="mobile-top-btn"
            onClick={onLogout}
            title="התנתקות מהמערכת"
            aria-label="התנתקות"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="mobile-workspace-body">
        {/* Instant Search Bar */}
        <div className="mobile-search-card">
          <Search size={18} className="mobile-search-icon" />
          <input
            type="text"
            className="mobile-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש תלמיד/ה לפי שם..."
            aria-label="חיפוש תלמיד"
          />
          {searchQuery && (
            <button
              type="button"
              className="mobile-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="נקה חיפוש"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Horizontal Student Cards Carousel */}
        <div className="mobile-students-carousel" role="tablist" aria-label="רשימת תלמידים">
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
                  className={`mobile-student-card-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectStudent(st.id)}
                >
                  <div className="mobile-student-avatar">
                    {initials}
                  </div>
                  <div className="mobile-student-info">
                    <span className="mobile-student-name">{st.name || 'תלמיד'}</span>
                    <span className="mobile-student-framework">
                      {st.educationalFramework || 'מסגרת כללית'}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b', padding: '8px 0' }}>
              לא נמצאו תלמידים התואמים לחיפוש
            </div>
          )}
        </div>

        {/* Selected Student Active Card */}
        {targetStudent ? (
          <>
            <div className="mobile-active-hero-card">
              <div className="mobile-active-hero-header">
                <div>
                  <h2 className="mobile-active-hero-name">{targetStudent.name || 'תלמיד/ה'}</h2>
                  <p className="mobile-active-hero-meta">
                    {targetStudent.educationalFramework || 'מסגרת חינוכית'} • {activeGoals.length} יעדים פעילים
                  </p>
                </div>
              </div>

              {/* Quick Actions (Print & Share) */}
              <div className="mobile-actions-grid">
                <button
                  type="button"
                  className="mobile-action-pill-btn print"
                  onClick={handlePrintReport}
                >
                  <Printer size={16} />
                  <span>הדפסת דוח</span>
                </button>
                <button
                  type="button"
                  className="mobile-action-pill-btn share"
                  onClick={handleShareReport}
                >
                  <Share2 size={16} />
                  <span>שיתוף דוח</span>
                </button>
              </div>
            </div>

            {/* Today's Observation Card */}
            <div className="mobile-obs-box">
              <div className="mobile-obs-title-row">
                <div className="mobile-obs-title">
                  <span>תיעוד למפגש היום</span>
                </div>
                <span className="mobile-obs-date-badge">{formattedToday}</span>
              </div>

              {/* Mode Switcher */}
              <div className="mobile-mode-selector">
                <button
                  type="button"
                  className={`mobile-mode-btn ${obsMode === 'voice' ? 'active' : ''}`}
                  onClick={() => setObsMode('voice')}
                >
                  <Mic size={14} />
                  <span>הקלטה קולית</span>
                </button>
                <button
                  type="button"
                  className={`mobile-mode-btn ${obsMode === 'text' ? 'active' : ''}`}
                  onClick={() => setObsMode('text')}
                >
                  <Edit3 size={14} />
                  <span>כתיבת הערה</span>
                </button>
              </div>

              {/* Voice Recorder */}
              {obsMode === 'voice' && (
                <div className="mobile-voice-wrapper">
                  <VoiceObservationRecorder
                    disabled={isAnalyzing}
                    baseText={noteText}
                    onTranscript={(text) => setNoteText(text)}
                    onAudioReady={(blob) => setPendingAudioBlob(blob)}
                    onClearAudio={() => setPendingAudioBlob(null)}
                  />
                </div>
              )}

              {/* Textarea */}
              <textarea
                className="mobile-obs-textarea"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="הקלידי או תמללי את התצפית מהמפגש..."
                aria-label="תוכן תצפית"
              />

              {/* Feedback alert */}
              {feedback && (
                <div className={`mobile-feedback-alert ${feedback.type}`}>
                  {feedback.type === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Submit & AI Goal Link Button */}
              <button
                type="button"
                className="mobile-ai-submit-btn"
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

            {/* Active Goals Section */}
            <div className="mobile-goals-section">
              <div className="mobile-goals-header">
                <span>יעדי התוכנית הפעילים</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>({activeGoals.length})</span>
              </div>

              {activeGoals.length > 0 ? (
                activeGoals.map((g: any, index: number) => {
                  const progress = Number(g.currentProgress) || 0;
                  return (
                    <div key={g.id || index} className="mobile-goal-card">
                      <div className="mobile-goal-card-header">
                        <span className="mobile-goal-title">{g.title || g.description}</span>
                        {g.domain && <span className="mobile-goal-domain">{g.domain}</span>}
                      </div>
                      <div className="mobile-progress-track">
                        <div className="mobile-progress-bar" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mobile-goal-footer">
                        <span>התקדמות ביעד: {progress}%</span>
                        {Array.isArray(g.observations) && (
                          <span>{g.observations.length} תצפיות מתועדות</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: '13px', color: '#64748b', background: '#ffffff', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                  טרם הוגדרו יעדים פעילים לתלמיד/ה זה
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <Target size={32} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.5 }} />
            <p>אין עדיין תלמידים להצגה. ניתן ליצור תלמיד חדש דרך תצוגת המחשב.</p>
          </div>
        )}

        {/* Switch to Desktop Option */}
        <div className="mobile-desktop-switch-box">
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0' }}>
            רוצה לערוך את תוכנית העבודה המלאה או להוסיף תלמידים חדשים?
          </p>
          <button
            type="button"
            className="mobile-switch-desktop-btn"
            onClick={onSwitchToDesktop}
          >
            <Monitor size={15} />
            <span>מעבר לטופס המחשב המלא</span>
          </button>
        </div>
      </main>
    </div>
  );
}
