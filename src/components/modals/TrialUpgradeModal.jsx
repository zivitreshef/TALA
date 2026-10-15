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
  BookOpen
} from 'lucide-react';

export default function TrialUpgradeModal({
  isOpen,
  onClose,
  currentUser,
  onOpenSurvey,
  onOpenIntroVideo,
  onSubmitSupportMessage,
  remainingDays = null,
  isExpired = false,
  onLogout = null
}) {
  const isNonTrialUser = Boolean(currentUser && !currentUser.isTrialUser);
  const [supportMessage, setSupportMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAboutLetter, setShowAboutLetter] = useState(!isNonTrialUser);

  useEffect(() => {
    if (isOpen) {
      setShowAboutLetter(!isNonTrialUser);
      setMessageSent(false);
      setSupportMessage('');
    }
  }, [isOpen, isNonTrialUser]);

  if (!isOpen || !currentUser) return null;
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

  return (
    <div
      className="modal-backdrop"
      dir="rtl"
      onClick={isExpired ? undefined : onClose}
      style={{ zIndex: 2400, padding: '20px' }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '740px',
          width: '100%',
          maxHeight: '92vh',
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
            padding: '18px 22px',
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
                  ? 'מרכז תמיכה ופנייה למנהלת המערכת'
                  : isExpired
                  ? 'תקופת הניסיון הסתיימה – הסדרת מנוי שנתי ל-TALA'
                  : 'הסדרת מנוי שנתי – שותפים לדרך ב-TALA'}
              </h3>
              <span style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.85)' }}>
                {isNonTrialUser
                  ? 'תמיכה פדגוגית, סיוע טכני, שאלון משוב וקשר ישיר עם זיוית'
                  : isExpired
                  ? 'להמשך עבודה במערכת ופתיחת הגישה לנתונים'
                  : 'מכתב אישי מזיוית רשף, יוצרת המערכת'}
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
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            lineHeight: 1.65,
            color: '#334155',
            fontSize: '14px'
          }}
        >
          {/* Status Banners */}
          {isNonTrialUser ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#166534'
              }}
            >
              <ShieldCheck size={24} style={{ flexShrink: 0, color: '#16a34a' }} />
              <div>
                <strong>מנוי שנתי פעיל – מערכת TALA 🌷</strong>
                <div style={{ fontSize: '12.5px', marginTop: '2px' }}>
                  חשבונך מוגדר כמנוי פעיל עם גישה מלאה. לשאלות מקצועיות, סיוע טכני או הצעות לשיפור, זיוית זמינה תמיד בוואטסאפ או בטופס להלן.
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

          {/* About / Personal Letter Toggle for Paid Users */}
          {isNonTrialUser && (
            <div style={{ margin: '0 0 6px 0' }}>
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
                fontSize: '14px'
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

          {/* Pricing Highlight Card */}
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
