import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TypeScript Migration Infrastructure Gate (Phase 1)', () => {
  const rootDir = process.cwd();
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  const packageJsonPath = path.join(rootDir, 'package.json');

  it('provides a valid tsconfig.json with hybrid JavaScript/TypeScript compilation options', () => {
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.allowJs).toBe(true);
    expect(tsconfig.compilerOptions.checkJs).toBe(false);
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.include).toContain('src');
  });

  it('integrates type-check into package.json scripts and build gate', () => {
    expect(fs.existsSync(packageJsonPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts['type-check']).toBe('tsc --noEmit');
    expect(pkg.scripts.build).toContain('npm run type-check');
    expect(pkg.devDependencies.typescript).toBeDefined();
  });
});
