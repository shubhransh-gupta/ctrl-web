import { getSettings, updateSettings, addRecentAction } from '@/shared/storage/settings';
import { saveItem, getAllItems, deleteItem } from '@/shared/storage/library';
import { callAI, parseExplanationResponse } from '@/shared/ai/aiClient';
import { readingTime, wordCount } from '@/shared/utils';
import type { FeatureId, SummarizeInput } from '@/shared/types';

export async function routeMessage(
  message: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case 'GET_SETTINGS':
      return { success: true, data: await getSettings() };

    case 'UPDATE_SETTINGS': {
      const updated = await updateSettings(message.payload as Partial<import('@/shared/types').ExtensionSettings>);
      return { success: true, data: updated };
    }

    case 'TRACK_ACTION': {
      const { featureId } = message.payload as { featureId: FeatureId };
      await addRecentAction(featureId);
      return { success: true };
    }

    case 'SAVE_ITEM': {
      const item = await saveItem(message.payload as Parameters<typeof saveItem>[0]);
      return { success: true, data: item };
    }

    case 'GET_SAVED_ITEMS': {
      const items = await getAllItems();
      return { success: true, data: items };
    }

    case 'DELETE_SAVED_ITEM': {
      const { id } = message.payload as { id: string };
      await deleteItem(id);
      return { success: true };
    }

    case 'CAPTURE_VISIBLE_TAB': {
      const { format, quality } = (message.payload ?? {}) as { format: 'png' | 'jpeg'; quality: number };
      const tabId = sender.tab?.id;
      if (!tabId) return { success: false, error: 'No active tab' };

      try {
        const tab = sender.tab ?? await chrome.tabs.get(tabId);
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: format === 'jpeg' ? 'jpeg' : 'png',
          quality: quality ?? 92,
        });
        return { success: true, dataUrl };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Capture failed' };
      }
    }

    case 'GET_TAB_INFO': {
      const tabId = sender.tab?.id ?? (await getActiveTabId());
      if (!tabId) return { success: false, error: 'No active tab' };
      const tab = await chrome.tabs.get(tabId);
      return {
        success: true,
        data: {
          url: tab.url ?? '',
          title: tab.title ?? '',
          hostname: tab.url ? new URL(tab.url).hostname.replace(/^www\./, '') : '',
        },
      };
    }

    case 'AI_EXPLAIN': {
      const { text, context } = message.payload as { text: string; context?: string };
      const settings = await getSettings();
      try {
        const response = await callAI(
          {
            systemPrompt: 'You are a helpful assistant that explains technical concepts clearly. Use markdown headings (##) for sections like "What it means", "Common causes", and "What to try". Use bullet points where appropriate. Be concise.',
            prompt: context ? `Context: ${context}\n\nExplain: ${text}` : `Explain: ${text}`,
          },
          settings
        );
        return { success: true, data: parseExplanationResponse(response.text, text) };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'AI failed' };
      }
    }

    case 'AI_SUMMARIZE': {
      const input = message.payload as SummarizeInput;
      const settings = await getSettings();
      const text = input.text || '';
      try {
        const response = await callAI(
          {
            systemPrompt: 'Summarize the following content in 3-5 clear sentences. Focus on key points only.',
            prompt: input.title ? `Title: ${input.title}\n\n${text.slice(0, 12000)}` : text.slice(0, 12000),
            maxTokens: 500,
          },
          settings
        );
        const content = input.text || text;
        return {
          success: true,
          data: {
            summary: response.text,
            wordCount: wordCount(content),
            readingTime: readingTime(content),
            source: 'ai' as const,
          },
        };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'AI failed' };
      }
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}
