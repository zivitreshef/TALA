import { describe, it, expect } from 'vitest';
import eslintConfig from '../../eslint.config.js';

describe('ESLint Config Guardrails & TDZ Prevention Gate', () => {
  it('enforces no-undef as error on src source files', () => {
    const srcConfig = eslintConfig.find(
      (c) => c.files && c.files.includes('src/**/*.{js,jsx}')
    );
    expect(srcConfig).toBeDefined();
    expect(srcConfig.rules['no-undef']).toBe('error');
  });

  it('enforces no-use-before-define as error to catch TDZ bugs before production', () => {
    const srcConfig = eslintConfig.find(
      (c) => c.files && c.files.includes('src/**/*.{js,jsx}')
    );
    expect(srcConfig).toBeDefined();
    const rule = srcConfig.rules['no-use-before-define'];
    expect(rule).toBeDefined();
    expect(rule[0]).toBe('error');
    expect(rule[1]).toEqual({
      functions: false,
      classes: true,
      variables: true
    });
  });
});
