'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ContactsApiClient } from '@myorg/api-client';
import type { Contact } from '@myorg/types';
import { ContactTile, ModalOverlay } from '@myorg/ui';
import { createContactsApiClient } from '@myorg/api-client';
import { getContactsClientEnv } from '@/lib/env.client';

import styles from '../styles/layout.module.css';

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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  // general loading/error state
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // display ready state - only show content after framework acknowledges loading
  // If not embedded, immediately show content for standalone usage and tests
  const [displayReady, setDisplayReady] = useState(!isEmbedded);
  // banner shown when an invite link is copied anywhere on the page
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string>('');
  // share invitation modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string>('');
  // small banner shown when arriving after accepting an invite
  const [acceptedBanner, setAcceptedBanner] = useState(false);
  // search functionality
  const [searchTerm, setSearchTerm] = useState('');
  // notification dropdown state
  const [showNotifications, setShowNotifications] = useState(false);

  // filter and sort contacts alphabetically
  const filteredContacts = useMemo(() => {
    let filtered = contacts;
    if (searchTerm.trim()) {
      filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, searchTerm]);

  const [activeInvite, setActiveInvite] = useState<{ url: string; expiresAt: string } | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    const storeKey = `fomo_active_invite_${currentUserId}`;
    
    const checkExpiration = () => {
      const stored = localStorage.getItem(storeKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && new Date(parsed.expiresAt) > new Date()) {
            setActiveInvite(parsed);
          } else {
            setActiveInvite(null);
            localStorage.removeItem(storeKey);
          }
        } catch (e) {}
      } else {
        setActiveInvite(null);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Generate invite link
  const generateInviteLink = async () => {
    if (!canManage) return;

    try {
      const response = await apiClient.generateInviteLink();
      const inviteUrl = `${window.location.origin}/accept-invite?token=${encodeURIComponent(response.token)}`;

      setInviteUrl(inviteUrl);

      const artifact = { url: inviteUrl, expiresAt: response.expiresAt };
      const storeKey = `fomo_active_invite_${currentUserId}`;
      localStorage.setItem(storeKey, JSON.stringify(artifact));
      setActiveInvite(artifact);

      setShowShareModal(true);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate invite link');
    }
  };

  // Revoke active invite link
  const revokeActiveInvite = async () => {
    try {
      await apiClient.deleteActiveInviteLink();
      setActiveInvite(null);
      const storeKey = `fomo_active_invite_${currentUserId}`;
      localStorage.removeItem(storeKey);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to revoke invite link');
    }
  };

  // Copy link to clipboard
  const copyInviteLink = async (targetUrl: string = inviteUrl) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = targetUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(targetUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please select and copy manually.');
    }
  };

  // Share using Web Share API
  const shareInviteLink = async () => {
    if (!navigator.share) {
      // Fallback to copy if Web Share API not supported
      await copyInviteLink();
      return;
    }

    try {
      await navigator.share({
        title: 'FOMO Life Contact Invitation',
        text: 'Join me on FOMO Life! Click this link to connect.',
        url: inviteUrl,
      });
      setShowShareModal(false);
    } catch (error) {
      console.log('Share failed or cancelled:', error);
      // Fallback to copy if it fails, unless the user intentionally cancelled the dialog
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      await copyInviteLink();
    }
  };

  // Load contacts
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

  // Load pending requests count
  useEffect(() => {
    if (!canManage) return;

    const loadPendingRequests = async () => {
      try {
        const pending = await apiClient.getPendingRequests();
        setPendingRequestsCount(pending.requests.length);
      } catch (error) {
        console.warn('Failed to load pending requests:', error);
      }
    };

    loadPendingRequests();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [apiClient, canManage]);

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
        const pending = await apiClient.getPendingRequests();
        setPendingRequestsCount(pending.requests.length);
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

            {/* no notification bell here, moved to framework titlebar */}
          </header>

          {activeInvite && canManage && (
            <div className={styles.persistedInvite}>
              <div className={styles.persistedInviteHeader}>
                <strong><span className="material-icons">link</span> Active Invitation Link</strong>
                <div className={styles.persistedInviteActions}>
                  <span className={styles.expiresText}>Expires: {new Date(activeInvite.expiresAt).toLocaleString(undefined, { 
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                  })}</span>
                  <button 
                    type="button" 
                    className={styles.revokeButton} 
                    onClick={revokeActiveInvite} 
                    title="Delete link"
                  >
                    <span className="material-icons" style={{ fontSize: '16px' }}>delete_outline</span>
                    Delete
                  </button>
                </div>
              </div>
              <div className={styles.persistedInviteLink}>
                <input type="text" readOnly value={activeInvite.url} onClick={(e) => (e.target as HTMLInputElement).select()} />
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={() => copyInviteLink(activeInvite.url)}
                  title="Copy link"
                >
                  <span className="material-icons">{linkCopied && copiedLink === activeInvite.url ? 'check' : 'content_copy'}</span> {linkCopied && copiedLink === activeInvite.url ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

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
              <p className={styles.emptySub}>Generate an invite link to add contacts.</p>
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
    {canManage && displayReady && (
      <button
        type="button"
        className="content-fab"
        aria-label="Generate invite link"
        onClick={() => void generateInviteLink()}
      >
        <span className="material-icons">person_add</span>
      </button>
    )}

    <ModalOverlay
      open={showShareModal}
      onClose={() => setShowShareModal(false)}
      className={styles.shareModal}
    >
      <div className={styles.shareModalContent}>
        <h2 className={styles.shareModalTitle}>Share Invitation</h2>
        <p className={styles.shareModalDescription}>
          Share this link to invite someone to connect with you on FOMO Life.
        </p>

        <div className={styles.shareModalUrl}>
          <input
            type="text"
            value={inviteUrl}
            readOnly
            className={styles.shareModalUrlInput}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>

        <div className={styles.shareModalActions}>
          <button
            type="button"
            className={styles.shareModalButton}
            onClick={() => void copyInviteLink()}
          >
            <span className="material-icons">{linkCopied ? "check" : "content_copy"}</span>
            {linkCopied ? "Copied!" : "Copy Link"}
          </button>

          <button
            type="button"
            className={`${styles.shareModalButton} ${styles.shareModalButtonPrimary}`}
            onClick={() => void shareInviteLink()}
          >
            <span className="material-icons">share</span>
            Share
          </button>
        </div>

        <button
          type="button"
          className={styles.shareModalClose}
          onClick={() => setShowShareModal(false)}
          aria-label="Close"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </ModalOverlay>
  </main>
);
}