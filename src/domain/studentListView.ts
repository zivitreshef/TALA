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
