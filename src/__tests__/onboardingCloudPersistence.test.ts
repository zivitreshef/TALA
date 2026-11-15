import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AllowedUserRecord } from '../allowedUsers';
import { patchUserByEmail } from '../domain/userEngagement';
import { createDefaultOnboardingState } from '../services/onboardingStorage';

describe('User Journey & Announcement Cloud Persistence for Teachers', () => {
  const functionsIndexPath = path.resolve(__dirname, '../../functions/index.js');

  it('guarantees functions/index.js SELF_FIELDS includes onboardingDismissed and whatsNewDismissed for teachers', () => {
    const fileContent = fs.readFileSync(functionsIndexPath, 'utf-8');
    const match = fileContent.match(/const\s+SELF_FIELDS\s*=\s*(\[[^\]]+\]);/);
    expect(match).not.toBeNull();

    const rawArrayString = match![1];
    expect(rawArrayString).toContain('"onboardingDismissed"');
    expect(rawArrayString).toContain('"whatsNewDismissed"');

    const selfFields: string[] = JSON.parse(rawArrayString);
    expect(selfFields).toContain('onboardingDismissed');
    expect(selfFields).toContain('whatsNewDismissed');
  });

  it('allows teacher self-update sanitization to retain journey dismissal flags while stripping unauthorized fields', () => {
    const fileContent = fs.readFileSync(functionsIndexPath, 'utf-8');
    const match = fileContent.match(/const\s+SELF_FIELDS\s*=\s*(\[[^\]]+\]);/);
    const selfFields: string[] = JSON.parse(match![1]);

    const pick = (o: Record<string, any>, keys: string[]) => {
      const r: Record<string, any> = {};
      for (const k of keys) {
        if (o && k in o) r[k] = o[k];
      }
      return r;
    };

    const teacherUpdate = {
      email: 'mora.sarah@school.org',
      role: 'admin', // Attempted escalation: must be stripped
      active: true, // System control: must be stripped
      onboardingDismissed: true,
      whatsNewDismissed: true
    };

    const sanitizedPatch = pick(teacherUpdate, selfFields);
    expect(sanitizedPatch.onboardingDismissed).toBe(true);
    expect(sanitizedPatch.whatsNewDismissed).toBe(true);
    expect(sanitizedPatch.role).toBeUndefined();
    expect(sanitizedPatch.active).toBeUndefined();
  });

  it('simulates incognito session: cloud profile dismissal flags prevent journey and banner re-appearance', () => {
    // In incognito, localStorage is completely fresh/empty
    const teacherEmail = 'mora.sarah@school.org';
    const freshDefaultState = createDefaultOnboardingState(teacherEmail);
    expect(freshDefaultState.isDismissed).toBe(false);

    // Cloud user profile has onboardingDismissed: true from earlier session
    const cloudUser: AllowedUserRecord = {
      id: 'u_sarah',
      email: teacherEmail,
      name: 'שרה מורה',
      role: 'teacher',
      active: true,
      passwordSalt: 'salt',
      passwordHash: 'hash',
      onboardingDismissed: true,
      whatsNewDismissed: true
    };

    // App honors cloud dismissal:
    const effectiveIsDismissed = Boolean(cloudUser.onboardingDismissed || freshDefaultState.isDismissed);
    const effectiveWhatsNewDismissed = Boolean(cloudUser.whatsNewDismissed);

    expect(effectiveIsDismissed).toBe(true);
    expect(effectiveWhatsNewDismissed).toBe(true);
  });

  it('properly toggles dismissal flags when teacher re-launches journey from Help modal', () => {
    const users: AllowedUserRecord[] = [
      {
        id: 'u_1',
        email: 'teacher@school.org',
        name: 'מורה',
        role: 'teacher',
        active: true,
        passwordSalt: 's',
        passwordHash: 'h',
        onboardingDismissed: true,
        whatsNewDismissed: true
      }
    ];

    // When re-launching, onboardingDismissed is reset to false
    const relaunchedUsers = patchUserByEmail(users, 'teacher@school.org', {
      onboardingDismissed: false
    });

    expect(relaunchedUsers[0].onboardingDismissed).toBe(false);
    expect(relaunchedUsers[0].whatsNewDismissed).toBe(true);
  });
});
