import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import SiteFooter from '../components/SiteFooter';

describe('Landing Page Mobile Layout & SiteFooter Responsiveness Suite', () => {
  const siteFooterCssPath = path.resolve(__dirname, '../components/SiteFooter.css');
  const indexCssPath = path.resolve(__dirname, '../index.css');

  const siteFooterCss = fs.readFileSync(siteFooterCssPath, 'utf8');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  it('hides the floating RgM watermark completely on mobile screens (<= 768px)', () => {
    expect(siteFooterCss).toMatch(/@media\s*\(\s*max-width:\s*768px\s*\)\s*\{[\s\S]*?\.tala-corner-watermark\s*\{[\s\S]*?display:\s*none\s*!important/);
  });

  it('re-orders the login card to appear first on tablets and smartphones (<= 1080px and <= 720px)', () => {
    // Verifies .auth-left-column has order: -1 under max-width: 1080px media query
    expect(indexCss).toMatch(/@media\s*\(\s*max-width:\s*1080px\s*\)\s*\{[\s\S]*?\.auth-left-column\s*\{[\s\S]*?order:\s*-1/);
  });

  it('prevents horizontal scrolling and resolution distortion via overflow-x hidden and box-sizing', () => {
    expect(indexCss).toMatch(/\.auth-page-wrapper\s*\{[\s\S]*?overflow-x:\s*hidden/);
    expect(indexCss).toMatch(/\.saas-landing-container\s*\{[\s\S]*?overflow-x:\s*hidden/);
    expect(indexCss).toMatch(/\.auth-landing-shell\.saas-hero-shell\s*\{[\s\S]*?width:\s*100%/);
  });

  it('constrains navbar logo on mobile screens instead of legacy oversized frame', () => {
    expect(indexCss).toMatch(/\.saas-navbar-brand\s+\.auth-logo-frame\s*\{[\s\S]*?width:\s*44px/);
  });

  it('renders SiteFooter static markup with semantic complementary role and proper Hebrew labels', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('role="complementary"');
    expect(html).toContain('tala-corner-watermark');
    expect(html).toContain('פותח ומתוחזק על ידי');
    expect(html).toContain('RgM');
    // Ensure no English in parentheses
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });
});
