import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

describe('useOnlineStatus hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders online by default in SSR / Node environment', () => {
    function DummyConsumer() {
      const { isOnline, justReconnected } = useOnlineStatus();
      return (
        <div>
          <span className="online-val">{String(isOnline)}</span>
          <span className="reconnected-val">{String(justReconnected)}</span>
        </div>
      );
    }

    const html = renderToStaticMarkup(<DummyConsumer />);
    expect(html).toContain('<span class="online-val">true</span>');
    expect(html).toContain('<span class="reconnected-val">false</span>');
  });

  it('hook module exports useOnlineStatus function properly', () => {
    expect(typeof useOnlineStatus).toBe('function');
  });
});
