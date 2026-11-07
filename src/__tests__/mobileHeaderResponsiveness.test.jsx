import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DailyPedagogicalTracker from '../components/DailyPedagogicalTracker';
import fs from 'fs';
import path from 'path';

describe('Mobile Header Responsiveness & Hebrew-Only UI Labels', () => {
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

  it('renders tracker header actions with Hebrew-only labels and no English in parentheses', () => {
    const markup = renderToStaticMarkup(
      <DailyPedagogicalTracker
        students={[]}
        currentUser={{ email: 'teacher@school.gov.il' }}
        onClose={vi.fn()}
      />
    );

    // Ensure the export button is strictly Hebrew
    expect(markup).toContain('ייצוא ליומן');
    expect(markup).not.toContain('קובץ .ics');
    expect(markup).toContain('חזרה לניהול תלמידים');
    expect(markup).toContain('tracker-header-actions');
    expect(markup).toContain('btn-cal-sync');
    expect(markup).toContain('btn-cal-close');
  });

  it('verifies CSS rules contain mobile responsiveness definitions for iPhone', () => {
    const trackerCss = fs.readFileSync(
      path.resolve(__dirname, '../components/DailyPedagogicalTracker.css'),
      'utf8'
    );
    expect(trackerCss).toContain('@media (max-width: 640px)');
    expect(trackerCss).toContain('.tracker-header-actions');
    expect(trackerCss).toContain('.mode-toggle-group');

    const indexCss = fs.readFileSync(
      path.resolve(__dirname, '../index.css'),
      'utf8'
    );
    expect(indexCss).toContain('.header-nav-segment');
    expect(indexCss).toContain('.header-user-role');
    expect(indexCss).toContain('display: none');
  });
});
