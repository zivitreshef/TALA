import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SiteFooter from '../components/SiteFooter';
import { CURRENT_APP_VERSION } from '../domain/telemetryTaxonomy';

describe('SiteFooter & RgM Branding Component', () => {
  it('renders correctly with default application version and semantic contentinfo role', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('role="contentinfo"');
    expect(html).toContain('tala-site-footer');
    expect(html).toContain('פותח ומתוחזק על ידי');
    expect(html).toContain('RgM');
    expect(html).toContain(`ver. ${CURRENT_APP_VERSION}`);
    expect(html).toContain('כל הזכויות שמורות למערכת תל״א');
  });

  it('renders custom siteVersion when provided as prop', () => {
    const customVersion = '3.0.5';
    const html = renderToStaticMarkup(<SiteFooter siteVersion={customVersion} />);

    expect(html).toContain(`ver. ${customVersion}`);
    expect(html).toContain(`גרסה פעילה: ver. ${customVersion}`);
  });

  it('renders the optimized RgM logo with accessibility alt attribute', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('src="./rgm-logo.png"');
    expect(html).toContain('alt="לוגו RgM"');
    expect(html).toContain('class="tala-site-footer-logo"');
  });

  it('supports custom className for flexible layout integration', () => {
    const html = renderToStaticMarkup(<SiteFooter className="custom-test-footer" />);

    expect(html).toContain('tala-site-footer custom-test-footer');
  });

  it('strictly adheres to Hebrew-only copy with zero English words in parentheses', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    // Zero English phrases in parentheses
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });
});
