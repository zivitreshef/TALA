/**
 * AI Code Reviewer - Security Validator
 * Validates artifacts, enforces size limits, and sanitizes cross-stage data.
 */

export const MAX_TEST_REPORT_BYTES = 100 * 1024; // 100 KB limit
export const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
export const VALID_ASSESSMENTS = new Set(['APPROVED', 'CHANGES_REQUESTED', 'REVIEW_WITH_WARNINGS', 'REVIEW_PASSED_WITH_NOTES']);

/**
 * Validates and parses the Stage A test report artifact.
 * Throws or returns safe fallback if the artifact is poisoned or malformed.
 */
export function validateTestReportArtifact(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return {
      success: false,
      executed: false,
      reason: 'Empty or invalid test report format'
    };
  }

  // Size limit gate
  const byteLength = Buffer.byteLength(rawContent, 'utf8');
  if (byteLength > MAX_TEST_REPORT_BYTES) {
    console.warn(`[Security Gate] Test report exceeded max size (${byteLength} bytes > ${MAX_TEST_REPORT_BYTES} bytes). Truncating safely.`);
    rawContent = rawContent.slice(0, MAX_TEST_REPORT_BYTES);
  }

  try {
    const parsed = JSON.parse(rawContent);
    // Enforce strict schema on test report
    return {
      success: Boolean(parsed.success),
      executed: Boolean(parsed.executed),
      passedCount: Number(parsed.passedCount || 0),
      failedCount: Number(parsed.failedCount || 0),
      durationMs: Number(parsed.durationMs || 0),
      failures: Array.isArray(parsed.failures)
        ? parsed.failures.slice(0, 10).map((f) => ({
            name: String(f.name || '').slice(0, 200),
            error: String(f.error || '').slice(0, 500)
          }))
        : []
    };
  } catch (err) {
    return {
      success: false,
      executed: false,
      reason: `Malformed test report JSON: ${err.message}`
    };
  }
}

/**
 * Validates and sanitizes the structured output returned by the AI Reviewer.
 */
export function validateReviewOutput(rawOutput) {
  if (!rawOutput) {
    throw new Error('AI Reviewer returned empty response');
  }

  let parsed = null;
  if (typeof rawOutput === 'object') {
    parsed = rawOutput;
  } else {
    // Extract JSON if wrapped in markdown code fence
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawOutput];
    const candidate = (jsonMatch[1] || rawOutput).trim();
    try {
      parsed = JSON.parse(candidate);
    } catch (err) {
      throw new Error(`Failed to parse AI Reviewer JSON output: ${err.message}`);
    }
  }

  const assessment = VALID_ASSESSMENTS.has(parsed.assessment)
    ? parsed.assessment
    : 'REVIEW_WITH_WARNINGS';

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map(sanitizeFinding).filter(Boolean)
    : [];

  const architecturalObservations = Array.isArray(parsed.architecturalObservations)
    ? parsed.architecturalObservations.map((s) => String(s).slice(0, 500))
    : [];

  return {
    assessment,
    summary: String(parsed.summary || 'Review completed.').slice(0, 2000),
    findings,
    architecturalObservations
  };
}

function sanitizeFinding(f) {
  if (!f || typeof f !== 'object') return null;
  const severity = VALID_SEVERITIES.has(f.severity) ? f.severity : 'MEDIUM';
  return {
    severity,
    title: String(f.title || 'Code Review Finding').slice(0, 200),
    file: String(f.file || '').replace(/^(\.\/|\/)/, '').slice(0, 300),
    line: Math.max(1, parseInt(f.line, 10) || 1),
    endLine: f.endLine ? Math.max(1, parseInt(f.endLine, 10)) : undefined,
    explanation: String(f.explanation || '').slice(0, 2000),
    impactScenario: String(f.impactScenario || '').slice(0, 1000),
    remediation: String(f.remediation || '').slice(0, 2000),
    confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(f.confidence) ? f.confidence : 'MEDIUM'
  };
}
