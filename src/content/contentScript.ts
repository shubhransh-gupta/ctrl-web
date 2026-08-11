import type { FeatureId } from '@/shared/types';
import { copyCleanSelection } from '@/features/copyClean/copyClean';
import { cleanPage, exitCleanMode } from '@/features/cleanPage/pageCleaner';
import { scanSelectionOrPage } from '@/features/privacy/privacyScanner';
import { cleanUrl } from '@/features/cleanLink/cleanLink';
import { explainText } from '@/features/explain/explainService';
import { summarizeContent } from '@/features/summarize/summarizeService';
import { startInspectMode, stopInspectMode } from '@/features/inspect/inspectElement';
import { showScreenshotPanel } from '@/features/screenshot/screenshot';
import { copyWithSource } from '@/features/copypaste/copypasteService';
import { scanPageForDeadlines } from '@/features/deadline/deadlineService';
import { extractPageContent } from '@/core/pageExtraction/extractPage';
import { showToast, showProtectedPageError } from './overlay/toast';
import {
  showExplainPanel,
  showPrivacyPanel,
  showCleanLinkPanel,
  showSummarizePanel,
  showSavePanel,
} from './overlay/panels';
import {
  showFindItPanel,
  showBacktrackPanel,
  showContextPanel,
  showTabZeroPanel,
  showCopyPastePanel,
  showDeadlinePanel,
  showDeadlineBadge,
} from './overlay/suitePanels';
import { showCommandPalette, hideCommandPalette } from './overlay/commandPalette';
import { isProtectedUrl, debounce } from '@/shared/utils';

async function saveLocally(notes: string, tags: string): Promise<void> {
  const selectedText = window.getSelection()?.toString().trim();
  chrome.runtime.sendMessage(
    {
      type: 'SAVE_ITEM',
      payload: {
        url: location.href,
        title: document.title,
        selectedText: selectedText || undefined,
        notes: notes || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      },
    },
    (response) => {
      if (response?.success) showToast('✓ Saved to library');
      else showToast('Failed to save', 'error');
    }
  );
}

async function saveSelectionToClipboard(): Promise<void> {
  const text = window.getSelection()?.toString().trim();
  if (!text) {
    showToast('Select text first', 'info');
    return;
  }
  chrome.runtime.sendMessage(
    {
      type: 'COPYPASTE_SAVE',
      payload: { text, sourceUrl: location.href, pageTitle: document.title },
    },
    (response) => {
      if (response?.success) showToast('✓ Saved to CopyPaste');
      else showToast(response?.error ?? 'Could not save', 'error');
    }
  );
}

const indexCurrentPage = debounce(() => {
  if (isProtectedUrl(location.href)) return;
  const extracted = extractPageContent();
  chrome.runtime.sendMessage({
    type: 'INDEX_PAGE',
    payload: { url: location.href, ...extracted },
  });
}, 2000);

function runDeadlineScan(): void {
  const deadlines = scanPageForDeadlines();
  if (deadlines.length) {
    chrome.runtime.sendMessage({ type: 'DEADLINE_SAVE', payload: { deadlines } });
    showDeadlineBadge(deadlines.length, () => showDeadlinePanel(deadlines));
  } else {
    showDeadlinePanel([]);
  }
}

export async function executeFeature(featureId: FeatureId, options?: Record<string, unknown>): Promise<void> {
  if (isProtectedUrl(location.href)) {
    showProtectedPageError();
    return;
  }

  try {
    switch (featureId) {
      case 'findit':
        showFindItPanel((options?.query as string) ?? '');
        break;

      case 'backtrack':
        showBacktrackPanel();
        break;

      case 'context':
        showContextPanel();
        break;

      case 'tabzero':
        showTabZeroPanel();
        break;

      case 'copypaste': {
        if (options?.action === 'save') {
          await saveSelectionToClipboard();
        } else if (options?.action === 'copy') {
          const result = await copyWithSource('plain');
          if (result) {
            chrome.runtime.sendMessage({
              type: 'COPYPASTE_SAVE',
              payload: result,
            });
            showToast('✓ Copied with source');
          } else {
            showToast('Select text first', 'info');
          }
        } else {
          showCopyPastePanel();
        }
        break;
      }

      case 'urlclean':
      case 'cleanLink': {
        const url = (options?.url as string) || window.getSelection()?.toString().trim() || location.href;
        const result = cleanUrl(url);
        showCleanLinkPanel(result);
        break;
      }

      case 'webtrash':
      case 'cleanPage': {
        const result = cleanPage();
        showToast(`✓ Clean mode enabled (${result.hiddenCount} elements hidden)`);
        break;
      }

      case 'deadline':
        runDeadlineScan();
        break;

      case 'copyClean': {
        const format = (options?.format as 'plain' | 'markdown' | 'html') ?? 'plain';
        await copyCleanSelection(format);
        showToast('✓ Clean text copied');
        break;
      }

      case 'privacy': {
        const result = scanSelectionOrPage();
        showPrivacyPanel(result);
        break;
      }

      case 'screenshot':
        showScreenshotPanel();
        break;

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

      case 'saveLocal':
        showSavePanel((notes, tags) => saveLocally(notes, tags));
        break;

      case 'inspect':
        startInspectMode();
        showToast('Click an element to inspect', 'info');
        break;

      default:
        showToast('Unknown feature', 'error');
    }
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

const CONTENT_SCRIPT_MESSAGE_TYPES = new Set([
  'CTRLWEB_PING',
  'EXECUTE_FEATURE',
  'OPEN_COMMAND_PALETTE',
  'HIDE_COMMAND_PALETTE',
  'STOP_INSPECT',
  'EXIT_CLEAN_MODE',
]);

export function handleMessage(message: { type: string; payload?: unknown }): void {
  if (message.type === 'CTRLWEB_PING') return;

  switch (message.type) {
    case 'EXECUTE_FEATURE': {
      const { featureId, options } = message.payload as {
        featureId: FeatureId;
        options?: Record<string, unknown>;
      };
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
  if (!CONTENT_SCRIPT_MESSAGE_TYPES.has(message.type)) {
    return false;
  }

  if (message.type === 'CTRLWEB_PING') {
    sendResponse({ ready: true });
    return true;
  }

  handleMessage(message);
  sendResponse({ success: true });
  return true;
});

export function onExecute(): void {
  indexCurrentPage();
  console.debug('[CTRL+WEB] Content script ready');
}

if (document.readyState === 'complete') {
  indexCurrentPage();
} else {
  window.addEventListener('load', () => indexCurrentPage());
}

console.debug('[CTRL+WEB] Content script loaded');
