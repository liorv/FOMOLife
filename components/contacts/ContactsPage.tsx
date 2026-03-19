'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ContactsApiClient } from '@myorg/api-client';
import type { Contact } from '@myorg/types';
import { ContactTile, ModalOverlay } from '@myorg/ui';
import { createContactsApiClient } from '@myorg/api-client';

import styles from '../../styles/contacts/layout.module.css';

export type Props = {
  canManage: boolean;
  currentUserId?: string;
  currentUserEmail?: string | undefined;
  style?: React.CSSProperties;
  className?: string;
};

export default function ContactsPage({ canManage, currentUserId = '', currentUserEmail, style, className }: Props) {
  const apiClient: ContactsApiClient = useMemo(() => createContactsApiClient(''), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  

  const [contacts, setContacts] = useState<Contact[]>([]);
  // general loading/error state
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // display ready state - only show content after framework acknowledges loading
  // If not embedded, immediately show content for standalone usage and tests
  const displayReady = true;
  // banner shown when an invite link is copied anywhere on the page
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string>('');
  // share invitation modal state
  const [inviteUrl, setInviteUrl] = useState<string>('');
  // small banner shown when arriving after accepting an invite
  const [acceptedBanner, setAcceptedBanner] = useState(false);
  // search functionality
  const searchTerm = searchParams.get('q') || '';
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
  const shareInviteLink = async (targetUrl: string = inviteUrl) => {
    if (!navigator.share) {
      // Fallback to copy if Web Share API not supported
      await copyInviteLink(targetUrl);
      return;
    }

    try {
      const message = "Hey! I'd love to connect with you on FOMO Life. Click this link to accept my invite:";
      await navigator.share({
        title: message,
        text: `${message}\n\n${targetUrl}`,
        url: targetUrl
      });
      // removed share modal
    } catch (error) {
      console.log('Share failed or cancelled:', error);
      // Fallback to copy if it fails, unless the user intentionally cancelled the dialog
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      await copyInviteLink(targetUrl);
    }
  };

  // Load and poll contacts
  useEffect(() => {
    let active = true;
    const loadContacts = async () => {
      try {
        const loaded = await apiClient.listContacts();
        if (active) {
          setContacts(loaded);
          setErrorMessage(null);
        }
      } catch (error) {
        if (active && contacts.length === 0) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load contacts');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadContacts();

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
        console.log('[ContactsPage] Refetching contacts...');
        const updated = await apiClient.listContacts();
        console.log('[ContactsPage] Fetched contacts successfully. Count:', updated.length);
        setContacts(updated);
      } catch (err) {
        // ignore; existing errorMessage state covers it when mounted
        console.warn('[Contacts] refresh failed', err);
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'contacts-updated') {
        console.log('[ContactsPage] Received contacts-updated message event, refreshing data');
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

  

  

  return (
    <div className={`content-panel ${className || ""}`} style={{ ...(style || {}), display: !displayReady || style?.display === 'none' ? 'none' : (style?.display || 'flex') }}>
      {!displayReady ? (
        <div style={{ height: 0 }} />
      ) : (
        <div className={styles.shell}>
          <header className={styles.header}>
            <div></div> {/* empty left spacer */}
            
            {/* search bar */}

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
  <button type="button" className={`${styles.inviteActionBtn} ${styles.copyButton}`} onClick={() => copyInviteLink(activeInvite.url)} title="Copy link">
    <span className="material-icons">{linkCopied && copiedLink === activeInvite.url ? 'check' : 'content_copy'}</span>
    <span>{linkCopied && copiedLink === activeInvite.url ? 'Copied' : 'Copy'}</span>
  </button>
  <button type="button" className={`${styles.inviteActionBtn} ${styles.shareButton}`} onClick={() => shareInviteLink(activeInvite.url)} title="Share link">
    <span className="material-icons">share</span><span>Share</span>
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
                      avatarUrl={contact.avatarUrl || ''}
                      oauthProvider={contact.oauthProvider || ''}
                      realName={contact.realName || ''}
                      realEmail={contact.realEmail || ''}
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
        </div>
      )}

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
    </div>
  );

}