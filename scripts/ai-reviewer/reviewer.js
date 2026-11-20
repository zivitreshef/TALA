/**
 * AI Code Reviewer - AI Engine Client
 * Handles communication with Google Gemini / Antigravity API using robust REST communication.
 */

import { buildSystemPrompt, buildReviewUserPrompt } from './prompts.js';
import { validateReviewOutput } from './validator.js';

const DEFAULT_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro'
];

export class AIReviewerEngine {
  constructor({
    apiKey,
    model = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview',
    apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  }) {
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

    const modelsToTry = Array.from(new Set([this.model, ...(config?.aiModels || []), ...DEFAULT_MODELS]));
    let lastError = null;

    for (const modelName of modelsToTry) {
      const endpoint = `${this.apiBaseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (res.ok) {
          const json = await res.json();
          const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!candidate) {
            throw new Error(`AI Review API (${modelName}) returned empty response candidate`);
          }
          console.log(`[Stage B] Successfully generated review analysis using model: ${modelName}`);
          return validateReviewOutput(candidate);
        }

        const errText = await res.text();
        lastError = new Error(`AI Review API request failed for ${modelName} (${res.status}): ${errText}`);
        console.warn(`[Stage B] Model ${modelName} returned status ${res.status}. Trying fallback model if available...`);
      } catch (networkErr) {
        lastError = networkErr;
        console.warn(`[Stage B] Network error with ${modelName}: ${networkErr.message}. Trying next fallback...`);
      }
    }

    throw lastError || new Error('All candidate AI models failed.');
  }
}
