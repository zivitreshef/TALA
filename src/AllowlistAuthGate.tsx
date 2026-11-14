import TeacherPreferencesModal from './components/modals/TeacherPreferencesModal';
import TeacherChatWidget from './components/chat/TeacherChatWidget';
import SiteFooter from './components/SiteFooter';
import { useState, useEffect } from 'react';
import {
  Mail,
  KeyRound,
  AlertTriangle,
  UserCheck,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Send,
  MessageSquare,
  BookOpen,
  Loader2,
  CalendarCheck,
  Mic,
  Users,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Play,
  UserPlus,
  Zap,
  FileCheck2,
  Award,
  Star
} from 'lucide-react';

import { loginWithTala, prewarmTalaLogin, signOutFirebaseAuthSession } from './firebaseBackend';
import TakeoverModal from './components/modals/TakeoverModal';
import {
  checkActiveSession,
  activateSession,
  generateSessionId,
  getClientIp
} from './services/sessionSecurity';

export interface AllowlistAuthGateProps {
  allowedUsers?: any[];
  onLoginSuccess?: (user: any) => void;
  onUpdateAllowedUsers?: (users: any[]) => void;
  onSubmitAdminRequest?: (req: any) => void;
  [key: string]: any;
}

export function AllowlistAuthGate({
  allowedUsers = [],
  onLoginSuccess = () => {},
  onUpdateAllowedUsers: _onUpdateAllowedUsers,
  onSubmitAdminRequest = () => {}
}: AllowlistAuthGateProps) {
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAccountLockedError, setIsAccountLockedError] = useState(false);

  // Contact Admin modal / drawer state on landing page
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('שחרור חסימה / איפוס סיסמה');
  const [contactNotes, setContactNotes] = useState('');
  const [contactSentSuccess, setContactSentSuccess] = useState(false);

  // Introductory Video modal state on login page
  const [showIntroVideoModal, setShowIntroVideoModal] = useState(false);

  // Single session takeover state
  const [showTakeoverModal, setShowTakeoverModal] = useState(false);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [takeoverLoading, setTakeoverLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Pre-warm login backend container and resolve IP while teacher views the login screen
  useEffect(() => {
    prewarmTalaLogin().catch(() => {});
    getClientIp().catch(() => {});
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setErrorMsg('');
    setIsAccountLockedError(false);
    setIsLoggingIn(true);

    try {
      // Password check + lockout run server-side (talaLogin Cloud Function).
      const result = await loginWithTala(email, accessCode);

      if (!result.allowed) {
        setErrorMsg(result.reason || 'ההתחברות נכשלה.');
        if (result.isLockedOut || result.isDisabled) {
          setIsAccountLockedError(true);
        }
        setIsLoggingIn(false);
        return;
      }

      // Single active session check (evaluated by server in result.sessionCheck without extra round trips)
      try {
        const sessionId = generateSessionId();
        const sessionCheck = ((result as any).sessionCheck || await checkActiveSession((result as any).user.email, sessionId, (result as any).clientIp)) as any;

        if (sessionCheck.takeoverRequired) {
          setPendingUser({ ...result.user, sessionId, clientIp: sessionCheck.clientIp || result.clientIp });
          setExistingSession(sessionCheck.existingSession);
          setShowTakeoverModal(true);
          setIsLoggingIn(false);
          return;
        }

        // Fire session activation in background, transition UI immediately!
        activateSession(result.user.email, sessionId, sessionCheck.clientIp || result.clientIp);
        onLoginSuccess({ ...result.user, sessionId });
      } catch (sessionErr) {
        console.warn('Session check exception, proceeding with login:', sessionErr);
        onLoginSuccess(result.user);
      }
    } catch (err) {
      console.error('Login exception:', err);
      setErrorMsg('שגיאה בתקשורת עם השרת בעת ההתחברות. אנא נסו שוב.');
      setIsLoggingIn(false);
    }
  };

  const handleConfirmTakeover = async () => {
    if (!pendingUser) return;
    setTakeoverLoading(true);
    try {
      await activateSession(pendingUser.email, pendingUser.sessionId, pendingUser.clientIp);
      setShowTakeoverModal(false);
      onLoginSuccess(pendingUser);
    } catch (err) {
      console.error('Takeover failed:', err);
      setShowTakeoverModal(false);
      onLoginSuccess(pendingUser);
    } finally {
      setTakeoverLoading(false);
    }
  };

  const handleCancelTakeover = async () => {
    setShowTakeoverModal(false);
    setPendingUser(null);
    setExistingSession(null);
    setIsLoggingIn(false);
    setErrorMsg('ההתחברות בוטלה - החיבור במכשיר האחר נשמר.');
    try {
      await signOutFirebaseAuthSession();
    } catch (e) {}
  };

  const handleOpenContactAdmin = (defaultTopic = 'שחרור חסימה / איפוס סיסמה') => {
    setContactEmail(email || '');
    setContactTopic(defaultTopic);
    setContactSentSuccess(false);
    setShowContactAdmin(true);
  };

  const handleSendContactRequest = (e: any) => {
    e.preventDefault();
    if (!contactEmail.trim() && !contactName.trim()) return;

    const reqItem = {
      id: 'req_' + Date.now(),
      name: contactName.trim() || 'משתמש/ת',
      email: contactEmail.trim().toLowerCase(),
      topic: contactTopic,
      notes: contactNotes.trim(),
      createdAt: new Date().toLocaleString('he-IL', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    };

    if (onSubmitAdminRequest) {
      onSubmitAdminRequest(reqItem);
    }
    setContactSentSuccess(true);
    setTimeout(() => {
      setShowContactAdmin(false);
      setContactSentSuccess(false);
      setContactNotes('');
    }, 1800);
  };

  return (
    <div className="auth-page-wrapper" dir="rtl">
      {showTakeoverModal && (
        <TakeoverModal
          existingSession={existingSession}
          onConfirmTakeover={handleConfirmTakeover}
          onCancel={handleCancelTakeover}
          loading={takeoverLoading}
        />
      )}
      <div className="saas-landing-container">
        {/* Top Full-Bleed Warm Glassmorphic Navigation Bar */}
        <header className="saas-landing-navbar" aria-label="סרגל ניווט ראשי">
          <div className="saas-navbar-inner">
            <div className="saas-navbar-brand">
              <div className="auth-logo-frame saas-navbar-logo">
                <img src="./tala-logo.png" alt="TALA Logo" className="auth-logo-img" />
              </div>
              <div className="saas-navbar-brand-text">
                <div className="saas-navbar-title-row">
                  <span className="auth-title saas-brand-name">מערכת TALA</span>
                  <span className="auth-badge-pill saas-nav-badge">
                    <Sparkles size={12} className="auth-badge-sparkle" />
                    <span>סביבת עבודה פדגוגית חכמה ומעקב שוטף</span>
                  </span>
                </div>
                <span className="saas-navbar-tagline">
                  צמח מתוך השטח • מותאם באהבה למורות שילוב, גננות שיח וצוותי חינוך מיוחד
                </span>
              </div>
            </div>

            <div className="saas-navbar-actions">
              <button
                type="button"
                className="btn-saas-nav-video"
                onClick={() => setShowIntroVideoModal(true)}
                title="צפייה בסרטון היכרות והדרכה קצר על מערכת TALA"
              >
                <Play size={14} className="btn-auth-play-icon" />
                <span>סרטון הדגמה (3 דק׳)</span>
              </button>
              <button
                type="button"
                className="btn-saas-nav-trial"
                onClick={() => handleOpenContactAdmin('בקשת הרשאת גישה למערכת')}
              >
                <UserPlus size={15} />
                <span>בקשת גישה והתנסות</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Full-Width Hero & Login Split Showcase */}
        <div className="auth-landing-shell saas-hero-shell">
          {/* Right Column: Warm Human Hero Pitch + Authentic WhatsApp Voices + Live Workflow Preview */}
          <div className="auth-showcase-panel saas-hero-showcase human-daylight-showcase">
            <div className="auth-showcase-top saas-hero-copy">
              <div className="saas-eyebrow-pill">
                <Zap size={13} className="saas-eyebrow-icon" />
                <span>נבנה מהשטח עבור צוותי חינוך מיוחד • סוף לניירת ולעבודה אל תוך הלילה</span>
              </div>

              <h1 className="saas-hero-headline">
                הפכי שעות של ניירת וסיכומים{' '}
                <span className="saas-hero-highlight">לדקות של עשייה פדגוגית ממוקדת</span>
              </h1>

              <p className="auth-subtitle saas-hero-subtitle">
                סביבת עבודה פדגוגית משותפת, יומן יעדים שוטף, תיעוד תצפיות מהיר ומאגר מטרות אקולוגי –
                כלי עזר יומיומי חם, מונגש ופשוט שמלווה אותך מהטלפון בכיתה ומהמחשב בבית.
              </p>

              <div className="saas-hero-cta-group">
                <button
                  type="button"
                  className="btn-saas-primary-trial"
                  onClick={() => handleOpenContactAdmin('בקשת הרשאת גישה למערכת')}
                >
                  <UserPlus size={17} />
                  <span>בקשת גישה והתנסות ראשונית</span>
                </button>

                <button
                  type="button"
                  className="btn-auth-watch-video"
                  onClick={() => setShowIntroVideoModal(true)}
                  title="צפייה בסרטון היכרות והדרכה קצר על מערכת TALA"
                >
                  <Play size={15} className="btn-auth-play-icon" />
                  <span>צפייה בסרטון היכרות והדרכה (3 דק׳)</span>
                </button>
              </div>
            </div>

            {/* Authentic Voices from the Field: Real WhatsApp Messages & Voice Notes */}
            <div className="saas-whatsapp-voices-section authentic-whatsapp-theme" aria-label="קולות אמיתיים מהשטח בוואטסאפ">
              <div className="saas-whatsapp-chat-header">
                <div className="whatsapp-chat-header-info">
                  <div className="whatsapp-chat-avatar">
                    <MessageSquare size={17} />
                  </div>
                  <div className="whatsapp-chat-title-group">
                    <div className="whatsapp-chat-name-row">
                      <strong className="whatsapp-chat-title">קבוצת משתמשות TALA • מורות וגננות מהשטח</strong>
                      <span className="whatsapp-chat-verified-badge">מאומת</span>
                    </div>
                    <span className="whatsapp-chat-status">
                      💬 קולות אמיתיים מהשטח • הודעות וואטסאפ והקלטות קוליות אותנטיות ללא עריכה
                    </span>
                  </div>
                </div>
                <div className="whatsapp-chat-header-date">
                  <span>היום</span>
                </div>
              </div>

              <div className="saas-whatsapp-grid">
                {/* Voice Note & Feedback 1: Special Education Teacher */}
                <div className="whatsapp-bubble-card whatsapp-voice-memo-bubble">
                  <div className="whatsapp-bubble-tail" aria-hidden="true" />
                  <div className="whatsapp-sender-tag">מורה לחינוך מיוחד ושילוב</div>
                  <div className="whatsapp-voice-player-row">
                    <div className="whatsapp-play-circle" title="הודעה קולית">
                      <Play size={14} fill="#ffffff" color="#ffffff" className="whatsapp-play-triangle" />
                    </div>
                    <div className="whatsapp-voice-waveform" aria-hidden="true">
                      <span style={{ height: '7px' }} />
                      <span style={{ height: '14px' }} />
                      <span style={{ height: '10px' }} />
                      <span style={{ height: '18px' }} />
                      <span style={{ height: '12px' }} />
                      <span style={{ height: '16px' }} />
                      <span style={{ height: '8px' }} />
                      <span style={{ height: '19px' }} />
                      <span style={{ height: '13px' }} />
                      <span style={{ height: '15px' }} />
                      <span style={{ height: '9px' }} />
                      <span style={{ height: '17px' }} />
                      <span style={{ height: '11px' }} />
                      <span style={{ height: '6px' }} />
                    </div>
                    <span className="whatsapp-voice-duration">0:41</span>
                  </div>
                  <p className="whatsapp-bubble-text">
                    &ldquo;היי זיוית, רציתי לשתף אותך שהפקתי את התוכנית הראשונה מ-TALA ואני מרוצה. היתה לי חוויה טובה, מונגשת וממקדת. פיתחת כלי עזר נפלא! <strong>דוח מצב - וואו!!!</strong> אני נכנסת לראות... מטורף. תודה רבה 🥰&rdquo;
                  </p>
                  <div className="whatsapp-bubble-meta">
                    <span>18:03</span>
                    <span className="whatsapp-checks" aria-hidden="true">✓✓</span>
                  </div>
                </div>

                {/* Voice Note & Feedback 2: Special Kindergarten Teacher */}
                <div className="whatsapp-bubble-card whatsapp-incoming-bubble">
                  <div className="whatsapp-bubble-tail" aria-hidden="true" />
                  <div className="whatsapp-sender-tag">גננת חינוך מיוחד</div>
                  <div className="whatsapp-voice-player-row">
                    <div className="whatsapp-play-circle" title="הודעה קולית">
                      <Play size={14} fill="#ffffff" color="#ffffff" className="whatsapp-play-triangle" />
                    </div>
                    <div className="whatsapp-voice-waveform" aria-hidden="true">
                      <span style={{ height: '9px' }} />
                      <span style={{ height: '12px' }} />
                      <span style={{ height: '17px' }} />
                      <span style={{ height: '11px' }} />
                      <span style={{ height: '19px' }} />
                      <span style={{ height: '14px' }} />
                      <span style={{ height: '8px' }} />
                      <span style={{ height: '16px' }} />
                      <span style={{ height: '10px' }} />
                      <span style={{ height: '13px' }} />
                    </div>
                    <span className="whatsapp-voice-duration">0:30</span>
                  </div>
                  <p className="whatsapp-bubble-text">
                    &ldquo;ישששש פתחתי שוב ולחצתי על עיבוד בלי לשנות כלום וזה הוסיף עוד מטרה בהתאם לבקשה 💃 <strong>וראיתי שהוספתם הקלטה מצויין 🎉🎉 זה הדבר הבא 😍 את חייבת לדחוף את זה!</strong> אמרתי לגננת הסמוכה שלידי שתיצור קשר להתחבר ולהתנסות 🙏&rdquo;
                  </p>
                  <div className="whatsapp-bubble-meta">
                    <span>21:03</span>
                    <span className="whatsapp-checks" aria-hidden="true">✓✓</span>
                  </div>
                </div>

                {/* Text Feedback 3: Integration Teacher */}
                <div className="whatsapp-bubble-card whatsapp-incoming-bubble">
                  <div className="whatsapp-bubble-tail" aria-hidden="true" />
                  <div className="whatsapp-sender-tag">מורת שילוב</div>
                  <p className="whatsapp-bubble-text">
                    &ldquo;תוכנה מדהימה, עוזרת לי לדייק את הדברים. <strong>השאלות המנחות הן מעולות לדייק את התפקוד כעת!!!</strong> 😉 וואו איזה שדרוגים פשוט מטורף ❤️&rdquo;
                  </p>
                  <div className="whatsapp-bubble-meta">
                    <span>14:01</span>
                    <span className="whatsapp-checks" aria-hidden="true">✓✓</span>
                  </div>
                </div>

                {/* Text Feedback 4: Kindergarten Leader & Coordinator */}
                <div className="whatsapp-bubble-card whatsapp-outgoing-bubble">
                  <div className="whatsapp-bubble-tail-outgoing" aria-hidden="true" />
                  <div className="whatsapp-sender-tag">רכזת וגננת שיח</div>
                  <p className="whatsapp-bubble-text">
                    &ldquo;קודם כל באהבה רבה ובכיף ❤️ גם אעביר תשלום שהאפליקציה לא תסגר לשימוש 😍 <strong>אני עפה על זה 💃💃💃</strong> ונמשיך לשווק בע״ה ❤️🙏 אתם אלופים ממש 👑&rdquo;
                  </p>
                  <div className="whatsapp-bubble-meta">
                    <span>15:14</span>
                    <span className="whatsapp-checks" aria-hidden="true">✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Soft Daylight Product Workflow Preview ("Show, Don't Tell") */}
            <div className="saas-product-mockup daylight-mockup" aria-label="הדמיית ממשק המערכת בפעולה">
              <div className="saas-mockup-topbar">
                <div className="saas-mockup-dots">
                  <span className="mockup-dot dot-red" />
                  <span className="mockup-dot dot-amber" />
                  <span className="mockup-dot dot-green" />
                </div>
                <span className="saas-mockup-window-title">
                  תצוגה חיה מסביבת העבודה • יומן פדגוגי ודופק כיתתי
                </span>
                <span className="saas-mockup-live-badge">
                  <span className="live-pulse-dot" />
                  מסונכרן בענן
                </span>
              </div>

              <div className="saas-mockup-body">
                {/* Simulated Live Card 1: Voice Observation Capture */}
                <div className="saas-mockup-card mockup-voice-card">
                  <div className="saas-mockup-card-head">
                    <div className="mockup-icon-badge badge-rose">
                      <Mic size={15} />
                    </div>
                    <div className="mockup-head-titles">
                      <strong>תיעוד תצפית קולי מהיר מהכיתה</strong>
                      <span>הוקלט מהנייד בסוף השיעור • 00:14 שניות</span>
                    </div>
                  </div>
                  <div className="saas-mockup-quote">
                    &ldquo;דניאל יזם שיחה עם חבר בהפסקה, ביקש להצטרף למשחק הכדורגל והמתין לתורו בסבלנות.&rdquo;
                  </div>
                  <div className="saas-mockup-tags">
                    <span className="mockup-tag tag-sky">
                      <CheckCircle2 size={11} />
                      שויך אוטומטית ליעד: תקשורת ויוזמה חברתית
                    </span>
                    <span className="mockup-tag tag-emerald">
                      <Sparkles size={11} />
                      סטטוס יעד: התקדמות משמעותית
                    </span>
                  </div>
                </div>

                {/* Simulated Live Card 2: 1-Click Team Readiness Report */}
                <div className="saas-mockup-card mockup-report-card">
                  <div className="saas-mockup-card-head">
                    <div className="mockup-icon-badge badge-emerald">
                      <FileCheck2 size={15} />
                    </div>
                    <div className="mockup-head-titles">
                      <strong>דוח מוכנות לישיבת צוות רב-מקצועית</strong>
                      <span>סיכום חכם בלחיצת כפתור • מוכן להדפסה</span>
                    </div>
                  </div>
                  <div className="saas-mockup-progress-box">
                    <div className="mockup-progress-labels">
                      <span>עמידה ביעדי התוכנית הפדגוגית</span>
                      <strong>85% הושגו</strong>
                    </div>
                    <div className="mockup-progress-track">
                      <div className="mockup-progress-fill" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div className="saas-mockup-ai-summary">
                    <Sparkles size={13} className="ai-summary-icon" />
                    <span>
                      <strong>תקציר בינה מלאכותית לצוות:</strong> ניכרת קפיצה ביכולת הוויסות והיוזמה החברתית במרחב הכיתתי.
                    </span>
                  </div>
                </div>
              </div>

              <div className="saas-mockup-footer-metric">
                <Award size={15} className="metric-award-icon" />
                <span>
                  מורות מדווחות על <strong>חיסכון של כ-4 שעות עבודה שבועיות</strong> בתיעוד, מיפוי והכנת דוחות לצוות ולהורים
                </span>
              </div>
            </div>
          </div>

          {/* Left Column: Compact Login Card (~40% Shorter) + Authentic Survey Results Social Proof Card */}
          <div className="auth-left-column">
            <div className="auth-login-panel saas-login-panel compact-login-panel">
              <div className="auth-stained-glass-bar" />

              <div className="compact-login-top-row">
                <div className="auth-login-header compact">
                  <h2>כניסה למערכת</h2>
                  <p>הזינו את כתובת הדוא"ל וקוד הגישה האישי שלכם</p>
                </div>
                <div className="saas-login-status-pill compact">
                  <ShieldCheck size={12} />
                  <span>צוות מורשה</span>
                </div>
              </div>

              {errorMsg && (
                <div
                  className="auth-error-banner compact"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={17} style={{ flexShrink: 0 }} />
                    <span>{errorMsg}</span>
                  </div>
                  {isAccountLockedError && (
                    <button
                      type="button"
                      onClick={() => handleOpenContactAdmin('שחרור חסימת חשבון')}
                      style={{
                        alignSelf: 'flex-end',
                        background: '#991b1b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <MessageSquare size={12} />
                      <span>פנייה למנהל/ת המערכת לשחרור החסימה</span>
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form compact-form">
                <div className="form-field compact">
                  <label>כתובת דואר אלקטרוני:</label>
                  <div className="input-with-icon">
                    <Mail size={15} className="field-icon" />
                    <input
                      type="email"
                      required
                      placeholder="name@education.gov.il"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => prewarmTalaLogin().catch(() => {})}
                      disabled={isLoggingIn}
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                    />
                  </div>
                </div>

                <div className="form-field compact">
                  <label>קוד גישה אישי / סיסמה:</label>
                  <div className="input-with-icon" style={{ position: 'relative' }}>
                    <KeyRound size={15} className="field-icon" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onFocus={() => prewarmTalaLogin().catch(() => {})}
                      disabled={isLoggingIn}
                      style={{ paddingLeft: '38px', paddingRight: '34px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      disabled={isLoggingIn}
                      title={showLoginPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                      aria-label={showLoginPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                      className="password-eye-toggle-btn compact"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-auth-submit compact"
                  disabled={isLoggingIn}
                  aria-busy={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 size={16} className="tala-spin-icon" />
                      <span>מתחבר למערכת...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={16} />
                      <span>כניסה למערכת TALA</span>
                    </>
                  )}
                </button>
              </form>

              {/* Compact Onboarding Strip for Prospective Teachers */}
              <div className="saas-new-teacher-box compact">
                <div className="saas-new-teacher-text compact">
                  <strong>עדיין אין לך חשבון במערכת?</strong>
                  <span>הצטרפי למורות שילוב, גננות וצוותים שכבר עובדים חכם ומהיר יותר.</span>
                </div>
                <button
                  type="button"
                  className="btn-saas-open-trial compact"
                  onClick={() => handleOpenContactAdmin('בקשת הרשאת גישה למערכת')}
                >
                  <UserPlus size={14} />
                  <span>פתיחת חשבון התנסות / בקשת גישה</span>
                </button>
              </div>

              {/* Compact Contact Admin & Security Footer */}
              <div className="auth-contact-admin-footer compact">
                <div className="auth-contact-admin-row">
                  <span>נתקלת בבעיה בכניסה או שהחשבון נחסם?</span>
                  <button
                    type="button"
                    className="btn-link-contact-admin compact"
                    onClick={() => handleOpenContactAdmin('שחרור חסימה / איפוס סיסמה')}
                  >
                    <MessageSquare size={13} />
                    <span>פנייה למנהל/ת המערכת</span>
                  </button>
                </div>
                <div className="auth-security-notice compact">
                  <ShieldCheck size={12} />
                  <span>חיבור מאובטח • סביבת הוראה מוגנת</span>
                </div>
              </div>
            </div>

            {/* Authentic Social Proof: Verified Survey Results Card */}
            <div className="saas-survey-card" aria-label="תוצאות סקר שביעות רצון משתמשות">
              <div className="survey-card-top-bar">
                <div className="survey-title-group">
                  <div className="survey-badge">
                    <Award size={13} className="survey-badge-icon" />
                    <span>סקר שביעות רצון פדגוגי</span>
                  </div>
                  <strong className="survey-heading">דירוג חוויית השימוש לפי תחומים</strong>
                </div>

                <div className="survey-score-display">
                  <div className="survey-score-stars" aria-label="ציון משוקלל 5 מתוך 5 כוכבים">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={15} fill="#f59e0b" color="#f59e0b" className="star-gold" />
                    ))}
                  </div>
                  <span className="survey-score-number">5.0 / 5.0</span>
                </div>
              </div>

              {/* 100% Recommendation Box */}
              <div className="survey-recommendation-box">
                <span className="survey-recommendation-bulb" aria-hidden="true">💡</span>
                <div className="survey-recommendation-text">
                  <strong>האם תמליצי לקולגות ולמנהלת לרכוש גישה ל-TALA?</strong>
                  <p>&ldquo;כן, סביר שאמליץ לקולגות ולמנהלת לרכוש גישה להמשך שימוש במערכת&rdquo;</p>
                </div>
              </div>

              {/* 5-Area Breakdown List */}
              <div className="survey-metrics-grid">
                <div className="survey-metric-row">
                  <span className="survey-metric-label">1. קלות ונוחות השימוש בממשק המערכת</span>
                  <div className="survey-metric-rating">
                    <span className="metric-stars">⭐⭐⭐⭐⭐</span>
                    <strong className="metric-grade">5/5</strong>
                  </div>
                </div>

                <div className="survey-metric-row">
                  <span className="survey-metric-label">2. יצירה והקמה מהירה של כרטיס תלמיד/ה</span>
                  <div className="survey-metric-rating">
                    <span className="metric-stars">⭐⭐⭐⭐⭐</span>
                    <strong className="metric-grade">5/5</strong>
                  </div>
                </div>

                <div className="survey-metric-row">
                  <span className="survey-metric-label">3. ניסוח ובניית מטרות ויעדים עם מאגר מטרות ובינה מלאכותית</span>
                  <div className="survey-metric-rating">
                    <span className="metric-stars">⭐⭐⭐⭐⭐</span>
                    <strong className="metric-grade">5/5</strong>
                  </div>
                </div>

                <div className="survey-metric-row">
                  <span className="survey-metric-label">4. הפקת דוחות – תל״א/תח״י, דו״ח מצב ודוח הערכה</span>
                  <div className="survey-metric-rating">
                    <span className="metric-stars">⭐⭐⭐⭐⭐</span>
                    <strong className="metric-grade">5/5</strong>
                  </div>
                </div>

                <div className="survey-metric-row">
                  <span className="survey-metric-label">5. שיתוף תלמיד/ה ועבודה משותפת עם קולגות בצוות</span>
                  <div className="survey-metric-rating">
                    <span className="metric-stars">⭐⭐⭐⭐⭐</span>
                    <strong className="metric-grade">5/5</strong>
                  </div>
                </div>
              </div>

              <div className="survey-verified-footer">
                <CheckCircle2 size={13} className="survey-verified-check" />
                <span>משוב מאומת • גננת חנ״מ, מתי״א קרית שמונה</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Pillar Pedagogical Value Strip */}
        <section className="saas-pillars-section" aria-label="עמודי התווך של המערכת">
          <div className="auth-features-grid saas-features-4col">
            <div className="auth-feature-card saas-pillar-card">
              <div className="auth-feature-card-header">
                <div className="auth-feature-icon icon-tracker">
                  <CalendarCheck size={19} />
                </div>
                <strong>יומן יעדים ומעקב שוטף</strong>
              </div>
              <p>מעקב ביצוע רציף אחר מטרות ויעדים לאורך כל שנת הלימודים, ניהול סטטוס וציוני דרך.</p>
            </div>

            <div className="auth-feature-card saas-pillar-card">
              <div className="auth-feature-card-header">
                <div className="auth-feature-icon icon-capture">
                  <Mic size={19} />
                </div>
                <strong>תיעוד תצפיות והקלטה קולית</strong>
              </div>
              <p>תפיסת רגעי למידה, התנהגות והצלחות בכיתה תוך שניות – ישירות מהנייד בקול ובטקסט.</p>
            </div>

            <div className="auth-feature-card saas-pillar-card">
              <div className="auth-feature-card-header">
                <div className="auth-feature-icon icon-team">
                  <Users size={19} />
                </div>
                <strong>מוכנות לצוות ודוחות ישיבות</strong>
              </div>
              <p>הפקת דוחות סיכום רב-מקצועיים ותמונת מצב כיתתית מרוכזת בלחיצה אחת לקראת ישיבות.</p>
            </div>

            <div className="auth-feature-card saas-pillar-card">
              <div className="auth-feature-card-header">
                <div className="auth-feature-icon icon-ai">
                  <Sparkles size={19} />
                </div>
                <strong>מאגר אקולוגי ובינה מלאכותית</strong>
              </div>
              <p>מאגר מטרות חכם בסביבות השתתפות טבעיות, ניסוח מותאם אישית ושאלות מנחות מסייעות.</p>
            </div>
          </div>

          <div className="auth-showcase-trust-strip saas-bottom-trust-strip">
            <span className="auth-trust-pill">
              <CheckCircle2 size={13} />
              <span>גישה אקולוגית</span>
            </span>
            <span className="auth-trust-pill">
              <Smartphone size={13} />
              <span>זמינות מכל מכשיר</span>
            </span>
            <span className="auth-trust-pill">
              <ShieldCheck size={13} />
              <span>הגנת פרטיות מלאה</span>
            </span>
            <span className="auth-trust-pill">
              <Sparkles size={13} />
              <span>מותאם לצוותי חינוך מיוחד ושילוב</span>
            </span>
          </div>
        </section>
      </div>

      {/* Contact Admin Modal on Landing Page */}
      {showContactAdmin && (
        <div
          className="modal-backdrop"
          onClick={() => setShowContactAdmin(false)}
          dir="rtl"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <div className="modal-header-title">
                <MessageSquare size={20} className="text-primary" />
                <h3>פנייה למנהל/ת המערכת</h3>
              </div>
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setShowContactAdmin(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendContactRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  באפשרותך לשלוח הודעה ישירה שתופיע אצל מנהל/ת המערכת באתר או לשלוח אימייל ישיר.
                </p>

                {contactSentSuccess && (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #6ee7b7',
                      color: '#065f46',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    ✓ פנייתך נשלחה בהצלחה ותוצג למנהל/ת המערכת!
                  </div>
                )}

                <div className="form-field">
                  <label>שם מלא:</label>
                  <input
                    type="text"
                    required
                    placeholder="הזן את שמך המלא..."
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>כתובת דוא"ל שלך:</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div className="form-field">
                  <label>נושא הפנייה:</label>
                  <select
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                  >
                    <option value="שחרור חסימת חשבון">
                      שחרור חסימת חשבון
                    </option>
                    <option value="שחרור חסימה / איפוס סיסמה">
                      שכחתי סיסמה / בקשה לאיפוס סיסמה
                    </option>
                    <option value="בקשת הרשאת גישה למערכת">
                      בקשת הרשאת גישה למשתמש/ת חדש/ה
                    </option>
                    <option value="פנייה כללית למנהל/ת המערכת">
                      פנייה כללית למנהל/ת המערכת
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label>הודעה / פרטים נוספים:</label>
                  <textarea
                    rows={2}
                    placeholder="פרטים נוספים למנהל/ת המערכת..."
                    value={contactNotes}
                    onChange={(e) => setContactNotes(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <a
                  href={`mailto:zivit.reshef@gmail.com?subject=${encodeURIComponent(
                    `פנייה ממערכת TALA: ${contactTopic}`
                  )}&body=${encodeURIComponent(
                    `שלום,\nשמי: ${contactName}\nאימייל: ${contactEmail}\nנושא: ${contactTopic}\n\n${contactNotes}`
                  )}`}
                  className="btn-secondary-sm"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Mail size={14} />
                  <span>שליחת אימייל ישיר</span>
                </a>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => setShowContactAdmin(false)}
                  >
                    ביטול
                  </button>
                  <button type="submit" className="btn-primary-sm">
                    <Send size={14} />
                    <span>שלח פנייה למנהל/ת</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Introductory Video Player Modal */}
      {showIntroVideoModal && (
        <div className="modal-backdrop" onClick={() => setShowIntroVideoModal(false)} dir="rtl">
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '820px', padding: '0', overflow: 'hidden', borderRadius: '16px' }}
          >
            <div className="modal-header" style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div className="modal-header-title">
                <BookOpen size={20} className="text-primary" />
                <h3>סרטון הדרכה – היכרות עם מערכת TALA</h3>
              </div>
              <button type="button" className="btn-icon-close" onClick={() => setShowIntroVideoModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <video
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '75vh', display: 'block' }}
                src="./tala_intro_video.mp4"
              >
                הדפדפן שלך אינו תומך בנגן הווידאו.
              </video>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                הופק באמצעות NotebookLM • הדרכה קצרה וממוקדת
              </span>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={() => setShowIntroVideoModal(false)}
              >
                סגור נגן
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Persistent Site Footer & RgM Professional Branding */}
      <SiteFooter />

      {/* Live Bi-directional Support Chat on Login Screen (for lockout or assistance) */}
      <TeacherChatWidget
        initialUserEmail={email || contactEmail}
        initialUserName={contactName || 'מורה'}
        allowedUsers={allowedUsers}
      />
    </div>
  );
}

export function UserSelfPasswordModal(props: any) {
  return <TeacherPreferencesModal {...props} />;
}

export { default as AdminAllowlistModal } from './components/modals/AdminAllowlistModal';

export default AllowlistAuthGate;
