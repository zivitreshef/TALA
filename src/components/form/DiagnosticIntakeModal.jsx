import React, { useState, useMemo } from 'react';
import {
  FileUp,
  Sparkles,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
  FileText,
  CheckSquare,
  Square,
  Highlighter,
  Save
} from 'lucide-react';
import {
  extractTextFromFile,
  buildDiagnosticPrompt,
  sanitizeDiagnosticIntakeResult,
  applyDiagnosticIntakeToStudent,
  createDiagnosticDocumentRecord,
  addDiagnosticDocumentToStudent
} from '../../domain/diagnosticIntake';
import { callAiProxyEndpoint } from '../../services/aiProxyClient';

export default function DiagnosticIntakeModal({
  formData,
  onApplyIntake,
  onClose,
  initialText = '',
  initialDocName = ''
}) {
  const [step, setStep] = useState('input'); // 'input' | 'review'
  const [uploadedFileName, setUploadedFileName] = useState(initialDocName || '');
  const [uploadedDocRecord, setUploadedDocRecord] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState([]);

  // Highlighter and text selection states
  const initialLines = useMemo(() => {
    if (!initialText) return [];
    return initialText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [initialText]);

  const [extractedLines, setExtractedLines] = useState(initialLines);
  const [selectedLineIndices, setSelectedLineIndices] = useState(
    () => new Set(initialLines.map((_, i) => i))
  );
  const [viewMode, setViewMode] = useState(initialLines.length > 0 ? 'highlighter' : 'freeText');
  const [inputText, setInputText] = useState(initialText || '');
  const [manualNotes, setManualNotes] = useState('');
  const [extractionStatus, setExtractionStatus] = useState(
    initialLines.length > 0 ? 'success' : 'idle'
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    setIsExtracting(true);

    try {
      const extracted = await extractTextFromFile(file);
      const cleanExtracted = (extracted || '').trim();
      const ext = (file.name || '').split('.').pop().toLowerCase() || 'pdf';
      const sizeFormatted = file.size ? `${Math.round(file.size / 1024)} KB` : '';

      // Always create and preserve document record
      const docRecord = createDiagnosticDocumentRecord({
        fileName: file.name,
        fileType: ext,
        fullText: cleanExtracted,
        fileSizeFormatted: sizeFormatted
      });
      setUploadedDocRecord(docRecord);
      setUploadedFileName(file.name);

      if (cleanExtracted && cleanExtracted.length > 10) {
        const rawLines = cleanExtracted
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        setExtractedLines(rawLines);
        setSelectedLineIndices(new Set(rawLines.map((_, i) => i)));
        setInputText(cleanExtracted);
        setExtractionStatus('success');
        setViewMode('highlighter');
      } else {
        setExtractedLines([]);
        setSelectedLineIndices(new Set());
        setExtractionStatus('scanned_image');
        setViewMode('freeText');
      }
    } catch (err) {
      console.warn('File processing error:', err);
      setErrorMessage('שגיאה בקריאת הקובץ. המסמך נשמר בתיק ותוכלי להדביק טקסט ידנית.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleLine = (idx) => {
    setSelectedLineIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const selectAllLines = () => {
    setSelectedLineIndices(new Set(extractedLines.map((_, i) => i)));
  };

  const clearAllLines = () => {
    setSelectedLineIndices(new Set());
  };

  const handleSaveDocOnly = () => {
    if (!uploadedDocRecord) return;
    const updated = addDiagnosticDocumentToStudent(formData, uploadedDocRecord);
    onApplyIntake?.(updated);
    onClose?.();
  };

  const handleAnalyze = async () => {
    let textToAnalyze = '';
    if (viewMode === 'highlighter' && extractedLines.length > 0) {
      const chosenLines = extractedLines.filter((_, i) => selectedLineIndices.has(i));
      textToAnalyze = [chosenLines.join('\n'), manualNotes.trim()].filter(Boolean).join('\n\n');
    } else {
      textToAnalyze = [inputText.trim(), manualNotes.trim()].filter(Boolean).join('\n\n');
    }

    if (!textToAnalyze || textToAnalyze.length < 20) {
      setErrorMessage('נא לסמן שורות לניתוח או להזין טקסט בתיבה (לפחות מספר משפטים) לפני הניתוח.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const prompt = buildDiagnosticPrompt({
        diagnosticText: textToAnalyze,
        gender: formData.gender || 'boy',
        studentName: formData.name || '',
        planType: formData.planType || 'תל"א'
      });

      const rawResponse = await callAiProxyEndpoint({
        operation: 'rawPrompt',
        payload: { prompt },
        hints: {
          gender: formData.gender,
          name: formData.name
        }
      });

      const sanitized = sanitizeDiagnosticIntakeResult(rawResponse, formData.gender || 'boy');
      setParsedResult(sanitized);
      setSelectedGoalIds(sanitized.suggestedGoals.map((g) => g.id));
      setStep('review');
    } catch (err) {
      console.error('Diagnostic intake analysis failed:', err);
      setErrorMessage('ניתוח האבחון נכשל. ודאי שיש חיבור אינטרנט או נסי לקצר את הטקסט.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmApply = () => {
    if (!parsedResult) return;
    const updated = applyDiagnosticIntakeToStudent(
      formData,
      parsedResult,
      selectedGoalIds,
      uploadedDocRecord
    );
    onApplyIntake?.(updated);
    onClose?.();
  };

  const toggleGoalSelection = (goalId) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card email-report-modal"
        dir="rtl"
        style={{ maxWidth: '750px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header email-modal-header">
          <div className="modal-title-row">
            <FileUp size={22} />
            <div>
              <h3>קליטת אבחון וסיכום ועדת זכאות</h3>
              <p className="modal-subtitle">
                גזירה אוטומטית של רקע, מענים, מוקדי כוח ומטרות מתוך דו״ח פסיכודידקטי או התפתחותי
              </p>
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} title="סגור">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body email-modal-body" style={{ maxHeight: '74vh', overflowY: 'auto' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '0.88rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'input' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Step 1: Upload File */}
              <div>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e3a5f', display: 'block', marginBottom: '6px' }}>
                  1. העלאת קובץ אבחון (Word, PDF או סריקה):
                </label>
                <div
                  style={{
                    border: '2px dashed #93c5fd',
                    borderRadius: '12px',
                    background: isExtracting ? '#eff6ff' : '#f0f9ff',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: isExtracting ? 'wait' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => !isExtracting && document.getElementById('diagnostic-file-input')?.click()}
                >
                  {isExtracting ? (
                    <div>
                      <Loader2 size={30} className="tala-spin-icon" style={{ color: '#0284c7', margin: '0 auto 6px auto' }} />
                      <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.95rem' }}>
                        קורא ומחלץ נתונים מהקובץ...
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                        מפענח עמודים, טבלאות ושכבות מלל. אנא המתיני מספר רגעים.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <FileUp size={28} style={{ color: '#0284c7', margin: '0 auto 6px auto' }} />
                      <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.95rem' }}>
                        לחצי כאן להעלאת קובץ או גררי לכאן
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                        תמיכה בקובצי Word (DOCX), PDF, טקסט (TXT) וסריקות
                      </div>
                    </div>
                  )}
                  <input
                    id="diagnostic-file-input"
                    type="file"
                    accept=".docx,.pdf,.txt,.csv,.md"
                    onChange={handleFileUpload}
                    disabled={isExtracting}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Status Banners */}
                {extractionStatus === 'success' && (
                  <div
                    style={{
                      marginTop: '8px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      color: '#166534'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          הקובץ נקרא בהצלחה ({extractedLines.length} שורות / פסקאות)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                          הקובץ נשמר בתיק התלמיד/ה. סמני בעזרת המרקר את השורות שברצונך שה-AI ינתח.
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 600
                      }}
                    >
                      📎 {uploadedFileName}
                    </span>
                  </div>
                )}

                {extractionStatus === 'scanned_image' && (
                  <div
                    style={{
                      marginTop: '8px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#334155'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <FileText size={20} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                          המסמך "{uploadedFileName}" נשמר בהצלחה בתיק התלמיד/ה!
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                          זהו מסמך סרוק / תמונה ללא שכבת מלל דיגיטלית. המסמך מתועד ומאוחסן בכרטיס התלמיד/ה.
                          אם תרצי ניתוח AI, תוכלי להדביק או להקליד למטה פסקאות נבחרות, או פשוט לשמור אותו בתיק.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Content Selection & Highlighter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e3a5f', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Highlighter size={16} color="#4338ca" />
                    <span>2. בחירת שורות ותוכן לניתוח ב-AI:</span>
                  </label>

                  {extractedLines.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setViewMode('highlighter')}
                        style={{
                          background: viewMode === 'highlighter' ? '#4f46e5' : '#f1f5f9',
                          color: viewMode === 'highlighter' ? '#ffffff' : '#475569',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        מרקר שורות ({selectedLineIndices.size}/{extractedLines.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const chosen = extractedLines.filter((_, i) => selectedLineIndices.has(i)).join('\n');
                          setInputText(chosen);
                          setViewMode('freeText');
                        }}
                        style={{
                          background: viewMode === 'freeText' ? '#4f46e5' : '#f1f5f9',
                          color: viewMode === 'freeText' ? '#ffffff' : '#475569',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        עריכת טקסט חופשית
                      </button>
                    </div>
                  )}
                </div>

                {/* Highlighter Mode */}
                {viewMode === 'highlighter' && extractedLines.length > 0 ? (
                  <div
                    style={{
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      background: '#ffffff',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Highlighter Toolbar */}
                    <div
                      style={{
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}
                    >
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                        לחצי על שורות כדי לסמן (ירוק) או להחריג (אפור) מניתוח ה-AI
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={selectAllLines}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            color: '#1e293b'
                          }}
                        >
                          בחר הכל
                        </button>
                        <button
                          type="button"
                          onClick={clearAllLines}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            color: '#64748b'
                          }}
                        >
                          נקה הכל
                        </button>
                        <span
                          style={{
                            fontSize: '11.5px',
                            background: selectedLineIndices.size > 0 ? '#dcfce7' : '#f1f5f9',
                            color: selectedLineIndices.size > 0 ? '#15803d' : '#64748b',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 700
                          }}
                        >
                          {selectedLineIndices.size} מסומנות
                        </span>
                      </div>
                    </div>

                    {/* Lines List */}
                    <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
                      {extractedLines.map((line, idx) => {
                        const isSelected = selectedLineIndices.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleLine(idx)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              marginBottom: '3px',
                              cursor: 'pointer',
                              background: isSelected ? '#f0fdf4' : '#f8fafc',
                              border: isSelected ? '1px solid #86efac' : '1px solid #f1f5f9',
                              color: isSelected ? '#14532d' : '#94a3b8',
                              fontSize: '0.86rem',
                              lineHeight: 1.4,
                              userSelect: 'none',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare size={16} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
                            ) : (
                              <Square size={16} color="#94a3b8" style={{ marginTop: '2px', flexShrink: 0 }} />
                            )}
                            <span style={{ flex: 1 }}>{line}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Free Textarea Mode */
                  <textarea
                    rows={8}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="כאן יופיע הטקסט מהקובץ שתעלי, ובנוסף תוכלי להדביק או להקליד כאן פסקאות, דגשים אישיים או המלצות צוות..."
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      padding: '10px 12px',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      lineHeight: 1.5
                    }}
                  />
                )}

                {/* Additional manual notes box */}
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    ✍️ תוספת הערות, דגשים מפגישות הצוות או המלצות נוספות (אופציונלי):
                  </label>
                  <textarea
                    rows={2}
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="תוכלי להוסיף כאן דגשים אישיים שאינם כתובים במסמך..."
                    style={{
                      width: '100%',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      padding: '6px 10px',
                      fontSize: '0.84rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Busy Indicator 2: Active AI Generation Card */}
              {isLoading && (
                <div
                  style={{
                    background: '#f5f3ff',
                    border: '1.5px solid #d8b4fe',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#5b21b6'
                  }}
                >
                  <Loader2 size={22} className="tala-spin-icon" style={{ flexShrink: 0, color: '#7c3aed' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      ה-AI מעבד את הנתונים שסומנו ומנסח מטרות פדגוגיות...
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6d28d9', marginTop: '2px' }}>
                      גוזר רקע, מענים, מוקדי כוח, אתגרים ומטרות אופרטיביות. לוקח בדרך כלל 3-5 שניות.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="email-modal-actions" style={{ justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                <button type="button" className="btn-cancel-modal" onClick={onClose} disabled={isLoading || isExtracting}>
                  ביטול
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {uploadedDocRecord && (
                    <button
                      type="button"
                      onClick={handleSaveDocOnly}
                      disabled={isLoading || isExtracting}
                      style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="שמירת המסמך בתיק התלמיד/ה מבלי להפעיל ניתוח AI"
                    >
                      <Save size={15} />
                      <span>שמירה בתיק ללא ניתוח</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-submit-email"
                    onClick={handleAnalyze}
                    disabled={isLoading || isExtracting}
                    style={{ padding: '8px 18px' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="tala-spin-icon" />
                        <span>מנתח ומעבד ב-AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>
                          {extractedLines.length > 0 && viewMode === 'highlighter'
                            ? `✨ נתח ב-AI (${selectedLineIndices.size} שורות מסומנות)`
                            : '✨ נתח ב-AI וגזור תוכנית'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>האבחון עובד בהצלחה! סקרי את הנתונים ובחרי אילו מטרות לשלב בתוכנית:</span>
              </div>

              {/* Background & Support */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px' }}>
                <strong style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>📌 רקע ומענים:</strong>
                {parsedResult?.studentGeneralBackground && (
                  <div style={{ marginTop: '6px', fontSize: '0.86rem', color: '#334155' }}>
                    <strong>רקע כללי:</strong> {parsedResult.studentGeneralBackground}
                  </div>
                )}
                {parsedResult?.studentSupportReceived && (
                  <div style={{ marginTop: '4px', fontSize: '0.86rem', color: '#334155' }}>
                    <strong>מענים ותמיכות:</strong> {parsedResult.studentSupportReceived}
                  </div>
                )}
                {parsedResult?.studentMainGoal && (
                  <div style={{ marginTop: '4px', fontSize: '0.86rem', color: '#334155' }}>
                    <strong>מטרה מרכזית:</strong> {parsedResult.studentMainGoal}
                  </div>
                )}
              </div>

              {/* Strengths & Challenges */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px' }}>
                <strong style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>💪 מוקדי כוח וחיזוק:</strong>
                {parsedResult?.strengthsExisting && (
                  <div style={{ marginTop: '6px', fontSize: '0.86rem', color: '#15803d' }}>
                    <strong>כוחות קיימים:</strong> {parsedResult.strengthsExisting}
                  </div>
                )}
                {parsedResult?.strengthsToEmpower && (
                  <div style={{ marginTop: '4px', fontSize: '0.86rem', color: '#b45309' }}>
                    <strong>מוקדים לחיזוק:</strong> {parsedResult.strengthsToEmpower}
                  </div>
                )}
              </div>

              {/* Suggested Goals */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>
                    🎯 מטרות אופרטיביות שנגזרו ({parsedResult?.suggestedGoals?.length || 0}):
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    סמני מטרות לשילוב בתוכנית
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(parsedResult?.suggestedGoals || []).map((g) => {
                    const isSelected = selectedGoalIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleGoalSelection(g.id)}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ flex: 1, fontSize: '0.86rem' }}>
                          <div style={{ fontWeight: 700, color: '#1e3a5f' }}>
                            [{g.environment}] {g.title}
                          </div>
                          {g.objectives && (
                            <div style={{ color: '#475569', marginTop: '3px', whiteSpace: 'pre-line', fontSize: '0.82rem' }}>
                              {g.objectives}
                            </div>
                          )}
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                            מוביל/ה: {g.leadProfessional} • משך: {g.duration}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              {parsedResult?.recommendations && (
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px' }}>
                  <strong style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>💡 המלצות להמשך:</strong>
                  <div style={{ marginTop: '4px', fontSize: '0.86rem', color: '#334155', whiteSpace: 'pre-line' }}>
                    {parsedResult.recommendations}
                  </div>
                </div>
              )}

              <div className="email-modal-actions" style={{ justifyContent: 'space-between', marginTop: '6px' }}>
                <button type="button" className="btn-cancel-modal" onClick={() => setStep('input')}>
                  חזור לעריכת קלט
                </button>
                <button
                  type="button"
                  className="btn-submit-email"
                  onClick={handleConfirmApply}
                  style={{ padding: '8px 18px' }}
                >
                  <Check size={16} />
                  <span>שלב {selectedGoalIds.length} מטרות ונתונים בתוכנית העבודה</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
