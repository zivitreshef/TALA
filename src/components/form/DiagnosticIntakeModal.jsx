import React, { useState } from 'react';
import { FileUp, Sparkles, Check, CheckCircle2, ChevronRight, Loader2, X, AlertCircle } from 'lucide-react';
import {
  extractTextFromFile,
  buildDiagnosticPrompt,
  sanitizeDiagnosticIntakeResult,
  applyDiagnosticIntakeToStudent
} from '../../domain/diagnosticIntake';
import { callAiProxyEndpoint } from '../../services/aiProxyClient';

export default function DiagnosticIntakeModal({
  formData,
  onApplyIntake,
  onClose
}) {
  const [step, setStep] = useState('input'); // 'input' | 'review'
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const extracted = await extractTextFromFile(file);
      if (extracted && extracted.trim()) {
        setInputText((prev) => (prev ? `${prev}\n\n${extracted}` : extracted));
      } else {
        setErrorMessage('לא ניתן היה לחלץ טקסט מהקובץ באופן ישיר. ניתן להעתיק ולהדביק את תוכן האבחון ישירות לתיבת הטקסט.');
      }
    } catch (err) {
      setErrorMessage('שגיאה בקריאת הקובץ. נסי להעתיק ולהדביק את הטקסט.');
    }
  };

  const handleAnalyze = async () => {
    const textToAnalyze = inputText.trim();
    if (!textToAnalyze || textToAnalyze.length < 20) {
      setErrorMessage('נא להזין או להעלות טקסט של דו״ח אבחון (לפחות מספר משפטים) לפני הניתוח.');
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
    const updated = applyDiagnosticIntakeToStudent(formData, parsedResult, selectedGoalIds);
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
        style={{ maxWidth: '720px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header email-modal-header">
          <div className="modal-title-row">
            <FileUp size={22} />
            <div>
              <h3>קליטת אבחון וסיכום ועדת זכאות (Intelligent Diagnostic Intake)</h3>
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
              <div
                style={{
                  border: '2px dashed #93c5fd',
                  borderRadius: '12px',
                  background: '#f0f9ff',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('diagnostic-file-input')?.click()}
              >
                <FileUp size={28} style={{ color: '#0284c7', margin: '0 auto 6px auto' }} />
                <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '0.95rem' }}>
                  לחצי כאן להעלאת קובץ אבחון (.PDF / .TXT)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  או גררי קובץ לכאן
                </div>
                <input
                  id="diagnostic-file-input"
                  type="file"
                  accept=".pdf,.txt,.csv,.md"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  או הדביקי כאן את טקסט האבחון / סיכום ועדת הזכאות:
                </label>
                <textarea
                  rows={8}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="הדביקי פסקאות מתוך דו״ח האבחון, רקע התפתחותי, סיכום אבחון פסיכולוגי או המלצות הצוות הרב-מקצועי..."
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '10px 12px',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    lineHeight: 1.5
                  }}
                />
              </div>

              <div className="email-modal-actions" style={{ justifyContent: 'space-between', marginTop: '6px' }}>
                <button type="button" className="btn-cancel-modal" onClick={onClose} disabled={isLoading}>
                  ביטול
                </button>
                <button
                  type="button"
                  className="btn-submit-email"
                  onClick={handleAnalyze}
                  disabled={isLoading || !inputText.trim()}
                  style={{ padding: '8px 18px' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="tala-spin-icon" />
                      <span>מנתח אבחון וגוזר תוכנית...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>✨ נתח אבחון וגזור תוכנית ב-AI</span>
                    </>
                  )}
                </button>
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
