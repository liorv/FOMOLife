'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ContactsApiClient } from '@myorg/api-client';
import { createInviteLink, isNonEmptyString } from '@myorg/utils';
import type { Contact } from '@myorg/types';
import { ContactCard } from '@myorg/ui';
import { createContactsApiClient } from '@/lib/client/contactsApi';
import { getContactsClientEnv } from '@/lib/env.client';
import styles from './ContactsPage.module.css';

function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

type Props = {
  canManage: boolean;
};

export default function ContactsPage({ canManage }: Props) {
  const clientEnv = useMemo(() => getContactsClientEnv(), []);
  const apiClient: ContactsApiClient = useMemo(() => createContactsApiClient(''), []);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // helper that creates a contact by prompting the user for a name. this
  // replaces the previous form-based flow and is invoked only from the thumb
  // button (see message handler below).
  const addContact = async () => {
    if (!canManage) return;

    const input = window.prompt('Enter a nickname for the new contact:');
    const name = (input ?? '').trim();
    if (!isNonEmptyString(name)) return;

    const inviteToken = generateToken();
    const contact: Contact = {
      id: '',
      name,
      status: 'invited',
      inviteToken,
      login: '',
    };

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = createInviteLink(origin, inviteToken);

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy this invite link and share it:', link);
    }

    const created = await apiClient.createContact({
      name: contact.name,
      ...(contact.login ? { login: contact.login } : {}),
      inviteToken: contact.inviteToken ?? null,
    });

    setContacts((prev) => [...prev, created]);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const loaded = await apiClient.listContacts();
        if (active) {
          setContacts(loaded);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load contacts');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [apiClient]);

  // if user navigates back to this tab (or window regains focus), refresh list
  useEffect(() => {
    if (!canManage) return;
    const onFocus = async () => {
      try {
        const updated = await apiClient.listContacts();
        setContacts(updated);
      } catch (err) {
        // ignore; existing errorMessage state covers it when mounted
        console.warn('[Contacts] refresh failed', err);
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'contacts-updated') {
        onFocus();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('message', onMessage);
    const onStorage = (evt: StorageEvent) => {
      if (evt.key === 'fomo:contactsUpdated') {
        onFocus();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
    };
  }, [apiClient, canManage]);

  // configure thumb button for contacts tab and listen for presses
  useEffect(() => {
    const icon = 'person_add';
    const action = 'add-contact';

    // legacy notification
    try {
      window.parent?.postMessage?.({ type: 'thumb-icon', icon }, '*');
    } catch (err) {
      // ignore
    }

    const handler = (event: MessageEvent) => {
      if (!event?.data) return;
      if (event.data.type === 'get-thumb-config') {
        try {
          window.parent?.postMessage?.({ type: 'thumb-config', icon, action }, '*');
        } catch (err) {
          // ignore
        }
      } else if ((event.data.type === action || event.data.type === 'thumb-fab') && canManage) {
        // invoke contact creation when thumb button is pressed
        addContact();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [canManage]);

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          {/* add contact button removed per design change; read-only header */}
        </header>

        {!canManage ? <div className={styles.notice}>Read-only mode: sign in is required to manage contacts.</div> : null}

        {loading ? <div className={styles.notice}>Loading contacts…</div> : null}

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        {copied ? (
          <div className={styles.banner}>
            <span className={`material-icons ${styles.bannerIcon}`} aria-hidden="true">check_circle</span>
            Invite link copied to clipboard!
          </div>
        ) : null}

        {contacts.length === 0 ? (
          <div className={styles.empty}>
            <span className={`material-icons ${styles.emptyIcon}`} aria-hidden="true">people</span>
            <p>No contacts yet.</p>
            <p className={styles.emptySub}>You can no longer add new contacts.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onDelete={async (id) => {
                  await apiClient.deleteContact(id);
                  setContacts((prev) => prev.filter((item) => item.id !== id));
                }}
                onRename={async (id, name) => {
                  if (!isNonEmptyString(name)) return;
                  const updated = await apiClient.updateContact(id, { name: name.trim() });
                  setContacts((prev) => prev.map((item) => (item.id === id ? updated : item)));
                }}
                onGenerateInvite={async (id, token) => {
                  const updated = await apiClient.updateContact(id, { inviteToken: token, status: 'invited' });
                  setContacts((prev) => prev.map((item) => (item.id === id ? updated : item)));
                }}
                readOnly={!canManage}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
