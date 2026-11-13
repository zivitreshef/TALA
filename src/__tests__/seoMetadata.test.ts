import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SEO and Google Searchability Assets', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const indexPath = path.join(rootDir, 'index.html');
  const robotsPath = path.join(rootDir, 'public/robots.txt');
  const sitemapPath = path.join(rootDir, 'public/sitemap.xml');
  const googleVerificationPath = path.join(rootDir, 'public/google3aca6ed907d12930.html');

  it('includes essential SEO meta tags in index.html', () => {
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');

    expect(content).toContain('<meta name="description"');
    expect(content).toContain('<meta name="robots" content="index, follow"');
    expect(content).toContain('<link rel="canonical" href="https://zivitreshef.github.io/TALA/"');
    expect(content).toContain('<meta property="og:title"');
    expect(content).toContain('<meta property="og:description"');
    expect(content).toContain('<meta property="og:image"');
    expect(content).toContain('סביבת עבודה יומיומית');
    expect(content).toContain('הקלטות קוליות');
  });

  it('provides a valid robots.txt that allows crawling and points to sitemap', () => {
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf-8');

    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Sitemap: https://zivitreshef.github.io/TALA/sitemap.xml');
  });

  it('provides a sitemap.xml with canonical site URL', () => {
    expect(fs.existsSync(sitemapPath)).toBe(true);
    const content = fs.readFileSync(sitemapPath, 'utf-8');

    expect(content).toContain('<loc>https://zivitreshef.github.io/TALA/</loc>');
    expect(content).toContain('<priority>1.0</priority>');
  });

  it('provides the Google Search Console verification HTML file', () => {
    expect(fs.existsSync(googleVerificationPath)).toBe(true);
    const content = fs.readFileSync(googleVerificationPath, 'utf-8');
    expect(content).toContain('google-site-verification: google3aca6ed907d12930.html');
  });
});
