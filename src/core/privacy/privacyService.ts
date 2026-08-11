import type { ExtensionSettings } from '@/shared/types';
import { PROTECTED_URL_PREFIXES } from '@/shared/constants';
import { getHostname } from '@/shared/utils';

export const DEFAULT_EXCLUDED_DOMAINS = [
  'accounts.google.com',
  'login.live.com',
  'paypal.com',
  'stripe.com',
  '1password.com',
  'lastpass.com',
  'bitwarden.com',
  'dashlane.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
];

const SENSITIVE_KEYWORDS = [
  'login',
  'signin',
  'sign-in',
  'auth',
  'password',
  'checkout',
  'payment',
  'bank',
  'wallet',
  'billing',
  'secure',
];

export const PrivacyService = {
  isProtectedUrl(url: string): boolean {
    return PROTECTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
  },

  isDomainExcluded(url: string, settings: ExtensionSettings): boolean {
    if (!url || this.isProtectedUrl(url)) return true;
    const hostname = getHostname(url).toLowerCase();
    const excluded = [...DEFAULT_EXCLUDED_DOMAINS, ...settings.excludedDomains];
    return excluded.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`) || hostname.includes(domain)
    );
  },

  isSensitiveDomain(url: string): boolean {
    const hostname = getHostname(url).toLowerCase();
    return SENSITIVE_KEYWORDS.some((keyword) => hostname.includes(keyword));
  },

  isPaused(settings: ExtensionSettings): boolean {
    return settings.paused;
  },

  shouldIndexPage(url: string, settings: ExtensionSettings): boolean {
    if (this.isPaused(settings)) return false;
    if (!settings.indexBrowsing) return false;
    if (!settings.features.findit?.enabled) return false;
    if (this.isDomainExcluded(url, settings)) return false;
    if (this.isSensitiveDomain(url)) return false;
    return true;
  },

  shouldTrackVisit(url: string, settings: ExtensionSettings): boolean {
    if (this.isPaused(settings)) return false;
    if (!settings.trackBrowsingContext) return false;
    if (!settings.features.backtrack?.enabled) return false;
    if (this.isDomainExcluded(url, settings)) return false;
    return true;
  },

  shouldStoreClipboard(url: string, text: string, settings: ExtensionSettings): boolean {
    if (this.isPaused(settings)) return false;
    if (!settings.storeClipboard) return false;
    if (!settings.features.copypaste?.enabled) return false;
    if (this.isSensitiveClipboard(text)) return false;
    if (url && this.isDomainExcluded(url, settings)) return false;
    return true;
  },

  shouldDetectDeadlines(url: string, settings: ExtensionSettings): boolean {
    if (this.isPaused(settings)) return false;
    if (!settings.detectDeadlines) return false;
    if (!settings.features.deadline?.enabled) return false;
    if (this.isDomainExcluded(url, settings)) return false;
    return true;
  },

  isSensitiveClipboard(text: string): boolean {
    const lower = text.toLowerCase();
    if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) return true;
    if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(text)) return true;
    if (/(password|cvv|cvc|ssn|social security|api[_-]?key|secret|token)\s*[:=]/i.test(lower)) {
      return true;
    }
    return false;
  },

  isFeatureEnabled(settings: ExtensionSettings, featureId: string): boolean {
    const feature = settings.features[featureId as keyof typeof settings.features];
    return feature?.enabled !== false;
  },
};
