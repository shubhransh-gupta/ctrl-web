import { DB_NAME, DB_STORES, DB_VERSION } from '@/shared/constants';
import type {
  ClipboardMemory,
  DeadlineItem,
  PageMemory,
  TabContextRecord,
  VisitRecord,
  Workspace,
} from '@/shared/types';
import type { SavedItem } from '@/shared/types';

type StoreName = (typeof DB_STORES)[keyof typeof DB_STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORES.pages)) {
        const pages = db.createObjectStore(DB_STORES.pages, { keyPath: 'id' });
        pages.createIndex('url', 'url', { unique: false });
        pages.createIndex('domain', 'domain', { unique: false });
        pages.createIndex('lastVisited', 'lastVisited', { unique: false });
      }
      if (!db.objectStoreNames.contains(DB_STORES.sessions)) {
        const sessions = db.createObjectStore(DB_STORES.sessions, { keyPath: 'id' });
        sessions.createIndex('timestamp', 'timestamp', { unique: false });
        sessions.createIndex('domain', 'domain', { unique: false });
      }
      if (!db.objectStoreNames.contains(DB_STORES.contexts)) {
        db.createObjectStore(DB_STORES.contexts, { keyPath: 'tabId' });
      }
      if (!db.objectStoreNames.contains(DB_STORES.workspaces)) {
        const workspaces = db.createObjectStore(DB_STORES.workspaces, { keyPath: 'id' });
        workspaces.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(DB_STORES.clipboard)) {
        const clipboard = db.createObjectStore(DB_STORES.clipboard, { keyPath: 'id' });
        clipboard.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(DB_STORES.deadlines)) {
        const deadlines = db.createObjectStore(DB_STORES.deadlines, { keyPath: 'id' });
        deadlines.createIndex('date', 'date', { unique: false });
        deadlines.createIndex('url', 'url', { unique: false });
      }
      if (!db.objectStoreNames.contains(DB_STORES.savedItems)) {
        const saved = db.createObjectStore(DB_STORES.savedItems, { keyPath: 'id' });
        saved.createIndex('timestamp', 'timestamp', { unique: false });
        saved.createIndex('url', 'url', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    if (result) {
      result.onsuccess = () => resolve(result.result as T);
      result.onerror = () => reject(result.error);
    } else {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    }
  });
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export const StorageService = {
  async upsertPage(page: PageMemory): Promise<void> {
    await withStore(DB_STORES.pages, 'readwrite', (store) => store.put(page));
  },

  async getPageByUrl(url: string): Promise<PageMemory | undefined> {
    const pages = await getAll<PageMemory>(DB_STORES.pages);
    return pages.find((p) => p.url === url);
  },

  async getAllPages(): Promise<PageMemory[]> {
    return getAll<PageMemory>(DB_STORES.pages);
  },

  async deletePage(id: string): Promise<void> {
    await withStore(DB_STORES.pages, 'readwrite', (store) => store.delete(id));
  },

  async pinPage(id: string, pinned: boolean): Promise<void> {
    const pages = await getAll<PageMemory>(DB_STORES.pages);
    const page = pages.find((p) => p.id === id);
    if (page) {
      page.pinned = pinned;
      await this.upsertPage(page);
    }
  },

  async addVisit(visit: VisitRecord): Promise<void> {
    await withStore(DB_STORES.sessions, 'readwrite', (store) => store.put(visit));
  },

  async getVisitsSince(since: number): Promise<VisitRecord[]> {
    const visits = await getAll<VisitRecord>(DB_STORES.sessions);
    return visits.filter((v) => v.timestamp >= since).sort((a, b) => a.timestamp - b.timestamp);
  },

  async pruneVisits(before: number): Promise<void> {
    const visits = await getAll<VisitRecord>(DB_STORES.sessions);
    const db = await openDb();
    const tx = db.transaction(DB_STORES.sessions, 'readwrite');
    const store = tx.objectStore(DB_STORES.sessions);
    for (const visit of visits) {
      if (visit.timestamp < before) store.delete(visit.id);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async setTabContext(record: TabContextRecord): Promise<void> {
    await withStore(DB_STORES.contexts, 'readwrite', (store) => store.put(record));
  },

  async getTabContext(tabId: number): Promise<TabContextRecord | undefined> {
    return (await withStore<TabContextRecord>(DB_STORES.contexts, 'readonly', (store) =>
      store.get(tabId)
    )) as TabContextRecord | undefined;
  },

  async saveWorkspace(workspace: Workspace): Promise<void> {
    await withStore(DB_STORES.workspaces, 'readwrite', (store) => store.put(workspace));
  },

  async getWorkspaces(): Promise<Workspace[]> {
    const items = await getAll<Workspace>(DB_STORES.workspaces);
    return items.sort((a, b) => b.createdAt - a.createdAt);
  },

  async deleteWorkspace(id: string): Promise<void> {
    await withStore(DB_STORES.workspaces, 'readwrite', (store) => store.delete(id));
  },

  async addClipboard(item: ClipboardMemory): Promise<void> {
    await withStore(DB_STORES.clipboard, 'readwrite', (store) => store.put(item));
  },

  async getClipboardItems(limit = 50): Promise<ClipboardMemory[]> {
    const items = await getAll<ClipboardMemory>(DB_STORES.clipboard);
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },

  async deleteClipboard(id: string): Promise<void> {
    await withStore(DB_STORES.clipboard, 'readwrite', (store) => store.delete(id));
  },

  async clearClipboard(): Promise<void> {
    const items = await getAll<ClipboardMemory>(DB_STORES.clipboard);
    const db = await openDb();
    const tx = db.transaction(DB_STORES.clipboard, 'readwrite');
    const store = tx.objectStore(DB_STORES.clipboard);
    for (const item of items) store.delete(item.id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async saveDeadline(item: DeadlineItem): Promise<void> {
    await withStore(DB_STORES.deadlines, 'readwrite', (store) => store.put(item));
  },

  async getDeadlines(): Promise<DeadlineItem[]> {
    const items = await getAll<DeadlineItem>(DB_STORES.deadlines);
    return items.sort((a, b) => a.date - b.date);
  },

  async deleteDeadline(id: string): Promise<void> {
    await withStore(DB_STORES.deadlines, 'readwrite', (store) => store.delete(id));
  },

  async saveItem(item: SavedItem): Promise<void> {
    await withStore(DB_STORES.savedItems, 'readwrite', (store) => store.put(item));
  },

  async getAllItems(): Promise<SavedItem[]> {
    const items = await getAll<SavedItem>(DB_STORES.savedItems);
    return items.sort((a, b) => b.timestamp - a.timestamp);
  },

  async deleteItem(id: string): Promise<void> {
    await withStore(DB_STORES.savedItems, 'readwrite', (store) => store.delete(id));
  },

  async deleteAllData(): Promise<void> {
    dbPromise = null;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('ctrlweb_library');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async exportAll(): Promise<Record<string, unknown>> {
    return {
      pages: await getAll<PageMemory>(DB_STORES.pages),
      sessions: await getAll<VisitRecord>(DB_STORES.sessions),
      contexts: await getAll<TabContextRecord>(DB_STORES.contexts),
      workspaces: await getAll<Workspace>(DB_STORES.workspaces),
      clipboard: await getAll<ClipboardMemory>(DB_STORES.clipboard),
      deadlines: await getAll<DeadlineItem>(DB_STORES.deadlines),
      savedItems: await getAll<SavedItem>(DB_STORES.savedItems),
      exportedAt: Date.now(),
      version: 2,
    };
  },

  async importAll(data: Record<string, unknown>): Promise<void> {
    const db = await openDb();
    const stores: Array<[StoreName, unknown[]]> = [
      [DB_STORES.pages, (data.pages as PageMemory[]) ?? []],
      [DB_STORES.sessions, (data.sessions as VisitRecord[]) ?? []],
      [DB_STORES.contexts, (data.contexts as TabContextRecord[]) ?? []],
      [DB_STORES.workspaces, (data.workspaces as Workspace[]) ?? []],
      [DB_STORES.clipboard, (data.clipboard as ClipboardMemory[]) ?? []],
      [DB_STORES.deadlines, (data.deadlines as DeadlineItem[]) ?? []],
      [DB_STORES.savedItems, (data.savedItems as SavedItem[]) ?? []],
    ];

    for (const [storeName, items] of stores) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) store.put(item);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  },
};
