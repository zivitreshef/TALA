/**
 * Real-time Firebase Firestore Service for TALA Support Chat & Bi-directional Inquiries.
 */

import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  query,
  orderBy,
  limit,
  Unsubscribe
} from 'firebase/firestore';
import { getFirestoreDb, sanitizeForFirestore, submitAdminRequestToCloud } from '../firebaseBackend';
import {
  sanitizeThreadKey,
  createChatMessage,
  appendMessageToThread,
  SENDER_ROLES,
  THREAD_STATUS,
  SenderRole,
  ResolutionFeedback,
  SupportThread,
  ChatAttachment
} from '../domain/supportChat';
import { dispatchChatAlertToAdmins } from './alertDispatcher.js';

export const SUPPORT_THREADS_COLLECTION = 'tala_support_threads';

export type SupportThreadCallback = (thread: SupportThread | null) => void;
export type AllSupportThreadsCallback = (threads: SupportThread[]) => void;

export interface SendChatMessageParams {
  existingThread?: SupportThread | null;
  userEmail?: string;
  userName?: string;
  topic?: string;
  text?: string;
  attachment?: (Partial<ChatAttachment> & { dataUrl?: string }) | null;
  senderRole?: SenderRole;
  senderName?: string;
  admins?: unknown[];
  emailConfig?: unknown;
}

/**
 * Subscribes a teacher or admin to a specific support thread in real time.
 * Returns an unsubscribe function.
 */
export function subscribeToSupportThread(
  userEmail: string,
  onUpdate?: SupportThreadCallback
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db || !userEmail) return () => {};

  const threadKey = sanitizeThreadKey(userEmail);
  const docRef = doc(db, SUPPORT_THREADS_COLLECTION, threadKey);

  try {
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate?.(snap.data() as SupportThread);
        } else {
          onUpdate?.(null);
        }
      },
      (err) => {
        console.warn(`[supportChat] Real-time thread listener warning for ${threadKey}:`, err);
      }
    );
  } catch (err) {
    console.warn('[supportChat] Failed to subscribe to thread:', err);
    return () => {};
  }
}

/**
 * Subscribes the admin to all support threads in real time (Admin Control Center).
 * Returns an unsubscribe function.
 */
export function subscribeToAllSupportThreads(
  onUpdate?: AllSupportThreadsCallback,
  maxThreads = 50
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) return () => {};

  try {
    const q = query(
      collection(db, SUPPORT_THREADS_COLLECTION),
      orderBy('updatedAt', 'desc'),
      limit(maxThreads)
    );

    return onSnapshot(
      q,
      (snap) => {
        const threads: SupportThread[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as SupportThread)
        }));
        onUpdate?.(threads);
      },
      (err) => {
        console.warn('[supportChat] Admin threads listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('[supportChat] Failed to subscribe to all threads:', err);
    return () => {};
  }
}

/**
 * Sends a chat message in real time to Firestore and triggers admin alerts if sent by teacher.
 */
export async function sendChatMessageToCloud({
  existingThread = null,
  userEmail = '',
  userName = '',
  topic = 'פנייה לתמיכה',
  text = '',
  attachment = null,
  senderRole = SENDER_ROLES.USER,
  senderName = '',
  admins = [],
  emailConfig = null
}: SendChatMessageParams): Promise<SupportThread> {
  const cleanEmail = String(userEmail || existingThread?.userEmail || '').trim().toLowerCase();
  const threadKey = existingThread?.id || sanitizeThreadKey(cleanEmail);
  const cleanName = String(userName || existingThread?.userName || '').trim();
  const cleanTopic = String(topic || existingThread?.topic || 'פנייה לתמיכה').trim();

  const newMessage = createChatMessage({
    senderRole,
    senderEmail: senderRole === SENDER_ROLES.ADMIN ? 'admin@tala.edu.il' : cleanEmail,
    senderName: senderName || (senderRole === SENDER_ROLES.ADMIN ? 'מנהלת המערכת' : cleanName),
    text,
    attachment
  });

  const baseThread: SupportThread = existingThread || {
    id: threadKey,
    userEmail: cleanEmail,
    userName: cleanName,
    topic: cleanTopic,
    messages: []
  };

  const updatedThread = appendMessageToThread(baseThread, newMessage);

  const db = getFirestoreDb();
  let savedToCloud = false;
  if (db) {
    try {
      const docRef = doc(db, SUPPORT_THREADS_COLLECTION, threadKey);
      await setDoc(docRef, sanitizeForFirestore(updatedThread as Record<string, unknown>), { merge: true });
      savedToCloud = true;
    } catch (err) {
      console.warn('[supportChat] Failed to persist thread to Firestore:', err);
    }
  }

  // Also submit as admin request on initial contact or if unauthenticated
  if (senderRole === SENDER_ROLES.USER && (!existingThread?.messages || existingThread.messages.length <= 1)) {
    submitAdminRequestToCloud({
      id: `req_chat_${threadKey}`,
      name: cleanName,
      email: cleanEmail,
      topic: cleanTopic,
      notes: text,
      createdAt: newMessage.createdAt
    }).catch(() => {});
  }

  // If message is from teacher and cloud trigger was not reached (local/offline fallback), alert admins in background
  const hasConfiguredClientAdmins =
    Array.isArray(admins) &&
    admins.some(
      (a) => a && typeof a === 'object' && 'adminAlerts' in a && typeof (a as { adminAlerts: unknown }).adminAlerts === 'object'
    );
  if (senderRole === SENDER_ROLES.USER && hasConfiguredClientAdmins && !savedToCloud) {
    (dispatchChatAlertToAdmins as (args: Record<string, unknown>) => Promise<unknown>)({
      teacherName: cleanName,
      teacherEmail: cleanEmail,
      topic: cleanTopic,
      messageText: text || '📷 [צילום מסך מצורף]',
      hasAttachment: Boolean(attachment),
      admins: admins as Record<string, unknown>[],
      emailConfig
    }).catch((err: unknown) => {
      console.warn('[supportChat] Background alert dispatch warning:', err);
    });
  }

  return updatedThread;
}

/**
 * Marks a thread as read in Firestore.
 */
export async function markThreadReadInCloud(
  threadKey: string,
  role: SenderRole = SENDER_ROLES.USER
): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !threadKey) return;

  try {
    const docRef = doc(db, SUPPORT_THREADS_COLLECTION, threadKey);
    const updatePayload = role === SENDER_ROLES.ADMIN ? { unreadByAdmin: false } : { unreadByUser: false };
    await setDoc(docRef, updatePayload, { merge: true });
  } catch (err) {
    console.warn('[supportChat] Failed to mark thread as read:', err);
  }
}

/**
 * Clears/resets the support thread history for a teacher in Firestore.
 */
export async function clearSupportThreadInCloud(userEmail: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !userEmail) return false;

  const threadKey = sanitizeThreadKey(userEmail);
  try {
    const docRef = doc(db, SUPPORT_THREADS_COLLECTION, threadKey);
    await setDoc(
      docRef,
      {
        messages: [],
        lastMessageText: '',
        lastMessageSender: '',
        updatedAt: new Date().toISOString(),
        unreadByAdmin: false,
        unreadByUser: false
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('[supportChat] Failed to clear support thread:', err);
    return false;
  }
}

/**
 * Resolves a support thread in Firestore with satisfaction feedback.
 */
export async function resolveSupportThreadInCloud(
  userEmail: string,
  satisfaction: ResolutionFeedback | string = 'thumbs_up'
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !userEmail) return false;

  const threadKey = sanitizeThreadKey(userEmail);
  try {
    const docRef = doc(db, SUPPORT_THREADS_COLLECTION, threadKey);
    await setDoc(
      docRef,
      {
        status: THREAD_STATUS.RESOLVED,
        resolutionFeedback: satisfaction,
        resolvedAt: new Date().toISOString(),
        unreadByAdmin: false
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('[supportChat] Failed to resolve support thread:', err);
    return false;
  }
}

/**
 * Marks a support thread as needing further attention when teacher clicks thumbs down.
 */
export async function escalateSupportThreadInCloud(
  userEmail: string,
  note = ''
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !userEmail) return false;

  const threadKey = sanitizeThreadKey(userEmail);
  try {
    const docRef = doc(db, SUPPORT_THREADS_COLLECTION, threadKey);
    await setDoc(
      docRef,
      {
        status: THREAD_STATUS.NEEDS_ATTENTION,
        lastFeedback: 'needs_help',
        feedbackNote: String(note || '').slice(0, 500),
        unreadByAdmin: true,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('[supportChat] Failed to escalate support thread:', err);
    return false;
  }
}
