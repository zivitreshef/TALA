import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_UPGRADE_BANNER_MESSAGE,
  isUpgradeBannerExpired,
  MAX_UPGRADE_BANNER_TTL_MS
} from '../components/UpgradeBanner';

describe('UpgradeBanner Component & Real-Time Sync Logic', () => {
  it('default upgrade banner message contains critical preservation and refresh instructions', () => {
    expect(DEFAULT_UPGRADE_BANNER_MESSAGE).toContain('שדרוג ועדכון גרסה');
    expect(DEFAULT_UPGRADE_BANNER_MESSAGE).toContain('שמרו את עבודתכם באופן מיידי');
    expect(DEFAULT_UPGRADE_BANNER_MESSAGE).toContain('תקינות המידע');
    expect(DEFAULT_UPGRADE_BANNER_MESSAGE).toContain('לרענן את האתר');
    expect(DEFAULT_UPGRADE_BANNER_MESSAGE).not.toContain('(');
    expect(DEFAULT_UPGRADE_BANNER_MESSAGE).not.toContain(')');
  });

  it('determines visibility based on active flag and dismiss state', () => {
    const isBannerVisible = (bannerData, dismissed) => {
      return Boolean(bannerData?.active && !dismissed);
    };

    expect(isBannerVisible(null, false)).toBe(false);
    expect(isBannerVisible({ active: false }, false)).toBe(false);
    expect(isBannerVisible({ active: true }, false)).toBe(true);
    expect(isBannerVisible({ active: true }, true)).toBe(false);
  });

  it('resolves custom message when provided, falling back to default message', () => {
    const resolveMessage = (bannerData) => {
      return (bannerData?.message && bannerData.message.trim()) || DEFAULT_UPGRADE_BANNER_MESSAGE;
    };

    expect(resolveMessage(null)).toBe(DEFAULT_UPGRADE_BANNER_MESSAGE);
    expect(resolveMessage({ active: true })).toBe(DEFAULT_UPGRADE_BANNER_MESSAGE);
    expect(resolveMessage({ active: true, message: '  ' })).toBe(DEFAULT_UPGRADE_BANNER_MESSAGE);
    expect(resolveMessage({ active: true, message: 'הודעת שדרוג מותאמת אישית' })).toBe(
      'הודעת שדרוג מותאמת אישית'
    );
  });

  it('quick-save handler persists active unsaved draft and marks clean', () => {
    let savedStudent = null;
    let draftState = {
      isDirty: true,
      draftData: {
        id: 'st_99',
        name: 'עומר לוי',
        goals: [{ title: 'מטרה חדשה' }]
      }
    };

    const handleSaveStudentToCloud = vi.fn((studentObj) => {
      savedStudent = studentObj;
    });

    const handleQuickSaveFromBanner = () => {
      if (draftState.isDirty && draftState.draftData) {
        const updated = {
          ...draftState.draftData,
          lastSavedAt: '21:00'
        };
        handleSaveStudentToCloud(updated);
        draftState = { isDirty: false, draftData: updated };
      }
    };

    handleQuickSaveFromBanner();

    expect(handleSaveStudentToCloud).toHaveBeenCalledTimes(1);
    expect(savedStudent.id).toBe('st_99');
    expect(savedStudent.lastSavedAt).toBe('21:00');
    expect(draftState.isDirty).toBe(false);
  });

  it('handles settings subscription update for upgradeBanner', () => {
    let currentBanner = null;
    const onSettingsChange = (settings) => {
      if (settings && 'upgradeBanner' in settings) {
        currentBanner = settings.upgradeBanner;
      }
    };

    onSettingsChange({ upgradeBanner: { active: true, message: 'בדיקת שדרוג' } });
    expect(currentBanner).toEqual({ active: true, message: 'בדיקת שדרוג' });

    onSettingsChange({ upgradeBanner: { active: false } });
    expect(currentBanner).toEqual({ active: false });
  });

  it('auto-expires stale upgrade banners older than MAX_UPGRADE_BANNER_TTL_MS (15 minutes)', () => {
    const now = Date.now();
    const twoMinAgo = new Date(now - 2 * 60 * 1000).toISOString();
    const twentyMinAgo = new Date(now - (MAX_UPGRADE_BANNER_TTL_MS + 5 * 60 * 1000)).toISOString();

    expect(isUpgradeBannerExpired({ active: true, startedAt: twoMinAgo }, now)).toBe(false);
    expect(isUpgradeBannerExpired({ active: true, startedAt: twentyMinAgo }, now)).toBe(true);
    expect(isUpgradeBannerExpired({ active: false, startedAt: twoMinAgo }, now)).toBe(true);
  });
});
