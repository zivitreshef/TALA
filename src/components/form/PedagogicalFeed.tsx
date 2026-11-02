import React, { useState } from 'react';
import {
  FileText,
  User,
  Trash2,
  Paperclip,
  Save,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus
} from 'lucide-react';
import type { PedagogicalSnippet } from '../../domain/types';
import { createTeacherNoteSnippet } from '../../domain/pedagogicalFeed';

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
  onRemoveSnippet: (snippetId: string) => void;
  onOpenUploadModal: () => void;
  onSaveDraft?: () => void | Promise<void>;
  onTriggerAiAnalysis: () => void | Promise<void>;
  isAnalyzing?: boolean;
  isLocked?: boolean;
  currentUserName?: string;
  onboardingStep?: number;
}

export default function PedagogicalFeed({
  snippets = [],
  onAddSnippet,
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
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

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

  const handleManualAddNote = (): void => {
    const text = newNoteText.trim();
    if (!text) return;
    const author = currentUserName ? `${currentUserName} (אני)` : 'אני';
    const snippet = createTeacherNoteSnippet(text, author);
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

  return (
    <div
      className="pedagogical-feed-container"
      dir="rtl"
      style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}
    >
      {/* Feed Header */}
      <div
        style={{
          background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 50%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              background: '#ede9fe',
              color: '#6d28d9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                תיאור הילד/ה, תובנות ומסמכי רקע
              </h3>
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
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              תובנות שנאספו ממסמכים ומהתצפית האישית שלך – כולם מזינים יחד את ה-AI
            </p>
          </div>
        </div>

        {/* Action Buttons in Header */}
        {!isLocked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenUploadModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                borderRadius: '8px',
                padding: '6px 12px',
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
                gap: '6px',
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 12px',
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
      <div style={{ padding: '14px 18px', background: '#fafafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Save Toast Notification */}
        {saveToastVisible && (
          <div
            style={{
              background: '#059669',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '8px 14px',
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

        {/* Empty State */}
        {snippets.length === 0 && (
          <div
            style={{
              background: '#ffffff',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '20px 16px',
              textAlign: 'center',
              color: '#64748b'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📝</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
              ציר התובנות ריק כרגע
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '3px', maxWidth: '480px', margin: '3px auto 0 auto' }}>
              תוכלי ללחוץ על ״העלאת מסמך נוסף״ כדי לצרף אבחון, או להקליד למטה תצפית אישית שלך.
            </div>
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
                borderRadius: '10px',
                padding: '12px 14px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${theme.headerBorder}`,
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: isDoc ? '6px' : '999px',
                      background: theme.avatarBg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}
                  >
                    {isDoc ? <FileText size={15} /> : <User size={15} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {snippet.createdAt && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {formatSnippetTime(snippet.createdAt)}
                    </span>
                  )}
                  {!isLocked && (
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
                  )}
                </div>
              </div>

              {/* Snippet Content */}
              <div
                style={{
                  fontSize: '0.86rem',
                  lineHeight: 1.5,
                  color: '#1e293b',
                  background: theme.quoteBg,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.quoteBorder}`,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {snippet.content}
              </div>
            </div>
          );
        })}

        {/* Add New Observation Box */}
        {!isLocked && (
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '12px 14px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '8px',
                flexWrap: 'wrap'
              }}
            >
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
            </div>

            <textarea
              rows={2}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="לדוגמה: במפגש בוקר היום הצליח להמתין לתורו יפה, בשיעור ספורט נזקק לעידוד..."
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '9px 12px',
                fontSize: '0.86rem',
                fontFamily: 'inherit',
                lineHeight: 1.45,
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                🔒 ללא שמות מלאים או פרטים מזהים
              </span>

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
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
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

      {/* Card Footer: Unified AI Generation Trigger */}
      <div
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #6366f1 100%)',
          color: '#ffffff',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
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
            gap: '12px'
          }}
        >
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '0.94rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>✨ מוכנה להפיק מטרות ויעדים?</span>
            </h4>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '12px',
                color: '#ede9fe',
                maxWidth: '540px'
              }}
            >
              ה-AI יסכם יחד את כל המסמכים שהעלית ואת התצפיות שלך לכדי מטרות ויעדים מותאמים.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void onTriggerAiAnalysis()}
            disabled={isLocked || isAnalyzing || snippets.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: '#ffffff',
              color: '#5b21b6',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isLocked || isAnalyzing || snippets.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isLocked || isAnalyzing || snippets.length === 0 ? 0.65 : 1,
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="tala-spin-icon" />
                <span>מעבד את כל המקורות ב-AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>ניתוח כל המקורות ב-AI ✨</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
