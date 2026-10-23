import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  HeartHandshake,
  X,
  Send,
  MessageSquareHeart,
  CheckCircle2,
  Phone,
  MessageCircle,
  ExternalLink,
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
  Share2,
  HelpCircle,
  PlusSquare
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

  // New Navigation & RFE states
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'ios_shortcut' | 'rfe' | 'fair_use' | 'support'
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
      setActiveTab(isExpired ? 'support' : 'guide');
    }
  }, [isOpen, isNonTrialUser, isExpired]);

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
          maxWidth: '780px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          background: '#ffffff',
          border: isExpired ? '2px solid #ef4444' : '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            background: isExpired
              ? 'linear-gradient(135deg, #991b1b 0%, #1e3a5f 100%)'
              : 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)'
              }}
            >
              {isExpired ? <Lock size={20} color="#fca5a5" /> : <Sparkles size={22} color="#fef08a" />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                {isNonTrialUser
                  ? 'מרכז עזרה, מדריכים ותמיכה – מערכת TALA'
                  : isExpired
                  ? 'תקופת הניסיון הסתיימה – הסדרת מנוי שנתי ל-TALA'
                  : 'מרכז עזרה ומנוי שנתי – שותפים לדרך ב-TALA'}
              </h3>
              <span style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.85)' }}>
                {isNonTrialUser
                  ? 'הנחיות שימוש, קיצור לאייפד/אייפון, הצעות ייעול ושיפורים, תנאי שימוש ותמיכה'
                  : isExpired
                  ? 'להמשך עבודה במערכת ופתיחת הגישה לנתונים'
                  : 'מדריכים, תמיכה פדגוגית ומכתב אישי מזיוית רשף'}
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
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
                title="התנתק מהמערכת"
              >
                <LogOut size={14} />
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
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="סגור חלון"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            overflowY: 'auto',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            lineHeight: 1.6,
            color: '#334155',
            fontSize: '13.5px'
          }}
        >
          {/* Status Banners with Renewal Counter */}
          {isNonTrialUser ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                color: '#166534',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.06)'
              }}
            >
              <ShieldCheck size={26} style={{ flexShrink: 0, color: '#16a34a', marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <strong style={{ fontSize: '15px' }}>מנוי שנתי פעיל – מערכת TALA 🌷</strong>
                  {resolvedPaidRemainingDays === Infinity || currentUser.role === 'admin' ? (
                    <span
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        border: '1px solid #93c5fd',
                        borderRadius: '999px',
                        padding: '3px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <ShieldCheck size={14} />
                      <span>חשבון מנהל (ללא הגבלת זמן)</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        background: (resolvedPaidRemainingDays !== null && resolvedPaidRemainingDays <= 30) ? '#fef3c7' : '#dcfce7',
                        color: (resolvedPaidRemainingDays !== null && resolvedPaidRemainingDays <= 30) ? '#92400e' : '#14532d',
                        border: `1px solid ${(resolvedPaidRemainingDays !== null && resolvedPaidRemainingDays <= 30) ? '#fde68a' : '#86efac'}`,
                        borderRadius: '999px',
                        padding: '3px 12px',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Clock size={14} />
                      <span>
                        {resolvedPaidRemainingDays !== null
                          ? `נותרו עוד ${resolvedPaidRemainingDays} ימים לחידוש המנוי`
                          : 'מנוי שנתי פעיל (365 ימים)'}
                      </span>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12.5px', marginTop: '5px', color: '#166534', lineHeight: 1.5 }}>
                  חשבונך מוגדר כמנוי פעיל עם גישה מלאה. לשאלות מקצועיות, סיוע טכני או הצעות לשיפור, זיוית זמינה תמיד בוואטסאפ או בטופס להלן.
                  {currentUser.paidExpiresAt && (
                    <span style={{ fontWeight: 600, marginRight: '4px' }}>
                      (תוקף המנוי הנוכחי: עד {new Date(currentUser.paidExpiresAt).toLocaleDateString('he-IL')})
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : isExpired ? (
            <div
              style={{
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '2px solid #f87171',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: '#991b1b',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.12)'
              }}
            >
              <Lock size={28} style={{ flexShrink: 0, color: '#dc2626' }} />
              <div>
                <strong style={{ fontSize: '15px' }}>
                  תקופת הניסיון שלך במערכת TALA הסתיימה 🌷
                </strong>
                <div style={{ fontSize: '13px', marginTop: '3px', lineHeight: 1.55 }}>
                  כל הנתונים, התלמידים והתוכניות שבנית <strong>שמורים ומאובטחים במלואם במערכת!</strong>
                  <br />
                  כדי להמשיך לעבוד, לשמור שינויים ולהפיק דוחות, אנא הסדירי מנוי שנתי בעלות סמלית של <strong>150 ₪ לשנה בלבד</strong>.
                </div>
              </div>
            </div>
          ) : remainingDays !== null && remainingDays <= 2 ? (
            /* Near-Expiry Banner */
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde047',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#92400e'
              }}
            >
              <Clock size={22} style={{ flexShrink: 0, color: '#d97706' }} />
              <div>
                <strong>
                  {remainingDays === 0
                    ? 'תקופת הניסיון שלך מסתיימת היום!'
                    : remainingDays === 1
                    ? 'נותר יום אחד לתקופת הניסיון שלך!'
                    : `נותרו יומיים לתקופת הניסיון שלך (${remainingDays} ימים)!`}
                </strong>
                <div style={{ fontSize: '12.5px', marginTop: '2px' }}>
                  זה הזמן להסדיר את המנוי השנתי ולהבטיח גישה רציפה לכל הנתונים, התלמידים והתוכניות שבנית.
                </div>
              </div>
            </div>
          ) : null}

          {/* Navigation Tabs (Only when not expired) */}
          {!isExpired && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '2px',
                overflowX: 'auto',
                scrollbarWidth: 'none'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: activeTab === 'guide' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'guide' ? '#1d4ed8' : '#64748b',
                  fontWeight: activeTab === 'guide' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: activeTab === 'guide' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <BookOpen size={16} />
                <span>מדריך והנחיות</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ios_shortcut')}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: activeTab === 'ios_shortcut' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'ios_shortcut' ? '#1d4ed8' : '#64748b',
                  fontWeight: activeTab === 'ios_shortcut' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: activeTab === 'ios_shortcut' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <Smartphone size={16} />
                <span>קיצור לאייפד / אייפון</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rfe')}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: activeTab === 'rfe' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'rfe' ? '#1d4ed8' : '#64748b',
                  fontWeight: activeTab === 'rfe' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: activeTab === 'rfe' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <Lightbulb size={16} />
                <span>הצעות ייעול ושיפורים (RFE)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fair_use')}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: activeTab === 'fair_use' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'fair_use' ? '#1d4ed8' : '#64748b',
                  fontWeight: activeTab === 'fair_use' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: activeTab === 'fair_use' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={16} />
                <span>שימוש נאות ורישיון</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('support')}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: activeTab === 'support' ? '#eff6ff' : 'transparent',
                  color: activeTab === 'support' ? '#1d4ed8' : '#64748b',
                  fontWeight: activeTab === 'support' ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: activeTab === 'support' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <MessageCircle size={16} />
                <span>תמיכה ויצירת קשר</span>
              </button>
            </div>
          )}

          {/* TAB 1: GUIDANCE & HELP */}
          {activeTab === 'guide' && !isExpired && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px 18px'
                }}
              >
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} color="#2563eb" />
                  <span>מדריך עבודה פדגוגי – בניית תוכנית עבודה אקולוגית ותח"י</span>
                </h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569' }}>
                  מערכת TALA פותחה על ידי אנשי חינוך מיוחד ומלווה אותך צעד אחר צעד בבניית תוכנית מקצועית, ממוקדת ומבוססת נתונים, בהתאם לסטנדרטים של משרד החינוך ומתי"א:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>
                      1️⃣ כרטיס תלמיד וטבלת מוקדי כוח
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      מלאי את פרטי התלמיד/ה והרקע החינוכי. בתיבת הטקסט החופשי, תארי את התלמיד/ה במילותייך, ולחצי על <strong>"יצירת טבלת מוקדי כוח"</strong> – המערכת תסווג ותבנה עבורך אוטומטית טבלת כוחות קיימים מול כוחות להעצמה.
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>
                      2️⃣ מאגר מטרות ויעדים דינמי
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      המאגר מתאים את עצמו לשלב החינוכי (גן / בית ספר) ומדרג את המטרות לפי שכיחות השימוש של צוותי החינוך. כל מטרה מנוסחת באופן פדגוגי מדויק ומאפשרת חיפוש מהיר וסינון לפי סביבות תפקוד.
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>
                      3️⃣ עד 3 שאלות מנחות ב-AI
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      בעת בחירת מטרה עליונה, מנגנון ה-AI המאובטח מציג עד 3 שאלות קצרות. מענה עליהן ממלא אוטומטית את 6 עמודות התוכנית: יעדים ספציפיים, שותפים, הזדמנויות בסדר היום, אמצעי תיווך, משך ואמות מידה.
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>
                      4️⃣ שער "קול ההורים" בוואטסאפ (ללא צורך בסיסמה)
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      לחיצה על כפתור <strong>"קול ההורים"</strong> יוצרת קישור דיגיטלי אישי ומאובטח לשליחה ישירה בוואטסאפ. ההורים עונים על 3 שאלות מהסמארטפון, ותשובותיהם משתלבות בתוכנית רק לאחר אישורך בלחיצת כפתור.
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: '4px' }}>
                      5️⃣ תצפיות שוטפות, דוחות רשמיים והדפסה מוגנת פרטיות
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      תיעוד מהיר של תצפיות לאורך השנה לכל יעד, הפקת דוחות אמצע וסוף שנה מוכנים להעתקה למנב"ס/משו"ב, והדפסה עם <strong>הגנת פרטיות</strong> (החלפה לראשי תיבות והסתרת ת.ז.) לוועדות ולתיקי תלמיד.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    רוצה לצפות בהדגמה מוחשית של כל השלבים?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onClose) onClose();
                      if (typeof onOpenIntroVideo === 'function') onOpenIntroVideo();
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <BookOpen size={16} />
                    <span>סרטון הדרכה (3 דק׳)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IPAD / IPHONE SHORTCUT GUIDE */}
          {activeTab === 'ios_shortcut' && !isExpired && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
                  border: '1.5px solid #7dd3fc',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  color: '#0369a1'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Smartphone size={24} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0c4a6e' }}>
                    איך להוסיף קיצור דרך של TALA למסך הבית באייפד ובאייפון (כמו אפליקציה)
                  </h4>
                </div>
                <div style={{ fontSize: '13px', color: '#075985', lineHeight: 1.55 }}>
                  💡 <strong>טיפ חשוב:</strong> מומלץ לבצע פעולה זו ישירות ממסך הכניסה של האתר – <strong>אין צורך להתחבר מראש עם שם וסיסמה!</strong> כך האייקון יישמר ויוביל אותך ישירות לאפליקציה בכל עת.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    1
                  </div>
                  <div>
                    <strong style={{ color: '#1e3a5f', fontSize: '14px' }}>כניסה לאתר בדפדפן Safari</strong>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      פתחי את דפדפן <strong>Safari</strong> באייפד או באייפון והיכנסי לכתובת האתר: <br />
                      <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>
                        https://zivitreshef.github.io/TALA/
                      </code>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    2
                  </div>
                  <div>
                    <strong style={{ color: '#1e3a5f', fontSize: '14px' }}>לחיצה על כפתור השיתוף (Share)</strong>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      לחצי על סמל ה<strong>שיתוף</strong> של אפל (סמל הריבוע עם חץ כלפי מעלה <strong>⎋</strong> – בסרגל העליון באייפד, או בסרגל התחתון באייפון).
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    3
                  </div>
                  <div>
                    <strong style={{ color: '#1e3a5f', fontSize: '14px' }}>בחירה באפשרות "הוספה למסך הבית" (Add to Home Screen)</strong>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      בתפריט האפשרויות שנפתח, גללי מעט למטה ולחצי על <strong>"הוספה למסך הבית"</strong> (או <strong>Add to Home Screen</strong>, סמל ריבוע עם סימן פלוס <strong>[+]</strong>).
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 16px'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    4
                  </div>
                  <div>
                    <strong style={{ color: '#1e3a5f', fontSize: '14px' }}>אישור ושמירה – לחיצה על "הוסף" (Add)</strong>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      ודאי ששם האפליקציה הוא <strong>TALA</strong> ולחצי על <strong>"הוסף" (Add)</strong> בפינה העליונה.
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '12.5px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>
                  🎉 <strong>זה הכל!</strong> מעתה סמל האפליקציה TALA יופיע על מסך הבית שלך לצד שאר האפליקציות, וייפתח במסך מלא ונוח בלחיצה אחת.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: MINOR IMPROVEMENT / RFE SECTION */}
          {activeTab === 'rfe' && !isExpired && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                  border: '1.5px solid #fde047',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  color: '#854d0e'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <Lightbulb size={24} color="#ca8a04" />
                  <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#713f12' }}>
                    הצעות ייעול ובקשות לשיפור (Minor RFE – Request for Enhancement)
                  </h4>
                </div>
                <div style={{ fontSize: '13px', color: '#854d0e', lineHeight: 1.55 }}>
                  מערכת TALA מתפתחת ומשתכללת בזכות המשוב שלך מהשטח. יש לך רעיון לפיצ'ר קטן, דיוק שדה בטופס, שיפור בניסוח, קיצור דרך שיחסוך זמן או כל הצעה אחרת? נשמח מאוד לשמוע ולשלב בעדכונים הקרובים!
                </div>
              </div>

              {rfeSubmitted ? (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    color: '#166534',
                    padding: '16px 18px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14.5px', fontWeight: 700 }}>
                    <CheckCircle2 size={20} color="#16a34a" />
                    <span>תודה רבה! הצעת הייעול שלך נשלחה בהצלחה ונרשמה בצוות הפיתוח 🌷</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#166534' }}>
                    אנו קוראים ולומדים כל בקשה מתוך מחויבות לייעל ולהתאים את המערכת בצורה הטובה ביותר לעבודת אנשי החינוך.
                  </div>
                  <button
                    type="button"
                    onClick={() => setRfeSubmitted(false)}
                    style={{
                      background: '#166534',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    שליחת הצעה נוספת
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitRfe}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e3a5f', marginBottom: '4px' }}>
                      קטגוריית השיפור / ההצעה:
                    </label>
                    <select
                      value={rfeCategory}
                      onChange={(e) => setRfeCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e3a5f', marginBottom: '4px' }}>
                      כותרת קצרה להצעה:
                    </label>
                    <input
                      type="text"
                      value={rfeTitle}
                      onChange={(e) => setRfeTitle(e.target.value)}
                      placeholder="למשל: אפשרות למיון מטרות לפי סדר הופעה, הוספת כפתור שכפול יעד..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e3a5f', marginBottom: '4px' }}>
                      פירוט הבקשה או הרעיון לשיפור:
                    </label>
                    <textarea
                      rows={4}
                      value={rfeMessage}
                      onChange={(e) => setRfeMessage(e.target.value)}
                      placeholder="תארי כיצד הפיצ'ר או השיפור יסייע לך בעבודה, מה חסר לך כרגע או איזה פתרון היית רוצה לראות במערכת..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      הפנייה נשלחת ישירות לצוות הפיתוח של TALA
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingRfe || !rfeMessage.trim()}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 20px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: isSubmittingRfe || !rfeMessage.trim() ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingRfe || !rfeMessage.trim() ? 0.6 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Send size={14} />
                      <span>{isSubmittingRfe ? 'שולח...' : 'שליחת הצעת שיפור'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: FAIR USE POLICY & LICENSE AGREEMENT */}
          {activeTab === 'fair_use' && !isExpired && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  color: '#1e293b'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <FileText size={22} color="#1e3a5f" />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e3a5f' }}>
                    הסכם רישיון שימוש ומדיניות "שימוש נאות" (Fair Use) – מערכת TALA
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569' }}>
                  מערכת <strong>TALA (תוכנית עבודה אקולוגית ותח"י)</strong> פותחה מתוך השקעה רבה כדי להעניק לאנשי חינוך כלי מקצועי, מדויק ומתקדם. על מנת לשמור על פרטיות המידע, יציבות התשתיות וזכויות היוצרים, השימוש במערכת כפוף לכללים הבאים:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Point 1: Personal License */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700, marginBottom: '4px' }}>
                      <Check size={16} color="#16a34a" />
                      <span>1. רישיון אישי למורה / גננת (פר משתמשת)</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      הרישיון לשימוש במערכת הינו <strong>אישי, שמי ובלתי ניתן להעברה</strong>. הרישיון מוענק אך ורק למורה או לגננת שעל שמה רשום החשבון.
                    </div>
                  </div>

                  {/* Point 2: Prohibition on Sharing Account or Providing Reports */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, marginBottom: '4px' }}>
                      <ShieldAlert size={16} color="#dc2626" />
                      <span>2. איסור שיתוף פרטי גישה ואיסור אספקת דוחות לגורמי צד שלישי</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      • <strong>חל איסור מוחלט על שיתוף פרטי הכניסה</strong> (דוא"ל וסיסמה) עם מורות אחרות, אנשי צוות או גורמים חיצוניים.<br />
                      • <strong>חל איסור מוחלט להשתמש בחשבון על מנת להפיק, לבנות, למלא או לספק דוחות, תוכניות עבודה (תל"א/תח"י) או הערכות עבור תלמידים של מורות/גננות אחרות</strong> שאינן בעלות מנוי אישי פעיל במערכת. כל איש חינוך המשתמש במערכת נדרש להחזיק ברישיון אישי משלו.
                    </div>
                  </div>

                  {/* Point 3: Fair Use Limits */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700, marginBottom: '4px' }}>
                      <Check size={16} color="#16a34a" />
                      <span>3. מגבלות שימוש נאות (מכסת תלמידים ומכסת בינה מלאכותית)</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      • <strong>מכסת תלמידים שנתית:</strong> הרישיון השנתי מיועד לניהול שוטף של עד 35 תלמידים פעילים בשנה (בהתאם לתקן המקובל למורה/גננת שילוב). ניהול כמות גדולה יותר דורש הסדרה מראש של רישיון מוסדי/מתי"א מורחב.<br />
                      • <strong>מכסת בקשות AI:</strong> השימוש במנגנוני הבינה המלאכותית (ניסוח שאלות מנחות, הפקת יעדים ואמצעים, וקליטת אבחונים) כפוף למכסת שימוש נאות של עד 20 שאילתות AI לתלמיד בשנה, במטרה להבטיח זמינות וביצועים לכלל המשתמשים.
                    </div>
                  </div>

                  {/* Point 4: Reverse Engineering Prohibition */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, marginBottom: '4px' }}>
                      <ShieldAlert size={16} color="#dc2626" />
                      <span>4. איסור הנדסה לאחור (Reverse Engineering) והעתקת טכנולוגיה</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      חל איסור מוחלט ומפורש להעתיק, לשכפל, להנדס לאחור (Reverse Engineer), לבצע דה-קומפילציה, לפרק את קוד המקור, לצלם מסכים באופן שיטתי או להשתמש במידע, במבנה או במתודולוגיה לצורך פיתוח מוצר מתחרה או מערכת מקבילה.
                    </div>
                  </div>

                  {/* Point 5: Copyrights & IP */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a5f', fontWeight: 700, marginBottom: '4px' }}>
                      <Check size={16} color="#16a34a" />
                      <span>5. זכויות יוצרים וקניין רוחני</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      כל זכויות היוצרים, סימני המסחר, הקניין הרוחני, המתודולוגיה הפדגוגית, מאגר המטרות והיעדים הדינמי, מנגנוני ה-AI והעיצוב במערכת TALA שמורים באופן בלעדי ליוצרת המערכת – <strong>גב' זיוית רשף</strong>. הפרת תנאים אלו תביא לביטול מיידי של הרישיון ומיצוי הצעדים המשפטיים על פי חוק.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUPPORT, WHATSAPP & CONTACT (Also shown when expired) */}
          {(activeTab === 'support' || isExpired) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* About / Personal Letter Toggle for Paid Users */}
              {isNonTrialUser && (
                <div style={{ margin: '0 0 2px 0' }}>
                  <button
                    type="button"
                    onClick={() => setShowAboutLetter((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#1e3a5f',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Info size={16} color="#2563eb" />
                      <span>אודות TALA ואיך נולדה האפליקציה... 🌷</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                      <span>{showAboutLetter ? 'הסתר' : 'קרא עוד'}</span>
                      {showAboutLetter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>
                </div>
              )}

              {/* Personal Letter Box */}
              {showAboutLetter && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    color: '#1e293b',
                    fontSize: '13.5px'
                  }}
                >
                  <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>
                    שלום לך 🌷
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    תודה לך שהתנסית באפליקציה שלנו והקדשת מזמנך להכיר אותה. אני מקווה שגם הספקת למלא את הסקר שמופיע בסיום ההתנסות. המשוב שלך חשוב לנו מאוד, כי הוא מאפשר לנו ללמוד מהניסיון בשטח, לדייק את המערכת ולשפר אותה בהתאם לצרכים האמיתיים של אנשי החינוך.
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontWeight: 600, color: '#1e3a5f' }}>
                    חשוב לי שתדעי איך האפליקציה הזאת נולדה.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    אני אשת חינוך מיוחד עם 24 שנות ניסיון, מנתחת התנהגות בהכשרתי ובעלת הכשרה בהדרכת הורים וצוותים בגישה זו. לאורך השנים הייתי מחנכת ורכזת של כיתות לתלמידים עם הפרעות התנהגות, ניהלתי גנים שפתיים ושימשתי מדריכה פדגוגית במכללת הרצוג. כיום אני עובדת כגננת שילוב.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    לאורך השנים מצאתי את עצמי משקיעה שעות על גבי שעות בכתיבת דוחות ובבניית תוכניות עבודה, ולא פעם מתמודדת עם התחושה שתמיד יש עוד משהו שלא הספקתי. מתוך הצורך האמיתי הזה נולד הרעיון לחבר בין הניסיון הפדגוגי שלי לבין היצירתיות והידע הטכנולוגי של בעלי, מנהל פיתוח בהייטק.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    יחד בנינו, ואנחנו עדיין בונים, את האפליקציה מתוך השקעה עצומה של מחשבה ועבודה, ימים ולילות – מהצבעים והכפתורים ועד להנגשת תהליכי העבודה, שילוב הסטנדרטים של משרד החינוך וצמצום המשימות המנהליות תוך כדי שימוש ב-AI מאובטח, כדי שאנו, מורות וגננות נוכל לייצר מסמכים מקצועיים ומדויקים ככלי עבודה ולהקדיש יותר זמן למה שבאמת חשוב: התלמידים והעבודה החינוכית איתם.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    על מנת שנוכל להמשיך לפתח יכולות חדשות, להוסיף כלים ופיצ’רים, לחזק את התשתיות, לתת תמיכה טכנית ולהרחיב את המערכת גם לשימושי AI נוספים וגם להתמודד עם כמות משתמשים מרובים, אנחנו מזמינים אותך להמשיך להשתמש באפליקציה במסגרת מנוי שנתי בעלות של <strong>150 ₪ לשנה בלבד</strong>.
                  </p>
                  <p style={{ margin: '0 0 12px 0' }}>
                    בעינינו, זהו תשלום סמלי ונגיש ביחס לזמן ולמשאבים שהאפליקציה יכולה לחסוך לאורך השנה. התמיכה שלך תאפשר לנו להמשיך לפתח את המערכת, להקשיב לצרכים שעולים מהשטח ולהפוך אותה לכלי מקצועי, שימושי ומתפתח עבור כולנו.
                  </p>
                  <p style={{ margin: '0 0 14px 0' }}>
                    נשמח שתמשיכי להיות חלק מהדרך שלנו, לשתף אותנו בתובנות ולהשפיע על המשך הפיתוח. ❤️
                  </p>
                  <div style={{ fontWeight: 700, color: '#1e3a5f' }}>
                    תודה על השותפות,
                    <br />
                    זיוית
                  </div>
                </div>
              )}

              {/* Pricing & Direct WhatsApp Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '2px solid #86efac',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                    {isNonTrialUser ? 'פנייה ישירה למנהלת המערכת' : 'רישיון שימוש שנתי מלא ל-TALA'}
                  </div>
                  <div style={{ fontSize: isNonTrialUser ? '20px' : '24px', fontWeight: 800, color: '#14532d' }}>
                    {isNonTrialUser ? 'מענה ישיר בוואטסאפ ובמייל' : '150 ₪ / שנה בלבד'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#166534', marginTop: '2px' }}>
                    {isNonTrialUser
                      ? 'זיוית רשף זמינה להתייעצות פדגוגית, שאלות טכניות ומענה על כל צורך.'
                      : 'כולל מנגנון AI מאובטח, מאגר מטרות דינמי, דוחות תל"א/תח"י, סנכרון ענן וגיבויים.'}
                  </div>
                </div>

                {/* Direct WhatsApp Action Button (Phone number masked) */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '9px',
                    background: '#25D366',
                    color: '#ffffff',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14.5px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
                    transition: 'transform 0.15s ease, background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#20bd5a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#25D366')}
                >
                  <MessageCircle size={20} />
                  <span>{isNonTrialUser ? 'שיחה ישירה בוואטסאפ עם זיוית' : 'פנייה בוואטסאפ להסדרת מנוי'}</span>
                </a>
              </div>

              {/* Tutorial Video Section */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BookOpen size={22} color="#16a34a" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#14532d', fontSize: '13.5px' }}>
                      סרטון הדרכה והיכרות עם TALA (3 דק׳)
                    </strong>
                    <div style={{ fontSize: '12.5px', color: '#166534' }}>
                      הדרכה קצרה וממוקדת: בניית תוכנית אקולוגית, בחירת מטרות מהמאגר והפקת דוחות מקצועיים.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={() => {
                    if (!isExpired && onClose) onClose();
                    if (typeof onOpenIntroVideo === 'function') {
                      onOpenIntroVideo();
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <BookOpen size={16} />
                  <span>צפייה בסרטון</span>
                </button>
              </div>

              {/* Survey Button Section */}
              <div
                style={{
                  background: '#f5f3ff',
                  border: '1px dashed #c4b5fd',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MessageSquareHeart size={22} color="#7c3aed" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#5b21b6', fontSize: '13.5px' }}>
                      המשוב שלך בונה את המערכת
                    </strong>
                    <div style={{ fontSize: '12.5px', color: '#6d28d9' }}>
                      נשמח מאוד לשמוע על חוויית השימוש שלך (ניתן למלא את שאלון המשוב בכל עת, גם מספר פעמים).
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={() => {
                    if (!isExpired) onClose();
                    if (typeof onOpenSurvey === 'function') {
                      onOpenSurvey();
                    }
                  }}
                  style={{
                    background: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <MessageSquareHeart size={16} />
                  <span>פתיחת שאלון המשוב</span>
                </button>
              </div>

              {/* Contact Support & Admin Website Textbox Section */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  background: '#ffffff'
                }}
              >
                <h4
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14.5px',
                    color: '#1e3a5f',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Mail size={16} color="#2563eb" />
                  <span>יצירת קשר עם מנהלת המערכת / תמיכה</span>
                </h4>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '12px' }}>
                  מעדיפה להשאיר הודעה ישירות כאן באתר? כתבי לנו ונחזור אלייך בהקדם.
                </div>

                {messageSent ? (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#166534',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600
                    }}
                  >
                    <CheckCircle2 size={18} color="#16a34a" />
                    <span>ההודעה נשלחה בהצלחה למנהלת המערכת! ניצור איתך קשר בהקדם.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage}>
                    <textarea
                      rows={3}
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="כתבי כאן שאלה, בקשה להסדרת מנוי, צורך בהדרכה או כל דבר אחר..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        marginBottom: '10px'
                      }}
                      required
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        מייל: <strong>zivit.reshef@gmail.com</strong> | וואטסאפ: <strong>זמין בלחיצה ישירה למעלה</strong>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting || !supportMessage.trim()}
                        style={{
                          background: '#1e3a5f',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: isSubmitting || !supportMessage.trim() ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting || !supportMessage.trim() ? 0.6 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Send size={14} />
                        <span>{isSubmitting ? 'שולח...' : 'שליחת הודעה'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            מערכת TALA • פותחה באהבה על ידי אנשי חינוך עבור אנשי חינוך
          </div>
          {isExpired && onLogout ? (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onLogout}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: '1px solid #ef4444',
                background: '#fef2f2',
                color: '#b91c1c',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={14} />
              <span>התנתקות מהמערכת</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 600
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
