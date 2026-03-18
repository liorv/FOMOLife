import React, { useState, useRef } from "react";

export interface ContactTileProps {
  id: string;
  name: string;
  status: 'not_linked' | 'link_pending' | 'linked';
  avatarUrl?: string | null;
  oauthProvider?: string;
  realName?: string;
  realEmail?: string;
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
  /** if true, this contact is the current user, disable invite */
  isSelf?: boolean;
}

// ContactTile component skeleton for contacts redesign


export function ContactTile({ id, name, status, avatarUrl, oauthProvider, realName, realEmail, autoFocus, onNameChange, onUnlink, onInvite, onLink, onLinkSuccess, isSelf }: ContactTileProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
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
          <button
            className="contact-tile__unlink-btn"
            aria-label="Delete contact"
            type="button"
            onClick={e => { e.stopPropagation(); onUnlink && onUnlink(); }}
            title="Delete contact"
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
