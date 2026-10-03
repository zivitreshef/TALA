export const PRIMARY_ADMIN_EMAIL = 'zivit.reshef@gmail.com';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function getStudentOwnerEmail(studentObj) {
  if (!studentObj) return '';
  return normalizeEmail(studentObj.ownerEmail || PRIMARY_ADMIN_EMAIL);
}

export function isStudentOwnedByUser(studentObj, userObj) {
  if (!studentObj || !userObj || !userObj.email) return false;
  return getStudentOwnerEmail(studentObj) === normalizeEmail(userObj.email);
}

export function isStudentSharedWithUser(studentObj, userObj) {
  if (!studentObj || !userObj || !userObj.email) return false;
  const targetEmail = normalizeEmail(userObj.email);
  if (!targetEmail || isStudentOwnedByUser(studentObj, userObj)) return false;
  return (
    Array.isArray(studentObj.sharedWith) &&
    studentObj.sharedWith.some((em) => normalizeEmail(em) === targetEmail)
  );
}

export function canViewStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj) || isStudentSharedWithUser(studentObj, userObj);
}

export function canEditStudent(studentObj, userObj) {
  return canViewStudent(studentObj, userObj);
}

export function canDeleteStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj);
}

export function canArchiveStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj);
}

export function canRestoreStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj);
}

export function canShareStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj);
}

export function getStudentsForUser(allStudents, userObj) {
  if (!userObj || !userObj.email) return [];
  return (allStudents || []).filter((s) => canViewStudent(s, userObj) && !s.archived);
}

export function getArchivedStudentsForUser(allStudents, userObj) {
  if (!userObj || !userObj.email) return [];
  return (allStudents || []).filter((s) => canViewStudent(s, userObj) && Boolean(s.archived));
}
