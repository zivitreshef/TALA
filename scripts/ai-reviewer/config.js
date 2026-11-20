/**
 * AI Code Reviewer - Configuration Loader
 * Reusable configuration loader with fallback defaults.
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CONFIG = {
  projectLanguage: 'javascript',
  technologyStack: 'standard',
  architectureDocs: ['README.md'],
  codingStandards: [],
  securityRequirements: ['Zero-trust input boundaries', 'Least-privilege authorization'],
  reviewFocusAreas: ['Functional correctness', 'Security vulnerabilities', 'Edge cases'],
  severityThresholds: {
    blocking: ['CRITICAL', 'HIGH'],
    warning: ['MEDIUM'],
    advisory: ['LOW', 'INFO']
  },
  testCommands: ['npm test'],
  excludedPaths: [
    'node_modules/**',
    'dist/**',
    'package-lock.json',
    '**/*.lock'
  ]
};

export function loadReviewerConfig(workspaceRoot = process.cwd()) {
  const configPath = path.join(workspaceRoot, '.ai-reviewer.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch (err) {
      console.warn(`[AI Reviewer] Warning: Failed to parse .ai-reviewer.json (${err.message}). Using defaults.`);
    }
  }
  return DEFAULT_CONFIG;
}
