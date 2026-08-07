import type { SummarizeInput, SummarizeResult } from '@/shared/types';
import { readingTime, wordCount } from '@/shared/utils';

export function extractReadableContent(): string {
  const selectors = ['article', 'main', '[role="main"]', '.post-content', '.article-body', '.entry-content'];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map((p) => p.textContent?.trim())
    .filter((t) => t && t.length > 40);
  if (paragraphs.length) return paragraphs.join('\n\n');
  return document.body.innerText.slice(0, 10000);
}

export function extractHeadings(): string[] {
  return Array.from(document.querySelectorAll('h1, h2, h3'))
    .map((h) => h.textContent?.trim())
    .filter((t): t is string => !!t && t.length > 0)
    .slice(0, 10);
}

export function localSummarize(input: SummarizeInput): SummarizeResult {
  const text = input.text || extractReadableContent();
  const headings = extractHeadings();
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 20);

  const summarySentences = sentences.slice(0, 5);
  const summary = summarySentences.join(' ');

  return {
    summary: summary || text.slice(0, 500),
    wordCount: wordCount(text),
    readingTime: readingTime(text),
    headings: headings.length ? headings : undefined,
    source: 'local',
  };
}

export async function summarizeContent(text?: string): Promise<SummarizeResult> {
  return localSummarize({ text: text ?? extractReadableContent(), title: document.title, url: location.href });
}
