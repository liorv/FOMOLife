import React from 'react';
import SmartImage from './SmartImage';
import logoDiscord from './assets/logo_discord.png';
import logoSms from './assets/logo_sms.png';
import logoWhatsapp from './assets/logo_whatsapp.png';

const logoDiscordUrl = (() => { try { return new URL('./assets/logo_discord.png', import.meta.url).href; } catch (_) { return logoDiscord; } })();
const logoSmsUrl = (() => { try { return new URL('./assets/logo_sms.png', import.meta.url).href; } catch (_) { return logoSms; } })();
const logoWhatsappUrl = (() => { try { return new URL('./assets/logo_whatsapp.png', import.meta.url).href; } catch (_) { return logoWhatsapp; } })();

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
        <div className="person-chip task-person-row">
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
        </div>
      )}
    </li>
  );
}
