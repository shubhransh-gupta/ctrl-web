import type { FindItSearchResult, PageMemory } from '@/shared/types';
import { generateId, getHostname } from '@/shared/utils';

const TITLE_WEIGHT = 5;
const HEADING_WEIGHT = 4;
const URL_WEIGHT = 3;
const DOMAIN_WEIGHT = 2;
const BODY_WEIGHT = 1;

export interface SearchOptions {
  query: string;
  site?: string;
  since?: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./?&=_-]+/)
    .filter((t) => t.length > 1);
}

function parseQuery(raw: string): SearchOptions {
  let query = raw.trim();
  let site: string | undefined;
  let since: number | undefined;
  const now = Date.now();

  const siteMatch = query.match(/\bsite:([^\s]+)/i);
  if (siteMatch) {
    site = siteMatch[1].replace(/^www\./, '');
    query = query.replace(siteMatch[0], '').trim();
  }

  if (/\blast week\b/i.test(raw)) since = now - 7 * 24 * 60 * 60 * 1000;
  else if (/\blast month\b/i.test(raw)) since = now - 30 * 24 * 60 * 60 * 1000;
  else if (/\btoday\b/i.test(raw)) since = new Date().setHours(0, 0, 0, 0);
  else if (/\byesterday\b/i.test(raw)) since = now - 24 * 60 * 60 * 1000;

  query = query.replace(/\b(last week|last month|today|yesterday)\b/gi, '').trim();

  return { query, site, since };
}

function scoreField(tokens: string[], field: string, weight: number): number {
  const lower = field.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += weight;
    if (lower.split(/\s+/).some((word) => word.startsWith(token))) score += weight * 0.5;
  }
  return score;
}

function buildSnippet(content: string, tokens: string[], max = 140): string {
  const lower = content.toLowerCase();
  let idx = 0;
  for (const token of tokens) {
    const found = lower.indexOf(token);
    if (found >= 0) {
      idx = Math.max(0, found - 40);
      break;
    }
  }
  const snippet = content.slice(idx, idx + max).trim();
  return (idx > 0 ? '…' : '') + snippet + (idx + max < content.length ? '…' : '');
}

export function rankPages(pages: PageMemory[], rawQuery: string): FindItSearchResult[] {
  const { query, site, since } = parseQuery(rawQuery);
  const tokens = tokenize(query);

  let filtered = pages;
  if (site) filtered = filtered.filter((p) => p.domain.includes(site!));
  if (since) filtered = filtered.filter((p) => p.lastVisited >= since!);

  const results = filtered
    .map((page) => {
      const titleScore = scoreField(tokens, page.title, TITLE_WEIGHT);
      const headingScore = page.headings.reduce((s, h) => s + scoreField(tokens, h, HEADING_WEIGHT), 0);
      const urlScore = scoreField(tokens, page.url, URL_WEIGHT);
      const domainScore = scoreField(tokens, page.domain, DOMAIN_WEIGHT);
      const bodyScore = scoreField(tokens, page.content, BODY_WEIGHT);
      const pinnedBoost = page.pinned ? 10 : 0;
      const recencyBoost = page.lastVisited > Date.now() - 86400000 ? 2 : 0;
      const score = titleScore + headingScore + urlScore + domainScore + bodyScore + pinnedBoost + recencyBoost;

      return {
        page,
        score,
        snippet: buildSnippet(page.content || page.description || page.title, tokens),
        highlights: tokens.filter((t) =>
          [page.title, page.url, ...page.headings, page.content].some((f) => f.toLowerCase().includes(t))
        ),
      };
    })
    .filter((r) => !query || r.score > 0)
    .sort((a, b) => b.score - a.score || b.page.lastVisited - a.page.lastVisited);

  return query ? results : results.sort((a, b) => b.page.lastVisited - a.page.lastVisited);
}

export function createPageMemory(input: {
  url: string;
  title: string;
  description?: string;
  headings: string[];
  content: string;
  existing?: PageMemory;
}): PageMemory {
  const now = Date.now();
  const domain = getHostname(input.url);
  return {
    id: input.existing?.id ?? generateId(),
    url: input.url,
    title: input.title,
    domain,
    description: input.description,
    headings: input.headings,
    content: input.content,
    firstSeen: input.existing?.firstSeen ?? now,
    lastVisited: now,
    visitCount: (input.existing?.visitCount ?? 0) + 1,
    pinned: input.existing?.pinned ?? false,
  };
}

/** Placeholder for future semantic search provider */
export interface SemanticSearchProvider {
  search(query: string, pages: PageMemory[]): Promise<FindItSearchResult[]>;
}

export class LocalKeywordSearchProvider implements SemanticSearchProvider {
  async search(query: string, pages: PageMemory[]): Promise<FindItSearchResult[]> {
    return rankPages(pages, query);
  }
}
