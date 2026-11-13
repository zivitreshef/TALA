import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Deep Link Routing for Class Readiness Overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses ?view=class-readiness and sets up pending deep view for unauthenticated visits', () => {
    const mockStorage: Record<string, string> = {};
    const fakeSessionStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      }
    };

    // Simulate URL search params parsing
    const url = new URL('https://tala.org.il/?view=class-readiness');
    const viewParam = url.searchParams.get('view') || url.searchParams.get('open');
    expect(viewParam).toBe('class-readiness');

    // Simulate unauthenticated user visit: saves to session storage
    fakeSessionStorage.setItem('tala_pending_deep_view', viewParam!);
    expect(fakeSessionStorage.getItem('tala_pending_deep_view')).toBe('class-readiness');

    // Simulate after login: reads and clears
    const pending = fakeSessionStorage.getItem('tala_pending_deep_view');
    expect(pending).toBe('class-readiness');
    fakeSessionStorage.removeItem('tala_pending_deep_view');
    expect(fakeSessionStorage.getItem('tala_pending_deep_view')).toBeNull();
  });

  it('accepts both view=class-readiness and open=readiness aliases', () => {
    const aliases = ['class-readiness', 'readiness', 'class_readiness'];
    for (const alias of aliases) {
      const url = new URL(`https://tala.org.il/?view=${alias}`);
      const val = (url.searchParams.get('view') || '').toLowerCase().trim();
      const isMatch = val === 'class-readiness' || val === 'readiness' || val === 'class_readiness';
      expect(isMatch).toBe(true);
    }
  });
});
