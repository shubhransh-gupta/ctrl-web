import type { ExtensionSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { STORAGE_KEYS } from '../constants';
import { StorageService } from '@/core/storage/storageService';

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.settings);
  const stored = result[STORAGE_KEYS.settings] ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    features: { ...DEFAULT_SETTINGS.features, ...(stored.features ?? {}) },
  };
}

export async function updateSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = {
    ...current,
    ...partial,
    features: partial.features ? { ...current.features, ...partial.features } : current.features,
  };
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: updated });
  return updated;
}

export async function addRecentAction(featureId: ExtensionSettings['recentActions'][0]): Promise<void> {
  const settings = await getSettings();
  const recent = [featureId, ...settings.recentActions.filter((id) => id !== featureId)].slice(0, 5);
  await updateSettings({ recentActions: recent });
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.sync.clear();
  await chrome.storage.local.clear();
  await StorageService.deleteAllData();
}
