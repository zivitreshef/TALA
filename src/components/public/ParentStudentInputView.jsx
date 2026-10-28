import React, { useEffect, useState } from 'react';
import {
  MAX_ANSWER_LENGTH,
  getInviteQuestions,
  hasAnyAnswer
} from '../../domain/parentInvite';
import { fetchInviteForRespondent, submitInviteResponses } from '../../services/inviteService';
import './publicInput.css';

const TERMINAL_MESSAGES = {
  missing: {
    title: 'הקישור אינו תקין',
    body: 'ייתכן שהקישור הועתק באופן חלקי. אפשר לבקש מהצוות החינוכי קישור חדש.'
  },
  expired: {
    title: 'תוקף הקישור פג',
    body: 'מטעמי פרטיות הקישור תקף למשך 7 ימים. אפשר לבקש מהצוות החינוכי קישור חדש.'
  },
  submitted: {
    title: 'התשובות כבר נשלחו',
    body: 'תודה! הצוות החינוכי קיבל את התשובות. לא נדרשת פעולה נוספת.'
  },
  done: {
    title: 'תודה רבה!',
    body: 'התשובות נשלחו לצוות החינוכי. הן ישמשו אותנו בבניית התוכנית.'
  }
};

function PageShell({ children }) {
  return (
    <div className="pi-page" dir="rtl" lang="he">
      <main className="pi-card">
        <img
          className="pi-logo"
          src={`${import.meta.env.BASE_URL}tala-logo.png`}
          alt="TALA"
          width="56"
          height="56"
        />
        {children}
      </main>
    </div>
  );
}

function Message({ title, body, onRetry }) {
  return (
    <PageShell>
      <h1 className="pi-title">{title}</h1>
      <p className="pi-text">{body}</p>
      {onRetry && (
        <button type="button" className="pi-button" onClick={onRetry}>
          נסו שוב
        </button>
      )}
    </PageShell>
  );
}

export default function ParentStudentInputView({ token }) {
  const [phase, setPhase] = useState('loading'); // loading | form | sending | error | missing | expired | submitted | done
  const [invite, setInvite] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    document.title = 'TALA - שאלון קצר';
    let cancelled = false;
    setPhase('loading');
    fetchInviteForRespondent(token)
      .then(({ state, invite: loaded }) => {
        if (cancelled) return;
        setInvite(loaded);
        setPhase(state === 'pending' ? 'form' : state);
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, loadAttempt]);

  if (phase === 'loading') {
    return (
      <PageShell>
        <p className="pi-text" role="status">
          טוען…
        </p>
      </PageShell>
    );
  }

  if (phase === 'error') {
    return (
      <Message
        title="לא הצלחנו לטעון את השאלון"
        body="בדקו את החיבור לאינטרנט ונסו שוב."
        onRetry={() => setLoadAttempt((n) => n + 1)}
      />
    );
  }

  if (TERMINAL_MESSAGES[phase]) {
    return <Message {...TERMINAL_MESSAGES[phase]} />;
  }

  const questions = getInviteQuestions({
    childName: invite?.childFirstName,
    gender: invite?.gender,
    customQuestions: invite?.customQuestions
  });
  const sending = phase === 'sending';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending || !hasAnyAnswer(answers)) return;
    setSubmitError('');
    setPhase('sending');
    try {
      await submitInviteResponses(token, answers);
      setPhase('done');
    } catch (_) {
      // לרוב: הקישור כבר נוצל / פג תוקף בזמן המילוי, או תקלת רשת
      setSubmitError('השליחה נכשלה. בדקו את החיבור ונסו שוב. אם הבעיה נמשכת, ייתכן שהקישור כבר נוצל.');
      setPhase('form');
    }
  };

  return (
    <PageShell>
      <h1 className="pi-title">
        {invite?.childFirstName
          ? `נשמח לשמוע אתכם על ${invite.childFirstName}`
          : 'נשמח לשמוע אתכם'}
      </h1>
      <p className="pi-text">
        {questions.length === 3 ? 'שלוש שאלות קצרות, כמה דקות בלבד.' : 'שאלות קצרות, מספר דקות בלבד.'} אפשר לענות רק על חלק מהן.
      </p>

      <form onSubmit={handleSubmit}>
        {questions.map((q, idx) => (
          <div className="pi-field" key={q.key}>
            <label htmlFor={`pi-${q.key}`}>
              {idx + 1}. {q.label}
            </label>
            <textarea
              id={`pi-${q.key}`}
              rows={4}
              maxLength={MAX_ANSWER_LENGTH}
              disabled={sending}
              value={answers[q.key] || ''}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
            />
          </div>
        ))}

        {submitError && (
          <p className="pi-error" role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className="pi-button" disabled={sending || !hasAnyAnswer(answers)}>
          {sending ? 'שולח…' : 'שליחה'}
        </button>
        <p className="pi-privacy">
          התשובות יועברו לצוות החינוכי בלבד. הקישור חד-פעמי ופג תוקף לאחר השליחה.
        </p>
      </form>
    </PageShell>
  );
}
