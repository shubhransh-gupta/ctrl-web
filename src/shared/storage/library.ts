import type { SavedItem } from '../types';
import { DB_NAME, DB_STORE, DB_VERSION } from '../constants';
import { generateId } from '../utils';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        const store = db.createObjectStore(DB_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveItem(
  item: Omit<SavedItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): Promise<SavedItem> {
  const db = await openDB();
  const saved: SavedItem = {
    id: item.id ?? generateId(),
    timestamp: item.timestamp ?? Date.now(),
    url: item.url,
    title: item.title,
    selectedText: item.selectedText,
    notes: item.notes,
    tags: item.tags ?? [],
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(saved);
    tx.oncomplete = () => resolve(saved);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllItems(): Promise<SavedItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const request = tx.objectStore(DB_STORE).getAll();
    request.onsuccess = () => {
      const items = (request.result as SavedItem[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function searchItems(query: string): Promise<SavedItem[]> {
  const items = await getAllItems();
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.selectedText?.toLowerCase().includes(q) ||
      item.notes?.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
  );
}
