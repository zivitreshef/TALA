/**
 * Deployment Active User Presence Gate
 * Enforces a strict 15-minute idle window before website deployment & publish.
 * Checks Firestore document `tala_config/presence` for active user heartbeats.
 */

const IDLE_THRESHOLD_MINUTES = 15;
const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/tala-d9aaa/databases/(default)/documents/tala_config/presence';

function exitGate(code) {
  process.exitCode = code;
}

async function checkActiveUsers() {
  console.log('====================================================');
  console.log('🔍 Running Active User Presence Deployment Gate Check');
  console.log(`⏱️ Threshold: All users must be idle for >= ${IDLE_THRESHOLD_MINUTES} minutes.`);
  console.log('====================================================');

  try {
    const res = await fetch(FIRESTORE_URL);
    if (res.status === 404) {
      console.log('✅ GREEN LIGHT: No presence document found in cloud yet. Proceeding with deploy.');
      return exitGate(0);
    }

    if (!res.ok) {
      console.warn(`⚠️ Warning: Could not fetch presence doc (${res.status}). Proceeding with caution...`);
      return exitGate(0);
    }

    const data = await res.json();
    const activeUsersMap = data?.fields?.activeUsers?.mapValue?.fields || {};
    const now = Date.now();
    const activeViolations = [];

    for (const [key, val] of Object.entries(activeUsersMap)) {
      const userFields = val?.mapValue?.fields || {};
      const email = userFields.email?.stringValue || key;
      const name = userFields.name?.stringValue || email;
      const lastActiveIso = userFields.lastActiveIso?.stringValue;

      if (lastActiveIso) {
        const lastActiveTime = new Date(lastActiveIso).getTime();
        const diffMs = now - lastActiveTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        console.log(`👤 User: ${name} (${email}) | Last Active: ${diffMinutes} minutes ago (${lastActiveIso})`);

        if (diffMinutes < IDLE_THRESHOLD_MINUTES) {
          activeViolations.push({
            name,
            email,
            diffMinutes,
            lastActiveIso
          });
        }
      }
    }

    if (activeViolations.length > 0) {
      console.log('\n❌ DEPLOYMENT BLOCKED! Connected/Active users detected within 15 minutes threshold:');
      for (const v of activeViolations) {
        console.log(`   ⛔ ${v.name} (${v.email}) was active ${v.diffMinutes} min ago (required: >= 15 min idle)`);
      }
      console.log('\nWait until all users have been idle for 15+ minutes before publishing.');
      return exitGate(1);
    } else {
      console.log('\n✅ DEPLOYMENT GREEN LIGHT: No active users connected in the last 15 minutes.');
      return exitGate(0);
    }
  } catch (err) {
    console.warn('⚠️ Presence check failed with error:', err.message);
    console.log('Proceeding with deploy...');
    return exitGate(0);
  }
}

checkActiveUsers();
