/**
 * CLI Helper: Set Upgrade & Deployment Warning Banner in Firestore
 * Usage:
 *   node scripts/setUpgradeBanner.js --on [--message "custom message"]
 *   node scripts/setUpgradeBanner.js --off
 *   node scripts/setUpgradeBanner.js --status
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'tala-d9aaa';
const SETTINGS_DOC_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tala_config/settings`;

const DEFAULT_BANNER_MESSAGE =
  'המערכת עוברת כעת שדרוג ועדכון גרסה! אנא שמרו את עבודתכם באופן מיידי כדי למנוע אובדן נתונים ושמירה על תקינות המידע. בסיום העדכון, יש לרענן את האתר (F5 / רענן) כדי ליהנות מהתכונות והשיפורים החדשים.';

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

async function fetchCurrentSettings(token) {
  const res = await fetch(SETTINGS_DOC_URL, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return {};
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch settings doc (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function setUpgradeBanner(active, customMessage = '') {
  const token = getAccessToken();
  if (!token) {
    console.error('❌ Error: Could not locate Firebase OAuth access token.');
    console.error('Run `firebase login` or export FIREBASE_ACCESS_TOKEN first.');
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const bannerMessage = (customMessage && customMessage.trim()) || DEFAULT_BANNER_MESSAGE;

  console.log(`📡 Updating Upgrade Banner in Firestore -> ${active ? 'ACTIVE (RED BANNER ON)' : 'INACTIVE (OFF)'}...`);

  const patchUrl = `${SETTINGS_DOC_URL}?updateMask.fieldPaths=upgradeBanner&updateMask.fieldPaths=updatedAt`;

  const payload = {
    fields: {
      updatedAt: { stringValue: nowIso },
      upgradeBanner: {
        mapValue: {
          fields: {
            active: { booleanValue: active },
            message: { stringValue: bannerMessage },
            updatedAt: { stringValue: nowIso },
            startedAt: { stringValue: active ? nowIso : '' }
          }
        }
      }
    }
  };

  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update settings doc (${res.status}): ${errText}`);
  }

  console.log(`✅ Success! Upgrade Banner is now ${active ? '🔴 ACTIVE' : '⚪ DISABLED'}.`);
  if (active) {
    console.log(`   📢 Message broadcasted to active users:\n   "${bannerMessage}"`);
  }
}

async function showStatus() {
  const token = getAccessToken();
  if (!token) {
    console.error('❌ Error: Could not locate Firebase OAuth access token.');
    process.exit(1);
  }
  const doc = await fetchCurrentSettings(token);
  const banner = doc?.fields?.upgradeBanner?.mapValue?.fields;
  const isActive = banner?.active?.booleanValue || false;
  const msg = banner?.message?.stringValue || '(none)';
  const updatedAt = banner?.updatedAt?.stringValue || 'N/A';

  console.log('==============================================');
  console.log('📊 TALA Upgrade Warning Banner Status');
  console.log('==============================================');
  console.log(`Status:     ${isActive ? '🔴 ACTIVE (VISIBLE TO LOGGED-IN USERS)' : '⚪ INACTIVE'}`);
  console.log(`Updated At: ${updatedAt}`);
  console.log(`Message:    ${msg}`);
  console.log('==============================================');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--status')) {
    await showStatus();
  } else if (args.includes('--on') || args.includes('--enable')) {
    const msgIdx = args.indexOf('--message');
    const customMsg = msgIdx >= 0 && args[msgIdx + 1] ? args[msgIdx + 1] : '';
    await setUpgradeBanner(true, customMsg);
  } else if (args.includes('--off') || args.includes('--disable')) {
    await setUpgradeBanner(false);
  } else {
    console.log('Usage:');
    console.log('  node scripts/setUpgradeBanner.js --status');
    console.log('  node scripts/setUpgradeBanner.js --on [--message "..."]');
    console.log('  node scripts/setUpgradeBanner.js --off');
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
