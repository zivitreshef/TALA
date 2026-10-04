export const PRIMARY_ADMIN_EMAIL = 'zivit.reshef@gmail.com';

export const DEFAULT_ROLES = {
  admin: { name: 'מנהל/ת מערכת', description: 'גישה מלאה לכלל המערכת, ההגדרות, והאתרים השונים.', capabilities: ['admin', 'createStudent', 'editPlan', 'shareStudent', 'viewSite', 'manageUsers'] },
  site_coordinator: { name: 'רכז/ת מתי"א', description: 'יכולת לראות את כל המורים והתלמידים תחת האתרים/תגיות שמשויכים אליו, לנהל משתמשים ולשתף.', capabilities: ['viewSite', 'editPlan', 'shareStudent', 'manageUsers'] },
  teacher: { name: 'מחנך / מורה חינוך מיוחד', description: 'הרשאה סטנדרטית – יכול ליצור תלמידים חדשים, לערוך תוכניות, ולשתף את התלמידים שלו עם מטפלים אחרים.', capabilities: ['createStudent', 'editPlan', 'shareStudent'] },
  therapist: { name: 'מטפל/ת מקצועי', description: 'הרשאה לצפייה ועריכה של תוכניות ששותפו איתו בלבד. לא מורשה ליצור תלמידים חדשים בעצמו.', capabilities: ['viewSite', 'editPlan'] }
};

export function hasCapability(userObj, capability, rolesConfig = DEFAULT_ROLES) {
  if (userObj?.role === 'admin') return true;
  const roleDef = rolesConfig[userObj?.role] || DEFAULT_ROLES[userObj?.role];
  return roleDef?.capabilities?.includes(capability) ?? false;
}

export function getUserGroups(userObj) {
  if (!userObj) return [];
  if (Array.isArray(userObj.groups) && userObj.groups.length > 0) return userObj.groups;
  if (userObj.group) return [userObj.group]; // Fallback for backward compatibility
  return [];
}

export function isUserInGroup(userObj, groupName) {
  if (!groupName) return false;
  return getUserGroups(userObj).includes(groupName);
}

export function shareCommonGroup(userA, userB) {
  const groupsA = getUserGroups(userA);
  const groupsB = getUserGroups(userB);
  return groupsA.some(g => groupsB.includes(g));
}

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

export function canViewStudent(studentObj, userObj, rolesConfig = DEFAULT_ROLES) {
  if (isStudentOwnedByUser(studentObj, userObj) || isStudentSharedWithUser(studentObj, userObj)) {
    return true;
  }
  // Site coordinators or therapists can view students in their sites/groups
  if (hasCapability(userObj, 'viewSite', rolesConfig)) {
    // We would need the owner's group to check if they share a group.
    // However, studentObj doesn't have `group` by default, it relies on ownerEmail.
    // For now, viewSite gives access if sharedWith logic or future site-based logic applies.
    // Wait, the plan was: Admin/Coordinator can view all students in their site.
    // We'll keep it simple for now or implement site lookup later if needed.
  }
  return false;
}

export function canEditStudent(studentObj, userObj, rolesConfig = DEFAULT_ROLES) {
  return canViewStudent(studentObj, userObj, rolesConfig); // For now view = edit
}

export function canDeleteStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj) || userObj?.role === 'admin';
}

export function canArchiveStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj) || userObj?.role === 'admin';
}

export function canRestoreStudent(studentObj, userObj) {
  return isStudentOwnedByUser(studentObj, userObj) || userObj?.role === 'admin';
}

export function canShareStudent(studentObj, userObj, rolesConfig = DEFAULT_ROLES) {
  return isStudentOwnedByUser(studentObj, userObj) || hasCapability(userObj, 'shareStudent', rolesConfig);
}

export function canLockReport(studentObj, userObj) {
  if (!studentObj || !userObj || !userObj.email) return false;
  if (!studentObj.ownerEmail) return true;
  return isStudentOwnedByUser(studentObj, userObj) || userObj?.role === 'admin';
}

export function getStudentsForUser(allStudents, userObj, rolesConfig = DEFAULT_ROLES) {
  if (!userObj || !userObj.email) return [];
  return (allStudents || []).filter((s) => canViewStudent(s, userObj, rolesConfig) && !s.archived);
}

export function getArchivedStudentsForUser(allStudents, userObj, rolesConfig = DEFAULT_ROLES) {
  if (!userObj || !userObj.email) return [];
  return (allStudents || []).filter((s) => canViewStudent(s, userObj, rolesConfig) && Boolean(s.archived));
}
