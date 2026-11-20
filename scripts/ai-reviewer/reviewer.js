/**
 * AI Code Reviewer - AI Engine Client
 * Handles communication with Google Gemini / Antigravity API using robust REST communication.
 */

import { buildSystemPrompt, buildReviewUserPrompt } from './prompts.js';
import { validateReviewOutput } from './validator.js';

export class AIReviewerEngine {
  constructor({ apiKey, model = 'gemini-2.5-pro', apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta' }) {
    if (!apiKey) {
      throw new Error('AIReviewerEngine requires an API key (GEMINI_API_KEY or ANTIGRAVITY_API_KEY)');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.apiBaseUrl = apiBaseUrl;
  }

  async reviewPullRequest({
    config,
    prTitle,
    prBody,
    baseSha,
    headSha,
    diff,
    testReport = null,
    architectureContext = '',
    codingStandards = ''
  }) {
    const systemInstruction = buildSystemPrompt(config);
    const userPrompt = buildReviewUserPrompt({
      prTitle,
      prBody,
      baseSha,
      headSha,
      diff,
      testReport,
      architectureContext,
      codingStandards
    });

    const endpoint = `${this.apiBaseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Skeptical, deterministic analysis
        maxOutputTokens: 8192
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Review API request failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('AI Review API returned empty response candidate');
    }

    return validateReviewOutput(candidate);
  }
}
