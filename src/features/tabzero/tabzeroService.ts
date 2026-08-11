import type { TabGroup, Workspace, WorkspaceTab } from '@/shared/types';
import { generateId } from '@/shared/utils';

const CATEGORY_RULES: Array<{ id: string; label: string; icon: string; patterns: RegExp[] }> = [
  { id: 'work', label: 'Work', icon: '💼', patterns: [/github\.com/i, /gitlab/i, /notion/i, /slack/i, /linear/i, /jira/i, /figma/i] },
  { id: 'shopping', label: 'Shopping', icon: '🛒', patterns: [/amazon/i, /ebay/i, /flipkart/i, /etsy/i, /shopify/i] },
  { id: 'research', label: 'Research', icon: '📚', patterns: [/stackoverflow/i, /wikipedia/i, /medium/i, /arxiv/i, /docs\./i, /developer/i] },
  { id: 'entertainment', label: 'Entertainment', icon: '▶', patterns: [/youtube/i, /netflix/i, /twitch/i, /reddit/i, /twitter/i, /x\.com/i] },
  { id: 'readlater', label: 'Read Later', icon: '🧠', patterns: [/news/i, /blog/i, /substack/i] },
];

export function categorizeTab(tab: chrome.tabs.Tab): string {
  const haystack = `${tab.url ?? ''} ${tab.title ?? ''}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(haystack))) return rule.id;
  }
  return 'other';
}

export function groupTabs(tabs: chrome.tabs.Tab[]): TabGroup[] {
  const groups = new Map<string, TabGroup>();

  for (const rule of CATEGORY_RULES) {
    groups.set(rule.id, { id: rule.id, label: rule.label, icon: rule.icon, tabs: [] });
  }
  groups.set('other', { id: 'other', label: 'Other', icon: '📁', tabs: [] });

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue;
    const category = categorizeTab(tab);
    groups.get(category)?.tabs.push(tab);
  }

  return [...groups.values()].filter((g) => g.tabs.length > 0);
}

export function createWorkspace(name: string, category: string, tabs: chrome.tabs.Tab[]): Workspace {
  const workspaceTabs: WorkspaceTab[] = tabs
    .filter((t) => t.url)
    .map((t) => ({ url: t.url!, title: t.title ?? t.url! }));

  return {
    id: generateId(),
    name,
    category,
    tabs: workspaceTabs,
    createdAt: Date.now(),
  };
}

export function formatWorkspaceDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
