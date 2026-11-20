#!/usr/bin/env node
/**
 * AI Code Reviewer - CLI Entry Point
 * Executes Stage A (Untrusted Validation) or Stage B (Trusted Review).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadReviewerConfig } from './config.js';
import { validateTestReportArtifact } from './validator.js';
import { GitHubClient } from './github.js';
import { AIReviewerEngine } from './reviewer.js';

function parseArgs(args) {
  const parsed = { stage: null, pr: null, commit: null, report: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--stage' && args[i + 1]) parsed.stage = args[++i];
    if (args[i] === '--pr' && args[i + 1]) parsed.pr = parseInt(args[++i], 10);
    if (args[i] === '--commit' && args[i + 1]) parsed.commit = args[++i];
    if (args[i] === '--report' && args[i + 1]) parsed.report = args[++i];
  }
  return parsed;
}

async function runStageA(config) {
  console.log('[Stage A] Starting untrusted test validation...');
  const startTime = Date.now();
  let testSuccess = false;
  let testOutput = '';

  const testCmd = config.testCommands?.[0] || 'npm test';
  try {
    testOutput = execSync(testCmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180000 // 3 min max
    });
    testSuccess = true;
  } catch (err) {
    testSuccess = false;
    testOutput = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + (err.message || '');
  }

  const durationMs = Date.now() - startTime;
  const passedMatch = testOutput.match(/(\d+)\s+passed/i);
  const failedMatch = testOutput.match(/(\d+)\s+failed/i);

  const report = {
    success: testSuccess,
    executed: true,
    passedCount: passedMatch ? parseInt(passedMatch[1], 10) : (testSuccess ? 1 : 0),
    failedCount: failedMatch ? parseInt(failedMatch[1], 10) : (testSuccess ? 0 : 1),
    durationMs,
    failures: testSuccess ? [] : [{ name: 'Test Execution', error: testOutput.slice(0, 500) }]
  };

  const outputPath = path.resolve(process.cwd(), 'test-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[Stage A] Validation finished in ${durationMs}ms. Report saved to ${outputPath}`);
}

async function runStageB(config, options) {
  console.log('[Stage B] Starting trusted AI review process...');
  const { pr, commit, report: reportPath } = options;

  if (!pr) throw new Error('Missing required flag: --pr <number>');
  if (!commit) throw new Error('Missing required flag: --commit <sha>');

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTIGRAVITY_API_KEY;
  const repoOwner = process.env.GITHUB_REPOSITORY_OWNER || process.env.REPO_OWNER || 'zivitreshef';
  const repoName = (process.env.GITHUB_REPOSITORY || 'zivitreshef/TALA').split('/')[1] || 'TALA';

  if (!token) throw new Error('GITHUB_TOKEN environment variable is required');
  if (!apiKey) throw new Error('GEMINI_API_KEY or ANTIGRAVITY_API_KEY is required');

  // Load and validate Stage A report if provided
  let testReport = null;
  if (reportPath && fs.existsSync(reportPath)) {
    const raw = fs.readFileSync(reportPath, 'utf8');
    testReport = validateTestReportArtifact(raw);
    console.log('[Stage B] Verified and loaded Stage A test report artifact.');
  }

  const gh = new GitHubClient({ token, owner: repoOwner, repo: repoName });
  const prData = await gh.getPullRequest(pr);

  // Validate commit SHA match to prevent cross-commit confusion
  if (prData.head.sha !== commit) {
    console.warn(`[Stage B] Warning: PR head SHA (${prData.head.sha}) does not match requested commit (${commit}). Using PR head SHA.`);
  }
  const headSha = prData.head.sha;
  const baseSha = prData.base.sha;

  console.log(`[Stage B] Fetching diff for PR #${pr} (Base: ${baseSha.slice(0, 7)}... Head: ${headSha.slice(0, 7)})...`);
  const diff = await gh.getPullRequestDiff(pr);

  if (!diff || diff.trim().length === 0) {
    console.log('[Stage B] PR contains no diff. Submitting empty approval.');
    await gh.publishReview({
      prNumber: pr,
      commitSha: headSha,
      reviewData: {
        assessment: 'APPROVED',
        summary: 'No code changes found in diff.',
        findings: [],
        architecturalObservations: []
      },
      testReport
    });
    return;
  }

  // Load architecture context if files exist
  let architectureContext = '';
  for (const docPath of config.architectureDocs || []) {
    const fullPath = path.resolve(process.cwd(), docPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      architectureContext += `\n--- Context from ${docPath} ---\n` + fs.readFileSync(fullPath, 'utf8').slice(0, 5000);
    }
  }

  console.log('[Stage B] Requesting independent AI review analysis...');
  const engine = new AIReviewerEngine({ apiKey });
  const reviewResult = await engine.reviewPullRequest({
    config,
    prTitle: prData.title,
    prBody: prData.body,
    baseSha,
    headSha,
    diff,
    testReport,
    architectureContext
  });

  console.log(`[Stage B] Review analysis complete. Assessment: ${reviewResult.assessment}. Findings count: ${reviewResult.findings.length}`);
  console.log('[Stage B] Publishing review to GitHub PR...');
  await gh.publishReview({
    prNumber: pr,
    commitSha: headSha,
    reviewData: reviewResult,
    testReport
  });

  console.log('[Stage B] AI review published successfully!');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadReviewerConfig();

  if (args.stage === 'validate') {
    await runStageA(config);
  } else if (args.stage === 'review') {
    await runStageB(config, args);
  } else {
    console.log('Usage:');
    console.log('  node scripts/ai-reviewer/cli.js --stage validate');
    console.log('  node scripts/ai-reviewer/cli.js --stage review --pr <number> --commit <sha> [--report <path>]');
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
  main().catch((err) => {
    console.error(`[AI Reviewer Fatal Error] ${err.message}`);
    process.exit(1);
  });
}
