import { describe, it, expect } from 'vitest';
import { reconcileLocalAndCloudStudents } from '../domain/studentSyncMerge';
import { aggregateTelemetryData, detectAbnormalSpikes } from '../domain/telemetry';

describe('Students Cloud Reconciliation & Telemetry Anomaly Bugfix Suite (v3.0.62)', () => {
  describe('reconcileLocalAndCloudStudents', () => {
    it('preserves local students when cloud returns fewer students and flags unsynced students for upload', () => {
      const cloudStudents = [
        { id: 'st_1', name: 'תלמיד 1', ownerEmail: 'nekosman@gmail.com' },
        { id: 'st_2', name: 'תלמיד 2', ownerEmail: 'nekosman@gmail.com' },
        { id: 'st_3', name: 'תלמיד 3', ownerEmail: 'nekosman@gmail.com' }
      ];

      const localStudents = [
        { id: 'st_1', name: 'תלמיד 1', ownerEmail: 'nekosman@gmail.com' },
        { id: 'st_2', name: 'תלמיד 2', ownerEmail: 'nekosman@gmail.com' },
        { id: 'st_3', name: 'תלמיד 3', ownerEmail: 'nekosman@gmail.com' },
        { id: 'st_4', name: 'תלמיד 4 (חדש מקומי)', ownerEmail: '' },
        { id: 'st_5', name: 'תלמיד 5 (חדש מקומי)', ownerEmail: '' },
        { id: 'st_6', name: 'תלמיד 6 (חדש מקומי)', ownerEmail: '' }
      ];

      const result = reconcileLocalAndCloudStudents({
        cloudStudents,
        localStudents,
        currentUserEmail: 'nekosman@gmail.com'
      });

      expect(result.mergedStudents).toHaveLength(6);
      expect(result.studentsToUpload).toHaveLength(3);
      expect(result.studentsToUpload.map((s) => s.id)).toEqual(['st_4', 'st_5', 'st_6']);
      result.studentsToUpload.forEach((st) => {
        expect(st.ownerEmail).toBe('nekosman@gmail.com');
      });
    });

    it('does NOT wipe local students if cloud returns empty list or fails', () => {
      const localStudents = [
        { id: 'st_1', name: 'תלמיד 1', ownerEmail: 'nekosman@gmail.com' },
        { id: 'st_2', name: 'תלמיד 2', ownerEmail: 'nekosman@gmail.com' }
      ];

      const result = reconcileLocalAndCloudStudents({
        cloudStudents: [],
        localStudents,
        currentUserEmail: 'nekosman@gmail.com'
      });

      expect(result.mergedStudents).toHaveLength(2);
      expect(result.studentsToUpload).toHaveLength(2);
      expect(result.mergedStudents.map((s) => s.id)).toEqual(['st_1', 'st_2']);
    });

    it('strictly isolates demo students and does not include them in cloud upload', () => {
      const localStudents = [
        { id: 'demo_yonatan_levi', name: 'יונתן כהן', isDemo: true },
        { id: 'st_real_1', name: 'תלמידה אמיתית', ownerEmail: '' }
      ];

      const result = reconcileLocalAndCloudStudents({
        cloudStudents: [],
        localStudents,
        currentUserEmail: 'teacher@test.com'
      });

      expect(result.mergedStudents).toHaveLength(1);
      expect(result.mergedStudents[0].id).toBe('st_real_1');
      expect(result.studentsToUpload).toHaveLength(1);
      expect(result.studentsToUpload[0].id).toBe('st_real_1');
    });

    it('normalizes legacy schoolYear to current default school year', () => {
      const cloudStudents = [
        { id: 'st_cloud_old', name: 'תלמיד ישן', schoolYear: 'תשפ"ו (2025-2026)', ownerEmail: 't@test.com' }
      ];
      const localStudents = [
        { id: 'st_local_old', name: 'תלמיד מקומי ישן', schoolYear: 'תשפ"ו (2025-2026)', ownerEmail: 't@test.com' }
      ];

      const result = reconcileLocalAndCloudStudents({
        cloudStudents,
        localStudents,
        currentUserEmail: 't@test.com',
        defaultSchoolYear: 'תשפ"ז (2026-2027)'
      });

      expect(result.mergedStudents).toHaveLength(2);
      expect(result.mergedStudents[0].schoolYear).toBe('תשפ"ז (2026-2027)');
      expect(result.mergedStudents[1].schoolYear).toBe('תשפ"ז (2026-2027)');
    });
  });

  describe('telemetry runaway teacher anomaly calculation', () => {
    it('eliminates false 154% anomaly when teacher has historical logs but 0 today', () => {
      const todayDate = new Date();
      const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 63 queries yesterday by Zivit
      const zivitYesterdayLogs = Array.from({ length: 63 }).map((_, i) => ({
        id: `zivit_${i}`,
        email: 'zivit.reshef@gmail.com',
        operation: 'rawPrompt',
        status: 'ok',
        createdAtMs: yesterdayDate.getTime()
      }));

      // 41 queries today by Nekosman
      const nekosmanTodayLogs = Array.from({ length: 41 }).map((_, i) => ({
        id: `neko_${i}`,
        email: 'nekosman@gmail.com',
        operation: 'rawPrompt',
        status: 'ok',
        createdAtMs: todayDate.getTime()
      }));

      const allLogs = [...zivitYesterdayLogs, ...nekosmanTodayLogs];
      const aggregated = aggregateTelemetryData({
        aiLogs: allLogs,
        emailLogs: [],
        students: [],
        allowedUsers: []
      });

      // aiTodayCount should strictly be 41
      expect(aggregated.aiTodayCount).toBe(41);

      const anomalyReport = detectAbnormalSpikes({
        aiTodayCount: aggregated.aiTodayCount,
        emailTodayCount: aggregated.emailTodayCount,
        storage: aggregated.storage,
        topActiveTeachers: aggregated.topActiveTeachers,
        last7Days: aggregated.last7Days
      });

      const userSpikes = anomalyReport.anomalies.filter((a) => a.type === 'user_spike');
      // Crucial: Zivit must NOT be flagged with false 154% today
      const zivitSpike = userSpikes.find((a) => a.id.includes('zivit.reshef@gmail.com'));
      expect(zivitSpike).toBeUndefined();

      // Nekosman is the one active today
      const nekosmanSpike = userSpikes.find((a) => a.id.includes('nekosman@gmail.com'));
      expect(nekosmanSpike).toBeDefined();
      expect(nekosmanSpike?.title).toContain('100%');
      expect(nekosmanSpike?.detail).toContain('41 שאילתות היום');
    });

    it('caps user percentage at 100% and does not exceed 100%', () => {
      const topActiveTeachers = [
        {
          email: 'teacher@test.com',
          aiCount: 50,
          aiTodayCount: 25,
          emailCount: 0,
          lastActiveMs: Date.now()
        }
      ];

      const report = detectAbnormalSpikes({
        aiTodayCount: 25,
        emailTodayCount: 0,
        storage: {},
        topActiveTeachers,
        last7Days: []
      });

      const spike = report.anomalies.find((a) => a.type === 'user_spike');
      expect(spike).toBeDefined();
      expect(spike?.title).toContain('100%');
    });
  });
});
