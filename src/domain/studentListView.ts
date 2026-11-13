export const NO_FRAMEWORK_LABEL = 'ללא מסגרת חינוכית מוגדרת';

export interface StudentListItem {
  id?: string;
  name?: string;
  educationalFramework?: string;
  [key: string]: unknown;
}

/**
 * Strips invisible Unicode direction marks, control characters, and trims whitespace.
 */
export const cleanFramework = (str?: string | null): string => {
  if (!str) return '';
  return str
    .replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '')
    .trim();
};

/**
 * Extracts the core semantic name of an educational institution,
 * stripping surrounding quotes, punctuation, and common Hebrew prefixes
 * (e.g. 'גן "אלון"' -> 'אלון', '"יובלים"' -> 'יובלים', 'בית ספר ארז' -> 'ארז').
 */
export const getCoreFrameworkName = (str?: string | null): string => {
  const cleaned = cleanFramework(str);
  if (!cleaned || cleaned === NO_FRAMEWORK_LABEL) return '';
  let s = cleaned.replace(/^["'״׳“”‘’„‟«»()[\]{}—–\-]+|["'״׳“”‘’„‟«»()[\]{}—–\-]+$/g, '').trim();
  s = s.replace(/^(גן\s*(?:ילדים|חובה)?|בית\s*ספר|בי"?ס|כיתה)\s*["'״׳“”‘’„‟«»]?/i, '').trim();
  s = s.replace(/^["'״׳“”‘’„‟«»]+|["'״׳“”‘’„‟«»]+$/g, '').trim();
  return s || cleaned;
};

/**
 * Identifies the broad category of the educational institution.
 */
export const getFrameworkCategory = (
  str?: string | null
): 'none' | 'school' | 'class' | 'kindergarten' => {
  const cleaned = cleanFramework(str);
  if (!cleaned || cleaned === NO_FRAMEWORK_LABEL) return 'none';
  if (/^(בית\s*ספר|בי"?ס)/i.test(cleaned)) return 'school';
  if (/^כיתה/i.test(cleaned)) return 'class';
  return 'kindergarten';
};

/**
 * Generates a normalized canonical grouping key for an educational framework.
 */
export const getCanonicalFrameworkKey = (rawFramework?: string | null): string => {
  const cleaned = cleanFramework(rawFramework);
  if (!cleaned || cleaned === NO_FRAMEWORK_LABEL) return NO_FRAMEWORK_LABEL;
  const core = getCoreFrameworkName(cleaned);
  const category = getFrameworkCategory(cleaned);
  return `${category}:${core}`;
};

/**
 * Robust Hebrew comparison of educational framework names:
 * 1. Unassigned / empty frameworks sort to the end.
 * 2. Compares by core semantic name (Hebrew alphabetical).
 * 3. Falls back to raw cleaned string comparison.
 */
export const compareFrameworks = (fwA?: string | null, fwB?: string | null): number => {
  const cleanedA = cleanFramework(fwA);
  const cleanedB = cleanFramework(fwB);
  const aEmpty = !cleanedA || cleanedA === NO_FRAMEWORK_LABEL;
  const bEmpty = !cleanedB || cleanedB === NO_FRAMEWORK_LABEL;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const coreA = getCoreFrameworkName(cleanedA);
  const coreB = getCoreFrameworkName(cleanedB);
  const coreCmp = coreA.localeCompare(coreB, 'he');
  if (coreCmp !== 0) return coreCmp;

  return cleanedA.localeCompare(cleanedB, 'he');
};

export const getFrameworkKey = (student?: StudentListItem | null): string => {
  return cleanFramework(student?.educationalFramework) || NO_FRAMEWORK_LABEL;
};

export const filterStudentsBySearch = <T extends StudentListItem>(
  students?: T[] | null,
  query: string = ''
): T[] => {
  const q = cleanFramework(query).toLowerCase();
  if (!q) return Array.isArray(students) ? [...students] : [];
  const normalizedQ = getCoreFrameworkName(q) || q;

  return (students || []).filter((s) => {
    const name = (s.name || '').toLowerCase();
    const fw = (s.educationalFramework || '').toLowerCase();
    const cleanFw = cleanFramework(fw);
    const coreFw = getCoreFrameworkName(cleanFw).toLowerCase();

    return (
      name.includes(q) ||
      fw.includes(q) ||
      cleanFw.includes(q) ||
      (Boolean(coreFw) && coreFw.includes(normalizedQ))
    );
  });
};

export const sortStudentsByName = <T extends StudentListItem>(students?: T[] | null): T[] => {
  return [...(students || [])].sort((a, b) =>
    (a.name || '').trim().localeCompare((b.name || '').trim(), 'he')
  );
};

export const sortStudentsByFramework = <T extends StudentListItem>(students?: T[] | null): T[] => {
  return [...(students || [])].sort((a, b) => {
    const fwA = getFrameworkKey(a);
    const fwB = getFrameworkKey(b);
    const fwCmp = compareFrameworks(fwA, fwB);
    if (fwCmp !== 0) return fwCmp;
    return (a.name || '').trim().localeCompare((b.name || '').trim(), 'he');
  });
};

export const groupStudentsByFramework = <T extends StudentListItem>(
  students?: T[] | null
): Array<[string, T[]]> => {
  const map: Record<string, { displayNames: string[]; students: T[] }> = {};

  for (const st of students || []) {
    const rawFw = getFrameworkKey(st);
    if (rawFw === NO_FRAMEWORK_LABEL) {
      if (!map[NO_FRAMEWORK_LABEL]) {
        map[NO_FRAMEWORK_LABEL] = { displayNames: [NO_FRAMEWORK_LABEL], students: [] };
      }
      map[NO_FRAMEWORK_LABEL].students.push(st);
      continue;
    }

    const canonicalKey = getCanonicalFrameworkKey(rawFw);
    if (!map[canonicalKey]) {
      map[canonicalKey] = { displayNames: [], students: [] };
    }
    map[canonicalKey].students.push(st);
    map[canonicalKey].displayNames.push(rawFw);
  }

  const entries: Array<[string, T[]]> = Object.entries(map).map(([key, group]) => {
    let displayName = key;
    if (key === NO_FRAMEWORK_LABEL) {
      displayName = NO_FRAMEWORK_LABEL;
    } else {
      // Pick best display name: prefer one with prefix (e.g. גן "יובלים" over "יובלים"), or first
      displayName =
        group.displayNames.find((n) => /^גן\s/i.test(n)) ||
        group.displayNames.find((n) => /^(בית\s*ספר|בי"?ס|כיתה)\s/i.test(n)) ||
        group.displayNames[0] ||
        key;
    }
    return [displayName, sortStudentsByName(group.students)];
  });

  return entries.sort(([fwA], [fwB]) => compareFrameworks(fwA, fwB));
};

export const resolveBankTargetStudent = <T extends { id?: string }>(
  userStudents: T[] = [],
  targetId: string | null = null,
  selectedId: string | null = null
): T | null => {
  return (
    userStudents.find((s) => s.id === (targetId || selectedId)) ||
    userStudents.find((s) => s.id === selectedId) ||
    userStudents[0] ||
    null
  );
};

export type ReadinessStatus = 'ready' | 'partial' | 'missing';

export type ReadinessFilterKey =
  | 'all'
  | 'missing_goals'
  | 'missing_parents'
  | 'missing_eval'
  | 'ready'
  | 'partial'
  | 'missing';

export interface StudentReadinessInfo {
  goalsCount: number;
  hasActiveGoals: boolean;
  hasParentVoice: boolean;
  hasMidYearEval: boolean;
  hasStatusReport: boolean;
  isLocked: boolean;
  status: ReadinessStatus;
  missingTags: string[];
}

export interface ClassReadinessSummary {
  total: number;
  readyCount: number;
  partialCount: number;
  missingCount: number;
  missingGoalsCount: number;
  missingParentsCount: number;
  missingEvalCount: number;
  readyPct: number;
  partialPct: number;
  missingPct: number;
}

const PARENT_MARKERS = ['קול ההורים', 'שיחת הורים', 'חתימת הורים', 'הורי התלמיד', 'הורי הילד'];

export const computeStudentReadiness = (
  student?: StudentListItem | null
): StudentReadinessInfo => {
  if (!student) {
    return {
      goalsCount: 0,
      hasActiveGoals: false,
      hasParentVoice: false,
      hasMidYearEval: false,
      hasStatusReport: false,
      isLocked: false,
      status: 'missing',
      missingTags: ['חסרות מטרות', 'ללא הורים', 'ללא הערכת אמצע']
    };
  }

  const rawGoals = Array.isArray(student.goals) ? student.goals : [];
  const goalsCount =
    typeof student.goalsCount === 'number'
      ? student.goalsCount
      : rawGoals.filter((g: any) => {
          if (!g || typeof g !== 'object') return false;
          return Boolean(
            String(g.title || '').trim() ||
              String(g.objectives || '').trim() ||
              String(g.activityParticipation || '').trim()
          );
        }).length;

  const hasActiveGoals = goalsCount >= 2;

  const freeText = String(student.teacherFreeText || '');
  const snippets = Array.isArray(student.pedagogicalSnippets)
    ? student.pedagogicalSnippets
    : [];
  const hasParentVoice =
    typeof student.hasParentVoice === 'boolean'
      ? student.hasParentVoice
      : Boolean(
          student.parentSignature ||
            student.parentSigned ||
            PARENT_MARKERS.some((m) => freeText.includes(m)) ||
            snippets.some((s: any) => {
              const title = String(s?.sourceTitle || '');
              const content = String(s?.content || '');
              return title.includes('הורים') || PARENT_MARKERS.some((m) => content.includes(m));
            })
        );

  const hasMidYearEval =
    typeof student.hasMidYearEval === 'boolean'
      ? student.hasMidYearEval
      : Boolean(
          String(student.evalReportFreeText || '').trim() ||
            String(student.evalReportSummary || '').trim() ||
            rawGoals.some((g: any) => {
              if (!g || typeof g !== 'object') return false;
              return Boolean(
                String(g.midYearEvaluation || '').trim() ||
                  String(g.endYearEvaluation || '').trim() ||
                  String(g.achievementStatus || '').trim()
              );
            })
        );

  const rawSections = Array.isArray(student.statusReportSections)
    ? student.statusReportSections
    : [];
  const hasStatusReport =
    typeof student.hasStatusReport === 'boolean'
      ? student.hasStatusReport
      : rawSections.some((sec: any) => Boolean(String(sec?.content || '').trim()));

  const isLocked = Boolean(student.isLocked);

  let status: ReadinessStatus = 'partial';
  if (hasActiveGoals && hasParentVoice && hasMidYearEval && (hasStatusReport || isLocked)) {
    status = 'ready';
  } else if (!hasActiveGoals && !hasParentVoice && !hasMidYearEval) {
    status = 'missing';
  }

  const missingTags: string[] = [];
  if (!hasActiveGoals) missingTags.push('חסרות מטרות');
  if (!hasParentVoice) missingTags.push('ללא הורים');
  if (!hasMidYearEval) missingTags.push('ללא הערכת אמצע');

  return {
    goalsCount,
    hasActiveGoals,
    hasParentVoice,
    hasMidYearEval,
    hasStatusReport,
    isLocked,
    status,
    missingTags
  };
};

export const computeClassReadinessSummary = (
  students?: StudentListItem[] | null
): ClassReadinessSummary => {
  const list = Array.isArray(students) ? students : [];
  const total = list.length;
  let readyCount = 0;
  let partialCount = 0;
  let missingCount = 0;
  let missingGoalsCount = 0;
  let missingParentsCount = 0;
  let missingEvalCount = 0;

  for (const st of list) {
    const info = computeStudentReadiness(st);
    if (info.status === 'ready') readyCount += 1;
    else if (info.status === 'partial') partialCount += 1;
    else missingCount += 1;

    if (!info.hasActiveGoals) missingGoalsCount += 1;
    if (!info.hasParentVoice) missingParentsCount += 1;
    if (!info.hasMidYearEval) missingEvalCount += 1;
  }

  const readyPct = total > 0 ? Math.round((readyCount / total) * 1000) / 10 : 0;
  const partialPct = total > 0 ? Math.round((partialCount / total) * 1000) / 10 : 0;
  const missingPct = total > 0 ? Math.round((missingCount / total) * 1000) / 10 : 0;

  return {
    total,
    readyCount,
    partialCount,
    missingCount,
    missingGoalsCount,
    missingParentsCount,
    missingEvalCount,
    readyPct,
    partialPct,
    missingPct
  };
};

export const filterStudentsByReadiness = <T extends StudentListItem>(
  students?: T[] | null,
  filterKey: ReadinessFilterKey = 'all'
): T[] => {
  const list = Array.isArray(students) ? [...students] : [];
  if (!filterKey || filterKey === 'all') return list;

  return list.filter((st) => {
    const info = computeStudentReadiness(st);
    switch (filterKey) {
      case 'missing_goals':
        return !info.hasActiveGoals;
      case 'missing_parents':
        return !info.hasParentVoice;
      case 'missing_eval':
        return !info.hasMidYearEval;
      case 'ready':
        return info.status === 'ready';
      case 'partial':
        return info.status === 'partial';
      case 'missing':
        return info.status === 'missing';
      default:
        return true;
    }
  });
};
