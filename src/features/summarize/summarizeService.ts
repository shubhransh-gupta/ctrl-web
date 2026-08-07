import type { SummarizeInput, SummarizeResult } from '@/shared/types';
import { localSummarize } from './localSummarize';

export async function summarizeWithBestProvider(input: SummarizeInput): Promise<SummarizeResult> {
  const settings = await getSettings();

  if (settings.aiEnabled && settings.aiApiKey && !settings.localOnlyMode) {
    const { requestAIConsent } = await import('@/content/overlay/consentDialog');
    const consented = await requestAIConsent('Summarize');
    if (consented) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'AI_SUMMARIZE',
          payload: input,
        });
        if (response?.success) return response.data as SummarizeResult;
      } catch {
        // fall through to local
      }
    }
  }

  return localSummarize(input);
}

function getSettings(): Promise<import('@/shared/types').ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (r) => resolve(r?.data));
  });
}

export async function summarizeContent(text?: string): Promise<SummarizeResult> {
  const { extractReadableContent } = await import('./localSummarize');
  return summarizeWithBestProvider({
    text: text ?? extractReadableContent(),
    title: document.title,
    url: location.href,
  });
}
