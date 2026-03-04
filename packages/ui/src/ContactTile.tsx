import React, { useState, useRef } from "react";
import { inviteContact } from "@myorg/api-client";

export interface ContactTileProps {
  id: string;
  name: string;
  status: 'not_linked' | 'link_pending' | 'linked';
  avatarUrl?: string | null;
  /** if true, start the tile in edit mode and focus the name input */
  autoFocus?: boolean;
  onNameChange?: (newName: string) => void;
  onUnlink?: () => void;
  /**
   * invoked when user clicks the link button; should return a token (or
   * null) when available.  if omitted, the component will call the
   * shared API client itself.  this hook makes the component easier to
   * test and keeps network logic outside of the UI package.
   */
  onInvite?: () => Promise<string | null>;
  onLink?: () => void;
  linkPending?: boolean;
  /** called when an invite link has been successfully copied */
  onLinkSuccess?: (link: string) => void;
}

// ContactTile component skeleton for contacts redesign


export function ContactTile({ id, name, status, avatarUrl, autoFocus, onNameChange, onUnlink, onInvite, onLink, onLinkSuccess }: ContactTileProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [linkPending, setLinkPending] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditValue(name);
  }, [name]);

  // if parent wants us to focus immediately, enter editing mode
  React.useEffect(() => {
    if (autoFocus) {
      setEditing(true);
    }
  }, [autoFocus]);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
  }

  function finishEdit() {
    setEditing(false);
    if (editValue.trim() && editValue !== name && onNameChange) {
      onNameChange(editValue.trim());
    }
  }

  function handleInputBlur() {
    finishEdit();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      finishEdit();
    }
  }

  async function handleCopyClick(ev: React.MouseEvent) {
    ev.stopPropagation();
    const link = `${window.location.origin}/accept-invite?token=${encodeURIComponent(
      inviteToken!
    )}`;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // fallback: ignore or prompt
      }
    }
    if (onLinkSuccess) {
      try {
        onLinkSuccess(link);
      } catch {
        // ignore
      }
    }
  }

  async function handleLinkClick(e: React.MouseEvent) {
    e.stopPropagation();
    // inform parent that a link request has started (e.g. update status)
    if (onLink) {
      try {
        onLink();
      } catch {
        // swallow
      }
    }
    setLinkPending(true);
    try {
      let token: string | null = null;
      if (onInvite) {
        token = await onInvite();
      } else {
        const res = await inviteContact(id);
        token = res.inviteToken || null;
      }
      setInviteToken(token);
      if (token) {
        // copy the complete acceptance URL to the clipboard
        const link = `${window.location.origin}/accept-invite?token=${encodeURIComponent(
          token
        )}`;
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            // ignore clipboard failures (e.g. permission denied)
          }
        }
        if (onLinkSuccess) {
          try {
            onLinkSuccess(link);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      // ignore errors for now
    } finally {
      setLinkPending(false);
    }
  }

  return (
    <tr className="contact-tile" data-contact-id={id}>
      <td className="contact-tile__avatar-cell">
        <div className="contact-tile__avatar" aria-label="Avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          ) : (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--ui-primary-bg, #1976d2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <span className="material-icons" style={{ fontSize: '16px' }}>person</span>
            </div>
          )}
        </div>
      </td>
      <td className="contact-tile__name-cell">
        {editing ? (
          <input
            ref={inputRef}
            className="contact-tile__name-input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            aria-label="Edit contact name"
          />
        ) : (
          <span className="contact-tile__name">
            {name}
            <button
              className="contact-tile__edit-btn"
              aria-label="Edit name"
              tabIndex={0}
              type="button"
              onClick={handleEditClick}
            >
              <span className="material-icons" style={{ fontSize: '14px' }}>edit</span>
            </button>
          </span>
        )}
      </td>
      <td className="contact-tile__status-cell">
        <span
          className={
            'contact-tile__status' +
            (status === 'linked'
              ? ' contact-tile__status--linked'
              : status === 'link_pending'
              ? ' contact-tile__status--pending'
              : ' contact-tile__status--notlinked')
          }
          aria-label="Contact status"
        >
          {/* status icon + text */}
          {status === 'linked' ? (
            <>
              <span className="material-icons" style={{ fontSize: '14px' }}>check_circle</span>
              Linked
            </>
          ) : status === 'link_pending' ? (
            <>
              <span className="material-icons" style={{ fontSize: '14px' }}>schedule</span>
              Link Pending
            </>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '14px' }}>link_off</span>
              Not Linked
            </>
          )}
        </span>
      </td>
      <td className="contact-tile__actions-cell">
        <div className="contact-tile__actions">
          {(status === 'not_linked' || status === 'link_pending') && (
            <button
              className={inviteToken ? "contact-tile__link-btn" : "contact-tile__link-btn"}
              aria-label={inviteToken ? (copied ? 'Copied invite link' : 'Copy invite link') : 'Generate invite link'}
              type="button"
              onClick={inviteToken ? handleCopyClick : handleLinkClick}
              disabled={linkPending}
              title={inviteToken ? (copied ? 'Copied!' : 'Copy invite link') : 'Generate invite link'}
            >
              <span className="material-icons" style={{ fontSize: '16px' }}>
                {inviteToken ? (copied ? 'check' : 'link') : 'link'}
              </span>
            </button>
          )}
          <button
            className="contact-tile__unlink-btn"
            aria-label="Delete contact"
            type="button"
            onClick={e => { e.stopPropagation(); onUnlink && onUnlink(); }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
