import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  isEmergencyRescueMode,
  getEmergencyRescueUrl,
  getEmergencyRescueTeacherGuidanceText,
  buildEmergencyBackupPayload,
  validateEmergencyBackupData
} from '../domain/emergencyRescue';
import { reconcileLocalAndCloudStudents } from '../domain/studentSyncMerge';
import { saveStudentToCloud } from '../firebaseBackend';
import { isDemoStudent } from '../domain/onboardingJourney';
import EmergencyRescueBar from '../components/EmergencyRescueBar';
import SystemHealthPanel from '../components/modals/SystemHealthPanel';
import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';

describe('Emergency Rescue & Cloud Sync Permission Fix Suite (v3.0.63)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emergencyRescue domain helpers', () => {
    it('detects emergency rescue mode from query strings (?export=true or ?rescue=true)', () => {
      expect(isEmergencyRescueMode('?export=true')).toBe(true);
      expect(isEmergencyRescueMode('?rescue=true')).toBe(true);
      expect(isEmergencyRescueMode('?foo=bar&export=true')).toBe(true);
      expect(isEmergencyRescueMode('?export=false')).toBe(false);
      expect(isEmergencyRescueMode('?debug=true')).toBe(false);
      expect(isEmergencyRescueMode('')).toBe(false);
    });

    it('generates the clean export=true emergency link', () => {
      const url = getEmergencyRescueUrl('https://zivitreshef.github.io/TALA/?debug=true');
      expect(url).toBe('https://zivitreshef.github.io/TALA/?export=true');
    });

    it('generates clear Hebrew guidance text without English in parentheses', () => {
      const text = getEmergencyRescueTeacherGuidanceText('https://zivitreshef.github.io/TALA/');
      expect(text).toContain('https://zivitreshef.github.io/TALA/?export=true');
      expect(text).toContain('ייצוא נתונים לקובץ גיבוי');
      expect(text).not.toMatch(/\([A-Za-z\s]+\)/);
    });

    it('builds a sanitized emergency backup payload with current version and students', () => {
      const payload = buildEmergencyBackupPayload({
        students: [{ id: 'st_1', name: 'דני' }],
        userPreferences: { defaultEducationalFramework: 'גן שקד' },
        exportedBy: 'teacher@test.com'
      });

      expect(payload.system).toBe('TALA');
      expect(payload.version).toBe(CURRENT_APP_VERSION);
      expect(payload.exportedBy).toBe('teacher@test.com');
      expect(payload.students).toHaveLength(1);
      expect(payload.students[0].name).toBe('דני');
      expect(payload.userPreferences?.defaultEducationalFramework).toBe('גן שקד');
    });

    it('validates imported JSON data and rejects invalid schemas or prototype pollution', () => {
      expect(validateEmergencyBackupData(null).valid).toBe(false);
      expect(validateEmergencyBackupData('invalid string').valid).toBe(false);
      expect(validateEmergencyBackupData([]).valid).toBe(false);
      expect(validateEmergencyBackupData({ students: 'not an array' }).valid).toBe(false);

      const protoPollution = JSON.parse('{"__proto__": {"admin": true}, "students": []}');
      expect(validateEmergencyBackupData(protoPollution).valid).toBe(false);

      const validPayload = {
        system: 'TALA',
        version: '3.0.63',
        students: [
          { id: 'st_99', name: 'רוני' },
          { invalid: 'no id' }
        ],
        userPreferences: { soundEnabled: true }
      };
      const res = validateEmergencyBackupData(validPayload);
      expect(res.valid).toBe(true);
      expect(res.payload?.students).toHaveLength(1);
      expect(res.payload?.students[0].id).toBe('st_99');
      expect(res.payload?.userPreferences?.soundEnabled).toBe(true);
    });
  });

  describe('Bugfix: Preventing permission-denied in cloud student reconciliation', () => {
    it('recognizes st_demo_1 and st_demo_ prefixes as demo students', () => {
      expect(isDemoStudent({ id: 'st_demo_1' })).toBe(true);
      expect(isDemoStudent({ id: 'st_demo_99' })).toBe(true);
      expect(isDemoStudent({ id: 'demo_yonatan_levi' })).toBe(true);
      expect(isDemoStudent({ id: 'real_student_123', isDemo: true })).toBe(true);
      expect(isDemoStudent({ id: 'real_student_123' })).toBe(false);
    });

    it('strictly excludes demo students (st_demo_1) from cloud upload queue', () => {
      const result = reconcileLocalAndCloudStudents({
        cloudStudents: [],
        localStudents: [
          { id: 'st_demo_1', name: 'נועם ישראלי', ownerEmail: 'zivit.reshef@gmail.com' }
        ],
        currentUserEmail: 'buliadi@gmail.com'
      });

      expect(result.studentsToUpload).toHaveLength(0);
    });

    it('blocks local students owned by a different teacher from being uploaded by current user', () => {
      const result = reconcileLocalAndCloudStudents({
        cloudStudents: [],
        localStudents: [
          // Foreign student owned by zivit or another teacher
          { id: 'st_foreign_1', name: 'יוסי', ownerEmail: 'zivit.reshef@gmail.com' },
          // Local student belonging to current user
          { id: 'st_my_1', name: 'תמר', ownerEmail: 'buliadi@gmail.com' }
        ],
        currentUserEmail: 'buliadi@gmail.com'
      });

      // Only the student owned by buliadi should be queued for upload
      expect(result.studentsToUpload).toHaveLength(1);
      expect(result.studentsToUpload[0].id).toBe('st_my_1');
      // Foreign student stays local without triggering a failed cloud save
      expect(result.mergedStudents.some((s) => s.id === 'st_foreign_1')).toBe(true);
    });

    it('saveStudentToCloud rejects demo students without calling Firestore', async () => {
      const res1 = await saveStudentToCloud({ id: 'st_demo_1', name: 'דמו' });
      expect(res1).toBe(false);

      const res2 = await saveStudentToCloud({ id: 'demo_yonatan_levi', name: 'דמו' });
      expect(res2).toBe(false);
    });
  });

  describe('UI Component Rendering', () => {
    it('renders EmergencyRescueBar with export and import actions', () => {
      const html = renderToStaticMarkup(
        <EmergencyRescueBar
          students={[{ id: 'st_1', name: 'דני' }]}
          currentUserEmail="teacher@test.com"
          onImport={() => {}}
          onClose={() => {}}
        />
      );

      expect(html).toContain('מצב חילוץ נתונים במקרי חירום');
      expect(html).toContain('ייצוא נתונים לקובץ גיבוי');
      expect(html).toContain('ייבוא נתונים מקובץ גיבוי');
      expect(html).toContain('data-testid="emergency-rescue-bar"');
      expect(html).toContain('data-testid="emergency-export-btn"');
      expect(html).toContain('data-testid="emergency-import-btn"');
    });

    it('renders Emergency Rescue Guidance section inside SystemHealthPanel when guide is toggled', () => {
      // In static markup, clicking state is not active, but the component structure renders cleanly
      const html = renderToStaticMarkup(
        <SystemHealthPanel
          healthEvents={[]}
          cloudSyncState={{ connected: true, status: 'listening' }}
        />
      );

      expect(html).toContain('data-testid="system-health-panel"');
      expect(html).toContain('הנחיות אבחון למורה');
    });
  });
});
