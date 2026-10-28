import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Document Title Banner Alignment & CSS Grid', () => {
  it('contains 3-column grid structure in index.css for absolute centering', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Verify grid layout properties
    expect(css).toContain('.doc-title-top-row {');
    expect(css).toContain('display: grid;');
    expect(css).toContain('grid-template-columns: minmax(170px, auto) 1fr minmax(270px, auto);');
    expect(css).toContain('.banner-slot-date {');
    expect(css).toContain('justify-self: start;');
    expect(css).toContain('.banner-slot-controls {');
    expect(css).toContain('justify-self: end;');
  });

  it('renders EcologicalWorkPlanForm banner with banner-slot-date and banner-slot-controls', () => {
    const formPath = path.resolve(__dirname, '../EcologicalWorkPlanForm.jsx');
    const formCode = fs.readFileSync(formPath, 'utf8');

    expect(formCode).toContain('className="inline-meta-field banner-slot-date"');
    expect(formCode).toContain('className="inline-meta-field banner-slot-controls"');
    expect(formCode).toContain('className="doc-banner-center-brand"');
  });
});
