// ============================================================================
// Coworker & Educational Team Auto-Complete & One-Click Team Copy Domain Module
// Extracts unique suggestions from existing students and group colleagues,
// completely sandboxed and secure on the client side.
// ============================================================================

export const COWORKER_FIELDS = [
  'schoolName',
  'gradeClass',
  'homeroomTeacher',
  'integrationTeacher',
  'learningSupportAssistant',
  'counselorName',
  'psychologistName',
  'matyaCoordinator',
  'emotionalTherapist',
  'paraMedicalTeam',
  'additionalPartners'
];

/**
 * Builds a fast lookup map of user emails to their lowercase trimmed groups.
 */
function buildUserGroupMap(allowedUsers = []) {
  const map = new Map();
  if (Array.isArray(allowedUsers)) {
    for (const u of allowedUsers) {
      if (!u || !u.email) continue;
      map.set(String(u.email).trim().toLowerCase(), String(u.group || '').trim().toLowerCase());
    }
  }
  return map;
}

/**
 * Checks if a student falls within the authorized scope of the current user:
 * - If user has a group (e.g. מתי"א קרית שמונה): includes their own students + students from same group.
 * - If user has NO group (independent teacher or unassigned): strictly includes ONLY their own or shared students.
 */
function isStudentInUserScope(st, currentUser, userGroupMap) {
  if (!st) return false;
  const myEmail = String(currentUser?.email || '').trim().toLowerCase();
  const myGroup = String(currentUser?.group || '').trim().toLowerCase();

  // If no user context provided (e.g. standalone test), accept all
  if (!myEmail) return true;

  const owner = String(st.ownerEmail || '').trim().toLowerCase();
  const isMine =
    (owner && owner === myEmail) ||
    (Array.isArray(st.sharedWith) && st.sharedWith.some((e) => String(e).trim().toLowerCase() === myEmail));

  if (myGroup) {
    const ownerGroup = userGroupMap?.get(owner);
    const inSameGroup = Boolean(ownerGroup && ownerGroup === myGroup);
    return isMine || inSameGroup;
  }

  // Without a group, strictly limit to the user's own/shared students
  return isMine;
}

/**
 * Extracts distinct coworker and educational framework suggestions per field
 * across authorized students of the teacher, and matching colleagues from the same group.
 *
 * @param {Array} allStudents - Roster of students available to the teacher
 * @param {Array} allowedUsers - Active directory users in the system
 * @param {Object} currentUser - Current logged-in user profile
 * @returns {Record<string, string[]>} Suggestions dictionary keyed by field name
 */
export function extractCoworkerSuggestions(allStudents = [], allowedUsers = [], currentUser = null) {
  const suggestions = {};
  for (const field of COWORKER_FIELDS) {
    suggestions[field] = new Set();
  }

  const userGroupMap = buildUserGroupMap(allowedUsers);

  // 1. Harvest from students strictly scoped to this user and their group
  if (Array.isArray(allStudents)) {
    for (const st of allStudents) {
      if (!isStudentInUserScope(st, currentUser, userGroupMap)) continue;

      // Root fields
      for (const field of COWORKER_FIELDS) {
        const val = typeof st[field] === 'string' ? st[field].trim() : '';
        if (val) suggestions[field].add(val);
      }

      // Nested reportsByYear if present
      if (st.reportsByYear && typeof st.reportsByYear === 'object') {
        for (const yrData of Object.values(st.reportsByYear)) {
          if (!yrData || typeof yrData !== 'object') continue;
          for (const field of COWORKER_FIELDS) {
            const val = typeof yrData[field] === 'string' ? yrData[field].trim() : '';
            if (val) suggestions[field].add(val);
          }
        }
      }

      // Nested reportsByPlanType if present
      if (st.reportsByPlanType && typeof st.reportsByPlanType === 'object') {
        for (const ptData of Object.values(st.reportsByPlanType)) {
          if (!ptData || typeof ptData !== 'object') continue;
          for (const field of COWORKER_FIELDS) {
            const val = typeof ptData[field] === 'string' ? ptData[field].trim() : '';
            if (val) suggestions[field].add(val);
          }
        }
      }
    }
  }

  // 2. Add registered colleagues from the SAME group/Matya to relevant role fields
  if (Array.isArray(allowedUsers)) {
    const myGroup = String(currentUser?.group || '').trim().toLowerCase();
    // Only suggest registered directory users if the current user belongs to that group
    if (myGroup) {
      const relevantUsers = allowedUsers.filter((u) => {
        if (u.active === false) return false;
        const uGroup = String(u.group || '').trim().toLowerCase();
        return uGroup === myGroup;
      });

      for (const u of relevantUsers) {
        const name = String(u.name || '').trim();
        const title = String(u.title || '').trim();
        if (!name) continue;

        if (title.includes('מתי"א') || title.includes('מתכלל') || title.includes('רכז')) {
          suggestions.matyaCoordinator.add(name);
        }
        if (title.includes('שילוב') || title.includes('הוראה')) {
          suggestions.integrationTeacher.add(name);
        }
        if (title.includes('מחנכ') || title.includes('גננת')) {
          suggestions.homeroomTeacher.add(name);
        }
      }
    }
  }

  // Convert Sets to sorted Arrays
  const result = {};
  for (const field of COWORKER_FIELDS) {
    result[field] = Array.from(suggestions[field]).sort((a, b) => a.localeCompare(b, 'he'));
  }
  return result;
}

/**
 * Returns candidate students that have at least one coworker/framework field populated,
 * strictly filtered by the current user's ownership and group scope.
 *
 * @param {Array} allStudents
 * @param {string|null} currentStudentId
 * @param {Object|null} currentUser
 * @param {Array} allowedUsers
 * @returns {Array<{id: string, name: string, schoolName: string, gradeClass: string}>}
 */
export function getStudentsWithTeamData(allStudents = [], currentStudentId = null, currentUser = null, allowedUsers = []) {
  if (!Array.isArray(allStudents)) return [];
  const userGroupMap = buildUserGroupMap(allowedUsers);

  return allStudents
    .filter((st) => {
      if (!st || st.id === currentStudentId) return false;
      if (!isStudentInUserScope(st, currentUser, userGroupMap)) return false;

      return COWORKER_FIELDS.some((field) => {
        const val = typeof st[field] === 'string' ? st[field].trim() : '';
        return Boolean(val);
      });
    })
    .map((st) => ({
      id: st.id,
      name: st.name || 'תלמיד/ה ללא שם',
      schoolName: st.schoolName || '',
      gradeClass: st.gradeClass || ''
    }));
}

/**
 * Extracts a clean dictionary of team/framework fields from a source student
 *
 * @param {Object} sourceStudent
 * @returns {Record<string, string>}
 */
export function extractTeamDataFromStudent(sourceStudent) {
  if (!sourceStudent) return {};
  const teamData = {};
  for (const field of COWORKER_FIELDS) {
    if (typeof sourceStudent[field] === 'string' && sourceStudent[field].trim()) {
      teamData[field] = sourceStudent[field].trim();
    }
  }
  return teamData;
}
