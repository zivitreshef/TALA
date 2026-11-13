import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('WorkPlan Soft Azure Palette Verification', () => {
  it('ensures .document-title-card uses soft azure gradient instead of dark navy', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Extract document-title-card block
    const docTitleCardMatch = cssContent.match(/\.document-title-card\s*\{([^}]+)\}/);
    expect(docTitleCardMatch).not.toBeNull();
    const docTitleCardBlock = docTitleCardMatch![1];

    // Must use pleasant soft azure gradient
    expect(docTitleCardBlock).toContain('linear-gradient(135deg, #5b9bd5 0%, #3d75ab 100%)');
    expect(docTitleCardBlock).not.toContain('#1e3a8a');
  });

  it('ensures .btn-step-next and .section-nav-pill.active use the harmonious azure palette', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const btnStepNextMatches = [...cssContent.matchAll(/(?:^|\n)(?:\.btn-step-prev,\s*\r?\n)?\.btn-step-next\s*\{([^}]+)\}/g)];
    const specificNextBlock = btnStepNextMatches.map(m => m[1]).find(b => b.includes('linear-gradient'));
    expect(specificNextBlock).toBeDefined();
    expect(specificNextBlock).toContain('linear-gradient(135deg, #5b9bd5 0%, #3d75ab 100%)');
    expect(specificNextBlock).not.toContain('#1e3a8a');

    const activePillMatch = cssContent.match(/\.section-nav-pill\.active\s*\{([^}]+)\}/);
    expect(activePillMatch).not.toBeNull();
    const activePillBlock = activePillMatch![1];

    expect(activePillBlock).toContain('linear-gradient(135deg, #5b9bd5 0%, #3d75ab 100%)');
    expect(activePillBlock).not.toContain('#1e3a8a');
  });

  it('ensures goal buttons and badges also harmonize with the azure palette', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    const goalBadgeMatch = cssContent.match(/\.goal-number-badge\s*\{([^}]+)\}/);
    expect(goalBadgeMatch).not.toBeNull();
    const goalBadgeBlock = goalBadgeMatch![1];

    expect(goalBadgeBlock).toContain('linear-gradient(135deg, #5b9bd5 0%, #3d75ab 100%)');
    expect(goalBadgeBlock).not.toContain('#1e3a8a');
  });
});
