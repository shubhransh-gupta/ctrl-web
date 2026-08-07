import type { FeatureId } from '@/shared/types';
import { isProtectedUrl } from '@/shared/utils';

const PING_TYPE = 'CTRLWEB_PING';

export async function pingContentScript(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: PING_TYPE });
    return response?.ready === true;
  } catch {
    return false;
  }
}

export async function injectContentScript(tabId: number): Promise<void> {
  const manifest = chrome.runtime.getManifest();
  const files = manifest.content_scripts?.[0]?.js;
  if (!files?.length) {
    throw new Error('Extension content script is not configured');
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [...files],
  });

  // Wait for dynamic import in crxjs loader to finish
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (await pingContentScript(tabId)) return;
  }

  throw new Error('Content script failed to initialize');
}

export async function sendToTab(tabId: number, message: unknown): Promise<void> {
  if (!(await pingContentScript(tabId))) {
    await injectContentScript(tabId);
  }
  await chrome.tabs.sendMessage(tabId, message);
}

export async function executeFeatureOnTab(
  tabId: number,
  featureId: FeatureId,
  options?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const url = tab.url ?? '';

    if (!url || isProtectedUrl(url)) {
      return {
        success: false,
        error: "CTRL+WEB can't run on this page. Try a normal website tab.",
      };
    }

    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('brave://')) {
      return {
        success: false,
        error: "This page is protected by the browser. Open a regular webpage first.",
      };
    }

    await sendToTab(tabId, {
      type: 'EXECUTE_FEATURE',
      payload: { featureId, options },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not run on this tab';
    if (message.includes('Cannot access contents of url')) {
      return { success: false, error: 'Refresh the page, then try again.' };
    }
    if (message.includes('Receiving end does not exist')) {
      return { success: false, error: 'Refresh the page, then try again.' };
    }
    return { success: false, error: message };
  }
}

export async function openPaletteOnTab(tabId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (isProtectedUrl(tab.url ?? '')) {
      return { success: false, error: "CTRL+WEB can't run on this page." };
    }
    await sendToTab(tabId, { type: 'OPEN_COMMAND_PALETTE' });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Could not open command palette',
    };
  }
}
