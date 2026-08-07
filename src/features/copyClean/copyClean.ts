import type { CopyFormat } from '@/shared/types';

const CLUTTER_PATTERNS = [
  /^ADVERTISEMENT$/i,
  /^Advertisement$/i,
  /^Sponsored$/i,
  /^Share$/i,
  /^Share on/i,
  /^Follow us/i,
  /^Subscribe$/i,
  /^Sign up$/i,
  /^Newsletter$/i,
  /^Cookie/i,
  /^Accept all$/i,
  /^Read more$/i,
  /^Related articles?$/i,
  /^Recommended$/i,
  /^Trending$/i,
  /^Facebook$/i,
  /^Twitter$/i,
  /^LinkedIn$/i,
  /^Copy link$/i,
  /^Print$/i,
  /^Comments?$/i,
  /^\d+ comments?$/i,
  /^Skip to content$/i,
  /^Table of contents$/i,
];

const NAV_PATTERNS = [
  /^Home$/i,
  /^Menu$/i,
  /^Search$/i,
  /^Login$/i,
  /^Sign in$/i,
  /^Register$/i,
];

function isClutterLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length <= 2) return true;
  return CLUTTER_PATTERNS.some((p) => p.test(trimmed)) || NAV_PATTERNS.some((p) => p.test(trimmed));
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => {
      if (!line) return i === 0 || arr[i - 1] !== '';
      return !isClutterLine(line);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removeTrackingFromText(text: string): string {
  return text.replace(
    /https?:\/\/[^\s]+?(?:[?&](?:utm_[^&\s]+|fbclid|gclid|mc_cid|mc_eid)=[^&\s]+)+[^\s]*/gi,
    (url) => {
      try {
        const u = new URL(url);
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'mc_cid', 'mc_eid'].forEach(
          (p) => u.searchParams.delete(p)
        );
        return u.toString().replace(/\?$/, '');
      } catch {
        return url;
      }
    }
  );
}

function deduplicateLines(text: string): string {
  const lines = text.split('\n');
  const seen = new Set<string>();
  return lines
    .filter((line) => {
      const key = line.trim().toLowerCase();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n');
}

export function cleanText(raw: string): string {
  let text = raw;
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');
  text = removeTrackingFromText(text);
  text = normalizeWhitespace(text);
  text = deduplicateLines(text);
  return text.trim();
}

export function toMarkdown(text: string): string {
  const cleaned = cleanText(text);
  const lines = cleaned.split('\n');
  return lines
    .map((line) => {
      if (line.length < 80 && !line.endsWith('.') && !line.endsWith(',') && line === line.toUpperCase() && line.length > 3) {
        return `## ${line}`;
      }
      return line;
    })
    .join('\n\n');
}

export function toHtml(text: string): string {
  const cleaned = cleanText(text);
  const paragraphs = cleaned.split(/\n\n+/);
  return paragraphs.map((p) => `<p>${escapeHtml(p.replace(/\n/g, '<br>'))}</p>`).join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatCleanText(text: string, format: CopyFormat): string {
  switch (format) {
    case 'markdown':
      return toMarkdown(text);
    case 'html':
      return toHtml(text);
    default:
      return cleanText(text);
  }
}

export function getSelectionText(): string {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';
  return selection.toString();
}

export async function copyCleanSelection(format: CopyFormat = 'plain'): Promise<string> {
  const raw = getSelectionText();
  if (!raw.trim()) {
    const article = document.querySelector('article, main, [role="main"]');
    const fallback = article?.textContent ?? document.body.innerText.slice(0, 5000);
    const cleaned = formatCleanText(fallback, format);
    await navigator.clipboard.writeText(cleaned);
    return cleaned;
  }
  const cleaned = formatCleanText(raw, format);
  await navigator.clipboard.writeText(cleaned);
  return cleaned;
}
