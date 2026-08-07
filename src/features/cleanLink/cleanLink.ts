import type { CleanLinkResult } from '@/shared/types';
import { TRACKING_PARAMS } from '@/shared/constants';

const SAFE_PARAMS = new Set([
  'q',
  'query',
  'search',
  'id',
  'page',
  'sort',
  'filter',
  'category',
  'tag',
  'lang',
  'locale',
  'v',
  'version',
  'tab',
  'view',
  'type',
  'format',
  'size',
  'width',
  'height',
  't',
  'time',
  'start',
  'end',
  'limit',
  'offset',
  'p',
  'ref',
]);

export function cleanUrl(input: string): CleanLinkResult {
  let urlStr = input.trim();
  if (!urlStr.match(/^https?:\/\//i)) {
    urlStr = 'https://' + urlStr;
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return { original: input, cleaned: input, removedParams: [] };
  }

  const removedParams: string[] = [];
  const paramsToRemove = [...url.searchParams.keys()].filter((key) => {
    const lower = key.toLowerCase();
    if (SAFE_PARAMS.has(lower)) return false;
    if (TRACKING_PARAMS.includes(lower)) return true;
    if (lower.startsWith('utm_')) return true;
    if (lower.endsWith('_cid') || lower.endsWith('_eid')) return true;
    return false;
  });

  for (const param of paramsToRemove) {
    removedParams.push(param);
    url.searchParams.delete(param);
  }

  let cleaned = url.toString();
  cleaned = cleaned.replace(/\/$/, '');
  if (url.pathname === '/' && !url.search) {
    cleaned = cleaned.replace(/\/$/, '');
  }

  return {
    original: input.trim(),
    cleaned,
    removedParams,
  };
}

export function urlToMarkdown(url: string, title?: string): string {
  const label = title ?? url;
  return `[${label}](${url})`;
}

export function urlToHtml(url: string, title?: string): string {
  const label = title ?? url;
  return `<a href="${url}">${label}</a>`;
}

export async function copyCleanUrl(input: string): Promise<CleanLinkResult> {
  const result = cleanUrl(input);
  await navigator.clipboard.writeText(result.cleaned);
  return result;
}
