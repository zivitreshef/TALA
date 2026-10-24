export const NO_FRAMEWORK_LABEL = 'ללא מסגרת חינוכית מוגדרת';

export const getFrameworkKey = (student) => {
  return (student?.educationalFramework || '').trim() || NO_FRAMEWORK_LABEL;
};

export const filterStudentsBySearch = (students, query = '') => {
  const q = (query || '').trim();
  if (!q) return Array.isArray(students) ? [...students] : [];
  return (students || []).filter(
    (s) =>
      (s.name || '').includes(q) ||
      (s.educationalFramework || '').includes(q)
  );
};

export const sortStudentsByName = (students) => {
  return [...(students || [])].sort((a, b) =>
    (a.name || '').trim().localeCompare((b.name || '').trim(), 'he')
  );
};

export const sortStudentsByFramework = (students) => {
  return [...(students || [])].sort((a, b) => {
    const fwA = getFrameworkKey(a);
    const fwB = getFrameworkKey(b);
    const fwCmp = fwA.localeCompare(fwB, 'he');
    if (fwCmp !== 0) return fwCmp;
    return (a.name || '').trim().localeCompare((b.name || '').trim(), 'he');
  });
};

export const groupStudentsByFramework = (students) => {
  const map = (students || []).reduce((acc, st) => {
    const fwKey = getFrameworkKey(st);
    if (!acc[fwKey]) {
      acc[fwKey] = [];
    }
    acc[fwKey].push(st);
    return acc;
  }, {});
  return Object.entries(map);
};

export const resolveBankTargetStudent = (userStudents = [], targetId = null, selectedId = null) => {
  return (
    userStudents.find((s) => s.id === (targetId || selectedId)) ||
    userStudents.find((s) => s.id === selectedId) ||
    userStudents[0] ||
    null
  );
};
