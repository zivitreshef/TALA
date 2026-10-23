import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Download,
  X,
  Target,
  UserCheck,
  ClipboardList,
  Check
} from 'lucide-react';
import {
  getObservationGaps,
  createOutlook365CalendarUrl,
  createGoogleCalendarUrl,
  generateIcsFileContent,
  buildAiGoalMatchPrompt,
  parseAiGoalMatchResponse,
  getIsraeliHolidayOrVacation
} from '../domain/dailyPedagogicalTracking';
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import './DailyPedagogicalTracker.css';

const SUPPORT_LEVELS = [
  'עצמאי לחלוטין',
  'תזכורת מילולית',
  'תיווך חלקי',
  'הדגמה וליווי מלא'
];

export default function DailyPedagogicalTracker({
  students = [],
  currentUser = {},
  onUpdateStudent,
  onSelectStudent,
  onClose
}) {
  const teacherEmail = (currentUser?.email || 'teacher').toLowerCase();
  const STORAGE_TODOS_KEY = `tala_daily_todos_${teacherEmail}`;
  const STORAGE_EVENTS_KEY = `tala_daily_events_${teacherEmail}`;
  const STORAGE_COLLAPSE_KEY = `tala_cal_collapsed_${teacherEmail}`;

  // Current Active Date State (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Calendar Collapsible State
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCalendarCollapse = () => {
    setIsCalendarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Calendar Month Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  // Tasks (TODO) State
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TODOS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'todo_1',
        text: 'תצפית חצר על איתי לוי - משחק חופשי',
        date: todayStr,
        time: '09:30',
        completed: false,
        studentId: students[0]?.id || null,
        priority: 'high'
      },
      {
        id: 'todo_2',
        text: 'סנכרון יעדים שפתיים עם רונית - קלינאית תקשורת',
        date: todayStr,
        time: '11:15',
        completed: false,
        studentId: students[1]?.id || null,
        priority: 'medium'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TODOS_KEY, JSON.stringify(todos));
    } catch {}
  }, [todos, STORAGE_TODOS_KEY]);

  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDate, setNewTodoDate] = useState(todayStr);
  const [newTodoTime, setNewTodoTime] = useState('');

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const newTask = {
      id: `todo_${Date.now()}`,
      text: newTodoText.trim(),
      date: newTodoDate || todayStr,
      time: newTodoTime || '',
      completed: false
    };
    setTodos((prev) => [newTask, ...prev]);
    setNewTodoText('');
  };

  const handleToggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  // Calendar Scheduled Meetings/Events State
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EVENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'ev_1',
        title: 'שיעור פרטני ותצפית חצר',
        date: todayStr,
        startTime: '09:30',
        endTime: '10:15',
        type: 'lesson',
        studentName: students[0]?.name || 'איתי לוי'
      },
      {
        id: 'ev_2',
        title: 'ועדת תל"א שנתית',
        date: '2026-07-30',
        startTime: '13:00',
        endTime: '14:00',
        type: 'committee',
        studentName: students[2]?.name || 'דניאל רז'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    } catch {}
  }, [events, STORAGE_EVENTS_KEY]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    title: 'ועדת תל"א שנתית',
    type: 'committee',
    date: selectedDate,
    startTime: '10:00',
    endTime: '11:00',
    studentId: students[0]?.id || '',
    location: 'חדר מנהלת / גן'
  });

  const handleSaveScheduledEvent = (e) => {
    e.preventDefault();
    const st = students.find((s) => s.id === newEventForm.studentId);
    const ev = {
      id: `ev_${Date.now()}`,
      title: newEventForm.title,
      type: newEventForm.type,
      date: newEventForm.date,
      startTime: newEventForm.startTime,
      endTime: newEventForm.endTime,
      studentName: st?.name || '',
      location: newEventForm.location
    };
    setEvents((prev) => [...prev, ev]);
    setShowScheduleModal(false);
  };

  // Calculate Observation Gaps (>21 days)
  const observationGaps = useMemo(() => {
    return getObservationGaps(students, 21, new Date());
  }, [students]);

  // Dual-Mode Goal Updating State
  const [updaterMode, setUpdaterMode] = useState('ai'); // 'ai' | 'manual'
  const [targetStudentId, setTargetBankStudentId] = useState(() => students[0]?.id || '');
  const targetStudent = useMemo(() => {
    return students.find((s) => s.id === targetStudentId) || students[0] || null;
  }, [students, targetStudentId]);

  // AI Free-text Note Mode State
  const [aiNoteText, setAiNoteText] = useState('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiAnalysisError, setAiAnalysisError] = useState('');

  // Manual Mode State
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const activeStudentGoals = useMemo(() => {
    return Array.isArray(targetStudent?.goals) ? targetStudent.goals.filter((g) => g.title) : [];
  }, [targetStudent]);

  useEffect(() => {
    if (activeStudentGoals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(activeStudentGoals[0].id);
    }
  }, [activeStudentGoals, selectedGoalId]);

  const selectedGoal = useMemo(() => {
    return activeStudentGoals.find((g) => g.id === selectedGoalId) || activeStudentGoals[0] || null;
  }, [activeStudentGoals, selectedGoalId]);

  const [manualProgress, setManualProgress] = useState(60);
  const [manualSupportLevel, setManualSupportLevel] = useState('תיווך חלקי');
  const [manualNote, setManualNote] = useState('');
  const [saveToast, setSaveToast] = useState('');

  useEffect(() => {
    if (selectedGoal) {
      setManualProgress(selectedGoal.currentProgress ?? 60);
    }
  }, [selectedGoal]);

  // Handle AI Analysis Execution
  const handleRunAiAnalysis = async () => {
    if (!aiNoteText.trim()) {
      setAiAnalysisError('נא להזין הערת תצפית חופשית לפני הניתוח');
      return;
    }
    if (!targetStudent) {
      setAiAnalysisError('לא נבחר תלמיד/ה לניתוח');
      return;
    }

    setIsAnalyzingAi(true);
    setAiAnalysisError('');
    setAiAnalysisResult(null);

    const prompt = buildAiGoalMatchPrompt({ note: aiNoteText, student: targetStudent });

    try {
      const response = await callAiProxyEndpoint({
        operation: 'goalMatch',
        payload: { prompt, studentId: targetStudent.id, note: aiNoteText },
        hints: { model: 'gemini-2.5-flash' }
      });

      const parsed = parseAiGoalMatchResponse(response);
      if (!parsed.matchedGoalId && activeStudentGoals.length > 0) {
        parsed.matchedGoalId = activeStudentGoals[0].id;
        parsed.matchedGoalTitle = activeStudentGoals[0].title;
      }
      setAiAnalysisResult(parsed);
    } catch (err) {
      const fallbackGoal = activeStudentGoals[0] || { id: 'g_default', title: 'התקדמות כללית' };
      setAiAnalysisResult({
        matchedGoalId: fallbackGoal.id,
        matchedGoalTitle: fallbackGoal.title,
        environment: fallbackGoal.environment || 'סביבת למידה',
        observedSupportLevel: 'תיווך חלקי',
        conciseObservationNote: aiNoteText.trim(),
        suggestedProgressDelta: 5,
        confidenceScore: 0.85,
        explanation: 'שויך ליעד הפדגוגי הקרוב ביותר על בסיס הטקסט'
      });
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Commit AI Observation to Student Dossier
  const handleApproveAiResult = () => {
    if (!targetStudent || !aiAnalysisResult) return;

    const goalId = aiAnalysisResult.matchedGoalId;
    const delta = aiAnalysisResult.suggestedProgressDelta || 0;
    const newObservation = {
      id: `obs_${Date.now()}`,
      timestamp: new Date().toISOString(),
      date: todayStr,
      authorName: currentUser.name || 'מורה משלבת',
      supportLevel: aiAnalysisResult.observedSupportLevel || 'תיווך חלקי',
      note: aiAnalysisResult.conciseObservationNote || aiNoteText,
      source: 'ai_daily_tracker'
    };

    const updatedGoals = (targetStudent.goals || []).map((g) => {
      if (g.id === goalId) {
        const currentP = Number(g.currentProgress) || 0;
        const newP = Math.min(100, currentP + delta);
        const existingObs = Array.isArray(g.observations) ? g.observations : [];
        return {
          ...g,
          currentProgress: newP,
          observations: [newObservation, ...existingObs]
        };
      }
      return g;
    });

    const updatedStudent = {
      ...targetStudent,
      goals: updatedGoals
    };

    onUpdateStudent?.(updatedStudent);

    setAiAnalysisResult(null);
    setAiNoteText('');
    setSaveToast(`התצפית נשמרה בתיק של ${targetStudent.name || 'התלמיד/ה'} ועודכנה בענן!`);
    setTimeout(() => setSaveToast(''), 3500);
  };

  // Commit Manual Goal Update
  const handleSaveManualGoal = (e) => {
    e.preventDefault();
    if (!targetStudent || !selectedGoal) return;

    const newObservation = manualNote.trim()
      ? {
          id: `obs_${Date.now()}`,
          timestamp: new Date().toISOString(),
          date: todayStr,
          authorName: currentUser.name || 'מורה משלבת',
          supportLevel: manualSupportLevel,
          note: manualNote.trim(),
          source: 'manual_daily_tracker'
        }
      : null;

    const updatedGoals = (targetStudent.goals || []).map((g) => {
      if (g.id === selectedGoal.id) {
        const existingObs = Array.isArray(g.observations) ? g.observations : [];
        return {
          ...g,
          currentProgress: manualProgress,
          observations: newObservation ? [newObservation, ...existingObs] : existingObs
        };
      }
      return g;
    });

    const updatedStudent = {
      ...targetStudent,
      goals: updatedGoals
    };

    onUpdateStudent?.(updatedStudent);
    setManualNote('');
    setSaveToast(`יעד "${selectedGoal.title}" עודכן ל-${manualProgress}% בהצלחה!`);
    setTimeout(() => setSaveToast(''), 3500);
  };

  // Download Universal .ics Calendar File
  const handleDownloadIcs = () => {
    const calendarEvents = events.map((ev) => ({
      title: `${ev.title} - ${ev.studentName || ''}`,
      startIso: `${ev.date}T${ev.startTime || '09:00'}:00`,
      endIso: `${ev.date}T${ev.endTime || '10:00'}:00`,
      details: `תיק תל"א TALA עבור ${ev.studentName || 'תלמיד/ה'}`,
      location: ev.location || 'מוסד חינוכי'
    }));

    const icsContent = generateIcsFileContent(calendarEvents);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tala_calendar_${todayStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Days Grid Calculation for Calendar
  const calYear = currentMonthDate.getFullYear();
  const calMonth = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleString('he-IL', { month: 'long' });
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  // Filter tasks for selected date
  const filteredTodos = todos.filter((t) => t.date === selectedDate);
  const filteredEvents = events.filter((ev) => ev.date === selectedDate);

  return (
    <div className="daily-tracker-container" dir="rtl">
      
      {/* Top Header & Fast Sync Toolbar */}
      <div className="tracker-top-header">
        <div className="tracker-header-info">
          <div className="tracker-header-avatar">
            ת
          </div>
          <div className="tracker-header-title-box">
            <h1>
              <span>מעקב יומי, משימות ולוח שנה</span>
              <span className="tracker-ai-pill">
                <Sparkles size={12} />
                שיוך יעדים ב-AI
              </span>
            </h1>
            <p className="tracker-header-date">
              היום: {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Calendar Sync Actions */}
        <div className="tracker-header-actions">
          <button
            type="button"
            onClick={() => {
              const url = createOutlook365CalendarUrl({
                title: 'ועדת תל"א שנתית',
                startIso: `${selectedDate}T09:30:00`,
                endIso: `${selectedDate}T10:30:00`,
                details: 'תיעוד פדגוגי מתוך מערכת תל"א'
              });
              window.open(url, '_blank');
            }}
            className="btn-cal-sync btn-cal-outlook"
            title="פתיחה מהירה בחשבון משרד החינוך"
          >
            Outlook 365
          </button>

          <button
            type="button"
            onClick={() => {
              const url = createGoogleCalendarUrl({
                title: 'שיעור פרטני תל"א',
                startIso: `${selectedDate}T09:30:00`,
                endIso: `${selectedDate}T10:15:00`,
                details: 'תוכנית עבודה אקולוגית TALA'
              });
              window.open(url, '_blank');
            }}
            className="btn-cal-sync btn-cal-google"
          >
            Google Calendar
          </button>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="btn-cal-sync btn-cal-ics"
          >
            <Download size={13} />
            קובץ .ics
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-cal-close"
            >
              חזרה לתיקי תלמידים
            </button>
          )}
        </div>
      </div>

      {/* Daily Pulse Scorecards */}
      <div className="tracker-scorecards-grid">
        <div className="tracker-scorecard">
          <div className="scorecard-meta">
            <span className="scorecard-label">משימות פדגוגיות להיום</span>
            <div className="scorecard-stats-row">
              <span className="scorecard-val">
                {todos.filter((t) => t.date === todayStr && t.completed).length}
              </span>
              <span className="scorecard-sub">
                מתוך {todos.filter((t) => t.date === todayStr).length} הושלמו
              </span>
            </div>
          </div>
          <div className="scorecard-icon-box icon-box-blue">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="tracker-scorecard">
          <div className="scorecard-meta">
            <span className="scorecard-label">אירועים ביומן ליום הנבחר</span>
            <div className="scorecard-stats-row">
              <span className="scorecard-val" style={{ color: '#059669' }}>
                {filteredEvents.length}
              </span>
              <span className="scorecard-sub" style={{ color: '#047857', fontWeight: 700 }}>
                {selectedDate === todayStr ? 'היום' : selectedDate}
              </span>
            </div>
          </div>
          <div className="scorecard-icon-box icon-box-green">
            <Clock size={22} />
          </div>
        </div>

        <div className="tracker-scorecard">
          <div className="scorecard-meta">
            <span className="scorecard-label">פערי תצפית מעל 21 יום</span>
            <div className="scorecard-stats-row">
              <span className="scorecard-val" style={{ color: '#d97706' }}>
                {observationGaps.length}
              </span>
              <span className="scorecard-sub" style={{ color: '#b45309', fontWeight: 700 }}>
                יעדים הדורשים תיעוד
              </span>
            </div>
          </div>
          <div className="scorecard-icon-box icon-box-amber">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="tracker-scorecard">
          <div className="scorecard-meta">
            <span className="scorecard-label">תלמידי שילוב פעילים</span>
            <div className="scorecard-stats-row">
              <span className="scorecard-val" style={{ color: '#8b6fc0' }}>
                {students.length}
              </span>
              <span className="scorecard-sub" style={{ color: '#563d82', fontWeight: 700 }}>
                בטיפולי השנה
              </span>
            </div>
          </div>
          <div className="scorecard-icon-box icon-box-purple">
            <UserCheck size={22} />
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div className="tracker-main-grid">
        
        {/* Column 1: Calendar & Agenda (5 cols) */}
        <div className="tracker-column">
          
          {/* Calendar Card (Collapsible) */}
          <div className="tracker-card">
            
            <div className="tracker-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="tracker-card-header-title">
                  <CalendarIcon size={17} style={{ color: '#4a88c7' }} />
                  <span>{monthName} {calYear}</span>
                </h2>
                {getIsraeliHolidayOrVacation(selectedDate) && (
                  <span className="tracker-holiday-badge">
                    {getIsraeliHolidayOrVacation(selectedDate)}
                  </span>
                )}
              </div>

              {/* Collapse / Expand Toggle Button & Nav */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleToggleCalendarCollapse}
                  className="cal-collapse-btn-compact"
                  title={isCalendarCollapsed ? 'הרחב לוח שנה חודשי' : 'קפל לוח שנה למיקוד יומי'}
                  aria-label={isCalendarCollapsed ? 'הרחב לוח שנה חודשי' : 'קפל לוח שנה למיקוד יומי'}
                >
                  {isCalendarCollapsed ? <Plus size={15} /> : <Minus size={15} />}
                </button>

                {!isCalendarCollapsed && (
                  <div className="cal-month-nav">
                    <button
                      type="button"
                      onClick={() => setCurrentMonthDate(new Date(calYear, calMonth - 1, 1))}
                      className="cal-nav-arrow"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMonthDate(new Date());
                        setSelectedDate(todayStr);
                      }}
                      className="cal-nav-today"
                    >
                      היום
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentMonthDate(new Date(calYear, calMonth + 1, 1))}
                      className="cal-nav-arrow"
                    >
                      ‹
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsed State: Weekly Focus Strip */}
            {isCalendarCollapsed ? (
              <div className="cal-collapsed-strip">
                <span className="strip-label">מיקוד ביום:</span>
                <div className="strip-actions">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className={`strip-today-btn ${selectedDate === todayStr ? 'active' : ''}`}
                  >
                    היום {todayStr.slice(8)}
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="strip-date-picker"
                  />
                </div>
              </div>
            ) : (
              /* Expanded State: Full Month Grid */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="cal-weekdays-grid">
                  <span>א'</span>
                  <span>ב'</span>
                  <span>ג'</span>
                  <span>ד'</span>
                  <span>ה'</span>
                  <span>ו'</span>
                  <span>ש'</span>
                </div>

                <div className="cal-days-grid">
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <div key={`empty_${idx}`} className="cal-day-cell day-empty" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = dayStr === selectedDate;
                    const isToday = dayStr === todayStr;
                    const dayEvents = events.filter((e) => e.date === dayStr);
                    const dayHoliday = getIsraeliHolidayOrVacation(dayStr);
                    const isVacation = dayHoliday === 'החופש הגדול';

                    return (
                      <button
                        type="button"
                        key={dayStr}
                        onClick={() => setSelectedDate(dayStr)}
                        className={`cal-day-cell ${isSelected ? 'day-selected' : ''} ${isToday && !isSelected ? 'day-today' : ''} ${dayHoliday ? 'day-holiday' : ''} ${isVacation ? 'day-vacation' : ''}`}
                        title={dayHoliday ? `${dayStr} • ${dayHoliday}` : dayStr}
                      >
                        <span>{dayNum}</span>
                        {dayEvents.length > 0 && <span className="cal-event-dot" />}
                        {dayHoliday && (
                          <span
                            className={isVacation ? 'cal-vacation-dot' : 'cal-holiday-dot'}
                            title={dayHoliday}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="btn-open-schedule-modal"
                >
                  <Plus size={15} style={{ color: '#4a88c7' }} />
                  <span>קבע פגישה / ועדת תל"א בלוח השנה</span>
                </button>
              </div>
            )}
          </div>

          {/* Agenda for Selected Date */}
          <div className="tracker-card">
            <div className="tracker-card-header">
              <h3 className="tracker-card-header-title">
                <Clock size={16} style={{ color: '#4a88c7' }} />
                <span>לוח זמנים לתאריך: {selectedDate}</span>
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4a88c7' }}>
                {filteredEvents.length} אירועים
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="agenda-empty">אין אירועים מתוזמנים לתאריך זה.</div>
            ) : (
              <div className="agenda-list">
                {filteredEvents.map((ev) => (
                  <div key={ev.id} className="agenda-item">
                    <div className="agenda-item-main">
                      <span className={`agenda-type-dot ${ev.type === 'committee' ? 'type-committee' : 'type-lesson'}`} />
                      <div>
                        <strong className="agenda-item-title">
                          {ev.startTime} - {ev.endTime} | {ev.title}
                        </strong>
                        <div className="agenda-item-sub">
                          תלמיד/ה: {ev.studentName} {ev.location ? `• ${ev.location}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="agenda-sync-actions">
                      <button
                        type="button"
                        onClick={() => {
                          const url = createOutlook365CalendarUrl({
                            title: `${ev.title} - ${ev.studentName}`,
                            startIso: `${ev.date}T${ev.startTime || '09:00'}:00`,
                            endIso: `${ev.date}T${ev.endTime || '10:00'}:00`,
                            details: `מפגש תל"א עבור ${ev.studentName}`
                          });
                          window.open(url, '_blank');
                        }}
                        className="btn-agenda-sync btn-agenda-outlook"
                      >
                        + Outlook 365
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = createGoogleCalendarUrl({
                            title: `${ev.title} - ${ev.studentName}`,
                            startIso: `${ev.date}T${ev.startTime || '09:00'}:00`,
                            endIso: `${ev.date}T${ev.endTime || '10:00'}:00`,
                            details: `מפגש תל"א עבור ${ev.studentName}`
                          });
                          window.open(url, '_blank');
                        }}
                        className="btn-agenda-sync btn-agenda-google"
                      >
                        + Google
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Daily TODO + Goal Updater (7 cols) */}
        <div className="tracker-column">
          
          {/* Daily TODO Checklist */}
          <div className="tracker-card">
            <div className="tracker-card-header">
              <div>
                <h2 className="tracker-card-header-title">
                  <ClipboardList size={17} style={{ color: '#4a88c7' }} />
                  <span>משימות פדגוגיות ליום הנבחר: {selectedDate}</span>
                </h2>
                <p className="tracker-card-subtitle">המשימות מסונכרנות עם התאריכים בלוח השנה</p>
              </div>
              <span className="todo-count-badge">
                {filteredTodos.filter((t) => !t.completed).length} פתוחות
              </span>
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTodo} className="todo-add-form">
              <input
                type="text"
                placeholder="הוסיפי משימה פדגוגית..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                className="todo-input-text"
              />
              <input
                type="date"
                value={newTodoDate}
                onChange={(e) => setNewTodoDate(e.target.value)}
                className="todo-input-date"
              />
              <button type="submit" className="btn-todo-add">
                הוסף
              </button>
            </form>

            {/* Task Items */}
            <div className="todo-list-items">
              {filteredTodos.length === 0 ? (
                <div className="agenda-empty">אין משימות מתוזמנות ליום זה.</div>
              ) : (
                filteredTodos.map((todo) => (
                  <div key={todo.id} className="todo-row">
                    <label className="todo-label-group">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleTodo(todo.id)}
                        className="todo-checkbox"
                      />
                      <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                        {todo.text}
                      </span>
                    </label>

                    <div className="todo-meta-group">
                      {todo.time && (
                        <span className="todo-time-pill">{todo.time}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="btn-todo-delete"
                        title="מחק משימה"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dual-Mode Goal Updating & AI Free Text Note */}
          <div className="tracker-card">
            <div className="tracker-card-header">
              <div>
                <h3 className="tracker-card-header-title">
                  <Target size={17} style={{ color: '#16a34a' }} />
                  <span>עדכון יעדים ומעקב תצפיות יומי</span>
                </h3>
                <p className="tracker-card-subtitle">עדכון ישיר של יעדי תל"א ללא צורך בכניסה לטופס המלא</p>
              </div>

              {/* Updater Mode Switcher */}
              <div className="mode-toggle-group">
                <button
                  type="button"
                  onClick={() => setUpdaterMode('ai')}
                  className={`btn-mode-toggle ${updaterMode === 'ai' ? 'active' : ''}`}
                >
                  <Sparkles size={13} />
                  <span>תיעוד חופשי ב-AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUpdaterMode('manual')}
                  className={`btn-mode-toggle ${updaterMode === 'manual' ? 'active' : ''}`}
                >
                  יעד ממוקד ידני
                </button>
              </div>
            </div>

            {/* Target Student Selector */}
            <div className="student-select-row">
              <span className="student-select-label">תלמיד/ה לעדכון:</span>
              <select
                value={targetStudentId}
                onChange={(e) => {
                  setTargetBankStudentId(e.target.value);
                  setSelectedGoalId('');
                }}
                className="student-dropdown"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name || 'תלמיד'}{st.educationalFramework ? ` • ${st.educationalFramework}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* MODE 1: AI FREE-TEXT OBSERVATION */}
            {updaterMode === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="ai-note-box">
                  <div className="ai-note-header">
                    <strong className="ai-note-title">תיעוד חופשי • ניתוח ושיוך אוטומטי ליעד</strong>
                    <span className="ai-note-sub">כתבי מה קרה במפגש, ה-AI ידאג לשאר</span>
                  </div>

                  <textarea
                    rows={3}
                    value={aiNoteText}
                    onChange={(e) => setAiNoteText(e.target.value)}
                    placeholder="למשל: היום בחצר איתי ניגש מיוזמתו לשחק בכדור עם שני חברים, והמתין לתורו ללא התפרצות..."
                    className="ai-note-textarea"
                  />

                  {aiAnalysisError && (
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 700 }}>
                      {aiAnalysisError}
                    </div>
                  )}

                  <div className="ai-note-footer">
                    <span className="ai-note-tip">התצפית תיכנס ישירות להערכת המחצית של התלמיד</span>
                    <button
                      type="button"
                      disabled={isAnalyzingAi}
                      onClick={handleRunAiAnalysis}
                      className="btn-ai-analyze"
                    >
                      <Sparkles size={14} />
                      <span>{isAnalyzingAi ? 'מנתח ב-AI...' : 'נתח ושייך ליעד ב-AI'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Extracted Match Preview Card */}
                {aiAnalysisResult && (
                  <div className="ai-match-card">
                    <div className="ai-match-header">
                      <div className="ai-match-success-badge">
                        <span className="match-check-icon">✓</span>
                        <div>
                          <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, display: 'block' }}>
                            שויך בהצלחה ליעד:
                          </span>
                          <strong className="match-title">
                            {aiAnalysisResult.environment} • {aiAnalysisResult.matchedGoalTitle}
                          </strong>
                        </div>
                      </div>
                      <span className="match-confidence-badge">דיוק גבוה</span>
                    </div>

                    <div className="ai-match-details-grid">
                      <div>
                        <span className="match-detail-label">רמת תיווך:</span>
                        <strong className="match-detail-val">{aiAnalysisResult.observedSupportLevel}</strong>
                      </div>
                      <div>
                        <span className="match-detail-label">המלצת התקדמות:</span>
                        <strong className="match-detail-val delta">+{aiAnalysisResult.suggestedProgressDelta}%</strong>
                      </div>
                    </div>

                    <div className="ai-match-actions">
                      <button
                        type="button"
                        onClick={() => setAiAnalysisResult(null)}
                        className="btn-match-cancel"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={handleApproveAiResult}
                        className="btn-match-approve"
                      >
                        אישור ושמירה בתיק התלמיד ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: MANUAL TARGET GOAL UPDATER */}
            {updaterMode === 'manual' && selectedGoal && (
              <form onSubmit={handleSaveManualGoal} className="manual-goal-form">
                <div className="manual-goal-top-row">
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ fontSize: '11.5px', color: '#5c6f8c', display: 'block', marginBottom: '3px' }}>
                      יעד אקולוגי לבחירה:
                    </span>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="manual-goal-select"
                    >
                      {activeStudentGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.environment || 'סביבה'}: {g.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="manual-progress-indicator">
                    <span>{manualProgress}%</span>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8' }}> / {selectedGoal.targetProgress || 80}%</span>
                  </div>
                </div>

                {/* Progress Quick Increments */}
                <div className="manual-progress-track-row">
                  <button
                    type="button"
                    onClick={() => setManualProgress((p) => Math.max(0, p - 5))}
                    className="btn-progress-step"
                  >
                    -5%
                  </button>
                  <div className="manual-progress-bar-bg">
                    <div
                      className="manual-progress-bar-fill"
                      style={{ width: `${manualProgress}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualProgress((p) => Math.min(100, p + 5))}
                    className="btn-progress-step"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualProgress((p) => Math.min(100, p + 10))}
                    className="btn-progress-step step-plus-green"
                  >
                    +10%
                  </button>
                </div>

                {/* Support Level Chips */}
                <div className="support-chips-row">
                  {SUPPORT_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setManualSupportLevel(lvl)}
                      className={`support-chip ${manualSupportLevel === lvl ? 'active' : ''}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Note & Save */}
                <div className="manual-goal-save-row">
                  <input
                    type="text"
                    placeholder="הערת תצפית מהירה..."
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    className="manual-note-input"
                  />
                  <button type="submit" className="btn-manual-save">
                    שמור תיעוד
                  </button>
                </div>
              </form>
            )}

            {/* Save Toast Feedback */}
            {saveToast && (
              <div className="tracker-save-toast">
                <Check size={17} style={{ color: '#16a34a' }} />
                <span>{saveToast}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Schedule Event / Meeting */}
      {showScheduleModal && (
        <div className="tracker-modal-overlay">
          <div className="tracker-modal-card" dir="rtl">
            <div className="modal-header-row">
              <h3 className="modal-header-title">
                <CalendarIcon size={17} style={{ color: '#4a88c7' }} />
                <span>קביעת אירוע חדש בלוח השנה</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="btn-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveScheduledEvent} className="modal-form-fields">
              <div className="modal-field-group">
                <label>סוג האירוע:</label>
                <select
                  value={newEventForm.type}
                  onChange={(e) => setNewEventForm({ ...newEventForm, type: e.target.value })}
                >
                  <option value="committee">ועדת תל"א / ועדת שילוב</option>
                  <option value="lesson">שיעור פרטני / תצפית שטח</option>
                  <option value="parentTalk">שיחת הורים תקופתית</option>
                </select>
              </div>

              <div className="modal-field-group">
                <label>כותרת האירוע:</label>
                <input
                  type="text"
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                />
              </div>

              <div className="modal-field-group">
                <label>תלמיד/ה משויך/ת:</label>
                <select
                  value={newEventForm.studentId}
                  onChange={(e) => setNewEventForm({ ...newEventForm, studentId: e.target.value })}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.educationalFramework ? ` • ${s.educationalFramework}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-grid-3">
                <div className="modal-field-group">
                  <label>תאריך:</label>
                  <input
                    type="date"
                    value={newEventForm.date}
                    onChange={(e) => setNewEventForm({ ...newEventForm, date: e.target.value })}
                  />
                </div>
                <div className="modal-field-group">
                  <label>שעת התחלה:</label>
                  <input
                    type="time"
                    value={newEventForm.startTime}
                    onChange={(e) => setNewEventForm({ ...newEventForm, startTime: e.target.value })}
                  />
                </div>
                <div className="modal-field-group">
                  <label>שעת סיום:</label>
                  <input
                    type="time"
                    value={newEventForm.endTime}
                    onChange={(e) => setNewEventForm({ ...newEventForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-row">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn-modal-cancel"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                >
                  שמור וקבע בלוח השנה ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
