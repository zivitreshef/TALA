import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Unified Bottom Action Bar and Report Export Dropup', () => {
  const formCode = fs.readFileSync(
    path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx'),
    'utf-8'
  );
  const cssCode = fs.readFileSync(
    path.resolve(__dirname, '../index.css'),
    'utf-8'
  );

  it('provides a consolidated "הדפסה וייצוא" dropup button in the bottom action bar', () => {
    expect(formCode).toContain('data-testid="bottom-action-bar-export-dropdown-btn"');
    expect(formCode).toContain('data-testid="bottom-action-bar-export-menu"');
    expect(formCode).toContain('btn-export-dropdown-bottom');
  });

  it('includes all export options (Print, Word, Email, Manbas, Privacy toggle) in the bottom export menu', () => {
    expect(formCode).toContain('data-testid="bottom-export-menu-print-btn"');
    expect(formCode).toContain('data-testid="bottom-export-menu-word-btn"');
    expect(formCode).toContain('data-testid="bottom-export-menu-email-btn"');
    expect(formCode).toContain('data-testid="bottom-export-menu-manbas-btn"');
    expect(formCode).toContain('העתקה למנב״ס');
    expect(formCode).toContain('הסתר פרטים מזהים בהדפסה');
  });

  it('provides consolidated export dropup in document preview mode as well', () => {
    expect(formCode).toContain('data-testid="preview-bottom-action-bar-export-dropdown-btn"');
    expect(formCode).toContain('data-testid="preview-bottom-action-bar-export-menu"');
  });

  it('unifies "דו״ח מצב" styling and uses distinct ClipboardList icon instead of duplicated FileText', () => {
    // ClipboardList imported and used
    expect(formCode).toContain('ClipboardList');
    expect(formCode).toMatch(/<ClipboardList size=\{18\} \/>\s*<span>דו"ח מצב<\/span>/);

    // No hardcoded light-blue background/borders separating דו"ח מצב from standard button family
    expect(formCode).not.toContain("background: showStatusReportSection\n                  ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'\n                  : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'");
  });

  it('defines professional drop-up CSS rules for the bottom action bar and aligns buttons to the right', () => {
    expect(cssCode).toContain('.btn-export-dropdown-bottom');
    expect(cssCode).toContain('.export-dropdown-menu.drop-up');
    expect(cssCode).toContain('bottom: calc(100% + 8px)');
    expect(cssCode).toContain('animation: exportDropUpFadeIn');

    // Aligns to the right in RTL via flex-start
    expect(cssCode).toMatch(/\.bottom-final-actions\s*\{[^}]*justify-content:\s*flex-start/);
  });
});
