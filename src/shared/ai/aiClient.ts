import type { ExtensionSettings } from '@/shared/types';

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
}

export async function callAI(request: AIRequest, settings: ExtensionSettings): Promise<AIResponse> {
  if (!settings.aiEnabled || !settings.aiApiKey) {
    throw new Error('AI features are not configured');
  }
  if (settings.localOnlyMode) {
    throw new Error('Local-only mode is enabled');
  }

  switch (settings.aiProvider) {
    case 'openai':
      return callOpenAI(request, settings);
    case 'anthropic':
      return callAnthropic(request, settings);
    case 'custom':
      return callCustom(request, settings);
    default:
      throw new Error('No AI provider selected');
  }
}

async function callOpenAI(request: AIRequest, settings: ExtensionSettings): Promise<AIResponse> {
  const model = settings.aiModel || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.aiApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt },
      ],
      max_tokens: request.maxTokens ?? 800,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI');
  return { text, provider: 'openai', model };
}

async function callAnthropic(request: AIRequest, settings: ExtensionSettings): Promise<AIResponse> {
  const model = settings.aiModel || 'claude-3-5-haiku-20241022';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.aiApiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens ?? 800,
      system: request.systemPrompt ?? '',
      messages: [{ role: 'user', content: request.prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error: ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response from Anthropic');
  return { text, provider: 'anthropic', model };
}

async function callCustom(request: AIRequest, settings: ExtensionSettings): Promise<AIResponse> {
  const endpoint = settings.aiModel;
  if (!endpoint?.startsWith('http')) {
    throw new Error('Custom provider requires full API URL in Model field');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.aiApiKey}`,
    },
    body: JSON.stringify({
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? data.content?.[0]?.text ?? data.text;
  if (!text) throw new Error('Empty response from custom provider');
  return { text: String(text).trim(), provider: 'custom', model: endpoint };
}

export function parseExplanationResponse(text: string, originalQuery: string): import('@/shared/types').ExplanationResult {
  const lines = text.split('\n').filter(Boolean);
  const sections: import('@/shared/types').ExplanationSection[] = [];
  let currentTitle = 'Explanation';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.match(/^#{1,3}\s+/) || line.match(/^[A-Z][a-z\s]+:$/)) {
      if (currentContent.length) {
        sections.push({ title: currentTitle, content: currentContent.length === 1 ? currentContent[0] : currentContent });
      }
      currentTitle = line.replace(/^#{1,3}\s+/, '').replace(/:$/, '');
      currentContent = [];
    } else if (line.match(/^[-•*]\s+/)) {
      currentContent.push(line.replace(/^[-•*]\s+/, ''));
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length) {
    sections.push({ title: currentTitle, content: currentContent.length === 1 ? currentContent[0] : currentContent });
  }

  return {
    title: originalQuery.slice(0, 80),
    sections: sections.length ? sections : [{ title: 'Explanation', content: text }],
    source: 'ai',
  };
}
