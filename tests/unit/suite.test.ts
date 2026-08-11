import { describe, it, expect } from 'vitest';
import { rankPages, createPageMemory } from '@/features/findit/finditService';
import type { PageMemory } from '@/shared/types';
import { buildTimeline, filterVisitsByRange, inferActivityLabel } from '@/features/backtrack/backtrackService';
import { buildTabContext } from '@/features/context/contextService';
import { categorizeTab, groupTabs } from '@/features/tabzero/tabzeroService';
import { cleanUrl } from '@/features/cleanLink/cleanLink';
import { detectDeadlines } from '@/features/deadline/deadlineService';
import { filterClipboardSearch, createClipboardMemory } from '@/features/copypaste/copypasteService';

const samplePage = (overrides: Partial<PageMemory> = {}): PageMemory => ({
  id: '1',
  url: 'https://github.com/org/repo',
  title: 'AI agents repository',
  domain: 'github.com',
  headings: ['Swift actors', 'Installation'],
  content: 'This repository demonstrates AI browser agents and swift actors patterns.',
  firstSeen: Date.now() - 86400000,
  lastVisited: Date.now(),
  visitCount: 2,
  pinned: false,
  ...overrides,
});

describe('FindIT', () => {
  it('ranks title matches higher than body', () => {
    const pages = [
      samplePage({ id: 'a', title: 'Random blog', content: 'swift actors everywhere' }),
      samplePage({ id: 'b', title: 'Swift actors guide', content: 'misc' }),
    ];
    const results = rankPages(pages, 'swift actors');
    expect(results[0].page.id).toBe('b');
  });

  it('supports site: filter', () => {
    const pages = [
      samplePage({ id: 'a', domain: 'github.com' }),
      samplePage({ id: 'b', domain: 'reddit.com', url: 'https://reddit.com/r/test' }),
    ];
    const results = rankPages(pages, 'site:github.com agents');
    expect(results.every((r) => r.page.domain.includes('github'))).toBe(true);
  });

  it('deduplicates visits into one page memory', () => {
    const existing = createPageMemory({
      url: 'https://example.com',
      title: 'Example',
      headings: [],
      content: 'hello',
      existing: samplePage({ visitCount: 1, firstSeen: 1000 }),
    });
    expect(existing.visitCount).toBe(2);
    expect(existing.firstSeen).toBe(1000);
  });
});

describe('Backtrack', () => {
  const visits = [
    { id: '1', timestamp: Date.now() - 5 * 60000, tabId: 1, url: 'https://google.com', title: 'AI browser automation', domain: 'google.com' },
    { id: '2', timestamp: Date.now() - 2 * 60000, tabId: 2, url: 'https://github.com/demo', title: 'computer-use-demo', domain: 'github.com' },
  ];

  it('orders timeline chronologically within range', () => {
    const filtered = filterVisitsByRange(visits, '30m');
    expect(filtered).toHaveLength(2);
    expect(filtered[0].timestamp).toBeLessThan(filtered[1].timestamp);
  });

  it('infers activity label from titles', () => {
    const label = inferActivityLabel(visits);
    expect(label.toLowerCase()).toContain('browser');
  });

  it('builds timeline object', () => {
    const timeline = buildTimeline(visits, '30m');
    expect(timeline.visits).toHaveLength(2);
    expect(timeline.activityLabel).toBeTruthy();
  });
});

describe('Context', () => {
  it('links tab to related recent pages by keywords', () => {
    const recent = [
      { id: '1', timestamp: 1, tabId: 1, url: 'https://google.com/search?q=swift+dependency+injection', title: 'swift dependency injection', domain: 'google.com' },
      { id: '2', timestamp: 2, tabId: 2, url: 'https://stackoverflow.com/q/1', title: 'Swift dependency injection answer', domain: 'stackoverflow.com' },
    ];
    const ctx = buildTabContext(3, 'https://github.com/swift/repo', 'Swift DI repo', recent);
    expect(ctx.relatedPages.length).toBeGreaterThan(0);
    expect(ctx.topic.length).toBeGreaterThan(0);
  });
});

describe('TabZero', () => {
  it('groups github tabs as work', () => {
    const tabs = [{ id: 1, url: 'https://github.com/a/b', title: 'Repo' }] as chrome.tabs.Tab[];
    expect(categorizeTab(tabs[0])).toBe('work');
    const groups = groupTabs(tabs);
    expect(groups.find((g) => g.id === 'work')?.tabs).toHaveLength(1);
  });
});

describe('URLClean', () => {
  it('removes tracking params conservatively', () => {
    const result = cleanUrl('https://example.com/article?utm_source=twitter&fbclid=123&page=2');
    expect(result.cleaned).toContain('page=2');
    expect(result.cleaned).not.toContain('utm_source');
    expect(result.removedParams).toContain('utm_source');
  });
});

describe('Deadline', () => {
  it('detects deadline near keyword', () => {
    const text = 'Applications close September 15, 2026. Please apply soon.';
    const found = detectDeadlines(text, 'https://example.com/jobs');
    expect(found.length).toBeGreaterThan(0);
  });

  it('ignores random dates without keywords', () => {
    const text = 'Published on September 15, 2026 by the author.';
    const found = detectDeadlines(text, 'https://example.com/blog');
    expect(found.length).toBe(0);
  });
});

describe('CopyPaste', () => {
  it('stores clipboard memory shape', () => {
    const item = createClipboardMemory({ text: 'hello', sourceUrl: 'https://swift.org' });
    expect(item.text).toBe('hello');
    expect(item.sourceUrl).toContain('swift.org');
  });

  it('filters clipboard search', () => {
    const items = [
      createClipboardMemory({ text: 'Actors protect mutable state', sourceUrl: 'https://swift.org' }),
      createClipboardMemory({ text: 'Price ₹84999', sourceUrl: 'https://amazon.in' }),
    ];
    expect(filterClipboardSearch(items, 'actors')).toHaveLength(1);
  });
});
