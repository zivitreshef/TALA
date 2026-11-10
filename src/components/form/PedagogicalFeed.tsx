import React, { useState, useRef, useEffect } from 'react';
import { saveAudioRecordBlob, getAudioRecordBlob, uploadAudioRecordToCloud } from '../../services/dossierFileStorage';
import { transcribeAudioWithGemini } from '../../services/audioTranscriptionService';
import VoiceObservationRecorder from '../voice/VoiceObservationRecorder';
import {
  FileText,
  User,
  Trash2,
  Paperclip,
  Save,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  Lock,
  Play,
  Pause,
  Pencil,
  Check,
  X

} from 'lucide-react';
import type { PedagogicalSnippet } from '../../domain/types';
import { createTeacherNoteSnippet, updateSnippet } from '../../domain/pedagogicalFeed';

export interface SnippetColorTheme {
  cardBorder: string;
  headerBorder: string;
  avatarBg: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  quoteBg: string;
  quoteBorder: string;
  titleColor: string;
}

export const SNIPPET_COLOR_PALETTES: SnippetColorTheme[] = [
  {
    // 0: Soft Indigo / Blue
    cardBorder: '#e0e7ff',
    headerBorder: '#eef2ff',
    avatarBg: '#4f46e5',
    badgeBg: '#e0e7ff',
    badgeColor: '#3730a3',
    badgeBorder: '#c7d2fe',
    quoteBg: '#f8faff',
    quoteBorder: '#e0e7ff',
    titleColor: '#1e1b4b'
  },
  {
    // 1: Soft Teal / Emerald
    cardBorder: '#ccfbf1',
    headerBorder: '#f0fdfa',
    avatarBg: '#0d9488',
    badgeBg: '#ccfbf1',
    badgeColor: '#0f766e',
    badgeBorder: '#99f6e4',
    quoteBg: '#f0fdfa',
    quoteBorder: '#ccfbf1',
    titleColor: '#134e4a'
  },
  {
    // 2: Soft Purple / Violet
    cardBorder: '#f3e8ff',
    headerBorder: '#faf5ff',
    avatarBg: '#9333ea',
    badgeBg: '#fae8ff',
    badgeColor: '#86198f',
    badgeBorder: '#f0abfc',
    quoteBg: '#fdf4ff',
    quoteBorder: '#f5d0fe',
    titleColor: '#3b0764'
  },
  {
    // 3: Soft Warm Amber
    cardBorder: '#fef3c7',
    headerBorder: '#fffbeb',
    avatarBg: '#d97706',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    badgeBorder: '#fde68a',
    quoteBg: '#fffdf5',
    quoteBorder: '#fde68a',
    titleColor: '#78350f'
  },
  {
    // 4: Soft Coral Rose
    cardBorder: '#ffe4e6',
    headerBorder: '#fff1f2',
    avatarBg: '#e11d48',
    badgeBg: '#ffe4e6',
    badgeColor: '#be123c',
    badgeBorder: '#fecdd3',
    quoteBg: '#fff5f7',
    quoteBorder: '#fecdd3',
    titleColor: '#881337'
  },
  {
    // 5: Soft Sky / Cyan
    cardBorder: '#e0f2fe',
    headerBorder: '#f0f9ff',
    avatarBg: '#0284c7',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
    badgeBorder: '#bae6fd',
    quoteBg: '#f0f9ff',
    quoteBorder: '#bae6fd',
    titleColor: '#0c4a6e'
  }
];

export interface PedagogicalFeedProps {
  snippets: PedagogicalSnippet[];
  onAddSnippet: (snippet: PedagogicalSnippet) => void;
  onUpdateSnippet?: (snippetId: string, updatedContent: string) => void;
  onRemoveSnippet: (snippetId: string) => void;
  onOpenUploadModal: () => void;
  onSaveDraft?: () => void | Promise<void>;
  onTriggerAiAnalysis: (overrideSnippets?: PedagogicalSnippet[]) => void | Promise<void>;
  isAnalyzing?: boolean;
  isLocked?: boolean;
  currentUserName?: string;
  onboardingStep?: number;
}

export default function PedagogicalFeed({
  snippets = [],
  onAddSnippet,
  onUpdateSnippet,
  onRemoveSnippet,
  onOpenUploadModal,
  onSaveDraft,
  onTriggerAiAnalysis,
  isAnalyzing = false,
  isLocked = false,
  currentUserName = '',
  onboardingStep = 0
}: PedagogicalFeedProps): React.JSX.Element {
  const [newNoteText, setNewNoteText] = useState('');
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const handleStartEdit = (snippet: PedagogicalSnippet): void => {
    setEditingSnippetId(snippet.id);
    setEditingText(snippet.content);
  };

  const handleCancelEdit = (): void => {
    setEditingSnippetId(null);
    setEditingText('');
  };

  const handleSaveEdit = (snippetId: string): void => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    if (onUpdateSnippet) {
      onUpdateSnippet(snippetId, trimmed);
    }
    setEditingSnippetId(null);
    setEditingText('');
  };
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);
  const activeAudioRef = useRef<{ audio: HTMLAudioElement; urlToRevoke?: string } | null>(null);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.audio.pause();
        if (activeAudioRef.current.urlToRevoke) {
          URL.revokeObjectURL(activeAudioRef.current.urlToRevoke);
        }
      }
    };
  }, []);

  const handlePlaySnippetAudio = async (snippet: PedagogicalSnippet) => {
    if (playingSnippetId === snippet.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.audio.pause();
      }
      setPlayingSnippetId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.audio.pause();
      if (activeAudioRef.current.urlToRevoke) {
        URL.revokeObjectURL(activeAudioRef.current.urlToRevoke);
      }
      activeAudioRef.current = null;
    }

    let srcUrl = snippet.audioStorageUrl;
    let urlToRevoke: string | undefined;

    const localBlob = await getAudioRecordBlob(snippet.id);
    if (localBlob) {
      srcUrl = URL.createObjectURL(localBlob);
      urlToRevoke = srcUrl;
    }

    if (!srcUrl) return;

    const audio = new Audio(srcUrl);
    activeAudioRef.current = { audio, urlToRevoke };
    audio.onended = () => {
      setPlayingSnippetId(null);
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      activeAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingSnippetId(null);
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      activeAudioRef.current = null;
    };

    try {
      await audio.play();
      setPlayingSnippetId(snippet.id);
    } catch (_) {
      setPlayingSnippetId(null);
    }
  };

  const formatSnippetTime = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const handleManualAddNote = async (): Promise<void> => {
    let text = newNoteText.trim();
    if (!text && pendingAudioBlob) {
      try {
        const transcript = await transcribeAudioWithGemini(pendingAudioBlob);
        if (transcript) {
          text = transcript;
        }
      } catch (_) {}
    }
    if (!text && !pendingAudioBlob) return;
    if (!text) {
      text = 'הקלטת תצפית קולית';
    }
    const author = currentUserName ? `${currentUserName} (אני)` : 'אני';
    const snippet = createTeacherNoteSnippet(text, author);
    if (pendingAudioBlob) {
      snippet.hasAudio = true;
      const audioToSave = pendingAudioBlob;
      saveAudioRecordBlob(snippet.id, audioToSave).catch(() => {});
      uploadAudioRecordToCloud(snippet.id, audioToSave).then((cloudRes) => {
        if (cloudRes && cloudRes.storageUrl) {
          snippet.audioStorageUrl = cloudRes.storageUrl;
        }
      }).catch(() => {});
      setPendingAudioBlob(null);
    }
    onAddSnippet(snippet);
    setNewNoteText('');
  };

  const handleSaveDraftClick = async (): Promise<void> => {
    if (onSaveDraft) {
      await onSaveDraft();
    }
    const now = new Date();
    setLastSavedTime(
      now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    );
    setSaveToastVisible(true);
    setTimeout(() => {
      setSaveToastVisible(false);
    }, 3500);
  };

  const activeSourcesCount = snippets.length;

  const hasUnsavedNewNote = Boolean(newNoteText.trim() || pendingAudioBlob);
  const hasUnsavedEdit = Boolean(editingSnippetId && editingText.trim());
  const hasAnyContent = snippets.length > 0 || hasUnsavedNewNote || hasUnsavedEdit;
  const isAiDisabled = isLocked || isAnalyzing || !hasAnyContent;

  const handleTriggerAiWithAutoCommit = async (): Promise<void> => {
    if (isAiDisabled) return;

    let currentSnippets = [...snippets];

    // 1. Auto-commit pending inline edit if active
    if (editingSnippetId && editingText.trim()) {
      const trimmed = editingText.trim();
      if (onUpdateSnippet) {
        onUpdateSnippet(editingSnippetId, trimmed);
      }
      currentSnippets = updateSnippet(currentSnippets, editingSnippetId, trimmed);
      setEditingSnippetId(null);
      setEditingText('');
    }

    // 2. Auto-commit pending new note or audio transcript if present
    let noteText = newNoteText.trim();
    if (!noteText && pendingAudioBlob) {
      try {
        const transcript = await transcribeAudioWithGemini(pendingAudioBlob);
        if (transcript) {
          noteText = transcript;
        }
      } catch (_) {}
    }

    if (noteText || pendingAudioBlob) {
      if (!noteText) {
        noteText = 'הקלטת תצפית קולית';
      }
      const author = currentUserName ? `${currentUserName} (אני)` : 'אני';
      const snippet = createTeacherNoteSnippet(noteText, author);
      if (pendingAudioBlob) {
        snippet.hasAudio = true;
        const audioToSave = pendingAudioBlob;
        saveAudioRecordBlob(snippet.id, audioToSave).catch(() => {});
        uploadAudioRecordToCloud(snippet.id, audioToSave)
          .then((cloudRes) => {
            if (cloudRes && cloudRes.storageUrl) {
              snippet.audioStorageUrl = cloudRes.storageUrl;
            }
          })
          .catch(() => {});
        setPendingAudioBlob(null);
      }
      onAddSnippet(snippet);
      currentSnippets = [...currentSnippets, snippet];
      setNewNoteText('');
    }

    await onTriggerAiAnalysis(currentSnippets);
  };

  return (
    <div
      className="pedagogical-feed-container"
      dir="rtl"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden'
      }}
    >
      {/* Slim Feed Toolbar (eliminates duplicate icon/title row below parent accordion) */}
      <div
        style={{
          background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
            תובנות ממסמכים ומהתצפית האישית שלך – מזינים יחד את ה-AI
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '1px 8px',
              borderRadius: '999px',
              background: activeSourcesCount > 0 ? '#ecfdf5' : '#f1f5f9',
              color: activeSourcesCount > 0 ? '#047857' : '#64748b',
              border: activeSourcesCount > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
            }}
          >
            {activeSourcesCount === 0
              ? '0 מקורות פעילים'
              : activeSourcesCount === 1
              ? 'מקור 1 פעיל'
              : `${activeSourcesCount} מקורות פעילים`}
          </span>
        </div>

        {/* Action Buttons in Toolbar */}
        {!isLocked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenUploadModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                borderRadius: '7px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="העלאת קובץ Word, PDF או סריקה לשמירה בתיק והוספת תובנות"
            >
              <Paperclip size={13} />
              <span>העלאת מסמך נוסף</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSaveDraftClick()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="שמירת התובנות והשינויים בתיק התלמיד/ה ללא הפעלת AI"
            >
              <Save size={13} />
              <span>שמור טיוטה</span>
            </button>
          </div>
        )}
      </div>

      {/* Feed Body */}
      <div style={{ padding: '10px 14px', background: '#fafafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Save Toast Notification */}
        {saveToastVisible && (
          <div
            style={{
              background: '#059669',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.2)',
              animation: 'fadeIn 0.2s ease-in'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} />
              <span>✓ כל התובנות והשינויים נשמרו בתיק התלמיד/ה בהצלחה!</span>
            </div>
            {lastSavedTime && (
              <span style={{ fontSize: '11px', opacity: 0.85 }}>{lastSavedTime}</span>
            )}
          </div>
        )}

        {/* Option A: Slim Inline Empty State Strip */}
        {snippets.length === 0 && (
          <div
            className="pedagogical-feed-empty-strip"
            style={{
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '12px',
              color: '#64748b'
            }}
          >
            <FileText size={15} style={{ color: '#6366f1', flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontWeight: 700, color: '#334155' }}>
              ציר התובנות ריק כרגע
            </span>
            <span style={{ color: '#cbd5e1' }} aria-hidden="true">•</span>
            <span>
              ניתן ללחוץ על ״העלאת מסמך נוסף״ למעלה או להקליד תצפית אישית למטה.
            </span>
          </div>
        )}

        {/* List of Snippet Cards with rotating themes */}
        {snippets.map((snippet, idx) => {
          const isDoc = snippet.sourceType === 'document';
          const theme = SNIPPET_COLOR_PALETTES[idx % SNIPPET_COLOR_PALETTES.length];

          return (
            <div
              key={snippet.id}
              style={{
                background: '#ffffff',
                border: `1.5px solid ${theme.cardBorder}`,
                borderRadius: '9px',
                padding: '10px 12px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '6px',
                  borderBottom: `1px solid ${theme.headerBorder}`,
                  marginBottom: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: isDoc ? '6px' : '999px',
                      background: theme.avatarBg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}
                  >
                    {isDoc ? <FileText size={14} /> : <User size={14} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          color: theme.titleColor
                        }}
                      >
                        {snippet.sourceTitle}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: '999px',
                          background: theme.badgeBg,
                          color: theme.badgeColor,
                          border: `1px solid ${theme.badgeBorder}`
                        }}
                      >
                        {isDoc ? 'מסמך רקע' : 'תצפית מורה'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {Boolean(snippet.hasAudio || snippet.audioStorageUrl) && (
                    <button
                      type="button"
                      onClick={() => void handlePlaySnippetAudio(snippet)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: playingSnippetId === snippet.id ? '#15803d' : '#f0fdf4',
                        color: playingSnippetId === snippet.id ? '#ffffff' : '#15803d',
                        border: '1px solid #86efac',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="השמעת הקלטה קולית של התצפית"
                    >
                      {playingSnippetId === snippet.id ? <Pause size={12} /> : <Play size={12} />}
                      <span>{playingSnippetId === snippet.id ? 'השהה' : 'השמעת הקלטה'}</span>
                    </button>
                  )}
                  {snippet.createdAt && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {formatSnippetTime(snippet.createdAt)}
                    </span>
                  )}
                  {!isLocked && (
                    <>
                      <button
                        type="button"
                        onClick={() => (editingSnippetId === snippet.id ? handleCancelEdit() : handleStartEdit(snippet))}
                        title={editingSnippetId === snippet.id ? 'ביטול עריכה' : 'עריכת תובנה זו'}
                        aria-label={editingSnippetId === snippet.id ? 'ביטול עריכה' : 'עריכת תובנה זו'}
                        style={{
                          background: editingSnippetId === snippet.id ? '#ede9fe' : 'transparent',
                          border: 'none',
                          color: editingSnippetId === snippet.id ? '#6d28d9' : '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (editingSnippetId !== snippet.id) {
                            e.currentTarget.style.color = '#4f46e5';
                            e.currentTarget.style.background = '#eef2ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (editingSnippetId !== snippet.id) {
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSnippet(snippet.id)}
                      title="הסרת תובנה זו"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#e11d48';
                        e.currentTarget.style.background = '#ffe4e6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Snippet Content */}
            {editingSnippetId === snippet.id ? (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  rows={3}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '7px',
                    border: '1.5px solid #6366f1',
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.45,
                    outline: 'none',
                    resize: 'vertical',
                    background: '#ffffff',
                    color: '#1e293b'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSaveEdit(snippet.id);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      handleCancelEdit();
                    }
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#f8fafc',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <X size={13} />
                    <span>ביטול</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(snippet.id)}
                    disabled={!editingText.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: editingText.trim() ? '#4f46e5' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: editingText.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <Check size={13} />
                    <span>שמירה</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                  color: '#1e293b',
                  background: theme.quoteBg,
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: `1px solid ${theme.quoteBorder}`,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {snippet.content}
              </div>
            )}
            </div>
          );
        })}

        {/* Compact Add New Observation Box */}
        {!isLocked && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '10px 12px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '6px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>הוסיפי תובנה, תצפית או עדכון חדש:</span>
                </label>
                <VoiceObservationRecorder
                  disabled={isLocked}
                  baseText={newNoteText}
                  onTranscript={(fullText) => {
                    setNewNoteText(fullText);
                  }}
                  onAudioReady={(blob) => setPendingAudioBlob(blob)}
                  onClearAudio={() => setPendingAudioBlob(null)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Sample descriptions ONLY shown inside onboarding user journey */}
                {Boolean(onboardingStep && onboardingStep > 0) && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setNewNoteText(
                          'יונתן לומד בכיתה רגילה ומקבל תמיכה שבועית מסל שילוב. מאובחן עם הפרעת קשב ופעלתנות יתר (ADHD) וקשיי ויסות חושי. מפגין סקרנות יוצאת דופן ואינטליגנציה תקינה, אך מתקשה להתמיד במשימות כתיבה ממושכות, מגלה מוסחות גבוהה ברעש כיתתי, ונזקק לתיווך במעברים בין שיעור להפסקה.'
                        );
                      }}
                      style={{
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🪄 דוגמה לבי"ס
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewNoteText(
                          'נועם ילד מתוק, סקרן וחברותי בן 5.5 בגן חובה. מתקשה במעברים בין חצר למפגש, זקוק לתיווך בפתרון קונפליקטים ובמשחק משותף במוקדי הגן, ומתקשה באחיזת מספריים ועפרון. מגלה חוזקות רבות במוזיקה, יצירתיות בקוביות ואמפתיה רבה לחבריו לגן.'
                        );
                      }}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🪄 דוגמה לגן
                    </button>
                  </div>
                )}

                <span
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Lock size={12} aria-hidden="true" />
                  <span>ללא שמות מלאים או פרטים מזהים</span>
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <textarea
                rows={2}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="לדוגמה: במפגש בוקר היום הצליח להמתין לתורו יפה, בשיעור ספורט נזקק לעידוד..."
                style={{
                  flex: '1 1 240px',
                  width: '100%',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  padding: '7px 10px',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                  lineHeight: 1.4,
                  outline: 'none',
                  resize: 'vertical'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleManualAddNote();
                  }
                }}
              />

              <button
                type="button"
                onClick={handleManualAddNote}
                disabled={!newNoteText.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: newNoteText.trim() ? '#0f172a' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s ease'
                }}
              >
                <Plus size={13} />
                <span>הוסף לתובנות</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slim Card Footer: Unified AI Generation Trigger */}
      <div
        style={{
          background: 'linear-gradient(180deg, #f8faff 0%, #f1f5f9 100%)',
          borderTop: '1px solid #e2e8f0',
          color: '#1e293b',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '8px',
          position: 'relative'
        }}
      >
        {onboardingStep === 3 && (
          <div
            className="onboarding-tour-arrow-box"
            style={{ position: 'absolute', top: '-46px', left: '16px', zIndex: 60 }}
          >
            <span className="tour-arrow-anim">👈</span>
            <span>שלב 3: לחצי כאן על "ניתוח כל המקורות ב-AI" להפקת תוכנית מלאה!</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#1e293b'
              }}
            >
              מוכנה להפיק מטרות ויעדים?
            </h4>
            <span
              style={{
                fontSize: '12px',
                color: '#64748b'
              }}
            >
              ה-AI יסכם יחד את כל המסמכים שהעלית ואת התצפיות שלך לכדי מטרות ויעדים מותאמים.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <button
              type="button"
              onClick={() => void handleTriggerAiWithAutoCommit()}
              disabled={isAiDisabled}
              title={
                !hasAnyContent
                  ? 'יש להקליד תצפית בתיבה או להעלות מסמך כדי להפעיל את ניתוח ה-AI'
                  : 'לחצי להפקת יעדים ומטרות מכל המקורות'
              }
              aria-label="ניתוח כל המקורות ב-AI"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#4f46e5',
                color: '#ffffff',
                border: '1px solid #4338ca',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: isAiDisabled ? 'not-allowed' : 'pointer',
                opacity: isAiDisabled ? 0.6 : 1,
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.18)',
                transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={14} className="tala-spin-icon" />
                  <span>מעבד את כל המקורות ב-AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>ניתוח כל המקורות ב-AI</span>
                </>
              )}
            </button>
            {!hasAnyContent && !isLocked && !isAnalyzing && (
              <span
                className="ai-trigger-empty-helper-text"
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '1px'
                }}
              >
                הקלידי תצפית בתיבה או העלי מסמך להפעלת הניתוח
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
