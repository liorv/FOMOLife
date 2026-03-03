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
  onLinkSuccess?: () => void;
}

// ContactTile component skeleton for contacts redesign


export function ContactTile({ id, name, status, avatarUrl, autoFocus, onNameChange, onUnlink, onInvite, onLink, onLinkSuccess }: ContactTileProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [linkPending, setLinkPending] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
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
          navigator.clipboard.writeText(link).catch(() => {
            // ignore clipboard failures (e.g. permission denied)
          });
        }
        if (onLinkSuccess) {
          try {
            onLinkSuccess();
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
    <div className="contact-tile" data-contact-id={id}>
      <div className="contact-tile__avatar" aria-label="Avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        ) : (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#e0e0e0" />
            <text x="50%" y="55%" textAnchor="middle" fill="#888" fontSize="18" fontFamily="Arial" dy=".3em">?</text>
          </svg>
        )}
      </div>
      <div className="contact-tile__main">
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.146 2.854a.5.5 0 0 1 0-.708l.708-.708a1 1 0 0 1 1.414 1.414l-.708.708a.5.5 0 0 1-.708 0zM2 13.5V14h.5l9.086-9.086-1.5-1.5L2 13.5z" fill="#888" />
              </svg>
            </button>
          </span>
        )}
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
              <svg width="14" height="14" viewBox="0 0 16 16" style={{marginRight: 4, verticalAlign: 'middle'}}><circle cx="8" cy="8" r="7" fill="#4caf50" /><path d="M5.5 8.5l2 2 3-3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
              Linked
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" style={{marginRight: 4, verticalAlign: 'middle'}}>
                <circle cx="8" cy="8" r="7" fill={status === 'not_linked' ? '#bdbdbd' : '#ffb300'} />
                {status === 'not_linked' ? (
                  <path d="M5 8h6" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                ) : (
                  <path d="M8 4v4l2.5 2.5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                )}
              </svg>
              {status === 'not_linked' ? 'Not Linked' : 'Link Pending'}
            </>
          )}
        </span>
        {/* action buttons */}
        <div className="contact-tile__actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {(status === 'not_linked' || status === 'link_pending') && (
            <button
              className="contact-tile__link-btn"
              aria-label="Generate invite link"
              type="button"
              onClick={handleLinkClick}
              disabled={linkPending}
            >
              🔗
            </button>
          )}
          {inviteToken && (
            <p className="contact-tile__invite-link" style={{fontSize: '0.8rem', marginLeft: 8}}>
              {`${window.location.origin}/accept-invite?token=${encodeURIComponent(inviteToken)}`}
            </p>
          )}
          <button
            className="contact-tile__unlink-btn"
            aria-label="Delete contact"
            type="button"
            onClick={e => { e.stopPropagation(); onUnlink && onUnlink(); }}
          >
            ❌
          </button>
        </div>
        {inviteToken && (
          <div className="contact-tile__invite-link" style={{ marginLeft: 8, fontSize: 12, color: '#1976d2' }}>
            <a
              href={`${window.location.origin}/accept-invite?token=${encodeURIComponent(
                inviteToken
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Invite link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
