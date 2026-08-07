import { useEffect, useState, useCallback } from 'react';
import { FEATURES } from '@/shared/constants';
import type { FeatureId, ExtensionSettings } from '@/shared/types';
import { EXTENSION_TAGLINE } from '@/shared/constants';
import './popup.css';

const QUICK_ACTIONS: FeatureId[] = [
  'cleanPage',
  'copyClean',
  'privacy',
  'screenshot',
  'cleanLink',
  'summarize',
  'inspect',
];

interface TabInfo {
  hostname: string;
  url: string;
  title: string;
}

async function runFeature(featureId: FeatureId): Promise<{ success: boolean; error?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { success: false, error: 'No active tab found' };
  }

  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('brave://')) {
    return { success: false, error: 'Open a normal website tab first (not the extensions page).' };
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_ON_TAB',
      payload: { tabId: tab.id, featureId },
    });

    if (chrome.runtime.lastError) {
      return { success: false, error: chrome.runtime.lastError.message };
    }

    if (response?.error === 'Unknown message type') {
      return {
        success: false,
        error: 'Extension needs a reload. Open chrome://extensions and click Reload on CTRL+WEB.',
      };
    }

    return response ?? { success: false, error: 'No response from extension' };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to run action',
    };
  }
}

export default function App() {
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<FeatureId | null>(null);

  useEffect(() => {
    async function init() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        try {
          const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
          setTabInfo({ hostname, url: tab.url, title: tab.title ?? '' });
        } catch {
          setTabInfo({ hostname: 'Unknown', url: tab.url, title: tab.title ?? '' });
        }
      }

      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response?.success) setSettings(response.data);
      setLoading(false);
    }
    init();
  }, []);

  const handleAction = useCallback(async (id: FeatureId) => {
    setError(null);
    setRunning(id);
    const result = await runFeature(id);
    setRunning(null);
    if (result.success) {
      window.close();
    } else {
      setError(result.error ?? 'Something went wrong. Refresh the page and try again.');
    }
  }, []);

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const openPalette = async () => {
    setError(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setError('No active tab found');
      return;
    }
    const response = await chrome.runtime.sendMessage({
      type: 'OPEN_PALETTE_ON_TAB',
      payload: { tabId: tab.id },
    });
    if (response?.success) {
      window.close();
    } else {
      setError(response?.error ?? 'Could not open command palette. Refresh the page.');
    }
  };

  if (loading) {
    return <div className="popup popup--loading">Loading...</div>;
  }

  const recentActions = settings?.recentActions ?? [];

  return (
    <div className="popup" role="main">
      <header className="popup__header">
        <div className="popup__brand">
          <h1 className="popup__title">CTRL+WEB</h1>
          <p className="popup__tagline">{EXTENSION_TAGLINE}</p>
        </div>
        <button className="popup__settings-btn" onClick={openSettings} aria-label="Open settings" title="Settings">
          ⚙
        </button>
      </header>

      {tabInfo && (
        <div className="popup__site">
          <span className="popup__site-label">Current site</span>
          <span className="popup__site-host">{tabInfo.hostname}</span>
        </div>
      )}

      {error && (
        <div className="popup__error" role="alert">
          {error}
        </div>
      )}

      {recentActions.length > 0 && (
        <section className="popup__section">
          <h2 className="popup__section-title">Recent</h2>
          <div className="popup__actions">
            {recentActions.map((id) => {
              const f = FEATURES[id];
              return (
                <button
                key={id}
                className="popup__action popup__action--recent"
                onClick={() => handleAction(id)}
                disabled={running !== null}
              >
                  <span className="popup__action-icon">{f.icon}</span>
                  <span className="popup__action-label">{f.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="popup__section">
        <h2 className="popup__section-title">Quick Actions</h2>
        <div className="popup__actions">
          {QUICK_ACTIONS.map((id) => {
            const f = FEATURES[id];
            return (
              <button
                key={id}
                className="popup__action"
                onClick={() => handleAction(id)}
                disabled={running !== null}
              >
                <span className="popup__action-icon">{f.icon}</span>
                <span className="popup__action-label">{f.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <button className="popup__palette-btn" onClick={openPalette}>
        ⌘⇧K Command palette
      </button>

      <footer className="popup__footer">
        <span>Local-first</span>
        <span className="popup__footer-dot">·</span>
        <span>No tracking</span>
      </footer>
    </div>
  );
}
