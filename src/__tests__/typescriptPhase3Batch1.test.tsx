import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import UpgradeBanner, {
  isUpgradeBannerExpired,
  DEFAULT_UPGRADE_BANNER_MESSAGE,
  MAX_UPGRADE_BANNER_TTL_MS
} from '../components/UpgradeBanner';
import ErrorBoundary, { ErrorBoundaryProps } from '../components/ErrorBoundary';
import SessionEvictedModal, { SessionEvictedModalProps } from '../components/modals/SessionEvictedModal';
import TakeoverModal, { TakeoverModalProps } from '../components/modals/TakeoverModal';
import {
  GUIDE_CATEGORIES,
  PEDAGOGICAL_GUIDE_CHAPTERS
} from '../components/modals/pedagogicalGuideData';
import { usageTelemetryService } from '../services/usageTelemetryService';

describe('TypeScript Migration Phase 3 - Batch 1 (Modular UI & Modals)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UpgradeBanner.tsx', () => {
    it('evaluates expiration accurately based on TTL', () => {
      expect(isUpgradeBannerExpired(null)).toBe(true);
      expect(isUpgradeBannerExpired({ active: false })).toBe(true);

      const now = Date.now();
      const recent = { active: true, startedAt: new Date(now - 60000).toISOString() };
      expect(isUpgradeBannerExpired(recent, now)).toBe(false);

      const expired = { active: true, startedAt: new Date(now - (MAX_UPGRADE_BANNER_TTL_MS + 1000)).toISOString() };
      expect(isUpgradeBannerExpired(expired, now)).toBe(true);

      const invalidDate = { active: true, startedAt: 'not-a-valid-date' };
      expect(isUpgradeBannerExpired(invalidDate, now)).toBe(false);
    });

    it('renders empty string when banner is inactive or expired', () => {
      const htmlInactive = renderToStaticMarkup(
        <UpgradeBanner bannerData={{ active: false }} />
      );
      expect(htmlInactive).toBe('');

      const htmlExpired = renderToStaticMarkup(
        <UpgradeBanner
          bannerData={{
            active: true,
            startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
          }}
        />
      );
      expect(htmlExpired).toBe('');
    });

    it('renders HTML banner markup when active and exposes message', () => {
      const html = renderToStaticMarkup(
        <UpgradeBanner
          bannerData={{
            active: true,
            message: 'שדרוג דחוף במערכת'
          }}
          isDirty={true}
        />
      );

      expect(html).toContain('tala-upgrade-banner');
      expect(html).toContain('שדרוג דחוף במערכת');
      expect(html).toContain('role="alert"');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('שמור עבודתי כעת');
    });

    it('provides valid defaults for constants and message', () => {
      expect(DEFAULT_UPGRADE_BANNER_MESSAGE).toContain('שדרוג ועדכון גרסה');
      expect(MAX_UPGRADE_BANNER_TTL_MS).toBe(15 * 60 * 1000);

      const htmlDefault = renderToStaticMarkup(
        <UpgradeBanner
          bannerData={{
            active: true,
            message: '  '
          }}
        />
      );
      expect(htmlDefault).toContain(DEFAULT_UPGRADE_BANNER_MESSAGE);
    });
  });

  describe('ErrorBoundary.tsx', () => {
    it('returns child elements when no error occurred', () => {
      const props: ErrorBoundaryProps = {
        children: <div>Content OK</div>
      };
      const html = renderToStaticMarkup(<ErrorBoundary {...props} />);
      expect(html).toContain('Content OK');
    });

    it('updates state via getDerivedStateFromError and catches runtime errors with telemetry', () => {
      const testError = new Error('Test crash in component');
      const derived = ErrorBoundary.getDerivedStateFromError(testError);
      expect(derived.hasError).toBe(true);
      expect(derived.error).toBe(testError);

      const trackSpy = vi.spyOn(usageTelemetryService, 'track').mockReturnValue(true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const onReset = vi.fn();
      const eb = new ErrorBoundary({
        children: 'Child',
        componentName: 'WorkPlanForm',
        onReset
      });

      eb.componentDidCatch(testError, { componentStack: 'stack trace' });
      expect(trackSpy).toHaveBeenCalledWith(
        'client_js_error',
        expect.objectContaining({
          componentName: 'WorkPlanForm'
        })
      );

      // Verify reset handler
      eb.handleReset();
      expect(eb.state.hasError).toBe(false);
      expect(eb.state.error).toBeNull();
      expect(onReset).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('renders fallback UI element when hasError is true', () => {
      const eb = new ErrorBoundary({ children: 'Child' });
      eb.state = { hasError: true, error: new Error('QuotaExceededError: LocalStorage full') };

      const fallback = eb.render() as React.ReactElement;
      const html = renderToStaticMarkup(fallback);
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('אירעה שגיאה בלתי צפויה בתצוגת הרכיב');
      expect(html).toContain('זוהתה מגבלת אחסון מקומי בדפדפן');
    });
  });

  describe('SessionEvictedModal.tsx', () => {
    it('returns modal element with newIp details and rtl direction', () => {
      const props: SessionEvictedModalProps = {
        evictionInfo: { newIp: '192.168.1.100', evictedAt: new Date().toISOString() },
        onAcknowledge: vi.fn()
      };

      const html = renderToStaticMarkup(<SessionEvictedModal {...props} />);
      expect(html).toContain('modal-overlay');
      expect(html).toContain('direction:rtl');
      expect(html).toContain('192.168.1.100');
      expect(html).toContain('החיבור למערכת נותק');
      expect(html).toContain('הבנתי, התנתק עכשיו');
    });
  });

  describe('TakeoverModal.tsx', () => {
    it('returns modal element with takeover choices and formatted time', () => {
      const props: TakeoverModalProps = {
        existingSession: {
          ipAddress: '10.0.0.1',
          lastActiveIso: new Date().toISOString()
        },
        onConfirmTakeover: vi.fn(),
        onCancel: vi.fn(),
        loading: false
      };

      const html = renderToStaticMarkup(<TakeoverModal {...props} />);
      expect(html).toContain('modal-overlay');
      expect(html).toContain('direction:rtl');
      expect(html).toContain('10.0.0.1');
      expect(html).toContain('החשבון מחובר כעת במכשיר אחר');
      expect(html).toContain('נתק מכשיר קודם והתחבר כאן');
      expect(html).toContain('ביטול וחזרה');
    });
  });

  describe('pedagogicalGuideData.ts', () => {
    it('exports 7 categories and 15 complete pedagogical guide chapters', () => {
      expect(GUIDE_CATEGORIES.length).toBe(7);
      expect(PEDAGOGICAL_GUIDE_CHAPTERS.length).toBe(15);

      PEDAGOGICAL_GUIDE_CHAPTERS.forEach((ch, idx) => {
        expect(ch.id).toBe(idx + 1);
        expect(ch.title).toBeTruthy();
        expect(ch.content.length).toBeGreaterThanOrEqual(1);
        ch.content.forEach((sec) => {
          expect(sec.heading).toBeTruthy();
          expect(sec.text).toBeTruthy();
        });
      });
    });
  });
});
