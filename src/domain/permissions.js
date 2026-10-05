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

export function canLockReport(studentObj, userObj) {
  if (!studentObj || !userObj || !userObj.email) return false;
  if (!studentObj.ownerEmail) return true;
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

export function getUnreadSharedReportsForUser(
  allStudents,
  userObj,
  localDismissedIds = []
) {
  if (!userObj || !userObj.email) return [];
  if (userObj.notifyOnSharedReport === false) return [];
  const targetEmail = normalizeEmail(userObj.email);
  const dismissedSet = new Set([
    ...(Array.isArray(userObj.dismissedSharedReportIds)
      ? userObj.dismissedSharedReportIds
      : []),
    ...(Array.isArray(localDismissedIds) ? localDismissedIds : [])
  ]);

  return (allStudents || []).filter((s) => {
    if (!s || s.archived) return false;
    if (!isStudentSharedWithUser(s, userObj)) return false;
    if (dismissedSet.has(s.id)) return false;
    const readByList = Array.isArray(s.sharedReadBy) ? s.sharedReadBy : [];
    const alreadyRead = readByList.some((em) => normalizeEmail(em) === targetEmail);
    return !alreadyRead;
  });
}

export function markSharedReportAsRead(studentObj, userEmail) {
  if (!studentObj || !userEmail) return studentObj;
  const cleanEmail = normalizeEmail(userEmail);
  const existingReadBy = Array.isArray(studentObj.sharedReadBy)
    ? studentObj.sharedReadBy.map((em) => normalizeEmail(em)).filter(Boolean)
    : [];
  if (existingReadBy.includes(cleanEmail)) return studentObj;
  return {
    ...studentObj,
    sharedReadBy: [...existingReadBy, cleanEmail]
  };
}

