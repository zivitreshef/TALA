import React, { useState } from 'react';
import {
  Sparkles,
  CheckSquare,
  Square,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { callAiProxyEndpoint } from '../../services/aiProxyClient';

// Pure heuristic generator guaranteeing offline & fallback reliability
export const generatePedagogicalTasksHeuristic = (
  targetStudents = [],
  events = [],
  selectedDate = '',
  focusInstruction = ''
) => {
  return targetStudents.map((student) => {
    const goals = student.goals || [];
    const scheduledMeeting = (events || []).find(
      (ev) => (ev.studentId === student.id || ev.studentName === student.name) && ev.date === selectedDate
    );

    // Prioritize goal without recent observations or lowest progress
    let targetGoal = null;
    if (goals.length > 0) {
      targetGoal = goals.find((g) => !g.observations || g.observations.length === 0) || goals[0];
    }

    let taskText = '';
    if (targetGoal) {
      if (scheduledMeeting) {
        taskText = `${student.name}: במפגש (${scheduledMeeting.title || 'שיעור פרטני'}) - עבודה ממוקדת על היעד "${targetGoal.title}" עם תיעוד רמת תיווך.`;
      } else {
        taskText = `${student.name}: תרגול ממוקד של 15 דקות לקידום היעד "${targetGoal.title}" בסביבת ${targetGoal.environment || 'הכיתה'}.`;
      }
    } else if (scheduledMeeting) {
      taskText = `${student.name}: ביצוע מפגש ${scheduledMeeting.title || 'פרטני'} ותצפית על שילוב חברתי ותקשורתי.`;
    } else {
      taskText = `${student.name}: בדיקת מוכנות לימודית, סנכרון תצפיות יומי וחיזוק מיומנות יסוד.`;
    }

    if (focusInstruction && focusInstruction.trim()) {
      taskText += ` [דגש: ${focusInstruction.trim()}]`;
    }

    return {
      id: `task_${student.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studentId: student.id,
      studentName: student.name,
      text: taskText,
      date: selectedDate,
      selected: true
    };
  });
};

export default function PedagogicalTasksModal({
  isOpen,
  onClose,
  students = [],
  events = [],
  selectedDate = '',
  onAddTasks
}) {
  const [selectedStudentIds, setSelectedStudentIds] = useState(() => {
    // Pre-select students who have events scheduled on selectedDate, or all if none
    const todayIds = (events || [])
      .filter((ev) => ev.date === selectedDate && ev.studentId)
      .map((ev) => ev.studentId);
    return new Set(todayIds.length > 0 ? todayIds : students.map((s) => s.id));
  });

  const [focusInstruction, setFocusInstruction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState('select'); // 'select' | 'review'
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [generationError, setGenerationError] = useState('');

  if (!isOpen) return null;

  // Students who have meetings or events on selectedDate
  const studentsWithEventsOnDate = students.filter((s) =>
    (events || []).some((ev) => (ev.studentId === s.id || ev.studentName === s.name) && ev.date === selectedDate)
  );

  const handleToggleStudent = (studentId) => {
    const next = new Set(selectedStudentIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedStudentIds(next);
  };

  const handleSelectMeetingStudents = () => {
    setSelectedStudentIds(new Set(studentsWithEventsOnDate.map((s) => s.id)));
  };

  const handleSelectAll = () => {
    setSelectedStudentIds(new Set(students.map((s) => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const handleGenerate = async () => {
    const targetStudents = students.filter((s) => selectedStudentIds.has(s.id));
    if (targetStudents.length === 0) return;

    setIsGenerating(true);
    setGenerationError('');

    try {
      const studentsContext = targetStudents.map((s) => {
        const goalsStr = (s.goals || [])
          .map((g) => {
            const obsCount = g.observations?.length || 0;
            return `  * יעד: ${g.title} | תחום: ${g.domain || 'כללי'} | סביבה: ${g.environment || 'כיתה'} | תצפיות שתועדו: ${obsCount}`;
          })
          .join('\n');

        const scheduled = (events || []).find(
          (ev) => (ev.studentId === s.id || ev.studentName === s.name) && ev.date === selectedDate
        );

        return `תלמיד/ה: ${s.name} (מסגרת: ${s.educationalFramework || 'חינוך'})
${scheduled ? `מפגש מתוכנן להיום: ${scheduled.title} בשעה ${scheduled.startTime || 'מתוזמן'}` : 'אין מפגש מתוזמן ביומן להיום'}
יעדים בתוכנית תל"א:
${goalsStr || '  * אין יעדים מוגדרים'}`;
      }).join('\n\n---\n\n');

      const prompt = `אתה מדריך ומומחה פדגוגי בכיר לתל"א (תוכנית לימודים אישית) והוראה מותאמת.
המורה מבקשת משימות פדגוגיות ממוקדות, ישימות וקונקרטיות לביצוע ביום הנבחר: ${selectedDate}.
${focusInstruction.trim() ? `דגש פדגוגי מיוחד מהמורה להיום: "${focusInstruction.trim()}"` : ''}

להלן נתוני התלמידים שבחרה:
${studentsContext}

הנחיות מחייבות:
1. חולל משימה פדגוגית ממוקדת אחת בלבד לכל תלמיד ברשימה.
2. המשימה חייבת לפתוח בשם התלמיד (למשל: "איתי לוי: תרגול ממוקד של...").
3. המשימה צריכה להיות ישימה, קצרה וקשורה ליעד שדורש תצפית או למפגש המתוכנן.
4. החזר פלט בפורמט JSON בלבד (ללא מרקדאון של backticks, ללא הסברים):
[
  {
    "studentId": "מזהה_תלמיד",
    "studentName": "שם התלמיד",
    "task": "שם התלמיד: תיאור משימה פדגוגית קונקרטית"
  }
]`;

      const response = await callAiProxyEndpoint({
        operation: 'customPrompt',
        payload: { prompt, selectedDate },
        hints: { model: 'gemini-2.5-flash' }
      });

      let parsed = [];
      if (Array.isArray(response)) {
        parsed = response;
      } else if (response && typeof response === 'object' && Array.isArray(response.tasks)) {
        parsed = response.tasks;
      } else if (response?.raw) {
        const cleaned = response.raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        const formatted = parsed.map((item, idx) => ({
          id: `task_${item.studentId || idx}_${Date.now()}`,
          studentId: item.studentId,
          studentName: item.studentName || 'תלמיד/ה',
          text: item.task || `${item.studentName}: משימה פדגוגית`,
          date: selectedDate,
          selected: true
        }));
        setGeneratedTasks(formatted);
      } else {
        setGeneratedTasks(generatePedagogicalTasksHeuristic(targetStudents, events, selectedDate, focusInstruction));
      }
      setStep('review');
    } catch (err) {
      console.warn('AI tasks generation proxy error, using heuristic fallback:', err);
      setGeneratedTasks(generatePedagogicalTasksHeuristic(targetStudents, events, selectedDate, focusInstruction));
      setStep('review');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleGeneratedTask = (taskId) => {
    setGeneratedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleEditTaskText = (taskId, newText) => {
    setGeneratedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, text: newText } : t))
    );
  };

  const handleDeleteTask = (taskId) => {
    setGeneratedTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleConfirmAddTasks = () => {
    const tasksToAdd = generatedTasks
      .filter((t) => t.selected && t.text.trim())
      .map((t) => ({
        text: t.text.trim(),
        date: selectedDate,
        studentId: t.studentId,
        isAiGenerated: true
      }));

    if (tasksToAdd.length > 0) {
      onAddTasks(tasksToAdd);
    }
    onClose();
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.educationalFramework && s.educationalFramework.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        direction: 'rtl',
        textAlign: 'right',
        padding: '16px'
      }}
    >
      <div
        className="modal-card modal-large"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '740px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #2b4c73 0%, #4a88c7 100%)',
            color: '#ffffff',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                מיקוד פדגוגי עם AI ליום הנבחר: {selectedDate}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#e0edff' }}>
                {step === 'select'
                  ? 'בחרי תלמידים למיקוד היום, וה-AI יבנה משימות מעשיות מותאמות אישית'
                  : 'סקרי ואשרי את המשימות שנבנו לפני הוספתן לרשימת היום'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              opacity: 0.85
            }}
            title="סגירה"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {step === 'select' ? (
            <>
              {/* Context bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#f1f6fc',
                  borderRadius: '12px',
                  border: '1px solid #d4e3f5',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#2b4c73' }}>
                  <Calendar size={17} style={{ color: '#4a88c7' }} />
                  <span>תאריך יעד: {selectedDate}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#5c6f8c' }}>
                  {studentsWithEventsOnDate.length > 0
                    ? `🎯 ${studentsWithEventsOnDate.length} תלמידים משובצים למפגש בלוח השנה ליום זה`
                    : 'אין מפגשים מתוזמנים ביומן ליום זה'}
                </div>
              </div>

              {/* Selection Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#24344d' }}>
                    1. באילו תלמידים תרצי להתמקד היום? ({selectedStudentIds.size} נבחרו)
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {studentsWithEventsOnDate.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectMeetingStudents}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: '700',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid #4a88c7',
                          backgroundColor: '#e9f2fb',
                          color: '#2b4c73',
                          cursor: 'pointer'
                        }}
                      >
                        🎯 עם מפגש היום ({studentsWithEventsOnDate.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      בחר הכל
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      נקה
                    </button>
                  </div>
                </div>

                {/* Search */}
                <input
                  type="text"
                  placeholder="חיפוש מהיר של תלמיד/ה..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    border: '1.5px solid #d3dff0',
                    outline: 'none'
                  }}
                />

                {/* Student Checklist Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '10px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '4px'
                  }}
                >
                  {filteredStudents.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
                      לא נמצאו תלמידים.
                    </div>
                  ) : (
                    filteredStudents.map((st) => {
                      const isSelected = selectedStudentIds.has(st.id);
                      const hasMeetingToday = (events || []).some(
                        (ev) => (ev.studentId === st.id || ev.studentName === st.name) && ev.date === selectedDate
                      );
                      const goalsSummary = (st.goals || []).map((g) => g.title).slice(0, 2).join(' • ');

                      return (
                        <div
                          key={st.id}
                          onClick={() => handleToggleStudent(st.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            border: isSelected ? '2px solid #4a88c7' : '1px solid #e2e8f0',
                            backgroundColor: isSelected ? '#f1f7fc' : '#ffffff',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ marginTop: '2px', color: isSelected ? '#2b4c73' : '#94a3b8' }}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div style={{ flexGrow: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '800', fontSize: '13.5px', color: '#24344d' }}>{st.name}</span>
                              {st.educationalFramework && (
                                <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                                  {st.educationalFramework}
                                </span>
                              )}
                              {hasMeetingToday && (
                                <span style={{ fontSize: '10.5px', color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                  מפגש היום
                                </span>
                              )}
                            </div>
                            {goalsSummary && (
                              <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                🎯 {goalsSummary}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Focus Instruction */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <label style={{ fontSize: '13px', fontWeight: '800', color: '#24344d' }}>
                  2. דגש פדגוגי מיוחד להיום (רשות):
                </label>
                <input
                  type="text"
                  placeholder="למשל: דגש על שיתוף פעולה בחצר, חיזוק עצמאות, שילוב אמצעי המחשה..."
                  value={focusInstruction}
                  onChange={(e) => setFocusInstruction(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>

              {generationError && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{generationError}</span>
                </div>
              )}
            </>
          ) : (
            /* Review Step */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#eef5fc',
                  borderRadius: '12px',
                  border: '1px solid #c2dbf3',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e40af' }}>
                  ✨ נוצרו {generatedTasks.length} משימות פדגוגיות ממוקדות ({generatedTasks.filter((t) => t.selected).length} נבחרו להוספה)
                </span>
                <span style={{ fontSize: '11.5px', color: '#3b82f6' }}>
                  תוכלי לערוך את נוסח המשימה ישירות או להסיר משימות לפני האישור
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '380px', overflowY: 'auto', padding: '4px' }}>
                {generatedTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: task.selected ? '#ffffff' : '#f8fafc',
                      border: task.selected ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                      boxShadow: task.selected ? '0 2px 6px rgba(74, 136, 199, 0.12)' : 'none',
                      opacity: task.selected ? 1 : 0.65
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.selected}
                      onChange={() => handleToggleGeneratedTask(task.id)}
                      style={{ marginTop: '6px', cursor: 'pointer', transform: 'scale(1.2)' }}
                      title="בחירת משימה"
                    />

                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#2b4c73', backgroundColor: '#e9f2fb', padding: '2px 8px', borderRadius: '6px' }}>
                          {task.studentName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                          title="הסר משימה"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <textarea
                        value={task.text}
                        onChange={(e) => handleEditTaskText(task.id, e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                          resize: 'vertical',
                          lineHeight: '1.45',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {step === 'select' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                ביטול
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={selectedStudentIds.size === 0 || isGenerating}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4a88c7 0%, #8b6fc0 100%)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: selectedStudentIds.size === 0 || isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(74, 136, 199, 0.25)',
                  opacity: selectedStudentIds.size === 0 || isGenerating ? 0.6 : 1
                }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>מנתח ומחולל משימות AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>חולל משימות פדגוגיות ({selectedStudentIds.size})</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('select')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                חזור לבחירה
              </button>

              <button
                type="button"
                onClick={handleConfirmAddTasks}
                disabled={generatedTasks.filter((t) => t.selected).length === 0}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary-deep, #2b4c73)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: generatedTasks.filter((t) => t.selected).length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(43, 76, 115, 0.25)'
                }}
              >
                <Check size={16} />
                <span>הוסף למשימות היום ({generatedTasks.filter((t) => t.selected).length})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
