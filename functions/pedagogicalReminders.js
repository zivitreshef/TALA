// @ts-check
/**
 * Server-side Automated Pedagogical Digest & Reminder Service for TALA
 * 
 * Invoked by Cloud Scheduler (onSchedule) on an hourly sweeper pattern.
 * Runs 100% within Google Cloud free tier (1 scheduler job total, 0 costs).
 * 
 * Operates autonomously even when teachers are not logged into the site.
 */

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygVhGQbi4peK7Bzr4A5z1SuFD1uDbgtfSiNblQNtfVrvn5sAZaiVwDC2kaTBJ9m3L5/exec';
const DEFAULT_SITE_URL = 'https://zivitreshef.github.io/TALA/';

const DAYS_MAP = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

/**
 * Gets the current Israel time components from a Date object
 * @param {Date} date
 * @returns {{ dayOfWeek: number, dayOfMonth: number, hour: number, minute: number, dateString: string }}
 */
function getIsraelTimeComponents(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = weekdayMap[map.weekday] ?? 0;
  const dayOfMonth = parseInt(map.day, 10) || 1;
  const hour = parseInt(map.hour, 10) || 0;
  const minute = parseInt(map.minute, 10) || 0;
  const dateString = `${map.year}-${String(map.month).padStart(2, '0')}-${String(map.day).padStart(2, '0')}`;

  return { dayOfWeek, dayOfMonth, hour, minute, dateString };
}

/**
 * Converts a student's full name to Hebrew initials / acronym for student privacy
 * @param {string} [name]
 * @returns {string}
 */
function toHebrewAcronymServer(name) {
  if (!name || typeof name !== 'string' || !name.trim()) return 'א.א.';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].charAt(0) + "'";
  }
  return words.slice(0, 2).map((w) => w.charAt(0)).join('.') + '.';
}

/**
 * Checks if a teacher is due for a pedagogical reminder at the given reference date
 * @param {Record<string, any>} prefs Teacher preferences from tala_user_preferences
 * @param {Date} [now]
 * @returns {boolean}
 */
function isDueForPedagogicalReminderServer(prefs, now = new Date()) {
  if (!prefs || typeof prefs !== 'object') return false;

  const isEnabled = Boolean(prefs.pedagogicalReminderEnabled || prefs.monthlyPedagogicalReminder);
  if (!isEnabled) return false;

  const isrTime = getIsraelTimeComponents(now);

  // Parse target hour (default to 09:00 if not set)
  const targetTimeString = String(prefs.pedagogicalReminderTime || '09:00');
  const [targetH = 9] = targetTimeString.split(':').map((s) => parseInt(s, 10));

  // Must have reached or passed the scheduled hour
  if (isrTime.hour < targetH) {
    return false;
  }

  // Deduplication: check last sent timestamp
  const lastSentIso = prefs.pedagogicalDigestLastSentAt;
  if (lastSentIso) {
    const lastSentDate = new Date(lastSentIso);
    if (!Number.isNaN(lastSentDate.getTime())) {
      const lastIsr = getIsraelTimeComponents(lastSentDate);
      // If already sent today (Israel calendar date), do not send again
      if (lastIsr.dateString === isrTime.dateString) {
        return false;
      }
      const daysSinceLast = (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24);
      // For weekly: don't re-send if less than 5 days elapsed
      const freq = prefs.pedagogicalReminderFrequency || 'weekly';
      if (freq === 'weekly' && daysSinceLast < 5) {
        return false;
      }
      // For monthly: don't re-send if less than 20 days elapsed
      if (freq === 'monthly' && daysSinceLast < 20) {
        return false;
      }
    }
  }

  const freq = prefs.pedagogicalReminderFrequency || 'weekly';
  if (freq === 'weekly') {
    const prefDay = String(prefs.pedagogicalReminderWeeklyDay || 'thursday').toLowerCase();
    const targetDay = DAYS_MAP[prefDay] ?? 4; // Default to Thursday (4)
    if (isrTime.dayOfWeek !== targetDay) {
      return false;
    }
  } else {
    // monthly
    const targetMonthDay = Number(prefs.pedagogicalReminderMonthlyDay) || 1;
    if (isrTime.dayOfMonth !== targetMonthDay) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates observation gaps for students
 * @param {Array<Record<string, any>>} students
 * @param {number} [thresholdDays=45]
 * @param {Date} [referenceDate]
 * @returns {Array<{ studentId: string, studentName: string, goalTitle: string, daysSinceObservation: number }>}
 */
function calculateObservationGapsServer(students = [], thresholdDays = 45, referenceDate = new Date()) {
  const gaps = [];
  const nowMs = referenceDate.getTime();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  for (const student of students) {
    if (!student || student.isArchived) continue;

    const studentName = student.name || 'תלמיד/ה ללא שם';
    const studentId = student.id || '';
    const goals = Array.isArray(student.goals) ? student.goals : [];

    for (const goal of goals) {
      if (!goal || goal.completed || goal.archived) continue;

      let latestObsMs = 0;
      const obsList = Array.isArray(goal.observations) ? goal.observations : [];
      for (const obs of obsList) {
        const d = obs?.date ? new Date(obs.date).getTime() : 0;
        if (d > latestObsMs) latestObsMs = d;
      }

      // Check student-level last observation as fallback
      if (!latestObsMs && student.lastObservationDate) {
        latestObsMs = new Date(student.lastObservationDate).getTime() || 0;
      }

      if (!latestObsMs) {
        // No observations at all
        gaps.push({
          studentId,
          studentName,
          goalTitle: goal.title || 'יעד ללא כותרת',
          daysSinceObservation: thresholdDays + 1
        });
      } else if (nowMs - latestObsMs >= thresholdMs) {
        const days = Math.round((nowMs - latestObsMs) / (1000 * 60 * 60 * 24));
        gaps.push({
          studentId,
          studentName,
          goalTitle: goal.title || 'יעד ללא כותרת',
          daysSinceObservation: days
        });
      }
    }
  }

  return gaps;
}

/**
 * Calculates summary accomplishments for students over a recent window
 * @param {Array<Record<string, any>>} students
 * @param {number} [windowDays=30]
 * @param {Date} [referenceDate]
 * @returns {{ recentObservationsCount: number, completedGoalsCount: number, activeGoalsCount: number }}
 */
function calculateAccomplishmentsServer(students = [], windowDays = 30, referenceDate = new Date()) {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const nowMs = referenceDate.getTime();
  let recentObservationsCount = 0;
  let completedGoalsCount = 0;
  let activeGoalsCount = 0;

  for (const student of students) {
    if (!student || student.isArchived) continue;
    const goals = Array.isArray(student.goals) ? student.goals : [];
    for (const goal of goals) {
      if (!goal) continue;
      if (goal.completed) {
        completedGoalsCount++;
      } else {
        activeGoalsCount++;
      }
      const obsList = Array.isArray(goal.observations) ? goal.observations : [];
      for (const obs of obsList) {
        const d = obs?.date ? new Date(obs.date).getTime() : 0;
        if (d && nowMs - d <= windowMs) {
          recentObservationsCount++;
        }
      }
    }
  }

  return { recentObservationsCount, completedGoalsCount, activeGoalsCount };
}

/**
 * Builds responsive, pedagogical RTL HTML email
 * @param {object} params
 * @param {string} params.teacherName
 * @param {Array<any>} params.gaps
 * @param {any} params.accomplishments
 * @param {number} params.totalStudents
 * @param {string} [params.privacyMode='full_name']
 * @param {string} [params.siteUrl]
 * @returns {string}
 */
function buildPedagogicalReminderEmailHtmlServer({
  teacherName = 'צוות חינוכי',
  gaps = [],
  accomplishments = { recentObservationsCount: 0, completedGoalsCount: 0, activeGoalsCount: 0 },
  totalStudents = 0,
  privacyMode = 'full_name',
  siteUrl = DEFAULT_SITE_URL
}) {
  const formatName = (name) => (privacyMode === 'acronym' ? toHebrewAcronymServer(name) : (name || 'תלמיד/ה'));

  const gapRowsHtml = gaps.slice(0, 8).map((gap) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">${formatName(gap.studentName)}</td>
      <td style="padding: 10px 12px; color: #475569;">${gap.goalTitle}</td>
      <td style="padding: 10px 12px; color: #dc2626; font-weight: bold; text-align: left;">לפני ${gap.daysSinceObservation} ימים</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>סיכום פדגוגי שבועי – מערכת TALA</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; direction: rtl; text-align: right;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- כותרת ראשית -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 28px 24px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">סיכום פדגוגי ומוכנות לישיבות צוות</h1>
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">מערכת TALA – תוכנית עבודה אקולוגית</p>
      </td>
    </tr>

    <!-- תוכן ראשי -->
    <tr>
      <td style="padding: 24px;">
        <p style="font-size: 15px; color: #334155; margin-top: 0; line-height: 1.6;">
          שלום <strong>${teacherName}</strong>,<br>
          ריכזנו עבורך תמונת מצב עדכנית לקראת השבוע הקרוב והיערכות לדיוני צוות פדגוגיים:
        </p>

        <!-- כרטיסי מדדים -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
          <tr>
            <td width="33%" style="padding: 12px; background: #eff6ff; border-radius: 8px; text-align: center; border: 1px solid #bfdbfe;">
              <div style="font-size: 24px; font-weight: 800; color: #1e3a8a;">${totalStudents}</div>
              <div style="font-size: 12px; color: #1e40af; margin-top: 4px; font-weight: 600;">תלמידים בטיפולך</div>
            </td>
            <td width="4%"></td>
            <td width="33%" style="padding: 12px; background: #f0fdf4; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
              <div style="font-size: 24px; font-weight: 800; color: #166534;">${accomplishments.recentObservationsCount}</div>
              <div style="font-size: 12px; color: #15803d; margin-top: 4px; font-weight: 600;">תצפיות החודש</div>
            </td>
            <td width="4%"></td>
            <td width="33%" style="padding: 12px; background: ${gaps.length > 0 ? '#fef2f2' : '#f8fafc'}; border-radius: 8px; text-align: center; border: 1px solid ${gaps.length > 0 ? '#fecaca' : '#e2e8f0'};">
              <div style="font-size: 24px; font-weight: 800; color: ${gaps.length > 0 ? '#dc2626' : '#64748b'};">${gaps.length}</div>
              <div style="font-size: 12px; color: ${gaps.length > 0 ? '#b91c1c' : '#64748b'}; margin-top: 4px; font-weight: 600;">יעדים לרענון</div>
            </td>
          </tr>
        </table>

        <!-- פירוט פערים במידה וישנם -->
        ${gaps.length > 0 ? `
          <div style="margin-top: 24px;">
            <h3 style="font-size: 15px; color: #1e293b; margin: 0 0 10px 0;">🎯 יעדים ללא תיעוד תצפית מעל 45 ימים:</h3>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 13px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: right;">
                  <th style="padding: 10px 12px; color: #475569;">שם התלמיד/ה</th>
                  <th style="padding: 10px 12px; color: #475569;">יעד פדגוגי</th>
                  <th style="padding: 10px 12px; color: #475569; text-align: left;">תצפית אחרונה</th>
                </tr>
              </thead>
              <tbody>
                ${gapRowsHtml}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="margin-top: 20px; padding: 14px 18px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; color: #166534; font-size: 13.5px;">
            ✨ <strong>מצוין!</strong> כל היעדים הפדגוגיים מגובים בתצפיות שוטפות ומוכנים לדיוני צוות.
          </div>
        `}

        <!-- כפתור כניסה למערכת -->
        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="${siteUrl}" target="_blank" style="display: inline-block; background: #1e3a8a; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(30,58,138,0.25);">
            כניסה למערכת TALA
          </a>
        </div>
      </td>
    </tr>

    <!-- כותרת תחתונה -->
    <tr>
      <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11.5px; color: #64748b; text-align: center; line-height: 1.5;">
        הודעה זו נשלחה אוטומטית ממערכת TALA לפי ההעדפות שהגדרת בפרופיל האישי שלך.<br>
        לשינוי יום ושעת התזכורת או לביטולה, ניתן להיכנס להגדרות המורה במערכת בכל עת.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatches pedagogical reminders to all teachers whose schedule matches the current time
 * @param {object} options
 * @param {boolean} [options.dryRun=false]
 * @param {any} [options.db] Firestore database instance
 * @param {string} [options.appsScriptUrl]
 * @param {Date} [options.referenceDate]
 * @returns {Promise<{ processed: number, sent: number, teachers: string[], errors: Array<{ email: string, error: string }> }>}
 */
async function dispatchPedagogicalRemindersServer({
  dryRun = false,
  db = null,
  appsScriptUrl = DEFAULT_APPS_SCRIPT_URL,
  referenceDate = new Date()
} = {}) {
  const result = {
    processed: 0,
    sent: 0,
    teachers: [],
    errors: []
  };

  if (!db) {
    console.warn('dispatchPedagogicalRemindersServer: Missing Firestore db instance');
    return result;
  }

  // 1. Fetch all teacher preferences
  const prefsSnap = await db.collection('tala_user_preferences').get();
  if (prefsSnap.empty) {
    return result;
  }

  for (const doc of prefsSnap.docs) {
    result.processed++;
    const prefs = doc.data() || {};
    const email = (prefs.userEmail || doc.id.replace(/_/g, '.')).toLowerCase();

    // Check if reminder is due for this teacher
    if (!isDueForPedagogicalReminderServer(prefs, referenceDate)) {
      continue;
    }

    try {
      // 2. Fetch teacher's students
      // Query owned students
      const ownedSnap = await db.collection('tala_students').where('ownerEmail', '==', email).get();
      const studentsMap = new Map();
      ownedSnap.forEach((sDoc) => studentsMap.set(sDoc.id, { id: sDoc.id, ...sDoc.data() }));

      // Query shared students
      try {
        const sharedSnap = await db.collection('tala_students').where('sharedWith', 'array-contains', email).get();
        sharedSnap.forEach((sDoc) => {
          if (!studentsMap.has(sDoc.id)) {
            studentsMap.set(sDoc.id, { id: sDoc.id, ...sDoc.data() });
          }
        });
      } catch (e) {
        // Fallback if sharedWith query fails or index missing
      }

      const teacherStudents = Array.from(studentsMap.values());

      // 3. Compute gaps & accomplishments
      const gaps = calculateObservationGapsServer(teacherStudents, 45, referenceDate);
      const accomplishments = calculateAccomplishmentsServer(teacherStudents, 30, referenceDate);

      // 4. Build email HTML
      const teacherName = prefs.fullName || 'צוות חינוכי';
      const htmlBody = buildPedagogicalReminderEmailHtmlServer({
        teacherName,
        gaps,
        accomplishments,
        totalStudents: teacherStudents.length,
        privacyMode: prefs.defaultPrivacyMode || 'full_name'
      });

      const textBody = `שלום ${teacherName},\nריכזנו עבורך סיכום פדגוגי שבועי ממערכת TALA.\nתלמידים בטיפולך: ${teacherStudents.length}\nתצפיות החודש: ${accomplishments.recentObservationsCount}\nיעדים לרענון: ${gaps.length}\nכניסה למערכת: ${DEFAULT_SITE_URL}`;

      // 5. Send Email if not dry-run
      if (!dryRun) {
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            to: email,
            subject: 'סיכום פדגוגי שבועי ומוכנות לישיבות צוות – TALA',
            htmlBody,
            textBody,
            senderName: 'מערכת TALA – תוכנית עבודה אקולוגית'
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Email dispatch failed with status ${response.status}: ${errText.slice(0, 200)}`);
        }

        // 6. Record last sent timestamp in Firestore
        await doc.ref.set(
          {
            pedagogicalDigestLastSentAt: referenceDate.toISOString(),
            updatedAt: referenceDate.toISOString()
          },
          { merge: true }
        );
      }

      result.sent++;
      result.teachers.push(email);
    } catch (err) {
      console.error(`Failed to send pedagogical reminder to ${email}:`, err);
      result.errors.push({ email, error: err.message });
    }
  }

  return result;
}

module.exports = {
  DAYS_MAP,
  DEFAULT_APPS_SCRIPT_URL,
  DEFAULT_SITE_URL,
  getIsraelTimeComponents,
  toHebrewAcronymServer,
  isDueForPedagogicalReminderServer,
  calculateObservationGapsServer,
  calculateAccomplishmentsServer,
  buildPedagogicalReminderEmailHtmlServer,
  dispatchPedagogicalRemindersServer
};
