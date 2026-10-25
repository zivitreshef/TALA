import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import * as firebaseBackend from '../firebaseBackend';
import {
  createInvite,
  fetchInviteForRespondent,
  submitInviteResponses,
  markInviteReviewed,
  deleteInvite
} from '../services/inviteService';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id) => ({ path: `${col}/${id}`, id })),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP')
}));

vi.mock('../firebaseBackend', () => ({
  getFirestoreDb: vi.fn(() => ({ type: 'mockFirestoreDb' })),
  getFirebaseAuth: vi.fn(() => ({ currentUser: { email: 'teacher@test.com' } })),
  ensureFirebaseAuthSession: vi.fn()
}));

describe('inviteService - Parent Invite & Respondent Cloud Service Suite', () => {
  const mockDb = { type: 'mockFirestoreDb' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(firebaseBackend.getFirestoreDb).mockReturnValue(mockDb);
    vi.stubGlobal('window', {
      location: {
        href: 'https://zivitreshef.github.io/TALA/'
      }
    });
  });

  it('createInvite: throws error when cloud backend is unconfigured', async () => {
    vi.mocked(firebaseBackend.getFirestoreDb).mockReturnValueOnce(null);
    await expect(
      createInvite({ ownerEmail: 'teacher@test.com', studentId: 'student_123' })
    ).rejects.toThrow('Cloud backend is not configured');
  });

  it('createInvite: creates doc with status pending, studentId, ownerEmail and returns url with hash token', async () => {
    const params = {
      ownerEmail: ' Teacher@Test.com ',
      studentId: 's_456',
      childFirstName: 'דניאל כהן',
      gender: 'boy'
    };

    const result = await createInvite(params);

    expect(result).toHaveProperty('token');
    expect(typeof result.token).toBe('string');
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(result.url).toBe(`https://zivitreshef.github.io/TALA/#/share-input/${result.token}`);

    expect(firestore.doc).toHaveBeenCalledWith(mockDb, 'tala_invites', result.token);
    expect(firestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `tala_invites/${result.token}`, id: result.token }),
      expect.objectContaining({
        ownerEmail: 'teacher@test.com',
        studentId: 's_456',
        childFirstName: 'דניאל',
        gender: 'boy',
        status: 'pending'
      })
    );
  });

  it('fetchInviteForRespondent: rejects invalid token format with { state: "missing", invite: null }', async () => {
    const result = await fetchInviteForRespondent('invalid_short_token');
    expect(result).toEqual({ state: 'missing', invite: null });
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it('fetchInviteForRespondent: returns { state: "expired" } when expired', async () => {
    const validToken = 'abcdefghijklmnopqrstuv';
    const pastDate = new Date(Date.now() - 1000 * 60 * 60);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        status: 'pending',
        studentId: 's_123',
        expiresAt: pastDate
      })
    });

    const result = await fetchInviteForRespondent(validToken);
    expect(result.state).toBe('expired');
    expect(result.invite).toMatchObject({
      status: 'pending',
      studentId: 's_123'
    });
  });

  it('fetchInviteForRespondent: returns active invite when valid and pending', async () => {
    const validToken = '1234567890123456789012';
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        status: 'pending',
        studentId: 's_789',
        childFirstName: 'מאיה',
        expiresAt: futureDate
      })
    });

    const result = await fetchInviteForRespondent(validToken);
    expect(result.state).toBe('pending');
    expect(result.invite).toMatchObject({
      status: 'pending',
      studentId: 's_789',
      childFirstName: 'מאיה'
    });
  });

  it('submitInviteResponses: rejects empty response and sanitizes answers setting status to "submitted"', async () => {
    const token = '1234567890123456789012';

    // 1. Empty payload throws
    await expect(submitInviteResponses(token, {})).rejects.toThrow('Empty response');
    await expect(
      submitInviteResponses(token, { strengths: '   ', challenges: '' })
    ).rejects.toThrow('Empty response');

    // 2. Valid payload gets sanitized and sets status to submitted
    await submitInviteResponses(token, {
      strengths: '  אוהב מוזיקה וציור  ',
      challenges: 'קושי במעברים',
      unsupportedKey: 'ignored'
    });

    expect(firestore.doc).toHaveBeenCalledWith(mockDb, 'tala_invites', token);
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `tala_invites/${token}`, id: token }),
      {
        status: 'submitted',
        responses: {
          strengths: 'אוהב מוזיקה וציור',
          challenges: 'קושי במעברים'
        },
        submittedAt: 'MOCK_TIMESTAMP'
      }
    );
  });

  it('markInviteReviewed: sets reviewed action and reviewedAt timestamp', async () => {
    const token = '1234567890123456789012';

    await markInviteReviewed(token, 'merged');

    expect(firestore.doc).toHaveBeenCalledWith(mockDb, 'tala_invites', token);
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `tala_invites/${token}`, id: token }),
      {
        reviewedAction: 'merged',
        reviewedAt: 'MOCK_TIMESTAMP'
      }
    );
  });

  it('deleteInvite: calls deleteDoc with correct doc reference', async () => {
    const token = '1234567890123456789012';

    await deleteInvite(token);

    expect(firestore.doc).toHaveBeenCalledWith(mockDb, 'tala_invites', token);
    expect(firestore.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `tala_invites/${token}`, id: token })
    );
  });
});
