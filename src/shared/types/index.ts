export type FeatureId =
  | 'explain'
  | 'cleanPage'
  | 'copyClean'
  | 'privacy'
  | 'screenshot'
  | 'cleanLink'
  | 'summarize'
  | 'saveLocal'
  | 'inspect';

export type CopyFormat = 'plain' | 'markdown' | 'html';

export type ScreenshotMode = 'visible' | 'selection' | 'full';

export type ScreenshotFormat = 'png' | 'jpeg';

export type Theme = 'dark' | 'light' | 'system';

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
}

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
};

export interface CommandPaletteItem extends FeatureAction {
  score?: number;
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
  | 'PAGE_RESTORED';

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
