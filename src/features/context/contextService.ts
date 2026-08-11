import type { TabContextRecord, VisitRecord } from '@/shared/types';

const STOP_WORDS = new Set(['www', 'com', 'org', 'the', 'and', 'for', 'with', 'http', 'https']);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_/|:.,!?]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function sharedKeywordScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((w) => setB.has(w)).length;
}

export function buildTabContext(
  tabId: number,
  url: string,
  title: string,
  recentVisits: VisitRecord[],
  openedAt = Date.now()
): TabContextRecord {
  const currentKeywords = extractKeywords(title);
  const prior = recentVisits
    .filter((v) => v.url !== url)
    .slice(-8)
    .reverse();

  const scored = prior
    .map((visit) => ({
      visit,
      score: sharedKeywordScore(currentKeywords, extractKeywords(visit.title)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const relatedPages = scored.slice(0, 4).map(({ visit }) => ({
    title: visit.title,
    url: visit.url,
  }));

  const topicSource = scored[0]?.visit.title ?? prior[0]?.title ?? title;
  const topic = extractKeywords(topicSource).slice(0, 4).join(' ') || title;

  return {
    tabId,
    url,
    title,
    openedAt,
    topic,
    relatedPages,
  };
}

export function formatRelativeOpened(openedAt: number): string {
  const diff = Date.now() - openedAt;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
