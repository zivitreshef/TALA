import { describe, it, expect } from 'vitest';
import { buildAdminBankGoalPayload } from '../domain/goalBankAdmin';
import { KINDERGARTEN_ENVIRONMENTS } from '../goalBankData';

describe('buildAdminBankGoalPayload', () => {
  it('trims title, defaults stages and environment', () => {
    const p = buildAdminBankGoalPayload({
      title: '  מטרה ',
      environment: '',
      suggestedObjectivesText: 'א'
    });
    expect(p).toMatchObject({
      title: 'מטרה',
      stages: ['kindergarten'],
      environment: KINDERGARTEN_ENVIRONMENTS[0],
      suggestedObjectives: 'א'
    });
  });
});
