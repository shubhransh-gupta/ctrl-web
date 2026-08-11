export type SuiteFeatureId =
  | 'findit'
  | 'backtrack'
  | 'context'
  | 'tabzero'
  | 'copypaste'
  | 'urlclean'
  | 'webtrash'
  | 'deadline';

export type LegacyFeatureId =
  | 'explain'
  | 'cleanPage'
  | 'copyClean'
  | 'privacy'
  | 'screenshot'
  | 'cleanLink'
  | 'summarize'
  | 'saveLocal'
  | 'inspect';

export type FeatureId = SuiteFeatureId | LegacyFeatureId;

export type CopyFormat = 'plain' | 'markdown' | 'html';

export type ScreenshotMode = 'visible' | 'selection' | 'full';

export type ScreenshotFormat = 'png' | 'jpeg';

export type Theme = 'dark' | 'light' | 'system';

export interface CTRLWebFeature {
  id: FeatureId;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  keywords: string[];
  category: 'suite' | 'utility';
}

export interface FeatureToggle {
  enabled: boolean;
}

export interface FeatureAction {
  id: FeatureId;
  label: string;
  icon: string;
  keywords?: string[];
}

export interface MessagePayload {
  type: string;
  payload?: unknown;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TabContext {
  url: string;
  title: string;
  hostname: string;
  selectedText?: string;
  linkUrl?: string;
  pageUrl?: string;
}

export interface ContextMenuContext {
  hasSelection: boolean;
  isLink: boolean;
  isImage: boolean;
  isPage: boolean;
}

export interface PrivacyIssue {
  type: string;
  label: string;
  value: string;
  start: number;
  end: number;
  severity: 'low' | 'medium' | 'high';
}

export interface PrivacyScanResult {
  issues: PrivacyIssue[];
  text: string;
}

export interface SavedItem {
  id: string;
  url: string;
  title: string;
  selectedText?: string;
  notes?: string;
  tags: string[];
  timestamp: number;
}

export interface PageMemory {
  id: string;
  url: string;
  title: string;
  domain: string;
  description?: string;
  headings: string[];
  content: string;
  firstSeen: number;
  lastVisited: number;
  visitCount: number;
  pinned: boolean;
}

export interface VisitRecord {
  id: string;
  timestamp: number;
  tabId: number;
  url: string;
  title: string;
  domain: string;
}

export interface TabContextRecord {
  tabId: number;
  url: string;
  title: string;
  openedAt: number;
  topic: string;
  relatedPages: Array<{ title: string; url: string }>;
}

export interface WorkspaceTab {
  url: string;
  title: string;
}

export interface Workspace {
  id: string;
  name: string;
  category: string;
  tabs: WorkspaceTab[];
  createdAt: number;
}

export interface ClipboardMemory {
  id: string;
  text: string;
  sourceUrl?: string;
  pageTitle?: string;
  timestamp: number;
}

export interface DeadlineItem {
  id: string;
  label: string;
  date: number;
  sourceUrl: string;
  sourceText: string;
  reminded: boolean;
}

export interface FindItSearchResult {
  page: PageMemory;
  score: number;
  snippet: string;
  highlights: string[];
}

export interface BacktrackTimeline {
  visits: VisitRecord[];
  activityLabel: string;
  rangeLabel: string;
}

export interface TabGroup {
  id: string;
  label: string;
  icon: string;
  tabs: chrome.tabs.Tab[];
}

export interface ExplainInput {
  text: string;
  context?: string;
}

export interface ExplanationProvider {
  explain(input: ExplainInput): Promise<ExplanationResult>;
}

export interface ExplanationSection {
  title: string;
  content: string | string[];
}

export interface ExplanationResult {
  title: string;
  sections: ExplanationSection[];
  source: 'local' | 'ai';
}

export interface SummarizeInput {
  text: string;
  title?: string;
  url?: string;
}

export interface SummarizeResult {
  summary: string;
  wordCount: number;
  readingTime: string;
  headings?: string[];
  source: 'local' | 'ai';
}

export interface InspectElementData {
  tagName: string;
  selector: string;
  xpath: string;
  dimensions: { width: number; height: number };
  typography: {
    fontSize: string;
    lineHeight: string;
    fontFamily: string;
    fontWeight: string;
  };
  colors: { property: string; value: string }[];
  spacing: { property: string; value: string }[];
  cssText: string;
  html: string;
}

export interface CleanLinkResult {
  original: string;
  cleaned: string;
  removedParams: string[];
}

export interface ExtensionSettings {
  theme: Theme;
  screenshotFormat: ScreenshotFormat;
  screenshotQuality: number;
  defaultCopyFormat: CopyFormat;
  confirmBeforeAI: boolean;
  aiEnabled: boolean;
  aiProvider: 'openai' | 'anthropic' | 'custom' | '';
  aiApiKey: string;
  aiModel: string;
  localOnlyMode: boolean;
  sensitiveDataDetection: boolean;
  debugMode: boolean;
  recentActions: FeatureId[];
  paused: boolean;
  indexBrowsing: boolean;
  trackBrowsingContext: boolean;
  storeClipboard: boolean;
  detectDeadlines: boolean;
  excludedDomains: string[];
  features: Record<string, FeatureToggle>;
}

export const DEFAULT_FEATURE_TOGGLES: Record<string, FeatureToggle> = {
  findit: { enabled: true },
  backtrack: { enabled: true },
  context: { enabled: true },
  tabzero: { enabled: true },
  copypaste: { enabled: true },
  urlclean: { enabled: true },
  webtrash: { enabled: true },
  deadline: { enabled: true },
  explain: { enabled: true },
  privacy: { enabled: true },
  screenshot: { enabled: true },
  summarize: { enabled: true },
  saveLocal: { enabled: true },
  inspect: { enabled: true },
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  theme: 'dark',
  screenshotFormat: 'png',
  screenshotQuality: 92,
  defaultCopyFormat: 'plain',
  confirmBeforeAI: true,
  aiEnabled: false,
  aiProvider: '',
  aiApiKey: '',
  aiModel: '',
  localOnlyMode: true,
  sensitiveDataDetection: true,
  debugMode: false,
  recentActions: [],
  paused: false,
  indexBrowsing: true,
  trackBrowsingContext: true,
  storeClipboard: false,
  detectDeadlines: true,
  excludedDomains: [],
  features: DEFAULT_FEATURE_TOGGLES,
};

export interface CommandPaletteItem extends FeatureAction {
  score?: number;
  description?: string;
}

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export type MessageType =
  | 'EXECUTE_FEATURE'
  | 'GET_TAB_CONTEXT'
  | 'SHOW_TOAST'
  | 'SHOW_PANEL'
  | 'HIDE_PANEL'
  | 'OPEN_COMMAND_PALETTE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'SAVE_ITEM'
  | 'GET_SAVED_ITEMS'
  | 'DELETE_SAVED_ITEM'
  | 'SCREENSHOT_CAPTURE'
  | 'PAGE_CLEANED'
  | 'PAGE_RESTORED'
  | 'INDEX_PAGE'
  | 'FINDIT_SEARCH'
  | 'BACKTRACK_GET'
  | 'CONTEXT_GET'
  | 'TABZERO_GET'
  | 'TABZERO_SAVE'
  | 'TABZERO_CLOSE'
  | 'TABZERO_RESUME'
  | 'COPYPASTE_GET'
  | 'COPYPASTE_SAVE'
  | 'COPYPASTE_DELETE'
  | 'COPYPASTE_CLEAR'
  | 'DEADLINE_SAVE'
  | 'DEADLINE_GET'
  | 'EXPORT_DATA'
  | 'IMPORT_DATA'
  | 'DELETE_ALL_DATA'
  | 'GET_FEATURE_STATS';

export interface ExecuteFeatureMessage {
  type: 'EXECUTE_FEATURE';
  payload: {
    featureId: FeatureId;
    options?: Record<string, unknown>;
  };
}

export interface FeatureResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
