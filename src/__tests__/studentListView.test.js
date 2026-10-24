import { describe, it, expect } from 'vitest';
import {
  NO_FRAMEWORK_LABEL,
  filterStudentsBySearch,
  sortStudentsByFramework,
  groupStudentsByFramework,
  resolveBankTargetStudent
} from '../domain/studentListView';

const s = [
  { id: '1', name: 'תמר', educationalFramework: 'גן חצב' },
  { id: '2', name: 'אורי', educationalFramework: '' },
  { id: '3', name: 'בן', educationalFramework: 'גן חצב' }
];

describe('studentListView', () => {
  it('filters by name or framework', () => {
    expect(filterStudentsBySearch(s, 'חצב').map((x) => x.id)).toEqual(['1', '3']);
    expect(filterStudentsBySearch(s, '').length).toBe(3);
  });
  it('sorts by framework then name, unassigned under the placeholder label', () => {
    const ids = sortStudentsByFramework(s).map((x) => x.id);
    expect(ids.indexOf('3')).toBeLessThan(ids.indexOf('1'));
    expect(s.map((x) => x.id)).toEqual(['1', '2', '3']); // not mutated
  });
  it('groups unassigned students under NO_FRAMEWORK_LABEL', () => {
    const groups = Object.fromEntries(groupStudentsByFramework(s));
    expect(groups[NO_FRAMEWORK_LABEL].map((x) => x.id)).toEqual(['2']);
  });
  it('resolves bank target: explicit → selected → first → null', () => {
    expect(resolveBankTargetStudent(s, '3', '1').id).toBe('3');
    expect(resolveBankTargetStudent(s, null, '2').id).toBe('2');
    expect(resolveBankTargetStudent(s, 'zz', null).id).toBe('1');
    expect(resolveBankTargetStudent([], null, null)).toBeNull();
  });
});
