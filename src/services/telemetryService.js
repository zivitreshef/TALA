/**
 * Telemetry, Cost & Security Data Service
 * Reads and records live telemetry data from Firebase Firestore.
 */

import {
  getFirestoreDb,
  getFirebaseAuth,
  saveSettingsToCloud,
  sanitizeForFirestore
} from '../firebaseBackend';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

export const AI_AUDIT_LOGS_COLLECTION = 'ai_audit_logs';
export const EMAIL_AUDIT_LOGS_COLLECTION = 'tala_email_audit_logs';

/**
 * Mask an email for audit/privacy logging (e.g. "teacher@school.org" -> "t***r@school.org")
 */
export function maskEmailForPrivacy(email = '') {
  if (!email || typeof email !== 'string') return '';
  const clean = email.trim().toLowerCase();
  const parts = clean.split('@');
  if (parts.length !== 2) return clean;
  const user = parts[0];
  const domain = parts[1];
  if (user.length <= 2) return `*@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Records an email sending event in Firestore.
 * Fire-and-forget; never throws and never interferes with email delivery.
 */
export async function recordEmailAuditLogToCloud({ recipientEmail = '' } = {}) {
  try {
    const db = getFirestoreDb();
    if (!db) return false;

    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;
    const userEmail = (currentUser?.email || '').trim().toLowerCase();

    const now = Date.now();
    const id = `email_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const maskedRecipient = maskEmailForPrivacy(recipientEmail);

    const logEntry = {
      id,
      createdAtMs: now,
      userEmail,
      recipientMasked: maskedRecipient
    };

    await setDoc(doc(collection(db, EMAIL_AUDIT_LOGS_COLLECTION), id), sanitizeForFirestore(logEntry));
    return true;
  } catch (err) {
    // Non-blocking telemetry warning
    console.warn('[telemetryService] Failed to record email audit log:', err);
    return false;
  }
}

/**
 * Fetches recent AI and Email audit logs from Firestore for the Admin Dashboard.
 * Admin only (enforced by Firestore Security Rules).
 */
export async function fetchTelemetrySnapshot({ maxAiLogs = 300, maxEmailLogs = 300 } = {}) {
  const db = getFirestoreDb();
  if (!db) {
    return { aiLogs: [], emailLogs: [], isOnline: false };
  }

  let aiLogs = [];
  let emailLogs = [];

  try {
    // 1. Fetch AI audit logs
    try {
      const aiQuery = query(
        collection(db, AI_AUDIT_LOGS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(maxAiLogs)
      );
      const aiSnap = await getDocs(aiQuery);
      aiLogs = aiSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (aiErr) {
      console.warn('[telemetryService] Could not fetch ai_audit_logs:', aiErr);
    }

    // 2. Fetch Email audit logs
    try {
      const emailQuery = query(
        collection(db, EMAIL_AUDIT_LOGS_COLLECTION),
        orderBy('createdAtMs', 'desc'),
        limit(maxEmailLogs)
      );
      const emailSnap = await getDocs(emailQuery);
      emailLogs = emailSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (emailErr) {
      console.warn('[telemetryService] Could not fetch tala_email_audit_logs:', emailErr);
    }

    return { aiLogs, emailLogs, isOnline: true };
  } catch (err) {
    console.warn('[telemetryService] Error fetching telemetry snapshot:', err);
    return { aiLogs: [], emailLogs: [], isOnline: false };
  }
}

/**
 * Toggles the emergency AI Freeze circuit breaker.
 */
export async function setEmergencyAiFreeze(enabled) {
  return saveSettingsToCloud({ aiFreeze: Boolean(enabled) });
}
