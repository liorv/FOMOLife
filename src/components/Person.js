import React from "react";
// service icons are provided via public/assets
const logoDiscordUrl = "/assets/logo_discord.png";
const logoSmsUrl = "/assets/logo_sms.png";
const logoWhatsappUrl = "/assets/logo_whatsapp.png";

export default function Person({
  person,
  id,
  editingPersonId,
  editingPersonName,
  setEditingPersonId,
  setEditingPersonName,
  onSaveEdit,
  onCancelEdit,
  handleTogglePersonDefault,
  handleDelete,
  asRow = false,
}) {
  const Wrapper = asRow ? "div" : "li";
  const baseClass = asRow ? "task-person-row" : "person-chip task-person-row";

  return (
    <Wrapper key={id} className={baseClass}>
      {editingPersonId === id ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            id={`edit-person-${id}-name`}
            name="person-name"
            value={editingPersonName}
            onChange={(e) => setEditingPersonName(e.target.value)}
          />
          <button onClick={() => onSaveEdit(id, editingPersonName)}>
            Save
          </button>
          <button onClick={() => onCancelEdit()}>Cancel</button>
        </div>
      ) : (
        <>
          <strong
            className="person-name"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setEditingPersonId(id);
              setEditingPersonName(person.name);
            }}
          >
            {person.name}
          </strong>
          <div className="person-actions">
            <div className="person-methods-inline">
              <button
                className={
                  person.methods.discord ? "method-icon active" : "method-icon"
                }
                onClick={() => handleTogglePersonDefault(id, "discord")}
                title="Discord"
              >
                <img
                  src={logoDiscordUrl}
                  alt="Discord"
                  className="service-icon discord-icon"
                />
              </button>
              <button
                className={
                  person.methods.sms ? "method-icon active" : "method-icon"
                }
                onClick={() => handleTogglePersonDefault(id, "sms")}
                title="SMS"
              >
                <img
                  src={logoSmsUrl}
                  alt="SMS"
                  className="service-icon sms-icon"
                />
              </button>
              <button
                className={
                  person.methods.whatsapp ? "method-icon active" : "method-icon"
                }
                onClick={() => handleTogglePersonDefault(id, "whatsapp")}
                title="WhatsApp"
              >
                <img
                  src={logoWhatsappUrl}
                  alt="WhatsApp"
                  className="service-icon whatsapp-icon"
                />
              </button>
            </div>
            <button
              className="delete"
              onClick={() => handleDelete(id)}
              aria-label="Delete person"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </>
      )}
    </Wrapper>
  );
}
