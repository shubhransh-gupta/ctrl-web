import { StorageService } from '@/core/storage/storageService';
import type { SavedItem } from '../types';
import { generateId } from '../utils';

export async function saveItem(
  input: Omit<SavedItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): Promise<SavedItem> {
  const item: SavedItem = {
    id: input.id ?? generateId(),
    url: input.url,
    title: input.title,
    selectedText: input.selectedText,
    notes: input.notes,
    tags: input.tags ?? [],
    timestamp: input.timestamp ?? Date.now(),
  };
  await StorageService.saveItem(item);
  return item;
}

export async function getAllItems(): Promise<SavedItem[]> {
  return StorageService.getAllItems();
}

export async function deleteItem(id: string): Promise<void> {
  await StorageService.deleteItem(id);
}

export async function searchItems(query: string): Promise<SavedItem[]> {
  const items = await getAllItems();
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.selectedText?.toLowerCase().includes(q) ||
      item.notes?.toLowerCase().includes(q)
  );
}
