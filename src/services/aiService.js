/**
 * aiService.js
 * Abstracts AI vendor calls (Google, OpenAI, GitHub Copilot, Azure, Anthropic).
 * Exposes a unified callAiJson(prompt, aiConfig) function.
 */

export async function callAiJson(promptText, aiConfig = {}) {
  const vendor = (aiConfig.vendor || 'google').toLowerCase();
  const apiKey = (aiConfig.apiKey || '').trim();
  
  if (!apiKey) return null;

  switch (vendor) {
    case 'openai':
      return await callOpenAiJson(promptText, apiKey, aiConfig.model || 'gpt-4o-mini');
    case 'github':
      return await callGitHubCopilotJson(promptText, apiKey, aiConfig.model || 'gpt-4o');
    case 'azure':
      return await callAzureOpenAiJson(promptText, apiKey, aiConfig.endpoint, aiConfig.model);
    case 'anthropic':
      return await callAnthropicJson(promptText, apiKey, aiConfig.model || 'claude-3-5-haiku-latest');
    case 'google':
    default:
      return await callGeminiJson(promptText, apiKey, aiConfig.model);
  }
}

async function callGeminiJson(promptText, apiKey, preferredModel) {
  const models = preferredModel ? [preferredModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'] : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const uniqueModels = [...new Set(models)];

  for (const modelName of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = textOut.match(/[\{\[][\s\S]*[\}\]]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn(`Model ${modelName} call failed, trying next`, err);
    }
  }
  return null;
}

async function callOpenAiJson(promptText, apiKey, model) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: "json_object" },
        messages: [{ role: 'user', content: promptText }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    return JSON.parse(content);
  } catch (err) {
    console.error('OpenAI API error:', err);
    return null;
  }
}

async function callGitHubCopilotJson(promptText, apiKey, model) {
  try {
    const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: "json_object" },
        messages: [{ role: 'user', content: promptText }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    return JSON.parse(content);
  } catch (err) {
    console.error('GitHub Models API error:', err);
    return null;
  }
}

async function callAzureOpenAiJson(promptText, apiKey, endpoint, model) {
  if (!endpoint) return null;
  try {
    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        response_format: { type: "json_object" },
        messages: [{ role: 'user', content: promptText }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    return JSON.parse(content);
  } catch (err) {
    console.error('Azure OpenAI API error:', err);
    return null;
  }
}

async function callAnthropicJson(promptText, apiKey, model) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: promptText + "\n\nPlease respond ONLY with valid JSON." }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.content?.[0]?.text || '';
    const jsonMatch = content.match(/[\{\[][\s\S]*[\}\]]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error('Anthropic API error:', err);
    return null;
  }
}
