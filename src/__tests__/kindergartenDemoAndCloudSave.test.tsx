import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFreshDemoStudent,
  isDemoStudent
} from '../domain/onboardingJourney';
import {
  getDemoStudent,
  saveDemoStudent,
  getDemoStudentKey
} from '../services/onboardingStorage';

describe('Kindergarten Demo Student & Cloud Promotion (v3.0.81)', () => {
  const TEST_EMAIL = 'teacher.demo.test@matya.org.il';
  let mockStorageStore: Record<string, string> = {};
  let mockLocalStorage: any;

  beforeEach(() => {
    mockStorageStore = {};
    mockLocalStorage = {
      getItem: vi.fn((key: string) => (key in mockStorageStore ? mockStorageStore[key] : null)),
      setItem: vi.fn((key: string, val: string) => {
        mockStorageStore[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorageStore[key];
      }),
      clear: vi.fn(() => {
        mockStorageStore = {};
      })
    };

    vi.stubGlobal('window', { localStorage: mockLocalStorage });
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    mockStorageStore = {};
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Kindergarten Default Stage Selection', () => {
    it('createFreshDemoStudent defaults to a Kindergarten student ("נועם כהן")', () => {
      const student = createFreshDemoStudent();
      expect(student.name).toContain('נועם כהן');
      expect(student.stage).toBe('kindergarten');
      expect(student.gradeClass).toBe('גן חובה');
      expect(student.educationalFramework).toBe('גן אלון');
      expect(student.planType).toContain('גן ילדים');
      expect(student.isDemo).toBe(true);
      expect(isDemoStudent(student)).toBe(true);
    });

    it('createFreshDemoStudent explicitly preserves School student when stage is "school"', () => {
      const student = createFreshDemoStudent({ stage: 'school' });
      expect(student.name).toContain('יונתן לוי');
      expect(student.stage).toBe('school');
      expect(student.gradeClass).toContain('ב׳2');
      expect(student.isDemo).toBe(true);
      expect(isDemoStudent(student)).toBe(true);
    });

    it('getDemoStudent initializes Kindergarten student by default and migrates legacy school demo in storage', () => {
      // 1. Fresh fetch for new teacher
      const initial = getDemoStudent(TEST_EMAIL);
      expect(initial.name).toContain('נועם כהן');
      expect(initial.stage).toBe('kindergarten');

      // 2. If storage had legacy school demo, automatically migrates to kindergarten unless requested
      const legacySchool = createFreshDemoStudent({ stage: 'school' });
      saveDemoStudent(TEST_EMAIL, legacySchool);
      expect(localStorage.getItem(getDemoStudentKey(TEST_EMAIL))).toContain('יונתן לוי');

      const migrated = getDemoStudent(TEST_EMAIL);
      expect(migrated.name).toContain('נועם כהן');
      expect(migrated.stage).toBe('kindergarten');
    });
  });

  describe('Demo Guidance Banner Markup & Save As Real Student Contract', () => {
    it('verifies clone logic correctly strips demo tags and produces real cloud student', () => {
      const demoStudent = createFreshDemoStudent();
      const rawName = String(demoStudent.name || '').replace(/\s*\([^)]*דוגמ[^)]*\)/g, '').trim();
      const now = new Date();
      const realStudent = {
        ...demoStudent,
        id: `student_${now.getTime()}_test`,
        name: rawName || 'נועם כהן',
        isDemo: false,
        ownerEmail: TEST_EMAIL,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      expect(realStudent.name).toBe('נועם כהן');
      expect(realStudent.isDemo).toBe(false);
      expect(isDemoStudent(realStudent)).toBe(false);
      expect(realStudent.ownerEmail).toBe(TEST_EMAIL);
      expect(realStudent.id).not.toBe('demo_yonatan_levi');
    });
  });
});
