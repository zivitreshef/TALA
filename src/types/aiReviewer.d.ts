declare module '*/scripts/ai-reviewer/config.js' {
  export function loadReviewerConfig(workspaceRoot?: string): any;
}

declare module '*/scripts/ai-reviewer/validator.js' {
  export const MAX_TEST_REPORT_BYTES: number;
  export const VALID_SEVERITIES: Set<string>;
  export const VALID_ASSESSMENTS: Set<string>;
  export function validateTestReportArtifact(rawContent: string): any;
  export function validateReviewOutput(rawOutput: any): any;
}

declare module '*/scripts/ai-reviewer/prompts.js' {
  export function buildSystemPrompt(config: any): string;
  export function buildReviewUserPrompt(params: any): string;
  export function sanitizeUntrusted(text: string): string;
}

declare module '*/scripts/ai-reviewer/reviewer.js' {
  export class AIReviewerEngine {
    constructor(options: { apiKey: string; model?: string; apiBaseUrl?: string });
    apiKey: string;
    model: string;
    apiBaseUrl: string;
    reviewPullRequest(params: any): Promise<any>;
  }
}

declare module '*/scripts/ai-reviewer/github.js' {
  export class GitHubClient {
    constructor(options: { token: string; owner: string; repo: string; apiUrl?: string });
    request(endpoint: string, options?: any): Promise<any>;
    getPullRequest(prNumber: number): Promise<any>;
    getPullRequestDiff(prNumber: number): Promise<string>;
    getPreviousReviews(prNumber: number): Promise<any>;
    extractPreviousFindings(previousReviews: any[]): any;
    compareFindings(previousFindings: any[], currentFindings: any[]): any;
    publishReview(params: any): Promise<any>;
    buildReviewMarkdown(params: any): string;
  }
}
