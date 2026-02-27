export interface ContactsClientEnv {
  appName: string;
}

export function getContactsClientEnv(): ContactsClientEnv {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'FOMO Life Contacts';
  if (!appName.trim()) {
    throw new Error('NEXT_PUBLIC_APP_NAME must be a non-empty string when provided.');
  }

  return {
    appName,
  };
}
