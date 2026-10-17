import { describe, it, expect, vi } from 'vitest';

describe('Mobile Master-Detail Navigation & Auto-Save Logic', () => {
  it('auto-saves unsaved draft when navigating back from student plan to roster', () => {
    let savedStudent = null;
    let selectedStudentId = 'st_123';
    let draftState = {
      isDirty: true,
      draftData: {
        id: 'st_123',
        name: 'דניאל כהן',
        educationalFramework: 'גן שילוב אלון',
        goals: [{ id: 'g_1', title: 'שיפור מיומנויות תקשורת' }]
      }
    };

    const handleSaveStudentPlan = vi.fn((studentData) => {
      savedStudent = studentData;
    });

    const handleNavigateBackToStudents = () => {
      if (draftState.isDirty && draftState.draftData) {
        handleSaveStudentPlan(draftState.draftData);
        draftState = { isDirty: false, draftData: null };
      }
      selectedStudentId = null;
    };

    handleNavigateBackToStudents();

    expect(handleSaveStudentPlan).toHaveBeenCalledTimes(1);
    expect(savedStudent).toEqual({
      id: 'st_123',
      name: 'דניאל כהן',
      educationalFramework: 'גן שילוב אלון',
      goals: [{ id: 'g_1', title: 'שיפור מיומנויות תקשורת' }]
    });
    expect(selectedStudentId).toBeNull();
    expect(draftState.isDirty).toBe(false);
  });

  it('does not trigger redundant saves if draft is clean', () => {
    let selectedStudentId = 'st_456';
    let draftState = { isDirty: false, draftData: null };
    const handleSaveStudentPlan = vi.fn();

    const handleNavigateBackToStudents = () => {
      if (draftState.isDirty && draftState.draftData) {
        handleSaveStudentPlan(draftState.draftData);
        draftState = { isDirty: false, draftData: null };
      }
      selectedStudentId = null;
    };

    handleNavigateBackToStudents();

    expect(handleSaveStudentPlan).not.toHaveBeenCalled();
    expect(selectedStudentId).toBeNull();
  });

  it('determines the correct layout state class for master-detail view', () => {
    const getWorkspaceLayoutClass = (selectedStudent) =>
      `tala-workspace-layout ${selectedStudent ? 'has-selected-student' : 'no-selected-student'}`;

    expect(getWorkspaceLayoutClass(null)).toBe('tala-workspace-layout no-selected-student');
    expect(getWorkspaceLayoutClass({ id: 'st_1', name: 'מאיה' })).toBe(
      'tala-workspace-layout has-selected-student'
    );
  });
});
