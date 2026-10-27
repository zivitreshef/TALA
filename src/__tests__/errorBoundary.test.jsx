import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorBoundary from '../components/ErrorBoundary';
import * as storageService from '../services/storage';

describe('ErrorBoundary Component Resilience & Quota Recovery Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error has occurred', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement('div', null, 'Safe pedagogical workspace content')
      )
    );

    expect(html).toContain('Safe pedagogical workspace content');
    expect(html).not.toContain('אירעה שגיאה בלתי צפויה');
  });

  it('getDerivedStateFromError transitions state to hasError: true', () => {
    const error = new Error('Test component failure');
    const derived = ErrorBoundary.getDerivedStateFromError(error);
    expect(derived).toEqual({ hasError: true, error });
  });

  it('renders standard error fallback without quota alert for ordinary errors', () => {
    const boundary = new ErrorBoundary({});
    boundary.state = {
      hasError: true,
      error: new Error('Cannot read properties of undefined')
    };

    const element = boundary.render();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('אירעה שגיאה בלתי צפויה בתצוגת הרכיב');
    expect(html).toContain('Cannot read properties of undefined');
    expect(html).toContain('שחזור תצוגה והמשך עבודה');
    expect(html).not.toContain('ניקוי מטמון וטעינה מחדש');
    expect(html).not.toContain('זוהתה מגבלת אחסון מקומי בדפדפן');
  });

  it('detects quota exceeded / b815 assertion failure and renders recovery alert & button', () => {
    const quotaError = new Error(
      'FIRESTORE (12.19.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815) CONTEXT: {"tl":"The quota has been exceeded.\\nsetItem@[native code]"}'
    );
    const boundary = new ErrorBoundary({});
    boundary.state = {
      hasError: true,
      error: quotaError
    };

    const element = boundary.render();
    const html = renderToStaticMarkup(element);

    expect(html).toContain('זוהתה מגבלת אחסון מקומי בדפדפן');
    expect(html).toContain('ניקוי מטמון וטעינה מחדש');
    expect(html).toContain('FIRESTORE (12.19.0) INTERNAL ASSERTION FAILED');
  });

  it('handleReset resets error state and fires props.onReset callback', () => {
    const onReset = vi.fn();
    const boundary = new ErrorBoundary({ onReset });
    boundary.state = { hasError: true, error: new Error('Err') };
    boundary.setState = vi.fn((newState) => {
      boundary.state = { ...boundary.state, ...newState };
    });

    boundary.handleReset();

    expect(boundary.setState).toHaveBeenCalledWith({ hasError: false, error: null });
    expect(onReset).toHaveBeenCalled();
  });

  it('handleClearCacheAndReload triggers pruneStaleFirestoreKeys and reloads window', () => {
    const pruneSpy = vi.spyOn(storageService, 'pruneStaleFirestoreKeys').mockReturnValue(4);
    const reloadMock = vi.fn();
    vi.stubGlobal('window', {
      location: { reload: reloadMock }
    });

    const boundary = new ErrorBoundary({});
    boundary.handleClearCacheAndReload();

    expect(pruneSpy).toHaveBeenCalled();
    expect(reloadMock).toHaveBeenCalled();
  });
});
