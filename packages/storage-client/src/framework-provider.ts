/**
 * Minimal StorageProvider interface — intentionally self-contained so this
 * package has no cross-workspace dependencies. The shape is structurally
 * compatible with apps/lib/server/storage-provider.ts.
 */
export interface UserDataBlob {
  tasks?: unknown[];
  projects?: unknown[];
  people?: unknown[];
  groups?: unknown[];
}

export interface StorageProvider {
  load(userId: string): Promise<UserDataBlob | null>;
  save(userId: string, data: UserDataBlob): Promise<void>;
}

export type Domain = 'tasks' | 'projects' | 'people';

class FrameworkStorageProvider implements StorageProvider {
  constructor(
    private readonly frameworkUrl: string,
    private readonly serviceKey: string,
    private readonly domain: Domain,
    private readonly bypassSecret?: string,
  ) {}

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Internal-Service-Key': this.serviceKey,
      ...extra,
    };
    if (this.bypassSecret) {
      headers['x-vercel-protection-bypass'] = this.bypassSecret;
    }
    return headers;
  }

  async load(userId: string): Promise<UserDataBlob | null> {
    const url = `${this.frameworkUrl}/api/storage?domain=${encodeURIComponent(this.domain)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders({ 'X-User-Id': userId }),
    });

    if (!res.ok) {
      throw new Error(`Storage gateway load failed: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as { data: unknown };

    if (body.data === null || body.data === undefined) {
      return null;
    }

    // Normalise into the UserDataBlob shape expected by the stores
    if (this.domain === 'people') {
      const slice = body.data as { people?: unknown[]; groups?: unknown[] };
      return { people: slice.people ?? [], groups: slice.groups ?? [] };
    }

    if (this.domain === 'tasks') {
      return { tasks: Array.isArray(body.data) ? body.data : [] };
    }

    // 'projects'
    return { projects: Array.isArray(body.data) ? body.data : [] };
  }

  async save(userId: string, data: UserDataBlob): Promise<void> {
    const url = `${this.frameworkUrl}/api/storage?domain=${encodeURIComponent(this.domain)}`;

    // Serialise only the relevant slice for this domain
    let sliceData: unknown;
    if (this.domain === 'people') {
      sliceData = { people: data.people ?? [], groups: data.groups ?? [] };
    } else if (this.domain === 'tasks') {
      sliceData = data.tasks ?? [];
    } else {
      sliceData = data.projects ?? [];
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: this.buildHeaders({ 'Content-Type': 'application/json', 'X-User-Id': userId }),
      body: JSON.stringify({ data: sliceData }),
    });

    if (!res.ok) {
      throw new Error(`Storage gateway save failed: ${res.status} ${res.statusText}`);
    }
  }
}

export function createFrameworkStorageProvider(config: {
  frameworkUrl: string;
  serviceKey: string;
  domain: Domain;
  bypassSecret?: string;
}): StorageProvider {
  return new FrameworkStorageProvider(config.frameworkUrl, config.serviceKey, config.domain, config.bypassSecret);
}
