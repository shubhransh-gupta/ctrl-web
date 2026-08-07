import type { FeatureAction, FeatureId } from '../types';

export const EXTENSION_NAME = 'CTRL+WEB';
export const EXTENSION_TAGLINE = 'Your browser, but smarter.';

export const FEATURES: Record<FeatureId, FeatureAction> = {
  explain: {
    id: 'explain',
    label: 'Explain this',
    icon: '🧠',
    keywords: ['explain', 'what', 'mean', 'understand', 'define'],
  },
  cleanPage: {
    id: 'cleanPage',
    label: 'Clean this page',
    icon: '🧹',
    keywords: ['clean', 'clutter', 'remove', 'distraction', 'reader'],
  },
  copyClean: {
    id: 'copyClean',
    label: 'Copy clean',
    icon: '📋',
    keywords: ['copy', 'clean', 'text', 'clipboard', 'format'],
  },
  privacy: {
    id: 'privacy',
    label: 'Check privacy',
    icon: '🔐',
    keywords: ['privacy', 'sensitive', 'secret', 'redact', 'scan'],
  },
  screenshot: {
    id: 'screenshot',
    label: 'Screenshot',
    icon: '📸',
    keywords: ['screenshot', 'capture', 'image', 'photo', 'screen'],
  },
  cleanLink: {
    id: 'cleanLink',
    label: 'Clean link',
    icon: '🔗',
    keywords: ['url', 'link', 'tracking', 'utm', 'clean'],
  },
  summarize: {
    id: 'summarize',
    label: 'Summarize',
    icon: '📝',
    keywords: ['summarize', 'summary', 'tldr', 'brief', 'overview'],
  },
  saveLocal: {
    id: 'saveLocal',
    label: 'Save locally',
    icon: '💾',
    keywords: ['save', 'bookmark', 'library', 'store', 'keep'],
  },
  inspect: {
    id: 'inspect',
    label: 'Inspect',
    icon: '🧪',
    keywords: ['inspect', 'element', 'css', 'developer', 'dom'],
  },
};

export const ALL_FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];

export const CONTEXT_MENU_FEATURES = {
  selection: ['explain', 'copyClean', 'privacy', 'saveLocal', 'summarize'] as FeatureId[],
  link: ['cleanLink', 'copyClean', 'saveLocal'] as FeatureId[],
  page: ['cleanPage', 'screenshot', 'privacy', 'summarize', 'inspect'] as FeatureId[],
  image: ['screenshot', 'saveLocal'] as FeatureId[],
};

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

export const DB_NAME = 'ctrlweb_library';
export const DB_VERSION = 1;
export const DB_STORE = 'saved_items';
