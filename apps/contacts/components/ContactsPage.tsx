'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ContactsApiClient } from '@myorg/api-client';
import { isNonEmptyString } from '@myorg/utils';
import type { Contact } from '@myorg/types';
import { createContactsApiClient } from '@/lib/client/contactsApi';
import { getContactsClientEnv } from '@/lib/env.client';
import SearchBar from './SearchBar';
import EmptyState from './EmptyState';
import Banner from './Banner';
import Notice from './Notice';
import ContactTable from './ContactTable';
import styles from '../styles/layout.module.css';


export const DEFAULT_CONTACT_NAME = 'New contact';

type Props = {
  canManage: boolean;
  currentUserId?: string;
  currentUserEmail?: string | undefined;
};

export default function ContactsPage({ canManage, currentUserId = '', currentUserEmail }: Props) {
  const clientEnv = useMemo(() => getContactsClientEnv(), []);
  const apiClient: ContactsApiClient = useMemo(() => createContactsApiClient(''), []);

  const [contacts, setContacts] = useState<Contact[]>([]);
  // track an id for a freshly-created contact so we can auto-focus its name input
  const [newContactId, setNewContactId] = useState<string | null>(null);
  // general loading/error state
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // display ready state - only show content after framework acknowledges loading
  const [displayReady, setDisplayReady] = useState(false);
  // banner shown when an invite link is copied anywhere on the page
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string>('');
  // small banner shown when arriving after accepting an invite
  const [acceptedBanner, setAcceptedBanner] = useState(false);
  // search functionality
  const [searchTerm, setSearchTerm] = useState('');

  // filter contacts based on search term
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

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

    try {
      const created = await apiClient.createContact({
        name: contact.name,
        ...(contact.login ? { login: contact.login } : {}),
      });

      setContacts((prev) => [...prev, created]);
      setNewContactId(created.id);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create contact');
    }
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

  // read query params to show an accepted-invite banner
  const searchParams = useSearchParams();
  const router = useRouter();
  const isEmbedded = searchParams.get('embedded') === '1';
  useEffect(() => {
    if (searchParams.get('accepted') === 'true') {
      setAcceptedBanner(true);
      setTimeout(() => setAcceptedBanner(false), 3000);

      // clear the params so the banner doesn't persist on reload
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('accepted');
      newParams.delete('tab');
      const base = window.location.pathname;
      const query = newParams.toString();
      router.replace(base + (query ? `?${query}` : ''));
    }
  }, [searchParams, router]);

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

  // Listen for search query updates from framework
  useEffect(() => {
    if (!isEmbedded) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'search-query') {
        setSearchTerm(event.data.query || '');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isEmbedded]);

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

  // Send app-loaded message when loading completes
  useEffect(() => {
    if (!isEmbedded || loading) return;

    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 2000; // 2 seconds

    const sendLoadedMessage = () => {
      try {
        window.parent?.postMessage?.({ type: 'app-loaded', appId: 'people' }, '*');
      } catch (err) {
        // ignore
      }
    };

    const checkAck = (event: MessageEvent) => {
      if (event.data?.type === 'app-loaded-ack' && event.data?.appId === 'people') {
        // Acknowledged, stop retrying and show content
        setDisplayReady(true);
        window.removeEventListener('message', checkAck);
        clearInterval(intervalId);
      }
    };

    window.addEventListener('message', checkAck);

    // Send initial message
    sendLoadedMessage();

    // Set up retry interval
    const intervalId = setInterval(() => {
      retryCount++;
      if (retryCount >= maxRetries) {
        clearInterval(intervalId);
        window.removeEventListener('message', checkAck);
        return;
      }
      sendLoadedMessage();
    }, retryInterval);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('message', checkAck);
    };
  }, [isEmbedded, loading]);

  return (
    <main className={styles.page}>
      {!displayReady ? (
        // Show nothing while waiting for framework acknowledgment to prevent layout flicker
        <div style={{ height: '100vh' }} />
      ) : (
        <section className={styles.shell}>
          <header className={styles.header}>
            <div></div> {/* empty left spacer */}
            
            {/* search bar */}
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              isEmbedded={isEmbedded}
            />

            <div></div> {/* empty right spacer */}
          </header>

          {!canManage && <Notice type="info">Read-only mode: sign in is required to manage contacts.</Notice>}

          {loading && <Notice type="loading">Loading contacts…</Notice>}

          {errorMessage && <Notice type="error">{errorMessage}</Notice>}

          {acceptedBanner && (
            <Banner icon="check_circle">
              Invitation accepted — contact added!
            </Banner>
          )}

          {linkCopied && (
            <Banner icon="check_circle">
              Invite link copied to clipboard!
            </Banner>
          )}


          {filteredContacts.length === 0 && contacts.length > 0 ? (
            <EmptyState type="no-search-results" />
          ) : contacts.length === 0 ? (
            <EmptyState type="no-contacts" />
          ) : (
            <ContactTable
              contacts={filteredContacts}
              newContactId={newContactId}
              currentUserEmail={currentUserEmail}
              apiClient={apiClient}
              setContacts={setContacts}
              setErrorMessage={setErrorMessage}
              setCopiedLink={setCopiedLink}
              setLinkCopied={setLinkCopied}
              setNewContactId={setNewContactId}
            />
          )}
        </section>
      )}
    </main>
  );
}
