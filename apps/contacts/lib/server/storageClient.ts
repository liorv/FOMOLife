import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { createFrameworkStorageProvider } from '@myorg/storage-client';
import type { StorageProvider } from '@myorg/storage';

/**
 * Returns the appropriate StorageProvider for this app.
 *
 * - Production: FRAMEWORK_INTERNAL_URL and INTERNAL_SERVICE_KEY MUST be set.
 *   Any other configuration is a misconfiguration and fails fast to prevent
 *   silent data loss from file or in-memory storage being used in production.
 *
 * - Local dev: env vars are not set → file-based storage under data/user_data/.
 * - Test (NODE_ENV=test): env vars are not set → in-memory storage (hermetic).
 */
export function getStorage(): StorageProvider {
  const frameworkUrl = process.env.FRAMEWORK_INTERNAL_URL?.trim();
  const serviceKey = process.env.INTERNAL_SERVICE_KEY?.trim();
  const bypassSecret = process.env.FRAMEWORK_BYPASS_SECRET?.trim();

  if (frameworkUrl && serviceKey) {
    return createFrameworkStorageProvider({ frameworkUrl, serviceKey, domain: 'people', bypassSecret });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[contacts] FRAMEWORK_INTERNAL_URL and INTERNAL_SERVICE_KEY must be set in production. ' +
      'File and in-memory storage are not permitted in production to prevent data loss.',
    );
  }

  return createStorageProvider();
}
