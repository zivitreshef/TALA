import { describe, it, expect } from 'vitest';
import {
  personalizeBankItem,
  fillGoalRowFromBank,
  appendBankGoalToStudent
} from '../domain/bankGoalApplication';
import { adaptTextToGender } from '../goalBankData';

const girl = {
  id: 's1',
  name: 'נועה כהן',
  gender: 'girl',
  goals: [],
  schoolYear: 'תשפ"ו (2025-2026)'
};
const item = {
  title: 'ישתתף בשיח',
  environment: 'כיתה',
  defaultOpportunities: 'הילד ישחק',
  suggestedObjectives: ['ימתין לתורו']
};

describe('bankGoalApplication', () => {
  it('personalizes name and gender (including opportunities — DECISION 1)', () => {
    const p = personalizeBankItem(item, girl);
    expect(p.title).toBe(adaptTextToGender(item.title, 'girl'));
    expect(p.opportunities.startsWith('נועה')).toBe(true);
    expect(p.opportunities).toBe(adaptTextToGender('נועה ישחק', 'girl'));
    expect(p.objectives).toBe(`• ${adaptTextToGender('ימתין לתורו', 'girl')}`);
  });
  it('fillTemplate=false only sets title + environment', () => {
    const g = fillGoalRowFromBank(
      { id: 'g1', objectives: 'קיים' },
      item,
      girl,
      { fillTemplate: false }
    );
    expect(g).toMatchObject({
      environment: 'כיתה',
      isTeacherModified: true,
      objectives: 'קיים'
    });
    expect(g.opportunities).toBeUndefined();
  });
  it('fillTemplate=true keeps teacher text already in the row', () => {
    expect(
      fillGoalRowFromBank({ id: 'g1', objectives: 'קיים' }, item, girl).objectives
    ).toBe('קיים');
  });
  it('appends once, replaces a lone empty goal, and refuses duplicates', () => {
    const r1 = appendBankGoalToStudent({ ...girl, goals: [{ id: 'empty' }] }, item);
    expect(r1.added).toBe(true);
    expect(r1.student.goals).toHaveLength(1);
    expect(r1.student.reportsByYear['תשפ"ו (2025-2026)'].goals).toHaveLength(1);
    const r2 = appendBankGoalToStudent(r1.student, item);
    expect(r2.added).toBe(false);
    expect(r2.student).toBe(r1.student);
  });
});
