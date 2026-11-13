import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import NetworkOfflineBanner from '../components/NetworkOfflineBanner';

describe('NetworkOfflineBanner component', () => {
  it('renders null when online and not just reconnected', () => {
    const html = renderToStaticMarkup(
      <NetworkOfflineBanner isOnline={true} justReconnected={false} />
    );
    expect(html).toBe('');
  });

  it('renders offline alert banner when offline with clean Hebrew reassurance', () => {
    const html = renderToStaticMarkup(
      <NetworkOfflineBanner
        isOnline={false}
        justReconnected={false}
        isDirty={true}
        onSaveCurrentWork={vi.fn()}
      />
    );

    expect(html).toContain('tala-network-offline-banner');
    expect(html).toContain('אין חיבור לאינטרנט – הנתונים נשמרים במכשירך');
    expect(html).toContain('כל הנתונים יסונכרנו אוטומטית לענן ברגע שהחיבור יתחדש');
    expect(html).toContain('ישנם שינויים חדשים שניתן לשמור במכשיר');
    expect(html).toContain('שמור במכשיר כעת');

    // Strict rule: No English parentheses anywhere in rendered text
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });

  it('renders reconnected success banner when justReconnected is true', () => {
    const html = renderToStaticMarkup(
      <NetworkOfflineBanner
        isOnline={true}
        justReconnected={true}
      />
    );

    expect(html).toContain('tala-network-reconnected-banner');
    expect(html).toContain('חיבור האינטרנט חודש');
    expect(html).toContain('הנתונים והשינויים מסונכרנים כעת לענן באופן אוטומטי');
  });
});
