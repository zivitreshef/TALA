import { useState } from 'react';
import {
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  LogOut
} from 'lucide-react';
import { AllowedUserRecord, CURRENT_PAID_LICENSE_VERSION } from '../../allowedUsers';

export interface PaidLicenseModalProps {
  isOpen: boolean;
  currentUser: Partial<AllowedUserRecord> | null;
  onAcceptLicense: (payload: {
    version: string;
    acceptedAt: string;
    userEmail: string;
    userName: string;
  }) => void | Promise<void>;
  onLogout?: () => void;
}

export default function PaidLicenseModal({
  isOpen,
  currentUser,
  onAcceptLicense,
  onLogout
}: PaidLicenseModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 35) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!agreementChecked) {
      setErrorMsg('יש לסמן את תיבת האישור לפני שניתן להמשיך למערכת.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onAcceptLicense({
        version: CURRENT_PAID_LICENSE_VERSION,
        acceptedAt: new Date().toISOString(),
        userEmail: currentUser.email || '',
        userName: currentUser.name || ''
      });
    } catch {
      setErrorMsg('חלה שגיאה בשמירת האישור. אנא נסי שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      dir="rtl"
    >
      <div
        className="modal-card"
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e3a8a'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa'
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#ffffff'
                }}
              >
                הסכם רישיון שימוש, תנאי מנוי ותמיכה
              </h2>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '13px',
                  color: '#bfdbfe'
                }}
              >
                שלום {currentUser.name || 'אשת חינוך יקרה'}, חשבונך שודרג למנוי שנתי מלא! אנא אשרי את תנאי הרישיון להמשך.
              </p>
            </div>
          </div>

          <a
            href="./docs/legal/TALA_License_Agreement_EULA.pdf"
            download="TALA_License_Agreement_EULA.pdf"
            target="_blank"
            rel="noopener noreferrer"
            title="הורדת מסמך הרישיון הרשמי בפורמט PDF"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              transition: 'background 0.2s'
            }}
          >
            <Download size={14} />
            <span>הורדת מסמך חתום</span>
          </a>
        </div>

        {/* Scrollable Document Content */}
        <div
          onScroll={handleScroll}
          data-testid="paid-license-scroll-container"
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            fontSize: '13.5px',
            lineHeight: 1.65,
            color: '#334155',
            backgroundColor: '#f8fafc',
            flex: 1
          }}
        >
          {/* Welcome Callout */}
          <div
            style={{
              background: '#ffffff',
              borderRight: '4px solid #2563eb',
              borderRadius: '8px',
              padding: '14px 18px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderTop: '1px solid #f1f5f9',
              borderBottom: '1px solid #f1f5f9',
              borderLeft: '1px solid #f1f5f9'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: '#1e3a8a', fontWeight: 700 }}>
              <Sparkles size={16} color="#2563eb" />
              <span>ברוכה הבאה למשפחת המנויים של TALA!</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
              TALA היא מערכת עזר חכמה המיועדת לאנשי חינוך והוראה, המסייעת בתכנון עבודה חינוכית, בניית תוכניות אישיות לתלמידים, תיעוד תהליכים, הפקת דוחות וייעול העבודה המקצועית בהוראה ובחינוך המיוחד.
            </p>
          </div>

          {/* Section 1 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              1. תנאי הרישיון, תמורה ותשלום
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>1.1. מהות הרישיון:</strong> עם התשלום, מוענק למשתמשת רישיון שימוש אישי, מוגבל, שאינו בלעדי ובלתי ניתן להעברה, לעשות שימוש במערכת TALA.</li>
              <li><strong>1.2. מחיר המנוי:</strong> מחיר השקה מיוחד עומד על 150 ₪ לשנת שימוש מלאה (כולל מע"מ ככל שחל).</li>
              <li>
                <strong>1.3. תכולת הרישיון לשנה:</strong>
                <ul style={{ marginTop: '3px', paddingRight: '18px' }}>
                  <li>מנוי אישי למשתמשת רשומה אחת.</li>
                  <li>תקופת שימוש קצובה של 12 חודשים ממועד הפעלת החשבון.</li>
                  <li>מכסת עבודה: אפשרות לבנייה, ניהול ותיעוד של עד 22 תוכניות עבודה לתלמידים במקביל.</li>
                  <li>שימוש בכלים, במודולים וביכולות המערכת הזמינים במסלול בעת הרכישה.</li>
                  <li>שירותי תמיכה טכנית כמפורט בסעיף 4 להלן.</li>
                </ul>
              </li>
              <li><strong>1.4. אופן התשלום:</strong> תשלום שנתי חד-פעמי מראש עבור שנת שימוש מלאה, באמצעות סליקה מאובטחת.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              2. תקופת המנוי, סיום וחידוש
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>2.1.</strong> תוקף המנוי הינו ל-12 חודשים קלנדריים ממועד הפעלתו.</li>
              <li><strong>2.2.</strong> המנוי אינו מתחדש באופן אוטומטי ולא יבוצע כל חיוב ללא אישור מפורש מראש.</li>
              <li><strong>2.3.</strong> בתום 12 החודשים תסתיים תקופת הרישיון והגישה תיחסם, אלא אם יחודש המנוי בתשלום.</li>
              <li><strong>2.4.</strong> מחיר החידוש עשוי להתעדכן ויוצג לאישורה של המשתמשת טרם החידוש.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              3. שימוש אישי ומגבלות אבטחה
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>3.1.</strong> החשבון הינו אישי ופרטני. חל איסור מוחלט על העברת פרטי הגישה, שיתוף סיסמאות או מתן הרשאה לצדדים שלישיים.</li>
              <li><strong>3.2.</strong> המשתמשת רשאית לנהל עד 22 תוכניות תלמידים. חל איסור לעקוף מגבלה זו או לבצע שימוש מסחרי או שיתופי בחשבון.</li>
              <li><strong>3.3.</strong> חל איסור להעתיק, להנדס לאחור, לסרוק חולשות אבטחה או להשתמש באמצעים אוטומטיים במערכת.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              4. תמיכה טכנית ושירות
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>4.1.</strong> התמיכה נועדה לסייע בתפעול שוטף, טיפול בתקלות תוכנה ופתרון שגיאות.</li>
              <li><strong>4.2. התמיכה כוללת:</strong> סיוע בהתחברות ואיפוס גישה, פתרון בעיות שמירה, עזרה בהפקת דוחות (PDF), ומענה לשגיאות מערכת.</li>
              <li><strong>4.3. התמיכה אינה כוללת:</strong> מתן ייעוץ פדגוגי פרטני, הדרכה דידקטית אישית, או הזנת נתונים ובניית תוכניות עבור המשתמשת.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              5. מדיניות ביטול עסקה והחזרים כספיים
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>5.1. ביטול כדין (עסקת מכר מרחוק):</strong> בהתאם לחוק הגנת הצרכן, התשמ"א-1981, המשתמשת רשאית לבטל את עסקת הרכישה בתוך 14 ימים ממועד עשיית העסקה או מקבלת מסמך פרטי העסקה (לפי המאוחר), בהודעת ביטול בכתב.</li>
              <li><strong>5.2.</strong> במקרה של ביטול כדין בתוך 14 ימים, יינתן החזר כספי מלא בניכוי דמי ביטול בשיעור שלא יעלה על 5% ממחיר העסקה או 100 ₪ (הנמוך מביניהם), בהתאם להוראות הדין.</li>
              <li><strong>5.3. לאחר 14 יום:</strong> לאחר חלוף 14 יום ממועד הרכישה, לא יינתן החזר כספי בגין אי-שימוש במערכת, הפסקת שימוש יזומה, או שינוי שיקול דעת.</li>
              <li><strong>5.4.</strong> במקרה של תקלה מהותית ומתמשכת שלא נפתרה תוך זמן סביר, תטופל הפנייה בהתאם להוראות כל דין.</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              6. פרטיות, הגנת מידע ושמירה על סודיות תלמידים
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>6.1.</strong> המשתמשת מצהירה כי ידוע לה שמידע הנוגע לתלמידים, ובפרט בחינוך המיוחד, הינו מידע רגיש ומוגן על פי דין.</li>
              <li><strong>6.2. איסור הזנת פרטים מזהים מלאים (PII):</strong> המשתמשת מתחייבת לפעול לפי הנחיות אבטחת המידע של TALA, ולא להזין מספרי תעודת זהות, שמות משפחה מלאים, כתובות מגורים, תמונות פנים או כל פרט מזהה חד-ערכי של תלמידים. העבודה במערכת תיעשה בראשי תיבות, כינויים או מספרי קוד פנימיים בלבד.</li>
              <li><strong>6.3.</strong> המשתמשת נושאת באחריות המלאה לקבלת כל ההסכמות וההרשאות הנדרשות מגורמי החינוך והאפוטרופוסים בהתאם לחוזרי מנכ"ל משרד החינוך.</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              7. בינה מלאכותית (AI) והיעדר אחריות מקצועית
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>7.1.</strong> TALA משלבת טכנולוגיות מתקדמות של בינה מלאכותית לצורך הצעת תכנים, ניסוח מטרות ויצירת טיוטות ראשוניות לתוכניות ודוחות.</li>
              <li><strong>7.2. כלי עזר בלבד:</strong> התוצרים המופקים על ידי המערכת הינם בגדר המלצה וטיוטת עזר פדגוגית בלבד, ואינם מהווים אבחון מקצועי, חוות דעת פסיכולוגית או תחליף לשיקול דעתה הפדגוגי והבלעדי של אשת החינוך.</li>
              <li><strong>7.3. חובת בדיקה והתאמה:</strong> חלה על המשתמשת חובה מוחלטת לבדוק, להגיה, לאמת ולהתאים באופן אישי כל תוצר או מטרה לפני יישומם בעבודה עם התלמיד או מסירתם להורים ולגורמי החינוך.</li>
              <li><strong>7.4.</strong> הנהלת המערכת אינה נושאת באחריות ישירה או עקיפה לכל החלטה פדגוגית, שגיאת ניסוח, אי-דיוק או תוצאה הנובעת משימוש בתוצרי המערכת.</li>
            </ul>
          </div>

          {/* Section 8 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              8. זמינות המערכת, גיבויים והגבלת אחריות
            </h3>
            <ul style={{ margin: '4px 0', paddingRight: '20px' }}>
              <li><strong>8.1.</strong> השירות והמערכת מסופקים כפי שהם ("AS IS") וללא התחייבות לזמינות רציפה של 100%. ייתכנו הפסקות יזומות לתחזוקה או תקלות רשת בלתי צפויות.</li>
              <li><strong>8.2. חובת גיבוי:</strong> מומלץ למשתמשת לשמור עותקים מקומיים (הורדת דוחות כקובצי PDF) של תוכניות ודוחות שהופקו. הנהלת המערכת אינה אחראית לאובדן נתונים עקב גורמי כוח עליון.</li>
              <li><strong>8.3. הגבלת חבות:</strong> במידה המרבית המותרת על פי דין, סך האחריות הכספית הכוללת של TALA ומפעיליה כלפי המשתמשת לא יעלה בשום מקרה על הסכום ששולם בפועל עבור המנוי השנתי.</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              9. קניין רוחני
            </h3>
            <p style={{ margin: '4px 0' }}>
              כל זכויות הקניין הרוחני במערכת TALA, לרבות קוד המקור, הממשק הגרפי, סימני המסחר, העיצובים והאלגוריתמים, שייכים במלואם להנהלת המערכת. אין להעתיק, להפיץ או לעשות שימוש מסחרי במערכת ללא היתר מפורש מראש ובכתב.
            </p>
          </div>

          {/* Section 10 */}
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 6px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              10. יצירת קשר ופניות
            </h3>
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px'
              }}
            >
              <div><strong>כתובת דוא"ל:</strong> zivit.reshef@gmail.com</div>
              <div style={{ marginTop: '4px' }}><strong>וואטסאפ / טלפון:</strong> 052-4286501</div>
              <div style={{ marginTop: '4px' }}><strong>שעות פעילות התמיכה:</strong> ימים א'-ה', בין השעות 09:00 - 17:00</div>
            </div>
          </div>
        </div>

        {/* Scroll Reminder (if not scrolled yet) */}
        {!hasScrolledToBottom && (
          <div
            style={{
              padding: '6px 16px',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderTop: '1px solid #fde68a'
            }}
          >
            <Clock size={13} />
            <span>יש לגלול את המסמך עד סופו לצורך קריאת התנאים במלואם</span>
          </div>
        )}

        {/* Footer & Confirmation */}
        <div
          style={{
            padding: '16px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#b91c1c',
                background: '#fee2e2',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#0f172a'
            }}
          >
            <input
              type="checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              data-testid="paid-license-checkbox"
              style={{
                width: '18px',
                height: '18px',
                marginTop: '2px',
                accentColor: '#2563eb',
                cursor: 'pointer'
              }}
            />
            <span>
              קראתי, הבנתי ואני מאשרת את תנאי רכישת המנוי, רישיון השימוש, שמירת פרטיות התלמידים והתמיכה ב-TALA (גרסה 1.0).
            </span>
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '4px'
            }}
          >
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '6px'
                }}
              >
                <LogOut size={14} />
                <span>התנתקות מהמערכת</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreementChecked || isSubmitting}
              data-testid="paid-license-confirm-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: !agreementChecked || isSubmitting ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: !agreementChecked || isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: !agreementChecked ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'שומר אישור...' : 'אישור וכניסה למערכת'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
