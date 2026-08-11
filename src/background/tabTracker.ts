import { StorageService } from '@/core/storage/storageService';
import { PrivacyService } from '@/core/privacy/privacyService';
import { createPageMemory } from '@/features/findit/finditService';
import { createVisitRecord } from '@/features/backtrack/backtrackService';
import { buildTabContext } from '@/features/context/contextService';
import { getSettings } from '@/shared/storage/settings';
import { VISIT_RETENTION_MS } from '@/shared/constants';
import { getHostname } from '@/shared/utils';

const tabOpenTimes = new Map<number, number>();

export function initTabTracker(): void {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url || PrivacyService.isProtectedUrl(tab.url)) return;

    const settings = await getSettings();
    if (PrivacyService.shouldTrackVisit(tab.url, settings)) {
      const domain = getHostname(tab.url);
      await StorageService.addVisit(
        createVisitRecord(tabId, tab.url, tab.title ?? domain, domain)
      );
      await StorageService.pruneVisits(Date.now() - VISIT_RETENTION_MS);
    }

    if (PrivacyService.shouldIndexPage(tab.url, settings)) {
      // Content script handles extraction; background receives INDEX_PAGE message
    }

    if (settings.features.context?.enabled !== false && settings.trackBrowsingContext) {
      if (!tabOpenTimes.has(tabId)) tabOpenTimes.set(tabId, Date.now());
      const visits = await StorageService.getVisitsSince(Date.now() - 30 * 60 * 1000);
      const context = buildTabContext(
        tabId,
        tab.url,
        tab.title ?? '',
        visits,
        tabOpenTimes.get(tabId) ?? Date.now()
      );
      await StorageService.setTabContext(context);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    tabOpenTimes.delete(tabId);
  });

  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.id) tabOpenTimes.set(tab.id, Date.now());
  });
}

export async function indexPageFromContent(payload: {
  url: string;
  title: string;
  description?: string;
  headings: string[];
  content: string;
}): Promise<void> {
  const settings = await getSettings();
  if (!PrivacyService.shouldIndexPage(payload.url, settings)) return;

  const existing = await StorageService.getPageByUrl(payload.url);
  const page = createPageMemory({ ...payload, existing });
  await StorageService.upsertPage(page);
}
