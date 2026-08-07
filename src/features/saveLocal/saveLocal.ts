import type { SavedItem } from '@/shared/types';

export interface SaveLocalInput {
  url: string;
  title: string;
  selectedText?: string;
  notes?: string;
  tags?: string[];
}

export async function saveToLibrary(input: SaveLocalInput): Promise<SavedItem> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'SAVE_ITEM', payload: input },
      (response) => {
        if (response?.success) resolve(response.data);
        else reject(new Error(response?.error ?? 'Save failed'));
      }
    );
  });
}
