/**
 * Application Reload Service
 * Flushes active in-memory state, updates service worker registrations,
 * and performs a clean navigation reload to fetch the latest production bundle.
 */

export function reloadApplication(): void {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const reg of registrations) {
            reg.update().catch(() => {});
          }
        })
        .catch(() => {});
    }
  } catch (_) {}

  if (typeof window !== 'undefined' && window.location) {
    try {
      if (typeof window.location.replace === 'function') {
        window.location.replace(window.location.pathname);
      } else if (typeof window.location.reload === 'function') {
        window.location.reload();
      }
    } catch (_) {
      try {
        if (typeof window.location.reload === 'function') {
          window.location.reload();
        }
      } catch (_) {}
    }
  }
}
