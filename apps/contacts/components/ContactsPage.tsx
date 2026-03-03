'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ContactsApiClient } from '@myorg/api-client';
import { isNonEmptyString } from '@myorg/utils';
import type { Contact } from '@myorg/types';
import { ContactTile } from '@myorg/ui';
import { createContactsApiClient } from '@/lib/client/contactsApi';
import { getContactsClientEnv } from '@/lib/env.client';
import styles from './ContactsPage.module.css';


export const DEFAULT_CONTACT_NAME = 'New contact';

type Props = {
  canManage: boolean;
  devMode: boolean;
  currentUserId: string;
  defaultUserId: string;
};

export default function ContactsPage({ canManage, devMode, currentUserId, defaultUserId }: Props) {
  const clientEnv = useMemo(() => getContactsClientEnv(), []);
  const apiClient: ContactsApiClient = useMemo(() => createContactsApiClient(''), []);

  const [contacts, setContacts] = useState<Contact[]>([]);
  // track an id for a freshly-created contact so we can auto-focus its name input
  const [newContactId, setNewContactId] = useState<string | null>(null);
  // general loading/error state
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // banner shown when an invite link is copied anywhere on the page
  const [linkCopied, setLinkCopied] = useState(false);

  // development-mode account switching
  const [switchId, setSwitchId] = useState(currentUserId);
  const handleSwitch = () => {
    document.cookie = `contacts_dev_user=${encodeURIComponent(switchId)}; path=/`;
    window.location.reload();
  };

  // helper that creates a contact with a default placeholder name. the new
  // tile is then focused so the user can immediately edit its name. this is
  // invoked only from the thumb button (see message handler below).
  const addContact = async () => {
    if (!canManage) return;

    // placeholder contact with no invite; status not_linked
    const name = DEFAULT_CONTACT_NAME;
    const contact: Contact = {
      id: '',
      name,
      status: 'not_linked',
      login: '',
    };

    const created = await apiClient.createContact({
      name: contact.name,
      ...(contact.login ? { login: contact.login } : {}),
    });

    setContacts((prev) => [...prev, created]);
    setNewContactId(created.id);
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
          {/* switch-account UI in dev mode */}
          {devMode ? (
            <div>
              <label style={{ fontSize: '0.9rem' }}>
                Current user:
                <input
                  style={{ marginLeft: 8 }}
                  value={switchId}
                  onChange={(e) => setSwitchId(e.target.value)}
                />
              </label>
              <button style={{ marginLeft: 8 }} onClick={handleSwitch}>
                Switch
              </button>
              <span style={{ marginLeft: 16, fontSize: '0.8rem' }}>
                (default: {defaultUserId})
              </span>
            </div>
          ) : null}
        </header>

        {!canManage ? <div className={styles.notice}>Read-only mode: sign in is required to manage contacts.</div> : null}

        {loading ? <div className={styles.notice}>Loading contacts…</div> : null}

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        {linkCopied ? (
          <div className={styles.banner}>
            <span className={`material-icons ${styles.bannerIcon}`} aria-hidden="true">check_circle</span>
            Invite link copied to clipboard!
          </div>
        ) : null}


        {contacts.length === 0 ? (
          <div className={styles.empty}>
            <span className={`material-icons ${styles.emptyIcon}`} aria-hidden="true">people</span>
            <p>No contacts yet.</p>
            <p className={styles.emptySub}>Use the add button to create a new contact.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {contacts.map((contact) => (
              <ContactTile
                key={contact.id}
                id={contact.id}
                name={contact.name}
                status={contact.status}
                avatarUrl={null}
                autoFocus={newContactId === contact.id}
                onNameChange={async (newName) => {
                  if (!isNonEmptyString(newName)) return;
                  const updated = await apiClient.updateContact(contact.id, { name: newName.trim() });
                  setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
                  if (newContactId === contact.id) {
                    setNewContactId(null);
                  }
                }}
                onUnlink={async () => {
                  await apiClient.deleteContact(contact.id);
                  setContacts((prev) => prev.filter((item) => item.id !== contact.id));
                }}
                onLink={async () => {
                  // update local status immediately for user feedback
                  setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'link_pending' } : c));
                }}
                onInvite={async () => {
                  const resp = await apiClient.inviteContact(contact.id);
                  return resp.inviteToken || null;
                }}
                onLinkSuccess={() => {
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2500);
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
