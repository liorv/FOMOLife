import React, { useState, useEffect } from 'react';
import logoDiscord from './assets/icons/logo_discord.png';
import logoSms from './assets/icons/logo_sms.png';
import logoWhatsapp from './assets/icons/logo_whatsapp.png';

// normalize image imports (handle bundlers that export asset objects)
const assetUrl = (a) => (a && typeof a === 'object' && 'default' in a) ? a.default : a;

export default function TaskEditor({ task, onSave, onClose, onUpdateTask = () => {}, allPeople = [], onOpenPeople = () => {}, onCreatePerson = () => {} }) {
  const [description, setDescription] = useState(task.description || '');
  // merge task-level people with global defaults so people's default notification methods
  // from the People tab are used unless overridden per-task
  const initialPeople = (task.people || []).map(p => {
    const name = (typeof p === 'string') ? p : (p.name || p);
    const taskMethods = (typeof p === 'object' && p.methods) ? { ...p.methods } : (typeof p === 'object' && p.method ? { discord: p.method === 'discord', sms: p.method === 'sms', whatsapp: p.method === 'whatsapp' } : null);
    const global = allPeople.find(g => g.name === name);
    const mergedMethods = taskMethods || (global ? { ...(global.methods || {}) } : { discord: false, sms: false, whatsapp: false });
    return { name, methods: { discord: !!mergedMethods.discord, sms: !!mergedMethods.sms, whatsapp: !!mergedMethods.whatsapp } };
  });
  const [people, setPeople] = useState(initialPeople);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  // keep a ref to latest editable state so cleanup can persist the most recent changes
  const latestRef = React.useRef({ description: task.description || '', people: initialPeople });
  useEffect(() => {
    latestRef.current = { description, people };
  }, [description, people]);

  useEffect(() => {
    // reset keyboard focus whenever the query changes
    setActiveSuggestion(-1);
  }, [searchQuery]);

  // persist latest edits when editor unmounts (e.g. user switches tasks)
  useEffect(() => {
    return () => {
      const { description: latestDesc, people: latestPeople } = latestRef.current;
      const normalized = latestPeople.map(p => ({ name: p.name, methods: p.methods || { discord: false, sms: false, whatsapp: false } }));
      onUpdateTask({ ...task, description: latestDesc, people: normalized });
    };
  }, []);

  const handleAddFromAll = (person) => {
    if (people.find(p => p.name === person.name)) return;
    setPeople([...people, { name: person.name, methods: { ...(person.methods || {}) } }]);
    setSearchQuery('');
  };

  const handleRemovePerson = (name) => {
    setPeople(people.filter(person => person.name !== name));
  };

  const handleTogglePersonMethod = (name, method) => {
    setPeople(prev => prev.map(p => p.name === name ? { ...p, methods: { ...p.methods, [method]: !p.methods[method] } } : p));
  };

  const saveToParent = (closeAfter = false) => {
    // Ensure people saved with methods map
    const normalized = people.map(p => ({ name: p.name, methods: p.methods || { discord: false, sms: false, whatsapp: false } }));
    // persist without closing
    onUpdateTask({ ...task, description, people: normalized });
    // if caller requested a full save+close, call onSave (parent will close)
    if (closeAfter) onSave({ ...task, description, people: normalized });
  };

  const handleSaveAndClose = () => saveToParent(true);


  // keyboard shortcuts: Esc (close+save when search empty), Ctrl/Cmd+Enter (save & close)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveToParent(true);
        return;
      }
      if (e.key === 'Escape') {
        // if search is open, clear it first; otherwise close editor
        if (searchQuery.trim()) {
          setSearchQuery('');
          setActiveSuggestion(-1);
          return;
        }
        saveToParent(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchQuery, description, people]);

  return (
    <div className="side-editor">
      <h2>Edit Task — <span className="task-title-inline">{task.text}</span></h2>

      <label className="desc-label">Description</label>
      <textarea className="task-description" value={description} onChange={e => { setDescription(e.target.value); }} />


      <div className="spacer" />

      <label>People to notify</label>
      <div className="people-list">
        {people.map(p => (
          <span key={p.name} className="person-chip">
            <span className="person-name">{p.name}</span>
            <div className="person-actions">
              <div className="person-methods-inline">
                <button className={p.methods.discord ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonMethod(p.name, 'discord')} title="Discord">
                  <img className="service-icon discord-icon" src={assetUrl(logoDiscord)} alt="discord" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                </button>
                <button className={p.methods.sms ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonMethod(p.name, 'sms')} title="SMS">
                  <img className="service-icon sms-icon" src={assetUrl(logoSms)} alt="sms" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                </button>
                <button className={p.methods.whatsapp ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonMethod(p.name, 'whatsapp')} title="WhatsApp">
                  <img className="service-icon whatsapp-icon" src={assetUrl(logoWhatsapp)} alt="whatsapp" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                </button>
              </div>
              <button className="remove-btn" onClick={() => handleRemovePerson(p.name)} aria-label={`Remove ${p.name}`}><span className="material-icons">close</span></button>
            </div>
          </span>
        ))}
      </div>

      <div className="add-person-bar">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search people to add (type to find)"
          onKeyDown={e => {
            const q = searchQuery.trim();
            const lc = q.toLowerCase();
            const matches = q ? allPeople.filter(p => p.name.toLowerCase().includes(lc)).slice(0,6) : [];
            const itemsCount = matches.length > 0 ? matches.length : (q ? 1 : 0);

            if (e.key === 'ArrowDown') {
              if (!q || itemsCount === 0) return;
              e.preventDefault();
              setActiveSuggestion(prev => prev >= itemsCount - 1 ? 0 : prev + 1);
              return;
            }
            if (e.key === 'ArrowUp') {
              if (!q || itemsCount === 0) return;
              e.preventDefault();
              setActiveSuggestion(prev => prev <= 0 ? itemsCount - 1 : prev - 1);
              return;
            }
            if (e.key === 'Escape') {
              setSearchQuery('');
              setActiveSuggestion(-1);
              return;
            }
            if (e.key === 'Enter') {
              if (!q) return;
              e.preventDefault();

              if (activeSuggestion >= 0) {
                // choose highlighted suggestion
                if (matches.length > 0) {
                  const chosen = matches[activeSuggestion];
                  handleAddFromAll(chosen);
                } else {
                  const created = { name: q, methods: { discord: false, sms: false, whatsapp: false } };
                  setPeople(prev => prev.find(p => p.name === created.name) ? prev : [...prev, created]);
                  onCreatePerson(created);
                  setSearchQuery('');
                }
                setActiveSuggestion(-1);
                return;
              }

              // no highlighted item — fallback to existing behavior
              const exact = allPeople.find(p => p.name.toLowerCase() === q.toLowerCase());
              if (exact) handleAddFromAll(exact);
              else {
                const created = { name: q, methods: { discord: false, sms: false, whatsapp: false } };
                setPeople(prev => prev.find(p => p.name === created.name) ? prev : [...prev, created]);
                setSearchQuery('');
                onCreatePerson(created);
              }
            }
          }}
        />
      </div>

      {searchQuery.trim() && (
        <div className="search-suggestions list-below" role="listbox" aria-label="People suggestions">
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const matches = allPeople.filter(p => p.name.toLowerCase().includes(q)).slice(0,6);

            if (matches.length > 0) {
              return matches.map((p, i) => (
                <div
                  key={p.name}
                  role="option"
                  aria-selected={activeSuggestion === i}
                  className={activeSuggestion === i ? 'suggestion-item active' : 'suggestion-item'}
                  onMouseEnter={() => setActiveSuggestion(i)}
                  onMouseLeave={() => setActiveSuggestion(-1)}
                  onClick={() => { handleAddFromAll(p); setActiveSuggestion(-1); }}
                >
                  <strong>{p.name}</strong>
                  <div style={{display: 'inline-flex', gap:6, marginLeft: 8}}>
                    <span className={p.methods?.discord ? 'method-icon active' : 'method-icon'}><span className="material-icons">forum</span></span>
                    <span className={p.methods?.sms ? 'method-icon active' : 'method-icon'}><span className="material-icons">textsms</span></span>
                    <span className={p.methods?.whatsapp ? 'method-icon active' : 'method-icon'}><span className="material-icons">chat</span></span>
                  </div>
                </div>
              ));
            }

            const newName = searchQuery.trim();
            return (
              <div
                role="option"
                aria-selected={activeSuggestion === 0}
                className={activeSuggestion === 0 ? 'suggestion-item active' : 'suggestion-item'}
                onMouseEnter={() => setActiveSuggestion(0)}
                onMouseLeave={() => setActiveSuggestion(-1)}
                onClick={() => {
                  const created = { name: newName, methods: { discord: false, sms: false, whatsapp: false } };
                  setPeople(prev => prev.find(p => p.name === created.name) ? prev : [...prev, created]);
                  setSearchQuery('');
                  setActiveSuggestion(-1);
                  onCreatePerson(created);
                }}
              >
                <strong>Add “{newName}”</strong>
                <span style={{ color: '#7b8ca7' }}>create and add to task</span>
              </div>
            );
          })()}
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center'}}>
        <button className="done-btn" onClick={handleSaveAndClose} title="Done (save & close)"><span className="material-icons" style={{verticalAlign:'middle', marginRight:6}}>check</span>Done</button>
        <button className="editor-close-btn" onClick={handleSaveAndClose} title="Save & Close"><span className="material-icons">close</span></button>
      </div>
    </div>
  );
}
