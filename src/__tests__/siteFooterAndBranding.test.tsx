import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SiteFooter from '../components/SiteFooter';

describe('SiteFooter & RgM Corner Watermark Component', () => {
  it('renders discreet floating watermark with semantic complementary role', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('role="complementary"');
    expect(html).toContain('tala-corner-watermark');
    expect(html).toContain('פותח ומתוחזק על ידי');
    expect(html).toContain('RgM');
  });

  it('renders the optimized RgM logo with accessibility alt attribute', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('src="./rgm-logo.png"');
    expect(html).toContain('alt="לוגו RgM"');
    expect(html).toContain('class="tala-watermark-logo"');
  });

  it('does not duplicate the site version in the watermark to keep it clean and minimal', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    // Watermark should be clean and not duplicate ver. since it is already in the top header
    expect(html).not.toContain('ver.');
    expect(html).not.toContain('כל הזכויות שמורות');
  });

  it('supports custom className for flexible layout integration', () => {
    const html = renderToStaticMarkup(<SiteFooter className="custom-test-watermark" />);

    expect(html).toContain('tala-corner-watermark custom-test-watermark');
  });

  it('strictly adheres to Hebrew-only copy with zero English words in parentheses', () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    // Zero English phrases in parentheses
    expect(html).not.toMatch(/\([A-Za-z\s]+\)/);
  });
});
