// ============================================================================
// Coworker & Educational Team Auto-Complete & One-Click Team Copy Domain Module
// Extracts unique suggestions from existing students and group colleagues,
// completely sandboxed and secure on the client side.
// ============================================================================

export const COWORKER_FIELDS: readonly string[] = [
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

export interface StudentTeamCandidate {
  id: string;
  name: string;
  schoolName: string;
  gradeClass: string;
}

export interface UserDirectoryEntity {
  email?: string;
  name?: string;
  title?: string;
  group?: string;
  active?: boolean;
}

export interface StudentEntityForTeam {
  id?: string;
  name?: string;
  ownerEmail?: string;
  sharedWith?: string[];
  schoolName?: string;
  gradeClass?: string;
  reportsByYear?: Record<string, Record<string, unknown>>;
  reportsByPlanType?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Builds a fast lookup map of user emails to their lowercase trimmed groups.
 */
function buildUserGroupMap(allowedUsers: UserDirectoryEntity[] = []): Map<string, string> {
  const map = new Map<string, string>();
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
function isStudentInUserScope(
  st?: StudentEntityForTeam | null,
  currentUser?: UserDirectoryEntity | null,
  userGroupMap?: Map<string, string>
): boolean {
  if (!st) return false;
  const myEmail = String(currentUser?.email || '').trim().toLowerCase();
  const myGroup = String(currentUser?.group || '').trim().toLowerCase();

  // If no user context provided (e.g. standalone test), accept all
  if (!myEmail) return true;

  const owner = String(st.ownerEmail || '').trim().toLowerCase();
  const isMine =
    Boolean(owner && owner === myEmail) ||
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
 */
export function extractCoworkerSuggestions(
  allStudents: StudentEntityForTeam[] = [],
  allowedUsers: UserDirectoryEntity[] = [],
  currentUser: UserDirectoryEntity | null = null
): Record<string, string[]> {
  const suggestions: Record<string, Set<string>> = {};
  for (const field of COWORKER_FIELDS) {
    suggestions[field] = new Set<string>();
  }

  const userGroupMap = buildUserGroupMap(allowedUsers);

  // 1. Harvest from students strictly scoped to this user and their group
  if (Array.isArray(allStudents)) {
    for (const st of allStudents) {
      if (!isStudentInUserScope(st, currentUser, userGroupMap)) continue;

      // Root fields
      for (const field of COWORKER_FIELDS) {
        const val = typeof st[field] === 'string' ? (st[field] as string).trim() : '';
        if (val) suggestions[field].add(val);
      }

      // Nested reportsByYear if present
      if (st.reportsByYear && typeof st.reportsByYear === 'object') {
        for (const yrData of Object.values(st.reportsByYear)) {
          if (!yrData || typeof yrData !== 'object') continue;
          for (const field of COWORKER_FIELDS) {
            const val = typeof yrData[field] === 'string' ? (yrData[field] as string).trim() : '';
            if (val) suggestions[field].add(val);
          }
        }
      }

      // Nested reportsByPlanType if present
      if (st.reportsByPlanType && typeof st.reportsByPlanType === 'object') {
        for (const ptData of Object.values(st.reportsByPlanType)) {
          if (!ptData || typeof ptData !== 'object') continue;
          for (const field of COWORKER_FIELDS) {
            const val = typeof ptData[field] === 'string' ? (ptData[field] as string).trim() : '';
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
  const result: Record<string, string[]> = {};
  for (const field of COWORKER_FIELDS) {
    result[field] = Array.from(suggestions[field]).sort((a, b) => a.localeCompare(b, 'he'));
  }
  return result;
}

/**
 * Returns candidate students that have at least one coworker/framework field populated,
 * strictly filtered by the current user's ownership and group scope.
 */
export function getStudentsWithTeamData(
  allStudents: StudentEntityForTeam[] = [],
  currentStudentId: string | null = null,
  currentUser: UserDirectoryEntity | null = null,
  allowedUsers: UserDirectoryEntity[] = []
): StudentTeamCandidate[] {
  if (!Array.isArray(allStudents)) return [];
  const userGroupMap = buildUserGroupMap(allowedUsers);

  return allStudents
    .filter((st) => {
      if (!st || st.id === currentStudentId) return false;
      if (!isStudentInUserScope(st, currentUser, userGroupMap)) return false;

      return COWORKER_FIELDS.some((field) => {
        const val = typeof st[field] === 'string' ? (st[field] as string).trim() : '';
        return Boolean(val);
      });
    })
    .map((st) => ({
      id: String(st.id || ''),
      name: String(st.name || 'תלמיד/ה ללא שם'),
      schoolName: String(st.schoolName || ''),
      gradeClass: String(st.gradeClass || '')
    }));
}

/**
 * Extracts a clean dictionary of team/framework fields from a source student
 */
export function extractTeamDataFromStudent(sourceStudent?: StudentEntityForTeam | null): Record<string, string> {
  if (!sourceStudent) return {};
  const teamData: Record<string, string> = {};
  for (const field of COWORKER_FIELDS) {
    if (typeof sourceStudent[field] === 'string' && (sourceStudent[field] as string).trim()) {
      teamData[field] = (sourceStudent[field] as string).trim();
    }
  }
  return teamData;
}
