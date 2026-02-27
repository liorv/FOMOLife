'use client';

import { useState } from 'react';
import { createInviteLink } from '@myorg/utils';
import type { Contact } from '@myorg/types';
import styles from './ContactCard.module.css';

type Props = {
  contact: Contact;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onGenerateInvite: (id: string, token: string) => void;
  readOnly?: boolean;
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function ContactCard({ contact, onDelete, onRename, onGenerateInvite, readOnly = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nextName, setNextName] = useState(contact.name);

  const hasPendingInvite = Boolean(contact.inviteToken) && contact.status !== 'accepted';
  const isActive = contact.status === 'accepted';

  const copyInvite = async (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = createInviteLink(origin, token);

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy invite link:', link);
    }
  };

  const handleGenerateInvite = async () => {
    const token = generateToken();
    onGenerateInvite(contact.id, token);
    await copyInvite(token);
  };

  return (
    <li className={styles.card}>
      <div className={`${styles.avatar} ${isActive ? styles.avatarActive : ''}`.trim()}>{initials(contact.name)}</div>

      <div className={styles.info}>
        {editing ? (
          <div className={styles.editWrap}>
            <input
              className={styles.input}
              value={nextName}
              onChange={(event) => setNextName(event.target.value)}
              aria-label="Edit contact name"
            />
            <button
              className={styles.smallBtn}
              onClick={() => {
                onRename(contact.id, nextName);
                setEditing(false);
              }}
            >
              Save
            </button>
            <button
              className={styles.smallBtn}
              onClick={() => {
                setNextName(contact.name);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className={styles.nameRow}>
              <span className={styles.name}>{contact.name}</span>
              <span
                className={`material-icons ${styles.editableIndicator}`}
                title="Edit nickname"
                onClick={() => {
                  if (readOnly) return;
                  setEditing(true);
                }}
                aria-hidden="true"
              >
                edit
              </span>
            </div>
            {contact.login ? <p className={styles.login}>{contact.login}</p> : null}
          </>
        )}
      </div>

      {isActive ? <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span> : null}
      {hasPendingInvite ? <span className={`${styles.badge} ${styles.badgePending}`}>Invite pending</span> : null}

      <div className={styles.actions}>
        {contact.inviteToken ? (
          <button
            className={styles.iconBtn}
            onClick={() => copyInvite(contact.inviteToken as string)}
            aria-label={copied ? 'Copied invite link' : 'Copy invite link'}
            title={copied ? 'Copied invite link' : 'Copy invite link'}
          >
            <span className={`material-icons ${styles.iconGlyph}`} aria-hidden="true">
              {copied ? 'check' : 'link'}
            </span>
          </button>
        ) : !isActive ? (
          <button
            className={styles.iconBtn}
            onClick={handleGenerateInvite}
            disabled={readOnly}
            aria-label="Generate invite link"
            title="Generate invite link"
          >
            <span className={`material-icons ${styles.iconGlyph}`} aria-hidden="true">add_link</span>
          </button>
        ) : null}

        <button className={styles.deleteBtn} onClick={() => onDelete(contact.id)} aria-label="Remove contact" title="Remove contact" disabled={readOnly}>
          <span className={`material-icons ${styles.iconGlyph}`} aria-hidden="true">close</span>
        </button>
      </div>
    </li>
  );
}
