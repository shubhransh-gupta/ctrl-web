interface HiddenElement {
  element: HTMLElement;
  originalDisplay: string;
  originalVisibility: string;
  originalOpacity: string;
  originalPointerEvents: string;
  removed: boolean;
}

const CLUTTER_SELECTORS = [
  '[class*="cookie" i]',
  '[id*="cookie" i]',
  '[class*="consent" i]',
  '[id*="consent" i]',
  '[class*="gdpr" i]',
  '[aria-label*="cookie" i]',
  '[class*="newsletter" i]',
  '[class*="subscribe" i]',
  '[class*="popup" i]',
  '[class*="modal" i][class*="overlay" i]',
  '[class*="chat-widget" i]',
  '[class*="intercom" i]',
  '[id*="intercom" i]',
  '[class*="crisp" i]',
  '[class*="drift" i]',
  '[class*="hubspot" i]',
  '[class*="livechat" i]',
  '[class*="share" i][class*="widget" i]',
  '[class*="social-share" i]',
  '[class*="sticky" i][class*="header" i]',
  '[class*="sticky" i][class*="footer" i]',
  '[class*="fixed" i][class*="banner" i]',
  '[class*="app-banner" i]',
  '[class*="download-app" i]',
  '[class*="promo" i][class*="bar" i]',
  '[class*="advertisement" i]',
  '[class*="ad-container" i]',
  '[class*="ad-slot" i]',
  '[id*="google_ads" i]',
  '[class*="sponsored" i]',
  '[data-ad]',
  '[data-ad-slot]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
];

const CLUTTER_KEYWORDS = [
  'cookie banner',
  'accept cookies',
  'newsletter signup',
  'subscribe to our',
  'download our app',
  'we use cookies',
];

let hiddenElements: HiddenElement[] = [];
let isCleanMode = false;
let controlBar: HTMLElement | null = null;

function isLikelyClutter(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === 'BODY' || el.tagName === 'HTML' || el.tagName === 'MAIN') return false;
  if (el.closest('[data-ctrlweb-protected]')) return false;
  if (el.closest('[data-ctrlweb-ui]')) return false;

  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  const text = el.textContent?.toLowerCase() ?? '';
  const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() ?? '';
  const role = el.getAttribute('role') ?? '';

  if (role === 'dialog' || role === 'alertdialog') {
    if (CLUTTER_KEYWORDS.some((k) => text.includes(k) || ariaLabel.includes(k))) return true;
  }

  if (el.tagName === 'IFRAME') {
    const src = el.getAttribute('src') ?? '';
    if (/doubleclick|googlesyndication|facebook\.com\/plugins|addthis|sharethis/i.test(src)) {
      return true;
    }
  }

  if (rect.width > window.innerWidth * 0.9 && rect.height < 120 && style.position === 'fixed') {
    if (CLUTTER_KEYWORDS.some((k) => text.includes(k))) return true;
  }

  if (style.position === 'fixed' && rect.bottom > window.innerHeight - 80 && rect.height < 100) {
    if (/cookie|consent|accept|subscribe|newsletter/i.test(text + ariaLabel)) return true;
  }

  return false;
}

function hideElement(el: HTMLElement): HiddenElement {
  const record: HiddenElement = {
    element: el,
    originalDisplay: el.style.display,
    originalVisibility: el.style.visibility,
    originalOpacity: el.style.opacity,
    originalPointerEvents: el.style.pointerEvents,
    removed: false,
  };
  el.style.setProperty('display', 'none', 'important');
  hiddenElements.push(record);
  return record;
}

function pauseMedia(): void {
  document.querySelectorAll('video, audio').forEach((media) => {
    if (media instanceof HTMLMediaElement) {
      media.pause();
      media.autoplay = false;
      media.setAttribute('data-ctrlweb-paused', 'true');
    }
  });
}

function createControlBar(onRestore: () => void, onExit: () => void): HTMLElement {
  const bar = document.createElement('div');
  bar.setAttribute('data-ctrlweb-ui', 'control-bar');
  bar.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483646;
      background: #1a1a1f;
      border: 1px solid #2a2a32;
      border-radius: 8px;
      padding: 10px 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      color: #e8e8ed;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    ">
      <span style="font-weight: 600; letter-spacing: 0.02em;">CTRL+WEB</span>
      <span style="color: #8b8b96;">Clean mode enabled</span>
      <button data-action="restore" style="
        background: #2a2a32;
        border: 1px solid #3a3a44;
        color: #e8e8ed;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Restore</button>
      <button data-action="exit" style="
        background: #007aff;
        border: none;
        color: white;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Exit</button>
    </div>
  `;

  bar.querySelector('[data-action="restore"]')?.addEventListener('click', onRestore);
  bar.querySelector('[data-action="exit"]')?.addEventListener('click', onExit);
  return bar;
}

export function cleanPage(): { hiddenCount: number } {
  if (isCleanMode) return { hiddenCount: hiddenElements.length };

  hiddenElements = [];
  const seen = new Set<Element>();

  for (const selector of CLUTTER_SELECTORS) {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        if (seen.has(el) || !(el instanceof HTMLElement)) return;
        if (isLikelyClutter(el)) {
          seen.add(el);
          hideElement(el);
        }
      });
    } catch {
      // Invalid selector on some pages
    }
  }

  document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]').forEach((el) => {
    if (seen.has(el) || !(el instanceof HTMLElement)) return;
    if (isLikelyClutter(el)) {
      seen.add(el);
      hideElement(el);
    }
  });

  pauseMedia();
  isCleanMode = true;

  if (!controlBar) {
    controlBar = createControlBar(restorePage, exitCleanMode);
    document.body.appendChild(controlBar);
  }

  return { hiddenCount: hiddenElements.length };
}

export function restorePage(): { restoredCount: number } {
  const count = hiddenElements.length;
  for (const record of hiddenElements) {
    record.element.style.display = record.originalDisplay;
    record.element.style.visibility = record.originalVisibility;
    record.element.style.opacity = record.originalOpacity;
    record.element.style.pointerEvents = record.originalPointerEvents;
  }
  hiddenElements = [];
  return { restoredCount: count };
}

export function exitCleanMode(): void {
  restorePage();
  controlBar?.remove();
  controlBar = null;
  isCleanMode = false;
}

export function isPageCleaned(): boolean {
  return isCleanMode;
}
