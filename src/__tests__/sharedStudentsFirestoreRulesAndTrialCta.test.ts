import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isStudentSharedWithUser, canViewStudent } from '../domain/permissions';

describe('Firestore Rules & Shared Students Permissions (v3.0.77)', () => {
  it('verifies firestore.rules properly authorizes array-contains query for shared teachers', () => {
    const rulesPath = path.resolve(__dirname, '../../firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Must define allow get and allow list for tala_students
    expect(rulesContent).toContain('match /tala_students/{studentId}');
    expect(rulesContent).toContain('allow get: if isOwnerOfResource(resource.data) || isSharedOnResource(resource.data);');
    expect(rulesContent).toContain('allow list: if isAdmin() || (isSignedIn() && (');
    expect(rulesContent).toContain('request.auth.token.email in resource.data.sharedWith');

    // isSharedOnResource must support token email directly without blocking 'is list' assertions
    expect(rulesContent).toContain('request.auth.token.email in data.sharedWith');
    expect(rulesContent).not.toContain('data.sharedWith is list &&\n        currentEmail() in data.sharedWith');
  });

  it('guarantees safe isAdmin token check in firestore.rules', () => {
    const rulesPath = path.resolve(__dirname, '../../firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    expect(rulesContent).toContain("'isAdmin' in request.auth.token && request.auth.token.isAdmin == true");
  });

  it('correctly resolves view permissions for shared students in domain layer', () => {
    const student = {
      id: 'st_123',
      name: 'תלמיד משותף',
      ownerEmail: 'zivit.reshef@gmail.com',
      sharedWith: ['ellazvigi121212@gmail.com']
    };

    const ellaUser = {
      email: 'ellazvigi121212@gmail.com',
      role: 'teacher' as const
    };

    const strangerUser = {
      email: 'other@school.org',
      role: 'teacher' as const
    };

    expect(isStudentSharedWithUser(student, ellaUser)).toBe(true);
    expect(canViewStudent(student, ellaUser)).toBe(true);

    expect(isStudentSharedWithUser(student, strangerUser)).toBe(false);
    expect(canViewStudent(student, strangerUser)).toBe(false);
  });

  it('verifies trial upgrade button copy in App.tsx avoids misleading full subscriber text', () => {
    const appPath = path.resolve(__dirname, '../App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    expect(appContent).toContain('<span>הסדרת מנוי</span>');
    expect(appContent).not.toContain('<span>מנוי שנתי</span>');
  });
});
