import React, { useState, useEffect, useMemo } from 'react';
import { useModalAnimation } from '../hooks/useModalAnimation';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Download,
  X,
  Target,
  UserCheck,
  ClipboardList,
  Check,
  ExternalLink
} from 'lucide-react';
import {
  getObservationGaps,
  createOutlook365CalendarUrl,
  createGoogleCalendarUrl,
  generateIcsFileContent,
  buildAiGoalMatchPrompt,
  parseAiGoalMultiMatchResponse,
  getIsraeliHolidayInfo,
  calculateDurationMinutes,
  getEventBarThickness
} from '../domain/dailyPedagogicalTracking';
import { callAiProxyEndpoint } from '../services/aiProxyClient';
import { maskPromptForAi } from '../goalBankData';
import { usageTelemetryService } from '../services/usageTelemetryService';
import { TELEMETRY_EVENTS } from '../domain/telemetryTaxonomy';
import HebrewDatePicker from './HebrewDatePicker';
import PedagogicalTasksModal from './modals/PedagogicalTasksModal';
import VoiceObservationRecorder from './voice/VoiceObservationRecorder';
import { saveAudioRecordBlob, uploadAudioRecordToCloud } from '../services/dossierFileStorage';
import { transcribeAudioWithGemini } from '../services/audioTranscriptionService';
import './DailyPedagogicalTracker.css';

/**
 * Calculates the current consecutive tracking streak (in days) based on
 * logged observation dates across all active students.
 */
export function calculateCurrentStreak(students: any[], todayStr = new Date().toISOString().slice(0, 10)) {
  const datesSet = new Set();
  (students || []).forEach((st: any) => {
    (st.goals || []).forEach((g: any) => {
      (g.observations || []).forEach((obs: any) => {
        if (obs.date) datesSet.add(obs.date.slice(0, 10));
        else if (obs.timestamp) datesSet.add(obs.timestamp.slice(0, 10));
      });
    });
  });
  if (datesSet.size === 0) {
    return 0;
  }

  let streak = 0;
  const checkDate = new Date(todayStr);
  const todayLogged = datesSet.has(todayStr);

  if (!todayLogged) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (datesSet.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const TIME_SLOTS = [
  '07:30', '08:00', '08:15', '08:30', '08:45',
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00'
];

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  const total = (h * 60 + m + minutesToAdd) % (24 * 60);
  const newH = String(Math.floor(total / 60)).padStart(2, '0');
  const newM = String(total % 60).padStart(2, '0');
  return `${newH}:${newM}`;
}

const DEFAULT_EVENT_TYPES = [
  { name: 'שיעור פרטני', color: '#2563eb' },
  { name: 'שיחת הורים', color: '#059669' },
  { name: 'פגישת צוות', color: '#8b5cf6' },
  { name: 'תצפית שטח', color: '#d97706' },
  { name: 'ישיבת שילוב', color: '#0891b2' },
  { name: 'טיפול פרא-רפואי', color: '#e11d48' }
];

const PRESET_EVENT_COLORS = [
  { hex: '#2563eb', label: 'כחול ספיר' },
  { hex: '#059669', label: 'ירוק אמרלד' },
  { hex: '#8b5cf6', label: 'סגול לילך' },
  { hex: '#d97706', label: 'ענבר חם' },
  { hex: '#e11d48', label: 'קורל חי' },
  { hex: '#0891b2', label: 'טורקיז עמוק' },
  { hex: '#4f46e5', label: 'אינדיגו' }
];

const SUPPORT_LEVELS = [
  'עצמאי לחלוטין',
  'תזכורת מילולית',
  'תיווך חלקי',
  'הדגמה וליווי מלא'
];

export interface DailyPedagogicalTrackerProps {
  students?: any[];
  currentUser?: any;
  onUpdateStudent?: (student: any) => void;
  onSelectStudent?: (student: any) => void;
  onClose?: () => void;
  activeOnboardingStep?: number;
}

export default function DailyPedagogicalTracker({
  students = [],
  currentUser = {},
  onUpdateStudent,
  onSelectStudent: _onSelectStudent,
  onClose,
  activeOnboardingStep = 0
}: DailyPedagogicalTrackerProps) {
  void _onSelectStudent;
  const teacherEmail = (currentUser?.email || 'teacher').toLowerCase();
  const STORAGE_TODOS_KEY = `tala_daily_todos_${teacherEmail}`;
  const STORAGE_EVENTS_KEY = `tala_daily_events_${teacherEmail}`;
  const STORAGE_COLLAPSE_KEY = `tala_cal_collapsed_${teacherEmail}`;
  const STORAGE_EVENT_TYPES_KEY = `tala_custom_event_types_${teacherEmail}`;

  const [eventTypes, setEventTypes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EVENT_TYPES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_EVENT_TYPES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EVENT_TYPES_KEY, JSON.stringify(eventTypes));
    } catch {}
  }, [eventTypes, STORAGE_EVENT_TYPES_KEY]);

  // Current Active Date State (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [openSyncMenuId, setOpenSyncMenuId] = useState(null);

  // Calendar Collapsible State
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCalendarCollapse = () => {
    setIsCalendarCollapsed((prev: any) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Calendar Month Navigation
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  const [targetStudentId, setTargetBankStudentId] = useState(() => students[0]?.id || '');
  const targetStudent = useMemo(() => {
    return students.find((s: any) => s.id === targetStudentId) || students[0] || null;
  }, [students, targetStudentId]);

  // Tasks (TODO) State - Synced across cloud and local storage
  const [todos, setTodos] = useState(() => {
    const cloudTasks: any[] = [];
    (students || []).forEach((st: any) => {
      const stTasks = Array.isArray(st.pedagogicalTasks)
        ? st.pedagogicalTasks
        : Array.isArray(st.dailyTasks)
        ? st.dailyTasks
        : [];
      stTasks.forEach((t: any) => {
        cloudTasks.push({
          ...t,
          studentId: t.studentId || st.id,
          studentName: t.studentName || st.name
        });
      });
    });

    let localTasks: any[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_TODOS_KEY);
      if (saved) localTasks = JSON.parse(saved);
    } catch {}

    const taskMap = new Map<string, any>();
    cloudTasks.forEach((t) => { if (t && t.id) taskMap.set(t.id, t); });
    localTasks.forEach((t) => {
      if (t && t.id && !taskMap.has(t.id)) taskMap.set(t.id, t);
    });

    if (taskMap.size > 0) {
      return Array.from(taskMap.values());
    }

    return [
      {
        id: 'todo_1',
        text: 'תצפית חצר על איתי לוי - משחק חופשי',
        date: todayStr,
        time: '09:30',
        completed: false,
        studentId: students[0]?.id || null,
        studentName: students[0]?.name || '',
        priority: 'high'
      },
      {
        id: 'todo_2',
        text: 'סנכרון יעדים שפתיים עם רונית - קלינאית תקשורת',
        date: todayStr,
        time: '11:15',
        completed: false,
        studentId: students[1]?.id || null,
        studentName: students[1]?.name || '',
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
  const [newTodoTime, setNewTodoTime] = useState(''); void setNewTodoTime;

  const handleAddTodo = (e: any) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const currentStudent = students.find((s: any) => s.id === targetStudentId) || students[0];
    const newTask = {
      id: `todo_${Date.now()}`,
      text: newTodoText.trim(),
      date: newTodoDate || todayStr,
      time: newTodoTime || '',
      completed: false,
      studentId: currentStudent?.id || null,
      studentName: currentStudent?.name || ''
    };
    setTodos((prev: any) => [newTask, ...prev]);
    setNewTodoText('');

    if (currentStudent && onUpdateStudent) {
      const existing = Array.isArray(currentStudent.pedagogicalTasks)
        ? currentStudent.pedagogicalTasks
        : [];
      onUpdateStudent({
        ...currentStudent,
        pedagogicalTasks: [newTask, ...existing]
      });
    }
  };

  const handleToggleTodo = (id: any) => {
    let toggledTask: any = null;
    const nextTodos = todos.map((t: any) => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        toggledTask = {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined
        };
        return toggledTask;
      }
      return t;
    });
    setTodos(nextTodos);

    if (toggledTask && toggledTask.studentId && onUpdateStudent) {
      const currentStudent = students.find((s: any) => s.id === toggledTask.studentId);
      if (currentStudent) {
        const existing = Array.isArray(currentStudent.pedagogicalTasks)
          ? currentStudent.pedagogicalTasks
          : [];
        const taskExists = existing.some((t: any) => t.id === id);
        const updatedTasks = taskExists
          ? existing.map((t: any) => (t.id === id ? toggledTask : t))
          : [toggledTask, ...existing];
        onUpdateStudent({
          ...currentStudent,
          pedagogicalTasks: updatedTasks
        });
      }
    }
  };

  const handleDeleteTodo = (id: any) => {
    const taskToDelete = todos.find((t: any) => t.id === id);
    setTodos((prev: any) => prev.filter((t: any) => t.id !== id));
    if (taskToDelete && taskToDelete.studentId && onUpdateStudent) {
      const currentStudent = students.find((s: any) => s.id === taskToDelete.studentId);
      if (currentStudent && Array.isArray(currentStudent.pedagogicalTasks)) {
        onUpdateStudent({
          ...currentStudent,
          pedagogicalTasks: currentStudent.pedagogicalTasks.filter((t: any) => t.id !== id)
        });
      }
    }
  };

  const [showAiTasksModal, setShowAiTasksModal] = useState(false);
  const [taskToast, setTaskToast] = useState('');

  const handleAddAiTasks = (tasksToAdd: any[]) => {
    const defaultStudent = students.find((s: any) => s.id === targetStudentId) || students[0];
    const formatted = tasksToAdd.map((t: any, idx: any) => {
      const stId = t.studentId || defaultStudent?.id || null;
      const stObj = students.find((s: any) => s.id === stId);
      return {
        id: `todo_ai_${Date.now()}_${idx}`,
        text: t.text,
        date: t.date || selectedDate,
        time: '',
        completed: false,
        studentId: stId,
        studentName: stObj?.name || t.studentName || defaultStudent?.name || '',
        isAiGenerated: true
      };
    });

    setTodos((prev: any) => [...formatted, ...prev]);
    setTaskToast(`✨ ${tasksToAdd.length} משימות פדגוגיות נוספו בהצלחה לרשימת היום!`);
    setTimeout(() => setTaskToast(''), 4500);

    if (onUpdateStudent) {
      const tasksByStudentId = new Map<string, any[]>();
      formatted.forEach((task: any) => {
        if (task.studentId) {
          const arr = tasksByStudentId.get(task.studentId) || [];
          arr.push(task);
          tasksByStudentId.set(task.studentId, arr);
        }
      });

      tasksByStudentId.forEach((newStudentTasks, stId) => {
        const currentStudent = students.find((s: any) => s.id === stId);
        if (currentStudent) {
          const existing = Array.isArray(currentStudent.pedagogicalTasks)
            ? currentStudent.pedagogicalTasks
            : [];
          onUpdateStudent({
            ...currentStudent,
            pedagogicalTasks: [...newStudentTasks, ...existing]
          });
        }
      });
    }
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
        title: 'פגישת מעקב תקופתית',
        date: '2026-07-30',
        startTime: '13:00',
        endTime: '14:00',
        type: 'פגישת צוות',
        color: '#8b5cf6',
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
  const scheduleModalAnim = useModalAnimation({
    isOpen: showScheduleModal,
    onClose: () => setShowScheduleModal(false)
  });
  const [editingEventId, setEditingEventId] = useState(null);
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    type: DEFAULT_EVENT_TYPES[0].name,
    color: DEFAULT_EVENT_TYPES[0].color,
    date: selectedDate,
    startTime: '10:00',
    endTime: '10:45',
    studentId: students[0]?.id || '',
    location: 'חדר טיפולים / כיתה'
  });

  const handleOpenNewEventModal = () => { void handleOpenNewEventModal;
    setEditingEventId(null);
    setNewEventForm({
      title: '',
      type: eventTypes[0]?.name || 'שיעור פרטני',
      color: eventTypes[0]?.color || '#2563eb',
      date: selectedDate,
      startTime: '10:00',
      endTime: '10:45',
      studentId: students[0]?.id || '',
      location: 'חדר טיפולים / כיתה'
    });
    setShowScheduleModal(true);
  };

  const handleEditEvent = (ev: any) => {
    setEditingEventId(ev.id);
    const matchedSt = students.find((s: any) => s.id === ev.studentId || s.name === ev.studentName);
    setNewEventForm({
      title: ev.title || '',
      type: ev.type || 'שיעור פרטני',
      color: ev.color || '#2563eb',
      date: ev.date || selectedDate,
      startTime: ev.startTime || '10:00',
      endTime: ev.endTime || '10:45',
      studentId: matchedSt?.id || students[0]?.id || '',
      location: ev.location || 'חדר טיפולים / כיתה'
    });
    setShowScheduleModal(true);
  };

  const handleDeleteEvent = (id: any) => {
    setEvents((prev: any) => prev.filter((e: any) => e.id !== id));
    if (editingEventId === id) {
      setShowScheduleModal(false);
      setEditingEventId(null);
    }
  };

  const handleSaveScheduledEvent = (e: any) => {
    e.preventDefault();
    const chosenType = (newEventForm.type || 'פגישה').trim();
    const chosenTitle = (newEventForm.title || chosenType).trim();
    const chosenColor = newEventForm.color || '#2563eb';
    const st = students.find((s: any) => s.id === newEventForm.studentId);

    if (editingEventId) {
      setEvents((prev: any) =>
        prev.map((ev: any) =>
          ev.id === editingEventId
            ? {
                ...ev,
                title: chosenTitle,
                type: chosenType,
                color: chosenColor,
                date: newEventForm.date,
                startTime: newEventForm.startTime,
                endTime: newEventForm.endTime,
                studentName: st?.name || ev.studentName || '',
                studentId: st?.id || ev.studentId || '',
                location: newEventForm.location
              }
            : ev
        )
      );
    } else {
      const ev = {
        id: `ev_${Date.now()}`,
        title: chosenTitle,
        type: chosenType,
        color: chosenColor,
        date: newEventForm.date,
        startTime: newEventForm.startTime,
        endTime: newEventForm.endTime,
        studentName: st?.name || '',
        studentId: st?.id || '',
        location: newEventForm.location
      };
      setEvents((prev: any) => [...prev, ev]);
    }

    // Update teacher's custom event types history
    setEventTypes((prev: any) => {
      const idx = prev.findIndex(
        (t: any) => t.name.trim().toLowerCase() === chosenType.toLowerCase()
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { name: chosenType, color: chosenColor };
        return next;
      }
      return [{ name: chosenType, color: chosenColor }, ...prev];
    });

    setShowScheduleModal(false);
    setEditingEventId(null);
  };

  // Calculate Observation Gaps (>21 days)
  const observationGaps = useMemo(() => {
    return getObservationGaps(students, 21, new Date());
  }, [students]);

  // Dual-Mode Goal Updating State
  const [updaterMode, setUpdaterMode] = useState('ai'); // 'ai' | 'manual'
// targetStudent declared above

  // AI Free-text Note Mode State
  const [aiNoteText, setAiNoteText] = useState('');
  const [pendingVoiceBlob, setPendingVoiceBlob] = useState<Blob | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any[] | null>(null);
  const [selectedMatchGoalIds, setSelectedMatchGoalIds] = useState<Set<string>>(new Set());
  const [aiAnalysisError, setAiAnalysisError] = useState('');
  const [aiNoMatchMessage, setAiNoMatchMessage] = useState('');

  // Manual Mode State
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const activeStudentGoals = useMemo(() => {
    return Array.isArray(targetStudent?.goals) ? targetStudent.goals.filter((g: any) => g.title) : [];
  }, [targetStudent]);

  const selectedGoal = useMemo(() => {
    return activeStudentGoals.find((g: any) => g.id === selectedGoalId) || activeStudentGoals[0] || null;
  }, [activeStudentGoals, selectedGoalId]);

  const [manualProgress, setManualProgress] = useState(60);
  const [manualSupportLevel, setManualSupportLevel] = useState('תיווך חלקי');
  const [manualNote, setManualNote] = useState('');
  const [saveToast, setSaveToast] = useState('');

  // Daily Tracking Telemetry State & Refs
  const entryStartTimeRef = React.useRef<number | null>(null);
  const hasDispatchedStartedRef = React.useRef(false);
  const currentEntryModeRef = React.useRef('text');

  useEffect(() => {
    if (activeStudentGoals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(activeStudentGoals[0].id);
    }
  }, [activeStudentGoals, selectedGoalId]);

  useEffect(() => {
    if (selectedGoal) {
      setManualProgress(selectedGoal.currentProgress ?? 60);
    }
  }, [selectedGoal]);

  const startObservationEntry = (mode = 'text', isEdit = false) => {
    if (!hasDispatchedStartedRef.current) {
      entryStartTimeRef.current = Date.now();
      hasDispatchedStartedRef.current = true;
      currentEntryModeRef.current = mode;
      try {
        usageTelemetryService.track(
          TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_STARTED,
          { mode, isEdit },
          teacherEmail ? { userContext: { email: teacherEmail } } : {}
        );
      } catch (_) {}
    }
  };

  const checkAndDispatchAbandonment = () => {
    if (hasDispatchedStartedRef.current && (aiNoteText.trim() || manualNote.trim())) {
      const timeSpentSec = entryStartTimeRef.current
        ? Math.max(1, Math.round((Date.now() - entryStartTimeRef.current) / 1000))
        : 5;
      const mode = (pendingVoiceBlob || currentEntryModeRef.current === 'voice') ? 'voice' : 'text';
      try {
        usageTelemetryService.track(
          TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_ABANDONED,
          {
            mode,
            timeSpentSec
          },
          teacherEmail ? { userContext: { email: teacherEmail } } : {}
        );
      } catch (_) {}
      entryStartTimeRef.current = null;
      hasDispatchedStartedRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      checkAndDispatchAbandonment();
    };
  }, [aiNoteText, manualNote]);

  // Handle AI Analysis Execution
  const handleRunAiAnalysis = async () => {
    let noteToAnalyze = aiNoteText.trim();

    if (!noteToAnalyze && pendingVoiceBlob) {
      setIsAnalyzingAi(true);
      setAiAnalysisError('');
      setAiNoMatchMessage('');
      try {
        const transcript = await transcribeAudioWithGemini(pendingVoiceBlob);
        if (transcript) {
          noteToAnalyze = transcript;
          setAiNoteText(transcript);
        } else {
          setAiAnalysisError('לא זוהה דיבור ברור בהקלטה. ניתן להקליד תצפית ידנית.');
          setIsAnalyzingAi(false);
          return;
        }
      } catch (_) {
        setAiAnalysisError('שגיאה בתמלול ההקלטה ב-AI. יש לוודא חיבור רשת תקין.');
        setIsAnalyzingAi(false);
        return;
      }
    }

    if (!noteToAnalyze) {
      setAiAnalysisError('נא להקליט או להזין הערת תצפית לפני הניתוח');
      return;
    }
    if (!targetStudent) {
      setAiAnalysisError('לא נבחר תלמיד/ה לניתוח');
      return;
    }
    if (activeStudentGoals.length === 0) {
      setAiAnalysisError('לתלמיד/ה זה אין עדיין יעדים פעילים בתוכנית העבודה');
      return;
    }

    setIsAnalyzingAi(true);
    setAiAnalysisError('');
    setAiNoMatchMessage('');
    setAiAnalysisResults(null);
    setSelectedMatchGoalIds(new Set());

    const prompt = buildAiGoalMatchPrompt({ note: noteToAnalyze, student: targetStudent });
    const maskedPrompt = maskPromptForAi(prompt, targetStudent);

    try {
      const response = await callAiProxyEndpoint({
        operation: 'goalMatch',
        payload: { prompt: maskedPrompt },
        hints: { gender: targetStudent?.gender || 'boy', name: targetStudent?.name, model: 'gemini-2.5-flash' }
      });

      const parsedMatches: any[] = parseAiGoalMultiMatchResponse(response);
      const validMatches = (parsedMatches || []).filter((m) =>
        m.matchedGoalId && activeStudentGoals.some((g: any) => g.id === m.matchedGoalId)
      );

      if (validMatches.length > 0) {
        setAiAnalysisResults(validMatches);
        setSelectedMatchGoalIds(new Set(validMatches.map((m) => m.matchedGoalId)));
      } else {
        setAiNoMatchMessage('לא זוהתה התאמה מובהקת לאף אחד מיעדי התלמיד/ה. ניתן לנסח תצפית ממוקדת יותר או לבצע שיוך ישיר במצב ידני.');
      }
    } catch (err) {
      setAiAnalysisError('שגיאה בניתוח התצפית ב-AI. יש לוודא חיבור רשת תקין ולנסות שוב.');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Commit AI Observations to Student Dossier (Multiple Goals Supported)
  const handleApproveAiResult = () => {
    if (!targetStudent || !aiAnalysisResults || aiAnalysisResults.length === 0) return;

    const matchesToApply = aiAnalysisResults.filter((m) =>
      m.matchedGoalId && selectedMatchGoalIds.has(m.matchedGoalId)
    );

    if (matchesToApply.length === 0) {
      setAiAnalysisError('יש לסמן לפחות יעד אחד לאישור ושמירה');
      return;
    }

    const audioToSave = pendingVoiceBlob;
    const baseTimestamp = Date.now();

    // Map each approved match to its new observation
    const matchObsMap = new Map<string, { obs: any; delta: number }>();
    matchesToApply.forEach((m, idx) => {
      const obsId = `obs_${baseTimestamp}_${idx}`;
      const newObs: any = {
        id: obsId,
        timestamp: new Date().toISOString(),
        date: todayStr,
        authorName: currentUser.name || 'מורה משלבת',
        supportLevel: m.observedSupportLevel || 'תיווך חלקי',
        note: m.conciseObservationNote || aiNoteText,
        source: 'ai_daily_tracker'
      };
      if (audioToSave) {
        newObs.hasAudio = true;
        saveAudioRecordBlob(obsId, audioToSave).catch(() => {});
        if (targetStudent?.id) {
          uploadAudioRecordToCloud(obsId, audioToSave, targetStudent.id)
            .then((cloudRes) => {
              if (cloudRes?.storageUrl) {
                newObs.audioStorageUrl = cloudRes.storageUrl;
              }
            })
            .catch(() => {});
        }
      }
      matchObsMap.set(m.matchedGoalId, { obs: newObs, delta: m.suggestedProgressDelta || 0 });
    });

    if (audioToSave) {
      setPendingVoiceBlob(null);
    }

    const updatedGoals = (targetStudent.goals || []).map((g: any) => {
      const matchData = matchObsMap.get(g.id);
      if (matchData) {
        const currentP = Number(g.currentProgress) || 0;
        const newP = Math.min(100, currentP + matchData.delta);
        const existingObs = Array.isArray(g.observations) ? g.observations : [];
        return {
          ...g,
          currentProgress: newP,
          observations: [matchData.obs, ...existingObs]
        };
      }
      return g;
    });

    const updatedStudent = {
      ...targetStudent,
      goals: updatedGoals
    };

    onUpdateStudent?.(updatedStudent);

    // Dispatch daily tracking completion and streak telemetry
    const durationSec = entryStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - entryStartTimeRef.current) / 1000))
      : 10;
    const streakDays = calculateCurrentStreak(students, todayStr);
    const isVoice = Boolean(audioToSave || currentEntryModeRef.current === 'voice');
    const mode = isVoice ? 'voice' : (currentEntryModeRef.current || 'text');

    try {
      usageTelemetryService.track(
        TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
        {
          mode,
          durationSec,
          isEdit: false,
          streakDays
        },
        teacherEmail ? { userContext: { email: teacherEmail } } : {}
      );

      if (isVoice) {
        usageTelemetryService.track(
          TELEMETRY_EVENTS.VOICE_OBSERVATION_RECORDED,
          {
            durationSec,
            hasTranscript: Boolean(aiNoteText.trim())
          },
          teacherEmail ? { userContext: { email: teacherEmail } } : {}
        );
      }

      usageTelemetryService.track(
        TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED,
        { currentStreakDays: streakDays },
        teacherEmail ? { userContext: { email: teacherEmail } } : {}
      );
    } catch (_) {}

    entryStartTimeRef.current = null;
    hasDispatchedStartedRef.current = false;

    setAiAnalysisResults(null);
    setSelectedMatchGoalIds(new Set());
    setAiNoteText('');
    setAiNoMatchMessage('');
    setSaveToast(
      matchesToApply.length === 1
        ? `התצפית נשמרה בתיק של ${targetStudent.name || 'התלמיד/ה'} ועודכנה בענן!`
        : `נשמרו ${matchesToApply.length} תצפיות מפוצלות ביעדי ${targetStudent.name || 'התלמיד/ה'} ועודכנו בענן!`
    );
    setTimeout(() => setSaveToast(''), 3500);
  };

  // Commit Manual Goal Update
  const handleSaveManualGoal = (e: any) => {
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

    const updatedGoals = (targetStudent.goals || []).map((g: any) => {
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

    // Dispatch daily tracking completion and streak telemetry
    const durationSec = entryStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - entryStartTimeRef.current) / 1000))
      : 10;
    const streakDays = calculateCurrentStreak(students, todayStr);

    try {
      usageTelemetryService.track(
        TELEMETRY_EVENTS.DAILY_TRACKING_ENTRY_COMPLETED,
        {
          mode: 'text',
          durationSec,
          isEdit: false,
          streakDays
        },
        teacherEmail ? { userContext: { email: teacherEmail } } : {}
      );

      usageTelemetryService.track(
        TELEMETRY_EVENTS.DAILY_TRACKING_STREAK_RECORDED,
        { currentStreakDays: streakDays },
        teacherEmail ? { userContext: { email: teacherEmail } } : {}
      );
    } catch (_) {}

    entryStartTimeRef.current = null;
    hasDispatchedStartedRef.current = false;

    setManualNote('');
    setSaveToast(`יעד "${selectedGoal.title}" עודכן ל-${manualProgress}% בהצלחה!`);
    setTimeout(() => setSaveToast(''), 3500);
  };

  // Download Universal .ics Calendar File
  const handleDownloadIcs = () => {
    const calendarEvents = events.map((ev: any) => ({
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
  const filteredTodos = todos.filter((t: any) => t.date === selectedDate);
  const filteredEvents = events.filter((ev: any) => ev.date === selectedDate);

  return (
    <div className="daily-tracker-container" dir="rtl">
      
      {/* Top Header & Fast Sync Toolbar */}
      <div className="tracker-top-header">
        <div className="tracker-header-info">
          <div className="tracker-header-avatar" title="מעקב יומי ויומן פדגוגי">
            <CalendarDays size={22} color="#ffffff" strokeWidth={2.2} />
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
            onClick={handleDownloadIcs}
            className="btn-cal-sync btn-cal-ics"
            title="ייצוא אירועים ליומן חיצוני"
            aria-label="ייצוא אירועים ליומן חיצוני"
          >
            <Download size={13} />
            ייצוא ליומן
          </button>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                checkAndDispatchAbandonment();
                onClose();
              }}
              className="btn-cal-close"
            >
              חזרה לניהול תלמידים
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
                {todos.filter((t: any) => t.date === todayStr && t.completed).length}
              </span>
              <span className="scorecard-sub">
                מתוך {todos.filter((t: any) => t.date === todayStr).length} הושלמו
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 className="tracker-card-header-title">
                  <CalendarIcon size={17} style={{ color: '#4a88c7' }} />
                  <span>{monthName} {calYear}</span>
                </h2>
                {(() => {
                  const info = getIsraeliHolidayInfo(selectedDate);
                  if (!info) return null;
                  return (
                    <span className={`tracker-holiday-badge ${info.isVacation ? 'badge-vacation' : 'badge-observance'}`}>
                      <span>{info.isVacation ? '🏖️' : '🕯️'}</span>
                      <span>{info.name}</span>
                      <span className="badge-status-sub"> • {info.statusText}</span>
                    </span>
                  );
                })()}
              </div>

              {/* Collapse / Expand Toggle Button & Nav */}
              <div className="cal-header-actions-group">
                {!isCalendarCollapsed && (
                  <div className="cal-month-nav" dir="ltr">
                    <button
                      type="button"
                      onClick={() => setCurrentMonthDate(new Date(calYear, calMonth - 1, 1))}
                      className="cal-nav-arrow"
                      title="חודש קודם"
                      aria-label="חודש קודם"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentMonthDate(new Date());
                        setSelectedDate(todayStr);
                      }}
                      className="cal-nav-today"
                      title="עבור להיום"
                    >
                      היום
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentMonthDate(new Date(calYear, calMonth + 1, 1))}
                      className="cal-nav-arrow"
                      title="חודש הבא"
                      aria-label="חודש הבא"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleToggleCalendarCollapse}
                  className="cal-collapse-btn-compact"
                  title={isCalendarCollapsed ? 'הרחב לוח שנה חודשי' : 'קפל לוח שנה למיקוד יומי'}
                  aria-label={isCalendarCollapsed ? 'הרחב לוח שנה חודשי' : 'קפל לוח שנה למיקוד יומי'}
                >
                  {isCalendarCollapsed ? <Plus size={15} /> : <Minus size={15} />}
                </button>
              </div>
            </div>

            {/* Collapsed State: Weekly Focus Strip */}
            {isCalendarCollapsed ? (
              <div className="cal-collapsed-strip">
                <span className="strip-label">מיקוד ביום:</span>
                <div className="strip-actions">
                  <HebrewDatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    showDayNav={true}
                    ariaLabel="בחירת יום למיקוד"
                  />
                </div>
              </div>
            ) : (
              /* Expanded State: Full Month Grid */
              <div className="cal-grid-wrapper" dir="ltr">
                <div className="cal-weekdays-grid">
                  <span dir="rtl">א׳</span>
                  <span dir="rtl">ב׳</span>
                  <span dir="rtl">ג׳</span>
                  <span dir="rtl">ד׳</span>
                  <span dir="rtl">ה׳</span>
                  <span dir="rtl" className="weekday-weekend">ו׳</span>
                  <span dir="rtl" className="weekday-weekend">ש׳</span>
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
                    const dayEvents = events.filter((e: any) => e.date === dayStr);
                    const dayOfWeek = new Date(calYear, calMonth, dayNum).getDay();
                    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                    const holidayInfo = getIsraeliHolidayInfo(dayStr);
                    const isVacation = holidayInfo?.isVacation === true;
                    const isObservance = holidayInfo && !holidayInfo.isVacation;

                    return (
                      <button
                        type="button"
                        key={dayStr}
                        onClick={() => setSelectedDate(dayStr)}
                        className={`cal-day-cell ${isSelected ? 'day-selected' : ''} ${isToday && !isSelected ? 'day-today' : ''} ${isWeekend ? 'day-weekend' : ''} ${isVacation ? 'day-vacation' : ''} ${isObservance ? 'day-observance' : ''}`}
                        title={holidayInfo ? `${dayStr} • ${holidayInfo.name} (${holidayInfo.statusText})` : dayStr}
                      >
                        <div className="cal-day-cell-top">
                          <span className="cal-day-num">{dayNum}</span>
                          {dayEvents.length > 0 && (
                            <span
                              className="cal-day-event-count"
                              style={{
                                backgroundColor: dayEvents[0]?.color || '#2563eb'
                              }}
                              title={`${dayEvents.length} פגישות ביום זה`}
                            >
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Horizontal colored bars crossing date horizontally */}
                        {dayEvents.length > 0 && (
                          <div className="cal-day-event-bars">
                            {dayEvents.slice(0, 4).map((ev: any, i: any) => (
                              <div
                                key={ev.id || i}
                                className="cal-event-horizontal-bar"
                                style={{
                                  backgroundColor: ev.color || '#2563eb',
                                  height: `${getEventBarThickness(ev.startTime, ev.endTime)}px`
                                }}
                                title={`${ev.startTime || ''}-${ev.endTime || ''} | ${ev.title || ev.type}`}
                              />
                            ))}
                            {dayEvents.length > 4 && (
                              <span className="cal-more-events-tag">+${dayEvents.length - 4}</span>
                            )}
                          </div>
                        )}

                        {holidayInfo && (
                          <span
                            className={`cal-day-holiday-tag ${isVacation ? 'tag-vacation' : 'tag-observance'}`}
                            title={`${holidayInfo.name} • ${holidayInfo.statusText}`}
                          >
                            {holidayInfo.shortName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewEventForm((prev: any) => ({
                      ...prev,
                      date: selectedDate,
                      title: '',
                      type: eventTypes[0]?.name || 'שיעור פרטני',
                      color: eventTypes[0]?.color || '#2563eb'
                    }));
                    setShowScheduleModal(true);
                  }}
                  className="btn-open-schedule-modal"
                >
                  <Plus size={15} style={{ color: '#4a88c7' }} />
                  <span>{editingEventId ? 'עריכת אירוע בלוח השנה' : 'קביעת אירוע חדש בלוח השנה'}</span>
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
                {filteredEvents.map((ev: any) => (
                  <div key={ev.id} className="agenda-item">
                    <div className="agenda-item-main">
                      <span
                        className="agenda-type-dot"
                        style={{ backgroundColor: ev.color || '#2563eb' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong className="agenda-item-title">
                            {ev.startTime} - {ev.endTime} | {ev.title}
                          </strong>
                          {ev.type && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor: `${ev.color || '#2563eb'}18`,
                                color: ev.color || '#2563eb',
                                border: `1px solid ${ev.color || '#2563eb'}40`
                              }}
                            >
                              {ev.type}
                            </span>
                          )}
                        </div>
                        <div className="agenda-item-sub">
                          תלמיד/ה: {ev.studentName} {ev.location ? `• ${ev.location}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="agenda-ghost-toolbar">
                      <button
                        type="button"
                        onClick={() => handleEditEvent(ev)}
                        className="btn-agenda-ghost"
                        title="עריכת מפגש"
                        aria-label="עריכת מפגש"
                      >
                        <Pencil size={14} />
                      </button>

                      <div className="agenda-sync-wrapper">
                        <button
                          type="button"
                          onClick={() => setOpenSyncMenuId(openSyncMenuId === ev.id ? null : ev.id)}
                          className={`btn-agenda-ghost ${openSyncMenuId === ev.id ? 'is-active' : ''}`}
                          title="סנכרון ליומן חיצוני"
                          aria-label="סנכרון ליומן חיצוני"
                        >
                          <CalendarPlus size={14} />
                        </button>

                        {openSyncMenuId === ev.id && (
                          <>
                            <div
                              className="agenda-sync-backdrop"
                              onClick={() => setOpenSyncMenuId(null)}
                            />
                            <div className="agenda-sync-popover">
                              <button
                                type="button"
                                className="agenda-sync-popover-item"
                                onClick={() => {
                                  setOpenSyncMenuId(null);
                                  const url = createOutlook365CalendarUrl({
                                    title: `${ev.title} - ${ev.studentName}`,
                                    startIso: `${ev.date}T${ev.startTime || '09:00'}:00`,
                                    endIso: `${ev.date}T${ev.endTime || '10:00'}:00`,
                                    details: `מפגש תל"א עבור ${ev.studentName}`
                                  });
                                  window.open(url, '_blank');
                                }}
                              >
                                <span className="sync-provider-dot outlook-dot" />
                                <span>Outlook 365</span>
                                <ExternalLink size={12} className="sync-external-icon" />
                              </button>

                              <button
                                type="button"
                                className="agenda-sync-popover-item"
                                onClick={() => {
                                  setOpenSyncMenuId(null);
                                  const url = createGoogleCalendarUrl({
                                    title: `${ev.title} - ${ev.studentName}`,
                                    startIso: `${ev.date}T${ev.startTime || '09:00'}:00`,
                                    endIso: `${ev.date}T${ev.endTime || '10:00'}:00`,
                                    details: `מפגש תל"א עבור ${ev.studentName}`
                                  });
                                  window.open(url, '_blank');
                                }}
                              >
                                <span className="sync-provider-dot google-dot" />
                                <span>Google Calendar</span>
                                <ExternalLink size={12} className="sync-external-icon" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="btn-agenda-ghost btn-agenda-ghost-delete"
                        title="מחיקת מפגש"
                        aria-label="מחיקת מפגש"
                      >
                        <Trash2 size={14} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAiTasksModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #4a88c7 0%, #8b6fc0 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(74, 136, 199, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  title="חולל משימות פדגוגיות ממוקדות בעזרת AI לתלמידים שנבחרו"
                >
                  <Sparkles size={14} />
                  <span>מיקוד פדגוגי עם AI</span>
                </button>
                <span className="todo-count-badge">
                  {filteredTodos.filter((t: any) => !t.completed).length} פתוחות
                </span>
              </div>
            </div>

            {/* Task Toast Notification */}
            {taskToast && (
              <div
                style={{
                  margin: '10px 16px',
                  padding: '10px 14px',
                  backgroundColor: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '10px',
                  color: '#065f46',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
                }}
              >
                <Check size={18} style={{ color: '#10b981' }} strokeWidth={2.5} />
                <span>{taskToast}</span>
              </div>
            )}

            {/* Add Task Form */}
            <form onSubmit={handleAddTodo} className="todo-add-form">
              <input
                type="text"
                placeholder="הוסיפי משימה פדגוגית..."
                value={newTodoText}
                onChange={(e: any) => setNewTodoText(e.target.value)}
                className="todo-input-text"
              />
              <HebrewDatePicker
                value={newTodoDate}
                onChange={setNewTodoDate}
                compact={true}
                ariaLabel="בחירת תאריך למשימה"
              />
              <button type="submit" className="btn-todo-add">
                הוסף
              </button>
            </form>

            {/* Task Items */}
            <div className="todo-list-items">
              {filteredTodos.length === 0 ? (
                <div className="agenda-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px' }}>
                  <span>אין משימות מתוזמנות ליום זה.</span>
                  <button
                    type="button"
                    onClick={() => setShowAiTasksModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      background: '#f1f7fc',
                      color: '#2b4c73',
                      border: '1.5px dashed #4a88c7',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={14} color="#4a88c7" />
                    <span>חולל משימות AI לתלמידים להיום</span>
                  </button>
                </div>
              ) : (
                filteredTodos.map((todo: any) => (
                  <div key={todo.id} className="todo-row">
                    <label className="todo-label-group">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleTodo(todo.id)}
                        className="todo-checkbox"
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                          {todo.text}
                        </span>
                        {todo.studentName && (
                          <span style={{ fontSize: '11px', color: '#1e3a5f', fontWeight: '700', marginTop: '2px' }}>
                            👤 {todo.studentName}
                          </span>
                        )}
                        {todo.isAiGenerated && (
                          <span style={{ fontSize: '10.5px', color: '#8b6fc0', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <Sparkles size={10} />
                            <span>מיקוד פדגוגי AI</span>
                          </span>
                        )}
                      </div>
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
          <div className="tracker-card" style={{ position: 'relative' }}>
            {activeOnboardingStep === 5 && (
              <div className="onboarding-tour-arrow-box" style={{ top: '-18px', right: '16px' }}>
                <span className="tour-arrow-anim">👇</span>
                <span>שלב 5: כאן מתעדים תצפית שטח יומית ב-10 שניות או מעדכנים רמת תיווך ביעד!</span>
              </div>
            )}
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
                onChange={(e: any) => {
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
                  <div className="ai-note-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong className="ai-note-title">תיעוד חופשי • ניתוח ושיוך אוטומטי ליעד</strong>
                      <span className="ai-note-sub" style={{ display: 'block' }}>הקליטי או כתבי מה קרה במפגש, ה-AI ידאג לשאר</span>
                    </div>
                    <VoiceObservationRecorder
                      disabled={isAnalyzingAi}
                      baseText={aiNoteText}
                      onRecordingStart={() => {
                        currentEntryModeRef.current = 'voice';
                        startObservationEntry('voice', false);
                      }}
                      onTranscript={(fullText) => {
                        currentEntryModeRef.current = 'voice';
                        startObservationEntry('voice', false);
                        setAiNoteText(fullText);
                      }}
                      onAudioReady={(blob) => {
                        currentEntryModeRef.current = 'voice';
                        setPendingVoiceBlob(blob);
                      }}
                      onClearAudio={() => setPendingVoiceBlob(null)}
                    />
                  </div>

                  <textarea
                    rows={3}
                    value={aiNoteText}
                    onFocus={() => startObservationEntry('text', false)}
                    onChange={(e: any) => {
                      startObservationEntry('text', false);
                      setAiNoteText(e.target.value);
                    }}
                    placeholder="למשל: היום בחצר איתי ניגש מיוזמתו לשחק בכדור עם שני חברים, והמתין לתורו ללא התפרצות..."
                    className={`ai-note-textarea ${activeOnboardingStep === 5 ? 'tour-highlight-input' : ''}`}
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
                      aria-busy={isAnalyzingAi}
                      onClick={handleRunAiAnalysis}
                      className={`btn-ai-analyze ${activeOnboardingStep === 5 ? 'tour-highlight-btn' : ''}`}
                    >
                      {isAnalyzingAi ? <Loader2 size={14} className="tala-spin-icon" /> : <Sparkles size={14} />}
                      <span>{isAnalyzingAi ? 'מנתח ב-AI...' : 'נתח ושייך ליעד ב-AI'}</span>
                    </button>
                  </div>
                </div>

                {/* No Match Info Notice */}
                {aiNoMatchMessage && (
                  <div className="ai-no-match-card">
                    <div className="ai-no-match-header">
                      <span className="ai-no-match-icon">ℹ️</span>
                      <div>
                        <strong className="ai-no-match-title">לא זוהתה התאמה מובהקת ליעדים</strong>
                        <p className="ai-no-match-desc">{aiNoMatchMessage}</p>
                      </div>
                    </div>
                    <div className="ai-no-match-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setAiNoMatchMessage('');
                          setUpdaterMode('manual');
                        }}
                        className="btn-switch-manual"
                      >
                        מעבר לעדכון יעד ממוקד ידני
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Extracted Matches Preview (Multiple Goals Supported) */}
                {aiAnalysisResults && aiAnalysisResults.length > 0 && (
                  <div className="ai-match-card">
                    <div className="ai-match-header">
                      <div className="ai-match-success-badge">
                        <span className="match-check-icon">✓</span>
                        <div>
                          <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, display: 'block' }}>
                            {aiAnalysisResults.length === 1
                              ? 'שויך בהצלחה ליעד:'
                              : `זוהו ${aiAnalysisResults.length} יעדים רלוונטיים לתצפית זו:`}
                          </span>
                          <strong className="match-title">
                            {aiAnalysisResults.length === 1
                              ? `${aiAnalysisResults[0].environment} • ${aiAnalysisResults[0].matchedGoalTitle}`
                              : 'התצפית פוצלה והותאמה לכל יעד בנפרד'}
                          </strong>
                        </div>
                      </div>
                      <span className="match-confidence-badge">דיוק גבוה</span>
                    </div>

                    {/* Matches List */}
                    <div className="ai-matches-list">
                      {aiAnalysisResults.map((match, idx) => {
                        const isSelected = selectedMatchGoalIds.has(match.matchedGoalId);
                        return (
                          <div
                            key={match.matchedGoalId || idx}
                            className={`ai-match-item-card ${isSelected ? 'selected' : 'unselected'}`}
                          >
                            <div className="ai-match-item-top">
                              <label className="ai-match-item-label">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const next = new Set(selectedMatchGoalIds);
                                    if (next.has(match.matchedGoalId)) {
                                      next.delete(match.matchedGoalId);
                                    } else {
                                      next.add(match.matchedGoalId);
                                    }
                                    setSelectedMatchGoalIds(next);
                                  }}
                                  className="match-item-checkbox"
                                />
                                <span className="match-item-goal-title">
                                  {match.environment ? `${match.environment} • ` : ''}{match.matchedGoalTitle}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = aiAnalysisResults.filter((m) => m.matchedGoalId !== match.matchedGoalId);
                                  setAiAnalysisResults(filtered.length > 0 ? filtered : null);
                                  const next = new Set(selectedMatchGoalIds);
                                  next.delete(match.matchedGoalId);
                                  setSelectedMatchGoalIds(next);
                                }}
                                className="btn-match-item-remove"
                                title="הסר יעד זה"
                              >
                                <X size={13} />
                              </button>
                            </div>

                            {/* Extracted Goal-Specific Observation */}
                            {match.conciseObservationNote && (
                              <div className="ai-match-item-note">
                                <span className="match-item-note-bullet">📝</span>
                                <span>{match.conciseObservationNote}</span>
                              </div>
                            )}

                            <div className="ai-match-details-grid">
                              <div>
                                <span className="match-detail-label">רמת תיווך:</span>
                                <strong className="match-detail-val">{match.observedSupportLevel}</strong>
                              </div>
                              <div>
                                <span className="match-detail-label">המלצת התקדמות:</span>
                                <strong className="match-detail-val delta">+{match.suggestedProgressDelta}%</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="ai-match-actions">
                      <button
                        type="button"
                        onClick={() => {
                          checkAndDispatchAbandonment();
                          setAiAnalysisResults(null);
                          setSelectedMatchGoalIds(new Set());
                        }}
                        className="btn-match-cancel"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={handleApproveAiResult}
                        disabled={selectedMatchGoalIds.size === 0}
                        className="btn-match-approve"
                      >
                        {selectedMatchGoalIds.size > 1
                          ? `אישור ושמירת ${selectedMatchGoalIds.size} יעדים בתיק התלמיד ✓`
                          : 'אישור ושמירה בתיק התלמיד ✓'}
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
                      onChange={(e: any) => setSelectedGoalId(e.target.value)}
                      className="manual-goal-select"
                    >
                      {activeStudentGoals.map((g: any) => (
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
                    onFocus={() => startObservationEntry('text', false)}
                    onChange={(e: any) => {
                      startObservationEntry('text', false);
                      setManualNote(e.target.value);
                    }}
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
      {scheduleModalAnim.shouldRender && (
        <div className={`tracker-modal-overlay ${scheduleModalAnim.isClosing ? 'is-closing' : ''}`}>
          <div className={`tracker-modal-card ${scheduleModalAnim.isClosing ? 'is-closing' : ''}`} dir="rtl">
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
                <label>סוג האירוע (הקלדה חופשית או בחירה מההיסטוריה):</label>
                <div className="event-type-input-wrapper">
                  <input
                    type="text"
                    list="event-types-list"
                    value={newEventForm.type}
                    placeholder="הקלידי סוג אירוע..."
                    onChange={(e: any) => {
                      const val = e.target.value;
                      const matched = eventTypes.find(
                        (t: any) => t.name.trim().toLowerCase() === val.trim().toLowerCase()
                      );
                      setNewEventForm({
                        ...newEventForm,
                        type: val,
                        color: matched ? matched.color : newEventForm.color
                      });
                    }}
                    className="modal-type-input"
                  />
                  <datalist id="event-types-list">
                    {eventTypes.map((t: any, idx: any) => (
                      <option key={idx} value={t.name} />
                    ))}
                  </datalist>
                </div>

                {/* History pills for 1-click selection */}
                <div className="event-type-pills-row">
                  <span className="pills-label">סוגים שנשמרו בהיסטוריה שלך:</span>
                  <div className="pills-container">
                    {eventTypes.map((t: any, idx: any) => {
                      const isSelected = newEventForm.type.trim().toLowerCase() === t.name.trim().toLowerCase();
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setNewEventForm({ ...newEventForm, type: t.name, color: t.color })}
                          className={`event-type-pill ${isSelected ? 'active' : ''}`}
                          style={{
                            borderColor: isSelected ? t.color : '#e2e8f0',
                            backgroundColor: isSelected ? `${t.color}15` : '#ffffff',
                            color: isSelected ? t.color : '#334155'
                          }}
                        >
                          <span className="pill-dot" style={{ backgroundColor: t.color }} />
                          <span>{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Color Swatch Selector */}
              <div className="modal-field-group">
                <label>צבע האירוע בלוח השנה:</label>
                <div className="color-swatches-grid">
                  {PRESET_EVENT_COLORS.map((c) => {
                    const isChosen = (newEventForm.color || '').toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setNewEventForm({ ...newEventForm, color: c.hex })}
                        className={`color-swatch-btn ${isChosen ? 'chosen' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {isChosen && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </button>
                    );
                  })}
                  <div className="custom-color-picker-wrapper" title="בחירת צבע חופשי מותאם אישית">
                    <input
                      type="color"
                      value={newEventForm.color || '#2563eb'}
                      onChange={(e: any) => setNewEventForm({ ...newEventForm, color: e.target.value })}
                      className="native-color-picker-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-field-group">
                <label>כותרת האירוע (אופציונלי):</label>
                <input
                  type="text"
                  placeholder="לדוגמה: דיון תוכנית עבודה, צפייה בהפסקת חצר..."
                  value={newEventForm.title}
                  onChange={(e: any) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                />
              </div>

              <div className="modal-field-group">
                <label>תלמיד/ה משויך/ת:</label>
                <select
                  value={newEventForm.studentId}
                  onChange={(e: any) => setNewEventForm({ ...newEventForm, studentId: e.target.value })}
                >
                  {students.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.educationalFramework ? ` • ${s.educationalFramework}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-date-and-time-section">
                <div className="modal-field-group">
                  <label>תאריך הפגישה:</label>
                  <HebrewDatePicker
                    value={newEventForm.date}
                    onChange={(d) => setNewEventForm({ ...newEventForm, date: d })}
                    ariaLabel="בחירת תאריך לפגישה"
                  />
                </div>

                <div className="modal-time-row">
                  <div className="modal-field-group" style={{ flex: 1 }}>
                    <label>שעת התחלה:</label>
                    <select
                      value={newEventForm.startTime}
                      onChange={(e: any) => {
                        const start = e.target.value;
                        const duration = calculateDurationMinutes(newEventForm.startTime, newEventForm.endTime);
                        const end = addMinutesToTime(start, duration > 0 ? duration : 45);
                        setNewEventForm({ ...newEventForm, startTime: start, endTime: end });
                      }}
                      className="modal-time-select"
                    >
                      {TIME_SLOTS.map((t: any) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="modal-field-group" style={{ flex: 1 }}>
                    <label>שעת סיום:</label>
                    <select
                      value={newEventForm.endTime}
                      onChange={(e: any) => setNewEventForm({ ...newEventForm, endTime: e.target.value })}
                      className="modal-time-select"
                    >
                      {TIME_SLOTS.map((t: any) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration Chips for 1-click setting */}
                <div className="duration-chips-group">
                  <span className="duration-label">משך זמן מהיר:</span>
                  <div className="duration-chips-row">
                    {[
                      { label: '30 דק׳', mins: 30 },
                      { label: '45 דק׳ (שיעור)', mins: 45 },
                      { label: '60 דק׳', mins: 60 },
                      { label: '90 דק׳', mins: 90 }
                    ].map((d) => (
                      <button
                        type="button"
                        key={d.mins}
                        onClick={() => {
                          const end = addMinutesToTime(newEventForm.startTime, d.mins);
                          setNewEventForm({ ...newEventForm, endTime: end });
                        }}
                        className="duration-chip-btn"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-row">
                {editingEventId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEventId)}
                    className="btn-modal-delete-inline"
                  >
                    <Trash2 size={14} />
                    <span>מחק אירוע</span>
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowScheduleModal(false);
                      setEditingEventId(null);
                    }}
                    className="btn-modal-cancel"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-submit"
                  >
                    {editingEventId ? 'עדכן אירוע ✓' : 'שמור וקבע בלוח השנה ✓'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pedagogical Tasks AI Generator Modal */}
      <PedagogicalTasksModal
        isOpen={showAiTasksModal}
        onClose={() => setShowAiTasksModal(false)}
        students={students}
        events={events}
        selectedDate={selectedDate}
        onAddTasks={handleAddAiTasks}
      />
    </div>
  );
}

