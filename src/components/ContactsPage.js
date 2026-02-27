import React, { useState } from "react";
import Person from "./Person";
import generateId from "../utils/generateId";
import { createInviteLink } from "@myorg/utils";

/**
 * ContactsPage — full UI for the Contacts tab.
 *
 * Flow:
 *  1. User clicks "Add Contact", enters a nickname.
 *  2. A unique invite token is generated and the link is copied to clipboard.
 *  3. User shares the link however they like.
 *  4. Recipient taps the link, signs in with any identity provider,
 *     and both users are connected (server-side token resolution, future work).
 *
 *  Contacts created via the task editor have no token yet — they get a
 *  "Generate link" button on their card.
 */
export default function ContactsPage({
  contacts = [],
  onAdd,
  onDelete,
  onGenerateInvite,
  editingPersonId,
  editingPersonName,
  setEditingPersonId,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
}) {
  const [showForm, setShowForm] = useState(false);
  const [nickname, setNickname] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const handleSubmit = () => {
    const nick = nickname.trim();
    if (!nick) return;

    // Always generate an invite token — any user who follows the link and
    // signs in will be automatically granted access.
    const inviteToken = generateId();
    const contactData = {
      name: nick,
      status: "invited",
      inviteToken,
    };

    // Copy invite link immediately (must be inside the event handler for
    // browser clipboard security).
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = createInviteLink(origin, inviteToken);
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => {
      window.prompt("Copy this invite link and share it:", link);
    });

    onAdd(contactData);
    setNickname("");
    setShowForm(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") {
      setShowForm(false);
      setNickname("");
    }
  };

  return (
    <div className="contacts-page">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="contacts-header">
        <button
          className={`add-contact-btn${showForm ? " cancel" : ""}`}
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) setNickname("");
          }}
        >
          <span className="material-icons">
            {showForm ? "close" : "person_add"}
          </span>
          {showForm ? "Cancel" : "Add Contact"}
        </button>
      </div>

      {/* ── Add-contact form ────────────────────────────── */}
      {showForm && (
        <div className="add-contact-form">
          <div className="add-contact-fields">
            <div className="form-field">
              <label htmlFor="contact-nickname">Nickname</label>
              <input
                id="contact-nickname"
                name="contact-nickname"
                className="contact-field-input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Alex"
                autoFocus
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <button
            className="invite-btn"
            onClick={handleSubmit}
            disabled={!nickname.trim()}
          >
            <span className="material-icons">link</span>
            Add &amp; Copy Invite Link
          </button>

          <p className="invite-hint">
            A unique invite link is copied to your clipboard. Share it however
            you like — whoever follows it and signs in is automatically connected
            to you.
          </p>
        </div>
      )}

      {/* ── Copied confirmation banner ───────────────────── */}
      {linkCopied && (
        <div className="invite-copied-banner">
          <span className="material-icons">check_circle</span>
          Invite link copied to clipboard!
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────── */}
      {contacts.length === 0 && !showForm && (
        <div className="contacts-empty">
          <span className="material-icons contacts-empty-icon">people</span>
          <p>No contacts yet.</p>
          <p className="contacts-empty-sub">
            Add someone to start collaborating on tasks together.
          </p>
        </div>
      )}

      {/* ── Contact list ─────────────────────────────────── */}
      {contacts.length > 0 && (
        <ul className="contacts-list">
          {contacts.map((contact) => (
            <Person
              key={contact.id}
              id={contact.id}
              person={contact}
              editingPersonId={editingPersonId}
              editingPersonName={editingPersonName}
              setEditingPersonId={setEditingPersonId}
              setEditingPersonName={setEditingPersonName}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              handleDelete={onDelete}
              onGenerateInvite={onGenerateInvite}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
