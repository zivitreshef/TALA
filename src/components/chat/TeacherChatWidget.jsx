import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  MessageSquare,
  X,
  Send,
  User,
  Headphones,
  Clock,
  Sparkles,
  CheckCircle2,
  Minimize2,
  Trash2,
  Paperclip,
  ZoomIn
} from 'lucide-react';
import {
  subscribeToSupportThread,
  sendChatMessageToCloud,
  markThreadReadInCloud,
  clearSupportThreadInCloud
} from '../../services/supportChatService.js';
import { SENDER_ROLES, countUnreadMessages } from '../../domain/supportChat.js';
import { processChatImageFile } from '../../services/chatImageHelper.js';

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
  const [attachment, setAttachment] = useState(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [imgError, setImgError] = useState('');
  const [previewImgUrl, setPreviewImgUrl] = useState(null);

  const fileInputRef = useRef(null);
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

  // Handle clipboard paste (Ctrl+V) for screenshots
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setIsProcessingImg(true);
          setImgError('');
          try {
            const res = await processChatImageFile(file);
            if (res.success && res.attachment) {
              setAttachment(res.attachment);
            } else {
              setImgError(res.error || 'שגיאה בעיבוד התמונה.');
              setTimeout(() => setImgError(''), 4500);
            }
          } finally {
            setIsProcessingImg(false);
          }
        }
        break;
      }
    }
  };

  // Handle file picker selection
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImg(true);
    setImgError('');
    try {
      const res = await processChatImageFile(file);
      if (res.success && res.attachment) {
        setAttachment(res.attachment);
      } else {
        setImgError(res.error || 'שגיאה בעיבוד התמונה.');
        setTimeout(() => setImgError(''), 4500);
      }
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const cleanText = inputMessage.trim();
    if ((!cleanText && !attachment) || isSending || isProcessingImg || !effectiveEmail) return;

    setIsSending(true);
    try {
      const admins = (allowedUsers || []).filter((u) => u.role === 'admin' && u.active !== false);

      await sendChatMessageToCloud({
        existingThread: thread,
        userEmail: effectiveEmail,
        userName: effectiveName,
        topic: '💬 פנייה מתוך צ\'אט התמיכה',
        text: cleanText,
        attachment,
        senderRole: SENDER_ROLES.USER,
        senderName: effectiveName,
        admins,
        emailConfig: emailEngineConfig
      });

      setInputMessage('');
      setAttachment(null);
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

  const canSend = (inputMessage.trim() || attachment) && !isSending && !isProcessingImg;

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
      {/* Floating launcher button in blue & purple theme */}
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
            height: '490px',
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
          {/* Header styled with subtle message icon (replacing green dot) */}
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
                <Headphones size={18} color="#ffffff" />
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
                  <MessageSquare size={11} color="#e0e7ff" style={{ opacity: 0.9 }} />
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
                ניתן לשאול כל שאלה, לבקש עזרה במערכת, או להדביק צילום מסך של תקלה. המנהלת תקבל התראה מיידית ותשיב לך כאן.
              </div>
            )}

            {/* Messages list */}
            {(thread?.messages || []).map((msg) => {
              const isAdmin = msg.senderRole === SENDER_ROLES.ADMIN;
              const hasAttachment = Boolean(msg.attachment?.url);

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
                        <Headphones size={11} color="#7c65b8" />
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
                    {msg.text && msg.text !== '📷 [צילום מסך מצורף]' && (
                      <div>{msg.text}</div>
                    )}

                    {hasAttachment && (
                      <div style={{ marginTop: msg.text && msg.text !== '📷 [צילום מסך מצורף]' ? '6px' : '0' }}>
                        <img
                          src={msg.attachment.url}
                          alt={msg.attachment.name || 'צילום מסך'}
                          onClick={() => setPreviewImgUrl(msg.attachment.url)}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '170px',
                            borderRadius: '6px',
                            cursor: 'zoom-in',
                            display: 'block',
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                          title="לחץ/י להגדלת התמונה"
                        />
                        <div style={{ fontSize: '10px', color: isAdmin ? '#6b7280' : '#e0e7ff', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <ZoomIn size={10} />
                          <span>צילום מסך ({msg.attachment.sizeKb}KB) • לחץ/י להגדלה</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview & Security / Privacy Warning */}
          {attachment && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f5f3ff',
                borderTop: '1px solid #ddd6fe',
                borderBottom: '1px solid #ddd6fe',
                padding: '6px 12px',
                fontSize: '11.5px',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <img
                  src={attachment.url}
                  alt="תצוגה מקדימה"
                  onClick={() => setPreviewImgUrl(attachment.url)}
                  style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #c4b5fd', cursor: 'zoom-in' }}
                  title="לחץ להגדלה"
                />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, color: '#4c1d95', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                    📷 {attachment.name} ({attachment.sizeKb}KB)
                  </div>
                  <div style={{ fontSize: '10px', color: '#6d28d9' }}>
                    🔒 נא לוודא שאין פרטי תלמידים
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7c65b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="הסר צילום מסך"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {imgError && (
            <div style={{ padding: '5px 12px', background: '#fef2f2', borderTop: '1px solid #fecaca', fontSize: '11px', color: '#dc2626', flexShrink: 0 }}>
              ⚠️ {imgError}
            </div>
          )}

          {/* Input Footer with Attachment & Paste Support */}
          <form
            onSubmit={handleSendMessage}
            onPaste={handlePaste}
            style={{
              padding: '10px 12px',
              background: '#ffffff',
              borderTop: attachment ? 'none' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0
            }}
          >
            {/* Paperclip button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isProcessingImg}
              title="צרף צילום מסך (או הדבק ב-Ctrl+V)"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                color: '#7c65b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isSending || isProcessingImg ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
            >
              <Paperclip size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={attachment ? 'הוסף/י הערה לצילום המסך (אופציונלי)...' : "כתוב/י הודעה (ניתן להדביק צילום מסך ב-Ctrl+V)..."}
              disabled={isSending || isProcessingImg}
              maxLength={2000}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#7c65b8')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />

            <button
              type="submit"
              disabled={!canSend}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: !canSend
                  ? '#cbd5e1'
                  : 'linear-gradient(135deg, #4a88c7 0%, #7c65b8 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: !canSend ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: !canSend ? 'none' : '0 2px 8px rgba(74, 136, 199, 0.3)'
              }}
              title="שלח הודעה"
            >
              <Send size={15} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </form>
        </div>
      )}

      {/* Lightbox Preview Modal for Zooming In on Screenshots */}
      {previewImgUrl && (
        <div
          onClick={() => setPreviewImgUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: '#1e293b',
                color: '#ffffff'
              }}
            >
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>צילום מסך מוגדל</span>
              <button
                type="button"
                onClick={() => setPreviewImgUrl(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="סגור תצוגה מקדימה"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '10px', overflow: 'auto', textAlign: 'center', background: '#0f172a' }}>
              <img
                src={previewImgUrl}
                alt="צילום מסך מוגדל"
                style={{
                  maxWidth: '100%',
                  maxHeight: '78vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
