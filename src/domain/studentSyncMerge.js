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
];

/**
 * Merges observations arrays without duplicates, preserving order by dateIso.
 */
export function mergeObservationsLists(localObs = [], serverObs = []) {
  const map = new Map();
  [...(localObs || []), ...(serverObs || [])].forEach((item) => {
    if (item && item.id) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      } else {
        // Prefer one with note or newer content
        const existing = map.get(item.id);
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
export function mergeGoalObjects(localGoal = {}, serverGoal = {}, baseGoal = {}) {
  if (!serverGoal || Object.keys(serverGoal).length === 0) return localGoal;
  if (!localGoal || Object.keys(localGoal).length === 0) return serverGoal;

  const merged = { ...serverGoal, ...localGoal };

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

  return merged;
}

/**
 * Merges two student snapshots field-by-field, preventing accidental overwrites
 * when multi-disciplinary colleagues edit simultaneously.
 */
export function mergeStudentSnapshots({
  localStudent = {},
  serverStudent = {},
  baseSnapshot = {}
} = {}) {
  if (!serverStudent || Object.keys(serverStudent).length === 0) return localStudent;
  if (!localStudent || Object.keys(localStudent).length === 0) return serverStudent;

  const merged = { ...serverStudent, ...localStudent };

  // 1. SharedWith reconciliation:
  // Local student reflects authoritative sharing actions (both adding and unsharing).
  // If localStudent.sharedWith is an array, respect it directly so unsharing works permanently;
  // otherwise fallback to serverStudent.sharedWith.
  merged.sharedWith = Array.isArray(localStudent.sharedWith)
    ? localStudent.sharedWith
    : (Array.isArray(serverStudent.sharedWith) ? serverStudent.sharedWith : []);

  // 1b. SharedReadBy array reconciliation:
  // Colleague read receipts are preserved as a union, but strictly filtered to users currently in sharedWith.
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
  const baseGoals = Array.isArray(baseSnapshot.goals) ? baseSnapshot.goals : [];

  const baseGoalMap = new Map(baseGoals.map((g) => [g.id, g]));
  const serverGoalMap = new Map(serverGoals.map((g) => [g.id, g]));
  const mergedGoals = [];
  const seenIds = new Set();

  // Process all local goals
  localGoals.forEach((lg) => {
    seenIds.add(lg.id);
    const sg = serverGoalMap.get(lg.id);
    const bg = baseGoalMap.get(lg.id);
    if (sg) {
      mergedGoals.push(mergeGoalObjects(lg, sg, bg));
    } else {
      mergedGoals.push(lg);
    }
  });

  // Include any new goals created concurrently on the server by colleagues
  serverGoals.forEach((sg) => {
    if (!seenIds.has(sg.id)) {
      mergedGoals.push(sg);
    }
  });

  merged.goals = mergedGoals;

  // 3. Team messages non-destructive union
  merged.teamMessages = mergeTeamMessages(localStudent.teamMessages, serverStudent.teamMessages);

  merged.updatedAt = new Date().toISOString();

  return merged;
}

/**
 * Merges team collaboration messages union by unique id, preserving deletions and ordering chronologically.
 */
export function mergeTeamMessages(localMsgs = [], serverMsgs = []) {
  const map = new Map();
  [...(localMsgs || []), ...(serverMsgs || [])].forEach((msg) => {
    if (msg && msg.id) {
      if (!map.has(msg.id)) {
        map.set(msg.id, msg);
      } else {
        const existing = map.get(msg.id);
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
