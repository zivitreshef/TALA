/**
 * GitHub PR Automation Helper for TALA
 * Uses the repository authenticated token directly to bypass local gh CLI keyring issues.
 * 
 * Usage:
 *   node scripts/github-pr.js create --branch <branch-name> --title "<title>" --body "<body>"
 *   node scripts/github-pr.js merge --pr <pr-number> [--squash]
 */

import { execSync } from 'child_process';

const REPO_OWNER = 'zivitreshef';
const REPO_NAME = 'TALA';
const BASE_BRANCH = 'main';

function getRepoToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/https:\/\/([^@]+)@github\.com/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (_) {}
  return null;
}

const token = getRepoToken();

async function callGitHub(endpoint, method = 'GET', body = null) {
  if (!token) {
    throw new Error('❌ Missing GitHub token in environment or git remote origin URL.');
  }

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TALA-Deployment-Bot'
  };

  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`GitHub API Error (${res.status}): ${JSON.stringify(data, null, 2)}`);
  }
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'create') {
    const branchIndex = args.indexOf('--branch');
    const titleIndex = args.indexOf('--title');
    const bodyIndex = args.indexOf('--body');

    const branch = branchIndex !== -1 ? args[branchIndex + 1] : null;
    const title = titleIndex !== -1 ? args[titleIndex + 1] : null;
    const body = bodyIndex !== -1 ? args[bodyIndex + 1] : '';

    if (!branch || !title) {
      console.error('Usage: node scripts/github-pr.js create --branch <branch> --title <title> [--body <body>]');
      process.exit(1);
    }

    console.log(`📡 Creating PR from branch '${branch}' into '${BASE_BRANCH}'...`);
    const pr = await callGitHub('/pulls', 'POST', {
      title,
      head: branch,
      base: BASE_BRANCH,
      body
    });

    console.log(`✅ PR #${pr.number} created successfully: ${pr.html_url}`);
    return;
  }

  if (command === 'merge') {
    const prIndex = args.indexOf('--pr');
    const prNumber = prIndex !== -1 ? args[prIndex + 1] : null;
    const isSquash = args.includes('--squash');

    if (!prNumber) {
      console.error('Usage: node scripts/github-pr.js merge --pr <number> [--squash]');
      process.exit(1);
    }

    console.log(`📡 Merging PR #${prNumber} (${isSquash ? 'squash' : 'merge'})...`);
    const result = await callGitHub(`/pulls/${prNumber}/merge`, 'PUT', {
      merge_method: isSquash ? 'squash' : 'merge'
    });

    console.log(`✅ PR #${prNumber} merged successfully! SHA: ${result.sha}`);
    return;
  }

  console.error('Unknown command. Available commands: create, merge');
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
