import type { ExtensionSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { STORAGE_KEYS } from '../constants';

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.settings] ?? {}) };
}

export async function updateSettings(
  partial: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: updated });
  return updated;
}

export async function addRecentAction(featureId: ExtensionSettings['recentActions'][0]): Promise<void> {
  const settings = await getSettings();
  const recent = [featureId, ...settings.recentActions.filter((id) => id !== featureId)].slice(
    0,
    5
  );
  await updateSettings({ recentActions: recent });
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('ctrlweb_library');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
