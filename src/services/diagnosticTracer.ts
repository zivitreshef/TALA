import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';

export type TraceLogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface TraceBreadcrumb {
  timestampMs: number;
  timestampIso: string;
  level: TraceLogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown> | null;
}

const STORAGE_DEBUG_KEY = 'tala_debug_mode';
const MAX_RING_BUFFER_SIZE = 200;

class DiagnosticTracer {
  private _buffer: TraceBreadcrumb[] = [];
  private _explicitEnabled: boolean | null = null;
  private _isLoggingInternally = false;
  private _interceptorsInstalled = false;

  constructor() {
    this._initGlobalErrorCatchers();
    this._initGlobalInteractions();
    this._initNetworkAndConsole();
  }

  /** Checks if debug/trace mode is active via URL params, localStorage, or programmatic toggle. */
  public isDebugModeEnabled(): boolean {
    if (this._explicitEnabled !== null) {
      return this._explicitEnabled;
    }

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        if (
          params.get('debug') === 'true' ||
          params.get('debug') === '1' ||
          params.get('trace') === 'true' ||
          params.get('trace') === '1'
        ) {
          return true;
        }

        const stored = window.localStorage?.getItem(STORAGE_DEBUG_KEY);
        if (stored === 'true' || stored === '1') {
          return true;
        }
      } catch (_) {
        // LocalStorage access may be restricted in sandboxed iframes
      }
    }

    return false;
  }

  /** Sets debug mode and persists to localStorage. */
  public setDebugMode(enabled: boolean): void {
    this._explicitEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        if (enabled) {
          window.localStorage?.setItem(STORAGE_DEBUG_KEY, 'true');
        } else {
          window.localStorage?.removeItem(STORAGE_DEBUG_KEY);
        }
      } catch (_) {}
    }
  }

  /** Records a breadcrumb in the ring buffer. Emits to browser console if debug mode is on. */
  public record(
    level: TraceLogLevel,
    category: string,
    message: string,
    details?: Record<string, unknown> | null
  ): void {
    const now = Date.now();
    const safeDetails = details ? this._sanitizeDetails(details) : null;

    const entry: TraceBreadcrumb = {
      timestampMs: now,
      timestampIso: new Date(now).toISOString(),
      level,
      category,
      message,
      details: safeDetails
    };

    this._buffer.push(entry);
    if (this._buffer.length > MAX_RING_BUFFER_SIZE) {
      this._buffer.shift();
    }

    if (this.isDebugModeEnabled() && typeof console !== 'undefined' && !this._isLoggingInternally) {
      this._isLoggingInternally = true;
      const prefix = `[TALA:${level}] [${category}]`;
      const color =
        level === 'ERROR'
          ? '#ef4444'
          : level === 'WARN'
            ? '#f59e0b'
            : level === 'INFO'
              ? '#10b981'
              : '#3b82f6';

      try {
        if (level === 'ERROR') {
          console.error(`%c${prefix} ${message}`, `color:${color};font-weight:bold`, safeDetails || '');
        } else if (level === 'WARN') {
          console.warn(`%c${prefix} ${message}`, `color:${color};font-weight:bold`, safeDetails || '');
        } else if (level === 'INFO') {
          console.info(`%c${prefix} ${message}`, `color:${color}`, safeDetails || '');
        } else if (level === 'DEBUG') {
          console.debug(`%c${prefix} ${message}`, `color:${color}`, safeDetails || '');
        } else {
          console.log(`%c${prefix} ${message}`, `color:${color}`, safeDetails || '');
        }
      } catch (_) {
      } finally {
        this._isLoggingInternally = false;
      }
    }
  }

  public trace(category: string, message: string, details?: Record<string, unknown>): void {
    this.record('TRACE', category, message, details);
  }

  public debug(category: string, message: string, details?: Record<string, unknown>): void {
    this.record('DEBUG', category, message, details);
  }

  public info(category: string, message: string, details?: Record<string, unknown>): void {
    this.record('INFO', category, message, details);
  }

  public warn(category: string, message: string, details?: Record<string, unknown>): void {
    this.record('WARN', category, message, details);
  }

  public error(category: string, message: string, details?: Record<string, unknown>): void {
    this.record('ERROR', category, message, details);
  }

  /** Returns all current breadcrumbs in memory. */
  public getBreadcrumbs(): TraceBreadcrumb[] {
    return [...this._buffer];
  }

  /** Clears the in-memory ring buffer. */
  public clear(): void {
    this._buffer = [];
  }

  /** Formats breadcrumbs into Log4j text layout. */
  public formatLog4j(): string {
    const breadcrumbs = this._buffer;
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const lines: string[] = [
      '# ============================================================================== ',
      '# TALA Client-Side Diagnostic Trace Log (Log4j Format)',
      `# Generated At: ${new Date().toISOString()}`,
      `# Application Version: ${CURRENT_APP_VERSION}`,
      `# Network Online: ${isOnline}`,
      `# Total Breadcrumbs Captured: ${breadcrumbs.length}`,
      '# ============================================================================== ',
      ''
    ];

    if (breadcrumbs.length === 0) {
      lines.push('# (No user actions or events were recorded in the session buffer)');
      return lines.join('\n');
    }

    for (const b of breadcrumbs) {
      const d = new Date(b.timestampMs);
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');
      const timeStr =
        [
          String(d.getHours()).padStart(2, '0'),
          String(d.getMinutes()).padStart(2, '0'),
          String(d.getSeconds()).padStart(2, '0')
        ].join(':') +
        '.' +
        String(d.getMilliseconds()).padStart(3, '0');

      const level = b.level.padEnd(5, ' ');
      const detailsSuffix =
        b.details && Object.keys(b.details).length > 0
          ? ` [details=${JSON.stringify(b.details)}]`
          : '';

      lines.push(`${dateStr} ${timeStr} [${level}] [${b.category}] - ${b.message}${detailsSuffix}`);
    }

    return lines.join('\n');
  }

  /** Triggers browser download of the diagnostic trace file. */
  public downloadTraceLog(filename?: string): void {
    if (typeof document === 'undefined') return;
    const content = this.formatLog4j();
    const now = new Date();
    const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const target = filename || `tala-diagnostic-trace-${dateTag}.log`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = target;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Generates ready-to-copy instructions for an admin to send to a teacher. */
  public getTeacherGuidanceText(systemUrl = 'https://zivitreshef.github.io/TALA/'): string {
    const cleanUrl = systemUrl.split('?')[0];
    const debugUrl = `${cleanUrl}?debug=true`;

    return `שלום, כדי שנוכל לזהות ולפתור את התקלה שנתקלת בה:
1. אנא היכנסי למערכת דרך הקישור הייעודי הבא:
   ${debugUrl}
2. בצעי שוב את הפעולה שגרמה לתקלה.
3. בסיום, לחצי על כפתור "הורדת יומן" (שמופיע בפינה השמאלית בתחתית המסך) ושלחי אלינו את הקובץ שירד.
תודה על העזרה בשיפור המערכת!`;
  }

  private _sanitizeDetails(obj: Record<string, unknown>): Record<string, unknown> {
    const safe: Record<string, unknown> = {};
    const prohibitedKeys = /prompt|studentname|name|first_name|last_name|password|token|secret/i;

    for (const [k, v] of Object.entries(obj)) {
      if (prohibitedKeys.test(k)) {
        safe[k] = '[REDACTED]';
      } else if (typeof v === 'string') {
        safe[k] = v.slice(0, 150);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        safe[k] = v;
      } else if (v && typeof v === 'object') {
        safe[k] = '[OBJECT]';
      }
    }
    return safe;
  }

  private _initGlobalErrorCatchers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('UnhandledWindowError', event.message || 'Window error triggered', {
          filename: event.filename ? String(event.filename).split('/').pop() : 'unknown',
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = (event as PromiseRejectionEvent).reason;
        const msg = typeof reason === 'object' && reason?.message ? reason.message : String(reason);
        this.error('UnhandledPromiseRejection', msg);
      });
    }
  }

  private _initGlobalInteractions(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener(
        'click',
        (e: MouseEvent) => {
          try {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            const interactive = target.closest<HTMLElement>(
              'button, a, input, select, textarea, [role="button"], [role="tab"], .tala-nav-item, [data-testid]'
            );
            if (!interactive) return;

            const rawLabel =
              interactive.getAttribute('aria-label') ||
              interactive.getAttribute('title') ||
              (interactive instanceof HTMLInputElement ? interactive.placeholder || interactive.value : null) ||
              interactive.innerText ||
              interactive.getAttribute('data-testid') ||
              interactive.id ||
              interactive.tagName;

            const cleanLabel = String(rawLabel || '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 45);

            if (cleanLabel) {
              this.trace('UserClick', `Clicked [${cleanLabel}]`, {
                tag: interactive.tagName.toLowerCase(),
                id: interactive.id || undefined
              });
            }
          } catch (_) {}
        },
        { capture: true, passive: true }
      );
    }
  }

  private _initNetworkAndConsole(): void {
    if (this._interceptorsInstalled) return;
    this._interceptorsInstalled = true;

    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (...args: Parameters<typeof fetch>) => {
        const startTime = Date.now();
        const firstArg = args[0];
        let urlStr = 'unknown';
        if (typeof firstArg === 'string') {
          urlStr = firstArg;
        } else if (firstArg instanceof URL) {
          urlStr = firstArg.toString();
        } else if (firstArg && typeof firstArg === 'object' && 'url' in firstArg) {
          urlStr = (firstArg as Request).url;
        }

        // Clean query strings to prevent leaking tokens
        const sanitizedUrl = urlStr.split('?')[0].slice(-60);
        const method = (args[1]?.method || 'GET').toUpperCase();

        try {
          const res = await originalFetch(...args);
          const durationMs = Date.now() - startTime;
          // Only record network calls in trace buffer
          this.trace('Network', `${method} ${sanitizedUrl} -> ${res.status} (${durationMs}ms)`, {
            status: res.status,
            durationMs
          });
          return res;
        } catch (err: unknown) {
          const durationMs = Date.now() - startTime;
          const msg = (err as Error)?.message || 'Network request failed';
          this.error('Network', `${method} ${sanitizedUrl} -> FAILED: ${msg} (${durationMs}ms)`, {
            durationMs
          });
          throw err;
        }
      };
    }

    // Record session initialization
    if (typeof window !== 'undefined') {
      this.info('Lifecycle', `TALA session initialized (ver. ${CURRENT_APP_VERSION})`, {
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        debugMode: this.isDebugModeEnabled()
      });
    }
  }
}

export const diagnosticTracer = new DiagnosticTracer();
