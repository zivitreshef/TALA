import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  calculateStorageFootprint,
  aggregateTelemetryData
} from '../domain/telemetry';
import AdminUsageAndSecurityDashboard from '../components/modals/AdminUsageAndSecurityDashboard';
import AdminAllowlistModal from '../components/modals/AdminAllowlistModal';
import { computeGroupStats } from '../allowedUsers';

describe('Admin Heavy Files Teacher Column & Capacity AI Usage', () => {
  it('calculateStorageFootprint resolves teacher name from allowedUsers, student, or doc metadata', () => {
    const allowedUsers = [
      { email: 'sarah@tala.edu.il', name: 'שרה כהן' },
      { email: 'michal@tala.edu.il', name: 'מיכל שליו' }
    ];

    const students = [
      {
        id: 's1',
        name: 'דניאל ישראלי',
        ownerEmail: 'sarah@tala.edu.il',
        diagnosticDocuments: [
          {
            id: 'doc1',
            fileName: 'אבחון_פסיכולוגי_מקיף.pdf',
            fileSize: 8 * 1024 * 1024,
            uploadedAt: '2026-03-01'
          }
        ]
      },
      {
        id: 's2',
        name: 'נועה לוי',
        teacherName: 'רונית לוין',
        diagnosticDocuments: [
          {
            id: 'doc2',
            fileName: 'דוח_ראיה.docx',
            fileSize: 4 * 1024 * 1024,
            uploadedAt: '2026-03-02'
          }
        ]
      },
      {
        id: 's3',
        name: 'יובל אברהם',
        ownerEmail: 'unknown@school.org',
        diagnosticDocuments: [
          {
            id: 'doc3',
            fileName: 'סיכום_ועדה.pdf',
            authorName: 'ד״ר שמעון',
            fileSize: 2 * 1024 * 1024,
            uploadedAt: '2026-03-03'
          }
        ]
      }
    ];

    const footprint = calculateStorageFootprint(students, allowedUsers);
    expect(footprint.largestFiles).toHaveLength(3);

    // doc1 matched via ownerEmail -> sarah@tala.edu.il -> שרה כהן
    const f1 = footprint.largestFiles.find((f) => f.fileName === 'אבחון_פסיכולוגי_מקיף.pdf');
    expect(f1?.teacherName).toBe('שרה כהן');
    expect(f1?.studentName).toBe('דניאל ישראלי');

    // doc2 matched via student.teacherName -> רונית לוין
    const f2 = footprint.largestFiles.find((f) => f.fileName === 'דוח_ראיה.docx');
    expect(f2?.teacherName).toBe('רונית לוין');

    // doc3 matched via doc.authorName -> ד״ר שמעון
    const f3 = footprint.largestFiles.find((f) => f.fileName === 'סיכום_ועדה.pdf');
    expect(f3?.teacherName).toBe('ד״ר שמעון');
  });

  it('renders "שם המורה" column in AdminUsageAndSecurityDashboard largest files table', () => {
    const students = [
      {
        id: 's1',
        name: 'איתמר ישראלי',
        teacherName: 'ענת גולן',
        diagnosticDocuments: [
          {
            id: 'doc1',
            fileName: 'הערכה_תפקודית.pdf',
            fileSize: 12 * 1024 * 1024,
            uploadedAt: '2026-03-01'
          }
        ]
      }
    ];

    const html = renderToStaticMarkup(
      <AdminUsageAndSecurityDashboard
        students={students}
        settings={{}}
        initialExpandedLargestFiles={true}
      />
    );

    // Table header should contain שם המורה
    expect(html).toContain('📁 קבצי אבחון כבדים ביותר באחסון');
    expect(html).toContain('שם המורה');
    expect(html).toContain('משויך לתלמיד/ה');
    expect(html).toContain('נפח קובץ');
    expect(html).toContain('תאריך העלאה');
    // Content should show the teacher name
    expect(html).toContain('ענת גולן');
    expect(html).toContain('הערכה_תפקודית.pdf');
  });

  it('aggregateTelemetryData returns userActivityByEmail and allows cross-referencing AI usage for teachers', () => {
    const aiLogs = [
      { email: 'teacher1@school.org', status: 'ok', createdAt: Date.now() },
      { email: 'teacher1@school.org', status: 'ok', createdAt: Date.now() },
      { email: 'teacher2@school.org', status: 'ok', createdAt: Date.now() }
    ];

    const agg = aggregateTelemetryData({
      aiLogs,
      emailLogs: [],
      students: [],
      now: new Date()
    });

    expect(agg.userActivityByEmail['teacher1@school.org']).toBeDefined();
    expect(agg.userActivityByEmail['teacher1@school.org'].aiCount).toBe(2);
    expect(agg.userActivityByEmail['teacher2@school.org'].aiCount).toBe(1);
  });

  it('computeGroupStats incorporates userActivityByEmail for accurate AI count', () => {
    const users = [
      { email: 't1@school.org', group: 'מתי״א תל אביב', aiUsageCount: 0 },
      { email: 't2@school.org', group: 'מתי״א תל אביב', aiUsageCount: 2 }
    ];
    const activityMap = {
      't1@school.org': { aiCount: 7 }
    };

    const stats = computeGroupStats(users, [], activityMap);
    expect(stats).toHaveLength(1);
    // t1 had 0 in record but 7 in telemetry; t2 had 2 in record and 0 in telemetry -> total 9
    expect(stats[0].aiUsageTotal).toBe(9);
  });

  it('AdminAllowlistModal capacity ranking title strictly forbids English in parentheses and renders teacher row', () => {
    const users = [
      {
        id: 'u1',
        email: 'teacher@school.org',
        name: 'שירה חדד',
        group: 'מתי״א דרום',
        aiUsageCount: 5,
        isTrialUser: false
      }
    ];

    const html = renderToStaticMarkup(
      <AdminAllowlistModal
        isOpen={true}
        onClose={() => {}}
        initialTab="analytics"
        allowedUsers={users}
        students={[]}
      />
    );

    // Strict Hebrew title rule (no parenthetical English)
    expect(html).toContain('דירוג פעילות וקיבולת לפי מורה');
    expect(html).not.toContain('(Top Capacity Users)');

    // Table headers and user row
    expect(html).toContain('שם המורה');
    expect(html).toContain('שימושי AI (מצטבר)');
    expect(html).toContain('שירה חדד');
    expect(html).toContain('מתי״א דרום');
    expect(html).toContain('5');
  });
});
