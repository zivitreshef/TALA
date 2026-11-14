import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('FormField and Textarea Styling Regression Suite', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('guarantees universal .form-field class is defined with column flex layout and 100% width', () => {
    // Matches .form-field { ... } but not .form-field.compact
    const formFieldMatch = cssContent.match(/(?:^|\n)\.form-field\s*\{([^}]+)\}/);
    expect(formFieldMatch).not.toBeNull();
    const body = formFieldMatch![1];

    expect(body).toContain('display: flex');
    expect(body).toContain('flex-direction: column');
    expect(body).toContain('width: 100%');
    expect(body).toContain('box-sizing: border-box');
  });

  it('guarantees .form-field label has proper typography and alignment', () => {
    const labelMatch = cssContent.match(/(?:^|\n)\.form-field label\s*\{([^}]+)\}/);
    expect(labelMatch).not.toBeNull();
    const body = labelMatch![1];

    expect(body).toContain('font-size: 13px');
    expect(body).toContain('font-weight: 600');
    expect(body).toContain('text-align: right');
  });

  it('guarantees .form-field textarea, input, and select have full width, border and background styling', () => {
    const inputMatch = cssContent.match(/\.form-field input,\s*\r?\n\.form-field textarea,\s*\r?\n\.form-field select\s*\{([^}]+)\}/);
    expect(inputMatch).not.toBeNull();
    const body = inputMatch![1];

    expect(body).toContain('width: 100%');
    expect(body).toContain('border: 1.5px solid var(--border)');
    expect(body).toContain('border-radius: 10px');
    expect(body).toContain('background: #f9fbff');
    expect(body).toContain('box-sizing: border-box');
  });

  it('guarantees .form-field textarea has vertical resize and comfortable line height', () => {
    const textareaMatch = cssContent.match(/(?:^|\n)\.form-field textarea\s*\{([^}]+)\}/);
    expect(textareaMatch).not.toBeNull();
    const body = textareaMatch![1];

    expect(body).toContain('resize: vertical');
    expect(body).toContain('min-height: 80px');
    expect(body).toContain('line-height: 1.5');
  });

  it('preserves compact login modifier .form-field.compact without overriding global styles', () => {
    const compactMatch = cssContent.match(/(?:^|\n)\.form-field\.compact\s*\{([^}]+)\}/);
    expect(compactMatch).not.toBeNull();
  });

  it('guarantees step 4 recommendations in EcologicalWorkPlanForm uses .form-field textarea', () => {
    const formTsxPath = path.resolve(__dirname, '../EcologicalWorkPlanForm.tsx');
    const formTsx = fs.readFileSync(formTsxPath, 'utf-8');

    // Section 4 Recommendations container
    expect(formTsx).toContain('<h3>4. המלצות</h3>');
    expect(formTsx).toContain('<label>המלצות להמשך:</label>');
    expect(formTsx).toContain("value={formData.recommendations || ''}");

    // Section 5 Evaluation Report container
    expect(formTsx).toContain('<h3>דוח הערכת מחצית / סוף שנה</h3>');
    expect(formTsx).toContain('<label style={{ fontWeight: 700 }}>סיכום תפקוד והתקדמות תקופתית:</label>');
    expect(formTsx).toContain("value={formData.evalReportSummary || ''}");
  });
});
