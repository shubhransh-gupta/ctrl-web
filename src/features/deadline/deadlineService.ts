import type { DeadlineItem } from '@/shared/types';
import { generateId } from '@/shared/utils';

const KEYWORDS = [
  'deadline',
  'expires',
  'expiration',
  'ends',
  'end date',
  'last date',
  'apply by',
  'application closes',
  'applications close',
  'registration closes',
  'valid until',
  'offer ends',
  'due by',
  'submit by',
  'closes',
  'close',
];

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDateFromText(text: string, ref = new Date()): number | null {
  const lower = text.toLowerCase().trim();

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    return d.getTime();
  }
  if (/\btoday\b/.test(lower)) {
    const d = new Date(ref);
    d.setHours(23, 59, 0, 0);
    return d.getTime();
  }

  const iso = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime();
  }

  const slash = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (slash) {
    return new Date(+slash[3], +slash[1] - 1, +slash[2]).getTime();
  }

  const named = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i);
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    const day = +named[2];
    const year = named[3] ? +named[3] : ref.getFullYear();
    return new Date(year, month, day).getTime();
  }

  return null;
}

function hasKeywordNearby(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 80), index + 80).toLowerCase();
  return KEYWORDS.some((k) => window.includes(k));
}

export function detectDeadlines(pageText: string, sourceUrl: string): DeadlineItem[] {
  const results: DeadlineItem[] = [];
  const seen = new Set<number>();

  const patterns = [
    /\b(?:deadline|expires|ends|closes|close|valid until|apply by|last date(?: to apply)?|registration closes|applications close)[:\s]+([^.!?\n]{3,60})/gi,
    /\b(on|by)\s+((?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+\d{1,2}(?:,?\s+20\d{2})?)/gi,
    /\b(tomorrow|today)\b/gi,
    /\b((?:january|february|march|april|may|june|july|august|september|october|november|december)\.?\s+\d{1,2},?\s+20\d{2})/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(pageText)) !== null) {
      const sourceText = match[0].trim();
      const datePart = match[1] ?? match[0];
      if (!hasKeywordNearby(pageText, match.index) && !KEYWORDS.some((k) => sourceText.toLowerCase().includes(k))) {
        continue;
      }

      const date = parseDateFromText(datePart);
      if (!date || date < Date.now() - 86400000) continue;
      if (seen.has(date)) continue;
      seen.add(date);

      results.push({
        id: generateId(),
        label: sourceText.replace(/\s+/g, ' ').slice(0, 80),
        date,
        sourceUrl,
        sourceText,
        reminded: false,
      });
    }
  }

  return results.slice(0, 10);
}

export function formatDeadlineDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function scanPageForDeadlines(): DeadlineItem[] {
  const text = document.body?.innerText ?? '';
  return detectDeadlines(text.slice(0, 100_000), location.href);
}
