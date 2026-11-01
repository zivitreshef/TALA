import { describe, it, expect } from 'vitest';
import {
  KINDERGARTEN_ENVIRONMENTS,
  SCHOOL_ENVIRONMENTS,
  SCHOOL_ALLOWED_ENVIRONMENTS
} from '../domain/stageEnvironments';
import {
  buildAdminBankGoalPayload,
  type AdminBankGoalInput
} from '../domain/goalBankAdmin';
import {
  isStudentOwnedByUser,
  isStudentSharedWithUser,
  canViewStudent,
  canDeleteStudent,
  getUserGroup,
  getShareableColleagues,
  canShareWithColleague,
  markTeamMessagesAsRead,
  markSharedReportAsRead,
  type StudentPermissionEntity,
  type UserPermissionEntity
} from '../domain/permissions';

describe('TypeScript Phase 2 Batch 1: Domain Models & Permissions', () => {
  describe('stageEnvironments.ts', () => {
    it('exports readonly canonical kindergarten and school environments', () => {
      expect(KINDERGARTEN_ENVIRONMENTS.length).toBeGreaterThan(0);
      expect(SCHOOL_ENVIRONMENTS.length).toBeGreaterThan(0);
      expect(SCHOOL_ALLOWED_ENVIRONMENTS).toContain(SCHOOL_ENVIRONMENTS[0]);
    });
  });

  describe('goalBankAdmin.ts', () => {
    it('normalizes goal payloads with clean defaults when input is empty or null', () => {
      const payload = buildAdminBankGoalPayload(null);
      expect(payload.title).toBe('');
      expect(payload.stages).toEqual(['kindergarten']);
      expect(payload.environment).toBe(KINDERGARTEN_ENVIRONMENTS[0]);
    });

    it('preserves valid custom stage and environment inputs', () => {
      const input: AdminBankGoalInput = {
        title: ' חיזוק מיומנויות למידה ',
        stages: ['school'],
        environment: 'כתיבה',
        usageCount: 5
      };
      const payload = buildAdminBankGoalPayload(input);
      expect(payload.title).toBe('חיזוק מיומנויות למידה');
      expect(payload.stages).toEqual(['school']);
      expect(payload.environment).toBe('כתיבה');
      expect(payload.usageCount).toBe(5);
    });
  });

  describe('permissions.ts', () => {
    const ownerUser: UserPermissionEntity = { email: 'teacher1@school.org', group: 'matya-north' };
    const colleagueSameGroup: UserPermissionEntity = { email: 'teacher2@school.org', group: 'matya-north' };
    const colleagueOtherGroup: UserPermissionEntity = { email: 'teacher3@other.org', group: 'matya-south' };

    const student: StudentPermissionEntity = {
      id: 'student-100',
      ownerEmail: 'teacher1@school.org',
      sharedWith: ['teacher2@school.org'],
      teamMessages: [
        { id: 'm1', authorEmail: 'teacher2@school.org', readBy: [] }
      ]
    };

    it('enforces ownership and view permissions strictly', () => {
      expect(isStudentOwnedByUser(student, ownerUser)).toBe(true);
      expect(isStudentOwnedByUser(student, colleagueSameGroup)).toBe(false);
      expect(isStudentSharedWithUser(student, colleagueSameGroup)).toBe(true);
      expect(canViewStudent(student, colleagueSameGroup)).toBe(true);
      expect(canDeleteStudent(student, colleagueSameGroup)).toBe(false);
    });

    it('enforces zero-trust Matya tenant isolation when sharing colleagues', () => {
      const allowedUsers = [ownerUser, colleagueSameGroup, colleagueOtherGroup];
      const shareable = getShareableColleagues(ownerUser, allowedUsers);
      expect(shareable.map((u) => u.email)).toContain('teacher2@school.org');
      expect(shareable.map((u) => u.email)).not.toContain('teacher3@other.org');

      expect(canShareWithColleague(ownerUser, 'teacher2@school.org', allowedUsers)).toBe(true);
      expect(canShareWithColleague(ownerUser, 'teacher3@other.org', allowedUsers)).toBe(false);
    });

    it('marks team messages and shared reports as read immutably', () => {
      const updated = markTeamMessagesAsRead(student, 'teacher1@school.org');
      expect(updated?.teamMessages?.[0].readBy).toContain('teacher1@school.org');

      const readReport = markSharedReportAsRead(student, 'teacher2@school.org');
      expect(readReport?.sharedReadBy).toContain('teacher2@school.org');
    });

    it('returns empty group when user is not present or group is blank', () => {
      expect(getUserGroup(null)).toBe('');
      expect(getUserGroup({ email: 'unknown@test.com' }, [])).toBe('');
    });
  });
});
