'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ContactsApiClient } from '@myorg/api-client';
import { createInviteLink, isNonEmptyString } from '@myorg/utils';
import type { Contact } from '@myorg/types';
import { ContactCard } from './ContactCard';
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
  const [showForm, setShowForm] = useState(false);
  const [nickname, setNickname] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const addContact = async () => {
    if (!isNonEmptyString(nickname)) return;

    const inviteToken = generateToken();
    const contact: Contact = {
      id: '',
      name: nickname.trim(),
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
    setNickname('');
    setShowForm(false);
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <button
            className={`${styles.addToggle} ${showForm ? styles.addToggleCancel : ''}`.trim()}
            onClick={() => setShowForm((v) => !v)}
            disabled={!canManage}
            aria-label={showForm ? 'Cancel add contact' : 'Add contact'}
            title={showForm ? 'Cancel add contact' : 'Add contact'}
          >
            <span className={`material-icons ${styles.iconGlyph}`} aria-hidden="true">
              {showForm ? 'close' : 'person_add'}
            </span>
            {showForm ? 'Cancel' : 'Add Contact'}
          </button>
        </header>

        {!canManage ? <div className={styles.notice}>Read-only mode: sign in is required to manage contacts.</div> : null}

        {loading ? <div className={styles.notice}>Loading contacts…</div> : null}

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        {showForm ? (
          <section className={styles.form}>
            <div className={styles.formFields}>
              <div className={styles.fieldWrap}>
                <label className={styles.fieldLabel} htmlFor="contact-name">Nickname</label>
                <input
                  id="contact-name"
                  className={styles.fieldInput}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="e.g. Alex"
                />
              </div>
            </div>
            <button className={styles.primaryBtn} onClick={addContact} disabled={!isNonEmptyString(nickname)}>
              <span className={`material-icons ${styles.primaryIcon}`} aria-hidden="true">link</span>
              Add & Copy Invite Link
            </button>
            <p className={styles.hint}>
              A unique invite link is copied to your clipboard. Share it however you like — whoever follows it and signs in is automatically connected to you.
            </p>
          </section>
        ) : null}

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
            <p className={styles.emptySub}>Add someone to start collaborating on tasks together.</p>
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
