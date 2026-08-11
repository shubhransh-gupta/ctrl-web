import { getSettings, updateSettings, addRecentAction, clearAllData as clearSettingsData } from '@/shared/storage/settings';
import { saveItem } from '@/shared/storage/library';
import { StorageService } from '@/core/storage/storageService';
import { PrivacyService } from '@/core/privacy/privacyService';
import { callAI, parseExplanationResponse } from '@/shared/ai/aiClient';
import { readingTime, wordCount } from '@/shared/utils';
import { executeFeatureOnTab, openPaletteOnTab } from './tabExecutor';
import { indexPageFromContent } from './tabTracker';
import { rankPages } from '@/features/findit/finditService';
import { buildTimeline } from '@/features/backtrack/backtrackService';
import { groupTabs, createWorkspace } from '@/features/tabzero/tabzeroService';
import { filterClipboardSearch, createClipboardMemory } from '@/features/copypaste/copypasteService';
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
      const items = await StorageService.getAllItems();
      return { success: true, data: items };
    }

    case 'DELETE_SAVED_ITEM': {
      const { id } = message.payload as { id: string };
      await StorageService.deleteItem(id);
      return { success: true };
    }

    case 'EXECUTE_ON_TAB': {
      const { tabId, featureId, options } = message.payload as {
        tabId?: number;
        featureId: FeatureId;
        options?: Record<string, unknown>;
      };
      const id = tabId ?? sender.tab?.id ?? (await getActiveTabId());
      if (!id) return { success: false, error: 'No active tab' };
      const result = await executeFeatureOnTab(id, featureId, options);
      if (result.success) await addRecentAction(featureId);
      return result;
    }

    case 'EXECUTE_FEATURE': {
      const { featureId, options, tabId } = message.payload as {
        featureId: FeatureId;
        options?: Record<string, unknown>;
        tabId?: number;
      };
      const id = tabId ?? sender.tab?.id ?? (await getActiveTabId());
      if (!id) return { success: false, error: 'No active tab' };
      return executeFeatureOnTab(id, featureId, options);
    }

    case 'OPEN_PALETTE_ON_TAB': {
      const { tabId } = (message.payload ?? {}) as { tabId?: number };
      const id = tabId ?? sender.tab?.id ?? (await getActiveTabId());
      if (!id) return { success: false, error: 'No active tab' };
      return openPaletteOnTab(id);
    }

    case 'CAPTURE_VISIBLE_TAB': {
      const { format, quality } = (message.payload ?? {}) as { format: 'png' | 'jpeg'; quality: number };
      const tabId = sender.tab?.id ?? (await getActiveTabId());
      if (!tabId) return { success: false, error: 'No active tab' };
      try {
        const tab = await chrome.tabs.get(tabId);
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

    case 'INDEX_PAGE': {
      await indexPageFromContent(message.payload as Parameters<typeof indexPageFromContent>[0]);
      return { success: true };
    }

    case 'FINDIT_SEARCH': {
      const { query } = (message.payload ?? {}) as { query: string };
      const pages = await StorageService.getAllPages();
      const results = rankPages(pages, query ?? '');
      return { success: true, data: results };
    }

    case 'BACKTRACK_GET': {
      const { range = '30m' } = (message.payload ?? {}) as { range?: string };
      const visits = await StorageService.getVisitsSince(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return { success: true, data: buildTimeline(visits, range) };
    }

    case 'CONTEXT_GET': {
      const tabId = sender.tab?.id ?? (await getActiveTabId());
      if (!tabId) return { success: false, error: 'No active tab' };
      const context = await StorageService.getTabContext(tabId);
      return { success: true, data: context };
    }

    case 'TABZERO_GET': {
      const payload = message.payload as { workspaces?: boolean } | undefined;
      if (payload?.workspaces) {
        return { success: true, data: await StorageService.getWorkspaces() };
      }
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const groups = groupTabs(tabs);
      return { success: true, data: { groups, total: tabs.filter((t) => t.url && !t.url.startsWith('chrome://')).length } };
    }

    case 'TABZERO_SAVE': {
      const { groupId } = message.payload as { groupId: string };
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const groups = groupTabs(tabs);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return { success: false, error: 'Group not found' };
      const workspace = createWorkspace(
        `${group.label} — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        group.label,
        group.tabs
      );
      await StorageService.saveWorkspace(workspace);
      return { success: true, data: workspace };
    }

    case 'TABZERO_CLOSE': {
      const { groupId } = message.payload as { groupId: string };
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const group = groupTabs(tabs).find((g) => g.id === groupId);
      if (!group) return { success: false, error: 'Group not found' };
      for (const tab of group.tabs) {
        if (tab.id) await chrome.tabs.remove(tab.id);
      }
      return { success: true };
    }

    case 'TABZERO_RESUME': {
      const { id } = message.payload as { id: string };
      const workspaces = await StorageService.getWorkspaces();
      const workspace = workspaces.find((w) => w.id === id);
      if (!workspace) return { success: false, error: 'Workspace not found' };
      for (const tab of workspace.tabs) {
        await chrome.tabs.create({ url: tab.url, active: false });
      }
      return { success: true };
    }

    case 'COPYPASTE_GET': {
      const { query = '' } = (message.payload ?? {}) as { query?: string };
      const items = await StorageService.getClipboardItems();
      return { success: true, data: filterClipboardSearch(items, query) };
    }

    case 'COPYPASTE_SAVE': {
      const settings = await getSettings();
      const payload = message.payload as { text: string; sourceUrl?: string; pageTitle?: string };
      if (!PrivacyService.shouldStoreClipboard(payload.sourceUrl ?? '', payload.text, settings)) {
        return { success: false, error: 'Clipboard storage disabled or content blocked' };
      }
      const item = createClipboardMemory(payload);
      await StorageService.addClipboard(item);
      return { success: true, data: item };
    }

    case 'COPYPASTE_DELETE': {
      const { id } = message.payload as { id: string };
      await StorageService.deleteClipboard(id);
      return { success: true };
    }

    case 'COPYPASTE_CLEAR': {
      await StorageService.clearClipboard();
      return { success: true };
    }

    case 'DEADLINE_SAVE': {
      const { id, deadlines } = message.payload as { id?: string; deadlines?: import('@/shared/types').DeadlineItem[] };
      if (deadlines) {
        for (const d of deadlines) await StorageService.saveDeadline(d);
        return { success: true };
      }
      if (id) {
        const all = await StorageService.getDeadlines();
        const item = all.find((d) => d.id === id);
        if (item) {
          item.reminded = true;
          await StorageService.saveDeadline(item);
          const alarmName = `deadline-${item.id}`;
          await chrome.alarms.create(alarmName, { when: Math.max(item.date - 86400000, Date.now() + 60000) });
        }
      }
      return { success: true };
    }

    case 'DEADLINE_GET': {
      return { success: true, data: await StorageService.getDeadlines() };
    }

    case 'GET_FEATURE_STATS': {
      const pages = await StorageService.getAllPages();
      return {
        success: true,
        data: {
          indexedPages: pages.length,
          clipboardItems: (await StorageService.getClipboardItems()).length,
          workspaces: (await StorageService.getWorkspaces()).length,
        },
      };
    }

    case 'EXPORT_DATA': {
      const settings = await getSettings();
      const data = await StorageService.exportAll();
      return { success: true, data: { ...data, settings } };
    }

    case 'IMPORT_DATA': {
      const { data } = message.payload as { data: Record<string, unknown> };
      await StorageService.importAll(data);
      if (data.settings) await updateSettings(data.settings as Partial<import('@/shared/types').ExtensionSettings>);
      return { success: true };
    }

    case 'DELETE_ALL_DATA': {
      await StorageService.deleteAllData();
      await clearSettingsData();
      return { success: true };
    }

    case 'AI_EXPLAIN': {
      const { text, context } = message.payload as { text: string; context?: string };
      const settings = await getSettings();
      try {
        const response = await callAI(
          {
            systemPrompt:
              'You are a helpful assistant that explains technical concepts clearly. Use markdown headings (##) for sections like "What it means", "Common causes", and "What to try". Use bullet points where appropriate. Be concise.',
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
