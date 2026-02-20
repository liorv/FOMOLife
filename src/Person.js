import React from 'react';

export default function Person({ person, idx, editingPersonIdx, editingPersonName, setEditingPersonIdx, setEditingPersonName, onSaveEdit, onCancelEdit, handleTogglePersonDefault, handleDelete }) {
  return (
    <li key={idx}>
      {editingPersonIdx === idx ? (
        <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
          <input value={editingPersonName} onChange={e => setEditingPersonName(e.target.value)} />
          <button onClick={() => onSaveEdit(idx, editingPersonName)}>Save</button>
          <button onClick={() => onCancelEdit()}>Cancel</button>
        </div>
      ) : (
        <div className="person-chip">
          <strong className="person-name" style={{cursor: 'pointer'}} onClick={() => { setEditingPersonIdx(idx); setEditingPersonName(person.name); }}>{person.name}</strong>
          <div className="person-actions">
            <div className="person-methods-inline">
              <button className={person.methods.discord ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'discord')} title="Discord">
                <span className="service-icon discord-icon" aria-hidden><span className="material-icons">forum</span></span>
              </button>
              <button className={person.methods.sms ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'sms')} title="SMS">
                <span className="service-icon sms-icon" aria-hidden><span className="material-icons">textsms</span></span>
              </button>
              <button className={person.methods.whatsapp ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonDefault(idx, 'whatsapp')} title="WhatsApp">
                <span className="service-icon whatsapp-icon" aria-hidden><span className="material-icons">chat</span></span>
              </button>
            </div>
            <button className="delete" onClick={() => handleDelete(idx)} aria-label="Delete person"><span className="material-icons">close</span></button>
          </div>
        </div>
      )}
    </li>
  );
}
