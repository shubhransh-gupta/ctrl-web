import type { FeatureId } from '@/shared/types';
import { copyCleanSelection } from '@/features/copyClean/copyClean';
import { cleanPage, exitCleanMode } from '@/features/cleanPage/pageCleaner';
import { scanSelectionOrPage } from '@/features/privacy/privacyScanner';
import { cleanUrl } from '@/features/cleanLink/cleanLink';
import { explainText } from '@/features/explain/explainService';
import { summarizeContent } from '@/features/summarize/summarizeService';
import { startInspectMode, stopInspectMode } from '@/features/inspect/inspectElement';
import { showScreenshotPanel } from '@/features/screenshot/screenshot';
import { showToast, showProtectedPageError } from './overlay/toast';
import {
  showExplainPanel,
  showPrivacyPanel,
  showCleanLinkPanel,
  showSummarizePanel,
  showSavePanel,
} from './overlay/panels';
import { showCommandPalette, hideCommandPalette } from './overlay/commandPalette';
import { isProtectedUrl } from '@/shared/utils';

async function saveLocally(notes: string, tags: string): Promise<void> {
  const selectedText = window.getSelection()?.toString().trim();
  chrome.runtime.sendMessage({
    type: 'SAVE_ITEM',
    payload: {
      url: location.href,
      title: document.title,
      selectedText: selectedText || undefined,
      notes: notes || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    },
  }, (response) => {
    if (response?.success) showToast('✓ Saved to library');
    else showToast('Failed to save', 'error');
  });
}

export async function executeFeature(featureId: FeatureId, options?: Record<string, unknown>): Promise<void> {
  if (isProtectedUrl(location.href)) {
    showProtectedPageError();
    return;
  }

  try {
    switch (featureId) {
      case 'copyClean': {
        const format = (options?.format as 'plain' | 'markdown' | 'html') ?? 'plain';
        await copyCleanSelection(format);
        showToast('✓ Clean text copied');
        break;
      }
      case 'cleanPage': {
        const result = cleanPage();
        showToast(`✓ Clean mode enabled (${result.hiddenCount} elements hidden)`);
        break;
      }
      case 'privacy': {
        const result = scanSelectionOrPage();
        showPrivacyPanel(result);
        break;
      }
      case 'cleanLink': {
        const url = (options?.url as string) || window.getSelection()?.toString().trim() || location.href;
        const result = cleanUrl(url);
        showCleanLinkPanel(result);
        break;
      }
      case 'screenshot': {
        showScreenshotPanel();
        break;
      }
      case 'explain': {
        const text = window.getSelection()?.toString().trim();
        if (!text) {
          showToast('Select text to explain', 'info');
          return;
        }
        const result = await explainText(text);
        showExplainPanel(result);
        break;
      }
      case 'summarize': {
        const text = window.getSelection()?.toString().trim();
        const result = await summarizeContent(text);
        showSummarizePanel(result);
        break;
      }
      case 'saveLocal': {
        showSavePanel((notes, tags) => saveLocally(notes, tags));
        break;
      }
      case 'inspect': {
        startInspectMode();
        showToast('Click an element to inspect', 'info');
        break;
      }
      default:
        showToast('Unknown feature', 'error');
    }

    chrome.runtime.sendMessage({ type: 'TRACK_ACTION', payload: { featureId } });
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Feature failed', 'error');
  }
}

export function openCommandPalette(): void {
  if (isProtectedUrl(location.href)) {
    showProtectedPageError();
    return;
  }
  showCommandPalette((id) => executeFeature(id));
}

export function handleMessage(message: { type: string; payload?: unknown }): void {
  switch (message.type) {
    case 'EXECUTE_FEATURE': {
      const { featureId, options } = message.payload as { featureId: FeatureId; options?: Record<string, unknown> };
      executeFeature(featureId, options);
      break;
    }
    case 'OPEN_COMMAND_PALETTE':
      openCommandPalette();
      break;
    case 'HIDE_COMMAND_PALETTE':
      hideCommandPalette();
      break;
    case 'STOP_INSPECT':
      stopInspectMode();
      break;
    case 'EXIT_CLEAN_MODE':
      exitCleanMode();
      break;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message);
  sendResponse({ success: true });
  return true;
});

console.debug('[CTRL+WEB] Content script loaded');
