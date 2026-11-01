import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';

describe('DailyPedagogicalTracker Runtime Render & TDZ Resilience', () => {
  let mockStore = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key) => (key in mockStore ? mockStore[key] : null)),
      setItem: vi.fn((key, val) => {
        mockStore[key] = String(val);
      }),
      removeItem: vi.fn((key) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      })
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders successfully without throwing ReferenceError or Cannot access before initialization', () => {
    const mockStudents = [
      {
        id: 'st_1',
        name: 'יונתן לוי',
        goals: [
          {
            id: 'g_1',
            title: 'שיפור ויסות תנועתי במליאה',
            domain: 'התנהגותי',
            currentProgress: 60,
            observations: []
          }
        ]
      }
    ];

    expect(() => {
      renderToStaticMarkup(
        <DailyPedagogicalTracker
          students={mockStudents}
          currentUser={{ email: 'test.teacher@school.gov.il' }}
          activeOnboardingStep={5}
          onUpdateStudent={vi.fn()}
          onSelectStudent={vi.fn()}
          onClose={vi.fn()}
        />
      );
    }).not.toThrow();
  });

  it('renders properly when students list is empty', () => {
    expect(() => {
      renderToStaticMarkup(
        <DailyPedagogicalTracker
          students={[]}
          currentUser={{ email: 'new.teacher@school.gov.il' }}
          activeOnboardingStep={5}
          onUpdateStudent={vi.fn()}
          onSelectStudent={vi.fn()}
          onClose={vi.fn()}
        />
      );
    }).not.toThrow();
  });
});
