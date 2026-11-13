import { describe, it, expect } from 'vitest';
import {
  NO_FRAMEWORK_LABEL,
  cleanFramework,
  getCoreFrameworkName,
  getFrameworkCategory,
  getCanonicalFrameworkKey,
  compareFrameworks,
  sortStudentsByFramework,
  groupStudentsByFramework,
  filterStudentsBySearch,
  type StudentListItem
} from '../domain/studentListView';

describe('Educational Framework Sorting and Grouping', () => {
  it('cleans invisible direction marks and trims whitespace', () => {
    expect(cleanFramework('\u200E  גן "אלון"  \u200F')).toBe('גן "אלון"');
    expect(cleanFramework('')).toBe('');
    expect(cleanFramework(null)).toBe('');
  });

  it('extracts core semantic name ignoring outer quotes and prefixes', () => {
    expect(getCoreFrameworkName('גן "אלון"')).toBe('אלון');
    expect(getCoreFrameworkName('"יובלים"')).toBe('יובלים');
    expect(getCoreFrameworkName('גן "יובלים"')).toBe('יובלים');
    expect(getCoreFrameworkName('בית ספר ארז')).toBe('ארז');
    expect(getCoreFrameworkName('בי"ס נרקיס')).toBe('נרקיס');
    expect(getCoreFrameworkName('כיתה א1')).toBe('א1');
    expect(getCoreFrameworkName('גן ילדים שקמה')).toBe('שקמה');
    expect(getCoreFrameworkName('גן חובה תמר')).toBe('תמר');
    expect(getCoreFrameworkName('“דקל”')).toBe('דקל');
    expect(getCoreFrameworkName(NO_FRAMEWORK_LABEL)).toBe('');
  });

  it('identifies framework category correctly', () => {
    expect(getFrameworkCategory('גן "אלון"')).toBe('kindergarten');
    expect(getFrameworkCategory('"יובלים"')).toBe('kindergarten');
    expect(getFrameworkCategory('בית ספר ארז')).toBe('school');
    expect(getFrameworkCategory('בי"ס נרקיס')).toBe('school');
    expect(getFrameworkCategory('כיתה א1')).toBe('class');
    expect(getFrameworkCategory(NO_FRAMEWORK_LABEL)).toBe('none');
  });

  it('generates canonical grouping keys so variations of the same kindergarten merge', () => {
    const key1 = getCanonicalFrameworkKey('"יובלים"');
    const key2 = getCanonicalFrameworkKey('גן "יובלים"');
    const key3 = getCanonicalFrameworkKey('גן יובלים');
    expect(key1).toBe('kindergarten:יובלים');
    expect(key2).toBe('kindergarten:יובלים');
    expect(key3).toBe('kindergarten:יובלים');
    expect(key1).toBe(key2);
  });

  it('correctly compares frameworks in Hebrew alphabetical order without quote artifacts', () => {
    // In Hebrew alphabet: אלון (א) < דקל (ד) < יובלים (י) < רחל (ר) < תמר (ת)
    expect(compareFrameworks('גן "אלון"', 'גן "דקל"')).toBeLessThan(0);
    expect(compareFrameworks('גן "דקל"', '"יובלים"')).toBeLessThan(0);
    expect(compareFrameworks('"יובלים"', 'גן "רחל"')).toBeLessThan(0);
    expect(compareFrameworks('גן "רחל"', 'גן "תמר"')).toBeLessThan(0);

    // Unassigned framework always sorts to the end
    expect(compareFrameworks(NO_FRAMEWORK_LABEL, 'גן "אלון"')).toBeGreaterThan(0);
    expect(compareFrameworks('גן "אלון"', NO_FRAMEWORK_LABEL)).toBeLessThan(0);
    expect(compareFrameworks('', 'גן "אלון"')).toBeGreaterThan(0);
    expect(compareFrameworks(NO_FRAMEWORK_LABEL, NO_FRAMEWORK_LABEL)).toBe(0);
  });

  it('sorts the real-world user dataset accurately by framework and student name', () => {
    const students: StudentListItem[] = [
      { id: '1', name: 'אליאב', educationalFramework: '"יובלים"' },
      { id: '2', name: 'אוריה בן שושן 2', educationalFramework: 'גן "תמר"' },
      { id: '3', name: 'דון אוחיון', educationalFramework: 'גן "אלון"' },
      { id: '4', name: 'דון אוחיון א', educationalFramework: 'גן "אלון"' },
      { id: '5', name: 'דון אוחיון ב', educationalFramework: 'גן "אלון"' },
      { id: '6', name: 'ארבל חנה', educationalFramework: 'גן "דקל"' },
      { id: '7', name: 'בארי פרלמן', educationalFramework: 'גן "דקל"' },
      { id: '8', name: 'דויד', educationalFramework: 'גן "דקל"' },
      { id: '9', name: 'עוז', educationalFramework: 'גן "דקל"' },
      { id: '10', name: 'עתי ליבו', educationalFramework: 'גן "דקל"' },
      { id: '11', name: 'רומי שמלץ', educationalFramework: 'גן "דקל"' },
      { id: '12', name: 'עידן אבוהב', educationalFramework: 'גן "יובלים"' },
      { id: '13', name: 'אימרי', educationalFramework: 'גן "רחל"' },
      { id: '14', name: 'ליאם טריטו', educationalFramework: 'גן "רחל"' },
      { id: '15', name: 'נועם בלי מסגרת', educationalFramework: '' }
    ];

    const sorted = sortStudentsByFramework(students);

    // First group: גן "אלון"
    expect(sorted[0].name).toBe('דון אוחיון');
    expect(sorted[1].name).toBe('דון אוחיון א');
    expect(sorted[2].name).toBe('דון אוחיון ב');

    // Second group: גן "דקל"
    expect(sorted[3].name).toBe('ארבל חנה');
    expect(sorted[4].name).toBe('בארי פרלמן');
    expect(sorted[5].name).toBe('דויד');
    expect(sorted[6].name).toBe('עוז');
    expect(sorted[7].name).toBe('עתי ליבו');
    expect(sorted[8].name).toBe('רומי שמלץ');

    // Third group: יובלים ("יובלים" and גן "יובלים" adjacent)
    const yovlimNames = [sorted[9].name, sorted[10].name];
    expect(yovlimNames).toContain('אליאב');
    expect(yovlimNames).toContain('עידן אבוהב');

    // Fourth group: גן "רחל"
    expect(sorted[11].name).toBe('אימרי');
    expect(sorted[12].name).toBe('ליאם טריטו');

    // Fifth group: גן "תמר"
    expect(sorted[13].name).toBe('אוריה בן שושן 2');

    // Last: Unassigned student
    expect(sorted[14].name).toBe('נועם בלי מסגרת');
  });

  it('groups students by framework cleanly merging quotation/prefix variants', () => {
    const students: StudentListItem[] = [
      { id: '1', name: 'אליאב', educationalFramework: '"יובלים"' },
      { id: '2', name: 'עידן אבוהב', educationalFramework: 'גן "יובלים"' },
      { id: '3', name: 'דון אוחיון', educationalFramework: 'גן "אלון"' }
    ];

    const clusters = groupStudentsByFramework(students);
    expect(clusters).toHaveLength(2);

    // First cluster: גן "אלון"
    expect(clusters[0][0]).toBe('גן "אלון"');
    expect(clusters[0][1]).toHaveLength(1);

    // Second cluster: יובלים (both students merged under descriptive name)
    expect(clusters[1][0]).toBe('גן "יובלים"');
    expect(clusters[1][1]).toHaveLength(2);
    expect(clusters[1][1].map((s) => s.name)).toEqual(['אליאב', 'עידן אבוהב']);
  });

  it('filters students by search ignoring quotes in query and student framework', () => {
    const students: StudentListItem[] = [
      { id: '1', name: 'אליאב', educationalFramework: '"יובלים"' },
      { id: '2', name: 'עידן', educationalFramework: 'גן "יובלים"' },
      { id: '3', name: 'דון', educationalFramework: 'גן "אלון"' }
    ];

    expect(filterStudentsBySearch(students, 'יובלים')).toHaveLength(2);
    expect(filterStudentsBySearch(students, '"אלון"')).toHaveLength(1);
    expect(filterStudentsBySearch(students, 'אלון')).toHaveLength(1);
  });
});
