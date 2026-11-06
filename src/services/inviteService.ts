import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
  type DocumentData
} from 'firebase/firestore';
import { ensureFirebaseAuthSession, getFirebaseAuth, getFirestoreDb } from '../firebaseBackend';
import {
  INVITE_COLLECTION,
  buildInviteDoc,
  buildInviteUrl,
  generateInviteToken,
  getInviteState,
  isValidInviteToken,
  sanitizeResponses,
  type InviteDoc
} from '../domain/parentInvite';

export interface CreateInviteParams {
  ownerEmail: string;
  studentId: string;
  childFirstName: string;
  gender?: string;
  inviteType?: 'parent' | 'staff';
  recipientRole?: string;
  recipientName?: string;
  customQuestions?: string[];
  overrideDefaults?: boolean;
}

export interface CreateInviteResult {
  token: string;
  url: string;
}

export interface FetchInviteResult {
  state: string;
  invite: InviteDoc | DocumentData | null;
}

/** Teacher side: make sure Firestore rules see this teacher (no-op when already signed in). */
export async function ensureTeacherSession(email?: string): Promise<void> {
  const clean = String(email || '').trim().toLowerCase();
  if (getFirebaseAuth()?.currentUser?.email?.toLowerCase() === clean) return;
  await ensureFirebaseAuthSession();
}

/** Teacher side: creates a pending invite and returns its public URL. */
export async function createInvite({
  ownerEmail,
  studentId,
  childFirstName,
  gender = 'boy',
  inviteType = 'parent',
  recipientRole = '',
  recipientName = '',
  customQuestions = [],
  overrideDefaults = false
}: CreateInviteParams): Promise<CreateInviteResult> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  const token = generateInviteToken();
  const inviteDoc = buildInviteDoc({
    ownerEmail,
    studentId,
    childFirstName,
    gender,
    inviteType,
    recipientRole,
    recipientName,
    customQuestions,
    overrideDefaults
  });
  await setDoc(doc(db, INVITE_COLLECTION, token), inviteDoc);
  return { token, url: buildInviteUrl(typeof window !== 'undefined' ? window.location.href : '', token) };
}

/** Public side: reads a single invite by token (rules deny listing). */
export async function fetchInviteForRespondent(token: string): Promise<FetchInviteResult> {
  if (!isValidInviteToken(token)) return { state: 'missing', invite: null };
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  const snap = await getDoc(doc(db, INVITE_COLLECTION, token));
  if (!snap.exists()) return { state: 'missing', invite: null };
  const invite = snap.data();
  return { state: getInviteState(invite), invite };
}

/** Public side: one-shot submit. Firestore rules enforce pending + not expired + allowed fields. */
export async function submitInviteResponses(
  token: string,
  rawResponses?: Record<string, unknown>
): Promise<void> {
  const responses = sanitizeResponses(rawResponses);
  if (Object.keys(responses).length === 0) throw new Error('Empty response');
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  await updateDoc(doc(db, INVITE_COLLECTION, token), {
    status: 'submitted',
    responses,
    submittedAt: serverTimestamp()
  });
}

/** Teacher side: live list of this teacher's invites for one student. */
export function subscribeToStudentInvites(
  ownerEmail: string,
  studentId: string,
  onChange: (invites: Array<DocumentData & { token: string }>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getFirestoreDb();
  const owner = String(ownerEmail || '').trim().toLowerCase();
  if (!db || !owner || !studentId) return () => {};
  const q = query(
    collection(db, INVITE_COLLECTION),
    where('ownerEmail', '==', owner),
    where('studentId', '==', studentId)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ token: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

/** Teacher side: record that the answers were merged into the plan or archived. */
export async function markInviteReviewed(token: string, action: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  await updateDoc(doc(db, INVITE_COLLECTION, token), {
    reviewedAction: action,
    reviewedAt: serverTimestamp()
  });
}

/** Teacher side: cancel a still-pending link. */
export async function deleteInvite(token: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  await deleteDoc(doc(db, INVITE_COLLECTION, token));
}
