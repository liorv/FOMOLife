import React, { useState, useEffect } from 'react';

// logos are served from public/assets; no webpack import needed
const logoDiscordUrl = '/assets/logo_discord.png';
const logoSmsUrl = '/assets/logo_sms.png';
const logoWhatsappUrl = '/assets/logo_whatsapp.png';

export default function TaskEditor({ task, onSave, onClose, onUpdateTask = () => {}, allPeople = [], onOpenPeople = () => {}, onCreatePerson = () => {}, inline = false }) {
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

  // `inline` mode will be rendered inside the task list; use a
  // different class name so styles can be scoped accordingly.
  const containerClass = inline ? 'inline-editor' : 'side-editor';

  return (
    <div className={containerClass}>
      {inline ? (
        // inline editor gets a compact header rather than a full h2
        <div className="inline-header">
          <strong>{task.text}</strong>
        </div>
      ) : (
        <h2>Edit Task — <span className="task-title-inline">{task.text}</span></h2>
      )}

      <label className="desc-label">Description</label>
      <textarea className="task-description" value={description} onChange={e => { setDescription(e.target.value); }} />


      <div className="spacer" />

      <label>People to notify</label>
      <div className="people-list task-person-list">
        <div className="task-person-list-header" aria-hidden>
          <div className="task-person-col name">Name</div>
          <div className="task-person-col methods">Methods</div>
        </div>
        {people.map(p => (
          <div key={p.name} className="task-person-row">
            <div className="task-person-col name">
              <strong className="person-name">{p.name}</strong>
            </div>
            <div className="task-person-col methods">
              {/* icons for each person: discord, sms, whatsapp, and remove.
                 grid layout (see CSS) ensures every column lines up, including the
                 close/delete icon which lives in the last column. */}
            <div className="person-methods-inline">
              <button className={p.methods.discord ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonMethod(p.name, 'discord')} title="Discord">
                <img src={logoDiscordUrl} alt="Discord" className="service-icon discord-icon" />
              </button>
              <button className={p.methods.sms ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonMethod(p.name, 'sms')} title="SMS">
                <img src={logoSmsUrl} alt="SMS" className="service-icon sms-icon" />
              </button>
              <button className={p.methods.whatsapp ? 'method-icon active' : 'method-icon'} onClick={() => handleTogglePersonMethod(p.name, 'whatsapp')} title="WhatsApp">
                <img src={logoWhatsappUrl} alt="WhatsApp" className="service-icon whatsapp-icon" />
              </button>
              <button className="remove-btn" onClick={() => handleRemovePerson(p.name)} aria-label={`Remove ${p.name}`}>
                <span className="material-icons">close</span>
              </button>
            </div>
            </div>
          </div>
        ))}
      </div>

      <div className="add-person-bar" style={{position: 'relative'}}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search people to add (type to find)"
          onKeyDown={e => {
            const q = searchQuery.trim();
            const lc = q.toLowerCase();
            const matches = q ? allPeople.filter(p => p.name.toLowerCase().includes(lc) && !people.find(pp => pp.name.toLowerCase() === p.name.toLowerCase())).slice(0,6) : [];
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

        {searchQuery.trim() && (() => {
          const q = searchQuery.trim().toLowerCase();
          const matches = allPeople.filter(p => p.name.toLowerCase().includes(q) && !people.find(pp => pp.name.toLowerCase() === p.name.toLowerCase())).slice(0,6);

          // render a floating dropdown only when we have multiple matches
          if (matches.length > 0) {
              return (
              <div className="search-suggestions dropdown" role="listbox" aria-label="People suggestions">
                {matches.map((p, i) => (
                  <div
                    key={p.name}
                    role="option"
                    aria-selected={activeSuggestion === i}
                    className={activeSuggestion === i ? 'task-person-row suggestion-row active' : 'task-person-row suggestion-row'}
                    onMouseEnter={() => setActiveSuggestion(i)}
                    onMouseLeave={() => setActiveSuggestion(-1)}
                    onClick={() => { handleAddFromAll(p); setActiveSuggestion(-1); }}
                  >
                    <div className="task-person-col name"><strong>{p.name}</strong></div>
                  </div>
                ))}
              </div>
            );
          }

          // no matches — show inline "Add" row (avoid floating box / scrollbars)
          const newName = searchQuery.trim();
          return (
            <div
              role="option"
              className={activeSuggestion === 0 ? 'suggestion-inline active' : 'suggestion-inline'}
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
              <div className="task-person-col name"><strong>Add “{newName}”</strong></div>
              <div className="task-person-col methods" style={{color: '#7b8ca7'}}>create and add to task</div>
            </div>
          );
        })()}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{display: 'flex', justifyContent: 'center'}}>
        <button className="editor-close-btn" onClick={handleSaveAndClose} title="Save & Close">
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
}
