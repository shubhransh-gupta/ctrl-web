export function showAIConsentDialog(featureLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.querySelector('[data-ctrlweb-ui="ai-consent"]');
    existing?.remove();

    const overlay = document.createElement('div');
    overlay.setAttribute('data-ctrlweb-ui', 'ai-consent');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.6); display: flex;
      align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div role="dialog" aria-labelledby="consent-title" style="
        background: #1a1a1f; border: 1px solid #2a2a32; border-radius: 12px;
        padding: 24px; width: min(400px, 90vw); color: #e8e8ed;
        box-shadow: 0 16px 48px rgba(0,0,0,0.5);
      ">
        <div id="consent-title" style="font-size:16px;font-weight:600;margin-bottom:12px;">Send to AI provider?</div>
        <p style="font-size:14px;color:#8b8b96;line-height:1.5;margin:0 0 8px;">
          <strong style="color:#ff9f0a;">${featureLabel}</strong> will send the selected content to your configured AI provider.
        </p>
        <p style="font-size:12px;color:#5a5a64;margin:0 0 20px;">
          Content is sent directly from your browser to your provider. CTRL+WEB does not store or log it.
        </p>
        <div style="display:flex;gap:8px;">
          <button id="consent-continue" style="flex:1;background:#007aff;border:none;color:white;padding:10px;border-radius:6px;cursor:pointer;font-weight:500;">Continue</button>
          <button id="consent-cancel" style="flex:1;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:10px;border-radius:6px;cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;

    overlay.querySelector('#consent-continue')?.addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    overlay.querySelector('#consent-cancel')?.addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    document.body.appendChild(overlay);
  });
}

async function getSettings(): Promise<import('@/shared/types').ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      resolve(response?.data ?? { aiEnabled: false, confirmBeforeAI: true } as import('@/shared/types').ExtensionSettings);
    });
  });
}

export async function requestAIConsent(featureLabel: string): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.aiEnabled) return false;
  if (!settings.confirmBeforeAI) return true;
  return showAIConsentDialog(featureLabel);
}
