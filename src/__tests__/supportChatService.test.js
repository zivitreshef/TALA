import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  subscribeToSupportThread,
  subscribeToAllSupportThreads,
  sendChatMessageToCloud,
  markThreadReadInCloud,
  SUPPORT_THREADS_COLLECTION
} from '../services/supportChatService';
import * as firebaseBackend from '../firebaseBackend';
import * as alertDispatcher from '../services/alertDispatcher';

describe('Support Chat Service (Cloud Firestore & Real-Time Sync)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('subscribeToSupportThread returns a no-op function if db or email is missing', () => {
    vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(null);
    const unsub = subscribeToSupportThread('teacher@school.org', vi.fn());
    expect(typeof unsub).toBe('function');
    unsub();

    const unsub2 = subscribeToSupportThread('', vi.fn());
    expect(typeof unsub2).toBe('function');
    unsub2();
  });

  it('subscribeToAllSupportThreads returns a no-op function if db is missing', () => {
    vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(null);
    const unsub = subscribeToAllSupportThreads(vi.fn());
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('sendChatMessageToCloud creates updated thread and dispatches alerts for teacher messages', async () => {
    vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(null);
    const alertSpy = vi.spyOn(alertDispatcher, 'dispatchChatAlertToAdmins').mockResolvedValue([]);
    const submitReqSpy = vi.spyOn(firebaseBackend, 'submitAdminRequestToCloud').mockResolvedValue(true);

    const mockAdmins = [
      { role: 'admin', email: 'admin@tala.com', active: true, adminAlerts: { whatsapp: { enabled: true } } }
    ];

    const result = await sendChatMessageToCloud({
      userEmail: 'sara@school.edu',
      userName: 'שרה',
      topic: 'שאלה בנושא תוכנית עבודה',
      text: 'איך אני מוסיפה מטרת ביניים נוספת?',
      senderRole: 'user',
      senderName: 'שרה',
      admins: mockAdmins
    });

    expect(result.userEmail).toBe('sara@school.edu');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe('איך אני מוסיפה מטרת ביניים נוספת?');
    expect(result.unreadByAdmin).toBe(true);

    // Verifies background alerts triggered
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherName: 'שרה',
        teacherEmail: 'sara@school.edu',
        messageText: 'איך אני מוסיפה מטרת ביניים נוספת?'
      })
    );
  });

  it('sendChatMessageToCloud does NOT dispatch admin alerts when message is sent by admin', async () => {
    vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(null);
    const alertSpy = vi.spyOn(alertDispatcher, 'dispatchChatAlertToAdmins').mockResolvedValue([]);

    const existingThread = {
      id: 'sara_school_edu',
      userEmail: 'sara@school.edu',
      userName: 'שרה',
      messages: [{ id: 'm1', text: 'שאלה', senderRole: 'user', timestamp: Date.now() }]
    };

    const result = await sendChatMessageToCloud({
      existingThread,
      userEmail: 'sara@school.edu',
      text: 'שלום שרה, נכנסים ללשונית מטרות ולוחצים על הוסף יעד.',
      senderRole: 'admin',
      senderName: 'מנהלת המערכת',
      admins: [{ role: 'admin' }]
    });

    expect(result.messages).toHaveLength(2);
    expect(result.lastMessageSender).toBe('admin');
    expect(result.unreadByUser).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('markThreadReadInCloud safely handles missing db or threadKey without throwing', async () => {
    vi.spyOn(firebaseBackend, 'getFirestoreDb').mockReturnValue(null);
    await expect(markThreadReadInCloud('', 'user')).resolves.not.toThrow();
    await expect(markThreadReadInCloud('some_key', 'admin')).resolves.not.toThrow();
  });
});
