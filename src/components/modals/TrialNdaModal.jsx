import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Check, RotateCcw, LogOut, Loader2, FileCheck2 } from 'lucide-react';

export default function TrialNdaModal({
  isOpen,
  currentUser,
  onCompleteNda,
  onSignNdaComplete,
  onLogout
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [signerName, setSignerName] = useState(currentUser?.name || '');
  const [signerIdNumber, setSignerIdNumber] = useState('');
  const [signerDate, setSignerDate] = useState(todayIso);
  const [signatureText, setSignatureText] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (currentUser?.name && !signerName) {
      setSignerName(currentUser.name);
    }
  }, [currentUser?.name]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const trialDays = Number(currentUser.trialDays) || 7;

  const getPointerPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStartDraw = (e) => {
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPointerPos(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setHasDrawnSignature(true);
    setErrorMsg('');
  };

  const handleMoveDraw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleEndDraw = () => {
    isDrawingRef.current = false;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = signerName.trim();
    const cleanId = signerIdNumber.replace(/\D/g, '').trim();
    const cleanSigText = signatureText.trim();

    if (!cleanName) {
      setErrorMsg('נא להזין שם מלא.');
      return;
    }

    if (!cleanId || cleanId.length < 5 || cleanId.length > 9) {
      setErrorMsg('נא להזין מספר תעודת זהות תקין (5–9 ספרות).');
      return;
    }

    if (!signerDate) {
      setErrorMsg('נא לבחור תאריך חתימה.');
      return;
    }

    if (!hasDrawnSignature && !cleanSigText) {
      setErrorMsg('נא לחתום בתיבת החתימה (באמצעות העכבר/האצבע) או להקליד את שמך המלא בשדה החתימה.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg('חובה לסמן כי קראת והסכמת לתנאי הסכם הסודיות.');
      return;
    }

    let signatureDataUrl = '';
    if (hasDrawnSignature && canvasRef.current) {
      try {
        signatureDataUrl = canvasRef.current.toDataURL('image/png');
      } catch (_) {}
    }

    const formattedDateHe = new Date(signerDate).toLocaleDateString('he-IL');
    const signedAtTimestamp = new Date().toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    const submitCallback = onCompleteNda || onSignNdaComplete;
    if (typeof submitCallback !== 'function') {
      setErrorMsg('שגיאה פנימית בשמירת ההסכם. נא לרענן את העמוד ולנסות שנית.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCallback({
        signerName: cleanName,
        signerEmail: currentUser.email,
        signerIdNumber: cleanId,
        signerDate: formattedDateHe,
        signedDate: formattedDateHe,
        signatureText: cleanSigText || cleanName,
        signatureDataUrl,
        trialDays,
        signedAtTimestamp
      });
    } catch (err) {
      console.error('Error submitting NDA:', err);
      setErrorMsg('אירעה שגיאה בשמירת ההסכם. נא לנסות שנית.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" dir="rtl" style={{ zIndex: 2500 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '95%',
          borderTop: '5px solid #2b4c7e',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <ShieldCheck size={22} className="text-primary" />
            <h3>הסכם שמירת סודיות וקניין רוחני (NDA) – משתמש ניסיון</h3>
          </div>
          {onLogout && (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onLogout}
              title="התנתק מהמערכת"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
            >
              <LogOut size={14} />
              <span>התנתק</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            className="modal-body"
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '16px 20px'
            }}
          >
            {/* Trial Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #eef3fb 0%, #f3eefc 100%)',
                border: '1.5px solid #8b6fc0',
                borderRadius: '10px',
                padding: '11px 14px',
                fontSize: '13px',
                color: '#1e3a5f',
                lineHeight: 1.55
              }}
            >
              <strong>🧪 חשבון התנסות מוגבל בזמן ({trialDays} ימים):</strong>
              <br />
              היות ומערכת <strong>TALA</strong> טרם הופצה באופן פומבי או מסחרי, הכניסה לחשבון הניסיון מותנית בחתימה חד-פעמית על כתב התחייבות לשמירת סודיות וקניין רוחני. עותק חתום יישלח אוטומטית למנהלת המערכת.
            </div>

            {/* Legal NDA Scroll Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px 16px',
                maxHeight: '210px',
                overflowY: 'auto',
                fontSize: '13px',
                lineHeight: 1.65,
                color: '#1e293b'
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', color: '#1e3a5f', fontSize: '14.5px' }}>
                כתב התחייבות לשמירת סודיות, קניין רוחני ואי-הפצה – מערכת TALA
              </h4>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>הואיל</strong> ומערכת <strong>TALA – תוכנית עבודה אקולוגית (תל"א / תח"י)</strong> הינה פלטפורמה טכנולוגית-פדגוגית ייחודית המצויה בשלבי פיתוח והרצה מבוקרים וטרם הופצה באופן פומבי או מסחרי;
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>והואיל</strong> וכל זכויות היוצרים, הקניין הרוחני, הסודות המסחריים, המתודולוגיה הפדגוגית, מבנה מאגר המטרות והיעדים, מנגנוני ה-AI, דו"חות המצב וההערכה, העיצוב וקוד המקור במערכת שייכים באופן בלעדי ליוצרת ובעלת המערכת, <strong>גב' זיוית רשף</strong>;
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>והואיל</strong> ולמשתמש/ת ניתנת בזאת הרשאת גישה זמנית ואישית להתנסות במערכת ("משתמש ניסיון") לתקופה קצובה של <strong>{trialDays} ימים</strong> בלבד;
              </p>
              <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: '#1e3a5f' }}>
                לפיכך מצהיר/ה ומתחייב/ת החותם/ת כדלקמן:
              </p>
              <ol style={{ margin: 0, paddingRight: '18px' }}>
                <li style={{ marginBottom: '6px' }}>
                  <strong>שמירת סודיות מוחלטת:</strong> לשמור בסודיות מוחלטת ולא לגלות, להציג, להעביר או לחשוף בפני כל צד שלישי כל מידע הקשור למערכת TALA, לרבות ממשק המשתמש, מבנה הטפסים, מאגר המטרות והיעדים, מנגנוני הבינה המלאכותית, דו"חות המצב וההערכה, או כל חלק מהם.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>איסור העתקה, צילום או הפצה:</strong> לא להעתיק, לצלם מסכים, לשכפל, להנדס לאחור (Reverse Engineer), לפתח מוצר מתחרה או לעשות כל שימוש מסחרי או ארגוני ברעיונות, במבנה הפדגוגי או בתוצרי המערכת ללא אישור מראש ובכתב מבעלת המערכת.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>שימוש אישי בלבד:</strong> הרשאת הכניסה הינה אישית בלבד ואינה ניתנת להעברה. החותם/ת מתחייב/ת שלא להעביר את קוד הגישה לאף אדם אחר ולשמור על חיסיון מלא של כל מידע שיוזן למערכת.
                </li>
                <li>
                  <strong>תוקף ההתחייבות:</strong> ידוע לחותם/ת כי הגישה למערכת מוגבלת לתקופת הניסיון שהוגדרה ({trialDays} ימים), וכי התחייבות הסודיות אינה מוגבלת בזמן ותעמוד בתוקפה גם לאחר סיום תקופת הניסיון.
                </li>
              </ol>
            </div>

            {errorMsg && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Signer Details Grid: Full Name, ID Number, Date */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px', color: '#1e3a5f' }}>
                  שם מלא של החותם/ת: *
                </label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px', color: '#1e3a5f' }}>
                  מספר תעודת זהות (ת.ז.): *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={9}
                  value={signerIdNumber}
                  onChange={(e) => setSignerIdNumber(e.target.value.replace(/[^\d-]/g, ''))}
                  dir="ltr"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    textAlign: 'right'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px', color: '#1e3a5f' }}>
                  תאריך חתימה: *
                </label>
                <input
                  type="date"
                  required
                  value={signerDate}
                  onChange={(e) => setSignerDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Signature Area: Drawn Canvas + Typed Signature */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #94a3b8',
                borderRadius: '10px',
                padding: '12px 14px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}
              >
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f' }}>
                  ✍️ חתימת המשתמש/ת (חתמו באמצעות העכבר / מסך מגע או הקלידו למטה): *
                </label>
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="btn-secondary-sm"
                  style={{ padding: '3px 8px', fontSize: '11.5px' }}
                >
                  <RotateCcw size={12} />
                  <span>נקה חתימה</span>
                </button>
              </div>

              <canvas
                ref={canvasRef}
                width={560}
                height={110}
                onMouseDown={handleStartDraw}
                onMouseMove={handleMoveDraw}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleMoveDraw}
                onTouchEnd={handleEndDraw}
                style={{
                  width: '100%',
                  height: '105px',
                  background: '#fcfdff',
                  border: '1px dashed #64748b',
                  borderRadius: '8px',
                  cursor: 'crosshair',
                  touchAction: 'none'
                }}
              />

              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                  חתימה בהקלדת שם מלא (אופציונלי אם חתמתם בתיבה למעלה):
                </span>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => {
                    setSignatureText(e.target.value);
                    setErrorMsg('');
                  }}
                  style={{
                    flex: '1 1 200px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e3a5f',
                background: '#f1f5f9',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1'
              }}
            >
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  setErrorMsg('');
                }}
                style={{ width: '17px', height: '17px', accentColor: '#2b4c7e', cursor: 'pointer' }}
              />
              <span>
                קראתי את כתב ההתחייבות לשמירת סודיות וקניין רוחני (NDA), הבנתי את תוכנו ואני מתחייב/ת לקיימו במלואו.
              </span>
            </label>
          </div>

          <div
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              עותק חתום יישלח אוטומטית אל מנהלת המערכת (zivit.reshef@gmail.com)
            </span>
            <button type="submit" className="btn-primary-sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="tala-spin-icon" /> : <FileCheck2 size={16} />}
              <span>
                {isSubmitting
                  ? 'שולח הסכם חתום ופותח גישה...'
                  : 'אשר, חתום ושלח הסכם סודיות למנהלת המערכת'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
