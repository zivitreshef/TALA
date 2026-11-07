export const NO_FRAMEWORK_LABEL = 'ללא מסגרת חינוכית מוגדרת';

export interface StudentListItem {
  id?: string;
  name?: string;
  educationalFramework?: string;
  [key: string]: unknown;
}

export const getFrameworkKey = (student?: StudentListItem | null): string => {
  return (student?.educationalFramework || '').trim() || NO_FRAMEWORK_LABEL;
};

export const filterStudentsBySearch = <T extends StudentListItem>(
  students?: T[] | null,
  query: string = ''
): T[] => {
  const q = (query || '').trim();
  if (!q) return Array.isArray(students) ? [...students] : [];
  return (students || []).filter(
    (s) =>
      (s.name || '').includes(q) ||
      (s.educationalFramework || '').includes(q)
  );
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
    const fwCmp = fwA.localeCompare(fwB, 'he');
    if (fwCmp !== 0) return fwCmp;
    return (a.name || '').trim().localeCompare((b.name || '').trim(), 'he');
  });
};

export const groupStudentsByFramework = <T extends StudentListItem>(
  students?: T[] | null
): Array<[string, T[]]> => {
  const map = (students || []).reduce<Record<string, T[]>>((acc, st) => {
    const fwKey = getFrameworkKey(st);
    if (!acc[fwKey]) {
      acc[fwKey] = [];
    }
    acc[fwKey].push(st);
    return acc;
  }, {});
  return Object.entries(map);
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
