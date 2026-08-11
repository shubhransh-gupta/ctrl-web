import type { CTRLWebFeature, FeatureId } from '@/shared/types';

export const SUITE_FEATURES: CTRLWebFeature[] = [
  {
    id: 'findit',
    name: 'FindIT',
    description: "Find anything you've seen",
    icon: '🔎',
    enabled: true,
    keywords: ['find', 'search', 'memory', 'history', 'seen', 'article'],
    category: 'suite',
  },
  {
    id: 'backtrack',
    name: 'Backtrack',
    description: 'What was I doing?',
    icon: '🧠',
    keywords: ['backtrack', 'history', 'timeline', 'activity', 'doing', 'recent'],
    enabled: true,
    category: 'suite',
  },
  {
    id: 'context',
    name: 'Context',
    description: 'Why did I open this?',
    icon: '🧩',
    keywords: ['context', 'why', 'opened', 'tab', 'research'],
    enabled: true,
    category: 'suite',
  },
  {
    id: 'tabzero',
    name: 'TabZero',
    description: 'Turn tabs into tasks',
    icon: '🗂️',
    keywords: ['tab', 'tabs', 'workspace', 'group', 'organize', 'close'],
    enabled: true,
    category: 'suite',
  },
  {
    id: 'copypaste',
    name: 'CopyPaste',
    description: 'Clipboard with sources',
    icon: '📋',
    keywords: ['copy', 'paste', 'clipboard', 'source', 'clip'],
    enabled: true,
    category: 'suite',
  },
  {
    id: 'urlclean',
    name: 'URLClean',
    description: 'Clean any link',
    icon: '🔗',
    keywords: ['url', 'link', 'clean', 'tracking', 'utm'],
    enabled: true,
    category: 'suite',
  },
  {
    id: 'webtrash',
    name: 'WebTrash',
    description: 'Clean this page',
    icon: '🧹',
    keywords: ['clean', 'page', 'clutter', 'trash', 'reader', 'distraction'],
    enabled: true,
    category: 'suite',
  },
  {
    id: 'deadline',
    name: 'Deadline',
    description: 'Detect important dates',
    icon: '📅',
    keywords: ['deadline', 'date', 'expires', 'due', 'apply', 'registration'],
    enabled: true,
    category: 'suite',
  },
];

export const UTILITY_FEATURES: CTRLWebFeature[] = [
  {
    id: 'copyClean',
    name: 'Copy clean',
    description: 'Copy selected text without clutter',
    icon: '📋',
    enabled: true,
    keywords: ['copy', 'clean', 'text', 'format'],
    category: 'utility',
  },
  {
    id: 'explain',
    name: 'Explain this',
    description: 'Understand technical terms locally',
    icon: '🧠',
    enabled: true,
    keywords: ['explain', 'define', 'mean'],
    category: 'utility',
  },
  {
    id: 'privacy',
    name: 'Check privacy',
    description: 'Scan for sensitive data',
    icon: '🔐',
    enabled: true,
    keywords: ['privacy', 'secret', 'redact'],
    category: 'utility',
  },
  {
    id: 'screenshot',
    name: 'Screenshot',
    description: 'Capture visible, selection, or full page',
    icon: '📸',
    enabled: true,
    keywords: ['screenshot', 'capture', 'screen'],
    category: 'utility',
  },
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Quick local page summary',
    icon: '📝',
    enabled: true,
    keywords: ['summarize', 'summary', 'tldr'],
    category: 'utility',
  },
  {
    id: 'saveLocal',
    name: 'Save locally',
    description: 'Save to personal library',
    icon: '💾',
    enabled: true,
    keywords: ['save', 'library', 'bookmark'],
    category: 'utility',
  },
  {
    id: 'inspect',
    name: 'Inspect',
    description: 'Copy CSS and selectors',
    icon: '🧪',
    enabled: true,
    keywords: ['inspect', 'css', 'developer'],
    category: 'utility',
  },
];

export const ALL_REGISTRY_FEATURES = [...SUITE_FEATURES, ...UTILITY_FEATURES];

export const SUITE_FEATURE_IDS = SUITE_FEATURES.map((f) => f.id) as FeatureId[];

export const REGISTRY_BY_ID: Record<string, CTRLWebFeature> = Object.fromEntries(
  ALL_REGISTRY_FEATURES.map((f) => [f.id, f])
);

export function getRegistryFeature(id: FeatureId): CTRLWebFeature | undefined {
  return REGISTRY_BY_ID[id];
}

/** Legacy IDs map to suite feature metadata for palette/search */
export const LEGACY_FEATURE_ALIASES: Partial<Record<FeatureId, FeatureId>> = {
  cleanPage: 'webtrash',
  cleanLink: 'urlclean',
  copyClean: 'copypaste',
};
