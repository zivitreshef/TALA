import { DEFAULT_SCHOOL_YEAR, associateStudentToWorkingYear } from './yearReport';
import { isDemoStudent } from './onboardingJourney';

export const DISCIPLINE_LEAD_OPTIONS = [
  'צוות משותף',
  'מחנכת הכיתה',
  'מורת שילוב',
  'טיפול רגשי / אמנויות',
  'קלינאית תקשורת',
  'ריפוי בעיסוק',
  'תומכת למידה',
  'יועצת / פסיכולוגית',
  'פיזיותרפיה'
] as const;

export type DisciplineLead = (typeof DISCIPLINE_LEAD_OPTIONS)[number];

export interface GoalObservation {
  id: string;
  dateIso?: string;
  note?: string;
  [key: string]: unknown;
}

export interface SyncGoal {
  id?: string;
  observations?: GoalObservation[];
  leadProfessional?: string;
  achievementStatus?: string;
  [key: string]: unknown;
}

export interface TeamMessage {
  id: string;
  text?: string;
  createdAt?: string;
  isDeleted?: boolean;
  readBy?: string[];
  [key: string]: unknown;
}

export interface StudentSnapshot {
  id?: string;
  name?: string;
  sharedWith?: string[];
  sharedReadBy?: string[];
  goals?: SyncGoal[];
  teamMessages?: TeamMessage[];
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Merges observations arrays without duplicates, preserving order by dateIso.
 */
export function mergeObservationsLists(
  localObs: GoalObservation[] = [],
  serverObs: GoalObservation[] = []
): GoalObservation[] {
  const map = new Map<string, GoalObservation>();
  [...(localObs || []), ...(serverObs || [])].forEach((item) => {
    if (item && item.id) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      } else {
        const existing = map.get(item.id)!;
        map.set(item.id, { ...existing, ...item });
      }
    }
  });
  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.dateIso || 0).getTime();
    const db = new Date(b.dateIso || 0).getTime();
    return da - db;
  });
}

/**
 * Non-destructive merge of two goal objects when simultaneous edits occur.
 */
export function mergeGoalObjects<T extends SyncGoal>(
  localGoal: T = {} as T,
  serverGoal: T = {} as T,
  baseGoal: T = {} as T
): T {
  if (!serverGoal || Object.keys(serverGoal).length === 0) return localGoal;
  if (!localGoal || Object.keys(localGoal).length === 0) return serverGoal;

  const merged: SyncGoal = { ...serverGoal, ...localGoal };

  // For any field where local was NOT changed from base, but server WAS changed from base, take server's value
  Object.keys(serverGoal).forEach((key) => {
    if (key === 'observations') return;
    const baseVal = baseGoal ? baseGoal[key] : undefined;
    const localVal = localGoal[key];
    const serverVal = serverGoal[key];
    if (baseVal !== undefined && localVal === baseVal && serverVal !== baseVal) {
      merged[key] = serverVal;
    }
  });

  // Always merge observations union so continuous in-class tracking is never lost
  merged.observations = mergeObservationsLists(localGoal.observations, serverGoal.observations);

  // If local left leadProfessional default/empty but server set it, preserve server's
  if (
    (!localGoal.leadProfessional || localGoal.leadProfessional === 'צוות משותף') &&
    serverGoal.leadProfessional &&
    serverGoal.leadProfessional !== 'צוות משותף'
  ) {
    merged.leadProfessional = serverGoal.leadProfessional;
  }

  // Achievement status
  if (!localGoal.achievementStatus && serverGoal.achievementStatus) {
    merged.achievementStatus = serverGoal.achievementStatus;
  }

  return merged as T;
}

export interface MergeStudentSnapshotsParams<T extends StudentSnapshot> {
  localStudent?: T | null;
  serverStudent?: T | null;
  baseSnapshot?: T | null;
}

/**
 * Merges two student snapshots field-by-field, preventing accidental overwrites
 * when multi-disciplinary colleagues edit simultaneously.
 */
export function mergeStudentSnapshots<T extends StudentSnapshot>({
  localStudent = {} as T,
  serverStudent = {} as T,
  baseSnapshot = {} as T
}: MergeStudentSnapshotsParams<T> = {}): T {
  if (!serverStudent || Object.keys(serverStudent).length === 0) return (localStudent || {}) as T;
  if (!localStudent || Object.keys(localStudent).length === 0) return serverStudent;

  const merged: StudentSnapshot = { ...serverStudent, ...localStudent };

  // 1. SharedWith reconciliation:
  merged.sharedWith = Array.isArray(localStudent.sharedWith)
    ? localStudent.sharedWith
    : Array.isArray(serverStudent.sharedWith)
    ? serverStudent.sharedWith
    : [];

  // 1b. SharedReadBy array reconciliation:
  const sharedReadBySet = new Set([
    ...(Array.isArray(serverStudent.sharedReadBy) ? serverStudent.sharedReadBy : []),
    ...(Array.isArray(localStudent.sharedReadBy) ? localStudent.sharedReadBy : [])
  ]);
  const currentSharedEmails = new Set(
    merged.sharedWith.map((e) => String(e || '').trim().toLowerCase())
  );
  merged.sharedReadBy = Array.from(sharedReadBySet).filter((email) =>
    currentSharedEmails.has(String(email || '').trim().toLowerCase())
  );

  // 2. Goal-by-goal non-destructive reconciliation
  const localGoals = Array.isArray(localStudent.goals) ? localStudent.goals : [];
  const serverGoals = Array.isArray(serverStudent.goals) ? serverStudent.goals : [];
  const baseGoals = Array.isArray(baseSnapshot?.goals) ? baseSnapshot.goals : [];

  const baseGoalMap = new Map(baseGoals.map((g) => [g.id, g]));
  const serverGoalMap = new Map(serverGoals.map((g) => [g.id, g]));
  const mergedGoals: SyncGoal[] = [];
  const seenIds = new Set<string | undefined>();

  // Process all local goals
  localGoals.forEach((lg) => {
    seenIds.add(lg.id);
    const sg = lg.id ? serverGoalMap.get(lg.id) : undefined;
    const bg = lg.id ? baseGoalMap.get(lg.id) : undefined;
    if (sg) {
      mergedGoals.push(mergeGoalObjects(lg, sg, bg));
    } else {
      mergedGoals.push(lg);
    }
  });

  // Include any new goals created concurrently on the server by colleagues.
  // Do NOT resurrect goals that were present in baseSnapshot and explicitly deleted locally.
  serverGoals.forEach((sg) => {
    if (!seenIds.has(sg.id)) {
      const wasInBase = sg.id ? baseGoalMap.has(sg.id) : false;
      if (!wasInBase) {
        mergedGoals.push(sg);
      }
    }
  });

  merged.goals = mergedGoals;

  // 3. Team messages non-destructive union
  merged.teamMessages = mergeTeamMessages(localStudent.teamMessages, serverStudent.teamMessages);

  merged.updatedAt = new Date().toISOString();

  return merged as T;
}

/**
 * Merges team collaboration messages union by unique id, preserving deletions and ordering chronologically.
 */
export function mergeTeamMessages(
  localMsgs: TeamMessage[] = [],
  serverMsgs: TeamMessage[] = []
): TeamMessage[] {
  const map = new Map<string, TeamMessage>();
  [...(localMsgs || []), ...(serverMsgs || [])].forEach((msg) => {
    if (msg && msg.id) {
      if (!map.has(msg.id)) {
        map.set(msg.id, msg);
      } else {
        const existing = map.get(msg.id)!;
        const isDeleted = existing.isDeleted || msg.isDeleted;
        const existingReadBy = Array.isArray(existing.readBy) ? existing.readBy : [];
        const msgReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
        const mergedReadBy = Array.from(new Set([...existingReadBy, ...msgReadBy]));

        map.set(msg.id, {
          ...existing,
          ...msg,
          readBy: mergedReadBy,
          ...(isDeleted ? { isDeleted: true, text: 'הודעה זו נמחקה על ידי המחבר/ת' } : {})
        });
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return da - db;
  });
}

export interface ReconcileStudentsParams<T extends Record<string, any> = Record<string, any>> {
  cloudStudents?: T[];
  localStudents?: T[];
  currentUserEmail?: string;
  defaultSchoolYear?: string;
}

export interface ReconcileStudentsResult<T extends Record<string, any> = Record<string, any>> {
  mergedStudents: T[];
  studentsToUpload: T[];
}

/**
 * Safely reconciles cloud students with local students upon cloud sync/snapshot updates.
 * Prevents offline or unsynced local students from being wiped when cloud reports fewer students,
 * and identifies unsynced local students to be uploaded to the cloud.
 */
export function reconcileLocalAndCloudStudents<T extends Record<string, any>>({
  cloudStudents = [],
  localStudents = [],
  currentUserEmail = '',
  defaultSchoolYear = DEFAULT_SCHOOL_YEAR
}: ReconcileStudentsParams<T> = {}): ReconcileStudentsResult<T> {
  const normalizedUserEmail = (currentUserEmail || '').trim().toLowerCase();

  // 1. Normalize cloud students
  const cloudList = Array.isArray(cloudStudents) ? cloudStudents : [];
  const normalizedCloud = cloudList.map((s) => {
    const scoped = {
      ...s,
      ownerEmail: (s.ownerEmail || normalizedUserEmail || 'zivit.reshef@gmail.com').toLowerCase()
    };
    return (scoped.schoolYear === 'תשפ"ו (2025-2026)')
      ? associateStudentToWorkingYear(scoped, defaultSchoolYear)
      : scoped;
  });

  const cloudIdSet = new Set(
    normalizedCloud
      .map((s) => s.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  );

  // 2. Identify local students not present in cloud
  const localList = Array.isArray(localStudents) ? localStudents : [];
  const studentsToUpload: T[] = [];
  const missingLocalStudents: T[] = [];

  localList.forEach((ls) => {
    if (!ls || !ls.id || typeof ls.id !== 'string') return;
    if (isDemoStudent(ls)) return; // Strictly ignore isolated demo students

    if (!cloudIdSet.has(ls.id)) {
      // Local student missing in cloud!
      const rawOwner = (ls.ownerEmail || '').trim().toLowerCase();
      // Zero-Trust Security Boundary: A teacher can only upload local students that belong to them.
      // If a student belongs to another teacher or the default admin seed, do NOT attempt cloud upload.
      const isOwnedByCurrentTeacher = Boolean(
        normalizedUserEmail && (rawOwner === normalizedUserEmail || !rawOwner)
      );

      const resolvedOwnerEmail = isOwnedByCurrentTeacher
        ? normalizedUserEmail
        : (rawOwner || normalizedUserEmail || 'zivit.reshef@gmail.com');

      const scopedLocal = {
        ...ls,
        ownerEmail: resolvedOwnerEmail
      };
      const normalizedLocal = (scopedLocal.schoolYear === 'תשפ"ו (2025-2026)')
        ? associateStudentToWorkingYear(scopedLocal, defaultSchoolYear)
        : scopedLocal;

      missingLocalStudents.push(normalizedLocal as T);
      if (isOwnedByCurrentTeacher) {
        studentsToUpload.push(normalizedLocal as T);
      }
    }
  });

  const mergedStudents = [...normalizedCloud, ...missingLocalStudents];

  return {
    mergedStudents: mergedStudents as T[],
    studentsToUpload
  };
}
