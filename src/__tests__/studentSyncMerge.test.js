import { describe, it, expect } from 'vitest';
import {
  mergeObservationsLists,
  mergeGoalObjects,
  mergeStudentSnapshots,
  mergeTeamMessages
} from '../domain/studentSyncMerge';

describe('studentSyncMerge (Multi-Disciplinary & Field-Level Saves)', () => {
  it('merges observations lists without duplicates preserving order', () => {
    const local = [
      { id: 'obs1', dateIso: '2026-10-15T08:00:00Z', note: 'השתתפות יפה' }
    ];
    const server = [
      { id: 'obs1', dateIso: '2026-10-15T08:00:00Z', note: 'השתתפות יפה' },
      { id: 'obs2', dateIso: '2026-10-16T09:00:00Z', note: 'עצמאות מלאה' }
    ];
    const merged = mergeObservationsLists(local, server);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('obs1');
    expect(merged[1].id).toBe('obs2');
  });

  it('reconciles simultaneous edits across different goals without overwriting', () => {
    const base = {
      id: 'st_1',
      name: 'אביגיל',
      goals: [
        { id: 'g1', title: 'מטרה 1 ישנה', leadProfessional: 'צוות משותף' },
        { id: 'g2', title: 'מטרה 2 ישנה', leadProfessional: 'צוות משותף' }
      ]
    };

    // Teacher A (homeroom) updated Goal 1
    const local = {
      ...base,
      goals: [
        { id: 'g1', title: 'מטרה 1 מעודכנת ע"י מחנכת', leadProfessional: 'מחנכת הכיתה' },
        { id: 'g2', title: 'מטרה 2 ישנה', leadProfessional: 'צוות משותף' }
      ]
    };

    // Teacher B (speech therapist) concurrently updated Goal 2 and assigned leadership
    const server = {
      ...base,
      goals: [
        { id: 'g1', title: 'מטרה 1 ישנה', leadProfessional: 'צוות משותף' },
        { id: 'g2', title: 'מטרה 2 מעודכנת ע"י קלינאית', leadProfessional: 'קלינאית תקשורת' }
      ]
    };

    const reconciled = mergeStudentSnapshots({
      localStudent: local,
      serverStudent: server,
      baseSnapshot: base
    });

    expect(reconciled.goals).toHaveLength(2);
    const g1 = reconciled.goals.find((g) => g.id === 'g1');
    const g2 = reconciled.goals.find((g) => g.id === 'g2');

    expect(g1.title).toBe('מטרה 1 מעודכנת ע"י מחנכת');
    expect(g1.leadProfessional).toBe('מחנכת הכיתה');

    expect(g2.title).toBe('מטרה 2 מעודכנת ע"י קלינאית');
    expect(g2.leadProfessional).toBe('קלינאית תקשורת');
  });

  it('merges team messages union by id and sorts chronologically', () => {
    const local = [
      { id: 'm1', text: 'הודעה 1', createdAt: '2026-10-20T10:00:00Z' }
    ];
    const server = [
      { id: 'm1', text: 'הודעה 1', createdAt: '2026-10-20T10:00:00Z' },
      { id: 'm2', text: 'הודעה 2', createdAt: '2026-10-20T11:00:00Z' }
    ];

    const merged = mergeTeamMessages(local, server);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('m1');
    expect(merged[1].id).toBe('m2');
  });

  it('reconciles simultaneous edits preserving concurrent team messages from colleagues', () => {
    const base = {
      id: 'st_1',
      teamMessages: [
        { id: 'm1', text: 'הודעת פתיחה', createdAt: '2026-10-20T10:00:00Z' }
      ]
    };

    // Homeroom teacher posted m2
    const local = {
      ...base,
      teamMessages: [
        ...base.teamMessages,
        { id: 'm2', text: 'עדכון מחנכת', createdAt: '2026-10-20T11:00:00Z' }
      ]
    };

    // Therapist concurrently posted m3
    const server = {
      ...base,
      teamMessages: [
        ...base.teamMessages,
        { id: 'm3', text: 'עדכון מטפלת', createdAt: '2026-10-20T12:00:00Z' }
      ]
    };

    const reconciled = mergeStudentSnapshots({
      localStudent: local,
      serverStudent: server,
      baseSnapshot: base
    });

    expect(reconciled.teamMessages).toHaveLength(3);
    expect(reconciled.teamMessages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('preserves readBy receipts as a set union in mergeTeamMessages so saving/locking never resets colleague unread status', () => {
    // Owner (Teacher 1) local snapshot has not yet recorded Colleague (Teacher 2) as reader
    const local = [
      {
        id: 'msg_handoff',
        text: 'תוכנית עבודה שותפה עמך',
        authorEmail: 'owner@tala.edu.il',
        readBy: ['owner@tala.edu.il'],
        createdAt: '2026-10-20T10:00:00Z'
      }
    ];

    // Colleague (Teacher 2) read the message on the server
    const server = [
      {
        id: 'msg_handoff',
        text: 'תוכנית עבודה שותפה עמך',
        authorEmail: 'owner@tala.edu.il',
        readBy: ['owner@tala.edu.il', 'colleague@tala.edu.il'],
        createdAt: '2026-10-20T10:00:00Z'
      }
    ];

    const merged = mergeTeamMessages(local, server);
    expect(merged).toHaveLength(1);
    expect(merged[0].readBy).toContain('owner@tala.edu.il');
    expect(merged[0].readBy).toContain('colleague@tala.edu.il');
  });

  it('preserves sharedReadBy union in mergeStudentSnapshots when owner locks a shared student plan', () => {
    // Owner locks the plan from an in-memory form that had empty sharedReadBy
    const local = {
      id: 'st_locked_1',
      name: 'איתמר',
      isLocked: true,
      lockedBy: 'מחנכת הכיתה',
      sharedWith: ['colleague@tala.edu.il'],
      sharedReadBy: [] // Stale local state
    };

    // Server already recorded that colleague viewed/read the shared report
    const server = {
      id: 'st_locked_1',
      name: 'איתמר',
      isLocked: false,
      sharedWith: ['colleague@tala.edu.il'],
      sharedReadBy: ['colleague@tala.edu.il']
    };

    const reconciled = mergeStudentSnapshots({
      localStudent: local,
      serverStudent: server
    });

    expect(reconciled.isLocked).toBe(true);
    expect(reconciled.sharedReadBy).toContain('colleague@tala.edu.il');
    expect(reconciled.sharedWith).toContain('colleague@tala.edu.il');
  });
});
