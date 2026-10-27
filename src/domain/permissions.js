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

/**
 * Resolves the effective group/Matya string of a user, checking allowedUsers if needed.
 */
export function getUserGroup(userObj, allowedUsers = []) {
  if (!userObj) return '';
  const directGroup = String(userObj.group || '').trim();
  if (directGroup) return directGroup;
  const userEmail = normalizeEmail(userObj.email);
  if (!userEmail || !Array.isArray(allowedUsers)) return '';
  const record = allowedUsers.find((u) => normalizeEmail(u.email) === userEmail);
  return String(record?.group || '').trim();
}

/**
 * Returns the list of colleagues that currentUser is permitted to share students with.
 * Security boundary: Users MUST share a non-empty group/Matya.
 * If currentUser does not belong to any group, returns an empty list (zero-trust tenant isolation).
 */
export function getShareableColleagues(currentUser, allowedUsers = []) {
  if (!currentUser || !currentUser.email || !Array.isArray(allowedUsers)) return [];
  const myEmail = normalizeEmail(currentUser.email);
  const myGroup = getUserGroup(currentUser, allowedUsers).toLowerCase();

  // If user has no group/Matya assigned, zero colleagues can be shared with
  if (!myGroup) return [];

  return allowedUsers.filter((u) => {
    if (!u || u.active === false) return false;
    const uEmail = normalizeEmail(u.email);
    if (!uEmail || uEmail === myEmail) return false;
    const uGroup = String(u.group || '').trim().toLowerCase();
    return uGroup === myGroup;
  });
}

/**
 * Validates whether currentUser is permitted to share a student with targetColleagueEmail.
 * Returns true ONLY if targetColleague belongs to the same non-empty group as currentUser.
 */
export function canShareWithColleague(currentUser, targetColleagueEmail, allowedUsers = []) {
  const cleanTarget = normalizeEmail(targetColleagueEmail);
  if (!cleanTarget) return false;
  const shareable = getShareableColleagues(currentUser, allowedUsers);
  return shareable.some((u) => normalizeEmail(u.email) === cleanTarget);
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
