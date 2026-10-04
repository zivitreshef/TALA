import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Check, RotateCcw, LogOut, Loader2, FileCheck2 } from 'lucide-react';

function extractSignatureAssetsFromCanvas(canvas, fallbackText = '') {
  try {
    const targetW = 280;
    const targetH = 84;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return { signatureDataUrl: '', signatureTableHtml: '' };

    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, targetW, targetH);

    let drewFromSourceCanvas = false;

    if (canvas) {
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, w, h).data;
        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const alpha = imgData[(y * w + x) * 4 + 3];
            if (alpha > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX >= minX && maxY >= minY) {
          const pad = 8;
          const sx = Math.max(0, minX - pad);
          const sy = Math.max(0, minY - pad);
          const sw = Math.min(w - sx, maxX - minX + pad * 2);
          const sh = Math.min(h - sy, maxY - minY + pad * 2);

          const availW = targetW - 16;
          const availH = targetH - 12;
          const scale = Math.min(availW / Math.max(sw, 1), availH / Math.max(sh, 1), 2.2);
          const dw = sw * scale;
          const dh = sh * scale;
          const dx = (targetW - dw) / 2;
          const dy = (targetH - dh) / 2;

          exportCtx.drawImage(canvas, sx, sy, sw, sh, dx, dy, dw, dh);
          drewFromSourceCanvas = true;
        }
      }
    }

    // If the user signed via typed text (or canvas had no ink pixels), render their signature onto exportCanvas
    if (!drewFromSourceCanvas && fallbackText) {
      exportCtx.fillStyle = '#1e3a5f';
      exportCtx.font = 'italic bold 30px "Segoe Script", "Rubik", cursive, Arial, sans-serif';
      exportCtx.textAlign = 'center';
      exportCtx.textBaseline = 'middle';
      exportCtx.fillText(fallbackText, targetW / 2, targetH / 2 - 4, targetW - 24);

      exportCtx.strokeStyle = '#1e3a5f';
      exportCtx.lineWidth = 2.5;
      exportCtx.lineCap = 'round';
      exportCtx.beginPath();
      exportCtx.moveTo(40, targetH - 18);
      exportCtx.quadraticCurveTo(targetW / 2, targetH - 10, targetW - 40, targetH - 20);
      exportCtx.stroke();
      drewFromSourceCanvas = true;
    }

    if (!drewFromSourceCanvas) {
      return { signatureDataUrl: '', signatureTableHtml: '' };
    }

    const signatureDataUrl = exportCanvas.toDataURL('image/png');

    // Build a Gmail & Microsoft Word (.doc) compatible HTML <table> bitmap
    // IMPORTANT: Microsoft Word allows at most 63 columns per table, so we use 56 cols x 21 rows (224px x 63px).
    const cols = 56;
    const rows = 21;
    const cellW = targetW / cols;
    const cellH = targetH / rows;
    const exportData = exportCtx.getImageData(0, 0, targetW, targetH).data;

    const trList = [];
    let anyInkFound = false;
    for (let r = 0; r < rows; r++) {
      const yStart = Math.max(0, Math.floor(r * cellH));
      const yEnd = Math.min(targetH, Math.ceil((r + 1) * cellH));
      const rowCells = [];

      for (let c = 0; c < cols; c++) {
        const xStart = Math.max(0, Math.floor(c * cellW));
        const xEnd = Math.min(targetW, Math.ceil((c + 1) * cellW));
        let hasInk = false;
        for (let y = yStart; y < yEnd && !hasInk; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const idx = (y * targetW + x) * 4;
            // Check if pixel is non-white ink (dark blue #1e3a5f)
            const rVal = exportData[idx];
            const gVal = exportData[idx + 1];
            const bVal = exportData[idx + 2];
            const aVal = exportData[idx + 3];
            if (aVal > 25 && (rVal < 215 || gVal < 215 || bVal < 225)) {
              hasInk = true;
              anyInkFound = true;
              break;
            }
          }
        }
        rowCells.push(hasInk);
      }

      // Run-length encode each row
      let tdHtml = '';
      let runType = rowCells[0];
      let runLen = 1;
      for (let c = 1; c <= cols; c++) {
        if (c < cols && rowCells[c] === runType) {
          runLen++;
        } else {
          const hex = runType ? '#1e3a5f' : '#ffffff';
          const pxWidth = runLen * 4;
          tdHtml += `<td colspan="${runLen}" width="${pxWidth}" height="3" bgcolor="${hex}" style="width:${pxWidth}px;height:3px;line-height:3px;mso-line-height-rule:exactly;font-size:2px;padding:0;margin:0;border:none;border-top:3px solid ${hex};background-color:${hex};color:${hex};">&nbsp;</td>`;
          if (c < cols) {
            runType = rowCells[c];
            runLen = 1;
          }
        }
      }
      trList.push(
        `<tr height="3" style="height:3px;line-height:3px;mso-line-height-rule:exactly;font-size:2px;">${tdHtml}</tr>`
      );
    }

    if (!anyInkFound) {
      return { signatureDataUrl, signatureTableHtml: '' };
    }

    const signatureTableHtml = `<table dir="ltr" width="224" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:#ffffff;border:1.5px solid #64748b;border-bottom:2.5px solid #1e3a5f;border-radius:6px;width:224px;table-layout:fixed;"><tbody>${trList.join('')}</tbody></table>`;

    return { signatureDataUrl, signatureTableHtml };
  } catch (err) {
    console.warn('Could not extract canvas signature assets:', err);
    return { signatureDataUrl: '', signatureTableHtml: '' };
  }
}

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
    ctx.lineWidth = 3.5;
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
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pos = getPointerPos(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
    ctx.stroke();
    setHasDrawnSignature(true);
    setErrorMsg('');
  };

  const handleMoveDraw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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

    const extracted = extractSignatureAssetsFromCanvas(
      hasDrawnSignature ? canvasRef.current : null,
      cleanSigText || cleanName
    );
    const signatureDataUrl = extracted.signatureDataUrl;
    const signatureTableHtml = extracted.signatureTableHtml;

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
        signatureTableHtml,
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
                background: 'var(--bg-warm-subtle)',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px 16px',
                maxHeight: '210px',
                overflowY: 'auto',
                fontSize: '13px',
                lineHeight: 1.65,
                color: 'var(--text-main)'
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
                background: 'var(--bg-card)',
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
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                background: 'var(--bg-warm-subtle)',
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
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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
