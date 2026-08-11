import type { ClipboardMemory } from '@/shared/types';
import { generateId } from '@/shared/utils';
import { copyCleanSelection } from '@/features/copyClean/copyClean';

export async function copyWithSource(
  format: 'plain' | 'markdown' | 'html' = 'plain'
): Promise<{ text: string; sourceUrl: string; pageTitle: string } | null> {
  const selection = window.getSelection()?.toString().trim();
  if (!selection) return null;

  await copyCleanSelection(format);
  return {
    text: selection,
    sourceUrl: location.href,
    pageTitle: document.title,
  };
}

export function createClipboardMemory(input: {
  text: string;
  sourceUrl?: string;
  pageTitle?: string;
}): ClipboardMemory {
  return {
    id: generateId(),
    text: input.text,
    sourceUrl: input.sourceUrl,
    pageTitle: input.pageTitle,
    timestamp: Date.now(),
  };
}

export function formatClipboardPreview(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

export function filterClipboardSearch(items: ClipboardMemory[], query: string): ClipboardMemory[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.text.toLowerCase().includes(q) ||
      item.pageTitle?.toLowerCase().includes(q) ||
      item.sourceUrl?.toLowerCase().includes(q)
  );
}
