import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  MessageSquareHeart,
  CheckCircle2,
  MessageCircle,
  Clock,
  ShieldCheck,
  Mail,
  Lock,
  LogOut,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Smartphone,
  Lightbulb,
  FileText,
  Check,
  ShieldAlert,
  Share2
} from 'lucide-react';
import { getPaidRemainingDays } from '../../allowedUsers';

export default function TrialUpgradeModal({
  isOpen,
  onClose,
  currentUser,
  onOpenSurvey,
  onOpenIntroVideo,
  onSubmitSupportMessage,
  remainingDays = null,
  paidRemainingDays = null,
  isExpired = false,
  onLogout = null
}) {
  const isNonTrialUser = Boolean(currentUser && !currentUser.isTrialUser);
  const [supportMessage, setSupportMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAboutLetter, setShowAboutLetter] = useState(!isNonTrialUser);

  // Clean Tab Navigation & RFE states
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'ios_shortcut' | 'rfe' | 'fair_use' | 'contact'
  const [rfeTitle, setRfeTitle] = useState('');
  const [rfeCategory, setRfeCategory] = useState('שיפור בטופס תל"א / תח"י');
  const [rfeMessage, setRfeMessage] = useState('');
  const [rfeSubmitted, setRfeSubmitted] = useState(false);
  const [isSubmittingRfe, setIsSubmittingRfe] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAboutLetter(!isNonTrialUser);
      setMessageSent(false);
      setSupportMessage('');
      setRfeSubmitted(false);
      setRfeTitle('');
      setRfeMessage('');
      setActiveTab(isExpired ? 'contact' : 'guide');
    }
  }, [isOpen, isNonTrialUser, isExpired]);

  // ALL hooks are declared above. Early return here is safe for React Hook rules.
  if (!isOpen || !currentUser) return null;

  const resolvedPaidRemainingDays =
    paidRemainingDays !== null
      ? paidRemainingDays
      : currentUser
      ? getPaidRemainingDays(currentUser)
      : null;

  const whatsappPhone = '972559236606';
  const defaultWhatsappText = encodeURIComponent(
    isNonTrialUser
      ? `היי זיוית, שמי ${currentUser.name || ''} (${currentUser.email || ''}) ממערכת TALA. ברצוני להתייעץ בנושא המערכת. תודה!`
      : `היי זיוית, ${
          isExpired ? 'הסתיימה תקופת הניסיון שלי' : 'התנסיתי במערכת TALA'
        } ואשמח להסדיר רכישת מנוי שנתי (150 ש"ח לשנה). שמי: ${currentUser.name || ''} (${
          currentUser.email || ''
        }). תודה!`
  );
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${defaultWhatsappText}`;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setIsSubmitting(true);
    if (typeof onSubmitSupportMessage === 'function') {
      onSubmitSupportMessage({
        topic: isNonTrialUser
          ? '💬 פנייה ממשתמש/ת מנוי (תמיכה ושאלות)'
          : isExpired
          ? '💬 פנייה ממשתמש/ת ניסיון שפג תוקפו (הסדרת מנוי)'
          : '💬 פנייה ממשתמש/ת ניסיון (הסדרת מנוי / תמיכה)',
        notes: `פנייה מ${isNonTrialUser ? 'משתמש/ת מנוי' : isExpired ? 'משתמש/ת ניסיון שפג תוקפו' : 'משתמש/ת ניסיון'}:\n${supportMessage.trim()}\n(ערוץ פנייה מועדף: וואטסאפ ישיר לזיוית)`,
        name: currentUser.name,
        email: currentUser.email
      });
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setMessageSent(true);
      setSupportMessage('');
    }, 400);
  };

  const handleSubmitRfe = (e) => {
    e.preventDefault();
    if (!rfeMessage.trim()) return;

    setIsSubmittingRfe(true);
    if (typeof onSubmitSupportMessage === 'function') {
      onSubmitSupportMessage({
        topic: `💡 הצעת ייעול ובקשה לשיפור (Minor RFE): ${rfeCategory} - ${rfeTitle.trim() || 'ללא כותרת'}`,
        notes: `[בקשת שיפור / RFE ממשתמש/ת ${currentUser.name || ''} (${currentUser.email || ''})]:\nקטגוריה: ${rfeCategory}\nנושא: ${rfeTitle.trim() || 'כללי'}\nפירוט ההצעה:\n${rfeMessage.trim()}`,
        name: currentUser.name,
        email: currentUser.email
      });
    }

    setTimeout(() => {
      setIsSubmittingRfe(false);
      setRfeSubmitted(true);
      setRfeTitle('');
      setRfeMessage('');
    }, 400);
  };

  return (
    <div
      className="modal-backdrop"
      dir="rtl"
      onClick={isExpired ? undefined : onClose}
      style={{ zIndex: 2400, padding: '16px' }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px',
          boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.28)',
          background: '#ffffff',
          border: isExpired ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
          overflow: 'hidden'
        }}
      >
        {/* Header - Enterprise Navy Clean Palette */}
        <div
          className="modal-header"
          style={{
            background: isExpired
              ? 'linear-gradient(135deg, #7f1d1d 0%, #1e293b 100%)'
              : '#1e3a5f',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isExpired ? <Lock size={18} color="#fca5a5" /> : <Sparkles size={18} color="#93c5fd" />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
                {isNonTrialUser
                  ? 'מרכז עזרה, מדריכים ותמיכה – מערכת TALA'
                  : isExpired
                  ? 'תקופת הניסיון הסתיימה – הסדרת מנוי שנתי ל-TALA'
                  : 'מרכז עזרה והסדרת מנוי שנתי – מערכת TALA'}
              </h3>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                {isNonTrialUser
                  ? 'מדריך שימוש, קיצור למסך הבית, הצעות שיפור, תנאי שימוש נאות ותמיכה ישירה'
                  : isExpired
                  ? 'להמשך עבודה סדירה במערכת ופתיחת הגישה לנתונים'
                  : 'מדריכים פדגוגיים, מענה טכני וקשר ישיר עם זיוית רשף'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="btn-secondary-sm"
                style={{
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.14)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
                title="התנתק מהמערכת"
              >
                <LogOut size={13} />
                <span>התנתקות</span>
              </button>
            )}

            {!isExpired && (
              <button
                type="button"
                onClick={onClose}
                className="btn-modal-close"
                style={{
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  borderRadius: '6px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="סגור חלון"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            lineHeight: 1.55,
            color: '#334155',
            fontSize: '13.5px',
            background: '#f8fafc'
          }}
        >
          {/* PERSISTENT CORE PANEL: Status, License Renewal Counter, and Quick Actions */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Top row: Status & Renewal counter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>
                    {isNonTrialUser
                      ? 'מנוי שנתי פעיל – מערכת TALA 🌷'
                      : isExpired
                      ? 'תקופת הניסיון הסתיימה'
                      : 'חשבון התנסות פעיל ב-TALA'}
                  </strong>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                    {isNonTrialUser ? (
                      currentUser.paidExpiresAt ? (
                        <>תוקף המנוי הנוכחי: עד {new Date(currentUser.paidExpiresAt).toLocaleDateString('he-IL')}</>
                      ) : (
                        <>חשבון מנוי פעיל עם גישה מלאה לכל הכלים</>
                      )
                    ) : isExpired ? (
                      <>נתונייך שמורים ומאובטחים במלואם במערכת. הסדרת מנוי שנתי (150 ₪ לשנה) תפתח את הגישה המלאה.</>
                    ) : remainingDays !== null ? (
                      <>נותרו {remainingDays} ימים לתקופת הניסיון</>
                    ) : (
                      <>תקופת ניסיון פעילה</>
                    )}
                  </div>
                </div>
              </div>

              {/* Renewal Counter / License Badge */}
              <div>
                {isNonTrialUser && (
                  resolvedPaidRemainingDays === Infinity || currentUser.role === 'admin' ? (
                    <span
                      style={{
                        background: '#f1f5f9',
                        color: '#1e3a5f',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <ShieldCheck size={13} color="#2563eb" />
                      <span>חשבון מנהל (ללא הגבלת זמן)</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        background: (resolvedPaidRemainingDays !== null && resolvedPaidRemainingDays <= 30) ? '#fffbeb' : '#f8fafc',
                        color: (resolvedPaidRemainingDays !== null && resolvedPaidRemainingDays <= 30) ? '#b45309' : '#1e3a5f',
                        border: `1px solid ${(resolvedPaidRemainingDays !== null && resolvedPaidRemainingDays <= 30) ? '#fde68a' : '#cbd5e1'}`,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Clock size={13} />
                      <span>
                        {resolvedPaidRemainingDays !== null
                          ? `נותרו עוד ${resolvedPaidRemainingDays} ימים לחידוש המנוי`
                          : 'מנוי שנתי פעיל (365 ימים)'}
                      </span>
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Bottom row of persistent panel: Direct Quick Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9'
              }}
            >
              <div style={{ fontSize: '12px', color: '#475569' }}>
                מענה ישיר בוואטסאפ ובמייל לשאלות פדגוגיות וסיוע טכני
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Tutorial Video Quick Action */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isExpired && onClose) onClose();
                    if (typeof onOpenIntroVideo === 'function') onOpenIntroVideo();
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#1e3a5f',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <BookOpen size={14} color="#2563eb" />
                  <span>סרטון הדרכה (3 דק׳)</span>
                </button>

                {/* Direct WhatsApp Action Button (Phone number masked) */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#25D366',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#20bd5a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#25D366')}
                >
                  <MessageCircle size={15} />
                  <span>{isNonTrialUser ? 'שיחה ישירה בוואטסאפ עם זיוית' : 'פנייה בוואטסאפ להסדרת מנוי'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Segmented Control Tab Navigation (Subtle slate segmented pills) */}
          {!isExpired && (
            <div
              style={{
                display: 'flex',
                background: '#e2e8f0',
                padding: '3px',
                borderRadius: '8px',
                gap: '3px',
                overflowX: 'auto',
                scrollbarWidth: 'none'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                style={{
                  flex: '1 0 auto',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'guide' ? '#ffffff' : 'transparent',
                  color: activeTab === 'guide' ? '#1e3a5f' : '#475569',
                  fontWeight: activeTab === 'guide' ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'guide' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <BookOpen size={14} />
                <span>מדריך והנחיות</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios_shortcut')}
                style={{
                  flex: '1 0 auto',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'ios_shortcut' ? '#ffffff' : 'transparent',
                  color: activeTab === 'ios_shortcut' ? '#1e3a5f' : '#475569',
                  fontWeight: activeTab === 'ios_shortcut' ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'ios_shortcut' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Smartphone size={14} />
                <span>קיצור לאייפד / אייפון</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rfe')}
                style={{
                  flex: '1 0 auto',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'rfe' ? '#ffffff' : 'transparent',
                  color: activeTab === 'rfe' ? '#1e3a5f' : '#475569',
                  fontWeight: activeTab === 'rfe' ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'rfe' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Lightbulb size={14} />
                <span>הצעות ייעול ושיפורים (RFE)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fair_use')}
                style={{
                  flex: '1 0 auto',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'fair_use' ? '#ffffff' : 'transparent',
                  color: activeTab === 'fair_use' ? '#1e3a5f' : '#475569',
                  fontWeight: activeTab === 'fair_use' ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'fair_use' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={14} />
                <span>שימוש נאות ורישיון</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                style={{
                  flex: '1 0 auto',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'contact' ? '#ffffff' : 'transparent',
                  color: activeTab === 'contact' ? '#1e3a5f' : '#475569',
                  fontWeight: activeTab === 'contact' ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: activeTab === 'contact' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Mail size={14} />
                <span>פנייה למנהלת ומשוב</span>
              </button>
            </div>
          )}

          {/* TAB 1: WORKFLOW GUIDANCE */}
          {activeTab === 'guide' && !isExpired && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700 }}>
                <BookOpen size={16} color="#2563eb" />
                <span>מדריך עבודה פדגוגי לבניית תוכנית אקולוגית ותח"י</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                מערכת TALA פותחה על ידי אנשי חינוך מיוחד ומלווה אותך צעד אחר צעד בבניית תוכנית מקצועית ומדויקת:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '13px' }}>
                    1️⃣ כרטיס תלמיד וטבלת מוקדי כוח
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    מלאי פרטים אישיים, תארי את התלמיד/ה בטקסט חופשי ולחצי על <strong>"יצירת טבלת מוקדי כוח"</strong> – המערכת תסווג ותבנה טבלת כוחות קיימים מול כוחות להעצמה.
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '13px' }}>
                    2️⃣ מאגר מטרות ויעדים דינמי
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    המאגר מתאים את עצמו לגיל (גן / בית ספר) ומדרג את המטרות הנפוצות ביותר בראש הרשימה.
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '13px' }}>
                    3️⃣ עד 3 שאלות מנחות ב-AI
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    בעת בחירת מטרה, מנגנון ה-AI שואל עד 3 שאלות קצרות וממלא אוטומטית את כל 6 עמודות התוכנית (יעדים, שותפים, הזדמנויות, אמצעי תיווך, משך ואמות מידה).
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '13px' }}>
                    4️⃣ שער "קול ההורים" בוואטסאפ (ללא צורך בסיסמה)
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    הכפתור <strong>"קול ההורים"</strong> יוצר קישור ייעודי לשליחה בוואטסאפ. ההורים עונים על 3 שאלות מהסמארטפון, ותשובותיהם משתלבות בתוכנית רק לאחר אישורך.
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '13px' }}>
                    5️⃣ תצפיות שוטפות, דוחות רשמיים והדפסה מוגנת פרטיות
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    תיעוד תצפיות בלחיצה אחת, הפקת דוחות אמצע וסוף שנה למנב"ס/משו"ב, והדפסה עם <strong>הגנת פרטיות</strong> (ראשי תיבות והסתרת ת.ז.) לוועדות.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IPAD / IPHONE SHORTCUT GUIDE */}
          {activeTab === 'ios_shortcut' && !isExpired && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700 }}>
                <Smartphone size={16} color="#2563eb" />
                <span>איך להוסיף קיצור דרך של TALA למסך הבית באייפד ובאייפון (כמו אפליקציה)</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#1e3a5f', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px' }}>
                💡 <strong>חשוב לדעת:</strong> מומלץ לבצע פעולה זו ישירות במסך הכניסה של האתר – <strong>אין צורך להתחבר מראש עם שם וסיסמה!</strong> כך האפליקציה תישמר ומוכנה לעבודה.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px', width: '20px' }}>1</span>
                  <div style={{ fontSize: '12.5px', color: '#334155' }}>
                    <strong>פתיחת Safari:</strong> היכנסי בדפדפן <strong>Safari</strong> באייפד או באייפון לכתובת: <code style={{ color: '#0f172a', fontWeight: 600 }}>https://zivitreshef.github.io/TALA/</code>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px', width: '20px' }}>2</span>
                  <div style={{ fontSize: '12.5px', color: '#334155' }}>
                    <strong>לחיצה על שיתוף:</strong> לחצי על סמל ה<strong>שיתוף</strong> (ריבוע עם חץ כלפי מעלה <strong>⎋</strong> – בסרגל העליון באייפד או בסרגל התחתון באייפון).
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px', width: '20px' }}>3</span>
                  <div style={{ fontSize: '12.5px', color: '#334155' }}>
                    <strong>הוספה למסך הבית:</strong> בתפריט שנפתח, גללי מעט ולחצי על <strong>"הוספה למסך הבית"</strong> (או <strong>Add to Home Screen</strong> עם סמל <strong>[+]</strong>).
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px', width: '20px' }}>4</span>
                  <div style={{ fontSize: '12.5px', color: '#334155' }}>
                    <strong>אישור:</strong> ודאי שהשם הוא <strong>TALA</strong> ולחצי על <strong>"הוסף" (Add)</strong> למעלה. סמל המערכת יופיע כעת על מסך הבית שלך וייפתח בלחיצה אחת במסך מלא!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MINOR IMPROVEMENT / RFE SECTION */}
          {activeTab === 'rfe' && !isExpired && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700 }}>
                <Lightbulb size={16} color="#2563eb" />
                <span>הצעות ייעול ושיפורים (RFE) – Request for Enhancement</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                יש לך רעיון לפיצ'ר קטן, שיפור שדה בטופס או קיצור דרך שיחסוך זמן? נשמח מאוד לשמוע ולשלב בעדכונים הבאים:
              </div>

              {rfeSubmitted ? (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#166534',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span>תודה רבה! הצעת השיפור שלך נשלחה בהצלחה ונרשמה בצוות הפיתוח 🌷</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRfeSubmitted(false)}
                    style={{
                      background: '#1e3a5f',
                      color: '#ffffff',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    שליחת הצעה נוספת
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitRfe}
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e3a5f', marginBottom: '3px' }}>
                      קטגוריית השיפור / ההצעה:
                    </label>
                    <select
                      value={rfeCategory}
                      onChange={(e) => setRfeCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: '#ffffff'
                      }}
                    >
                      <option value="שיפור בטופס תל&quot;א / תח&quot;י">שיפור בטופס תל"א / תח"י (שדות, זרימת עבודה)</option>
                      <option value="מאגר מטרות ויעדים">מאגר מטרות ויעדים (תוספת מטרות, דיוק ניסוח)</option>
                      <option value="שאלות מנחות ב-AI">מנגנון ה-AI ושאלות מנחות</option>
                      <option value="הפקת דוחות והדפסה">הפקת דוחות, הדפסה והעתקה למנב"ס/משו"ב</option>
                      <option value="קול ההורים וצוות רב-מקצועי">שער קול ההורים וסנכרון צוותים</option>
                      <option value="הצעת ייעול כללית אחרת">הצעת ייעול כללית אחרת</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e3a5f', marginBottom: '3px' }}>
                      כותרת קצרה להצעה:
                    </label>
                    <input
                      type="text"
                      value={rfeTitle}
                      onChange={(e) => setRfeTitle(e.target.value)}
                      placeholder="למשל: אפשרות לשכפול יעד קיים, הוספת תזכורת לתאריך תצפית..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e3a5f', marginBottom: '3px' }}>
                      פירוט הרעיון או הצורך:
                    </label>
                    <textarea
                      rows={3}
                      value={rfeMessage}
                      onChange={(e) => setRfeMessage(e.target.value)}
                      placeholder="תארי בקצרה כיצד השיפור יסייע לך בעבודה..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <button
                      type="submit"
                      disabled={isSubmittingRfe || !rfeMessage.trim()}
                      style={{
                        background: '#1e3a5f',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '12.5px',
                        cursor: isSubmittingRfe || !rfeMessage.trim() ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingRfe || !rfeMessage.trim() ? 0.6 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Send size={13} />
                      <span>{isSubmittingRfe ? 'שולח...' : 'שליחת הצעת שיפור'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: FAIR USE POLICY & LICENSE AGREEMENT */}
          {activeTab === 'fair_use' && !isExpired && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700 }}>
                <FileText size={16} color="#2563eb" />
                <span>הסכם רישיון שימוש ומדיניות "שימוש נאות" (Fair Use) – מערכת TALA</span>
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                מערכת TALA פותחה בהשקעה עצומה כדי להעניק לאנשי חינוך כלי מקצועי ואמין. השימוש במערכת כפוף לכללים הבאים:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a5f', fontWeight: 700, fontSize: '13px' }}>
                    <Check size={14} color="#16a34a" />
                    <span>1. רישיון אישי למורה / גננת (פר משתמשת)</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    הרישיון הינו אישי, שמי ואינו ניתן להעברה או שיתוף. כל חשבון מיועד אך ורק למורה או לגננת הרשומה.
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b', fontWeight: 700, fontSize: '13px' }}>
                    <ShieldAlert size={14} color="#dc2626" />
                    <span>2. איסור שיתוף פרטי גישה ואיסור אספקת דוחות לגורמי צד שלישי</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    • חל איסור מוחלט על שיתוף פרטי הכניסה (דוא"ל וסיסמה) עם מורות אחרות או אנשי צוות.<br />
                    • חל איסור מוחלט להשתמש בחשבון כדי להפיק, לבנות או לספק דוחות ותוכניות עבודה עבור תלמידים של מורות/גננות שאינן בעלות מנוי אישי פעיל במערכת.
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a5f', fontWeight: 700, fontSize: '13px' }}>
                    <Check size={14} color="#16a34a" />
                    <span>3. מגבלות שימוש נאות (מכסת תלמידים ומכסת בינה מלאכותית)</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    • <strong>מכסת תלמידים שנתית:</strong> עד 35 תלמידים פעילים בשנה למנוי אישי (בהתאם לתקן המקובל למורה/גננת שילוב). מעבר לכך נדרש רישיון מוסדי/מתי"א.<br />
                    • <strong>מכסת בקשות AI:</strong> עד 20 שאילתות AI לתלמיד בשנה, לשמירה על יציבות השרתים וזמינות המערכת.
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#991b1b', fontWeight: 700, fontSize: '13px' }}>
                    <ShieldAlert size={14} color="#dc2626" />
                    <span>4. איסור הנדסה לאחור (Reverse Engineering)</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    חל איסור מוחלט להעתיק, לשכפל, להנדס לאחור (Reverse Engineer), לבצע דה-קומפילציה, לפרק את קוד המקור או להשתמש במבנה ובמתודולוגיה לצורך פיתוח מוצר מתחרה.
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e3a5f', fontWeight: 700, fontSize: '13px' }}>
                    <Check size={14} color="#16a34a" />
                    <span>5. זכויות יוצרים וקניין רוחני</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    כל זכויות היוצרים, סימני המסחר, הקניין הרוחני, מאגר המטרות והיעדים הדינמי, מנגנוני ה-AI והעיצוב שמורים באופן בלעדי ליוצרת המערכת – <strong>גב' זיוית רשף</strong>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONTACT & SURVEY (Or default when expired) */}
          {(activeTab === 'contact' || isExpired) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Contact Admin Form */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700 }}>
                  <Mail size={16} color="#2563eb" />
                  <span>השארת הודעה ישירה למנהלת המערכת</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  מעדיפה לפנות ישירות דרך האתר? כתבי לנו ונחזור אלייך בהקדם:
                </div>

                {messageSent ? (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#166534',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600
                    }}
                  >
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span>ההודעה נשלחה בהצלחה למנהלת המערכת! ניצור איתך קשר בהקדם.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                      rows={3}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="כתבי כאן שאלה, בקשה להדרכה או כל צורך אחר..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        מייל ישיר: <strong>zivit.reshef@gmail.com</strong>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !supportMessage.trim()}
                        style={{
                          background: '#1e3a5f',
                          color: '#ffffff',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: isSubmitting || !supportMessage.trim() ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting || !supportMessage.trim() ? 0.6 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Send size={13} />
                        <span>{isSubmitting ? 'שולח...' : 'שליחת הודעה'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Survey Button Strip */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <MessageSquareHeart size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#1e3a5f', fontSize: '13px' }}>שאלון משוב קצר למשתמשת</strong>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>המשוב שלך מסייע לנו לדייק ולפתח את המערכת.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isExpired) onClose();
                    if (typeof onOpenSurvey === 'function') onOpenSurvey();
                  }}
                  style={{
                    background: '#ffffff',
                    color: '#1e3a5f',
                    border: '1px solid #cbd5e1',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <MessageSquareHeart size={14} />
                  <span>פתיחת שאלון המשוב</span>
                </button>
              </div>

              {/* Personal Letter Toggle */}
              {isNonTrialUser && (
                <div style={{ marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAboutLetter((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#1e3a5f',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={14} color="#2563eb" />
                      <span>אודות TALA ואיך נולדה האפליקציה... 🌷</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: '#64748b' }}>
                      <span>{showAboutLetter ? 'הסתר' : 'קרא עוד'}</span>
                      {showAboutLetter ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </div>
                  </button>

                  {showAboutLetter && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        padding: '14px 16px',
                        color: '#334155',
                        fontSize: '12.5px',
                        lineHeight: 1.6
                      }}
                    >
                      <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1e3a5f' }}>
                        שלום לך 🌷
                      </p>
                      <p style={{ margin: '0 0 8px 0' }}>
                        תודה לך שאת משתמשת באפליקציה שלנו. המשוב שלך חשוב לנו מאוד ומאפשר לנו לדייק את המערכת בהתאם לצרכים האמיתיים של אנשי החינוך.
                      </p>
                      <p style={{ margin: '0 0 8px 0' }}>
                        אני אשת חינוך מיוחד עם 24 שנות ניסיון, מנתחת התנהגות וגננת שילוב. יחד עם בעלי, מנהל פיתוח בהייטק, בנינו את TALA כדי שנוכל לייצר מסמכים מקצועיים ומדויקים תוך צמצום המשימות המנהליות והקדשת הזמן למה שבאמת חשוב: התלמידים.
                      </p>
                      <div style={{ fontWeight: 700, color: '#1e3a5f', marginTop: '6px' }}>
                        תודה על השותפות, זיוית
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            מערכת TALA • פותחה באהבה על ידי אנשי חינוך עבור אנשי חינוך
          </div>
          {isExpired && onLogout ? (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onLogout}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                background: '#fef2f2',
                color: '#b91c1c',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <LogOut size={13} />
              <span>התנתקות מהמערכת</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px'
              }}
            >
              סגור
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
