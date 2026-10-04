import React from 'react';
import { AlertTriangle, X, Archive, Trash2, LogOut, Save } from 'lucide-react';

export function DeleteStudentModal({
  studentToDelete,
  onClose,
  onConfirmArchiveInstead,
  onConfirmDelete
}) {
  if (!studentToDelete) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl">
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', borderTopColor: '#d9534f' }}
      >
        <div className="modal-header">
          <div className="modal-header-title" style={{ color: '#b83f3f' }}>
            <AlertTriangle size={22} style={{ color: '#d9534f' }} />
            <h3>אישור מחיקת תלמיד/ה</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          <p
            style={{
              margin: '0 0 12px 0',
              fontSize: '14.5px',
              lineHeight: 1.5,
              color: 'var(--text-main)'
            }}
          >
            האם את/ה בטוח/ה שברצונך למחוק את תכנית העבודה של{' '}
            <strong>"{studentToDelete.name || 'ללא שם'}"</strong>?
          </p>
          <div
            style={{
              background: '#fdf2f2',
              border: '1px solid #f3b4b4',
              color: '#a82b2b',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: !studentToDelete.archived ? '10px' : 0
            }}
          >
            ⚠️ שים/י לב: פעולה זו תמחק את התלמיד/ה ותכנית העבודה לצמיתות ולא ניתן לשחזר אותה.
          </div>

          {!studentToDelete.archived && (
            <div
              style={{
                background: '#f3eefc',
                border: '1px solid #d4c4f0',
                color: '#4c1d95',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600
              }}
            >
              💡 במידה והתלמיד/ה סיים/ה את התוכנית, ניתן להעביר אותו/ה ל<strong>ארכיון</strong> לשמירת ההיסטוריה והדוחות במקום למחוק.
            </div>
          )}
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            ביטול
          </button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!studentToDelete.archived && (
              <button
                type="button"
                onClick={() => onConfirmArchiveInstead(studentToDelete)}
                style={{
                  background: 'linear-gradient(135deg, #5b9bd5 0%, #8b6fc0 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Archive size={15} />
                <span>העבר לארכיון במקום מחיקה</span>
              </button>
            )}

            <button
              type="button"
              onClick={onConfirmDelete}
              style={{
                background: '#d9534f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={15} />
              <span>כן, מחק לצמיתות</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArchiveStudentModal({
  studentToArchive,
  onClose,
  onConfirmArchive
}) {
  if (!studentToArchive) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl">
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', borderTopColor: '#8b6fc0' }}
      >
        <div className="modal-header">
          <div className="modal-header-title" style={{ color: '#4c1d95' }}>
            <Archive size={22} style={{ color: '#8b6fc0' }} />
            <h3>העברת תלמיד/ה לארכיון</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          <p
            style={{
              margin: '0 0 12px 0',
              fontSize: '14.5px',
              lineHeight: 1.5,
              color: 'var(--text-main)'
            }}
          >
            האם להעביר את <strong>"{studentToArchive.name || 'ללא שם'}"</strong> לארכיון?
          </p>
          <div
            style={{
              background: '#f3eefc',
              border: '1px solid #d4c4f0',
              color: '#4c1d95',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600
            }}
          >
            📁 התלמיד/ה יוסר/תוסר מרשימת התלמידים הפעילה, וכל הדוחות ותכנית העבודה יישמרו במלואם תחת כפתור <strong>"ארכיון"</strong> בסרגל העליון.
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => onConfirmArchive(studentToArchive)}
            style={{
              background: 'linear-gradient(135deg, #5b9bd5 0%, #8b6fc0 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Archive size={15} />
            <span>כן, העבר לארכיון</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function LogoutUnsavedModal({
  isOpen,
  draftStudentName,
  onClose,
  onDiscardAndLogout,
  onSaveAndLogout
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} dir="rtl">
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', borderTopColor: '#f59e0b' }}
      >
        <div className="modal-header">
          <div className="modal-header-title" style={{ color: '#92400e' }}>
            <AlertTriangle size={22} style={{ color: '#f59e0b' }} />
            <h3>שינויים שלא נשמרו לפני התנתקות</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          <p
            style={{
              margin: '0 0 12px 0',
              fontSize: '14.5px',
              lineHeight: 1.5,
              color: 'var(--text-main)'
            }}
          >
            קיימים שינויים שלא נשמרו בתכנית העבודה של{' '}
            <strong>"{draftStudentName || 'התלמיד/ה'}"</strong>. האם ברצונך לשמור את הנתונים לפני ההתנתקות מהמערכת?
          </p>
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600
            }}
          >
            💡 אם תבחר/י להתעלם מהשינויים, כל השינויים שבוצעו מאז השמירה האחרונה יאבדו.
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={onClose}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            ביטול
          </button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onDiscardAndLogout}
              style={{
                background: '#fdf2f2',
                color: '#b83f3f',
                border: '1px solid #f3b4b4',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={15} />
              <span>התעלם והתנתק</span>
            </button>

            <button
              type="button"
              onClick={onSaveAndLogout}
              style={{
                background: 'linear-gradient(135deg, #5b9bd5 0%, #8b6fc0 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={15} />
              <span>שמור שינויים והתנתק</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
