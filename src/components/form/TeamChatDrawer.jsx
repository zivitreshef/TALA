import React, { useState } from 'react';
import { MessageSquare, Send, Trash2, X, Clock, Pin, AlertCircle } from 'lucide-react';

export const AUTHOR_COLOR_THEMES = [
  {
    bg: '#f5f3ff', // Soft violet/purple
    border: '#ddd6fe',
    avatarBg: '#7c3aed',
    badgeBg: '#ede9fe',
    badgeColor: '#6d28d9'
  },
  {
    bg: '#eff6ff', // Soft blue
    border: '#bfdbfe',
    avatarBg: '#2563eb',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8'
  },
  {
    bg: '#f0fdf4', // Soft emerald green
    border: '#bbf7d0',
    avatarBg: '#059669',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d'
  },
  {
    bg: '#fffbeb', // Soft warm amber
    border: '#fde68a',
    avatarBg: '#d97706',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309'
  },
  {
    bg: '#fff1f2', // Soft coral rose
    border: '#fecdd3',
    avatarBg: '#e11d48',
    badgeBg: '#ffe4e6',
    badgeColor: '#be123c'
  },
  {
    bg: '#ecfeff', // Soft cyan/aqua
    border: '#a5f3fc',
    avatarBg: '#0891b2',
    badgeBg: '#cffafe',
    badgeColor: '#0e7490'
  }
];

export function getAuthorColorTheme(authorEmail = '') {
  const clean = String(authorEmail || '').trim().toLowerCase();
  if (!clean) return AUTHOR_COLOR_THEMES[0];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AUTHOR_COLOR_THEMES.length;
  return AUTHOR_COLOR_THEMES[index];
}

const DRAWER_QUICK_CHIPS = [
  'נא לבדוק מטרות טיפוליות',
  'עודכן לקראת ישיבת צוות',
  'אשמח להתייעצות בנושא'
];

export default function TeamChatDrawer({
  isOpen,
  onClose,
  studentName = '',
  teamMessages = [],
  currentUser = {},
  sharedWith = [],
  onSendMessage,
  onRetractMessage
}) {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const myEmail = String(currentUser?.email || '').trim().toLowerCase();
  const sortedMessages = [...(teamMessages || [])].sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return da - db;
  });

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !onSendMessage) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('he-IL', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 1050,
        display: 'flex',
        justifyContent: 'flex-end', // Aligns to the LEFT side in RTL mode
        backdropFilter: 'blur(2px)',
        direction: 'rtl'
      }}
    >
      <div
        className="team-chat-drawer"
        data-testid="team-chat-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
          borderRight: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1051,
          animation: 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#ede9fe',
                color: '#6d28d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                שיח צוות ותיעוד שיתוף
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                {studentName ? `${studentName} • ` : ''}
                {sharedWith.length > 0 ? `${sharedWith.length + 1} אנשי צוות בשיח` : 'צוות התלמיד/ה'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="סגור חלונית שיח"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: '#f8fafc'
          }}
        >
          {sortedMessages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '24px',
                color: '#64748b'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#e2e8f0',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}
              >
                <MessageSquare size={22} />
              </div>
              <strong style={{ fontSize: '14px', color: '#334155', marginBottom: '6px' }}>
                אין עדיין הודעות בשיח הצוות
              </strong>
              <p style={{ fontSize: '12.5px', margin: 0, lineHeight: 1.5 }}>
                זהו מקום ייעודי לתקשורת, שיתוף משימות ובקשות לעדכון מטרות בין כל אנשי הצוות המשותפים.
              </p>
            </div>
          ) : (
            sortedMessages.map((msg) => {
              const isMine = myEmail && String(msg.authorEmail || '').trim().toLowerCase() === myEmail;
              const isHandoff = msg.type === 'share_handoff';
              const initialLetter = (msg.authorName || msg.authorEmail || 'צ').trim().charAt(0);
              const theme = getAuthorColorTheme(msg.authorEmail);

              return (
                <div
                  key={msg.id}
                  style={{
                    backgroundColor: msg.isDeleted
                      ? '#f1f5f9'
                      : theme.bg,
                    border: msg.isDeleted
                      ? '1px dashed #cbd5e1'
                      : `1.5px solid ${theme.border}`,
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: msg.isDeleted ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  {/* Top Row: Author meta & Delete action */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          backgroundColor: theme.avatarBg,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {initialLetter}
                      </div>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                          {msg.authorName || msg.authorEmail}
                        </span>
                        {isMine && (
                          <span style={{ fontSize: '11px', color: '#64748b', marginRight: '4px' }}>
                            (אני)
                          </span>
                        )}
                        {msg.authorRole && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: theme.badgeColor,
                              backgroundColor: theme.badgeBg,
                              borderRadius: '4px',
                              padding: '1px 6px',
                              marginRight: '6px',
                              fontWeight: 600
                            }}
                          >
                            {msg.authorRole}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Clock size={11} />
                        {formatTimestamp(msg.createdAt)}
                      </span>

                      {/* Author-only retract button */}
                      {isMine && !msg.isDeleted && onRetractMessage && (
                        <button
                          type="button"
                          data-testid={`retract-${msg.id}`}
                          onClick={() => onRetractMessage(msg.id)}
                          title="מחק את ההודעה שלי"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Share Handoff Tag */}
                  {isHandoff && !msg.isDeleted && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#6d28d9',
                        marginTop: '2px'
                      }}
                    >
                      <Pin size={11} />
                      <span>
                        הודעת שיתוף תוכנית
                        {msg.recipientName ? ` ➔ ${msg.recipientName}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Message Content */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12.5px',
                      lineHeight: 1.5,
                      color: msg.isDeleted ? '#94a3b8' : '#334155',
                      fontStyle: msg.isDeleted ? 'italic' : 'normal',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Composer Area */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Quick chips */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '2px'
            }}
          >
            {DRAWER_QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setInputText((prev) => (prev ? `${prev} ${chip}` : chip))}
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '999px',
                  padding: '3px 9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                + {chip}
              </button>
            ))}
          </div>

          {/* Input & Send Button */}
          <form
            onSubmit={handleSend}
            style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, 800))}
                onKeyDown={handleKeyDown}
                placeholder="כתבי הודעה או עדכון לצוות... (Shift+Enter לשורה חדשה)"
                maxLength={800}
                rows={2}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  resize: 'none',
                  fontFamily: 'inherit',
                  color: '#1e293b',
                  lineHeight: 1.4
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '6px',
                  bottom: '6px',
                  fontSize: '10px',
                  color: inputText.length >= 750 ? '#dc2626' : '#94a3b8'
                }}
              >
                {inputText.length}/800
              </span>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              title="שלח הודעה לצוות"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: inputText.trim() ? '#4f46e5' : '#e2e8f0',
                color: inputText.trim() ? '#ffffff' : '#94a3b8',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
