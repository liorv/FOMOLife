'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ContactsApiClient } from '@myorg/api-client';
import { isNonEmptyString, generateId } from '@myorg/utils';
import type { Contact } from '@myorg/types';
import { ContactTile } from '@myorg/ui';
import { createContactsApiClient } from '@/lib/client/contactsApi';
import { getContactsClientEnv } from '@/lib/env.client';

import styles from '../styles/layout.module.css';


export const DEFAULT_CONTACT_NAME = 'New Contact (1)';

type Props = {
  canManage: boolean;
  currentUserId?: string;
  currentUserEmail?: string | undefined;
};

export default function ContactsPage({ canManage, currentUserId = '', currentUserEmail }: Props) {
  const clientEnv = useMemo(() => getContactsClientEnv(), []);
  const apiClient: ContactsApiClient = useMemo(() => createContactsApiClient(''), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isEmbedded = searchParams.get('embedded') === '1';

  const [contacts, setContacts] = useState<Contact[]>([]);
  // track an id for a freshly-created contact so we can auto-focus its name input
  const [newContactId, setNewContactId] = useState<string | null>(null);
  // general loading/error state
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // display ready state - only show content after framework acknowledges loading
  // If not embedded, immediately show content for standalone usage and tests
  const [displayReady, setDisplayReady] = useState(!isEmbedded);
  // banner shown when an invite link is copied anywhere on the page
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string>('');
  // small banner shown when arriving after accepting an invite
  const [acceptedBanner, setAcceptedBanner] = useState(false);
  // search functionality
  const [searchTerm, setSearchTerm] = useState('');
  // ref to track the next contact number for incremental naming
  const nextContactNumberRef = useRef(1);

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

    const nextNumber = nextContactNumberRef.current++;
    const name = `New Contact (${nextNumber})`;
    const tempId = generateId();
    const optimisticContact: Contact = { id: tempId, name, status: 'not_linked' };
    setContacts((prev) => [...prev, optimisticContact]);
    setNewContactId(tempId);
    try {
      const created = await apiClient.createContact({ name });
      setContacts((prev) => prev.map((c) => (c.id === tempId ? created : c)));
      setNewContactId(created.id);
      setErrorMessage(null);
    } catch (error) {
      setContacts((prev) => prev.filter((c) => c.id !== tempId));
      setNewContactId(null);
      nextContactNumberRef.current--;
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create contact');
    }
  };

  // Keep the next contact number ref in sync with existing contacts
  useEffect(() => {
    const existingNumbers = contacts
      .map(c => c.name)
      .filter(name => /^New Contact \(\d+\)$/.test(name))
      .map(name => {
        const match = name.match(/New Contact \((\d+)\)/);
        return match && match[1] ? parseInt(match[1], 10) : 0;
      });
    const maxExisting = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    nextContactNumberRef.current = maxExisting + 1;
  }, [contacts]);

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
    <main className="main-layout">
      <div className="content-panel">
        <div className={styles.page}>
          {!displayReady ? (
            // Show nothing while waiting for framework acknowledgment to prevent layout flicker
            <div style={{ height: '100vh' }} />
          ) : (
            <section className={styles.shell}>
          <header className={styles.header}>
            <div></div> {/* empty left spacer */}
            
            {/* search bar */}
            {!isEmbedded && (
              <div className={styles.search}>
                <span className={`material-icons ${styles.searchIcon}`}>search</span>
                <input
                  type="text"
                  placeholder="Search contacts"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            )}

            <div></div> {/* empty right spacer */}
          </header>

          {!canManage && <div className={styles.notice}>Read-only mode: sign in is required to manage contacts.</div>}

          {loading && <div className={styles.notice}>Loading contacts…</div>}

          {errorMessage && <div className={styles.error}>{errorMessage}</div>}

          {acceptedBanner && (
            <div className={styles.banner}>
              <span className={`material-icons ${styles.bannerIcon}`} aria-hidden="true">check_circle</span>
              Invitation accepted — contact added!
            </div>
          )}

          {linkCopied && (
            <div className={styles.banner}>
              <span className={`material-icons ${styles.bannerIcon}`} aria-hidden="true">check_circle</span>
              Invite link copied to clipboard!
            </div>
          )}


          {filteredContacts.length === 0 && contacts.length > 0 ? (
            <div className={styles.empty}>
              <span className={`material-icons ${styles.emptyIcon}`} aria-hidden="true">search_off</span>
              <p>No contacts match your search.</p>
              <p className={styles.emptySub}>Try a different search term.</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className={styles.empty}>
              <span className={`material-icons ${styles.emptyIcon}`} aria-hidden="true">people_outline</span>
              <p>No contacts yet.</p>
              <p className={styles.emptySub}>Use the add button to create a new contact.</p>
            </div>
          ) : (
            <div className={styles.table}>
              <table className={styles.contactsTable}>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <ContactTile
                      key={contact.id}
                      id={contact.id}
                      name={contact.name}
                      status={contact.status}
                      avatarUrl={null}
                      autoFocus={newContactId === contact.id}
                      onNameChange={async (newName) => {
                        if (!isNonEmptyString(newName)) return;
                        try {
                          const updated = await apiClient.updateContact(contact.id, { name: newName.trim() });
                          setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
                          if (newContactId === contact.id) {
                            setNewContactId(null);
                          }
                          // Clear any previous error
                          setErrorMessage(null);
                        } catch (error) {
                          if (error instanceof Error && error.message.includes('Cannot name a contact as yourself')) {
                            setErrorMessage('You cannot name a contact with your own name.');
                          } else if (error instanceof Error && error.message.includes('A contact with this name already exists')) {
                            setErrorMessage('A contact with this name already exists.');
                          } else {
                            setErrorMessage(error instanceof Error ? error.message : 'Failed to update contact name');
                          }
                        }
                      }}
                      onUnlink={async () => {
                        const snapshotContacts = contacts;
                        setContacts((prev) => prev.filter((item) => item.id !== contact.id));
                        try {
                          await apiClient.deleteContact(contact.id);
                          setErrorMessage(null);
                        } catch (error) {
                          setContacts(snapshotContacts);
                          setErrorMessage(error instanceof Error ? error.message : 'Failed to delete contact');
                        }
                      }}
                      onLink={async () => {
                        // update local status immediately for user feedback
                        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'link_pending' } : c));
                      }}
                      onInvite={async () => {
                        try {
                          const resp = await apiClient.inviteContact(contact.id);
                          return resp.inviteToken || null;
                        } catch (error) {
                          setErrorMessage(error instanceof Error ? error.message : 'Failed to send invitation');
                          return null;
                        }
                      }}
                      onLinkSuccess={(link) => {
                        setCopiedLink(link);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2500);
                      }}
                      isSelf={!!(contact.login && contact.login === currentUserEmail)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
    </div>
  </main>
);
}