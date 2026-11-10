/**
 * Migration Script: Associate all student reports from תשפ"ו (2025-2026) to תשפ"ז (2026-2027)
 *
 * Usage:
 *   node scripts/migrateStudentsTo2026_2027.js --dry-run
 *   node scripts/migrateStudentsTo2026_2027.js --execute
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'tala-d9aaa';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const STUDENTS_COLLECTION_URL = `${BASE_FIRESTORE_URL}/tala_students`;

const SOURCE_YEAR = 'תשפ"ו (2025-2026)';
const TARGET_YEAR = 'תשפ"ז (2026-2027)';

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

async function fetchAllStudents(token) {
  let documents = [];
  let pageToken = '';

  do {
    const url = `${STUDENTS_COLLECTION_URL}?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch students (${res.status}): ${errText}`);
    }
    const data = await res.json();
    if (Array.isArray(data.documents)) {
      documents = documents.concat(data.documents);
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return documents;
}

async function updateStudentDocument(token, docName, updateMask, docFields) {
  const maskQuery = updateMask.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/${docName}?${maskQuery}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: docFields })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to patch ${docName} (${res.status}): ${errText}`);
  }
  return await res.json();
}

async function runMigration() {
  const isExecute = process.argv.includes('--execute');
  const isDryRun = process.argv.includes('--dry-run') || !isExecute;

  console.log('====================================================');
  console.log(`🚀 TALA Student Year Migration: ${SOURCE_YEAR} ➔ ${TARGET_YEAR}`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no modifications)' : '⚡ LIVE EXECUTE'}`);
  console.log('====================================================');

  const token = getAccessToken();
  if (!token) {
    console.error('❌ Error: Could not locate Firebase OAuth access token.');
    console.error('Run `firebase login` or export FIREBASE_ACCESS_TOKEN first.');
    process.exit(1);
  }

  const allDocs = await fetchAllStudents(token);
  console.log(`Total student documents retrieved: ${allDocs.length}`);

  let eligibleCount = 0;
  let alreadyMigratedCount = 0;

  for (const doc of allDocs) {
    const docName = doc.name;
    const studentId = docName.split('/').pop();
    const fields = doc.fields || {};

    const currentSchoolYear = fields.schoolYear?.stringValue || '';
    const studentName = fields.name?.stringValue || '(ללא שם)';
    const ownerEmail = fields.ownerEmail?.stringValue || '';

    if (currentSchoolYear === TARGET_YEAR) {
      alreadyMigratedCount++;
      continue;
    }

    if (currentSchoolYear !== SOURCE_YEAR && currentSchoolYear !== '') {
      console.log(`ℹ️ Skipping student ${studentName} (${studentId}) with other year: ${currentSchoolYear}`);
      continue;
    }

    eligibleCount++;
    console.log(`\n📋 Processing student: "${studentName}" [${studentId}] (Owner: ${ownerEmail})`);
    console.log(`   Current schoolYear: "${currentSchoolYear}" ➔ Target: "${TARGET_YEAR}"`);

    // Prepare transformed fields
    const updatedFields = { ...fields };
    const fieldMask = ['schoolYear', 'updatedAt'];

    updatedFields.schoolYear = { stringValue: TARGET_YEAR };
    updatedFields.updatedAt = { stringValue: new Date().toISOString() };

    // Migrate reportsByYear map keys
    if (fields.reportsByYear?.mapValue?.fields) {
      const yearMap = { ...fields.reportsByYear.mapValue.fields };
      if (yearMap[SOURCE_YEAR]) {
        console.log(`   Migrating reportsByYear: '${SOURCE_YEAR}' ➔ '${TARGET_YEAR}'`);
        yearMap[TARGET_YEAR] = yearMap[SOURCE_YEAR];
        delete yearMap[SOURCE_YEAR];
        updatedFields.reportsByYear = { mapValue: { fields: yearMap } };
        fieldMask.push('reportsByYear');
      }
    }

    // Migrate reportsByPlanType map keys
    if (fields.reportsByPlanType?.mapValue?.fields) {
      const planTypeMap = { ...fields.reportsByPlanType.mapValue.fields };
      let changedPlanType = false;
      for (const [k, v] of Object.entries(planTypeMap)) {
        if (k.startsWith(`${SOURCE_YEAR}__`)) {
          const suffix = k.slice(SOURCE_YEAR.length);
          const newKey = `${TARGET_YEAR}${suffix}`;
          console.log(`   Migrating reportsByPlanType: '${k}' ➔ '${newKey}'`);
          planTypeMap[newKey] = v;
          delete planTypeMap[k];
          changedPlanType = true;
        }
      }
      if (changedPlanType) {
        updatedFields.reportsByPlanType = { mapValue: { fields: planTypeMap } };
        fieldMask.push('reportsByPlanType');
      }
    }

    if (isExecute) {
      await updateStudentDocument(token, docName, fieldMask, updatedFields);
      console.log(`   ✅ Document successfully updated in Firestore.`);
    } else {
      console.log(`   [DRY RUN] Would update fields: ${fieldMask.join(', ')}`);
    }
  }

  console.log('\n====================================================');
  console.log(`Summary:`);
  console.log(`Total students: ${allDocs.length}`);
  console.log(`Eligible to migrate: ${eligibleCount}`);
  console.log(`Already on target year: ${alreadyMigratedCount}`);
  console.log(isExecute ? `🎉 Migration finished successfully!` : `ℹ️ Dry run completed. Pass --execute to apply changes.`);
  console.log('====================================================');
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
