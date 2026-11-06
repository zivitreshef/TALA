import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  isNewerVersion,
  fetchLatestVersion,
  DEFAULT_CHECK_INTERVAL_MS,
  DEFAULT_VISIBILITY_THROTTLE_MS
} from '../services/versionChecker';
import GoalBankPage from '../components/GoalBankPage';
import { reloadApplication } from '../services/appRefresh';
import NewVersionBanner from '../components/NewVersionBanner';

describe('Version Checker, Notification Banner & Application Reload Protocol', () => {
  describe('isNewerVersion semantic comparison', () => {
    it('correctly identifies newer patch versions', () => {
      expect(isNewerVersion('2.6.5', '2.6.4')).toBe(true);
      expect(isNewerVersion('2.6.11', '2.6.4')).toBe(true);
      expect(isNewerVersion('2.6.4', '2.6.4')).toBe(false);
      expect(isNewerVersion('2.6.3', '2.6.4')).toBe(false);
    });

    it('correctly identifies newer minor and major versions', () => {
      expect(isNewerVersion('2.7.0', '2.6.3')).toBe(true);
      expect(isNewerVersion('3.0.0', '2.6.3')).toBe(true);
      expect(isNewerVersion('1.9.9', '2.6.3')).toBe(false);
    });

    it('handles extra segment lengths and sub-patches', () => {
      expect(isNewerVersion('2.6.3.1', '2.6.3')).toBe(true);
      expect(isNewerVersion('2.6.3', '2.6.3.1')).toBe(false);
    });

    it('gracefully returns false for missing, empty, or invalid versions', () => {
      expect(isNewerVersion(null, '2.6.3')).toBe(false);
      expect(isNewerVersion(undefined, '2.6.3')).toBe(false);
      expect(isNewerVersion('', '2.6.3')).toBe(false);
      expect(isNewerVersion('invalid', '2.6.3')).toBe(false);
      expect(isNewerVersion('2.6.3', '')).toBe(false);
    });
  });

  describe('fetchLatestVersion network fetcher', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('fetches version.json with cache-busting headers and parses json', async () => {
      const mockManifest = { version: '2.6.4', builtAt: '2026-11-03T11:00:00Z' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockManifest
      } as any);

      const result = await fetchLatestVersion('./version.json');
      expect(result).toEqual(mockManifest);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = (global.fetch as any).mock.calls[0][0];
      const calledOptions = (global.fetch as any).mock.calls[0][1];
      expect(calledUrl).toContain('./version.json?_t=');
      expect(calledOptions.cache).toBe('no-store');
      expect(calledOptions.headers.Accept).toBe('application/json');
    });

    it('returns null on 404 or server error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      } as any);

      const result = await fetchLatestVersion('./version.json');
      expect(result).toBeNull();
    });

    it('returns null safely when network fails or throws an exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const result = await fetchLatestVersion('./version.json');
      expect(result).toBeNull();
    });

    it('returns null if response json has no valid version string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ someOtherProp: true })
      } as any);

      const result = await fetchLatestVersion('./version.json');
      expect(result).toBeNull();
    });
  });

  describe('reloadApplication execution', () => {
    let mockReplace: any;
    let mockReload: any;

    beforeEach(() => {
      mockReplace = vi.fn();
      mockReload = vi.fn();

      vi.stubGlobal('window', {
        location: {
          pathname: '/TALA/',
          replace: mockReplace,
          reload: mockReload
        }
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('replaces location with pathname to force a fresh bundle load', () => {
      reloadApplication();
      expect(mockReplace).toHaveBeenCalledWith('/TALA/');
    });

    it('falls back to reload if replace throws an error', () => {
      mockReplace.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      reloadApplication();
      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('attempts to update service worker registrations if supported', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      const mockGetRegistrations = vi.fn().mockResolvedValue([{ update: mockUpdate }]);

      vi.stubGlobal('navigator', {
        serviceWorker: {
          getRegistrations: mockGetRegistrations
        }
      });

      reloadApplication();
      expect(mockGetRegistrations).toHaveBeenCalled();
    });

    it('handles headless / non-window environments gracefully without error', () => {
      vi.unstubAllGlobals();
      expect(() => reloadApplication()).not.toThrow();
    });
  });

  describe('NewVersionBanner UI Component', () => {
    it('returns empty HTML when hasUpdate is false', () => {
      const html = renderToStaticMarkup(
        <NewVersionBanner latestVersion="2.6.4" hasUpdate={false} />
      );
      expect(html).toBe('');
    });

    it('returns empty HTML when dismissed is true', () => {
      const html = renderToStaticMarkup(
        <NewVersionBanner latestVersion="2.6.4" hasUpdate={true} dismissed={true} />
      );
      expect(html).toBe('');
    });

    it('returns empty HTML when latestVersion is null or missing', () => {
      const html = renderToStaticMarkup(
        <NewVersionBanner latestVersion={null} hasUpdate={true} />
      );
      expect(html).toBe('');
    });

    it('renders banner with version announcement in RTL and proper classes', () => {
      const html = renderToStaticMarkup(
        <NewVersionBanner latestVersion="2.6.4" hasUpdate={true} isDirty={false} />
      );

      expect(html).toContain('tala-new-version-banner');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('role="status"');
      expect(html).toContain('גרסה חדשה של טל״א זמינה (2.6.4)!');
      expect(html).toContain('הגרסה העדכנית כוללת שיפורים ותיקונים');
      expect(html).toContain('btn-version-refresh');
      expect(html).toContain('btn-version-dismiss');
      expect(html).not.toContain('שימו לב: מומלץ לשמור את השינויים');
    });

    it('shows unsaved work hint when isDirty is true', () => {
      const html = renderToStaticMarkup(
        <NewVersionBanner latestVersion="2.6.4" hasUpdate={true} isDirty={true} />
      );

      expect(html).toContain('שימו לב: מומלץ לשמור את השינויים לפני הרענון');
    });

    it('attaches and triggers onRefresh and onDismiss callbacks', () => {
      const onRefresh = vi.fn();
      const onDismiss = vi.fn();

      const element = NewVersionBanner({
        latestVersion: '2.6.4',
        hasUpdate: true,
        onRefresh,
        onDismiss
      });

      expect(element).not.toBeNull();
      // Inspect element structure for event handlers
      const actionsDiv = element?.props.children.props.children[1];
      const refreshBtn = actionsDiv.props.children[0];
      const dismissBtn = actionsDiv.props.children[1];

      refreshBtn.props.onClick();
      expect(onRefresh).toHaveBeenCalledTimes(1);

      dismissBtn.props.onClick();
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(DEFAULT_CHECK_INTERVAL_MS).toBe(60 * 1000);
      expect(DEFAULT_VISIBILITY_THROTTLE_MS).toBe(15 * 1000);
      const bankHtml = renderToStaticMarkup(
        <GoalBankPage
          goalBank={[{ id: 'g1', title: 'מטרה לדוגמה', environment: 'מפגש בגן', stages: ['kindergarten'], usageCount: 3 }]}
          currentUser={{ email: 'teacher@tala.org', role: 'user' }}
          userStudents={[{ id: 's1', name: 'דניאל', gender: 'boy', goals: [] }]}
          targetBankStudentId="s1"
        />
      );
      expect(bankHtml).toContain('מאגר מטרות ויעדים אקולוגי חכם');
    });
  });
});
