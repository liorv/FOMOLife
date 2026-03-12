import type { StorageProvider } from './storage-provider';
import type { PersistedUserData } from './storage';

export class InMemoryStorageProvider implements StorageProvider {
  private map = new Map<string, PersistedUserData>();

  async load(userId: string): Promise<PersistedUserData | null> {
    return this.map.get(userId) ?? null;
  }

  async save(userId: string, data: PersistedUserData): Promise<void> {
    this.map.set(userId, data);
  }
}
