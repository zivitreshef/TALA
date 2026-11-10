import React, { useState, useMemo } from 'react';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import {
  FileUp,
  CheckCircle2,
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
  createDiagnosticDocumentRecord,
  addDiagnosticDocumentToStudent
} from '../../domain/diagnosticIntake';
import {
  validateDossierFileUpload,
  scanTextForMaliciousScripts
} from '../../domain/dossierSecurity';
import {
  saveDossierFileBlob,
  uploadDossierFileToCloud
} from '../../services/dossierFileStorage';
import {
  createDocumentSnippet,
  addSnippet,
  syncSnippetsToCombinedText
} from '../../domain/pedagogicalFeed';
import type {
  DiagnosticDocumentRecord,
  PedagogicalSnippet
} from '../../domain/types';

export interface DiagnosticIntakeStudentData {
  id?: string;
  name?: string;
  gender?: 'boy' | 'girl' | string;
  planType?: string;
  goals?: unknown[];
  studentGeneralBackground?: string;
  studentSupportReceived?: string;
  studentMainGoal?: string;
  strengthsExisting?: string;
  strengthsToEmpower?: string;
  diagnosticDocuments?: DiagnosticDocumentRecord[];
  pedagogicalSnippets?: PedagogicalSnippet[];
  teacherFreeText?: string;
  [key: string]: unknown;
}

export interface DiagnosticIntakeModalProps {
  formData: DiagnosticIntakeStudentData;
  isOpen?: boolean;
  isClosing?: boolean;
  onApplyIntake?: (updatedStudent: DiagnosticIntakeStudentData, newSnippet?: PedagogicalSnippet) => void;
  onClose?: () => void;
  initialText?: string;
  initialDocName?: string;
  authorName?: string;
}

export default function DiagnosticIntakeModal({
  formData,
  isOpen = true,
  isClosing: propIsClosing,
  onApplyIntake,
  onClose,
  initialText = '',
  initialDocName = '',
  authorName = ''
}: DiagnosticIntakeModalProps): React.JSX.Element | null {
  const anim = useModalAnimation({ isOpen, onClose });
  const effectiveClosing = propIsClosing ?? anim.isClosing;

  const [uploadedFileName, setUploadedFileName] = useState<string>(initialDocName || '');
  const [uploadedDocRecord, setUploadedDocRecord] = useState<DiagnosticDocumentRecord | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Highlighter and text selection states - MUST be declared unconditionally before any return
  const initialLines = useMemo<string[]>(() => {
    if (!initialText) return [];
    return initialText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [initialText]);

  const [extractedLines, setExtractedLines] = useState<string[]>(initialLines);
  const [selectedLineIndices, setSelectedLineIndices] = useState<Set<number>>(
    () => new Set(initialLines.map((_, i) => i))
  );
  const [viewMode, setViewMode] = useState<'highlighter' | 'freeText'>(
    initialLines.length > 0 ? 'highlighter' : 'freeText'
  );
  const [inputText, setInputText] = useState<string>(initialText || '');
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'success' | 'scanned_image'>(
    initialLines.length > 0 ? 'success' : 'idle'
  );

  if (!anim.shouldRender) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Multi-layer security validation: Size, extension allowlist, and binary magic bytes
    const securityCheck = await validateDossierFileUpload(file);
    if (!securityCheck.valid) {
      setErrorMessage(securityCheck.reason || 'הקובץ נחסם מטעמי אבטחה.');
      const inputEl = document.getElementById('diagnostic-file-input') as HTMLInputElement | null;
      if (inputEl) inputEl.value = '';
      return;
    }
    setErrorMessage('');
    setIsExtracting(true);

    try {
      const fileCheck = await validateDossierFileUpload(file);
      if (!fileCheck.valid) {
        setErrorMessage(fileCheck.reason || 'הקובץ אינו תואם את מדיניות האבטחה.');
        const inputEl = document.getElementById('diagnostic-file-input') as HTMLInputElement | null;
        if (inputEl) inputEl.value = '';
        setIsExtracting(false);
        return;
      }
      const extracted = await extractTextFromFile(file);
      const cleanExtracted = (extracted || '').trim();

      // Scan extracted content for malicious scripts/code injection
      const textScan = scanTextForMaliciousScripts(cleanExtracted);
      if (!textScan.valid) {
        setErrorMessage(textScan.reason || 'זוהה תוכן לא תקין בקובץ.');
        const inputEl = document.getElementById('diagnostic-file-input') as HTMLInputElement | null;
        if (inputEl) inputEl.value = '';
        return;
      }
      const ext = (file.name || '').split('.').pop()?.toLowerCase() || 'pdf';
      const sizeFormatted = file.size ? `${Math.round(file.size / 1024)} KB` : '';

      // Always create and preserve document record
      const docRecord = createDiagnosticDocumentRecord({
        fileName: file.name,
        fileType: ext,
        fullText: cleanExtracted,
        fileSizeFormatted: sizeFormatted
      });
      // Preserve original file blob in local dossier storage for downloading and viewing
      try {
        await saveDossierFileBlob(docRecord.id, file);
      } catch (saveErr) {
        console.warn('Failed to save file blob in IndexedDB:', saveErr);
      }

      // Upload original file to Firebase Storage for cross-teacher access
      try {
        const studentId = String(formData?.id || 'general');
        const cloudResult = await uploadDossierFileToCloud(docRecord.id, file, studentId);
        if (cloudResult?.storageUrl) {
          docRecord.storageUrl = cloudResult.storageUrl;
          docRecord.storagePath = cloudResult.storagePath || '';
        }
      } catch (cloudErr) {
        console.warn('Failed to upload file to Firebase Cloud Storage:', cloudErr);
      }

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

  const toggleLine = (idx: number): void => {
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

  const selectAllLines = (): void => {
    setSelectedLineIndices(new Set(extractedLines.map((_, i) => i)));
  };

  const clearAllLines = (): void => {
    setSelectedLineIndices(new Set());
  };

  const handleSaveAndAddToSnippets = (): void => {
    let selectedText = '';
    if (viewMode === 'highlighter' && extractedLines.length > 0) {
      selectedText = extractedLines.filter((_, i) => selectedLineIndices.has(i)).join('\n');
    } else {
      selectedText = inputText.trim();
    }

    if (!uploadedDocRecord && !selectedText) {
      setErrorMessage('נא להעלות קובץ או להזין טקסט כדי לשמור בתיק.');
      return;
    }

    let updated: DiagnosticIntakeStudentData = { ...formData };

    if (uploadedDocRecord) {
      updated = addDiagnosticDocumentToStudent(
        updated as Record<string, unknown>,
        uploadedDocRecord
      ) as DiagnosticIntakeStudentData;
    }

    let newSnippet: PedagogicalSnippet | undefined;
    if (selectedText) {
      newSnippet = createDocumentSnippet({
        documentId: uploadedDocRecord?.id,
        sourceTitle: uploadedFileName || initialDocName || 'מסמך רקע',
        content: selectedText,
        authorName: authorName || (formData.name ? `תיק ${formData.name}` : undefined)
      });
      updated.pedagogicalSnippets = addSnippet(updated.pedagogicalSnippets, newSnippet);
      updated.teacherFreeText = syncSnippetsToCombinedText(updated.pedagogicalSnippets);
    }

    onApplyIntake?.(updated, newSnippet);
    onClose?.();
  };

  return (
    <div className={`modal-backdrop ${effectiveClosing ? 'is-closing' : ''}`} onClick={onClose}>
      <div
        className={`modal-card email-report-modal ${effectiveClosing ? 'is-closing' : ''}`}
        dir="rtl"
        style={{ maxWidth: '750px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header email-modal-header">
          <div className="modal-title-row">
            <FileUp size={22} />
            <div>
              <h3>קליטת מסמך ושמירה בתיק התלמיד/ה</h3>
              <p className="modal-subtitle">
                בחרי את המשפטים החשובים – הם יתווספו אוטומטית לציר התובנות
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="privacy-sensitive-info-note" style={{ margin: 0 }}>
              🔒 <strong>שמירה על פרטיות:</strong> בעת העלאת קבצים או הזנת טקסט, נא להימנע מחשיפת מידע אישי רגיש או פרטים מזהים של התלמיד/ה ובני המשפחה (כגון שמות מלאים, מספרי תעודת זהות, טלפונים או כתובות). מומלץ להסיר פרטים מזהים לפני ההעלאה ולהשתמש בראשי תיבות בלבד.
            </div>

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
                      תמיכה בקובצי Word (DOCX), PDF, טקסט (TXT) וסריקות (עד 20MB לקובץ)
                    </div>
                  </div>
                )}
                <input
                  id="diagnostic-file-input"
                  type="file"
                  accept=".docx,.pdf,.txt,.csv,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => void handleFileUpload(e)}
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
                        הקובץ נשמר בתיק התלמיד/ה. סמני בעזרת המרקר את השורות שברצונך שיועתקו לתובנות.
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
                        תוכלי להדביק או להקליד למטה פסקאות נבחרות, או לשמור אותו בתיק כפי שהוא.
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
                  <span>2. בחירת שורות מפתח להוספה לציר התובנות:</span>
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
                      סמני את השורות החשובות שברצונך להעביר לציר התובנות:
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
                  placeholder="כאן יופיע הטקסט מהקובץ שתעלי, או שתוכלי להדביק כאן פסקאות נבחרות ישירות..."
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
            </div>

            {/* Action Buttons */}
            <div className="email-modal-actions" style={{ justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="btn-cancel-modal"
                onClick={onClose}
                disabled={isExtracting}
              >
                ביטול
              </button>

              <button
                type="button"
                className="btn-submit-email"
                onClick={handleSaveAndAddToSnippets}
                disabled={isExtracting}
                style={{
                  padding: '8px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={16} />
                <span>שמור בתיק והוסף לתובנות</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
