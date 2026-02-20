import React from 'react';
import SmartImage from './SmartImage';
// service icons are provided via public/assets
const logoDiscordUrl = '/assets/logo_discord.png';
const logoSmsUrl = '/assets/logo_sms.png';
const logoWhatsappUrl = '/assets/logo_whatsapp.png';

export default function Person({ person, idx, editingPersonIdx, editingPersonName, setEditingPersonIdx, setEditingPersonName, onSaveEdit, onCancelEdit, handleTogglePersonDefault, handleDelete, asRow = false }) {
  const Wrapper = asRow ? 'div' : 'li';
  const baseClass = asRow ? 'task-person-row' : 'person-chip task-person-row';

  return (
    <Wrapper key={idx} className={baseClass}>
      {editingPersonIdx === idx ? (
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <input value={editingPersonName} onChange={e => setEditingPersonName(e.target.value)} />
          <button onClick={() => onSaveEdit(idx, editingPersonName)}>Save</button>
          <button onClick={() => onCancelEdit()}>Cancel</button>
        </div>
      ) : (
        <>
          <strong className="person-name" style={{cursor: 'pointer'}} onClick={() => { setEditingPersonIdx(idx); setEditingPersonName(person.name); }}>{person.name}</strong>
          <div className="person-actions">
            <div className="person-methods-inline">
              <button className={person.methods.discord ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'discord')} title="Discord">
                <SmartImage src={logoDiscordUrl} alt="Discord" className="service-icon discord-icon" />
              </button>
              <button className={person.methods.sms ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'sms')} title="SMS">
                <SmartImage src={logoSmsUrl} alt="SMS" className="service-icon sms-icon" />
              </button>
              <button className={person.methods.whatsapp ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'whatsapp')} title="WhatsApp">
                <SmartImage src={logoWhatsappUrl} alt="WhatsApp" className="service-icon whatsapp-icon" />
              </button>
            </div>
            <button className="delete" onClick={() => handleDelete(idx)} aria-label="Delete person"><span className="material-icons">close</span></button>
          </div>
        </>
      )}
    </Wrapper>
  );
}
