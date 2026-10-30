/**
 * CLI Helper: Send Email Notification to All Active TALA Users about the New Help Center
 * and Interactive 10-Step User-Journey Lower Panel, or clean up support chat threads.
 *
 * Usage:
 *   node scripts/notifyAllUsersNewHelpAndJourney.js [--dry-run]
 *   node scripts/notifyAllUsersNewHelpAndJourney.js --cleanup-threads
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'tala-d9aaa';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const ALLOWED_USERS_DOC_URL = `${BASE_FIRESTORE_URL}/tala_config/allowed_users`;
const SETTINGS_DOC_URL = `${BASE_FIRESTORE_URL}/tala_config/settings`;
const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwp3HLCO9kErrN-vS2odXYcco1B5KMlbTw7qeJWrSSKg5nqZocfrsvyUOIO-LurJJtg/exec';
const SITE_URL = 'https://zivitreshef.github.io/TALA/';

function getAccessToken() {
  if (process.env.FIREBASE_ACCESS_TOKEN) {
    return process.env.FIREBASE_ACCESS_TOKEN;
  }
  const configLocations = [
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json')
  ];

  for (const loc of configLocations) {
    if (fs.existsSync(loc)) {
      try {
        const raw = fs.readFileSync(loc, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed?.tokens?.access_token) {
          return parsed.tokens.access_token;
        }
      } catch (_) {}
    }
  }
  return null;
}

function parseFirestoreValue(valObj) {
  if (!valObj || typeof valObj !== 'object') return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    return (valObj.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in valObj) {
    const out = {};
    const fields = valObj.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function sanitizeThreadKey(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_');
}

function buildAnnouncementEmailHtml(userName) {
  const displayName = userName || 'אשת צוות יקרה';
  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="utf-8" />
    </head>
    <body dir="rtl" style="margin:0; padding:24px 12px; background-color:#f0f4fa; font-family: Arial, Helvetica, sans-serif; color:#1e293b; text-align:right;">
      <div dir="rtl" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #cbd5e1; box-shadow:0 12px 32px rgba(30, 58, 95, 0.12);">
        <div style="height:6px; background:linear-gradient(90deg, #2563eb 0%, #16a34a 50%, #7c3aed 100%);"></div>
        <div style="background:linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #4f46e5 100%); color:#ffffff; padding:26px 24px; text-align:right;">
          <div style="display:inline-block; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.35); border-radius:999px; padding:3px 12px; font-size:12px; font-weight:bold; margin-bottom:10px;">
            ✨ עדכון חדש במערכת TALA
          </div>
          <h1 style="margin:0 0 6px 0; font-size:21px; font-weight:800; color:#ffffff;">
            מרכז עזרה משודרג וסיור מודרך אינטראקטיבי (10 שלבים)
          </h1>
          <p style="margin:0; font-size:13.5px; color:#e2e8f0; line-height:1.5;">
            מערכת TALA – תוכנית עבודה אקולוגית ותח"י
          </p>
        </div>

        <div style="padding:24px; text-align:right;">
          <p style="margin:0 0 12px 0; font-size:16px; font-weight:bold; color:#1e3a5f;">
            שלום ${displayName},
          </p>
          <p style="margin:0 0 18px 0; font-size:14px; line-height:1.65; color:#334155;">
            שמחים לעדכן כי שדרגנו את מערכת העזרה וההדרכה ב-TALA כדי להעניק לך חוויית עבודה אינטואיטיבית, ברורה ונוחה מתמיד:
          </p>

          <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:16px 18px; margin-bottom:16px;">
            <div style="font-size:15px; font-weight:800; color:#14532d; margin-bottom:8px;">
              🧭 1. סרגל הדרכה תחתון אינטראקטיבי (10 שלבים מקצה לקצה)
            </div>
            <ul style="margin:0; padding-right:20px; font-size:13.5px; color:#166534; line-height:1.65;">
              <li><strong>חיצי הכוונה מונפשים על המסך:</strong> בכל שלב מופיע הסבר פדגוגי קצר עם כפתור <em>"הראה לי במסך 🎯"</em> וחיצים ירוקים המצביעים בדיוק היכן ללחוץ.</li>
              <li><strong>תלמיד לדוגמה ("יונתן לוי") או תלמיד אמיתי:</strong> ניתן להתנסות בחופשיות בסביבת דמו מבודדת (ללא שמירה לענן) או לעבוד על תלמיד אמיתי מהשטח.</li>
              <li><strong>שליטה מלאה ונוחה:</strong> ניתן למזער או לסגור את הסרגל בכל עת בלחיצה על <em>"מזעור"</em> או <em>"סגירת הדרכה ✕"</em>.</li>
            </ul>
          </div>

          <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:12px; padding:16px 18px; margin-bottom:22px;">
            <div style="font-size:15px; font-weight:800; color:#1e3a8a; margin-bottom:8px;">
              ❓ 2. מרכז עזרה ומידע משודרג (כפתור "עזרה" בסרגל העליון)
            </div>
            <ul style="margin:0; padding-right:20px; font-size:13.5px; color:#1e40af; line-height:1.65;">
              <li><strong>מדריך עבודה מקיף ושאלות נפוצות (FAQ):</strong> חיפוש מהיר בעברית לכל פעולה במערכת (מטרות, מעקב יומי, קול ההורה, הפקת דוחות מחצית ודו"ח 15 סעיפים).</li>
              <li><strong>הפעלה מחדש בכל עת:</strong> ניתן לפתוח או לאפס את הסיור המודרך בכל רגע מתוך חלון העזרה.</li>
            </ul>
          </div>

          <div style="text-align:center; margin:24px 0 14px 0;">
            <a href="${SITE_URL}" style="display:inline-block; background:linear-gradient(135deg, #16a34a 0%, #15803d 100%); color:#ffffff; font-weight:bold; font-size:15px; text-decoration:none; padding:12px 30px; border-radius:10px; box-shadow:0 4px 12px rgba(22, 163, 74, 0.3);">
              🚀 כניסה למערכת TALA
            </a>
          </div>

          <div style="border-top:1px solid #e2e8f0; margin-top:20px; padding-top:12px; font-size:12px; color:#64748b; text-align:center;">
            צוות פיתוח ותמיכה TALA • לרשותך בכל שאלה בצ'אט התמיכה המובנה במערכת
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function cleanupAnnouncementTickets(token, activeUsers) {
  console.log('🧹 Cleaning up announcement tickets from tala_support_threads...');
  let deletedCount = 0;
  let cleanedCount = 0;

  for (const user of activeUsers) {
    const cleanEmail = user.email.trim().toLowerCase();
    const threadKey = sanitizeThreadKey(cleanEmail);
    const threadUrl = `${BASE_FIRESTORE_URL}/tala_support_threads/${threadKey}`;

    const existingRes = await fetch(threadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!existingRes.ok) continue;

    const docJson = await existingRes.json();
    const existingData = parseFirestoreValue({ mapValue: { fields: docJson.fields || {} } });
    const existingMessages = Array.isArray(existingData?.messages) ? existingData.messages : [];

    const hasAnnouncement = existingMessages.some(
      (m) => m.id === 'msg_onboarding_help_announcement_v1'
    );
    if (!hasAnnouncement) continue;

    const remainingMessages = existingMessages.filter(
      (m) => m.id !== 'msg_onboarding_help_announcement_v1'
    );

    if (remainingMessages.length === 0) {
      const delRes = await fetch(threadUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (delRes.ok) {
        deletedCount++;
        console.log(`   🗑️ Deleted announcement-only thread for ${cleanEmail}`);
      }
    } else {
      const updatedThread = {
        ...existingData,
        unreadByUser: false,
        messages: remainingMessages
      };
      const firestoreFields = toFirestoreValue(updatedThread).mapValue.fields;
      const saveRes = await fetch(threadUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: firestoreFields })
      });
      if (saveRes.ok) {
        cleanedCount++;
        console.log(`   ✨ Removed announcement message from existing thread for ${cleanEmail}`);
      }
    }
  }

  console.log(`✅ Cleanup finished: ${deletedCount} threads deleted, ${cleanedCount} threads cleaned.`);
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const isCleanup = process.argv.includes('--cleanup-threads');
  const token = getAccessToken();
  if (!token) {
    console.error('❌ Error: Could not locate Firebase OAuth access token.');
    process.exit(1);
  }

  const [usersRes, settingsRes] = await Promise.all([
    fetch(ALLOWED_USERS_DOC_URL, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(SETTINGS_DOC_URL, { headers: { Authorization: `Bearer ${token}` } })
  ]);

  if (!usersRes.ok) {
    throw new Error(`Failed to fetch allowed_users (${usersRes.status})`);
  }

  const usersDoc = await usersRes.json();
  const rawUsers = parseFirestoreValue(usersDoc.fields?.users) || [];
  const activeUsers = rawUsers.filter((u) => u && u.email && u.active !== false);

  if (isCleanup) {
    await cleanupAnnouncementTickets(token, rawUsers);
    return;
  }

  let appsScriptUrl = DEFAULT_APPS_SCRIPT_URL;
  if (settingsRes.ok) {
    const settingsDoc = await settingsRes.json();
    const emailCfg = parseFirestoreValue(settingsDoc.fields?.emailEngineConfig);
    if (emailCfg?.appsScriptUrl && emailCfg.appsScriptUrl.startsWith('https://script.google.com/')) {
      appsScriptUrl = emailCfg.appsScriptUrl.trim();
    }
  }

  const plainTextSummary =
    '✨ עדכון חדש במערכת TALA: שדרגנו את כפתור ה"עזרה" בסרגל העליון (מדריך עבודה ושאלות נפוצות עם חיפוש מהיר) והוספנו סרגל הדרכה אינטראקטיבי בתחתית המסך המלווה אתכן ב-10 שלבים עם חיצי הכוונה מונפשים ותלמיד לדוגמה ("יונתן לוי").';

  let emailsSent = 0;

  for (const user of activeUsers) {
    const cleanEmail = user.email.trim().toLowerCase();
    const userName = user.name || cleanEmail;

    if (isDryRun) {
      console.log(`   [DRY-RUN] Would email: ${userName} <${cleanEmail}>`);
      continue;
    }

    try {
      const htmlBody = buildAnnouncementEmailHtml(userName);
      const payload = {
        to: cleanEmail,
        subject: '✨ חדש ב-TALA: מרכז עזרה משודרג וסיור מודרך אינטראקטיבי (10 שלבים)',
        htmlBody,
        textBody: plainTextSummary,
        senderName: 'מערכת TALA – תוכנית עבודה אקולוגית'
      };

      const emailRes = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (emailRes.ok) {
        emailsSent++;
        console.log(`   ✅ Emailed ${userName} <${cleanEmail}>`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Email dispatch warning for ${cleanEmail}:`, err.message);
    }
  }

  console.log(`\n🎉 Email Broadcast Complete! Emails Dispatched: ${emailsSent}/${activeUsers.length}.`);
}

run().catch((err) => {
  console.error('❌ Fatal Error:', err.message);
  process.exit(1);
});
