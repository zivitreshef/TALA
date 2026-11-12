import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('CI/CD Workflows Configuration', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const deployWorkflowPath = path.join(rootDir, '.github/workflows/deploy.yml');
  const ciWorkflowPath = path.join(rootDir, '.github/workflows/ci.yml');

  it('validates deploy.yml workflow exists and adheres to performance best practices', () => {
    expect(fs.existsSync(deployWorkflowPath)).toBe(true);
    const deployContent = fs.readFileSync(deployWorkflowPath, 'utf-8');

    // Deterministic dependencies & caching
    expect(deployContent).toContain('npm ci');
    expect(deployContent).toContain("cache: 'npm'");

    // Shallow checkout for fast CI
    expect(deployContent).toContain('fetch-depth: 1');

    // Quality gates before deploy
    expect(deployContent).toContain('npm run lint');
    expect(deployContent).toContain('npm run type-check');
    expect(deployContent).toContain('npm run test:run');
    expect(deployContent).toContain('npx vite build');
  });

  it('validates ci.yml PR gate exists and guards both frontend and cloud functions', () => {
    expect(fs.existsSync(ciWorkflowPath)).toBe(true);
    const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');

    // Trigger on pull_request to main
    expect(ciContent).toContain('pull_request:');
    expect(ciContent).toContain('branches: ["main"]');

    // Concurrency cancellation for outdated PR pushes
    expect(ciContent).toContain('cancel-in-progress: true');

    // Quality gates
    expect(ciContent).toContain('npm ci');
    expect(ciContent).toContain('npm run lint');
    expect(ciContent).toContain('npm run type-check');
    expect(ciContent).toContain('node --check functions/index.js');
    expect(ciContent).toContain('npm run test:run');
    expect(ciContent).toContain('npx vite build');
  });
});
