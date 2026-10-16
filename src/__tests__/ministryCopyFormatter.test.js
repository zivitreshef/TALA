import { describe, it, expect } from 'vitest';
import {
  buildMinistryCopyBlocks,
  formatAllMinistryBlocks
} from '../domain/ministryCopyFormatter';

describe('ministryCopyFormatter', () => {
  const sampleStudent = {
    name: 'דניאל כהן',
    idNumber: '123456789',
    educationalFramework: 'בי"ס אופק',
    schoolYear: 'תשפ"ו',
    planType: 'תל"א',
    studentGeneralBackground: 'דניאל כהן אוהב שיעורי מדעים',
    strengthsExisting: 'סקרן ובעל מוטיבציה',
    goals: [
      {
        environment: 'כיתה ולימודים',
        title: 'דניאל כהן ישפר קשב בשיעור',
        objectives: 'ישב 15 דקות רצופות',
        duration: '3 חודשים',
        opportunities: 'תיווך פרטני',
        evaluationCriteria: 'תצפית שבועית',
        midYearEvaluation: 'דניאל כהן התקדם יפה'
      }
    ],
    recommendations: 'להמשיך בחיזוקים חיוביים'
  };

  it('builds background, goal, and evaluation blocks with privacy redaction when hideDetails=true', () => {
    const blocks = buildMinistryCopyBlocks(sampleStudent, true);
    expect(blocks.map((b) => b.id)).toEqual(['background', 'goal-1', 'evaluation']);

    const fullText = formatAllMinistryBlocks(blocks);
    expect(fullText).not.toContain('דניאל כהן');
    expect(fullText).not.toContain('123456789');
    expect(fullText).toContain('ישב 15 דקות רצופות');
    expect(fullText).toContain('להמשיך בחיזוקים חיוביים');
  });

  it('preserves full student details when hideDetails=false', () => {
    const blocks = buildMinistryCopyBlocks(sampleStudent, false);
    const fullText = formatAllMinistryBlocks(blocks);
    expect(fullText).toContain('דניאל כהן');
    expect(fullText).toContain('123456789');
  });
});
