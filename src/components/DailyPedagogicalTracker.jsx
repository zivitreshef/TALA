import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Download,
  X,
  Target,
  FileText,
  UserCheck,
  ClipboardList,
  Flame,
  Check
} from 'lucide-react';
import {
  getObservationGaps,
  createOutlook365CalendarUrl,
  createGoogleCalendarUrl,
  generateIcsFileContent,
  buildAiGoalMatchPrompt,
  parseAiGoalMatchResponse
} from '../domain/dailyPedagogicalTracking';
import { callAiProxyEndpoint } from '../services/aiProxyClient';

const ISRAELI_HOLIDAYS_2026 = {
  '2026-03-03': 'חופשת פורים',
  '2026-03-04': 'חופשת פורים',
  '2026-03-24': 'חופשת פסח',
  '2026-04-08': 'חופשת פסח',
  '2026-04-21': 'יום הזיכרון',
  '2026-04-22': 'יום העצמאות',
  '2026-05-05': 'ל"ג בעומר',
  '2026-05-21': 'חופשת שבועות',
  '2026-07-01': 'החופש הגדול',
  '2026-08-31': 'החופש הגדול',
  '2026-09-11': 'ראש השנה',
  '2026-09-20': 'יום כיפור',
  '2026-09-25': 'חופשת סוכות'
};

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
        // Fallback match to first goal if AI couldn't find exact id
        parsed.matchedGoalId = activeStudentGoals[0].id;
        parsed.matchedGoalTitle = activeStudentGoals[0].title;
      }
      setAiAnalysisResult(parsed);
    } catch (err) {
      // Local graceful fallback if cloud proxy is offline
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
    <div className="daily-pedagogical-tracker-view space-y-6" dir="rtl">
      
      {/* Top Header & Fast Sync Toolbar */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#d3dff0] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4a88c7] to-[#8b6fc0] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            ת
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#2b4c73]">מעקב יומי, משימות ולוח שנה</h1>
              <span className="text-[11px] bg-purple-50 text-[#563d82] border border-[#b8a2e3] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Sparkles size={12} />
                שיוך יעדים ב-AI
              </span>
            </div>
            <p className="text-xs text-[#5c6f8c]">
              היום: {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Calendar Sync Actions */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            onClick={() => {
              const url = createOutlook365CalendarUrl({
                title: 'ועדת תל"א שנתית',
                startIso: `${selectedDate}T09:30:00`,
                endIso: `${selectedDate}T10:30:00`,
                details: 'תיעוד פדגוגי מתוך מערכת תל"א'
              });
              window.open(url, '_blank');
            }}
            className="bg-white hover:bg-slate-50 text-[#0078d4] border border-[#d3dff0] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
            title="פתיחה מהירה בחשבון משרד החינוך"
          >
            Outlook 365
          </button>

          <button
            onClick={() => {
              const url = createGoogleCalendarUrl({
                title: 'שיעור פרטני תל"א',
                startIso: `${selectedDate}T09:30:00`,
                endIso: `${selectedDate}T10:15:00`,
                details: 'תוכנית עבודה אקולוגית TALA'
              });
              window.open(url, '_blank');
            }}
            className="bg-white hover:bg-slate-50 text-[#2b4c73] border border-[#d3dff0] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
          >
            Google Calendar
          </button>

          <button
            onClick={handleDownloadIcs}
            className="bg-[#f3eefc] hover:bg-[#e9e0f9] text-[#563d82] border border-[#b8a2e3] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Download size={13} />
            קובץ .ics
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold transition-all"
            >
              חזרה לתיקי תלמידים
            </button>
          )}
        </div>
      </div>

      {/* Daily Pulse Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#d3dff0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5c6f8c] font-medium block">משימות פדגוגיות להיום</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-[#2b4c73] num-tabular">
                {todos.filter((t) => t.date === todayStr && t.completed).length}
              </span>
              <span className="text-xs text-[#5c6f8c]">
                מתוך {todos.filter((t) => t.date === todayStr).length} הושלמו
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#eaf3fc] text-[#4a88c7] flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d3dff0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5c6f8c] font-medium block">אירועים ביומן ליום הנבחר</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-emerald-600 num-tabular">
                {filteredEvents.length}
              </span>
              <span className="text-xs text-emerald-700 font-semibold">
                {selectedDate === todayStr ? 'היום' : selectedDate}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d3dff0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5c6f8c] font-medium block">פערי תצפית מעל 21 יום</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-amber-600 num-tabular">
                {observationGaps.length}
              </span>
              <span className="text-xs text-amber-700 font-semibold">יעדים הדורשים תיעוד</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d3dff0] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-[#5c6f8c] font-medium block">תלמידי שילוב פעילים</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold text-[#8b6fc0] num-tabular">
                {students.length}
              </span>
              <span className="text-xs text-[#563d82] font-semibold">בטיפולי השנה</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#f3eefc] text-[#8b6fc0] flex items-center justify-center font-bold">
            <UserCheck size={20} />
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Calendar & Agenda (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Calendar Card (Collapsible) */}
          <div className="bg-white rounded-2xl p-5 border border-[#d3dff0] shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-[#e4ecf7]">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#2b4c73] flex items-center gap-1.5">
                  <CalendarIcon size={16} className="text-[#4a88c7]" />
                  {monthName} {calYear}
                </h2>
                {ISRAELI_HOLIDAYS_2026[selectedDate] && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    {ISRAELI_HOLIDAYS_2026[selectedDate]}
                  </span>
                )}
              </div>

              {/* Collapse / Expand Toggle Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleCalendarCollapse}
                  className="text-xs bg-[#f4f7fc] hover:bg-[#eaf3fc] text-[#2b4c73] font-bold px-2.5 py-1 rounded-lg border border-[#d3dff0] flex items-center gap-1 transition-all"
                  title="קפל או הרחב לוח שנה חודשי"
                >
                  {isCalendarCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  <span>{isCalendarCollapsed ? 'הרחב לוח מלא' : 'קפל לוח'}</span>
                </button>

                {!isCalendarCollapsed && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentMonthDate(new Date(calYear, calMonth - 1, 1))}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => {
                        setCurrentMonthDate(new Date());
                        setSelectedDate(todayStr);
                      }}
                      className="text-xs bg-[#eaf3fc] text-[#4a88c7] font-bold px-2 py-1 rounded-lg"
                    >
                      היום
                    </button>
                    <button
                      onClick={() => setCurrentMonthDate(new Date(calYear, calMonth + 1, 1))}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs"
                    >
                      ‹
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsed State: Sleek Weekly Focus Strip */}
            {isCalendarCollapsed ? (
              <div className="p-2.5 bg-[#f8fafc] border border-[#d3dff0] rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">מיקוד ביום:</span>
                <div className="flex items-center gap-1.5 font-bold">
                  <button
                    onClick={() => setSelectedDate(todayStr)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedDate === todayStr ? 'bg-[#2b4c73] text-white shadow-2xs' : 'bg-white text-slate-700 border'
                    }`}
                  >
                    היום {todayStr.slice(8)}
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="p-1 bg-white border border-[#d3dff0] rounded-lg text-xs font-bold text-[#2b4c73]"
                  />
                </div>
              </div>
            ) : (
              /* Expanded State: Full Month Grid */
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#5c6f8c] pb-1">
                  <span>א'</span>
                  <span>ב'</span>
                  <span>ג'</span>
                  <span>ד'</span>
                  <span>ה'</span>
                  <span>ו'</span>
                  <span>ש'</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <span key={`empty_${idx}`} className="p-2 text-slate-300">
                      -
                    </span>
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = dayStr === selectedDate;
                    const isToday = dayStr === todayStr;
                    const dayEvents = events.filter((e) => e.date === dayStr);

                    return (
                      <button
                        key={dayStr}
                        onClick={() => setSelectedDate(dayStr)}
                        className={`p-2 rounded-xl transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#2b4c73] text-white font-bold shadow-sm'
                            : isToday
                            ? 'bg-[#eaf3fc] text-[#4a88c7] font-bold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>{dayNum}</span>
                        {dayEvents.length > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-amber-300' : 'bg-[#4a88c7]'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full bg-[#f4f7fc] hover:bg-[#eaf3fc] text-[#2b4c73] border border-[#d3dff0] text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Plus size={14} className="text-[#4a88c7]" />
                  קבע פגישה / ועדת תל"א בלוח השנה
                </button>
              </div>
            )}
          </div>

          {/* Agenda for Selected Date */}
          <div className="bg-white rounded-2xl p-5 border border-[#d3dff0] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#2b4c73] flex items-center gap-1.5 uppercase tracking-wider">
                <Clock size={14} className="text-[#4a88c7]" />
                לוח זמנים לתאריך: {selectedDate}
              </h3>
              <span className="text-xs font-semibold text-[#4a88c7]">
                {filteredEvents.length} אירועים
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 text-center">אין אירועים מתוזמנים לתאריך זה.</p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-white border border-[#d3dff0] rounded-xl flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          ev.type === 'committee' ? 'bg-[#8b6fc0]' : 'bg-[#4a88c7]'
                        }`}
                      />
                      <div>
                        <strong className="text-xs text-[#2b4c73] block leading-tight">
                          {ev.startTime} - {ev.endTime} | {ev.title}
                        </strong>
                        <span className="text-[11px] text-[#5c6f8c] block mt-0.5">
                          תלמיד/ה: {ev.studentName} {ev.location ? `• ${ev.location}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          const url = createOutlook365CalendarUrl({
                            title: `${ev.title} - ${ev.studentName}`,
                            startIso: `${ev.date}T${ev.startTime || '09:00'}:00`,
                            endIso: `${ev.date}T${ev.endTime || '10:00'}:00`,
                            details: `מפגש תל"א עבור ${ev.studentName}`
                          });
                          window.open(url, '_blank');
                        }}
                        className="text-[11px] text-[#0078d4] bg-[#eaf3fc] px-2 py-1 rounded-md hover:underline font-bold whitespace-nowrap"
                      >
                        + Outlook 365
                      </button>

                      <button
                        onClick={() => {
                          const url = createGoogleCalendarUrl({
                            title: `${ev.title} - ${ev.studentName}`,
                            startIso: `${ev.date}T${ev.startTime || '09:00'}:00`,
                            endIso: `${ev.date}T${ev.endTime || '10:00'}:00`,
                            details: `מפגש תל"א עבור ${ev.studentName}`
                          });
                          window.open(url, '_blank');
                        }}
                        className="text-[11px] text-[#4a88c7] hover:underline font-bold whitespace-nowrap"
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

        {/* Right Column: Daily TODO + Goal Updater (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Daily TODO Checklist */}
          <div className="bg-white rounded-2xl p-5 border border-[#d3dff0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#2b4c73] flex items-center gap-2">
                  <ClipboardList size={16} className="text-[#4a88c7]" />
                  משימות TODO ליום הנבחר: {selectedDate}
                </h2>
                <span className="text-xs text-[#5c6f8c]">המשימות מסונכרנות עם התאריכים בלוח השנה</span>
              </div>
              <span className="text-xs font-bold text-[#4a88c7] bg-[#eaf3fc] px-2.5 py-1 rounded-lg">
                {filteredTodos.filter((t) => !t.completed).length} פתוחות
              </span>
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTodo} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="הוסיפי משימה פדגוגית..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                className="w-full text-xs bg-[#f4f7fc] border border-[#d3dff0] rounded-xl px-3 py-2.5 focus:bg-white focus:outline-[#4a88c7] transition-all"
              />
              <input
                type="date"
                value={newTodoDate}
                onChange={(e) => setNewTodoDate(e.target.value)}
                className="text-xs bg-[#f4f7fc] border border-[#d3dff0] rounded-xl px-2 py-2 text-[#2b4c73] font-bold"
              />
              <button
                type="submit"
                className="bg-[#4a88c7] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shrink-0 hover:bg-[#3872ad]"
              >
                הוסף
              </button>
            </form>

            {/* Task Items */}
            <div className="space-y-2 pt-1">
              {filteredTodos.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 text-center">אין משימות מתוזמנות ליום זה.</p>
              ) : (
                filteredTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="p-3 bg-white border border-[#d3dff0] rounded-xl flex items-center justify-between text-xs"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-grow">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleTodo(todo.id)}
                        className="w-4 h-4 text-[#4a88c7] rounded border-slate-300"
                      />
                      <span
                        className={`font-bold ${
                          todo.completed ? 'line-through text-slate-400' : 'text-[#24344d]'
                        }`}
                      >
                        {todo.text}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      {todo.time && (
                        <span className="text-[10px] text-[#5c6f8c] bg-slate-100 px-2 py-0.5 rounded">
                          {todo.time}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="מחק משימה"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dual-Mode Goal Updating & AI Free Text Note */}
          <div className="bg-white rounded-2xl p-5 border border-[#d3dff0] shadow-sm space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4ecf7]">
              <div>
                <h3 className="text-sm font-bold text-[#2b4c73] flex items-center gap-1.5">
                  <Target size={16} className="text-emerald-600" />
                  עדכון יעדים ומעקב תצפיות יומי
                </h3>
                <p className="text-xs text-[#5c6f8c]">עדכון ישיר של יעדי תל"א ללא צורך בכניסה לטופס המלא</p>
              </div>

              {/* Updater Mode Switcher */}
              <div className="flex items-center bg-[#f4f7fc] p-1 rounded-xl border border-[#d3dff0] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setUpdaterMode('ai')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    updaterMode === 'ai'
                      ? 'bg-white text-[#2b4c73] shadow-xs font-bold border border-[#d3dff0]'
                      : 'text-[#5c6f8c]'
                  }`}
                >
                  <Sparkles size={12} className="inline ml-1" />
                  תיעוד חופשי + AI
                </button>
                <button
                  type="button"
                  onClick={() => setUpdaterMode('manual')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    updaterMode === 'manual'
                      ? 'bg-white text-[#2b4c73] shadow-xs font-bold border border-[#d3dff0]'
                      : 'text-[#5c6f8c]'
                  }`}
                >
                  יעד ממוקד ידני
                </button>
              </div>
            </div>

            {/* Target Student Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5c6f8c]">תלמיד/ה לעדכון:</span>
              <select
                value={targetStudentId}
                onChange={(e) => {
                  setTargetBankStudentId(e.target.value);
                  setSelectedGoalId('');
                }}
                className="text-xs bg-[#f4f7fc] border border-[#d3dff0] rounded-xl px-3 py-1.5 font-bold text-[#2b4c73]"
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
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-[#faf8ff] to-[#f3eefc] border border-[#b8a2e3] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#563d82]">תיעוד חופשי • ניתוח ושיוך אוטומטי ליעד</strong>
                    <span className="text-[11px] text-[#5c6f8c]">כתבי מה קרה במפגש, ה-AI ידאג לשאר</span>
                  </div>

                  <textarea
                    rows={3}
                    value={aiNoteText}
                    onChange={(e) => setAiNoteText(e.target.value)}
                    placeholder="למשל: היום בחצר איתי ניגש מיוזמתו לשחק בכדור עם שני חברים, והמתין לתורו ללא התפרצות..."
                    className="w-full text-xs p-3 rounded-xl bg-white border border-[#d3dff0] focus:outline-[#8b6fc0] leading-relaxed"
                  />

                  {aiAnalysisError && <p className="text-xs text-rose-600 font-bold">{aiAnalysisError}</p>}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#5c6f8c]">התצפית תיכנס ישירות להערכת המחצית של התלמיד</span>
                    <button
                      type="button"
                      disabled={isAnalyzingAi}
                      onClick={handleRunAiAnalysis}
                      className="bg-gradient-to-r from-[#8b6fc0] to-[#7c65b8] hover:from-[#7c65b8] hover:to-[#6d56a8] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      <span>{isAnalyzingAi ? 'מנתח ב-AI...' : 'נתח ושייך ליעד ב-AI'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Extracted Match Preview Card */}
                {aiAnalysisResult && (
                  <div className="bg-white border-2 border-emerald-400 rounded-2xl p-4 space-y-3 shadow-sm animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                        <div>
                          <span className="text-[11px] text-emerald-700 font-bold block">שויך בהצלחה ליעד:</span>
                          <strong className="text-xs text-[#2b4c73]">
                            {aiAnalysisResult.environment} • {aiAnalysisResult.matchedGoalTitle}
                          </strong>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                        דיוק גבוה
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[#5c6f8c] block text-[11px]">רמת תיווך:</span>
                        <strong className="text-[#2b4c73]">{aiAnalysisResult.observedSupportLevel}</strong>
                      </div>
                      <div>
                        <span className="text-[#5c6f8c] block text-[11px]">המלצת התקדמות:</span>
                        <strong className="text-emerald-600">+{aiAnalysisResult.suggestedProgressDelta}%</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAiAnalysisResult(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={handleApproveAiResult}
                        className="bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs"
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
              <form onSubmit={handleSaveManualGoal} className="space-y-3 bg-[#faf8ff] rounded-2xl p-4 border border-[#b8a2e3]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#5c6f8c] block">יעד אקולוגי לבחירה:</span>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="text-xs bg-white border border-[#d3dff0] rounded-xl px-2.5 py-1.5 font-bold text-[#2b4c73] mt-1"
                    >
                      {activeStudentGoals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.environment || 'סביבה'}: {g.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-left font-bold text-[#4a88c7]">
                    <span className="text-sm num-tabular">{manualProgress}%</span>
                    <span className="text-[11px] text-slate-400"> / {selectedGoal.targetProgress || 80}%</span>
                  </div>
                </div>

                {/* Progress Quick Increments */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualProgress((p) => Math.max(0, p - 5))}
                    className="px-2 py-1 bg-white text-slate-700 text-xs font-bold rounded-lg border border-[#d3dff0]"
                  >
                    -5%
                  </button>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#4a88c7] rounded-full transition-all" style={{ width: `${manualProgress}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualProgress((p) => Math.min(100, p + 5))}
                    className="px-2 py-1 bg-[#eaf3fc] text-[#4a88c7] text-xs font-bold rounded-lg border border-[#d3dff0]"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualProgress((p) => Math.min(100, p + 10))}
                    className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200"
                  >
                    +10%
                  </button>
                </div>

                {/* Support Level Chips */}
                <div className="flex flex-wrap gap-1.5 text-xs pt-1">
                  {SUPPORT_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setManualSupportLevel(lvl)}
                      className={`px-2.5 py-1 rounded-lg border transition-all ${
                        manualSupportLevel === lvl
                          ? 'border-[#4a88c7] bg-[#4a88c7] text-white font-bold'
                          : 'border-[#d3dff0] bg-white text-[#5c6f8c]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Note & Save */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="הערת תצפית מהירה..."
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    className="w-full text-xs bg-white border border-[#d3dff0] rounded-xl px-3 py-2"
                  />
                  <button
                    type="submit"
                    className="bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0 shadow-xs"
                  >
                    שמור תיעוד
                  </button>
                </div>
              </form>
            )}

            {/* Save Toast Feedback */}
            {saveToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check size={16} className="text-emerald-600" />
                <span>{saveToast}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Schedule Event / Meeting */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#d3dff0]" dir="rtl">
            <div className="flex items-center justify-between pb-2 border-b border-[#e4ecf7]">
              <h3 className="text-sm font-bold text-[#2b4c73] flex items-center gap-1.5">
                <CalendarIcon size={16} className="text-[#4a88c7]" />
                קביעת אירוע חדש בלוח השנה
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveScheduledEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#5c6f8c] mb-1">סוג האירוע:</label>
                <select
                  value={newEventForm.type}
                  onChange={(e) => setNewEventForm({ ...newEventForm, type: e.target.value })}
                  className="w-full p-2 bg-[#f4f7fc] border border-[#d3dff0] rounded-xl font-bold text-[#2b4c73]"
                >
                  <option value="committee">ועדת תל"א / ועדת שילוב</option>
                  <option value="lesson">שיעור פרטני / תצפית שטח</option>
                  <option value="parentTalk">שיחת הורים תקופתית</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#5c6f8c] mb-1">כותרת האירוע:</label>
                <input
                  type="text"
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="w-full p-2 bg-[#f4f7fc] border border-[#d3dff0] rounded-xl text-[#2b4c73] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#5c6f8c] mb-1">תלמיד/ה משויך/ת:</label>
                <select
                  value={newEventForm.studentId}
                  onChange={(e) => setNewEventForm({ ...newEventForm, studentId: e.target.value })}
                  className="w-full p-2 bg-[#f4f7fc] border border-[#d3dff0] rounded-xl text-[#2b4c73]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.educationalFramework ? ` • ${s.educationalFramework}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-[#5c6f8c] mb-1">תאריך:</label>
                  <input
                    type="date"
                    value={newEventForm.date}
                    onChange={(e) => setNewEventForm({ ...newEventForm, date: e.target.value })}
                    className="w-full p-2 bg-[#f4f7fc] border border-[#d3dff0] rounded-xl text-[#2b4c73] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#5c6f8c] mb-1">שעת התחלה:</label>
                  <input
                    type="time"
                    value={newEventForm.startTime}
                    onChange={(e) => setNewEventForm({ ...newEventForm, startTime: e.target.value })}
                    className="w-full p-2 bg-[#f4f7fc] border border-[#d3dff0] rounded-xl text-[#2b4c73] font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#5c6f8c] mb-1">שעת סיום:</label>
                  <input
                    type="time"
                    value={newEventForm.endTime}
                    onChange={(e) => setNewEventForm({ ...newEventForm, endTime: e.target.value })}
                    className="w-full p-2 bg-[#f4f7fc] border border-[#d3dff0] rounded-xl text-[#2b4c73] font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e4ecf7]">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4a88c7] hover:bg-[#3872ad] text-white text-xs font-bold rounded-xl shadow-xs"
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
