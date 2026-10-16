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
  where
} from 'firebase/firestore';
import { ensureFirebaseAuthSession, getFirebaseAuth, getFirestoreDb } from '../firebaseBackend';
import {
  INVITE_COLLECTION,
  buildInviteDoc,
  buildInviteUrl,
  generateInviteToken,
  getInviteState,
  isValidInviteToken,
  sanitizeResponses
} from '../domain/parentInvite';

/** Teacher side: make sure Firestore rules see this teacher (no-op when already signed in). */
export async function ensureTeacherSession(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (getFirebaseAuth()?.currentUser?.email?.toLowerCase() === clean) return;
  await ensureFirebaseAuthSession(clean);
}

/** Teacher side: creates a pending invite and returns its public URL. */
export async function createInvite({ ownerEmail, studentId, childFirstName, gender }) {
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  const token = generateInviteToken();
  const inviteDoc = buildInviteDoc({ ownerEmail, studentId, childFirstName, gender });
  await setDoc(doc(db, INVITE_COLLECTION, token), inviteDoc);
  return { token, url: buildInviteUrl(window.location.href, token) };
}

/** Public side: reads a single invite by token (rules deny listing). */
export async function fetchInviteForRespondent(token) {
  if (!isValidInviteToken(token)) return { state: 'missing', invite: null };
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  const snap = await getDoc(doc(db, INVITE_COLLECTION, token));
  if (!snap.exists()) return { state: 'missing', invite: null };
  const invite = snap.data();
  return { state: getInviteState(invite), invite };
}

/** Public side: one-shot submit. Firestore rules enforce pending + not expired + allowed fields. */
export async function submitInviteResponses(token, rawResponses) {
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
export function subscribeToStudentInvites(ownerEmail, studentId, onChange, onError) {
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
export async function markInviteReviewed(token, action) {
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  await updateDoc(doc(db, INVITE_COLLECTION, token), {
    reviewedAction: action,
    reviewedAt: serverTimestamp()
  });
}

/** Teacher side: cancel a still-pending link. */
export async function deleteInvite(token) {
  const db = getFirestoreDb();
  if (!db) throw new Error('Cloud backend is not configured');
  await deleteDoc(doc(db, INVITE_COLLECTION, token));
}

