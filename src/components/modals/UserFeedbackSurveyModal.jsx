import React, { useState } from 'react';
import { Star, MessageSquareHeart, X, Send, Clock, EyeOff } from 'lucide-react';

const SURVEY_CATEGORIES = [
  {
    key: 'easeOfWebsite',
    title: '1. קלות ונוחות השימוש באתר (Ease of Website)',
    subtitle: 'ניווט במערכת, בהירות הממשק ונוחות העבודה השוטפת'
  },
  {
    key: 'createStudent',
    title: '2. יצירה והקמה של כרטיס תלמיד/ה חדש/ה',
    subtitle: 'הזנת פרטי תלמיד/ה, שיוך למסגרת חינוכית ופתיחת תוכנית'
  },
  {
    key: 'generateGoals',
    title: '3. ניסוח ובניית מטרות ויעדים (מאגר מטרות ו-AI)',
    subtitle: 'שימוש במאגר המטרות הדינמי, שאלות מנחות וניסוח אוטומטי ב-AI'
  },
  {
    key: 'createReport',
    title: '4. הפקת דוחות (תל"א/תח"י, דו"ח מצב ודוח הערכה)',
    subtitle: 'איכות הדוחות המופקים, הדפסה, ייצוא ל-Word/PDF ושליחה במייל'
  },
  {
    key: 'collaborateWithColleagues',
    title: '5. שיתוף תלמיד/ה ועבודה משותפת עם קולגות בצוות',
    subtitle: 'שיתוף כרטיס תלמיד/ה, סנכרון בענן ותחזוקה משותפת עם אנשי צוות'
  }
];

const RATING_LABELS = {
  1: '1 – טעון שיפור',
  2: '2 – בינוני',
  3: '3 – טוב',
  4: '4 – טוב מאוד',
  5: '5 – מצוין!'
};

const RECOMMENDATION_OPTIONS = [
  'בהחלט כן – אמליץ בחום לקולגות ולמנהל/ת לרכוש גישה להמשך שימוש',
  'כן, סביר שאמליץ לקולגות ולמנהל/ת',
  'אולי / עדיין מתלבט/ת',
  'לא כרגע'
];

export default function UserFeedbackSurveyModal({
  isOpen,
  currentUser,
  onSubmitSurvey,
  onSnoozeSurvey,
  onDismissSurveyPermanently
}) {
  const [ratings, setRatings] = useState({
    easeOfWebsite: 5,
    createStudent: 5,
    generateGoals: 5,
    createReport: 5,
    collaborateWithColleagues: 5
  });
  const [recommendToColleaguesAndManager, setRecommendToColleaguesAndManager] = useState(
    RECOMMENDATION_OPTIONS[0]
  );
  const [overallFeedback, setOverallFeedback] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSetRating = (key, val) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submittedAt = new Date().toLocaleString('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      if (typeof onSubmitSurvey === 'function') {
        onSubmitSurvey({
          userName: currentUser.name,
          userEmail: currentUser.email,
          userTitle: currentUser.title,
          userGroup: currentUser.group,
          isTrialUser: Boolean(currentUser.isTrialUser),
          ratings,
          recommendToColleaguesAndManager,
          overallFeedback: overallFeedback.trim(),
          improvementSuggestions: improvementSuggestions.trim(),
          submittedAt
        });
      }
    }, 900);
  };

  return (
    <div
      className="modal-backdrop"
      dir="rtl"
      onClick={onSnoozeSurvey}
      style={{ zIndex: 2450 }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '95%',
          borderTop: '5px solid #6b46c1',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <MessageSquareHeart size={22} style={{ color: '#6b46c1' }} />
            <div>
              <h3 style={{ margin: 0 }}>משוב חוויית משתמש – מערכת TALA (רשות / אופציונלי)</h3>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon-close"
            onClick={onSnoozeSurvey}
            title="סגור ודחה לאחר כך"
          >
            <X size={20} />
          </button>
        </div>

        {submittedSuccess ? (
          <div
            style={{
              padding: '38px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '42px' }}>🎉</div>
            <h4 style={{ margin: 0, fontSize: '19px', color: '#1e3a5f' }}>
              תודה רבה על המשוב שלך, {currentUser.name}!
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
              המשוב נשלח ישירות למנהלת המערכת ויעזור לנו להמשיך לשפר ולייעל את מערכת TALA עבורך ועבור הצוותים החינוכיים.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
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
              {/* Optional & Friendly Intro Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #eef3fb 0%, #f3eefc 100%)',
                  border: '1.5px solid #bfa8e8',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#1e3a5f',
                  lineHeight: 1.55
                }}
              >
                <strong>שלום {currentUser.name}, נשמח לשמוע איך החוויה שלך במערכת TALA! 🌟</strong>
                <br />
                מילוי השאלון הינו <strong>אופציונלי לחלוטין (רשות)</strong> ואורך פחות מדקה. המשוב שלך יישלח ישירות למנהלת המערכת כדי לסייע לנו להמשיך ולדייק את הכלים עבורך.
              </div>

              {/* 5 Star Rating Categories */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {SURVEY_CATEGORIES.map((cat) => {
                  const currentVal = ratings[cat.key] || 0;
                  return (
                    <div
                      key={cat.key}
                      style={{
                        background: 'var(--bg-warm-subtle)',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ flex: '1 1 260px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#1e3a5f' }}>
                          {cat.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cat.subtitle}</div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((starValue) => {
                          const active = starValue <= currentVal;
                          return (
                            <button
                              key={starValue}
                              type="button"
                              onClick={() => handleSetRating(cat.key, starValue)}
                              title={RATING_LABELS[starValue]}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                transform: active ? 'scale(1.06)' : 'scale(1)',
                                transition: 'transform 0.12s ease'
                              }}
                            >
                              <Star
                                size={22}
                                fill={active ? '#f59e0b' : 'none'}
                                color={active ? '#f59e0b' : '#94a3b8'}
                              />
                            </button>
                          );
                        })}
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#4c1d95',
                            minWidth: '88px',
                            textAlign: 'left'
                          }}
                        >
                          {RATING_LABELS[currentVal] || ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommendation to Colleagues & Manager to Buy Access */}
              <div
                style={{
                  background: '#f3eefc',
                  border: '1.5px solid #a78bfa',
                  borderRadius: '10px',
                  padding: '12px 14px'
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: '#1e3a5f',
                    marginBottom: '8px'
                  }}
                >
                  💡 האם תמליץ/י לקולגות ולמנהל/ת המסגרת לרכוש גישה להמשך שימוש במערכת?
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {RECOMMENDATION_OPTIONS.map((optionText) => (
                    <label
                      key={optionText}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--text-main)',
                        background:
                          recommendToColleaguesAndManager === optionText ? '#ffffff' : 'transparent',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border:
                          recommendToColleaguesAndManager === optionText
                            ? '1.5px solid #6b46c1'
                            : '1px solid transparent',
                        fontWeight: recommendToColleaguesAndManager === optionText ? 700 : 500
                      }}
                    >
                      <input
                        type="radio"
                        name="recommendToColleaguesAndManager"
                        value={optionText}
                        checked={recommendToColleaguesAndManager === optionText}
                        onChange={() => setRecommendToColleaguesAndManager(optionText)}
                        style={{ accentColor: '#6b46c1', cursor: 'pointer' }}
                      />
                      <span>{optionText}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Free-Text Overall Feedback */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e3a5f',
                    marginBottom: '5px'
                  }}
                >
                  💬 משוב כללי במילים חופשיות (חוויית השימוש הכוללת במערכת):
                </label>
                <textarea
                  rows={2}
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="ספר/י לנו במילים שלך מה אהבת במערכת וכיצד היא סייעה לך בעבודה..."
                  style={{
                    width: '100%',
                    padding: '8px 11px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Free-Text Suggestions for Improvement */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e3a5f',
                    marginBottom: '5px'
                  }}
                >
                  🚀 הצעות לשיפור וייעול (פיצ'רים חסרים או רעיונות לשיפור):
                </label>
                <textarea
                  rows={2}
                  value={improvementSuggestions}
                  onChange={(e) => setImprovementSuggestions(e.target.value)}
                  placeholder="האם יש יכולת או שיפור שהיית שמח/ה לראות בגרסאות הבאות?"
                  style={{
                    width: '100%',
                    padding: '8px 11px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={onSnoozeSurvey}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                >
                  <Clock size={14} />
                  <span>דחה לאחר כך</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={onDismissSurveyPermanently}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <EyeOff size={14} />
                  <span>אל תציג שוב</span>
                </button>
              </div>

              <button
                type="submit"
                className="btn-primary-sm"
                style={{
                  background: 'linear-gradient(135deg, #2b6cb0 0%, #6b46c1 100%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={15} />
                <span>שלח משוב למנהלת המערכת</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
