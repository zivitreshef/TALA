export const PRIMARY_ADMIN_EMAIL = 'zivit.reshef@gmail.com';

export interface UserPermissionEntity {
  name?: string;
  role?: string;
  title?: string;
  email?: string;
  group?: string;
  active?: boolean;
  notifyOnSharedReport?: boolean;
  dismissedSharedReportIds?: string[];
  [key: string]: unknown;
}

export interface TeamMessageEntity {
  id?: string;
  authorEmail?: string;
  isDeleted?: boolean;
  readBy?: string[];
  text?: string;
  timestamp?: number;
}

export interface StudentPermissionEntity {
  id?: string;
  ownerEmail?: string;
  sharedWith?: string[];
  sharedReadBy?: string[];
  archived?: boolean;
  teamMessages?: TeamMessageEntity[];
}

export function normalizeEmail(email?: unknown): string {
  return String(email || '').trim().toLowerCase();
}

export function getStudentOwnerEmail(studentObj?: StudentPermissionEntity | null): string {
  if (!studentObj) return '';
  return normalizeEmail(studentObj.ownerEmail || PRIMARY_ADMIN_EMAIL);
}

export function isStudentOwnedByUser(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  if (!studentObj || !userObj || !userObj.email) return false;
  return getStudentOwnerEmail(studentObj) === normalizeEmail(userObj.email);
}

export function isStudentSharedWithUser(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  if (!studentObj || !userObj || !userObj.email) return false;
  const targetEmail = normalizeEmail(userObj.email);
  if (!targetEmail || isStudentOwnedByUser(studentObj, userObj)) return false;
  return (
    Array.isArray(studentObj.sharedWith) &&
    studentObj.sharedWith.some((em) => normalizeEmail(em) === targetEmail)
  );
}

export function canViewStudent(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  return isStudentOwnedByUser(studentObj, userObj) || isStudentSharedWithUser(studentObj, userObj);
}

export function canEditStudent(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  return canViewStudent(studentObj, userObj);
}

export function canDeleteStudent(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  return isStudentOwnedByUser(studentObj, userObj);
}

export function canArchiveStudent(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  return isStudentOwnedByUser(studentObj, userObj);
}

export function canRestoreStudent(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  return isStudentOwnedByUser(studentObj, userObj);
}

export function canShareStudent(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  return isStudentOwnedByUser(studentObj, userObj);
}

/**
 * Resolves the effective group/Matya string of a user, checking allowedUsers if needed.
 */
export function getUserGroup(
  userObj?: UserPermissionEntity | null,
  allowedUsers: UserPermissionEntity[] = []
): string {
  if (!userObj) return '';
  const userEmail = normalizeEmail(userObj.email);
  if (userEmail && Array.isArray(allowedUsers) && allowedUsers.length > 0) {
    const record = allowedUsers.find((u) => normalizeEmail(u.email) === userEmail);
    if (record && record.group !== undefined) return String(record.group || '').trim();
  }
  return String(userObj.group || '').trim();
}

/**
 * Returns the list of colleagues that currentUser is permitted to share students with.
 * Security boundary: Users MUST share a non-empty group/Matya.
 * If currentUser does not belong to any group, returns an empty list (zero-trust tenant isolation).
 */
export function getShareableColleagues(
  currentUser?: UserPermissionEntity | null,
  allowedUsers: UserPermissionEntity[] = []
): UserPermissionEntity[] {
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
export function canShareWithColleague(
  currentUser?: UserPermissionEntity | null,
  targetColleagueEmail?: string,
  allowedUsers: UserPermissionEntity[] = []
): boolean {
  const cleanTarget = normalizeEmail(targetColleagueEmail);
  if (!cleanTarget) return false;
  const shareable = getShareableColleagues(currentUser, allowedUsers);
  return shareable.some((u) => normalizeEmail(u.email) === cleanTarget);
}

export function canLockReport(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  if (!studentObj || !userObj || !userObj.email) return false;
  if (!studentObj.ownerEmail) return true;
  return isStudentOwnedByUser(studentObj, userObj);
}

export function isStudentPlanShared(
  studentObj?: StudentPermissionEntity | null,
  userObj?: UserPermissionEntity | null
): boolean {
  if (!studentObj) return false;
  const hasCollaborators = Array.isArray(studentObj.sharedWith) && studentObj.sharedWith.length > 0;
  const hasMessages = Array.isArray(studentObj.teamMessages) && studentObj.teamMessages.some((m) => !m.isDeleted);
  const isCollaborator = isStudentSharedWithUser(studentObj, userObj);
  const cannotLock = Boolean(userObj?.email && studentObj.ownerEmail && !canLockReport(studentObj, userObj));
  return Boolean(hasCollaborators || hasMessages || isCollaborator || cannotLock);
}

export function getStudentsForUser<T extends StudentPermissionEntity>(
  allStudents?: T[] | null,
  userObj?: UserPermissionEntity | null
): T[] {
  if (!userObj || !userObj.email) return [];
  return (allStudents || []).filter((s) => canViewStudent(s, userObj) && !s.archived);
}

export function getArchivedStudentsForUser<T extends StudentPermissionEntity>(
  allStudents?: T[] | null,
  userObj?: UserPermissionEntity | null
): T[] {
  if (!userObj || !userObj.email) return [];
  return (allStudents || []).filter((s) => canViewStudent(s, userObj) && Boolean(s.archived));
}

export function getUnreadTeamMessagesCountForUser(
  studentObj?: StudentPermissionEntity | null,
  userEmail?: string
): number {
  if (!studentObj || !userEmail) return 0;
  const cleanEmail = normalizeEmail(userEmail);
  const msgs = Array.isArray(studentObj.teamMessages) ? studentObj.teamMessages : [];
  return msgs.filter((m) => {
    if (!m || m.isDeleted) return false;
    if (normalizeEmail(m.authorEmail) === cleanEmail) return false;
    const readBy = Array.isArray(m.readBy) ? m.readBy.map((e) => normalizeEmail(e)) : [];
    return !readBy.includes(cleanEmail);
  }).length;
}

export function getUnreadSharedReportsForUser<T extends StudentPermissionEntity>(
  allStudents?: T[] | null,
  userObj?: UserPermissionEntity | null,
  localDismissedIds: string[] = []
): T[] {
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

    // 1. Alert on any unread team message for this user (alerts both owner and shared colleagues)
    if (canViewStudent(s, userObj)) {
      const unreadCount = getUnreadTeamMessagesCountForUser(s, targetEmail);
      if (unreadCount > 0) return true;
    }

    // 2. Newly shared report not yet opened or dismissed
    if (!isStudentSharedWithUser(s, userObj)) return false;
    if (s.id && dismissedSet.has(s.id)) return false;
    const readByList = Array.isArray(s.sharedReadBy) ? s.sharedReadBy : [];
    const alreadyRead = readByList.some((em) => normalizeEmail(em) === targetEmail);
    return !alreadyRead;
  });
}

export function markTeamMessagesAsRead<T extends StudentPermissionEntity>(
  studentObj?: T | null,
  userEmail?: string
): T | null | undefined {
  if (!studentObj || !userEmail) return studentObj;
  const cleanEmail = normalizeEmail(userEmail);
  const msgs = Array.isArray(studentObj.teamMessages) ? studentObj.teamMessages : [];
  let changed = false;
  const updated = msgs.map((m) => {
    if (m && !m.isDeleted) {
      const readBy = Array.isArray(m.readBy) ? m.readBy.map((e) => normalizeEmail(e)) : [];
      if (!readBy.includes(cleanEmail)) {
        changed = true;
        return { ...m, readBy: [...readBy, cleanEmail] };
      }
    }
    return m;
  });
  if (!changed) return studentObj;
  return {
    ...studentObj,
    teamMessages: updated
  };
}

export function markSharedReportAsRead<T extends StudentPermissionEntity>(
  studentObj?: T | null,
  userEmail?: string
): T | null | undefined {
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
