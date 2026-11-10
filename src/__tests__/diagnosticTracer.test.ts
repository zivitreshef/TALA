import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { diagnosticTracer } from '../services/diagnosticTracer';
import SystemHealthPanel from '../components/modals/SystemHealthPanel';

describe('DiagnosticTracer Service & End-User Debug Mode', () => {
  beforeEach(() => {
    diagnosticTracer.clear();
    diagnosticTracer.setDebugMode(false);
  });

  it('detects debug mode when explicitly set via setDebugMode', () => {
    expect(diagnosticTracer.isDebugModeEnabled()).toBe(false);
    diagnosticTracer.setDebugMode(true);
    expect(diagnosticTracer.isDebugModeEnabled()).toBe(true);
  });

  it('records breadcrumbs with trace, debug, info, warn, and error levels', () => {
    diagnosticTracer.trace('form', 'Navigated to school step');
    diagnosticTracer.debug('aiProxyClient', 'Sending payload', { model: 'gemini-2.5-flash', count: 1 });
    diagnosticTracer.warn('cache', 'Storage high');
    diagnosticTracer.error('network', 'Failed to fetch', { status: 0 });

    const breadcrumbs = diagnosticTracer.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(4);
    expect(breadcrumbs[0].level).toBe('TRACE');
    expect(breadcrumbs[0].category).toBe('form');
    expect(breadcrumbs[1].level).toBe('DEBUG');
    expect(breadcrumbs[2].level).toBe('WARN');
    expect(breadcrumbs[3].level).toBe('ERROR');
  });

  it('sanitizes sensitive student and secret keys in details (privacy first)', () => {
    diagnosticTracer.debug('securityTest', 'Mask check', {
      studentName: 'יונתן לוי',
      prompt: 'פרטי תלמיד סודיים',
      stage: 'school',
      password: '123'
    });

    const last = diagnosticTracer.getBreadcrumbs()[0];
    expect(last.details?.studentName).toBe('[REDACTED]');
    expect(last.details?.prompt).toBe('[REDACTED]');
    expect(last.details?.password).toBe('[REDACTED]');
    expect(last.details?.stage).toBe('school');
  });

  it('limits ring buffer to 200 items, dropping oldest items first', () => {
    for (let i = 0; i < 220; i++) {
      diagnosticTracer.debug('loop', `Step ${i}`);
    }

    const breadcrumbs = diagnosticTracer.getBreadcrumbs();
    expect(breadcrumbs).toHaveLength(200);
    expect(breadcrumbs[0].message).toBe('Step 20');
    expect(breadcrumbs[199].message).toBe('Step 219');
  });

  it('formats breadcrumbs into standard Log4j plain-text layout', () => {
    diagnosticTracer.debug('aiProxyClient', 'Call started');
    diagnosticTracer.error('aiProxyClient', 'Call failed', { code: 'NETWORK_ERR' });

    const logText = diagnosticTracer.formatLog4j();
    expect(logText).toContain('# TALA Client-Side Diagnostic Trace Log (Log4j Format)');
    expect(logText).toContain('[DEBUG] [aiProxyClient] - Call started');
    expect(logText).toContain('[ERROR] [aiProxyClient] - Call failed [details=');
  });

  it('generates clear, copyable Hebrew guidance text for the teacher', () => {
    const guidance = diagnosticTracer.getTeacherGuidanceText('https://test.tala.app/app');
    expect(guidance).toContain('https://test.tala.app/app?debug=true');
    expect(guidance).toContain('אנא היכנסי למערכת דרך הקישור הייעודי הבא:');
    expect(guidance).toContain('הורדת יומן אבחון');
  });
});

describe('SystemHealthPanel Diagnostic Guide UI Integration', () => {
  it('renders the diagnostic guide button in SystemHealthPanel', () => {
    const html = renderToStaticMarkup(
      React.createElement(SystemHealthPanel, {
        healthEvents: [],
        healthReviewedMs: 0,
        cloudSyncState: { connected: true, status: 'synced' },
        onMarkHealthReviewed: vi.fn(),
        onClearHealthEvents: vi.fn()
      })
    );

    expect(html).toContain('הנחיות אבחון למורה');
  });
});
