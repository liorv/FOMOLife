import React, { useState } from "react";
import generateId from "../utils/generateId";

/**
 * ContactCard — renders a single contact in the Contacts tab.
 * Shows: avatar, nickname (editable), invite status badge,
 * copy-invite-link button (or generate-link button), and delete.
 */
export default function Person({
  person,
  id,
  editingPersonId,
  editingPersonName,
  setEditingPersonId,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
  handleDelete,
  onGenerateInvite,
  // legacy props accepted but unused
  handleTogglePersonDefault,
  asRow,
}) {
  const [copied, setCopied] = useState(false);

  const initials = (person.name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isEditing = editingPersonId === id;
  const isAccepted = person.status === "accepted";
  const hasPendingInvite = person.inviteToken && !isAccepted;

  const copyLink = (token) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      window.prompt("Copy invite link:", link);
    });
  };

  const handleCopyInvite = () => {
    if (person.inviteToken) copyLink(person.inviteToken);
  };

  // For contacts without a token yet (created via task editor),
  // generate one in the click handler so the clipboard write stays
  // inside the user-gesture context required by browsers.
  const handleGenerateInvite = () => {
    const token = generateId();
    copyLink(token);
    if (onGenerateInvite) onGenerateInvite(id, token);
  };

  return (
    <li className="contact-card">
      {/* Avatar */}
      <div className={`contact-avatar${isAccepted ? " active" : ""}`}>
        {initials}
      </div>

      {/* Name / login info */}
      <div className="contact-info">
        {isEditing ? (
          <div className="contact-edit-form">
            <input
              id={`edit-person-${id}-name`}
              name="person-name"
              className="contact-edit-input"
              value={editingPersonName}
              onChange={(e) => setEditingPersonName(e.target.value)}
              placeholder="Nickname"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit(id, editingPersonName);
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <div className="contact-edit-actions">
              <button
                className="btn-small primary"
                onClick={() => onSaveEdit(id, editingPersonName)}
              >
                Save
              </button>
              <button className="btn-small" onClick={onCancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="contact-name">
              <strong>{person.name}</strong>
              <span
                className="material-icons editable-indicator"
                title="Edit nickname"
                onClick={() => {
                  setEditingPersonId(id);
                  setEditingPersonName(person.name);
                }}
              >
                edit
              </span>
            </div>
            {person.login && (
              <div className="contact-login">{person.login}</div>
            )}
          </>
        )}
      </div>

      {/* Status badge */}
      <div className="contact-meta">
        {isAccepted && (
          <span className="contact-status active">Active</span>
        )}
        {hasPendingInvite && (
          <span className="contact-status pending">Invite pending</span>
        )}
      </div>

      {/* Actions */}
      <div className="contact-actions">
        {person.inviteToken ? (
          /* Already has a token — copy the existing link */
          <button
            className="btn-icon"
            title={copied ? "Copied!" : "Copy invite link"}
            onClick={handleCopyInvite}
          >
            <span className="material-icons">
              {copied ? "check" : "link"}
            </span>
          </button>
        ) : !isAccepted ? (
          /* No token yet (added via task editor) — generate one */
          <button
            className="btn-icon"
            title="Generate &amp; copy invite link"
            onClick={handleGenerateInvite}
          >
            <span className="material-icons">add_link</span>
          </button>
        ) : null}
        <button
          className="delete"
          onClick={() => handleDelete(id)}
          aria-label="Remove contact"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </li>
  );
}
