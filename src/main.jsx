import React from 'react';
import ReactDOM from 'react-dom/client';
import { parseInviteTokenFromHash } from './domain/parentInvite';
import ErrorBoundary from './components/ErrorBoundary';
import { usageTelemetryService } from './services/usageTelemetryService';
import { setupUsageTelemetryTransport } from './services/telemetryStorage';
import { TELEMETRY_EVENTS } from './domain/telemetryTaxonomy';
import './index.css';

// Initialize usage telemetry transport
setupUsageTelemetryTransport(usageTelemetryService);

// Global error fallback to guard against blank white screens on iOS / iPadOS
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[GlobalWindowError]', event.error || event.message);
    try {
      const errName = event.error?.name || 'WindowError';
      const errMsg = String(event.error?.message || event.message || 'Unknown error').slice(0, 100);
      usageTelemetryService.track(TELEMETRY_EVENTS.CLIENT_JS_ERROR, {
        errorCode: errName,
        errorType: errName,
        componentName: 'window',
        errorMessageClamped: errMsg
      });
    } catch (_) {}

    const root = document.getElementById('root');
    if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
      root.innerHTML = `
        <div dir="rtl" style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff5f5; color: #991b1b; border: 2px solid #f87171; border-radius: 12px; margin: 20px; line-height: 1.6;">
          <h2 style="margin: 0 0 10px 0;">אירעה שגיאה בטעינת המערכת</h2>
          <p style="margin: 0 0 12px 0;">המערכת זיהתה שגיאה בלתי צפויה בתצוגה. אנא נסו לרענן את העמוד:</p>
          <pre style="direction: ltr; text-align: left; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #fca5a5; font-size: 12px; overflow-x: auto;">${String(event.error?.stack || event.message || 'Unknown error').replace(/</g, '&lt;')}</pre>
          <button onclick="window.location.reload()" style="margin-top: 12px; padding: 10px 20px; background: #dc2626; color: #ffffff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">רענן עמוד</button>
        </div>
      `;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event?.reason;
      const errName = reason?.name || 'UnhandledRejection';
      const errMsg = String(reason?.message || reason || 'Unhandled promise rejection').slice(0, 100);
      usageTelemetryService.track(TELEMETRY_EVENTS.CLIENT_JS_ERROR, {
        errorCode: errName,
        errorType: errName,
        componentName: 'window_promise',
        errorMessageClamped: errMsg
      });
    } catch (_) {}
  });

  const recordPageLoad = () => {
    try {
      const loadTime = typeof performance !== 'undefined' && performance.now ? Math.round(performance.now()) : 0;
      usageTelemetryService.track(TELEMETRY_EVENTS.PAGE_LOAD_RECORDED, {
        loadDurationMs: loadTime,
        loadTimeMs: loadTime
      });
    } catch (_) {}
  };

  if (document.readyState === 'complete') {
    recordPageLoad();
  } else {
    window.addEventListener('load', recordPageLoad, { once: true });
  }
}

// Public parent/student link (#/share-input/<token>) renders a standalone page:
// no login gate, and the main App bundle is never downloaded.
const inviteToken = parseInviteTokenFromHash(window.location.hash);

async function boot() {
  const Page = inviteToken
    ? (await import('./components/public/ParentStudentInputView')).default
    : (await import('./App')).default;
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary onReset={() => window.location.reload()}>
        <Page token={inviteToken} />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

boot();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
