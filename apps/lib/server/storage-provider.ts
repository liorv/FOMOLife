import type { PersistedUserData } from './storage';

export interface StorageProvider {
  load(userId: string): Promise<PersistedUserData | null>;
  save(userId: string, data: PersistedUserData): Promise<void>;
}
