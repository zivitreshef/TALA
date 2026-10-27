import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  User,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  Minimize2,
  Trash2
} from 'lucide-react';
import {
  subscribeToSupportThread,
  sendChatMessageToCloud,
  markThreadReadInCloud,
  clearSupportThreadInCloud
} from '../../services/supportChatService.js';
import { SENDER_ROLES, countUnreadMessages } from '../../domain/supportChat.js';

export default function TeacherChatWidget({
  currentUser = null,
  initialUserEmail = '',
  initialUserName = '',
  allowedUsers = [],
  emailEngineConfig = null,
  defaultOpen = false,
  isOpenControlled = null,
  onToggleOpen = null,
  onCloseCustom = null
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = typeof isOpenControlled === 'boolean' ? isOpenControlled : internalOpen;

  const [thread, setThread] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const messagesEndRef = useRef(null);

  const effectiveEmail = String(currentUser?.email || initialUserEmail || '').trim().toLowerCase();
  const effectiveName = String(currentUser?.name || initialUserName || 'מורה').trim();

  // Scroll to bottom whenever messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [thread?.messages, isOpen]);

  // Subscribe to real-time support thread
  useEffect(() => {
    if (!effectiveEmail) return;

    const unsubscribe = subscribeToSupportThread(effectiveEmail, (cloudThread) => {
      setThread(cloudThread);
      if (isOpen && cloudThread?.unreadByUser) {
        markThreadReadInCloud(cloudThread.id || effectiveEmail, SENDER_ROLES.USER);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [effectiveEmail, isOpen]);

  // Handle opening/closing chat and clearing unread badge
  const handleToggle = () => {
    const nextState = !isOpen;
    if (typeof onToggleOpen === 'function') {
      onToggleOpen(nextState);
    } else {
      setInternalOpen(nextState);
    }

    if (nextState && thread?.unreadByUser) {
      markThreadReadInCloud(thread.id || effectiveEmail, SENDER_ROLES.USER);
    }
    if (!nextState && typeof onCloseCustom === 'function') {
      onCloseCustom();
    }
  };

  // Clear chat history
  const handleClearHistory = async () => {
    if (!thread?.messages || thread.messages.length === 0) return;
    const confirmed = window.confirm('האם לסיים את הפנייה ולנקות את היסטוריית השיחה בצ\'אט?');
    if (!confirmed) return;

    try {
      await clearSupportThreadInCloud(effectiveEmail);
      setThread((prev) => (prev ? { ...prev, messages: [], lastMessageText: '' } : null));
    } catch (err) {
      console.warn('Failed to clear chat history:', err);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const cleanText = inputMessage.trim();
    if (!cleanText || isSending || !effectiveEmail) return;

    setIsSending(true);
    try {
      const admins = (allowedUsers || []).filter((u) => u.role === 'admin' && u.active !== false);

      await sendChatMessageToCloud({
        existingThread: thread,
        userEmail: effectiveEmail,
        userName: effectiveName,
        topic: '💬 פנייה מתוך צ\'אט התמיכה',
        text: cleanText,
        senderRole: SENDER_ROLES.USER,
        senderName: effectiveName,
        admins,
        emailConfig: emailEngineConfig
      });

      setInputMessage('');
    } catch (err) {
      console.warn('Error sending support message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const unreadCount = countUnreadMessages(thread, SENDER_ROLES.USER);

  if (!effectiveEmail && !currentUser) {
    return null;
  }

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: '22px',
        left: '22px',
        zIndex: 2100,
        fontFamily: "'Rubik', 'Segoe UI', Tahoma, Arial, sans-serif"
      }}
    >
      {/* Floating launcher button in blue & purple theme (watermarked fade when idle, vibrant on hover) */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggle}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: isButtonHovered
              ? 'linear-gradient(135deg, #4a88c7 0%, #7c65b8 100%)'
              : 'linear-gradient(135deg, rgba(74, 136, 199, 0.16) 0%, rgba(124, 101, 184, 0.18) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: isButtonHovered ? '#ffffff' : '#334e68',
            border: isButtonHovered
              ? '1.5px solid #7c65b8'
              : '1.5px solid rgba(124, 101, 184, 0.35)',
            boxShadow: isButtonHovered
              ? '0 8px 24px rgba(74, 136, 199, 0.32)'
              : '0 4px 14px rgba(124, 101, 184, 0.1)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            opacity: isButtonHovered ? 1 : 0.9,
            transition: 'all 0.22s ease-in-out',
            outline: 'none'
          }}
          title="פתח צ'אט תמיכה ישיר מול מנהלת המערכת"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MessageCircle
              size={17}
              color={isButtonHovered ? '#ffffff' : '#7c65b8'}
              style={{ transition: 'color 0.2s ease' }}
            />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-7px',
                  right: '-7px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 900,
                  width: '17px',
                  height: '17px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff'
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <span>צ'אט תמיכה ועזרה</span>
        </button>
      )}

      {/* Elegant Chat Window in signature blue & purple theme */}
      {isOpen && (
        <div
          style={{
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            height: '480px',
            maxHeight: 'calc(100vh - 120px)',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(124, 101, 184, 0.24)',
            border: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Rubik', 'Segoe UI', Tahoma, Arial, sans-serif"
          }}
        >
          {/* Header styled with exact Blue & Purple gradient (#4a88c7 -> #7c65b8) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #4a88c7 0%, #7c65b8 100%)',
              color: '#ffffff',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(74, 136, 199, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ShieldCheck size={18} color="#ffffff" />
              </div>
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: "'Rubik', 'Segoe UI', Tahoma, Arial, sans-serif",
                    letterSpacing: '-0.2px'
                  }}
                >
                  צ'אט תמיכה TALA
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#e0e7ff', marginTop: '1px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  <span>מענה ישיר ממנהלת המערכת</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {thread?.messages && thread.messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: '#ffffff',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.45)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                  title="סיום פנייה וניקוי היסטוריית השיחה"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={handleToggle}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                title="מזער חלון צ'אט"
              >
                <Minimize2 size={15} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '14px',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Introductory guidance */}
            {(!thread?.messages || thread.messages.length === 0) && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  color: '#475569',
                  fontSize: '13px',
                  lineHeight: '1.5'
                }}
              >
                <Sparkles size={24} color="#7c65b8" style={{ marginBottom: '6px' }} />
                <strong style={{ display: 'block', color: '#1e3a5f', marginBottom: '4px', fontSize: '13.5px' }}>
                  שלום {effectiveName}!
                </strong>
                ניתן לשאול כל שאלה, לבקש עזרה במערכת או לדווח על תקלה. המנהלת תקבל התראה מיידית ותשיב לך כאן בזמן אמת.
              </div>
            )}

            {/* Messages list */}
            {(thread?.messages || []).map((msg) => {
              const isAdmin = msg.senderRole === SENDER_ROLES.ADMIN;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAdmin ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    alignSelf: isAdmin ? 'flex-start' : 'flex-end'
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: '#64748b',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isAdmin ? (
                      <>
                        <ShieldCheck size={11} color="#7c65b8" />
                        <strong style={{ color: '#7c65b8' }}>{msg.senderName}</strong>
                      </>
                    ) : (
                      <>
                        <User size={11} color="#475569" />
                        <span>{msg.senderName}</span>
                      </>
                    )}
                    <span>• {msg.createdAt}</span>
                  </div>

                  <div
                    style={{
                      background: isAdmin
                        ? '#f3f0fb'
                        : 'linear-gradient(135deg, #4a88c7 0%, #7c65b8 100%)',
                      color: isAdmin ? '#2e1065' : '#ffffff',
                      border: isAdmin ? '1px solid #ddd6fe' : 'none',
                      borderRadius: isAdmin ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                      padding: '9px 13px',
                      fontSize: '13px',
                      lineHeight: '1.45',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      boxShadow: isAdmin ? 'none' : '0 2px 6px rgba(74, 136, 199, 0.2)'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '10px 12px',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="כתוב/י הודעה למנהלת..."
              disabled={isSending}
              maxLength={2000}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#7c65b8')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: !inputMessage.trim() || isSending
                  ? '#cbd5e1'
                  : 'linear-gradient(135deg, #4a88c7 0%, #7c65b8 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: !inputMessage.trim() || isSending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: !inputMessage.trim() || isSending ? 'none' : '0 2px 8px rgba(74, 136, 199, 0.3)'
              }}
              title="שלח הודעה"
            >
              <Send size={15} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
