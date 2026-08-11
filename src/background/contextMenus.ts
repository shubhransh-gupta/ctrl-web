import {
  EXTENSION_NAME,
  CONTEXT_MENU_PRIMARY,
  CONTEXT_MENU_FEATURES,
  FEATURES,
} from '@/shared/constants';
import type { FeatureId } from '@/shared/types';
import { executeFeatureOnTab, openPaletteOnTab } from './tabExecutor';

const MENU_PREFIX = 'ctrlweb-';

export function setupContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: `${MENU_PREFIX}root`,
      title: EXTENSION_NAME,
      contexts: ['all'],
    });

    for (const item of CONTEXT_MENU_PRIMARY) {
      chrome.contextMenus.create({
        id: `${MENU_PREFIX}${item.id}`,
        parentId: `${MENU_PREFIX}root`,
        title: item.label,
        contexts: item.contexts,
      });
    }

    chrome.contextMenus.create({
      id: `${MENU_PREFIX}divider`,
      parentId: `${MENU_PREFIX}root`,
      type: 'separator',
      contexts: ['all'],
    });

    const utilityIds: FeatureId[] = [
      'copyClean',
      'explain',
      'privacy',
      'screenshot',
      'summarize',
      'saveLocal',
      'inspect',
    ];
    for (const id of utilityIds) {
      const feature = FEATURES[id];
      chrome.contextMenus.create({
        id: `${MENU_PREFIX}${id}`,
        parentId: `${MENU_PREFIX}root`,
        title: `${feature.icon} ${feature.label}`,
        contexts: getContextsForFeature(id),
      });
    }
  });
}

function getContextsForFeature(id: FeatureId): chrome.contextMenus.ContextType[] {
  const contexts = new Set<chrome.contextMenus.ContextType>();

  if (CONTEXT_MENU_FEATURES.selection.includes(id)) contexts.add('selection');
  if (CONTEXT_MENU_FEATURES.link.includes(id)) contexts.add('link');
  if (CONTEXT_MENU_FEATURES.page.includes(id)) contexts.add('page');
  if (CONTEXT_MENU_FEATURES.image.includes(id)) contexts.add('image');

  if (contexts.size === 0) contexts.add('all');
  return Array.from(contexts);
}

export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): void {
  if (!tab?.id) return;

  const menuItemId = String(info.menuItemId);
  if (!menuItemId.startsWith(MENU_PREFIX) || menuItemId === `${MENU_PREFIX}root`) return;

  const featureId = menuItemId.replace(MENU_PREFIX, '') as FeatureId;

  const options: Record<string, unknown> = {};
  if (info.linkUrl) options.url = info.linkUrl;
  if (info.selectionText) options.selection = info.selectionText;

  if (featureId === 'copypaste' && info.selectionText) {
    options.action = 'save';
  }

  executeFeatureOnTab(tab.id, featureId, options).then((result) => {
    if (!result.success && result.error) {
      console.error('[CTRL+WEB]', result.error);
    }
  });
}

export async function executeOnTab(
  tabId: number,
  featureId: FeatureId,
  options?: Record<string, unknown>
): Promise<void> {
  await executeFeatureOnTab(tabId, featureId, options);
}

export async function openCommandPaletteOnTab(tabId: number): Promise<void> {
  await openPaletteOnTab(tabId);
}
