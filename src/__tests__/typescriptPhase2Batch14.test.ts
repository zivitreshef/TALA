import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  dispatchTelegramAlert,
  dispatchWhatsAppAlert,
  dispatchEmailAlert,
  sendTestAdminAlert,
  dispatchAlertsToAdmins,
  dispatchChatAlertToAdmins,
  dispatchServerInquiryAlerts,
  DEFAULT_TELEGRAM_BOT_TOKEN
} from '../services/alertDispatcher';
import {
  normalizeEmailKey,
  getOnboardingStateKey,
  getDemoStudentKey,
  createDefaultOnboardingState,
  saveOnboardingState,
  pauseOnboarding,
  resumeOnboarding,
  dismissOnboarding,
  resetOnboardingState,
  advanceOnboardingStep,
  goToOnboardingStep,
  recordOnboardingMilestone,
  resolveOnboardingDockStateForUser,
  getDemoStudent,
  saveDemoStudent,
  clearDemoStudent,
  __clearInMemoryStoreForTesting
} from '../services/onboardingStorage';
import {
  UsageTelemetryService,
  usageTelemetryService,
  RING_BUFFER_CAPACITY,
  MAX_OFFLINE_EVENTS,
  BATCH_SIZE
} from '../services/usageTelemetryService';
import * as emailService from '../emailService.js';

vi.mock('../emailService.js', () => ({
  sendReportEmailInBackground: vi.fn().mockResolvedValue({ success: true }),
  loadEmailEngineConfig: vi.fn().mockReturnValue({ service: 'mock_service' })
}));

describe('TypeScript Migration Phase 2 - Batch 14 (Final Services Modules)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __clearInMemoryStoreForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('alertDispatcher.ts', () => {
    it('dispatches telegram alert with default token and handles response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true })
      }));

      const res = await dispatchTelegramAlert({
        chatId: '12345678',
        text: 'התרעת בדיקה'
      });

      expect(res.ok).toBe(true);
      expect(res.channel).toBe('telegram');
      expect(DEFAULT_TELEGRAM_BOT_TOKEN).toBeDefined();
    });

    it('throws error when telegram chatId is missing', async () => {
      await expect(
        dispatchTelegramAlert({
          chatId: '',
          text: 'התרעה'
        })
      ).rejects.toThrow('Telegram Chat ID is missing');
    });

    it('dispatches WhatsApp alert via CallMeBot gateway', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'Message queued successfully'
      }));

      const res = await dispatchWhatsAppAlert({
        phone: '050-1234567',
        apiKey: 'callmebot_key',
        text: 'שלום'
      });

      expect(res.ok).toBe(true);
      expect(res.channel).toBe('whatsapp');
    });

    it('dispatches email alert using background email engine', async () => {
      const res = await dispatchEmailAlert({
        toEmail: 'admin@tala.edu.il',
        subject: 'התרעה',
        htmlBody: '<p>התרעה</p>'
      });

      expect(res.ok).toBe(true);
      expect(res.channel).toBe('email');
      expect(emailService.sendReportEmailInBackground).toHaveBeenCalledTimes(1);
    });

    it('sends test admin alert across channels', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
        text: async () => 'ok'
      }));

      const resEmail = await sendTestAdminAlert({
        channel: 'email',
        config: { address: 'admin@tala.edu.il' },
        adminName: 'מנהלת'
      });
      expect(resEmail.ok).toBe(true);

      const resWhatsapp = await sendTestAdminAlert({
        channel: 'whatsapp',
        config: { phone: '0501234567', apiKey: 'api_123' }
      });
      expect(resWhatsapp.ok).toBe(true);

      const resTelegram = await sendTestAdminAlert({
        channel: 'telegram',
        config: { chatId: 'chat_123' }
      });
      expect(resTelegram.ok).toBe(true);
    });

    it('fans out health and chat alerts to active configured admins without throwing', async () => {
      const admins = [
        {
          email: 'admin@tala.edu.il',
          role: 'admin',
          active: true,
          adminAlerts: {
            notifyOnHealth: true,
            notifyOnChat: true,
            email: { enabled: true, address: 'admin@tala.edu.il' }
          }
        }
      ];

      const healthResults = await dispatchAlertsToAdmins({
        event: { kind: 'ai_proxy_error', message: 'שגיאה' },
        admins
      });
      expect(healthResults.length).toBe(1);
      expect(healthResults[0].ok).toBe(true);

      const chatResults = await dispatchChatAlertToAdmins({
        teacherName: 'שרה מורה',
        teacherEmail: 'sarah@school.edu.il',
        messageText: 'צריך עזרה',
        admins
      });
      expect(chatResults.length).toBe(1);
      expect(chatResults[0].ok).toBe(true);

      const inquiryResults = await dispatchServerInquiryAlerts({
        request: { name: 'פונה חדש', email: 'guest@web.com', notes: 'שאלה' },
        admins
      });
      expect(inquiryResults.length).toBe(1);
    });
  });

  describe('onboardingStorage.ts', () => {
    it('normalizes email keys and generates distinct storage keys', () => {
      expect(normalizeEmailKey('Teacher.One+1@School.Gov.IL')).toBe('teacher.one_1_school.gov.il');
      expect(normalizeEmailKey('')).toBe('anonymous');
      expect(getOnboardingStateKey('a@b.com')).toContain('tala_onboarding_state_v1_');
      expect(getDemoStudentKey('a@b.com')).toContain('tala_onboarding_demo_v1_');
    });

    it('creates, saves, and transitions onboarding journey states', () => {
      const email = 'new_teacher@school.org.il';
      const initial = createDefaultOnboardingState(email);
      expect(initial.currentStep).toBe(1);
      expect(initial.isCompleted).toBe(false);

      const saved = saveOnboardingState(email, { mode: 'real', isDockCollapsed: true });
      expect(saved.mode).toBe('real');
      expect(saved.isDockCollapsed).toBe(true);

      const paused = pauseOnboarding(email);
      expect(paused.isPaused).toBe(true);

      const resumed = resumeOnboarding(email);
      expect(resumed.isPaused).toBe(false);
      expect(resumed.isDockCollapsed).toBe(false);

      const dismissed = dismissOnboarding(email);
      expect(dismissed.isDismissed).toBe(true);

      const step2 = goToOnboardingStep(email, 2);
      expect(step2.currentStep).toBe(2);

      const step3 = advanceOnboardingStep(email);
      expect(step3.currentStep).toBe(3);
      expect(step3.completedSteps).toContain(2);

      const withMilestone = recordOnboardingMilestone(email, 'first_student');
      expect(withMilestone.firstStudentAt).toBeDefined();

      const reset = resetOnboardingState(email, 'demo');
      expect(reset.currentStep).toBe(1);
      expect(reset.mode).toBe('demo');
    });

    it('resolves dock state based on existing student count and user interaction', () => {
      const state = createDefaultOnboardingState('test@tala.il');
      const forNewTeacher = resolveOnboardingDockStateForUser(state, 0);
      expect(forNewTeacher?.isDockCollapsed).toBe(false);

      const forExistingTeacher = resolveOnboardingDockStateForUser(state, 3);
      expect(forExistingTeacher?.isDockCollapsed).toBe(true);

      const userToggledState = { ...state, userToggledDock: true, isDockCollapsed: false };
      const resolvedToggled = resolveOnboardingDockStateForUser(userToggledState, 5);
      expect(resolvedToggled?.isDockCollapsed).toBe(false);
    });

    it('provides isolated demo student storage without cloud persistence', () => {
      const email = 'demo_user@school.org.il';
      const student = getDemoStudent(email);
      expect(student.id).toBe('demo_yonatan_levi');
      expect(student.isDemo).toBe(true);

      saveDemoStudent(email, { ...student, customNotes: 'הערות בודק' });
      const updated = getDemoStudent(email);
      expect(updated.customNotes).toBe('הערות בודק');

      clearDemoStudent(email);
      const fresh = getDemoStudent(email, { forceFresh: true });
      expect(fresh.customNotes).toBeUndefined();
    });
  });

  describe('usageTelemetryService.ts', () => {
    it('manages configuration options cleanly', () => {
      const service = new UsageTelemetryService();
      expect(service.isEnabled()).toBe(true);

      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);
      service.setEnabled(true);

      service.setSamplingRate(0.5);
      expect(service.getSamplingRate()).toBe(0.5);

      service.setExcludeInternalAccounts(true);
      expect(service.getExcludeInternalAccounts()).toBe(true);

      service.setUserContext({ email: 'teacher@school.gov.il', role: 'teacher' });
      expect(service.getUserContext()?.email).toBe('teacher@school.gov.il');

      service.setAppVersion('2.5.14');
      expect(service.getAppVersion()).toBe('2.5.14');

      expect(RING_BUFFER_CAPACITY).toBe(100);
      expect(MAX_OFFLINE_EVENTS).toBe(50);
      expect(BATCH_SIZE).toBe(15);

      service.destroy();
    });

    it('tracks events, rejects invalid taxonomy, and handles duplicates', () => {
      const service = new UsageTelemetryService();
      service.setUserContext({ email: 'teacher@school.gov.il' });

      // Invalid event rejected
      const invalid = service.track('invalid_unknown_event', { foo: 'bar' });
      expect(invalid).toBe(false);

      // Valid event enqueued
      const ok1 = service.track('session_start');
      expect(ok1).toBe(true);
      expect(service.getBufferSize()).toBe(1);

      // Immediate duplicate within window suppressed
      const ok2 = service.track('session_start');
      expect(ok2).toBe(false);
      expect(service.getBufferSize()).toBe(1);

      service.destroy();
    });

    it('flushes batch using pluggable transport and clears buffer', async () => {
      const service = new UsageTelemetryService();
      const mockTransport = vi.fn().mockResolvedValue(true);
      service.setTransport(mockTransport);

      service.track('session_start');
      expect(service.getBufferSize()).toBe(1);

      const flushed = await service.flush();
      expect(flushed).toBe(true);
      expect(mockTransport).toHaveBeenCalledTimes(1);
      expect(service.getBufferSize()).toBe(0);

      service.destroy();
    });

    it('buffers offline events when network is down', async () => {
      const service = new UsageTelemetryService();
      service.setIsOnline(false);

      service.track('session_start');
      const flushed = await service.flush();
      expect(flushed).toBe(false);
      expect(service.getBufferSize()).toBe(0); // moved to offline storage

      service.clear();
      service.destroy();
    });

    it('singleton instance is ready and functional', () => {
      expect(usageTelemetryService).toBeInstanceOf(UsageTelemetryService);
      expect(usageTelemetryService.isEnabled()).toBe(true);
    });
  });
});
