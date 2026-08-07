import type { ExplainInput, ExplanationProvider, ExplanationResult } from '@/shared/types';
import { LocalExplanationProvider } from './localExplanation';
import { matchHttpError } from './explainUtils';

function hasLocalMatch(text: string): boolean {
  return !!(matchHttpError(text) || matchTermQuick(text));
}

function matchTermQuick(text: string): boolean {
  const terms = ['cors', 'jwt', 'api', 'oauth', 'ssl', 'cache', 'dom', 'cdn'];
  const lower = text.toLowerCase().trim();
  return terms.some((t) => lower === t || lower.includes(t));
}

export class AIExplanationProvider implements ExplanationProvider {
  async explain(input: ExplainInput): Promise<ExplanationResult> {
    const response = await chrome.runtime.sendMessage({
      type: 'AI_EXPLAIN',
      payload: { text: input.text, context: input.context },
    });

    if (!response?.success) {
      throw new Error(response?.error ?? 'AI explanation failed');
    }
    return response.data as ExplanationResult;
  }
}

export async function explainWithBestProvider(text: string): Promise<ExplanationResult> {
  const local = new LocalExplanationProvider();
  const localResult = await local.explain({ text });

  if (hasLocalMatch(text)) {
    return localResult;
  }

  const settings = await getSettings();
  if (!settings.aiEnabled || !settings.aiApiKey || settings.localOnlyMode) {
    return localResult;
  }

  const { requestAIConsent } = await import('@/content/overlay/consentDialog');
  const consented = await requestAIConsent('Explain this');
  if (!consented) return localResult;

  try {
    const ai = new AIExplanationProvider();
    return await ai.explain({ text });
  } catch {
    return {
      ...localResult,
      sections: [
        ...localResult.sections,
        { title: 'AI unavailable', content: 'Could not reach your AI provider. Showing local result.' },
      ],
    };
  }
}

function getSettings(): Promise<import('@/shared/types').ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (r) => resolve(r?.data));
  });
}

export async function explainText(text: string): Promise<ExplanationResult> {
  return explainWithBestProvider(text);
}
