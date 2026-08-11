import type { BacktrackTimeline, VisitRecord } from '@/shared/types';
import { generateId } from '@/shared/utils';

export const BACKTRACK_RANGES = [
  { id: '10m', label: '10 minutes', ms: 10 * 60 * 1000 },
  { id: '30m', label: '30 minutes', ms: 30 * 60 * 1000 },
  { id: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { id: 'today', label: 'Today', ms: 0 },
  { id: 'yesterday', label: 'Yesterday', ms: -1 },
] as const;

export function createVisitRecord(tabId: number, url: string, title: string, domain: string): VisitRecord {
  return {
    id: generateId(),
    timestamp: Date.now(),
    tabId,
    url,
    title,
    domain,
  };
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function filterVisitsByRange(visits: VisitRecord[], rangeId: string): VisitRecord[] {
  const range = BACKTRACK_RANGES.find((r) => r.id === rangeId) ?? BACKTRACK_RANGES[1];
  const now = Date.now();

  if (range.id === 'today') {
    const start = startOfToday();
    return visits.filter((v) => v.timestamp >= start);
  }
  if (range.id === 'yesterday') {
    const start = startOfToday() - 86400000;
    const end = startOfToday();
    return visits.filter((v) => v.timestamp >= start && v.timestamp < end);
  }

  return visits.filter((v) => v.timestamp >= now - range.ms);
}

const STOP_WORDS = new Set(['www', 'com', 'org', 'net', 'io', 'the', 'and', 'for', 'with']);

export function inferActivityLabel(visits: VisitRecord[]): string {
  if (!visits.length) return 'No recent activity';

  const words = new Map<string, number>();
  for (const visit of visits) {
    const parts = `${visit.title} ${visit.domain}`.toLowerCase().split(/[\s\-_/|:]+/);
    for (const part of parts) {
      if (part.length < 3 || STOP_WORDS.has(part)) continue;
      words.set(part, (words.get(part) ?? 0) + 1);
    }
  }

  const top = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
  if (!top.length) return 'Browsing the web';

  const label = top.join(' · ');
  return `Researching ${label}`;
}

export function buildTimeline(visits: VisitRecord[], rangeId: string): BacktrackTimeline {
  const filtered = filterVisitsByRange(visits, rangeId);
  const range = BACKTRACK_RANGES.find((r) => r.id === rangeId);
  return {
    visits: filtered,
    activityLabel: inferActivityLabel(filtered),
    rangeLabel: range?.label ?? 'Recent',
  };
}

export function formatVisitTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
