import { setupContextMenus, handleContextMenuClick, openCommandPaletteOnTab } from './contextMenus';
import { routeMessage } from './messageRouter';
import { isProtectedUrl } from '@/shared/utils';

console.debug('[CTRL+WEB] Service worker started');

setupContextMenus();

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleContextMenuClick(info, tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-command-palette') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url && !isProtectedUrl(tab.url)) {
      await openCommandPaletteOnTab(tab.id);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  routeMessage(message, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err.message }));
  return true;
});

chrome.action.onClicked.addListener(() => {
  // Popup handles toolbar click
});
