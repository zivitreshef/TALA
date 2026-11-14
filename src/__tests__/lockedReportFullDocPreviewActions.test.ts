import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Locked Report & Full Document Preview Modern Export Actions', () => {
  const formPath = path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx');
  const fileContent = fs.readFileSync(formPath, 'utf8');

  it('provides the unified "הדפסה וייצוא" dropdown inside the live full document preview card', () => {
    // Assert that live-print-preview-card contains fullDocExportDropdownRef and the unified dropdown
    expect(fileContent).toContain('fullDocExportDropdownRef');
    expect(fileContent).toContain('showFullDocExportDropdown');
    expect(fileContent).toContain('btn-export-dropdown');
  });

  it('no longer renders legacy standalone print, PDF and Word buttons in the full document preview', () => {
    // Extract the section around live-print-preview-card
    const previewSectionStart = fileContent.indexOf('className="form-section-card live-print-preview-card"');
    expect(previewSectionStart).toBeGreaterThan(0);

    const previewSectionHeader = fileContent.substring(previewSectionStart, previewSectionStart + 6000);

    // The header should have the unified export dropdown
    expect(previewSectionHeader).toContain('showFullDocExportDropdown');
    expect(previewSectionHeader).toContain('הדפסה וייצוא');

    // The legacy raw buttons should NOT be present in this header section
    expect(previewSectionHeader).not.toContain('שלח להדפסה כעת');
  });
});
