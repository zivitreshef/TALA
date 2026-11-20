/**
 * AI Code Reviewer - GitHub API Integration
 * Handles fetching PR details/diff and publishing structured reviews with inline comments.
 */

export class GitHubClient {
  constructor({ token, owner, repo, apiUrl = 'https://api.github.com' }) {
    if (!token) {
      throw new Error('GitHubClient requires an authenticated token');
    }
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.apiUrl = apiUrl.replace(/\/$/, '');
  }

  async request(endpoint, options = {}) {
    const url = `${this.apiUrl}/repos/${this.owner}/${this.repo}${endpoint}`;
    const headers = {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Independent-AI-Code-Reviewer',
      ...options.headers
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub API error ${res.status} on ${endpoint}: ${errText}`);
    }
    return res;
  }

  async getPullRequest(prNumber) {
    const res = await this.request(`/pulls/${prNumber}`);
    return await res.json();
  }

  async getPullRequestDiff(prNumber) {
    const res = await this.request(`/pulls/${prNumber}`, {
      headers: { Accept: 'application/vnd.github.v3.diff' }
    });
    return await res.text();
  }

  async getPreviousReviews(prNumber) {
    const res = await this.request(`/pulls/${prNumber}/reviews`);
    return await res.json();
  }

  /**
   * Publishes the structured AI review on the PR with commit SHA binding.
   */
  async publishReview({ prNumber, commitSha, reviewData, testReport = null }) {
    const { assessment, summary, findings, architecturalObservations } = reviewData;

    // Map assessment to GitHub review event
    let event = 'COMMENT';
    if (assessment === 'APPROVED') {
      event = 'APPROVE';
    } else if (assessment === 'CHANGES_REQUESTED') {
      event = 'REQUEST_CHANGES';
    }

    const markdownBody = this.buildReviewMarkdown({
      commitSha,
      assessment,
      summary,
      findings,
      architecturalObservations,
      testReport
    });

    // Try posting with inline comments first, fall back to pure comment body if line mapping fails
    const inlineComments = findings
      .filter((f) => f.file && f.line)
      .map((f) => ({
        path: f.file,
        line: f.line,
        body: `**[${f.severity}] ${f.title}**\n\n${f.explanation}\n\n*תרחיש השפעה:* ${f.impactScenario}\n\n*תיקון מומלץ:* ${f.remediation}`
      }));

    try {
      const payload = {
        commit_id: commitSha,
        body: markdownBody,
        event,
        comments: inlineComments
      };

      const res = await this.request(`/pulls/${prNumber}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (inlineErr) {
      console.warn(`[AI Reviewer] Inline comments could not be anchored (${inlineErr.message}). Falling back to main review body.`);
      
      // Fallback: embed all findings into markdownBody directly
      const fallbackBody = `${markdownBody}\n\n### פירוט ממצאים\n\n` +
        findings.map((f) => `#### [${f.severity}] ${f.title}\n- **קובץ**: \`${f.file}\` (שורה ${f.line})\n- **הסבר**: ${f.explanation}\n- **תרחיש השפעה**: ${f.impactScenario}\n- **תיקון מוצע**: ${f.remediation}`).join('\n\n');

      const fallbackPayload = {
        commit_id: commitSha,
        body: fallbackBody,
        event
      };

      const res = await this.request(`/pulls/${prNumber}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload)
      });
      return await res.json();
    }
  }

  buildReviewMarkdown({ commitSha, assessment, summary, findings, architecturalObservations, testReport }) {
    const timestamp = new Date().toISOString();
    const severityCounts = {
      CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
      HIGH: findings.filter((f) => f.severity === 'HIGH').length,
      MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
      LOW: findings.filter((f) => f.severity === 'LOW').length,
      INFO: findings.filter((f) => f.severity === 'INFO').length
    };

    const statusBadge = {
      APPROVED: '✅ אושר ללא חסימות',
      CHANGES_REQUESTED: '❌ נדרשים שינויים מהותיים',
      REVIEW_WITH_WARNINGS: '⚠️ ביקורת עם אזהרות',
      REVIEW_PASSED_WITH_NOTES: 'ℹ️ ביקורת עברה עם הערות'
    }[assessment] || assessment;

    let testStatus = 'לא הופעלו בדיקות';
    if (testReport && testReport.executed) {
      testStatus = testReport.success
        ? `✅ ${testReport.passedCount} בדיקות עברו בהצלחה (${testReport.durationMs}ms)`
        : `❌ נכשלו בדיקות (${testReport.failedCount} כשלים)`;
    }

    return `## ביקורת קוד עצמאית

- **מזהה התחייבות**: \`${commitSha.slice(0, 8)}\`
- **מועד ביקורת**: \`${timestamp}\`
- **הערכה כוללת**: **${statusBadge}**
- **סטטוס בדיקות אוטומטיות**: ${testStatus}

### סיכום ממצאים לפי חומרה
- **קריטי**: ${severityCounts.CRITICAL}
- **גבוה**: ${severityCounts.HIGH}
- **בינוני**: ${severityCounts.MEDIUM}
- **נמוך**: ${severityCounts.LOW}
- **מידע**: ${severityCounts.INFO}

---

### הערכת הבודק
${summary}

${
  architecturalObservations && architecturalObservations.length > 0
    ? `### תצפיות ארכיטקטוניות\n${architecturalObservations.map((obs) => `- ${obs}`).join('\n')}`
    : ''
}

> [!NOTE]
> ביקורת זו הופקה באופן עצמאי ומבודד לחלוטין ללא שיתוף היסטוריית השיחה של הסוכן המפתח. אישור המיזוג הסופי נותר באחריות המפתח האנושי בלבד.`;
  }
}
