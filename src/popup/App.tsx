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

async function executeFeature(featureId: FeatureId): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_FEATURE',
      payload: { featureId },
    });
  } catch {
    console.error('[CTRL+WEB] Content script not ready. Refresh the page.');
  }

  chrome.runtime.sendMessage({ type: 'TRACK_ACTION', payload: { featureId } });
  window.close();
}

export default function App() {
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [loading, setLoading] = useState(true);

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
    await executeFeature(id);
  }, []);

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const openPalette = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_COMMAND_PALETTE' });
      } catch {
        console.error('[CTRL+WEB] Content script not ready. Refresh the page.');
      }
      window.close();
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

      {recentActions.length > 0 && (
        <section className="popup__section">
          <h2 className="popup__section-title">Recent</h2>
          <div className="popup__actions">
            {recentActions.map((id) => {
              const f = FEATURES[id];
              return (
                <button key={id} className="popup__action popup__action--recent" onClick={() => handleAction(id)}>
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
              <button key={id} className="popup__action" onClick={() => handleAction(id)}>
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
