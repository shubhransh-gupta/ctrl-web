import { useEffect, useState, useCallback } from 'react';
import type { ExtensionSettings, Theme, ScreenshotFormat, CopyFormat, SavedItem } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { formatRelativeTime } from '@/shared/utils';

type Tab = 'general' | 'privacy' | 'ai' | 'library' | 'advanced';

export default function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then((r) => {
      if (r?.success) setSettings(r.data);
    });
    chrome.runtime.sendMessage({ type: 'GET_SAVED_ITEMS' }).then((r) => {
      if (r?.success) setSavedItems(r.data);
    });
  }, []);

  const updateSetting = useCallback(async <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const clearData = async () => {
    if (!confirm('Delete all CTRL+WEB data? This removes indexed pages, browsing context, workspaces, clipboard, deadlines, and settings. This cannot be undone.')) return;
    await chrome.runtime.sendMessage({ type: 'DELETE_ALL_DATA' });
    setSettings(DEFAULT_SETTINGS);
    setSavedItems([]);
  };

  const exportData = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
    if (!response?.success) return;
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ctrlweb-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      await chrome.runtime.sendMessage({ type: 'IMPORT_DATA', payload: { data } });
      const settingsRes = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (settingsRes?.success) setSettings(settingsRes.data);
    };
    input.click();
  };

  const deleteItem = async (id: string) => {
    await chrome.runtime.sendMessage({ type: 'DELETE_SAVED_ITEM', payload: { id } });
    setSavedItems((items) => items.filter((i) => i.id !== id));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'ai', label: 'AI' },
    { id: 'library', label: 'Library' },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <div className="options">
      <aside className="options__sidebar">
        <div className="options__brand">
          <h1>CTRL+WEB</h1>
          <p>Settings</p>
        </div>
        <nav className="options__nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`options__nav-item ${activeTab === tab.id ? 'options__nav-item--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="options__main">
        {saved && <div className="options__saved" role="status">Settings saved</div>}

        {activeTab === 'general' && (
          <section>
            <h2>General</h2>
            <div className="options__field">
              <label htmlFor="theme">Theme</label>
              <select id="theme" value={settings.theme} onChange={(e) => updateSetting('theme', e.target.value as Theme)}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="options__field">
              <label htmlFor="copyFormat">Default copy format</label>
              <select id="copyFormat" value={settings.defaultCopyFormat} onChange={(e) => updateSetting('defaultCopyFormat', e.target.value as CopyFormat)}>
                <option value="plain">Plain text</option>
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
            </div>
            <div className="options__field">
              <label htmlFor="screenshotFormat">Default screenshot format</label>
              <select id="screenshotFormat" value={settings.screenshotFormat} onChange={(e) => updateSetting('screenshotFormat', e.target.value as ScreenshotFormat)}>
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
              </select>
            </div>
            <div className="options__info">
              <strong>Keyboard shortcut</strong>
              <p>⌘/Ctrl + Shift + K — Opens the command palette</p>
              <p className="options__hint">Customize at chrome://extensions/shortcuts</p>
            </div>
          </section>
        )}

        {activeTab === 'privacy' && (
          <section>
            <div className="options__hero">
              <h2>YOUR DATA STAYS YOURS</h2>
              <p>CTRL+WEB processes features locally whenever possible.</p>
              <ul>
                <li>No account required</li>
                <li>No browsing history uploaded</li>
                <li>No analytics by default</li>
                <li>No tracking by default</li>
              </ul>
            </div>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={!settings.paused} onChange={(e) => updateSetting('paused', !e.target.checked)} />
                CTRL+WEB enabled
              </label>
            </div>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.indexBrowsing} onChange={(e) => updateSetting('indexBrowsing', e.target.checked)} />
                Index browsing (FindIT)
              </label>
            </div>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.trackBrowsingContext} onChange={(e) => updateSetting('trackBrowsingContext', e.target.checked)} />
                Track browsing context (Backtrack & Context)
              </label>
            </div>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.storeClipboard} onChange={(e) => updateSetting('storeClipboard', e.target.checked)} />
                Store clipboard (CopyPaste)
              </label>
            </div>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.detectDeadlines} onChange={(e) => updateSetting('detectDeadlines', e.target.checked)} />
                Detect deadlines on pages
              </label>
            </div>
            <div className="options__field">
              <label htmlFor="excludedDomains">Excluded websites (comma-separated domains)</label>
              <input
                id="excludedDomains"
                type="text"
                value={settings.excludedDomains.join(', ')}
                onChange={(e) =>
                  updateSetting(
                    'excludedDomains',
                    e.target.value.split(',').map((d) => d.trim()).filter(Boolean)
                  )
                }
                placeholder="e.g. mybank.com, company.internal"
              />
            </div>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.localOnlyMode} onChange={(e) => updateSetting('localOnlyMode', e.target.checked)} />
                Local-only mode (disable all external requests)
              </label>
            </div>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.sensitiveDataDetection} onChange={(e) => updateSetting('sensitiveDataDetection', e.target.checked)} />
                Sensitive data detection in privacy checks
              </label>
            </div>
            <div className="options__permissions">
              <h3>Permissions</h3>
              <dl>
                <dt>activeTab</dt>
                <dd>Access the current tab only when you invoke an action</dd>
                <dt>contextMenus</dt>
                <dd>Show CTRL+WEB in the right-click menu</dd>
                <dt>storage</dt>
                <dd>Save your settings and library locally</dd>
                <dt>clipboardWrite</dt>
                <dd>Copy cleaned text and URLs to clipboard</dd>
                <dt>scripting</dt>
                <dd>Inject features into pages when needed</dd>
              </dl>
            </div>
          </section>
        )}

        {activeTab === 'ai' && (
          <section>
            <h2>AI Features</h2>
            <p className="options__hint">AI is disabled by default. Enable only if you want enhanced explanations and summaries.</p>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.aiEnabled} onChange={(e) => updateSetting('aiEnabled', e.target.checked)} />
                Enable AI features
              </label>
            </div>
            {settings.aiEnabled && (
              <>
                <div className="options__warning">
                  AI features will send content to your configured provider. You will be asked to confirm before each use.
                </div>
                <div className="options__field">
                  <label htmlFor="aiProvider">Provider</label>
                  <select id="aiProvider" value={settings.aiProvider} onChange={(e) => updateSetting('aiProvider', e.target.value as ExtensionSettings['aiProvider'])}>
                    <option value="">Select provider</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom endpoint</option>
                  </select>
                </div>
                <div className="options__field">
                  <label htmlFor="aiApiKey">API key</label>
                  <input id="aiApiKey" type="password" value={settings.aiApiKey} onChange={(e) => updateSetting('aiApiKey', e.target.value)} placeholder="Stored locally in chrome.storage" />
                </div>
                <div className="options__field">
                  <label htmlFor="aiModel">Model</label>
                  <input id="aiModel" type="text" value={settings.aiModel} onChange={(e) => updateSetting('aiModel', e.target.value)} placeholder="e.g. gpt-4o-mini" />
                </div>
                <div className="options__field options__field--checkbox">
                  <label>
                    <input type="checkbox" checked={settings.confirmBeforeAI} onChange={(e) => updateSetting('confirmBeforeAI', e.target.checked)} />
                    Confirm before sending content to AI
                  </label>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'library' && (
          <section>
            <h2>CTRL+WEB Library</h2>
            {savedItems.length === 0 ? (
              <p className="options__hint">No saved items yet. Use "Save locally" from the context menu.</p>
            ) : (
              <div className="options__library">
                {savedItems.map((item) => (
                  <div key={item.id} className="options__library-item">
                    <div className="options__library-title">{item.title}</div>
                    <div className="options__library-url">{new URL(item.url).hostname}</div>
                    {item.selectedText && <div className="options__library-excerpt">{item.selectedText.slice(0, 120)}...</div>}
                    <div className="options__library-meta">
                      <span>{formatRelativeTime(item.timestamp)}</span>
                      {item.tags.length > 0 && <span>{item.tags.join(', ')}</span>}
                      <button onClick={() => deleteItem(item.id)} className="options__delete-btn">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'advanced' && (
          <section>
            <h2>Advanced</h2>
            <div className="options__field options__field--checkbox">
              <label>
                <input type="checkbox" checked={settings.debugMode} onChange={(e) => updateSetting('debugMode', e.target.checked)} />
                Debug mode
              </label>
            </div>
            <button className="options__danger-btn" onClick={clearData}>Delete all data</button>
            <button className="options__secondary-btn" onClick={exportData}>Export CTRL+WEB data</button>
            <button className="options__secondary-btn" onClick={importData}>Import CTRL+WEB data</button>
            <button className="options__danger-btn" onClick={() => updateSetting('recentActions', [])}>Reset recent actions</button>
          </section>
        )}
      </main>
    </div>
  );
}
