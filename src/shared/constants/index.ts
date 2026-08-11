import type { CTRLWebFeature, FeatureId } from '@/shared/types';
import { REGISTRY_BY_ID } from '@/core/registry/featureRegistry';

export const EXTENSION_NAME = 'CTRL+WEB';
export const EXTENSION_TAGLINE = 'Your browser, but smarter.';

export const FEATURES: Record<FeatureId, { id: FeatureId; label: string; icon: string; keywords?: string[] }> = {
  findit: { id: 'findit', label: 'FindIT', icon: '🔎', keywords: ['find', 'search', 'memory', 'history', 'seen'] },
  backtrack: { id: 'backtrack', label: 'Backtrack', icon: '🧠', keywords: ['backtrack', 'history', 'timeline', 'doing'] },
  context: { id: 'context', label: 'Context', icon: '🧩', keywords: ['context', 'why', 'opened', 'tab'] },
  tabzero: { id: 'tabzero', label: 'TabZero', icon: '🗂️', keywords: ['tab', 'tabs', 'workspace', 'group'] },
  copypaste: { id: 'copypaste', label: 'CopyPaste', icon: '📋', keywords: ['copy', 'paste', 'clipboard', 'source'] },
  urlclean: { id: 'urlclean', label: 'URLClean', icon: '🔗', keywords: ['url', 'link', 'clean', 'tracking', 'utm'] },
  webtrash: { id: 'webtrash', label: 'WebTrash', icon: '🧹', keywords: ['clean', 'page', 'clutter', 'trash'] },
  deadline: { id: 'deadline', label: 'Deadline', icon: '📅', keywords: ['deadline', 'date', 'expires', 'due'] },
  explain: { id: 'explain', label: 'Explain this', icon: '🧠', keywords: ['explain', 'what', 'mean', 'understand'] },
  cleanPage: { id: 'cleanPage', label: 'Clean this page', icon: '🧹', keywords: ['clean', 'clutter', 'reader'] },
  copyClean: { id: 'copyClean', label: 'Copy clean', icon: '📋', keywords: ['copy', 'clean', 'text', 'clipboard'] },
  privacy: { id: 'privacy', label: 'Check privacy', icon: '🔐', keywords: ['privacy', 'sensitive', 'secret', 'redact'] },
  screenshot: { id: 'screenshot', label: 'Screenshot', icon: '📸', keywords: ['screenshot', 'capture', 'image'] },
  cleanLink: { id: 'cleanLink', label: 'Clean link', icon: '🔗', keywords: ['url', 'link', 'tracking', 'utm'] },
  summarize: { id: 'summarize', label: 'Summarize', icon: '📝', keywords: ['summarize', 'summary', 'tldr'] },
  saveLocal: { id: 'saveLocal', label: 'Save locally', icon: '💾', keywords: ['save', 'bookmark', 'library'] },
  inspect: { id: 'inspect', label: 'Inspect', icon: '🧪', keywords: ['inspect', 'element', 'css', 'developer'] },
};

export const SUITE_FEATURE_IDS: FeatureId[] = [
  'findit',
  'backtrack',
  'context',
  'tabzero',
  'copypaste',
  'urlclean',
  'webtrash',
  'deadline',
];

export const ALL_FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];

export const PALETTE_FEATURE_IDS: FeatureId[] = [
  ...SUITE_FEATURE_IDS,
  'explain',
  'privacy',
  'screenshot',
  'summarize',
  'saveLocal',
  'inspect',
];

export const CONTEXT_MENU_FEATURES = {
  selection: ['findit', 'copypaste', 'copyClean', 'explain', 'privacy', 'saveLocal', 'summarize'] as FeatureId[],
  link: ['urlclean', 'cleanLink', 'copypaste', 'copyClean', 'saveLocal'] as FeatureId[],
  page: ['webtrash', 'cleanPage', 'deadline', 'screenshot', 'privacy', 'summarize', 'inspect', 'context'] as FeatureId[],
  image: ['screenshot', 'saveLocal'] as FeatureId[],
};

export const CONTEXT_MENU_PRIMARY: Array<{ id: FeatureId; label: string; contexts: chrome.contextMenus.ContextType[] }> = [
  { id: 'findit', label: '🔎 Find my browsing memory', contexts: ['page'] },
  { id: 'context', label: '🧩 Why did I open this?', contexts: ['page'] },
  { id: 'copypaste', label: '📋 Save selected text', contexts: ['selection'] },
  { id: 'urlclean', label: '🔗 Clean this link', contexts: ['link'] },
  { id: 'webtrash', label: '🧹 Clean this page', contexts: ['page'] },
  { id: 'deadline', label: '📅 Detect deadlines', contexts: ['page'] },
];

export const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref',
  'referrer',
  'ref_src',
  'ref_url',
  '_ga',
  '_gl',
  'igshid',
  'si',
  'feature',
  'share',
  'spm',
];

export const PROTECTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'view-source:',
  'chrome-search://',
  'brave://',
];

export const MAX_RECENT_ACTIONS = 5;

export const STORAGE_KEYS = {
  settings: 'ctrlweb_settings',
  savedItems: 'ctrlweb_saved_items',
} as const;

/** Unified IndexedDB for v2 suite data */
export const DB_NAME = 'ctrlweb';
export const DB_VERSION = 1;
export const DB_STORES = {
  pages: 'pages',
  sessions: 'browsingSessions',
  contexts: 'tabContexts',
  workspaces: 'workspaces',
  clipboard: 'clipboard',
  deadlines: 'deadlines',
  savedItems: 'saved_items',
} as const;

/** Legacy library DB — migrated into ctrlweb on first open */
export const LEGACY_DB_NAME = 'ctrlweb_library';
export const LEGACY_DB_STORE = 'saved_items';

export const MAX_PAGE_CONTENT = 50_000;
export const VISIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export function getFeatureMeta(id: FeatureId): CTRLWebFeature | undefined {
  return (
    REGISTRY_BY_ID[id] ??
    REGISTRY_BY_ID[id === 'cleanPage' ? 'webtrash' : id === 'cleanLink' ? 'urlclean' : id === 'copyClean' ? 'copypaste' : id]
  );
}
